// Standalone with the distributed Skill: no private platform package dependency.
export function prepareRlsBaseline(source, options) {
  const review = validateReview(options);
  const statements = lexStatements(stripDumpGuards(source));
  const tables = new Map();
  const enabled = new Set();
  const forced = new Set();
  const policies = [];
  const ordinary = [];
  let convertedAuthReferenceCount = 0;
  for (const statement of statements) {
    const tokens = lexSql(statement);
    if (tokens.length === 0) continue;
    if (matches(tokens, ["create", "policy"])) {
      policies.push(parsePolicy(statement, tokens, review));
      continue;
    }
    if (matches(tokens, ["alter", "policy"]) || matches(tokens, ["drop", "policy"])) {
      fail("unsupported policy lifecycle: only CREATE POLICY schema baselines are supported");
    }
    if (matches(tokens, ["create", "table"])) {
      const table = readTable(tokens, 2);
      if (tables.has(table.key)) fail(`duplicate table ${table.key}`);
      tables.set(table.key, {
        sql: table.sql,
        ordinary: !tokens.some((token) => isWord(token, "partition") || isWord(token, "inherits")),
      });
    }
    if (matches(tokens, ["alter", "table"])) {
      const table = readTable(tokens, isWord(tokens[2], "only") ? 3 : 2);
      const tail = tokens.slice(table.next);
      if (tail.some((token) => isWord(token, "security"))) {
        if (matches(tail, ["enable", "row", "level", "security"]) && tail.length === 4)
          enabled.add(table.key);
        else if (matches(tail, ["force", "row", "level", "security"]) && tail.length === 4)
          forced.add(table.key);
        else
          fail(
            `unsupported RLS state for ${table.key}: DISABLE, NO FORCE and combined alterations are refused`,
          );
        continue;
      }
    }
    const converted = convertAuthRelations(statement, tokens, options);
    convertedAuthReferenceCount += converted.count;
    ordinary.push(converted.sql);
  }
  for (const key of new Set([
    ...enabled,
    ...forced,
    ...policies.map((policy) => policy.table.key),
  ])) {
    if (!review.tables.has(key))
      fail(`backendRlsTables must explicitly include original RLS table ${key}`);
  }
  for (const key of review.tables) {
    if (!tables.get(key)?.ordinary)
      fail(`backendRlsTables requires a newly created ordinary public/private table: ${key}`);
    if (!enabled.has(key))
      fail(`RLS table ${key} needs an explicit ENABLE ROW LEVEL SECURITY input statement`);
  }
  const names = new Set();
  for (const policy of policies) {
    const identity = JSON.stringify([policy.table.key, policy.name.value]);
    if (names.has(identity)) fail(`duplicate policy ${policy.name.raw} on ${policy.table.key}`);
    names.add(identity);
    convertedAuthReferenceCount += policy.convertedAuthReferenceCount;
  }
  const rlsStatements = policies.map((policy) => policy.sql);
  for (const key of review.tables) {
    const sql = tables.get(key).sql;
    rlsStatements.push(
      `ALTER TABLE ${sql} ENABLE ROW LEVEL SECURITY`,
      `ALTER TABLE ${sql} FORCE ROW LEVEL SECURITY`,
    );
  }
  return {
    source: ordinary.join(";\n"),
    rlsStatements,
    convertedAuthReferenceCount,
    inputPolicyCount: policies.length,
    emittedPolicyCount: policies.length,
    translatedPolicyCount: policies.filter((policy) => policy.translated).length,
    normalizedForceRlsTables: Object.freeze([...review.tables].filter((key) => !forced.has(key))),
  };
}

function validateReview(options) {
  if (!Array.isArray(options.backendRlsTables) || options.backendRlsTables.length === 0) {
    fail("backendRlsTables must explicitly list each reviewed RLS table");
  }
  const tables = new Set();
  for (const value of options.backendRlsTables) {
    if (typeof value !== "string") fail("backendRlsTables contains an invalid table");
    const tokens = lexSql(value);
    const table = readTable(tokens, 0);
    if (table.next !== tokens.length || tables.has(table.key))
      fail("backendRlsTables contains an invalid or duplicate table");
    tables.add(table.key);
  }
  if (options.userIdMapping !== undefined && options.userIdMapping !== "uuid")
    fail("userIdMapping supports only explicitly reviewed uuid identities");
  if (!Array.isArray(options.claimMappings ?? [])) fail("claimMappings must be a reviewed array");
  const claims = new Map();
  for (const mapping of options.claimMappings ?? []) {
    if (
      !mapping ||
      typeof mapping !== "object" ||
      Array.isArray(mapping) ||
      Object.keys(mapping).sort().join(",") !== "sourcePath,targetPath,trust" ||
      mapping.trust !== "server-verified"
    )
      fail("claim mapping needs sourcePath, targetPath and trust: server-verified");
    for (const path of [mapping.sourcePath, mapping.targetPath]) {
      if (
        !Array.isArray(path) ||
        path.length === 0 ||
        path.length > 8 ||
        path.some((part) => typeof part !== "string" || !/^[A-Za-z_][A-Za-z0-9_]*$/u.test(part))
      )
        fail("claim mapping paths must contain literal field names");
      if (path.some((part) => ["user_metadata", "raw_user_meta_data"].includes(part.toLowerCase())))
        fail("user-editable metadata cannot supply authorization claims");
    }
    if (
      mapping.targetPath.some(
        (part) => part.length > 128 || ["__proto__", "constructor", "prototype"].includes(part),
      )
    )
      fail("target claim path cannot be represented by a valid backend RLS claims document");
    const key = JSON.stringify(mapping.sourcePath);
    if (claims.has(key)) fail("duplicate claim mapping source path");
    if (
      (mapping.sourcePath[0] === "role" || mapping.targetPath[0] === "role") &&
      (mapping.sourcePath.join(".") !== "role" || mapping.targetPath.join(".") !== "role")
    )
      fail("derived role claim can only map role to role");
    if (
      (mapping.sourcePath[0] === "sub" || mapping.targetPath[0] === "sub") &&
      (mapping.sourcePath.join(".") !== "sub" || mapping.targetPath.join(".") !== "sub")
    )
      fail("derived identity claim can only map sub to sub");
    claims.set(key, mapping.targetPath);
  }
  return { tables, claims, userIdMapping: options.userIdMapping };
}

function parsePolicy(source, tokens, review) {
  let index = 2;
  const name = tokens[index++];
  if (!isIdentifier(name) || !isWord(tokens[index++], "on"))
    fail("malformed CREATE POLICY name or ON clause");
  const table = readTable(tokens, index);
  index = table.next;
  let mode = "PERMISSIVE";
  let command = "ALL";
  let roles = ["public"];
  if (isWord(tokens[index], "as")) {
    mode = tokens[index + 1]?.value.toUpperCase();
    if (tokens[index + 1]?.kind !== "word" || (mode !== "PERMISSIVE" && mode !== "RESTRICTIVE"))
      fail("invalid policy AS mode");
    index += 2;
  }
  if (isWord(tokens[index], "for")) {
    command = tokens[index + 1]?.value.toUpperCase();
    if (
      tokens[index + 1]?.kind !== "word" ||
      !["ALL", "SELECT", "INSERT", "UPDATE", "DELETE"].includes(command)
    )
      fail("invalid policy FOR command");
    index += 2;
  }
  if (isWord(tokens[index], "to")) {
    roles = [];
    do {
      index += 1;
      const role = tokens[index++];
      if (!isIdentifier(role) || !["public", "anon", "authenticated"].includes(role.value))
        fail(`unsupported policy role ${role?.raw ?? "<missing>"}`);
      roles.push(role.value);
    } while (isSymbol(tokens[index], ","));
  }
  const expressions = {};
  for (const clause of ["using", "check"]) {
    if (clause === "check") {
      if (!isWord(tokens[index], "with")) continue;
      if (!isWord(tokens[index + 1], "check")) fail("malformed policy WITH CHECK");
      index += 2;
    } else {
      if (!isWord(tokens[index], "using")) continue;
      index += 1;
    }
    if (!isSymbol(tokens[index], "(")) fail(`policy ${clause} expression requires parentheses`);
    const begin = ++index;
    let depth = 1;
    while (index < tokens.length && depth > 0) {
      if (tokens[index].value === "(" && tokens[index].kind === "symbol") depth += 1;
      if (tokens[index].value === ")" && tokens[index].kind === "symbol") depth -= 1;
      index += 1;
    }
    if (depth !== 0 || index - 1 === begin) fail(`malformed policy ${clause} expression`);
    expressions[clause] = source.slice(tokens[begin].start, tokens[index - 2].end);
  }
  if (index !== tokens.length) fail(`unsupported or malformed policy ${name.raw}`);
  if (command === "INSERT" && expressions.using !== undefined)
    fail("INSERT policy cannot contain USING");
  if (["SELECT", "DELETE"].includes(command) && expressions.check !== undefined)
    fail(`${command} policy cannot contain WITH CHECK`);
  // PostgreSQL's implicit WITH CHECK uses the original USING predicate. Expand it
  // before adding a role guard, especially for non-applicable restrictive roles.
  const predicates = {};
  if (command !== "INSERT") predicates.using = expressions.using ?? "true";
  if (["ALL", "INSERT", "UPDATE"].includes(command))
    predicates.check = expressions.check ?? expressions.using ?? "true";
  const guard = roles.includes("public")
    ? null
    : `((ohmyhost.claims() ->> 'role') IN (${[...new Set(roles)].map(quoteString).join(", ")})) IS TRUE`;
  let convertedAuthReferenceCount = 0;
  const converted = new Map();
  for (const expression of Object.values(expressions)) {
    const result = convertExpression(expression, review);
    converted.set(expression, result);
    convertedAuthReferenceCount += result.count;
  }
  let sql = `CREATE POLICY ${name.raw} ON ${table.sql} AS ${mode} FOR ${command} TO PUBLIC`;
  for (const [clause, expression] of Object.entries(predicates)) {
    let result = converted.get(expression);
    if (result === undefined) {
      result = convertExpression(expression, review);
      converted.set(expression, result);
    }
    const predicate =
      guard === null
        ? result.sql
        : mode === "PERMISSIVE"
          ? `(${guard}) AND (${result.sql})`
          : `NOT (${guard}) OR (${result.sql})`;
    sql += ` ${clause === "using" ? "USING" : "WITH CHECK"} (${predicate})`;
  }
  return {
    sql,
    table,
    name,
    convertedAuthReferenceCount,
    translated: guard !== null || convertedAuthReferenceCount > 0,
  };
}

function convertExpression(source, review) {
  const tokens = lexSql(source);
  const replacements = [];
  let count = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      isIdentifier(token) &&
      isSymbol(tokens[index + 1], ".") &&
      isIdentifier(tokens[index + 2])
    ) {
      const qualified = `${token.value}.${tokens[index + 2].value}`;
      if (qualified === "auth.uid" || qualified === "auth.jwt") {
        if (
          isSymbol(tokens[index - 1], ".") ||
          !isSymbol(tokens[index + 3], "(") ||
          !isSymbol(tokens[index + 4], ")")
        )
          fail(`unsupported ${qualified} call arguments`);
        let end = index + 4;
        let sql;
        if (qualified === "auth.uid") {
          if (review.userIdMapping !== "uuid")
            fail(
              "auth.uid() requires explicit userIdMapping: uuid after reviewing identity preservation",
            );
          sql = "ohmyhost.user_id()::uuid";
        } else {
          const path = [];
          let textResult = false;
          while (
            tokens[end + 1]?.kind === "symbol" &&
            ["->", "->>"].includes(tokens[end + 1]?.value)
          ) {
            if (textResult) fail("unsupported JSON operation after text claim extraction");
            const field = tokens[end + 2];
            if (field?.kind !== "string")
              fail("auth.jwt() claim path must use literal field names");
            path.push(field.value);
            textResult = tokens[end + 1].value === "->>";
            end += 2;
          }
          const target = review.claims.get(JSON.stringify(path));
          if (target === undefined)
            fail(
              `missing reviewed server-trusted claim mapping for auth.jwt() path ${path.join(".") || "<whole JWT>"}`,
            );
          if (path.length === 1 && path[0] === "role") {
            if (!textResult) fail("derived JWT role requires a literal text role comparison");
            validateRolePredicate(tokens, index, end);
          }
          sql =
            "ohmyhost.claims()" +
            target
              .map(
                (part, partIndex) =>
                  ` ${textResult && partIndex === target.length - 1 ? "->>" : "->"} ${quoteString(part)}`,
              )
              .join("");
        }
        replacements.push({ start: token.start, end: tokens[end].end, value: sql });
        count += 1;
        index = end;
        continue;
      }
      if (["auth", "storage", "ohmyhost"].includes(token.value))
        fail(`unsupported policy dependency ${qualified}`);
      if (isSymbol(tokens[index + 3], "(")) fail(`unsupported custom policy function ${qualified}`);
    }
    if (token.kind === "dollar" || token.kind === "escaped-string")
      fail("unsupported policy literal form; use ordinary quoted literals");
    if (isIdentifier(token) && isSymbol(tokens[index + 1], "(")) {
      // These are PostgreSQL syntax, not search_path-resolved custom functions.
      if (
        token.kind !== "word" ||
        ![
          "coalesce",
          "nullif",
          "greatest",
          "least",
          "in",
          "exists",
          "any",
          "all",
          "some",
          "not",
          "and",
          "or",
          "select",
          "where",
          "when",
          "then",
          "else",
          "from",
          "having",
          "on",
        ].includes(token.value)
      )
        fail(`unsupported custom policy function ${token.raw}`);
    }
    if (
      isWord(token, "current_user") ||
      isWord(token, "user") ||
      isWord(token, "session_user") ||
      isWord(token, "current_role")
    )
      fail("physical database-role policy predicates require manual review");
    if ([";", "\\"].includes(token.value) && token.kind === "symbol")
      fail("malformed policy expression");
  }
  return { sql: replaceSpans(source, replacements), count };
}

function validateRolePredicate(tokens, start, end) {
  // The derived role has exactly two values. Do not guess the meaning of a
  // comparison to an arbitrary column, concatenation, helper or source role.
  while (isSymbol(tokens[end + 1], "::") && isWord(tokens[end + 2], "text")) end += 2;
  while (isSymbol(tokens[start - 1], "(") && isSymbol(tokens[end + 1], ")")) {
    start -= 1;
    end += 1;
  }
  const comparison = (token) => token?.kind === "symbol" && ["=", "<>", "!="].includes(token.value);
  const boundary = (token) =>
    token === undefined || isSymbol(token, ")") || isWord(token, "and") || isWord(token, "or");
  const literal = (token) => {
    if (token?.kind === "string" && token.value === "service_role")
      fail("unsupported service_role-dependent JWT policy; backend RLS has no service-role bypass");
    if (token?.kind !== "string" || !["anon", "authenticated"].includes(token.value))
      fail(
        "unsupported derived JWT role comparison: use literal anon/authenticated roles, without dynamic role expressions",
      );
  };
  if (comparison(tokens[end + 1])) {
    literal(tokens[end + 2]);
    let next = end + 3;
    if (isSymbol(tokens[next], "::") && isWord(tokens[next + 1], "text")) next += 2;
    if (boundary(tokens[next])) return;
  } else if (comparison(tokens[start - 1])) {
    literal(tokens[start - 2]);
    const previous = tokens[start - 3];
    if (
      (previous === undefined ||
        isSymbol(previous, "(") ||
        isWord(previous, "not") ||
        isWord(previous, "and") ||
        isWord(previous, "or")) &&
      boundary(tokens[end + 1])
    )
      return;
  } else {
    let next = end + 1;
    if (isWord(tokens[next], "not")) next += 1;
    if (isWord(tokens[next], "in") && isSymbol(tokens[next + 1], "(")) {
      next += 2;
      do {
        literal(tokens[next++]);
        if (!isSymbol(tokens[next], ",")) break;
        next += 1;
      } while (next < tokens.length);
      if (isSymbol(tokens[next], ")") && boundary(tokens[next + 1])) return;
    }
  }
  fail(
    "unsupported derived JWT role expression; review it manually instead of dropping a role-dependent branch",
  );
}

function convertAuthRelations(source, tokens, options) {
  const replacements = [];
  let count = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      isIdentifier(token) &&
      ["auth", "storage"].includes(token.value) &&
      isSymbol(tokens[index + 1], ".")
    ) {
      if (
        token.value === "auth" &&
        isIdentifier(tokens[index + 2]) &&
        tokens[index + 2]?.value === "users"
      ) {
        if (options.authMode !== "better-auth-uuid")
          fail(
            "auth.users relation conversion requires explicit authMode: better-auth-uuid and an independently selected auth migration",
          );
        replacements.push({ start: token.start, end: tokens[index + 2].end, value: 'auth."user"' });
        count += 1;
        index += 2;
      } else fail(`unsupported provider dependency ${token.raw}.${tokens[index + 2]?.raw ?? ""}`);
    }
    if (token.kind === "dollar" && matches(tokens, ["create", "function"])) {
      // Function bodies are not policies and cannot silently acquire RLS identity.
      const body = lexSql(token.value);
      if (
        body.some(
          (part, bodyIndex) =>
            isIdentifier(part) &&
            ["auth", "storage"].includes(part.value) &&
            body[bodyIndex + 1]?.value === ".",
        )
      )
        fail("provider-specific function body requires manual conversion");
    }
  }
  return { sql: replaceSpans(source, replacements), count };
}

function replaceSpans(source, replacements) {
  for (const replacement of [...replacements].reverse())
    source = source.slice(0, replacement.start) + replacement.value + source.slice(replacement.end);
  return source;
}

function readTable(tokens, index) {
  const schema = tokens[index];
  const table = tokens[index + 2];
  if (
    !isIdentifier(schema) ||
    !["public", "private"].includes(schema.value) ||
    !isSymbol(tokens[index + 1], ".") ||
    !isIdentifier(table)
  )
    fail("RLS baseline tables must use explicit public/private ordinary table names");
  const keyName = /^[a-z_][a-z0-9_$]*$/u.test(table.value)
    ? table.value
    : `"${table.value.replaceAll('"', '""')}"`;
  return { key: `${schema.value}.${keyName}`, sql: `${schema.raw}.${table.raw}`, next: index + 3 };
}

export function stripDumpGuards(source) {
  if (typeof source !== "string") fail("source is invalid");
  const replacements = [];
  const tokens = lexSql(source);
  for (const token of tokens) {
    if (token.kind !== "symbol" || token.value !== "\\") continue;
    const lineStart = source.lastIndexOf("\n", token.start - 1) + 1;
    if (source.slice(lineStart, token.start).trim() !== "") continue;
    const match = /^\\(?:un)?restrict [A-Za-z0-9]+(?:\r?\n|$)/u.exec(source.slice(token.start));
    if (match !== null)
      replacements.push({ start: token.start, end: token.start + match[0].length, value: "\n" });
  }
  return replaceSpans(source, replacements);
}

function isIdentifier(token) {
  return token?.kind === "word" || token?.kind === "identifier";
}
function isSymbol(token, value) {
  return token?.kind === "symbol" && token.value === value;
}
function isWord(token, value) {
  return token?.kind === "word" && token.value === value;
}
function matches(tokens, words) {
  return words.every((word, index) => isWord(tokens[index], word));
}
function quoteString(value) {
  return `'${value.replaceAll("'", "''")}'`;
}

// Token offsets let us replace only executable SQL, never comments, quoted
// identifiers, ordinary/escaped strings, or function dollar-quoted bodies.
export function lexSql(sql) {
  const tokens = [];
  let index = 0;
  while (index < sql.length) {
    const start = index;
    const character = sql[index];
    if (/\s/u.test(character)) {
      index += 1;
      continue;
    }
    if (sql.startsWith("--", index)) {
      const newline = sql.indexOf("\n", index + 2);
      index = newline < 0 ? sql.length : newline + 1;
      continue;
    }
    if (sql.startsWith("/*", index)) {
      let depth = 1;
      index += 2;
      while (index < sql.length && depth > 0) {
        if (sql.startsWith("/*", index)) {
          depth += 1;
          index += 2;
        } else if (sql.startsWith("*/", index)) {
          depth -= 1;
          index += 2;
        } else index += 1;
      }
      if (depth > 0) fail("unterminated block comment");
      continue;
    }
    const escaped = (character === "e" || character === "E") && sql[index + 1] === "'";
    if (escaped || character === "'" || character === '"') {
      const quote = escaped ? "'" : character;
      index += escaped ? 2 : 1;
      let value = "";
      let closed = false;
      while (index < sql.length) {
        if (escaped && sql[index] === "\\") {
          if (index + 1 >= sql.length) fail("unterminated escaped string");
          value += sql.slice(index, index + 2);
          index += 2;
        } else if (sql[index] === quote) {
          if (sql[index + 1] === quote) {
            value += quote;
            index += 2;
          } else {
            index += 1;
            closed = true;
            break;
          }
        } else {
          value += sql[index++];
        }
      }
      if (!closed) fail("unterminated quoted SQL token");
      tokens.push({
        kind: escaped ? "escaped-string" : quote === '"' ? "identifier" : "string",
        value,
        raw: sql.slice(start, index),
        start,
        end: index,
      });
      continue;
    }
    if (character === "$") {
      const delimiter = /^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/u.exec(sql.slice(index))?.[0];
      if (delimiter !== undefined) {
        const end = sql.indexOf(delimiter, index + delimiter.length);
        if (end < 0) fail("unterminated dollar quote");
        index = end + delimiter.length;
        tokens.push({
          kind: "dollar",
          value: sql.slice(start + delimiter.length, end),
          raw: sql.slice(start, index),
          start,
          end: index,
        });
        continue;
      }
    }
    const word = /^[A-Za-z_][A-Za-z0-9_$]*/u.exec(sql.slice(index))?.[0];
    if (word !== undefined) {
      if (
        word.toLowerCase() === "u" &&
        sql[index + 1] === "&" &&
        ["'", '"'].includes(sql[index + 2])
      )
        fail("unsupported Unicode-escaped SQL token; use ordinary quoted SQL tokens");
      index += word.length;
      tokens.push({ kind: "word", value: word.toLowerCase(), raw: word, start, end: index });
      continue;
    }
    const symbol =
      /^(?:->>|#>>|->|#>|::|>=|<=|<>|!=|\|\|)/u.exec(sql.slice(index))?.[0] ?? character;
    index += symbol.length;
    tokens.push({ kind: "symbol", value: symbol, raw: symbol, start, end: index });
  }
  for (let tokenIndex = 1; tokenIndex < tokens.length; tokenIndex += 1) {
    if (
      ["string", "escaped-string"].includes(tokens[tokenIndex - 1].kind) &&
      ["string", "escaped-string"].includes(tokens[tokenIndex].kind)
    )
      fail(
        "unsupported adjacent or newline-concatenated SQL string literals; use a single literal",
      );
  }
  return tokens;
}

export function lexStatements(source) {
  if (typeof source !== "string") fail("source is invalid");
  const tokens = lexSql(source);
  const statements = [];
  let start = 0;
  for (const token of tokens) {
    if (token.kind !== "symbol" || token.value !== ";") continue;
    const statement = source.slice(start, token.start);
    const contents = lexSql(statement);
    if (contents.length > 0)
      statements.push(statement.slice(contents[0].start, contents.at(-1).end));
    start = token.end;
  }
  const tail = source.slice(start);
  const contents = lexSql(tail);
  if (contents.length > 0) statements.push(tail.slice(contents[0].start, contents.at(-1).end));
  return statements;
}

function fail(message) {
  throw new Error(`Portable baseline generation failed: ${message}`);
}
