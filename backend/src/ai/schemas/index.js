'use strict';
// Ajv validation helpers. Plain JSON + Ajv (D-AI-CONFIG): we never rely on vendor-constrained output.
const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const VERSION = 'v1';
const DIR = path.join(__dirname, VERSION);
const ajv = new Ajv({ allErrors: true, strict: true, useDefaults: false, coerceTypes: false });
const validators = new Map();

function schemaNames() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.schema.json')).map((f) => f.replace('.schema.json', ''));
}
function getSchema(name) {
  return JSON.parse(fs.readFileSync(path.join(DIR, `${name}.schema.json`), 'utf8'));
}
function getValidator(name) {
  if (!validators.has(name)) validators.set(name, ajv.compile(getSchema(name)));
  return validators.get(name);
}

/**
 * Extract a JSON object from raw model text: tolerate ```json fences or leading/trailing prose
 * by taking the outermost {...}. Returns {ok, data} or {ok:false, error:'invalid_json'|'no_json'}.
 */
function parseModelJson(text) {
  if (typeof text !== 'string') return { ok: false, error: 'no_json' };
  let t = text.trim();
  const fence = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) return { ok: false, error: 'no_json' };
  try {
    return { ok: true, data: JSON.parse(t.slice(start, end + 1)) };
  } catch {
    return { ok: false, error: 'invalid_json' };
  }
}

/** Validate an object. Errors are short codes only (safe to feed into the repair retry, never contain content). */
function validate(name, data) {
  const v = getValidator(name);
  const ok = v(data);
  if (ok) return { ok: true, errors: [] };
  const errors = v.errors.map((e) => `${e.instancePath || '/'}:${e.keyword}`);
  return { ok: false, errors: [...new Set(errors)].slice(0, 10) };
}

/** parseModelJson + validate in one step. */
function parseAndValidate(name, text) {
  const p = parseModelJson(text);
  if (!p.ok) return { ok: false, errors: [p.error] };
  const v = validate(name, p.data);
  return v.ok ? { ok: true, data: p.data, errors: [] } : { ok: false, errors: v.errors };
}

module.exports = { VERSION, schemaNames, getSchema, getValidator, validate, parseModelJson, parseAndValidate };
