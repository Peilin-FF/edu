---
name: chart_generator
description: Generate SVG/HTML chart files for class learning diagnosis reports. Produces score distribution histograms, question error rate bar charts, knowledge mastery radar charts, and trend line charts. Outputs standalone HTML files with embedded charts ready to be included in Markdown reports.
---

# Chart Generator Skill

This skill generates visual charts for class learning diagnosis reports.

## Supported Chart Types

| Chart ID | Description | Required Fields |
|---|---|---|
| `score_dist` | Score distribution histogram | `scores[]`, `date` |
| `error_rate` | Question error rate bar chart | `questions[]` (id, error_rate, knowledge_point) |
| `knowledge_radar` | Knowledge mastery radar chart | `knowledge[]` (name, mastery_pct) |
| `trend_line` | Class average trend over time | `history[]` (date, avg_score) |

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

**Score Distribution:**
```bash
python3 chart_generator.py \
  --type score_dist \
  --data '{"scores":[88,72,95,61,78,84,53,90,76,82],"date":"2024-10-25"}' \
  --output charts/score_dist_2024-10-25.html \
  --title "Score Distribution"
```

**Error Rate by Question:**
```bash
python3 chart_generator.py \
  --type error_rate \
  --data '{"questions":[{"id":"Q1","error_rate":0.15,"knowledge_point":"Algebra"},{"id":"Q2","error_rate":0.62,"knowledge_point":"Geometry"},{"id":"Q3","error_rate":0.08,"knowledge_point":"Algebra"}]}' \
  --output charts/error_rate.html
```

**Knowledge Mastery Radar:**
```bash
python3 chart_generator.py \
  --type knowledge_radar \
  --data '{"knowledge":[{"name":"Algebra","mastery_pct":85},{"name":"Geometry","mastery_pct":52},{"name":"Calculus","mastery_pct":71}]}' \
  --output charts/knowledge_radar.html
```

**Trend Line:**
```bash
python3 chart_generator.py \
  --type trend_line \
  --data '{"history":[{"date":"2024-09-01","avg_score":72},{"date":"2024-09-15","avg_score":75},{"date":"2024-10-01","avg_score":68},{"date":"2024-10-25","avg_score":79}]}' \
  --output charts/trend.html
```

## Output Format

Each chart is saved as a **self-contained HTML file** with all CSS and JS embedded inline.

To embed in a Markdown report, use an HTML `<iframe>` or reference the file path:

```markdown
![Score Distribution](charts/score_dist_2024-10-25.html)

<!-- Or as iframe for interactive display -->
<iframe src="charts/score_dist_2024-10-25.html" width="100%" height="420" frameborder="0"></iframe>
```

## Workflow in class_report_generator

### Step 1 — After statistical analysis, call charts in sequence

```bash
# Chart 1: Score distribution
python3 chart_generator.py --type score_dist \
  --data '{"scores":[...], "date":"YYYY-MM-DD"}' \
  --output workspace_analyst/memory/charts/score_dist_YYYY-MM-DD.html

# Chart 2: Error rate per question  
python3 chart_generator.py --type error_rate \
  --data '{"questions":[...]}' \
  --output workspace_analyst/memory/charts/error_rate_YYYY-MM-DD.html

# Chart 3: Knowledge mastery
python3 chart_generator.py --type knowledge_radar \
  --data '{"knowledge":[...]}' \
  --output workspace_analyst/memory/charts/knowledge_radar_YYYY-MM-DD.html

# Chart 4: Historical trend (if history available)
python3 chart_generator.py --type trend_line \
  --data '{"history":[...]}' \
  --output workspace_analyst/memory/charts/trend_YYYY-MM-DD.html
```

### Step 2 — Embed chart paths in the report template

Insert the generated file paths at the designated `{{CHART_*}}` placeholders in `report_template.md`.

## Error Codes

| Code | Meaning |
|---|---|
| 0 | Success |
| 1 | Invalid chart type |
| 2 | Invalid or missing JSON data |
| 3 | Missing required data fields |
| 4 | Output path write error |

On error, the script writes a diagnostic message to stderr and exits with the corresponding code.
