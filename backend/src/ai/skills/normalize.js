'use strict';

// Shared skill/text normalisation (AI_DESIGN §2.6). Pure, no I/O.
// "Node.js" -> "nodejs", "Kỹ năng giao tiếp" -> "ky nang giao tiep", "C++" -> "cpp".

const SPECIAL = [
  [/c\+\+/g, 'cpp'],
  [/c#/g, 'csharp'],
  [/f#/g, 'fsharp'],
  [/\.net\b/g, 'dotnet'],
];

function stripDiacritics(s) {
  return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D');
}

function normalizeSkill(input) {
  if (input === null || input === undefined) return '';
  let s = stripDiacritics(input).toLowerCase();
  for (const [re, rep] of SPECIAL) s = s.replace(re, rep);
  s = s.replace(/['’.]/g, ''); // node.js -> nodejs, don't -> dont
  s = s.replace(/[^a-z0-9]+/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

module.exports = { normalizeSkill, stripDiacritics };
