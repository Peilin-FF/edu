import { buildSystemPrompt, buildUserPrompt } from './pptPrompt';

export async function generatePptSlides(question) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-3-flash-preview',
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
