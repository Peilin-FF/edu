#!/usr/bin/env python3
"""
class_statistics.py — Compute class performance statistics from a grading JSON.

Outputs a single statistics.json to the specified directory.
Chart generation is handled separately by chart_generator.py.

Usage:
    python3 class_statistics.py \
        --input  workspace/grader_output/class_2022-10-25.json \
        --output-dir workspace/statistical_data
"""

import argparse
import json
import os
import sys
from collections import defaultdict
from datetime import datetime


# ══════════════════════════════════════════════════════════════════════════════
# DATA LOADING & CLEANING
# ══════════════════════════════════════════════════════════════════════════════

def load_data(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def clean_questions(raw):
    """Skip rows where 题目ID or 满分 is null."""
    return [q for q in raw if q.get("题目ID") is not None and q.get("满分") is not None]


def collect_student_scores(questions):
    """Return {student_id: total_score} summed across all valid questions."""
    totals = defaultdict(float)
    seen   = set()
    for q in questions:
        for ans in q.get("学生作答", []):
            sid = ans.get("学生ID")
            if sid is None:
                continue
            seen.add(sid)
            score = ans.get("得分")
            if score is not None:
                totals[sid] += float(score)
    for sid in seen:
        totals.setdefault(sid, 0.0)
    return dict(totals)


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — OVERALL CLASS PERFORMANCE
# ══════════════════════════════════════════════════════════════════════════════

def compute_overall(student_scores, questions):
    total_full = sum(float(q["满分"]) for q in questions)
    scores = list(student_scores.values())
    n = len(scores)
    if n == 0:
        return {}

    avg            = round(sum(scores) / n, 2)
    pass_threshold = total_full * 0.6
    pass_count     = sum(1 for s in scores if s >= pass_threshold)
    pass_rate      = round(pass_count / n * 100, 1)
    difficulty     = round(avg / total_full, 3) if total_full else None

    ratio = avg / total_full if total_full else 0
    performance = "优秀" if ratio >= 0.85 else "良好" if ratio >= 0.70 else "一般" if ratio >= 0.60 else "偏差"

    return {
        "class_size":          n,
        "total_full_score":    total_full,
        "average_score":       avg,
        "highest_score":       round(max(scores), 2),
        "lowest_score":        round(min(scores), 2),
        "pass_threshold":      round(pass_threshold, 2),
        "pass_count":          pass_count,
        "pass_rate_pct":       pass_rate,
        "overall_difficulty":  difficulty,
        "general_performance": performance,
    }


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — SCORE DISTRIBUTION
# ══════════════════════════════════════════════════════════════════════════════

def compute_score_distribution(student_scores, total_full):
    scores     = list(student_scores.values())
    pct_scores = [s / total_full * 100 for s in scores] if total_full else scores

    buckets = {"90-100": 0, "80-89": 0, "70-79": 0, "60-69": 0, "<60": 0}
    for p in pct_scores:
        if p >= 90:   buckets["90-100"] += 1
        elif p >= 80: buckets["80-89"]  += 1
        elif p >= 70: buckets["70-79"]  += 1
        elif p >= 60: buckets["60-69"]  += 1
        else:         buckets["<60"]    += 1

    return {
        "buckets":           buckets,
        "raw_scores":        sorted(scores, reverse=True),
        "percentile_scores": [round(p, 1) for p in sorted(pct_scores, reverse=True)],
    }


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — QUESTION ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

def compute_question_stats(questions):
    results = []
    for q in questions:
        full  = float(q["满分"])
        valid = [a for a in q.get("学生作答", [])
                 if a.get("学生ID") is not None and a.get("得分") is not None]
        n = len(valid)

        if n == 0:
            avg_score, error_count, error_rate = 0.0, 0, 1.0
        else:
            avg_score   = sum(float(a["得分"]) for a in valid) / n
            error_count = sum(1 for a in valid if float(a["得分"]) < full)
            error_rate  = error_count / n

        results.append({
            "question_id":       q["题目ID"],
            "question_type":     q.get("题型")   or "未知题型",
            "knowledge_point":   q.get("知识点") or "未知知识点",
            "full_score":        full,
            "n_students":        n,
            "avg_score":         round(avg_score, 2),
            "error_count":       error_count,
            "error_rate":        round(error_rate, 4),
            "error_rate_pct":    round(error_rate * 100, 1),
            "accuracy_rate_pct": round((1 - error_rate) * 100, 1),
        })

    return sorted(results, key=lambda x: x["error_rate"], reverse=True)


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — KNOWLEDGE POINT ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

def compute_knowledge_points(question_stats):
    kp_map = defaultdict(lambda: {"question_ids": [], "full_scores": [], "avg_scores": []})
    for q in question_stats:
        kp = q["knowledge_point"]
        kp_map[kp]["question_ids"].append(q["question_id"])
        kp_map[kp]["full_scores"].append(q["full_score"])
        kp_map[kp]["avg_scores"].append(q["avg_score"])

    results = []
    for kp, data in kp_map.items():
        total_full = sum(data["full_scores"])
        total_avg  = sum(data["avg_scores"])
        mastery    = round(total_avg / total_full * 100, 1) if total_full else 0.0
        level = "✅ 掌握良好" if mastery >= 70 else "⚠️ 基础薄弱" if mastery >= 50 else "❗ 需要重点加强"

        results.append({
            "knowledge_point":  kp,
            "question_ids":     data["question_ids"],
            "question_count":   len(data["question_ids"]),
            "total_full_score": round(total_full, 2),
            "total_avg_score":  round(total_avg, 2),
            "mastery_rate_pct": mastery,
            "mastery_level":    level,
        })

    return sorted(results, key=lambda x: x["mastery_rate_pct"])


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — TREND ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

def compute_trend_analysis(overall, question_stats, kp_stats):
    weak_qs  = [q for q in question_stats if q["error_rate_pct"] >= 50]
    weak_kps = [k for k in kp_stats if k["mastery_rate_pct"] < 50]
    mid_kps  = [k for k in kp_stats if 50 <= k["mastery_rate_pct"] < 70]

    structural_weaknesses = (
        [{"knowledge_point": k["knowledge_point"], "mastery_rate_pct": k["mastery_rate_pct"], "severity": "critical"} for k in weak_kps] +
        [{"knowledge_point": k["knowledge_point"], "mastery_rate_pct": k["mastery_rate_pct"], "severity": "moderate"} for k in mid_kps]
    )

    trend_text = (
        f"全班 {overall.get('class_size', 0)} 人，"
        f"平均分 {overall.get('average_score', 0)}（满分 {overall.get('total_full_score', 0)}），"
        f"及格率 {overall.get('pass_rate_pct', 0)}%，"
        f"总体表现：{overall.get('general_performance', '—')}。"
        + (f"共 {len(weak_qs)} 道题目错误率超过 50%，反映学生在相关知识点上存在系统性薄弱。"
           if weak_qs else "各题整体掌握情况较好。")
    )

    return {
        "overall_learning_trend":          trend_text,
        "structural_weaknesses":           structural_weaknesses,
        "high_error_questions_count":      len(weak_qs),
        "weak_knowledge_points_count":     len(weak_kps),
        "moderate_knowledge_points_count": len(mid_kps),
    }


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Compute class statistics. Outputs statistics.json only — no charts."
    )
    parser.add_argument("--input",      required=True, help="Grading result JSON path")
    parser.add_argument("--output-dir", required=True, help="Output directory")
    args = parser.parse_args()

    raw       = load_data(args.input)
    questions = clean_questions(raw.get("题目列表", []))

    if not questions:
        print("[ERROR] No valid questions found.", file=sys.stderr)
        sys.exit(1)

    exam_date      = raw.get("作业考试时间") or os.path.splitext(os.path.basename(args.input))[0]
    student_scores = collect_student_scores(questions)
    overall        = compute_overall(student_scores, questions)
    score_dist     = compute_score_distribution(student_scores, overall["total_full_score"])
    question_stats = compute_question_stats(questions)
    kp_stats       = compute_knowledge_points(question_stats)
    trend          = compute_trend_analysis(overall, question_stats, kp_stats)

    output = {
        "exam_date":                 exam_date,
        "generated_at":              datetime.now().isoformat(timespec="seconds"),
        "overall_class_performance": overall,
        "score_distribution":        score_dist,
        "question_analysis": {
            "all_questions":        question_stats,
            "high_error_questions": [q for q in question_stats if q["error_rate_pct"] > 30],
        },
        "knowledge_point_analysis":  kp_stats,
        "trend_analysis":            trend,
    }

    os.makedirs(args.output_dir, exist_ok=True)
    out_path = os.path.join(args.output_dir, "statistics.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[OK] {out_path}")


if __name__ == "__main__":
    main()
