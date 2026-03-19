/**
 * Use LLM to enrich parsed questions with knowledge points and deduction reasons.
 * Replicates enrich_and_merge.py logic in the browser.
 */

export async function enrichQuestions(questions, knowledgeTree) {
  // Extract knowledge point names from tree
  const kpNames = [];
  function collectKP(node) {
    if (node.type === '知识点') kpNames.push(node.name);
    if (node.children) node.children.forEach(collectKP);
  }
  collectKP(knowledgeTree);

  // Build LLM prompt
  const questionsForLLM = questions.map(q => ({
    '题目ID': q['题目ID'],
    '题型': q['题型'],
    '题目': q['题目'],
    '选项': q['选项'],
    '满分': q['满分'],
    '正确答案': q['正确答案'],
    '学生答案': q['学生答案'],
    '得分': q['得分'],
  }));

  const systemPrompt = `你是一位教育分析专家。请为以下考试题目标注知识点和扣分原因。

## 课程知识点参考
${kpNames.map(k => `- ${k}`).join('\n')}

## 任务要求
请为每道题返回一个 JSON 数组，每个元素包含：
1. "题目ID": 原题目ID
2. "知识点": 从上面的课程知识点参考中选择最匹配的知识点名称
3. "扣分原因":
   - 如果学生答对（得分=满分），填"无"
   - 如果学生答错，给出50-100字的专业解析，说明正确答案为什么正确，分析学生错误反映的认知偏差
4. "评分细则": 选择题/判断题填null，填空题描述评分标准

只返回 JSON 数组，不要其他文字。`;

  const userPrompt = `待标注的题目：\n${JSON.stringify(questionsForLLM, null, 2)}`;

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-3-flash-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.2,
      response_format: { type: 'json_object' },
    }),
  });

  if (!res.ok) throw new Error(`LLM 批改失败: ${res.status}`);
  const data = await res.json();
  let content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('LLM 返回为空');

  // Parse response - might be wrapped in { "result": [...] } or just [...]
  let enrichments;
  try {
    const parsed = JSON.parse(content);
    enrichments = Array.isArray(parsed) ? parsed : parsed.result || parsed.data || parsed.questions || [];
  } catch {
    throw new Error('LLM 返回的不是有效 JSON');
  }

  // Merge enrichments back into questions
  for (const e of enrichments) {
    const q = questions.find(q => q['题目ID'] === e['题目ID']);
    if (q) {
      if (e['知识点']) q['知识点'] = e['知识点'];
      if (e['扣分原因'] && e['扣分原因'] !== '待AI分析') q['扣分原因'] = e['扣分原因'];
      if (e['评分细则'] !== undefined) q['评分细则'] = e['评分细则'];
    }
  }

  return questions;
}
