'use strict';

const { loadPrompt } = require('./prompts');
const { parseAndValidate } = require('./schemas');

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
  const parsed = parseAndValidate(schemaName, first.text);
  if (parsed.ok) {
    return {
      data: parsed.data,
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
      content: `Your previous output failed JSON/schema validation with errors: ${parsed.errors.join(', ')}. Respond ONLY with a valid JSON object matching the exact required keys and types.`,
    },
  ];

  const second = await callChat({ messages: repairMessages, maxTokens, timeoutMs: options.timeoutMs });
  const repaired = parseAndValidate(schemaName, second.text);
  if (repaired.ok) {
    return {
      data: repaired.data,
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
