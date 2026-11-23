'use strict';
// Loads versioned prompt files: front matter (id, version, schema, max_output_tokens) + system body.
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'v1');
const cache = new Map();

function parseFile(text, file) {
  const m = text.replace(/\r\n/g, '\n').match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error(`prompt ${file}: missing front matter`);
  const meta = {};
  for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, '');
  }
  meta.max_output_tokens = Number(meta.max_output_tokens);
  return { meta, system: m[2].trim() };
}

/** @returns {{id, version, promptVersion:string, schema:string, maxOutputTokens:number, system:string}} */
function loadPrompt(id) {
  if (!cache.has(id)) {
    const file = path.join(DIR, `${id}.md`);
    const { meta, system } = parseFile(fs.readFileSync(file, 'utf8'), id);
    cache.set(id, {
      id: meta.id, version: meta.version, promptVersion: `${meta.id}@${meta.version}`,
      schema: meta.schema, maxOutputTokens: meta.max_output_tokens, system,
    });
  }
  return cache.get(id);
}
function promptIds() {
  return fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => f.replace('.md', ''));
}
/** Wrap untrusted text in delimiters; strips any attempt to close/open the tag from inside the data. */
function wrapData(tag, text) {
  const safe = String(text).replace(new RegExp(`</?${tag}\s*>`, 'gi'), '');
  return `<${tag}>\n${safe}\n</${tag}>`;
}

module.exports = { loadPrompt, promptIds, wrapData };
