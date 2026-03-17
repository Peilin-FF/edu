#!/usr/bin/env python3
"""
chart_generator.py — Visual chart generator for class learning diagnosis reports.

Usage:
    python3 chart_generator.py --type <chart_type> --data '<json>' --output <path.html>

Chart types: score_dist | error_rate | knowledge_radar | trend_line
"""

import argparse
import json
import os
import sys
from math import pi, cos, sin


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

def build_score_dist(data: dict, title: str, height: int) -> str:
    """Score distribution histogram — fixed buckets 0-9,10-19,...,90-100."""
    if "scores" not in data:
        fatal("Missing 'scores' field in data", ERR_MISSING_FIELDS)

    scores = [float(s) for s in data["scores"]]
    date   = data.get("date", "")

    # 11 buckets: 0-9, 10-19, ..., 90-100
    buckets     = [0] * 11
    bucket_labels = [f"{i*10}–{i*10+9}" if i < 10 else "90–100" for i in range(11)]
    bucket_labels[10] = "90–100"
    for s in scores:
        idx = min(int(s // 10), 10)
        buckets[idx] += 1

    # Colour: <60 coral, 60–79 amber, >=80 teal
    bar_colors = []
    for i in range(11):
        if i < 6:
            bar_colors.append(COLORS["coral"])
        elif i < 8:
            bar_colors.append(COLORS["amber"])
        else:
            bar_colors.append(COLORS["teal"])

    # Stats
    avg  = round(sum(scores) / len(scores), 1) if scores else 0
    hi   = int(max(scores)) if scores else 0
    lo   = int(min(scores)) if scores else 0
    n    = len(scores)

    stats_html = (
        f'<div class="legend">'
        f'<span class="legend-item"><span class="legend-dot" style="background:{COLORS["coral"]}"></span>不及格（&lt;60）</span>'
        f'<span class="legend-item"><span class="legend-dot" style="background:{COLORS["amber"]}"></span>及格（60–79）</span>'
        f'<span class="legend-item"><span class="legend-dot" style="background:{COLORS["teal"]}"></span>优良（≥80）</span>'
        f'<span style="margin-left:auto;font-size:11px;color:#888">人数 {n} &nbsp;|&nbsp; 均分 {avg} &nbsp;|&nbsp; 最高 {hi} &nbsp;|&nbsp; 最低 {lo}</span>'
        f'</div>'
    )

    display_title = title or f"成绩分布 {date}"
    body = f"""
<h2>{display_title}</h2>
<div class="chart-wrap">
  <canvas id="c"></canvas>
</div>
{stats_html}
<script>
new Chart(document.getElementById('c'), {{
  type: 'bar',
  data: {{
    labels: {json.dumps(bucket_labels, ensure_ascii=False)},
    datasets: [{{
      label: '人数',
      data: {json.dumps(buckets)},
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
          label: ctx => ` ${{ctx.raw}} 人`
        }}
      }}
    }},
    scales: {{
      x: {{
        grid: {{ display: false }},
        ticks: {{ font: {{ size: 11 }}, autoSkip: false, maxRotation: 30 }},
        title: {{ display: true, text: '分数段', font: {{ size: 12 }} }}
      }},
      y: {{
        beginAtZero: true,
        ticks: {{ stepSize: 1, font: {{ size: 11 }} }},
        title: {{ display: true, text: '人数', font: {{ size: 12 }} }}
      }}
    }}
  }}
}});
</script>
"""
    return body


def build_error_rate(data: dict, title: str, height: int) -> str:
    """Horizontal bar chart — error rate per question, colour-coded by threshold."""
    if "questions" not in data:
        fatal("Missing 'questions' field in data", ERR_MISSING_FIELDS)

    qs = data["questions"]
    labels  = [q.get("id", f"Q{i+1}") for i, q in enumerate(qs)]
    rates   = [round(float(q.get("error_rate", 0)) * 100, 1) for q in qs]
    kps     = [q.get("knowledge_point", "") for q in qs]

    bar_colors = [
        COLORS["red"] if r >= 50 else COLORS["amber"] if r >= 30 else COLORS["teal"]
        for r in rates
    ]

    display_title = title or "各题错误率"
    body = f"""
<h2>{display_title}</h2>
<div class="chart-wrap" style="height:{max(height, len(qs)*42+80)}px">
  <canvas id="c"></canvas>
</div>
<div class="legend" style="margin-top:8px">
  <span class="legend-item"><span class="legend-dot" style="background:{COLORS['red']}"></span>高错误率（≥50%）</span>
  <span class="legend-item"><span class="legend-dot" style="background:{COLORS['amber']}"></span>中错误率（30–49%）</span>
  <span class="legend-item"><span class="legend-dot" style="background:{COLORS['teal']}"></span>低错误率（&lt;30%）</span>
</div>
<script>
const kps = {json.dumps(kps, ensure_ascii=False)};
new Chart(document.getElementById('c'), {{
  type: 'bar',
  data: {{
    labels: {json.dumps(labels, ensure_ascii=False)},
    datasets: [{{
      label: '错误率',
      data: {json.dumps(rates)},
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
          label: ctx => ` ${{ctx.raw}}%`,
          afterLabel: ctx => kps[ctx.dataIndex] ? `知识点：${{kps[ctx.dataIndex]}}` : ''
        }}
      }}
    }},
    scales: {{
      x: {{
        min: 0, max: 100,
        ticks: {{ font: {{ size: 11 }}, callback: v => v + '%' }},
        title: {{ display: true, text: '错误率（%）', font: {{ size: 12 }} }}
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
    """Radar / spider chart for knowledge mastery percentage per topic."""
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


def build_trend_line(data: dict, title: str, height: int) -> str:
    """Line chart showing class average score trend across exam dates."""
    if "history" not in data:
        fatal("Missing 'history' field in data", ERR_MISSING_FIELDS)

    history = data["history"]
    dates  = [h.get("date", f"#{i+1}") for i, h in enumerate(history)]
    avgs   = [round(float(h.get("avg_score", 0)), 1) for h in history]

    # Compute trend direction for annotation
    trend_label = ""
    if len(avgs) >= 2:
        delta = avgs[-1] - avgs[-2]
        if delta > 1:
            trend_label = f"较上次 +{delta:.1f} ↑"
        elif delta < -1:
            trend_label = f"较上次 {delta:.1f} ↓"
        else:
            trend_label = "与上次持平"

    display_title = title or "班级平均分趋势"
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
      label: '班级均分',
      data: {json.dumps(avgs)},
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
      tooltip: {{ callbacks: {{ label: ctx => ` 均分 ${{ctx.raw}}` }} }}
    }},
    scales: {{
      x: {{
        grid: {{ display: false }},
        ticks: {{ font: {{ size: 11 }}, autoSkip: false, maxRotation: 30 }},
        title: {{ display: true, text: '考试日期', font: {{ size: 12 }} }}
      }},
      y: {{
        min: Math.max(0, Math.min(...{json.dumps(avgs)}) - 10),
        max: Math.min(100, Math.max(...{json.dumps(avgs)}) + 10),
        ticks: {{ font: {{ size: 11 }} }},
        title: {{ display: true, text: '平均分', font: {{ size: 12 }} }}
      }}
    }}
  }}
}});
</script>
"""
    return body


# ── Dispatch table ─────────────────────────────────────────────────────────────
CHART_BUILDERS = {
    "score_dist":       build_score_dist,
    "error_rate":       build_error_rate,
    "knowledge_radar":  build_knowledge_radar,
    "trend_line":       build_trend_line,
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
        description="Generate a chart HTML file for class learning diagnosis reports.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Chart types:
  score_dist       Score distribution histogram
  error_rate       Question error rate bar chart (horizontal)
  knowledge_radar  Knowledge mastery radar chart
  trend_line       Class average score trend line

Examples:
  python3 chart_generator.py \\
      --type score_dist \\
      --data '{"scores":[88,72,95,61,78,84,53,90,76,82],"date":"2024-10-25"}' \\
      --output charts/score_dist.html

  python3 chart_generator.py \\
      --type error_rate \\
      --data '{"questions":[{"id":"Q1","error_rate":0.62,"knowledge_point":"几何"}]}' \\
      --output charts/error_rate.html
""")

    parser.add_argument("--type",   required=True,
                        help="Chart type: score_dist | error_rate | knowledge_radar | trend_line")
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

    # Validate chart type
    if args.type not in CHART_BUILDERS:
        valid = " | ".join(CHART_BUILDERS.keys())
        fatal(f"Unknown chart type '{args.type}'. Valid types: {valid}", ERR_INVALID_TYPE)

    # Parse JSON data
    try:
        data = json.loads(args.data)
    except json.JSONDecodeError as e:
        fatal(f"Invalid JSON in --data: {e}", ERR_INVALID_DATA)

    # Build chart body
    try:
        body = CHART_BUILDERS[args.type](data, args.title, args.height)
    except SystemExit:
        raise
    except Exception as e:
        fatal(f"Chart build failed: {e}", ERR_INVALID_DATA)

    # Assemble full HTML
    html = HTML_SHELL.format(
        title=args.title or args.type,
        height=args.height,
        body=body,
    )

    # Write output
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
