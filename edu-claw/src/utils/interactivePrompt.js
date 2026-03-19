/**
 * Step 1: Let LLM decide if a question is suitable for interactive simulation.
 * Step 2: If yes, generate the interactive HTML.
 */

export function buildSuitabilityPrompt(question) {
  return {
    system: `你是一位教育技术专家。判断一道错题是否适合制作"互动模拟实验"来帮助学生理解。

适合互动模拟的题目特征：
- 涉及物理过程、原理演示（如光传播、电路变化、信号转换）
- 有对比关系（如不同传感器的区别、不同材料的特性）
- 可以通过可视化或交互操作加深理解
- 涉及因果关系（改变输入 → 观察输出变化）

不适合互动模拟的题目特征：
- 纯记忆/背诵类（如名词定义、历史事实）
- 简单判断是非（无法通过交互增加理解）
- 选项过于简单或纯文字辨析

请严格按 JSON 格式回答：
{
  "suitable": true 或 false,
  "reason": "简短说明为什么适合/不适合",
  "simulationIdea": "如果适合，用一句话描述互动模拟的核心创意（如果不适合则为null）"
}`,
    user: `题目：${question['题目']}
题型：${question['题型']}
${question['选项'] ? '选项：' + Object.entries(question['选项']).map(([k, v]) => `${k}.${v}`).join(' / ') : ''}
正确答案：${question['正确答案']}
学生答案：${question['学生答案']}
知识点：${question['知识点']}
${question['扣分原因'] && question['扣分原因'] !== '无' ? '错因：' + question['扣分原因'] : ''}`,
  };
}

export function buildInteractiveHtmlPrompt(question, simulationIdea) {
  return {
    system: `你是一位前端交互设计大师，同时精通教育心理学。你的任务是生成一个完全自包含的 HTML 页面，通过互动模拟帮助学生理解一道做错的题目。

## 技术要求
- 输出一个完整的 HTML 文档（<!DOCTYPE html> 到 </html>）
- 只能使用纯 HTML + CSS + JavaScript，不能引入任何外部库
- CSS 使用内联 <style>，JS 使用内联 <script>
- 页面尺寸适配 iframe（宽度 100%，高度自适应）
- 配色方案：主色 #5470c6，辅色 #3ba272，背景 #f8f9fa
- 中文字体：-apple-system, "PingFang SC", "Microsoft YaHei", sans-serif
- **严禁使用 LaTeX/MathJax/KaTeX 语法**（如 $x$、\rightarrow 等），因为页面无法渲染
- 数学公式用纯 HTML 表示：箭头用 → (&rarr;)，上下标用 <sup>/<sub>，分数用斜杠，希腊字母用 Unicode（如 Ω、μ、Δ）
- 流程/因果关系用 → 连接，不要用 LaTeX 的 \rightarrow

## 设计原则
1. **引导发现**：不要直接告诉答案，让学生通过操作自己发现
2. **对比展示**：展示学生的错误选项和正确选项的区别
3. **即时反馈**：每次交互操作都有视觉/文字反馈
4. **分步引导**：页面分 3 个阶段
   - 阶段一："探索"——让学生操作（拖拽、点击、滑块等）
   - 阶段二："发现"——引导学生注意关键区别
   - 阶段三："总结"——展示正确理解 + 一句话记忆要点
5. **交互元素**：必须有至少一个用户可操作的交互（按钮、滑块、拖拽、点击切换等）

## 输出要求
直接输出完整 HTML 代码，不要用 markdown 代码块包裹，不要输出任何解释文字。`,

    user: `请为以下错题生成互动模拟页面：

题目：${question['题目']}
题型：${question['题型']}
${question['选项'] ? '选项：' + Object.entries(question['选项']).map(([k, v]) => `${k}.${v}`).join(' / ') : ''}
正确答案：${question['正确答案']}
学生错误答案：${question['学生答案']}
知识点：${question['知识点']}
${question['扣分原因'] && question['扣分原因'] !== '无' ? '学生错误原因分析：' + question['扣分原因'] : ''}

互动模拟核心创意：${simulationIdea}

请生成完整的 HTML 页面。`,
  };
}
