/* global __LLM_MODEL__ */
const MODEL = typeof __LLM_MODEL__ !== 'undefined' ? __LLM_MODEL__ : 'gpt-4o-mini';

import { buildSystemPrompt, buildUserPrompt } from './pptPrompt';
import { buildPracticeSystemPrompt, buildPracticeUserPrompt } from './practicePrompt';
import { buildSuitabilityPrompt, buildInteractiveHtmlPrompt } from './interactivePrompt';

export async function generatePptSlides(question) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt() },
        { role: 'user', content: buildUserPrompt(question) },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM 请求失败 (${res.status}): ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM 返回内容为空');

  const parsed = JSON.parse(content);
  if (!parsed.slides || !Array.isArray(parsed.slides)) {
    throw new Error('LLM 返回格式不正确：缺少 slides 数组');
  }

  return parsed;
}

export async function generatePractice(question) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: buildPracticeSystemPrompt() },
        { role: 'user', content: buildPracticeUserPrompt(question) },
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LLM 请求失败 (${res.status}): ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM 返回内容为空');

  const parsed = JSON.parse(content);
  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error('LLM 返回格式不正确：缺少 questions 数组');
  }

  return parsed;
}

/**
 * Stream a chat conversation with the AI tutor.
 * @param {Array} messages - [{role, content}, ...]
 * @param {function} onChunk - Called with each text chunk
 * @param {AbortSignal} signal - For cancellation
 */
export async function streamChat(messages, onChunk, signal) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      stream: true,
    }),
    signal,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`请求失败 (${res.status}): ${text}`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data: ')) continue;
      const data = trimmed.slice(6);
      if (data === '[DONE]') return;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) onChunk(delta);
      } catch { /* skip malformed chunks */ }
    }
  }
}

/** Check if a question is suitable for interactive simulation */
export async function checkInteractiveSuitability(question) {
  const { system, user } = buildSuitabilityPrompt(question);
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`LLM 请求失败 (${res.status})`);
  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM 返回为空');
  return JSON.parse(content);
}

/** Generate interactive HTML simulation for a wrong question */
export async function generateInteractiveHtml(question, simulationIdea) {
  const { system, user } = buildInteractiveHtmlPrompt(question, simulationIdea);
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.7,
      max_tokens: 8192,
    }),
  });

  if (!res.ok) throw new Error(`LLM 请求失败 (${res.status})`);
  const data = await res.json();
  let content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM 返回为空');

  // Strip markdown code fences if present
  content = content.replace(/^```html?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();

  if (!content.includes('<html') && !content.includes('<!DOCTYPE')) {
    throw new Error('生成的内容不是有效的 HTML');
  }

  return content;
}
