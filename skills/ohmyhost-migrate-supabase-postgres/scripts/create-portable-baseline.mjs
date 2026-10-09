#!/usr/bin/env node

import { lstat, mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { TextEncoder } from "node:util";
import process from "node:process";
import { lexSql, lexStatements, prepareRlsBaseline, stripDumpGuards } from "./portable-rls.mjs";

if (process.argv[1] !== undefined && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}

async function main() {
  const argumentsByName = parseArguments(process.argv.slice(2));
  const inputPath = argumentsByName.get("--input");
  const outputPath = argumentsByName.get("--output");
  const outputDirectory = argumentsByName.get("--output-directory");
  const migrationPrefix = argumentsByName.get("--migration-prefix");
  if (
    inputPath === undefined ||
    (outputPath === undefined) === (outputDirectory === undefined) ||
    (outputDirectory === undefined) !== (migrationPrefix === undefined)
  ) {
    fail("input and one output mode are required");
  }
  const rlsOptionsPath = argumentsByName.get("--rls-options");
  const rlsOptions =
    rlsOptionsPath === undefined ? {} : JSON.parse(await readFile(rlsOptionsPath, "utf8"));
  if (
    !rlsOptions ||
    typeof rlsOptions !== "object" ||
    Array.isArray(rlsOptions) ||
    Object.keys(rlsOptions).some(
      (key) => !["backendRlsTables", "userIdMapping", "claimMappings"].includes(key),
    )
  )
    fail("RLS options file is invalid");
  const result = createPortableBaseline(await readFile(inputPath, "utf8"), {
    ...rlsOptions,
    ...(argumentsByName.get("--auth-mode") === undefined
      ? {}
      : { authMode: argumentsByName.get("--auth-mode") }),
    ...(argumentsByName.get("--authorization-mode") === undefined
      ? {}
      : { authorizationMode: argumentsByName.get("--authorization-mode") }),
  });
  const files = outputPath === undefined ? splitPortableBaseline(result, migrationPrefix) : [];
  const outputs =
    outputPath === undefined
      ? files.map((file) => ({ path: resolve(outputDirectory, file.path), sql: file.sql }))
      : [{ path: outputPath, sql: result.sql }];
  // Check the whole batch first so a later existing migration causes no earlier
  // new files to be written. lstat also catches dangling output symlinks.
  for (const output of outputs) {
    let exists = true;
    try {
      await lstat(output.path);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      exists = false;
    }
    if (exists)
      fail(`output path already exists: ${output.path}; choose a new filename or migration prefix`);
  }
  if (outputDirectory !== undefined) await mkdir(outputDirectory, { recursive: true, mode: 0o700 });
  for (const output of outputs) {
    try {
      // Exclusive creation also refuses a file/symlink created after preflight.
      await writeFile(output.path, output.sql, {
        encoding: "utf8",
        mode: 0o600,
        flag: "wx",
      });
    } catch (error) {
      if (error.code === "EEXIST")
        fail(
          `output path already exists: ${output.path}; choose a new filename or migration prefix`,
        );
      throw error;
    }
  }
  process.stdout.write(
    `${JSON.stringify({
      version: 1,
      statementCount: result.statements.length,
      omittedPolicyCount: result.omittedPolicyCount,
      convertedAuthReferenceCount: result.convertedAuthReferenceCount,
      inputPolicyCount: result.inputPolicyCount,
      emittedPolicyCount: result.emittedPolicyCount,
      translatedPolicyCount: result.translatedPolicyCount,
      normalizedForceRlsTables: result.normalizedForceRlsTables,
      files: files.map(({ path, byteLength, statementCount }) => ({
        path,
        byteLength,
        statementCount,
      })),
    })}\n`,
  );
}

export function splitPortableBaseline(baseline, migrationPrefix, maximumBytes = 256 * 1024) {
  if (
    !baseline ||
    !Array.isArray(baseline.statements) ||
    baseline.statements.length === 0 ||
    typeof migrationPrefix !== "string" ||
    !/^\d{14}_[a-z0-9][a-z0-9_-]*$/u.test(migrationPrefix) ||
    !Number.isInteger(maximumBytes) ||
    maximumBytes < 128 ||
    maximumBytes > 256 * 1024
  ) {
    fail("split migration input is invalid");
  }
  const header =
    "-- Portable PostgreSQL baseline generated from a reviewed public-schema dump.\n\n";
  const groups = [];
  let current = [];
  for (const statement of baseline.statements) {
    const candidate = [...current, statement];
    if (utf8Bytes(renderStatements(header, candidate)) <= maximumBytes) {
      current = candidate;
      continue;
    }
    if (current.length === 0) fail("one portable statement exceeds the migration limit");
    groups.push(current);
    current = [statement];
    if (utf8Bytes(renderStatements(header, current)) > maximumBytes) {
      fail("one portable statement exceeds the migration limit");
    }
  }
  if (current.length > 0) groups.push(current);
  if (groups.length > 128) fail("portable baseline exceeds the migration-count limit");
  return Object.freeze(
    groups.map((statements, index) => {
      const sql = renderStatements(header, statements);
      return Object.freeze({
        path: `${migrationPrefix}_${String(index + 1).padStart(3, "0")}.sql`,
        sql,
        byteLength: utf8Bytes(sql),
        statementCount: statements.length,
      });
    }),
  );
}

function renderStatements(header, statements) {
  return `${header}${statements.join(";\n\n")};\n`;
}

function utf8Bytes(value) {
  return new TextEncoder().encode(value).byteLength;
}

export function createPortableBaseline(rawSource, rawOptions = {}) {
  const options = parseOptions(rawOptions);
  const rls = options.authorizationMode === "preserve-rls";
  const prepared = rls ? prepareRlsBaseline(rawSource, options) : prepareSource(rawSource, options);
  const source = rls ? prepared.source : stripDumpGuards(prepared.source);
  const statements = lexStatements(source);
  const normalize = normalizeExecutableStatement;
  const hasPrivateSchema = statements.some((statement) =>
    /^create schema(?: if not exists)? private$/u.test(normalize(statement)),
  );
  const output = [
    "CREATE SCHEMA IF NOT EXISTS extensions",
    ...(hasPrivateSchema ? ["CREATE SCHEMA IF NOT EXISTS private"] : []),
    "CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions",
    "CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA extensions",
    "CREATE EXTENSION IF NOT EXISTS unaccent WITH SCHEMA extensions",
    "SET check_function_bodies = false",
    ...(options.authMode === "better-auth-uuid" && !rls
      ? [
          `CREATE FUNCTION public.current_actor_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT nullif(current_setting('app.current_actor_id', true), '')::uuid
$$`,
        ]
      : []),
  ];
  const views = new Map();
  let omittedPolicyCount = 0;
  for (const statement of statements) {
    let candidate = statement;
    let normalized = normalize(candidate);
    if (normalized === "") continue;
    validateStringSetting(lexSql(candidate));
    if (options.authorizationMode === "server" && normalized.startsWith("create policy ")) {
      omittedPolicyCount += 1;
      continue;
    }
    if (
      options.authorizationMode === "server" &&
      /^create function public\.is_service_role_request\(\)/u.test(normalized)
    ) {
      candidate = portableServiceRequestFunction();
      normalized = normalize(candidate);
    }
    if (
      options.authorizationMode === "preserve" &&
      /^alter table\b.*\brow level security$/u.test(normalized)
    )
      fail("RLS requires explicit preserve-rls review or server authorization mode");
    if (ignoredStatement(normalized)) continue;
    rejectProviderDependencies(lexSql(candidate), options, /^create function\b/u.test(normalized));
    rejectUnsafeStatement(normalized);
    const view = /^create(?: or replace)? view ([a-z0-9_."]+)\b/u.exec(normalized);
    if (view !== null) {
      const name = view[1];
      if (name === undefined) fail("view identity is invalid");
      const previous = views.get(name);
      if (normalized.startsWith("create or replace view ")) {
        if (previous !== undefined) output[previous] = null;
        views.set(name, output.length);
        const tokens = lexSql(candidate);
        output.push(`${candidate.slice(0, tokens[1].start)}${candidate.slice(tokens[3].start)}`);
        continue;
      }
      if (previous !== undefined) fail(`duplicate view ${name}`);
      views.set(name, output.length);
    }
    output.push(candidate.trim());
  }
  const canonical = output
    .filter((statement) => statement !== null)
    .map((statement, index) => ({
      statement,
      index,
      priority: statementPriority(statement, normalize),
    }))
    .sort((left, right) => left.priority - right.priority || left.index - right.index)
    .map(({ statement }) => statement);
  if (rls) canonical.push(...prepared.rlsStatements);
  if (canonical.length === 0) fail("baseline is empty");
  return Object.freeze({
    statements: Object.freeze(canonical),
    omittedPolicyCount,
    convertedAuthReferenceCount: prepared.convertedAuthReferenceCount,
    inputPolicyCount: rls ? prepared.inputPolicyCount : omittedPolicyCount,
    emittedPolicyCount: rls ? prepared.emittedPolicyCount : 0,
    translatedPolicyCount: rls ? prepared.translatedPolicyCount : 0,
    normalizedForceRlsTables: rls ? prepared.normalizedForceRlsTables : Object.freeze([]),
    sql: `-- Portable PostgreSQL baseline generated from a reviewed public-schema dump.\n\n${canonical.join(";\n\n")};\n`,
  });
}

function parseOptions(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail("options are invalid");
  const keys = Object.keys(value).sort();
  if (
    keys.some(
      (key) =>
        ![
          "authMode",
          "authorizationMode",
          "backendRlsTables",
          "userIdMapping",
          "claimMappings",
        ].includes(key),
    )
  ) {
    fail("options are invalid");
  }
  const authMode = value.authMode ?? "reject-provider-auth";
  const authorizationMode = value.authorizationMode ?? "preserve";
  if (
    (authMode !== "reject-provider-auth" && authMode !== "better-auth-uuid") ||
    !["preserve", "server", "preserve-rls"].includes(authorizationMode) ||
    (authorizationMode !== "preserve-rls" &&
      (authMode === "better-auth-uuid") !== (authorizationMode === "server")) ||
    (authorizationMode !== "preserve-rls" &&
      keys.some((key) => ["backendRlsTables", "userIdMapping", "claimMappings"].includes(key)))
  ) {
    fail("options are invalid");
  }
  return Object.freeze({ ...value, authMode, authorizationMode });
}

function prepareSource(rawSource, options) {
  if (typeof rawSource !== "string") fail("source is invalid");
  if (options.authMode !== "better-auth-uuid") {
    return { source: rawSource, convertedAuthReferenceCount: 0 };
  }
  let convertedAuthReferenceCount = 0;
  const source = lexStatements(stripDumpGuards(rawSource))
    .map((statement) => {
      const tokens = lexSql(statement);
      const functionBody = tokens[0]?.value === "create" && tokens[1]?.value === "function";
      const result = convertServerAuthTokens(statement, tokens, functionBody);
      convertedAuthReferenceCount += result.count;
      return result.source;
    })
    .join(";\n");
  return {
    source,
    convertedAuthReferenceCount,
  };
}

function convertServerAuthTokens(source, tokens, includeFunctionBody) {
  const changes = [];
  let count = 0;
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      ["word", "identifier"].includes(token.kind) &&
      token.value === "auth" &&
      tokens[index + 1]?.value === "."
    ) {
      const name = tokens[index + 2];
      if (!name || !["word", "identifier"].includes(name.kind)) continue;
      if (name.value === "users") {
        changes.push({ start: token.start, end: name.end, value: 'auth."user"' });
        index += 2;
        count += 1;
      } else if (
        name?.value === "uid" &&
        tokens[index + 3]?.kind === "symbol" &&
        tokens[index + 4]?.kind === "symbol" &&
        tokens[index + 3]?.value === "(" &&
        tokens[index + 4]?.value === ")"
      ) {
        changes.push({
          start: token.start,
          end: tokens[index + 4].end,
          value: "public.current_actor_id()",
        });
        index += 4;
        count += 1;
      }
    } else if (includeFunctionBody && token.kind === "dollar") {
      const body = convertServerAuthTokens(token.value, lexSql(token.value), false);
      const delimiter = token.raw.slice(0, token.raw.indexOf("$", 1) + 1);
      changes.push({
        start: token.start,
        end: token.end,
        value: `${delimiter}${body.source}${delimiter}`,
      });
      count += body.count;
    }
  }
  for (const change of changes.reverse())
    source = source.slice(0, change.start) + change.value + source.slice(change.end);
  return { source, count };
}

function portableServiceRequestFunction() {
  return `CREATE FUNCTION public.is_service_role_request()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT current_user ~ '^ohmyho_rw_[0-7][0-9a-hjkmnp-tv-z]{25}$'
    AND current_setting('app.service_request', true) = 'on'
$$`;
}

function statementPriority(statement, normalize = normalizeStatement) {
  const normalized = normalize(statement);
  if (normalized === "set check_function_bodies = false") return 0;
  if (/^create (?:schema|extension|type|domain|sequence)\b/u.test(normalized)) return 0;
  if (/^create table\b/u.test(normalized)) return 1;
  if (/^create function\b/u.test(normalized)) return 2;
  if (/^alter table\b/u.test(normalized)) return 3;
  if (/^create (?:unique )?index\b/u.test(normalized)) return 4;
  if (/^create (?:materialized )?view\b/u.test(normalized)) return 5;
  if (/^create (?:constraint )?trigger\b/u.test(normalized)) return 6;
  fail(`unsupported portable statement: ${normalized.slice(0, 80)}`);
}

function parseArguments(values) {
  const parsed = new Map();
  for (let index = 0; index < values.length; index += 2) {
    const name = values[index];
    const value = values[index + 1];
    if (!/^--[a-z-]+$/u.test(name ?? "") || value === undefined || parsed.has(name)) {
      fail("arguments are invalid");
    }
    parsed.set(name, value);
  }
  return parsed;
}

function ignoredStatement(statement) {
  return (
    statement.startsWith("set ") ||
    statement.startsWith("select pg_catalog.set_config(") ||
    statement === "create schema public" ||
    /^create schema(?: if not exists)? private$/u.test(statement) ||
    /^alter table(?: only)? [a-z0-9_."]+ (?:enable|force) row level security$/u.test(statement)
  );
}

function rejectUnsafeStatement(statement) {
  if (
    statement.startsWith("\\") ||
    /^(?:create|alter|drop) (?:policy|role|user)\b/u.test(statement) ||
    /^(?:grant|revoke|drop|truncate|delete|update|insert)\b/u.test(statement) ||
    /^alter table(?: only)? [a-z0-9_."]+ (?:disable|no force) row level security$/u.test(statement)
  ) {
    fail(`unsafe statement: ${statement.slice(0, 80)}`);
  }
}

function normalizeExecutableStatement(statement) {
  return lexSql(statement)
    .map((token) =>
      ["string", "escaped-string", "dollar"].includes(token.kind) ? "''" : token.raw.toLowerCase(),
    )
    .join(" ")
    .replace(/\s*\.\s*/gu, ".")
    .replace(/\s*\(\s*/gu, "(")
    .replace(/\s*\)/gu, ")");
}

function rejectProviderDependencies(tokens, options, functionBody) {
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (
      ["word", "identifier"].includes(token.kind) &&
      ["auth", "storage", "supabase"].includes(token.value) &&
      tokens[index + 1]?.value === "."
    ) {
      if (
        options.authMode === "better-auth-uuid" &&
        token.value === "auth" &&
        tokens[index + 2]?.kind === "identifier" &&
        ["account", "rateLimit", "session", "user", "verification"].includes(
          tokens[index + 2].value,
        )
      )
        continue;
      fail(
        `unsafe statement: unsupported provider dependency ${token.raw}.${tokens[index + 2]?.raw ?? ""}`,
      );
    }
    if (
      functionBody &&
      (token.kind === "dollar" || (token.kind === "string" && tokens[index - 1]?.value === "as"))
    )
      rejectProviderDependencies(lexSql(token.value), options, false);
  }
}

function validateStringSetting(tokens) {
  const offset = ["local", "session"].includes(tokens[1]?.value) ? 2 : 1;
  if (
    tokens[0]?.value === "set" &&
    tokens[offset]?.value.toLowerCase() === "standard_conforming_strings"
  ) {
    const value = tokens[offset + 2];
    if (
      tokens.length !== offset + 3 ||
      !["=", "to"].includes(tokens[offset + 1]?.value) ||
      !["on", "true", "yes", "1"].includes(value?.value.toLowerCase())
    )
      fail(
        "unsupported standard_conforming_strings setting; only explicitly enabled strings are supported",
      );
  }
  if (
    tokens[0]?.kind === "word" &&
    tokens[0].value === "select" &&
    tokens.some(
      (token) => ["word", "identifier"].includes(token.kind) && token.value === "set_config",
    )
  ) {
    const expected = [
      ["word", "select"],
      ["word", "pg_catalog"],
      ["symbol", "."],
      ["word", "set_config"],
      ["symbol", "("],
      ["string", "search_path"],
      ["symbol", ","],
      ["string", ""],
      ["symbol", ","],
      ["word", "false"],
      ["symbol", ")"],
    ];
    if (
      tokens.length !== expected.length ||
      expected.some(
        ([kind, value], index) => tokens[index]?.kind !== kind || tokens[index]?.value !== value,
      )
    )
      fail(
        "unsupported set_config dump statement; only the exact literal pg_dump search_path setup is supported, with standard_conforming_strings enabled",
      );
  }
}

export function splitSqlStatements(sql) {
  return lexStatements(sql);
}

export function normalizeStatement(statement) {
  return normalizeExecutableStatement(statement);
}

function fail(message) {
  throw new Error(`Portable baseline generation failed: ${message}`);
}
