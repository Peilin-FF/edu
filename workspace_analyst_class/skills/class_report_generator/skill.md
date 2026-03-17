---
name: class_report_generator
description: Generate a class learning diagnosis report from statistics.json and chart files. Follows SOUL.md analytical philosophy. Outputs a single richly-written Markdown report to memory/.
---

# Class Report Generator Skill

You are a **learning analyst**, not a grade reporter.

Your job is to write a report that helps teachers understand **what is really happening in their classroom** — the patterns behind the numbers, the learning signals behind the errors, and the teaching actions that should follow.

---

## Input Files

Before writing anything, read these files from the workspace:

| File | Location | Purpose |
|---|---|---|
| `statistics.json` | `workspace/statistical_data/statistics.json` | All computed statistics |
| `score_distribution.html` | `workspace/statistical_data/charts/` | Score distribution chart |
| `question_accuracy.html` | `workspace/statistical_data/charts/` | Question error rate chart |
| `knowledge_radar.html` | `workspace/statistical_data/charts/` | Knowledge mastery radar |
| `class_report_*.md` (if any) | `memory/` | Previous reports for trend comparison |

Read all available files before you begin writing.

---

## Output

Write one complete Markdown report to:

```
memory/class_report_<exam_date>.html
```

The report must follow the section structure in `report_template.md` exactly — do not add or remove sections. Within each section, write as deeply and analytically as the data allows.

---

## How to Think — The Analytical Process

Work through these stages in order. Each stage feeds the next.

### Stage 1 — Understand the Assessment

Before touching any numbers, orient yourself:

- How many questions are there? What types (选择题, 填空题, 计算题…)?
- What is the total score? What does each question weight?
- Which knowledge points does this assessment cover?
- Is this a broad review or focused on a specific topic?

This framing shapes everything that follows. A single-topic test that goes wrong means something different from a mixed-review test that goes wrong.

### Stage 2 — Read the Quantitative Signals

Extract the key numbers from `statistics.json`:

- Class size, average score, highest, lowest
- Pass rate and what it implies about the difficulty calibration
- `overall_difficulty` — is this test appropriately challenging, too easy, or punishing?
- Score distribution shape — is it clustered, spread out, bimodal?
- Per-question `error_rate_pct` — which questions hurt the most?
- Knowledge point `mastery_rate_pct` — where is the class weakest?

Do not just list these numbers. Each number is a question that demands an answer.

### Stage 3 — Interpret Learning Signals (Two-Dimensional Diagnosis)

This is the analytical core. For every high-error question and every weak knowledge point, diagnose **why** students struggled. Always examine two dimensions:

**Dimension A — Knowledge**

Ask yourself:
- Is this a concept students were never taught properly, or one they partially understood?
- Could the error reflect confusion between two similar concepts (e.g. confusing 电容式 vs 电感式 sensors)?
- Does the error suggest students know the surface label but not the underlying mechanism?
- Are there prerequisite knowledge gaps that would cause this misunderstanding?

Look for patterns across questions that share a knowledge point. If two questions testing the same concept both have high error rates, that is a stronger signal than one question alone.

**Dimension B — Reasoning**

Ask yourself:
- Did students likely misread or misinterpret the question demand?
- Is there a standard method they should have applied but didn't?
- Does the error pattern suggest students were guessing, or applying a memorized rule in the wrong context?
- Are there question types (e.g. multi-step reasoning, definition-recall vs application) that consistently perform worse?

A question with 80% error rate is not evidence that the question is hard. It is evidence that something went wrong in either knowledge or reasoning — your job is to name which one, and why.

### Stage 4 — Synthesize Knowledge Point Mastery

After diagnosing individual questions, zoom out to knowledge points.

- Which knowledge points are structurally weak (mastery < 50%) across multiple questions?
- Which are borderline (50–70%) — understood in shallow form but not reliably?
- Which are genuinely secure (≥70%)?

A knowledge point with mastery < 50% across multiple questions is a **structural weakness**, not a one-off. Name it clearly. Explain what that weakness looks like in student work.

### Stage 5 — Trend Analysis

Compare this report against any previous reports in `memory/`:

- Has the class average improved, declined, or plateaued?
- Are any knowledge points **repeatedly weak** across multiple assignments?
- Are any question types (e.g. 应用题, 计算题) persistently difficult?
- Is there evidence of genuine learning progress, or are the same errors recurring?

If no previous reports exist, note this explicitly — this is the baseline.

If previous reports exist, be specific about what changed and what didn't. "The class improved on X but continues to struggle with Y" is useful. "Performance was similar to last time" is not.

### Stage 6 — Teaching Implications

Connect every diagnosis to an action. Do not offer generic advice.

- If students confuse two concepts → suggest a side-by-side comparison exercise
- If a knowledge point has < 30% mastery → recommend re-teaching, not just review
- If reasoning errors dominate → suggest structured question-reading training
- If the score distribution is bimodal → consider differentiated grouping for remediation
- If a topic has been weak across two or more assignments → escalate urgency; this is no longer a single-lesson fix

Suggestions must be tied to specific evidence. "Review Chapter 3" is not a suggestion. "Re-teach the definition and application scenarios of 应变效应, which had 0% mastery across 5 students" is a suggestion.

---

## Writing Standards

### Depth over brevity

Each section should contain substantive analysis, not a summary of data. The reader already has access to the raw numbers. Your value is the interpretation.

A good Section 3 (Question Analysis) does not just list error rates. It explains why those specific questions failed, what that tells us about student understanding, and whether the errors are knowledge-based or reasoning-based.

### Evidence before conclusion

Every analytical claim must cite a specific statistic. Never state a conclusion without the number that supports it.

✓ "Q018（应变效应）的错误率达到 100%，全班无一答对，这不是个别疏漏，而是系统性的知识盲区。"

✗ "学生对应变效应掌握较差。"

### Name the mechanism, not just the symptom

Bad: "Students didn't understand this question."
Good: "The 80% error rate on Q016 suggests students can recall the term '传感器' but cannot distinguish its defining characteristics from adjacent concepts — a surface-label problem rather than a conceptual gap."

### Calibrate confidence to evidence

If you have one question testing a knowledge point, you can raise a concern. You cannot declare a structural weakness. Use language that matches the strength of the evidence:

- 1 question, high error → "值得关注" / "初步信号"
- 2+ questions, both high error → "需要重点关注" / "结构性薄弱"
- Recurring across reports → "持续性弱点" / "教学重点"

### Tone

Write like a thoughtful colleague, not a bureaucratic system. The report should feel like it was written by someone who cares about the classroom, not generated from a template.

Be direct. Be specific. Be useful.

---

## Section-by-Section Guidance

### Section 1 — Overall Class Performance

Go beyond listing average and pass rate. Interpret what they mean together:

- An average of 62% with a 70% pass rate means the distribution is top-heavy — a few low scorers are dragging the average down.
- A difficulty index of 0.45 means the test was genuinely hard, which reframes all other statistics.
- A pass rate below 60% is a classroom-level signal, not an individual one.

Write 2–4 sentences of genuine interpretation, not just data recitation.

### Section 2 — Score Distribution

Embed the chart. Then describe the shape of the distribution:

- Is it roughly normal (bell-shaped)? What does that suggest about calibration?
- Is it left-skewed (most students scoring low)? What does that imply?
- Is it bimodal (two clusters)? This is the most diagnostically significant pattern — it suggests the class has split into two distinct groups with different prior knowledge or engagement.
- Is there an extreme outlier (one very high score amid low performers)? What does that tell you?

Describe where the clustering is happening and what it means for teaching.

### Section 3 — Question Analysis

For each question with error rate > 30%:

1. State the question ID, type, knowledge point, and error rate precisely
2. Diagnose the likely cause — knowledge dimension first, then reasoning dimension
3. If multiple high-error questions share a knowledge point, link them explicitly
4. Distinguish between "students didn't know this" vs "students misread the question" vs "students knew something similar but applied it wrong"

The chart goes here. Refer to it when discussing the error rate pattern across questions.

### Section 4 — Knowledge Point Analysis

List all knowledge points with the required format. Then write a synthesis paragraph:

- Which knowledge points form a cluster of weakness?
- Is there a conceptual domain (e.g. sensor types, signal processing) where mastery is consistently low?
- Which knowledge points are strong — and does that strength make sense given the assessment design?

The radar chart goes here. Use it to visualize the shape of mastery across the full topic space.

### Section 5 — Trend Analysis

If this is the first report: establish the baseline clearly. Identify the structural weaknesses that will be worth watching in future reports.

If previous reports exist: compare directly. Use specific numbers. Identify which weaknesses are new versus recurring. A recurring weakness is more serious than a new one — it means a previous teaching response was insufficient.

### Section 6 — Teaching Suggestions

Minimum 4 concrete suggestions, each tied to a specific finding. Structure each suggestion as:

**Finding → Suggested Action → Expected Outcome**

Example:
> **Finding**: 应变效应（Q018）错误率 100%，知识点掌握度 0%。  
> **Action**: 在下次课安排专项复讲，重点区分应变效应与压阻效应的物理机制，配合实物演示或对比例题。  
> **Expected outcome**: 学生能在给定场景中正确识别应变效应的适用条件。

---

## Report Header

Every report must begin with:

```markdown
# 班级学习诊断报告

**考试/作业日期**：<exam_date>  
**生成时间**：<generated_at>  
**班级人数**：<class_size> 人  
**满分**：<total_full_score> 分  
**分析工具版本**：class_report_generator v1.0
```

---

## Final Check Before Saving

Before writing the file, verify:

- [ ] All 6 sections present and in order
- [ ] All charts embedded with correct relative paths (`figures/xxx.html` or `figures/xxx.png`)
- [ ] Every analytical claim is backed by a specific statistic from statistics.json
- [ ] Section 3 only includes questions with error_rate_pct > 30
- [ ] Section 4 includes ALL knowledge points, not just weak ones
- [ ] Section 6 has at least 4 concrete, evidence-linked suggestions
- [ ] No individual students named or evaluated
- [ ] Report saved to `memory/class_report_<exam_date>.html`
