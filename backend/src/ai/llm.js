'use strict';

const { loadPrompt } = require('./prompts');
const { parseModelJson, validate } = require('./schemas');

function normalizeYearMonth(val) {
  if (!val || typeof val !== 'string') return null;
  const s = val.trim();
  if (/^\d{4}(-(0[1-9]|1[0-2]))?$/.test(s)) return s;
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const m = dmy[1].padStart(2, '0');
    if (Number(m) >= 1 && Number(m) <= 12) return `${dmy[2]}-${m}`;
  }
  const y = s.match(/(\d{4})/);
  return y ? y[1] : null;
}

function sanitizeOutput(promptId, data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  if (promptId !== 'cv_extract') return data;

  return {
    language: ['vi', 'en', 'mixed'].includes(data.language) ? data.language : 'vi',
    summary: typeof data.summary === 'string' ? data.summary.slice(0, 400) : null,
    education: Array.isArray(data.education)
      ? data.education.slice(0, 10).map((ed) => ({
          school: String(ed?.school || '').slice(0, 150),
          degree: typeof ed?.degree === 'string' ? ed.degree.slice(0, 100) : null,
          field: typeof ed?.field === 'string' ? ed.field.slice(0, 100) : null,
          startDate: normalizeYearMonth(ed?.startDate),
          endDate: normalizeYearMonth(ed?.endDate),
          gpa: typeof ed?.gpa === 'string' ? ed.gpa.slice(0, 20) : ed?.gpa != null ? String(ed.gpa).slice(0, 20) : null,
        }))
      : [],
    experience: Array.isArray(data.experience)
      ? data.experience.slice(0, 15).map((ex) => ({
          company: String(ex?.company || '').slice(0, 150),
          title: String(ex?.title || '').slice(0, 120),
          startDate: normalizeYearMonth(ex?.startDate),
          endDate: normalizeYearMonth(ex?.endDate),
          isCurrent: Boolean(ex?.isCurrent),
          bullets: Array.isArray(ex?.bullets)
            ? ex.bullets.slice(0, 8).map((b) => String(b).slice(0, 300)).filter(Boolean)
            : [],
        }))
      : [],
    skills: Array.isArray(data.skills)
      ? data.skills.slice(0, 40).map((s) => ({
          name: String(typeof s === 'string' ? s : s?.name || '').slice(0, 80),
          level: typeof s?.level === 'number' && s.level >= 1 && s.level <= 5 ? Math.round(s.level) : null,
        })).filter((s) => s.name)
      : [],
    projects: Array.isArray(data.projects)
      ? data.projects.slice(0, 10).map((p) => ({
          name: String(p?.name || '').slice(0, 150),
          role: typeof p?.role === 'string' ? p.role.slice(0, 80) : null,
          description: typeof p?.description === 'string' ? p.description.slice(0, 500) : null,
          technologies: Array.isArray(p?.technologies)
            ? p.technologies.slice(0, 15).map((t) => String(t).slice(0, 60)).filter(Boolean)
            : [],
        })).filter((p) => p.name)
      : [],
    certifications: Array.isArray(data.certifications)
      ? data.certifications.slice(0, 10).map((c) => ({
          name: String(c?.name || '').slice(0, 150),
          issuer: typeof c?.issuer === 'string' ? c.issuer.slice(0, 120) : null,
          date: normalizeYearMonth(c?.date),
        })).filter((c) => c.name)
      : [],
  };
}

function getConfig() {
  const apiKey = (process.env.API_KEY || '').trim();
  const baseUrl = (process.env.BASE_URL || '').trim().replace(/\/+$/, '');
  const model = (process.env.MODEL_NAME || '').trim();
  return { apiKey, baseUrl, model };
}

function isConfigured() {
  const { apiKey, baseUrl, model } = getConfig();
  return Boolean(apiKey && baseUrl && model);
}

async function callChat({ messages, maxTokens = 2000, timeoutMs = 45000 }) {
  const { apiKey, baseUrl, model } = getConfig();
  if (!apiKey || !baseUrl || !model) {
    throw new Error('AI chưa được cấu hình (thiếu API_KEY / BASE_URL / MODEL_NAME).');
  }

  let lastErr;
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.2,
        }),
      });

      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`AI provider HTTP ${res.status}`);
        await new Promise((r) => setTimeout(r, 1200));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`AI provider HTTP ${res.status}${errText ? `: ${errText.slice(0, 160)}` : ''}`);
      }

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content ?? '';
      return {
        text: content,
        model: json.model || model,
        usage: json.usage || null,
      };
    } catch (err) {
      lastErr = err.name === 'AbortError' ? new Error('AI timeout') : err;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastErr || new Error('AI request failed');
}

/**
 * Run a versioned prompt, validate JSON against Ajv schema, and perform 1 repair retry on invalid JSON/schema.
 */
async function runStructuredPrompt(promptId, userContent, options = {}) {
  const prompt = loadPrompt(promptId);
  const schemaName = String(prompt.schema || prompt.id).replace(/\.v\d+$/, '');
  const maxTokens = options.maxTokens || prompt.maxOutputTokens || 1500;

  const messages = [
    { role: 'system', content: prompt.system },
    { role: 'user', content: userContent },
  ];

  const first = await callChat({ messages, maxTokens, timeoutMs: options.timeoutMs });
  const parsedJson = parseModelJson(first.text);
  const firstSanitized = parsedJson.ok ? sanitizeOutput(promptId, parsedJson.data) : null;
  const firstValidation = parsedJson.ok ? validate(schemaName, firstSanitized) : { ok: false, errors: [parsedJson.error] };
  if (firstValidation.ok) {
    return {
      data: firstSanitized,
      promptVersion: prompt.promptVersion,
      model: first.model,
      repaired: false,
    };
  }

  // One repair retry with short schema error codes only (never echoing sensitive content)
  const repairMessages = [
    ...messages,
    { role: 'assistant', content: first.text },
    {
      role: 'user',
      content: `Your previous output failed JSON/schema validation with errors: ${firstValidation.errors.join(', ')}. Respond ONLY with a valid JSON object matching the exact required keys and types.`,
    },
  ];

  const second = await callChat({ messages: repairMessages, maxTokens, timeoutMs: options.timeoutMs });
  const secondJson = parseModelJson(second.text);
  const secondSanitized = secondJson.ok ? sanitizeOutput(promptId, secondJson.data) : null;
  const repaired = secondJson.ok ? validate(schemaName, secondSanitized) : { ok: false, errors: [secondJson.error] };
  if (repaired.ok) {
    return {
      data: secondSanitized,
      promptVersion: prompt.promptVersion,
      model: second.model,
      repaired: true,
    };
  }

  const err = new Error(`AI output invalid for ${promptId}: ${repaired.errors.join(', ')}`);
  err.code = 'AI_SCHEMA_INVALID';
  throw err;
}

module.exports = { isConfigured, callChat, runStructuredPrompt };
