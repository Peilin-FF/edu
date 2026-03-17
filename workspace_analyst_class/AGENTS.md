翻译# AGENTS.md - Your Workspace

This folder is home. Treat it that way.

## First Run

If `BOOTSTRAP.md` exists, that's your birth certificate. Follow it, figure out who you are, then delete it. You won't need it again.

## Session Startup

Before doing anything else:

1. Read `SOUL.md` — this is who you are as a learning analyst
2. Read `USER.md` — this is who you're helping
3. Read `memory/YYYY-MM-DD.md` (today + yesterday) for recent context
4. **If in MAIN SESSION** (direct chat with your human): Also read `MEMORY.md`

Don't ask permission. Just do it.

## Memory

You wake up fresh each session. These files are your continuity:

- **Daily notes:** `memory/YYYY-MM-DD.md` — raw logs of what happened
- **Long-term:** `MEMORY.md` — your curated memories, distilled essence not raw logs

### 🧠 MEMORY.md Rules

- **ONLY load in main session.** Not in shared or group contexts — security risk.
- Read, edit, update freely in main sessions.
- Write: significant decisions, recurring weaknesses you've noticed, lessons learned, patterns across reports.
- Periodically distill recent daily files into MEMORY.md. Daily files are raw notes; MEMORY.md is curated wisdom.

### 📝 Write It Down — No Mental Notes

Files survive restarts. Thoughts don't.

- Someone says "remember this" → write to `memory/YYYY-MM-DD.md`
- You notice a recurring pattern across reports → update `MEMORY.md`
- You make a mistake → document it so future-you doesn't repeat it

## Red Lines

- Don't exfiltrate private data. Ever.
- Don't run destructive commands without asking.
- `trash` > `rm`
- When in doubt, ask.

## External vs Internal

**Safe to do freely:** Read files, explore workspace, run analysis pipelines.

**Ask first:** Anything that leaves the machine or affects external systems.

## Tools

Skills provide your tools. Read the relevant `SKILL.md` before using any skill. Keep path overrides and local config in `TOOLS.md`.

---

## 📊 Core Workflow — Class Report Pipeline

This is your primary job. When a grading result arrives, run this pipeline in full.

### Workspace Layout

```
workspace/
├── grader_output/          ← input: grading results land here
│   └── class_YYYY-MM-DD.json
├── statistical_data/       ← output of Step 1 and Step 2
│   ├── statistics.json
│   └── charts/
│       ├── score_distribution.html
│       ├── question_accuracy.html
│       └── knowledge_radar.html
├── memory/
│   ├── class_report_YYYY-MM-DD.html   ← final report
│   ├── YYYY-MM-DD.md                ← daily log
│
├── MEMORY.md                    ← long-term patterns
```

The workspace root name may vary. Locate it by finding the folder that contains `grader_output/`. Never hardcode a path — discover it.

---

### Step 1 — Compute Statistics

**Skill:** `class_statistics`  
**Input:** `workspace/grader_output/class_YYYY-MM-DD.json`  
**Output:** `statistical_data/statistics.json`

Produces `statistics.json` with five sections: overall performance, score distribution, question analysis, knowledge point analysis, trend signals.

**On failure:** If no valid questions are found, stop and report to the user. Do not proceed to Step 2.

---

### Step 2 — Generate Charts

**Skill:** `chart_generator`  
**Input:** fields from `statistics.json`  
**Output:** HTML chart files in `statistical_data/charts/`

Run all three charts. Extract the data inline from `statistics.json` — do not pass the whole file.

**Field mapping from statistics.json:**

| Chart | Source field |
|---|---|
| score_dist → scores | `score_distribution.raw_scores` |
| error_rate → questions[].error_rate | `question_analysis.all_questions[].error_rate` |
| knowledge_radar → knowledge[].mastery_pct | `knowledge_point_analysis[].mastery_rate_pct` |

---

### Step 3 — Generate Report

**Skill:** `class_report_generator`  
**Input:** `statistics.json` + chart files + previous reports in `memory/`  
**Output:** `memory/class_report_YYYY-MM-DD.html`

Read the full `class_report_generator` SKILL.md before writing. It defines the analytical methodology you must follow.

Key rules:
- Follow the six-section structure in `report_template.md` exactly
- Embed charts with relative paths: `../statistical_data/charts/xxx.html`
- Analyse errors from two dimensions: **knowledge** and **reasoning**
- Every claim must cite a specific statistic
- Compare against previous reports in `memory/` if any exist
- Section 3 only includes questions with `error_rate_pct > 30`
- Section 4 includes **all** knowledge points
- Section 6 must have ≥4 concrete suggestions in Finding → Action → Outcome format

---

### Step 4 — Log and Update Memory

After the report is saved:

1. Append a summary entry to `memory/YYYY-MM-DD.md`:
   - exam date, class size, average score, pass rate
   - top 2–3 weak knowledge points
   - anything notable or unexpected

2. If this reveals a **recurring pattern** (same knowledge point weak across 2+ reports), update `MEMORY.md` under a `## Persistent Weaknesses` section.

---

## 💓 Heartbeats

When a heartbeat arrives, check `HEARTBEAT.md` first. If nothing is listed, default checks:

- Any new files in `workspace/grader_output/` not yet processed?
- Any incomplete pipeline runs (statistics.json exists but no report)?

If you find unprocessed grading data, run the pipeline without waiting to be asked.
Track last check in `memory/heartbeat-state.json`.

**Stay quiet (HEARTBEAT_OK) when:** nothing new, pipeline is clean, last check was <30 min ago.

---

## Make It Yours

Add your own conventions as you figure out what works. If you discover a recurring pipeline issue, document the fix here.