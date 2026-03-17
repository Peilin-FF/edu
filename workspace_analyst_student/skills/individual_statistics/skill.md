---
name: individual_statistics
description: Compute individual student performance statistics from a grading result JSON. Outputs statistics.json only. Chart generation is handled by chart_generator.py using this file's output.
---

# Individual Statistics Skill

Reads a grading result JSON for a single student and produces **one output file**:

```
statistical_data/
    statistics.json
```

No charts are generated here. Pass the statistics.json fields to `chart_generator.py` for visualization.

## Usage

```bash
python3 individual_statistics.py \
    --input  workspace/grader_output/name_ID.json \
    --output-dir workspace/statistical_data
```

## Input JSON Schema

```json
{
  "学生ID": "s01",
  "作业考试时间": "2022-10-25",
  "题目列表": [
    {
      "题目ID": "001",
      "题型": "选择题",
      "满分": 5,
      "知识点": "二次函数图像变换",
      "得分": 3,
      "学生作答": "...",
      "参考答案": "..."
    }
  ]
}
```

Questions where `题目ID` or `满分` is null are skipped automatically.

## Output: statistics.json

### Section 1 — overall_performance
```json
{
  "student_id": "s01",
  "exam_date": "2022-10-25",
  "total_full_score": 100.0,
  "total_score": 74.0,
  "score_rate_pct": 74.0,
  "deducted_points": 26.0,
  "pass_threshold": 60.0,
  "passed": true,
  "general_performance": "良好"
}
```

### Section 2 — score_structure
```json
{
  "full_mark_count": 12,
  "partial_mark_count": 5,
  "zero_mark_count": 3,
  "full_mark_rate_pct": 60.0,
  "zero_mark_rate_pct": 15.0,
  "total_questions": 20
}
```

`score_structure` reveals the student's answer pattern at a glance:
a high `full_mark_rate` signals confident mastery; a high `zero_mark_rate` signals knowledge gaps or blanked questions.

### Section 3 — question_analysis
```json
{
  "all_questions": [
    {
      "question_id": "001",
      "question_type": "选择题",
      "knowledge_point": "二次函数图像变换",
      "full_score": 5.0,
      "actual_score": 3.0,
      "deducted": 2.0,
      "score_rate_pct": 60.0,
      "status": "partial"
    }
  ],
  "deducted_questions": [ ... ]
}
```

`status` is one of: `"full"` (满分) / `"partial"` (部分得分) / `"zero"` (零分).

`deducted_questions` is a pre-filtered subset where `deducted > 0`.

### Section 4 — knowledge_point_analysis
```json
[
  {
    "knowledge_point": "二次函数图像变换",
    "question_ids": ["001", "005"],
    "question_count": 2,
    "total_full_score": 10.0,
    "total_actual_score": 6.0,
    "mastery_rate_pct": 60.0,
    "mastery_level": "⚠️ 基础薄弱",
    "has_zero_mark": false
  }
]
```

`has_zero_mark`: true if any question under this knowledge point scored zero — signals a potential hard gap rather than a partial misunderstanding.

Mastery thresholds: ≥70% → ✅ 掌握良好 / 50–69% → ⚠️ 基础薄弱 / <50% → ❗ 需要重点加强

### Section 5 — trend_analysis
```json
{
  "overall_learning_summary": "本次得分 74.0 / 100.0，得分率 74.0%，整体表现：良好。共 3 题零分，集中于知识点：应变效应。",
  "structural_weaknesses": [
    {
      "knowledge_point": "应变效应",
      "mastery_rate_pct": 0.0,
      "has_zero_mark": true,
      "severity": "critical"
    }
  ],
  "deducted_questions_count": 8,
  "weak_knowledge_points_count": 1,
  "moderate_knowledge_points_count": 2
}
```

## Handoff to chart_generator.py

After this skill runs, pass the statistics fields to `chart_generator.py`:

```bash
# Score breakdown by question — use question_analysis.all_questions
python3 chart_generator.py --type score_breakdown \
  --data '{"questions": [{"id": "001", "score_rate_pct": 60.0, "knowledge_point": "..."}]}' \
  --output charts/score_breakdown.html

# Question deduction — use question_analysis.all_questions
python3 chart_generator.py --type error_rate \
  --data '{"questions": [{"id": "001", "deducted": 2.0, "knowledge_point": "..."}]}' \
  --output charts/question_accuracy.html

# Knowledge mastery radar — use knowledge_point_analysis
python3 chart_generator.py --type knowledge_radar \
  --data '{"knowledge": [{"name": "二次函数图像变换", "mastery_pct": 60.0}]}' \
  --output charts/knowledge_radar.html
```

## Error Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | No valid questions found |
