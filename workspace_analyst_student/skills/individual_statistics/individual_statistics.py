#!/usr/bin/env python3
"""
individual_statistics.py — Compute individual student performance statistics from a grading JSON.

Outputs a single statistics.json to the specified directory.
Chart generation is handled separately by chart_generator.py.

Usage:
    python3 individual_statistics.py \
        --input  workspace/grader_output/name_ID.json \
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


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — OVERALL PERFORMANCE
# ══════════════════════════════════════════════════════════════════════════════

def compute_overall(student_id, exam_date, questions):
    total_full   = sum(float(q["满分"]) for q in questions)
    total_actual = sum(float(q.get("得分") or 0) for q in questions)
    deducted     = total_full - total_actual
    score_rate   = round(total_actual / total_full * 100, 1) if total_full else 0.0
    pass_threshold = total_full * 0.6
    passed       = total_actual >= pass_threshold

    ratio = total_actual / total_full if total_full else 0
    performance = "优秀" if ratio >= 0.85 else "良好" if ratio >= 0.70 else "一般" if ratio >= 0.60 else "偏差"

    return {
        "student_id":          student_id,
        "exam_date":           exam_date,
        "total_full_score":    round(total_full, 2),
        "total_score":         round(total_actual, 2),
        "score_rate_pct":      score_rate,
        "deducted_points":     round(deducted, 2),
        "pass_threshold":      round(pass_threshold, 2),
        "passed":              passed,
        "general_performance": performance,
    }


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — SCORE STRUCTURE
# ══════════════════════════════════════════════════════════════════════════════

def compute_score_structure(questions):
    """
    Categorise each question as full / partial / zero.
    Reveals the student's answer pattern at a glance.
    """
    full_count    = 0
    partial_count = 0
    zero_count    = 0

    for q in questions:
        full   = float(q["满分"])
        actual = float(q.get("得分") or 0)
        if actual >= full:
            full_count += 1
        elif actual <= 0:
            zero_count += 1
        else:
            partial_count += 1

    n = len(questions)
    return {
        "total_questions":    n,
        "full_mark_count":    full_count,
        "partial_mark_count": partial_count,
        "zero_mark_count":    zero_count,
        "full_mark_rate_pct": round(full_count  / n * 100, 1) if n else 0.0,
        "zero_mark_rate_pct": round(zero_count  / n * 100, 1) if n else 0.0,
    }


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — QUESTION ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

def compute_question_stats(questions):
    results = []
    for q in questions:
        full   = float(q["满分"])
        actual = float(q.get("得分") or 0)
        deducted = round(full - actual, 2)

        if actual >= full:
            status = "full"
        elif actual <= 0:
            status = "zero"
        else:
            status = "partial"

        results.append({
            "question_id":     q["题目ID"],
            "question_type":   q.get("题型")   or "未知题型",
            "knowledge_point": q.get("知识点") or "未知知识点",
            "full_score":      full,
            "actual_score":    round(actual, 2),
            "deducted":        deducted,
            "score_rate_pct":  round(actual / full * 100, 1) if full else 0.0,
            "status":          status,
        })

    # Sort: zero first, then partial, then full; within same status sort by deducted desc
    status_order = {"zero": 0, "partial": 1, "full": 2}
    return sorted(results, key=lambda x: (status_order[x["status"]], -x["deducted"]))


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — KNOWLEDGE POINT ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

def compute_knowledge_points(question_stats):
    kp_map = defaultdict(lambda: {
        "question_ids": [], "full_scores": [], "actual_scores": [], "has_zero": False
    })

    for q in question_stats:
        kp = q["knowledge_point"]
        kp_map[kp]["question_ids"].append(q["question_id"])
        kp_map[kp]["full_scores"].append(q["full_score"])
        kp_map[kp]["actual_scores"].append(q["actual_score"])
        if q["status"] == "zero":
            kp_map[kp]["has_zero"] = True

    results = []
    for kp, data in kp_map.items():
        total_full   = sum(data["full_scores"])
        total_actual = sum(data["actual_scores"])
        mastery      = round(total_actual / total_full * 100, 1) if total_full else 0.0
        level = "✅ 掌握良好" if mastery >= 70 else "⚠️ 基础薄弱" if mastery >= 50 else "❗ 需要重点加强"

        results.append({
            "knowledge_point":   kp,
            "question_ids":      data["question_ids"],
            "question_count":    len(data["question_ids"]),
            "total_full_score":  round(total_full, 2),
            "total_actual_score": round(total_actual, 2),
            "mastery_rate_pct":  mastery,
            "mastery_level":     level,
            "has_zero_mark":     data["has_zero"],
        })

    return sorted(results, key=lambda x: x["mastery_rate_pct"])


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — TREND ANALYSIS
# ══════════════════════════════════════════════════════════════════════════════

def compute_trend_analysis(overall, question_stats, kp_stats):
    zero_qs = [q for q in question_stats if q["status"] == "zero"]
    weak_kps = [k for k in kp_stats if k["mastery_rate_pct"] < 50]
    mid_kps  = [k for k in kp_stats if 50 <= k["mastery_rate_pct"] < 70]
    deducted_qs = [q for q in question_stats if q["deducted"] > 0]

    structural_weaknesses = (
        [{"knowledge_point": k["knowledge_point"],
          "mastery_rate_pct": k["mastery_rate_pct"],
          "has_zero_mark": k["has_zero_mark"],
          "severity": "critical"} for k in weak_kps] +
        [{"knowledge_point": k["knowledge_point"],
          "mastery_rate_pct": k["mastery_rate_pct"],
          "has_zero_mark": k["has_zero_mark"],
          "severity": "moderate"} for k in mid_kps]
    )

    zero_kp_names = list({q["knowledge_point"] for q in zero_qs})
    zero_note = (
        f"共 {len(zero_qs)} 题零分，集中于知识点：{'、'.join(zero_kp_names[:3])}。"
        if zero_qs else "无零分题目。"
    )

    summary = (
        f"本次得分 {overall['total_score']} / {overall['total_full_score']}，"
        f"得分率 {overall['score_rate_pct']}%，"
        f"整体表现：{overall['general_performance']}。"
        + zero_note
    )

    return {
        "overall_learning_summary":        summary,
        "structural_weaknesses":           structural_weaknesses,
        "deducted_questions_count":        len(deducted_qs),
        "weak_knowledge_points_count":     len(weak_kps),
        "moderate_knowledge_points_count": len(mid_kps),
    }


# ══════════════════════════════════════════════════════════════════════════════
# CLI
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="Compute individual student statistics. Outputs statistics.json only — no charts."
    )
    parser.add_argument("--input",      required=True, help="Grading result JSON path")
    parser.add_argument("--output-dir", required=True, help="Output directory")
    args = parser.parse_args()

    raw       = load_data(args.input)
    questions = clean_questions(raw.get("题目列表", []))

    if not questions:
        print("[ERROR] No valid questions found.", file=sys.stderr)
        sys.exit(1)

    student_id = raw.get("学生ID") or "unknown"
    exam_date  = raw.get("作业考试时间") or os.path.splitext(os.path.basename(args.input))[0]

    overall        = compute_overall(student_id, exam_date, questions)
    score_structure = compute_score_structure(questions)
    question_stats = compute_question_stats(questions)
    kp_stats       = compute_knowledge_points(question_stats)
    trend          = compute_trend_analysis(overall, question_stats, kp_stats)

    output = {
        "exam_date":                exam_date,
        "generated_at":             datetime.now().isoformat(timespec="seconds"),
        "overall_performance":      overall,
        "score_structure":          score_structure,
        "question_analysis": {
            "all_questions":     question_stats,
            "deducted_questions": [q for q in question_stats if q["deducted"] > 0],
        },
        "knowledge_point_analysis": kp_stats,
        "trend_analysis":           trend,
    }

    os.makedirs(args.output_dir, exist_ok=True)
    out_path = os.path.join(args.output_dir, "statistics.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f"[OK] {out_path}")


if __name__ == "__main__":
    main()
