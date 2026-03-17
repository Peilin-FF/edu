---
name: chart_generator
description: Generate SVG/HTML chart files for individual student learning diagnosis reports. Produces per-question score breakdown bar charts, deducted points bar charts, knowledge mastery radar charts, and personal score rate trend line charts. Outputs standalone HTML files with embedded charts ready to be included in reports.
---

# Chart Generator Skill

This skill generates visual charts for individual student learning diagnosis reports.

## Supported Chart Types

| Chart ID | Description | Required Fields |
|---|---|---|
| `score_breakdown` | Per-question score rate bar chart | `questions[]` (id, score_rate_pct, status, knowledge_point) |
| `error_rate` | Per-question deducted points bar chart | `questions[]` (id, deducted, full_score, knowledge_point) |
| `knowledge_radar` | Knowledge mastery radar chart | `knowledge[]` (name, mastery_pct) |
| `score_trend` | Individual score rate trend over time | `history[]` (date, score_rate_pct) |

## Usage

### Command Format

```bash
python3 chart_generator.py \
  --type <chart_type> \
  --data '<json_string>' \
  --output <output_path.html> \
  [--title "Chart Title"] \
  [--width 800] \
  [--height 400]
```

### Examples

**Score Breakdown:**
```bash
python3 chart_generator.py \
  --type score_breakdown \
  --data '{"questions":[{"id":"Q1","score_rate_pct":60,"status":"partial","knowledge_point":"二次函数"},{"id":"Q2","score_rate_pct":100,"status":"full","knowledge_point":"集合"},{"id":"Q3","score_rate_pct":0,"status":"zero","knowledge_point":"导数"}]}' \
  --output charts/score_breakdown.html \
  --title "各题得分率"
```

**Deducted Points by Question:**
```bash
python3 chart_generator.py \
  --type error_rate \
  --data '{"questions":[{"id":"Q1","deducted":2,"full_score":5,"knowledge_point":"二次函数"},{"id":"Q3","deducted":5,"full_score":5,"knowledge_point":"导数"}]}' \
  --output charts/question_accuracy.html
```

**Knowledge Mastery Radar:**
```bash
python3 chart_generator.py \
  --type knowledge_radar \
  --data '{"knowledge":[{"name":"二次函数","mastery_pct":60},{"name":"集合","mastery_pct":100},{"name":"导数","mastery_pct":0}]}' \
  --output charts/knowledge_radar.html
```

**Score Rate Trend:**
```bash
python3 chart_generator.py \
  --type score_trend \
  --data '{"history":[{"date":"2024-09-01","score_rate_pct":72},{"date":"2024-09-15","score_rate_pct":75},{"date":"2024-10-01","score_rate_pct":68},{"date":"2024-10-25","score_rate_pct":78}]}' \
  --output charts/score_trend.html
```

## Output Format

Each chart is saved as a **self-contained HTML file** with all CSS and JS embedded inline.

To embed in a report, use an HTML `<iframe>`:

```markdown
<iframe src="charts/score_breakdown.html" width="100%" height="420" frameborder="0"></iframe>
```

## Workflow in individual_report_generator

### Step 1 — After statistical analysis, call charts in sequence

```bash
# Chart 1: Per-question score breakdown
# Source: question_analysis.all_questions[].{question_id, score_rate_pct, status, knowledge_point}
python3 chart_generator.py --type score_breakdown \
  --data '{"questions":[...]}' \
  --output workspace/statistical_data/charts/score_breakdown.html

# Chart 2: Deducted points per question
# Source: question_analysis.deducted_questions[].{question_id, deducted, full_score, knowledge_point}
python3 chart_generator.py --type error_rate \
  --data '{"questions":[...]}' \
  --output workspace/statistical_data/charts/question_accuracy.html

# Chart 3: Knowledge mastery radar
# Source: knowledge_point_analysis[].{knowledge_point, mastery_rate_pct}
python3 chart_generator.py --type knowledge_radar \
  --data '{"knowledge":[...]}' \
  --output workspace/statistical_data/charts/knowledge_radar.html

# Chart 4: Personal score rate trend (if history available)
# Source: previous reports in memory/ — extract exam_date + overall_performance.score_rate_pct
python3 chart_generator.py --type score_trend \
  --data '{"history":[...]}' \
  --output workspace/statistical_data/charts/score_trend.html
```

### Step 2 — Embed chart paths in the report template

Insert the generated file paths at the designated `{{CHART_*}}` placeholders in `report_template.html`.

## Field Mapping from statistics.json

| Chart | Source field in statistics.json |
|---|---|
| `score_breakdown` | `question_analysis.all_questions[].{question_id→id, score_rate_pct, status, knowledge_point}` |
| `error_rate` | `question_analysis.deducted_questions[].{question_id→id, deducted, full_score, knowledge_point}` |
| `knowledge_radar` | `knowledge_point_analysis[].{knowledge_point→name, mastery_rate_pct→mastery_pct}` |
| `score_trend` | collected from `memory/` previous reports, not from current statistics.json |

## Error Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Invalid chart type |
| 2 | Invalid or missing JSON data |
| 3 | Missing required data fields |
| 4 | Output path write error |

On error, the script writes a diagnostic message to stderr and exits with the corresponding code.

## Notes

- `error_rate` chart automatically filters to deducted questions only. If no points were deducted, it renders a text message instead of an empty chart — no special handling needed.
- `knowledge_radar` requires at least 3 knowledge points. If fewer exist, skip this chart.
- `score_trend` requires at least 2 historical data points to be meaningful. If this is the student's first report, skip this chart.
- All charts share the same color palette and HTML shell as the class version for visual consistency.
