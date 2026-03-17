---
name: class_statistics
description: Compute class performance statistics from a grading result JSON. Outputs statistics.json only. Chart generation is handled by chart_generator.py using this file's output.
---

# Class Statistics Skill

Reads a grading result JSON and produces **one output file**:

```
statistical_data/
    statistics.json
```

No charts are generated here. Pass the statistics.json fields to `chart_generator.py` for visualization.

## Usage

```bash
python3 class_statistics.py \
    --input  workspace/grader_output/class_2022-10-25.json \
    --output-dir workspace/statistical_data
```

## Input JSON Schema

```json
{
  "作业考试时间": "2022-10-25",
  "题目列表": [
    {
      "题目ID": "001",
      "题型": "选择题",
      "满分": 5,
      "知识点": "二次函数图像变换",
      "学生作答": [
        { "学生ID": "s01", "得分": 5 },
        { "学生ID": "s02", "得分": 0 }
      ]
    }
  ]
}
```

Questions where `题目ID` or `满分` is null are skipped automatically.

## Output: statistics.json

### Section 1 — overall_class_performance
```json
{
  "class_size": 30,
  "total_full_score": 100.0,
  "average_score": 74.3,
  "highest_score": 98.0,
  "lowest_score": 41.0,
  "pass_threshold": 60.0,
  "pass_count": 25,
  "pass_rate_pct": 83.3,
  "overall_difficulty": 0.743,
  "general_performance": "良好"
}
```

### Section 2 — score_distribution
```json
{
  "buckets": { "90-100": 3, "80-89": 8, "70-79": 10, "60-69": 4, "<60": 5 },
  "raw_scores": [98.0, 95.0, ...],
  "percentile_scores": [98.0, 95.0, ...]
}
```

### Section 3 — question_analysis
```json
{
  "all_questions": [
    {
      "question_id": "018",
      "question_type": "填空题",
      "knowledge_point": "应变效应",
      "full_score": 3.0,
      "n_students": 5,
      "avg_score": 0.0,
      "error_count": 5,
      "error_rate": 1.0,
      "error_rate_pct": 100.0,
      "accuracy_rate_pct": 0.0
    }
  ],
  "high_error_questions": [ ... ]
}
```

`high_error_questions` is a pre-filtered subset where `error_rate_pct > 30`.

### Section 4 — knowledge_point_analysis
```json
[
  {
    "knowledge_point": "应变效应",
    "question_ids": ["018"],
    "question_count": 1,
    "total_full_score": 3.0,
    "total_avg_score": 0.0,
    "mastery_rate_pct": 0.0,
    "mastery_level": "❗ 需要重点加强"
  }
]
```

Mastery thresholds: ≥70% → ✅ 掌握良好 / 50–69% → ⚠️ 基础薄弱 / <50% → ❗ 需要重点加强

### Section 5 — trend_analysis
```json
{
  "overall_learning_trend": "全班 30 人，平均分 74.3...",
  "structural_weaknesses": [
    { "knowledge_point": "应变效应", "mastery_rate_pct": 0.0, "severity": "critical" }
  ],
  "high_error_questions_count": 2,
  "weak_knowledge_points_count": 1,
  "moderate_knowledge_points_count": 2
}
```

## Handoff to chart_generator.py

After this skill runs, pass the statistics fields to `chart_generator.py`:

```bash
# Score distribution — use score_distribution.raw_scores
python3 chart_generator.py --type score_dist \
  --data '{"scores": [...], "date": "2022-10-25"}' \
  --output charts/score_distribution.html

# Question error rate — use question_analysis.all_questions
python3 chart_generator.py --type error_rate \
  --data '{"questions": [{"id": "001", "error_rate": 0.5, "knowledge_point": "..."}]}' \
  --output charts/question_accuracy.html

# Knowledge mastery radar — use knowledge_point_analysis
python3 chart_generator.py --type knowledge_radar \
  --data '{"knowledge": [{"name": "应变效应", "mastery_pct": 0.0}]}' \
  --output charts/knowledge_radar.html
```

## Error Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | No valid questions found |
