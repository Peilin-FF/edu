#!/usr/bin/env python3
"""
chart_generator.py — Visual chart generator for individual student learning diagnosis reports.

Usage:
    python3 chart_generator.py --type <chart_type> --data '<json>' --output <path.html>

Chart types: score_breakdown | error_rate | knowledge_radar | score_trend
"""

import argparse
import json
import os
import sys


# ── Exit codes ────────────────────────────────────────────────────────────────
ERR_INVALID_TYPE   = 1
ERR_INVALID_DATA   = 2
ERR_MISSING_FIELDS = 3
ERR_WRITE_ERROR    = 4


# ── HTML shell ────────────────────────────────────────────────────────────────
HTML_SHELL = """\
<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js"></script>
<style>
  *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
  body {{
    font-family: -apple-system, "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
    background: #fff;
    color: #1a1a1a;
    padding: 16px;
  }}
  h2 {{
    font-size: 15px;
    font-weight: 500;
    color: #444;
    margin-bottom: 14px;
    letter-spacing: 0.02em;
  }}
  .chart-wrap {{
    position: relative;
    width: 100%;
    height: {height}px;
  }}
  .legend {{
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 10px;
    font-size: 12px;
    color: #666;
  }}
  .legend-item {{
    display: flex;
    align-items: center;
    gap: 5px;
  }}
  .legend-dot {{
    width: 10px;
    height: 10px;
    border-radius: 2px;
    flex-shrink: 0;
  }}
  @media (prefers-color-scheme: dark) {{
    body {{ background: #1c1c1e; color: #e5e5e5; }}
    h2 {{ color: #aaa; }}
    .legend {{ color: #aaa; }}
  }}
</style>
</head>
<body>
{body}
</body>
</html>
"""


# ── Color palette ─────────────────────────────────────────────────────────────
COLORS = {
    "blue":   "#3274c2",
    "teal":   "#1D9E75",
    "amber":  "#BA7517",
    "coral":  "#D85A30",
    "purple": "#7F77DD",
    "gray":   "#888780",
    "green":  "#639922",
    "red":    "#E24B4A",
}

MULTI_COLORS = [
    COLORS["blue"], COLORS["teal"], COLORS["amber"],
    COLORS["coral"], COLORS["purple"], COLORS["green"],
    COLORS["red"], COLORS["gray"],
]


# ── Chart builders ─────────────────────────────────────────────────────────────

def build_score_breakdown(data: dict, title: str, height: int) -> str:
    """
    Vertical bar chart — per-question score rate for this student.
    Colour-coded: full mark (teal) / partial (amber) / zero (coral).
    Replaces the class score_dist histogram — one student has no distribution,
    but we can show exactly how they performed on every question.
    """
    if "questions" not in data:
        fatal("Missing 'questions' field in data", ERR_MISSING_FIELDS)

    qs = data["questions"]
    labels     = [q.get("id", f"Q{i+1}") for i, q in enumerate(qs)]
    rates      = [round(float(q.get("score_rate_pct", 0)), 1) for q in qs]
    kps        = [q.get("knowledge_point", "") for q in qs]
    statuses   = [q.get("status", "partial") for q in qs]

    bar_colors = []
    for s in statuses:
        if s == "full":
            bar_colors.append(COLORS["teal"])
        elif s == "zero":
            bar_colors.append(COLORS["coral"])
        else:
            bar_colors.append(COLORS["amber"])

    # Summary counts
    full_n    = sum(1 for s in statuses if s == "full")
    partial_n = sum(1 for s in statuses if s == "partial")
    zero_n    = sum(1 for s in statuses if s == "zero")
    total_n   = len(qs)

    stats_html = (
        f'<div class="legend">'
        f'<span class="legend-item"><span class="legend-dot" style="background:{COLORS["teal"]}"></span>满分（{full_n} 题）</span>'
        f'<span class="legend-item"><span class="legend-dot" style="background:{COLORS["amber"]}"></span>部分得分（{partial_n} 题）</span>'
        f'<span class="legend-item"><span class="legend-dot" style="background:{COLORS["coral"]}"></span>零分（{zero_n} 题）</span>'
        f'<span style="margin-left:auto;font-size:11px;color:#888">共 {total_n} 题</span>'
        f'</div>'
    )

    display_title = title or "各题得分率"
    body = f"""
<h2>{display_title}</h2>
<div class="chart-wrap">
  <canvas id="c"></canvas>
</div>
{stats_html}
<script>
const kps = {json.dumps(kps, ensure_ascii=False)};
new Chart(document.getElementById('c'), {{
  type: 'bar',
  data: {{
    labels: {json.dumps(labels, ensure_ascii=False)},
    datasets: [{{
      label: '得分率',
      data: {json.dumps(rates)},
      backgroundColor: {json.dumps(bar_colors)},
      borderRadius: 4,
      borderSkipped: false,
    }}]
  }},
  options: {{
    responsive: true,
    maintainAspectRatio: false,
    plugins: {{
      legend: {{ display: false }},
      tooltip: {{
        callbacks: {{
          label: ctx => ` ${{ctx.raw}}%`,
          afterLabel: ctx => kps[ctx.dataIndex] ? `知识点：${{kps[ctx.dataIndex]}}` : ''
        }}
      }}
    }},
    scales: {{
      x: {{
        grid: {{ display: false }},
        ticks: {{ font: {{ size: 11 }}, autoSkip: false, maxRotation: 30 }},
        title: {{ display: true, text: '题目', font: {{ size: 12 }} }}
      }},
      y: {{
        min: 0, max: 100,
        ticks: {{ font: {{ size: 11 }}, callback: v => v + '%' }},
        title: {{ display: true, text: '得分率（%）', font: {{ size: 12 }} }}
      }}
    }}
  }}
}});
</script>
"""
    return body


def build_error_rate(data: dict, title: str, height: int) -> str:
    """
    Horizontal bar chart — deducted points per question, colour-coded by severity.
    Individual version uses raw deducted points instead of class error rate %,
    making it immediately clear where the student lost the most marks.
    """
    if "questions" not in data:
        fatal("Missing 'questions' field in data", ERR_MISSING_FIELDS)

    qs = data["questions"]
    # Only show questions where points were deducted
    qs = [q for q in qs if float(q.get("deducted", 0)) > 0]
    if not qs:
        # Fallback: nothing deducted — render a simple message
        display_title = title or "各题丢分情况"
        body = f"<h2>{display_title}</h2><p style='color:#888;font-size:13px;margin-top:8px'>本次无丢分题目。</p>"
        return body

    labels   = [q.get("id", f"Q{i+1}") for i, q in enumerate(qs)]
    deducted = [round(float(q.get("deducted", 0)), 2) for q in qs]
    kps      = [q.get("knowledge_point", "") for q in qs]
    full_scores = [round(float(q.get("full_score", 0)), 2) for q in qs]

    # Colour by deduction ratio: lost all (coral) / lost ≥50% (amber) / lost <50% (teal)
    bar_colors = []
    for i, q in enumerate(qs):
        full = float(q.get("full_score", 1)) or 1
        ratio = deducted[i] / full
        if ratio >= 1.0:
            bar_colors.append(COLORS["coral"])
        elif ratio >= 0.5:
            bar_colors.append(COLORS["amber"])
        else:
            bar_colors.append(COLORS["teal"])

    display_title = title or "各题丢分情况"
    body = f"""
<h2>{display_title}</h2>
<div class="chart-wrap" style="height:{max(height, len(qs)*42+80)}px">
  <canvas id="c"></canvas>
</div>
<div class="legend" style="margin-top:8px">
  <span class="legend-item"><span class="legend-dot" style="background:{COLORS['coral']}"></span>全部丢分（零分）</span>
  <span class="legend-item"><span class="legend-dot" style="background:{COLORS['amber']}"></span>丢失 ≥50% 分值</span>
  <span class="legend-item"><span class="legend-dot" style="background:{COLORS['teal']}"></span>丢失 &lt;50% 分值</span>
</div>
<script>
const kps        = {json.dumps(kps, ensure_ascii=False)};
const fullScores = {json.dumps(full_scores)};
new Chart(document.getElementById('c'), {{
  type: 'bar',
  data: {{
    labels: {json.dumps(labels, ensure_ascii=False)},
    datasets: [{{
      label: '丢分',
      data: {json.dumps(deducted)},
      backgroundColor: {json.dumps(bar_colors)},
      borderRadius: 4,
      borderSkipped: false,
    }}]
  }},
  options: {{
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {{
      legend: {{ display: false }},
      tooltip: {{
        callbacks: {{
          label: ctx => ` 丢 ${{ctx.raw}} 分（满分 ${{fullScores[ctx.dataIndex]}}）`,
          afterLabel: ctx => kps[ctx.dataIndex] ? `知识点：${{kps[ctx.dataIndex]}}` : ''
        }}
      }}
    }},
    scales: {{
      x: {{
        beginAtZero: true,
        ticks: {{ font: {{ size: 11 }} }},
        title: {{ display: true, text: '丢分（分）', font: {{ size: 12 }} }}
      }},
      y: {{
        ticks: {{ font: {{ size: 12 }} }},
        grid: {{ display: false }}
      }}
    }}
  }}
}});
</script>
"""
    return body


def build_knowledge_radar(data: dict, title: str, height: int) -> str:
    """Radar / spider chart for this student's knowledge mastery percentage per topic."""
    if "knowledge" not in data:
        fatal("Missing 'knowledge' field in data", ERR_MISSING_FIELDS)

    kw = data["knowledge"]
    if len(kw) < 3:
        fatal("knowledge_radar requires at least 3 knowledge points", ERR_MISSING_FIELDS)

    labels  = [k.get("name", f"K{i+1}") for i, k in enumerate(kw)]
    mastery = [round(float(k.get("mastery_pct", 0)), 1) for k in kw]

    display_title = title or "知识点掌握度"
    body = f"""
<h2>{display_title}</h2>
<div class="chart-wrap" style="height:{height}px;max-width:{height}px;margin:0 auto">
  <canvas id="c"></canvas>
</div>
<div class="legend" style="justify-content:center">
  <span class="legend-item"><span class="legend-dot" style="background:{COLORS['blue']};border-radius:50%"></span>掌握度（%）</span>
</div>
<script>
new Chart(document.getElementById('c'), {{
  type: 'radar',
  data: {{
    labels: {json.dumps(labels, ensure_ascii=False)},
    datasets: [{{
      label: '掌握度',
      data: {json.dumps(mastery)},
      backgroundColor: 'rgba(50,116,194,0.15)',
      borderColor: '{COLORS["blue"]}',
      pointBackgroundColor: '{COLORS["blue"]}',
      pointRadius: 4,
      borderWidth: 2,
    }}]
  }},
  options: {{
    responsive: true,
    maintainAspectRatio: false,
    plugins: {{
      legend: {{ display: false }},
      tooltip: {{ callbacks: {{ label: ctx => ` ${{ctx.raw}}%` }} }}
    }},
    scales: {{
      r: {{
        min: 0, max: 100,
        ticks: {{
          stepSize: 20,
          font: {{ size: 10 }},
          callback: v => v + '%',
          backdropColor: 'transparent'
        }},
        pointLabels: {{ font: {{ size: 12 }} }},
        grid: {{ color: 'rgba(0,0,0,0.08)' }},
        angleLines: {{ color: 'rgba(0,0,0,0.08)' }}
      }}
    }}
  }}
}});
</script>
"""
    return body


def build_score_trend(data: dict, title: str, height: int) -> str:
    """
    Line chart showing this student's score rate trend across exam dates.
    Mirrors the class trend_line chart, but tracks individual score_rate_pct
    instead of class average score.
    """
    if "history" not in data:
        fatal("Missing 'history' field in data", ERR_MISSING_FIELDS)

    history = data["history"]
    dates  = [h.get("date", f"#{i+1}") for i, h in enumerate(history)]
    rates  = [round(float(h.get("score_rate_pct", 0)), 1) for h in history]

    # Trend annotation vs previous
    trend_label = ""
    if len(rates) >= 2:
        delta = rates[-1] - rates[-2]
        if delta > 1:
            trend_label = f"较上次 +{delta:.1f}% ↑"
        elif delta < -1:
            trend_label = f"较上次 {delta:.1f}% ↓"
        else:
            trend_label = "与上次持平"

    display_title = title or "个人得分率趋势"
    body = f"""
<h2>{display_title} <span style="font-size:12px;font-weight:400;color:#888;margin-left:8px">{trend_label}</span></h2>
<div class="chart-wrap">
  <canvas id="c"></canvas>
</div>
<script>
new Chart(document.getElementById('c'), {{
  type: 'line',
  data: {{
    labels: {json.dumps(dates, ensure_ascii=False)},
    datasets: [{{
      label: '得分率',
      data: {json.dumps(rates)},
      borderColor: '{COLORS["blue"]}',
      backgroundColor: 'rgba(50,116,194,0.08)',
      pointBackgroundColor: '{COLORS["blue"]}',
      pointRadius: 5,
      pointHoverRadius: 7,
      tension: 0.35,
      fill: true,
      borderWidth: 2,
    }}]
  }},
  options: {{
    responsive: true,
    maintainAspectRatio: false,
    plugins: {{
      legend: {{ display: false }},
      tooltip: {{ callbacks: {{ label: ctx => ` 得分率 ${{ctx.raw}}%` }} }}
    }},
    scales: {{
      x: {{
        grid: {{ display: false }},
        ticks: {{ font: {{ size: 11 }}, autoSkip: false, maxRotation: 30 }},
        title: {{ display: true, text: '考试日期', font: {{ size: 12 }} }}
      }},
      y: {{
        min: Math.max(0,  Math.min(...{json.dumps(rates)}) - 10),
        max: Math.min(100, Math.max(...{json.dumps(rates)}) + 10),
        ticks: {{ font: {{ size: 11 }}, callback: v => v + '%' }},
        title: {{ display: true, text: '得分率（%）', font: {{ size: 12 }} }}
      }}
    }}
  }}
}});
</script>
"""
    return body


# ── Dispatch table ─────────────────────────────────────────────────────────────
CHART_BUILDERS = {
    "score_breakdown":  build_score_breakdown,
    "error_rate":       build_error_rate,
    "knowledge_radar":  build_knowledge_radar,
    "score_trend":      build_score_trend,
}


# ── Helpers ───────────────────────────────────────────────────────────────────
def fatal(msg: str, code: int = 1):
    print(f"[chart_generator] ERROR: {msg}", file=sys.stderr)
    sys.exit(code)


def ensure_dir(path: str):
    d = os.path.dirname(path)
    if d:
        os.makedirs(d, exist_ok=True)


# ── CLI entry point ────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(
        description="Generate a chart HTML file for individual student learning diagnosis reports.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Chart types:
  score_breakdown  Per-question score rate bar chart (vertical)
  error_rate       Per-question deducted points bar chart (horizontal)
  knowledge_radar  Knowledge mastery radar chart
  score_trend      Individual score rate trend line

Examples:
  python3 chart_generator.py \\
      --type score_breakdown \\
      --data '{"questions":[{"id":"Q1","score_rate_pct":60,"status":"partial","knowledge_point":"几何"}]}' \\
      --output charts/score_breakdown.html

  python3 chart_generator.py \\
      --type error_rate \\
      --data '{"questions":[{"id":"Q1","deducted":2,"full_score":5,"knowledge_point":"几何"}]}' \\
      --output charts/question_accuracy.html

  python3 chart_generator.py \\
      --type knowledge_radar \\
      --data '{"knowledge":[{"name":"几何","mastery_pct":60},{"name":"代数","mastery_pct":80},{"name":"统计","mastery_pct":45}]}' \\
      --output charts/knowledge_radar.html

  python3 chart_generator.py \\
      --type score_trend \\
      --data '{"history":[{"date":"2024-09-10","score_rate_pct":72},{"date":"2024-10-25","score_rate_pct":78}]}' \\
      --output charts/score_trend.html
""")

    parser.add_argument("--type",   required=True,
                        help="Chart type: score_breakdown | error_rate | knowledge_radar | score_trend")
    parser.add_argument("--data",   required=True,
                        help="JSON string containing chart data")
    parser.add_argument("--output", required=True,
                        help="Output HTML file path")
    parser.add_argument("--title",  default="",
                        help="Optional chart title (overrides default)")
    parser.add_argument("--width",  type=int, default=760,
                        help="Approximate chart width in px (default: 760)")
    parser.add_argument("--height", type=int, default=380,
                        help="Chart canvas height in px (default: 380)")

    args = parser.parse_args()

    if args.type not in CHART_BUILDERS:
        valid = " | ".join(CHART_BUILDERS.keys())
        fatal(f"Unknown chart type '{args.type}'. Valid types: {valid}", ERR_INVALID_TYPE)

    try:
        data = json.loads(args.data)
    except json.JSONDecodeError as e:
        fatal(f"Invalid JSON in --data: {e}", ERR_INVALID_DATA)

    try:
        body = CHART_BUILDERS[args.type](data, args.title, args.height)
    except SystemExit:
        raise
    except Exception as e:
        fatal(f"Chart build failed: {e}", ERR_INVALID_DATA)

    html = HTML_SHELL.format(
        title=args.title or args.type,
        height=args.height,
        body=body,
    )

    ensure_dir(args.output)
    try:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(html)
    except OSError as e:
        fatal(f"Cannot write to '{args.output}': {e}", ERR_WRITE_ERROR)

    print(f"[chart_generator] OK → {args.output}")
    sys.exit(0)


if __name__ == "__main__":
    main()
