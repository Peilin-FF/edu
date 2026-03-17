/**
 * 掌握度计算引擎
 * - 知识点名称匹配（精确 + 子串）
 * - 学生个人掌握度计算
 * - 班级整体掌握度计算
 */

/** 递归收集知识树中所有知识点节点名 */
export function collectNodeNames(node, names = new Set()) {
  if (node.type === '知识点') {
    names.add(node.name.replace(/\s*【.*】$/, ''));
  }
  if (node.children) {
    for (const child of node.children) {
      collectNodeNames(child, names);
    }
  }
  return names;
}

/** 将考试知识点名匹配到知识树节点名 */
function matchKnowledgePoint(examKP, treeNames) {
  if (!examKP) return null;
  // 精确匹配
  if (treeNames.has(examKP)) return examKP;
  // 子串匹配：知识树节点名包含在考试知识点中，或反之
  for (const tn of treeNames) {
    if (examKP.includes(tn) || tn.includes(examKP)) return tn;
  }
  return null;
}

/** 计算单个学生的掌握度 */
export function computeStudentMastery(studentData, treeNodeNames) {
  const mastery = new Map(); // nodeName → { earned, possible, mastery, wrongQuestions[] }

  for (const q of studentData['题目列表'] || []) {
    const kp = q['知识点'];
    const matched = matchKnowledgePoint(kp, treeNodeNames);
    if (!matched) continue;

    if (!mastery.has(matched)) {
      mastery.set(matched, { earned: 0, possible: 0, mastery: 0, wrongQuestions: [] });
    }

    const entry = mastery.get(matched);
    const score = q['得分'] ?? 0;
    const full = q['满分'] ?? 0;
    entry.earned += score;
    entry.possible += full;

    if (score < full) {
      entry.wrongQuestions.push({
        题目ID: q['题目ID'],
        题型: q['题型'],
        题目: q['题目'],
        选项: q['选项'],
        学生答案: q['学生答案'],
        正确答案: q['正确答案'],
        满分: full,
        得分: score,
        扣分原因: q['扣分原因'],
      });
    }
  }

  // 计算 mastery 比率
  for (const entry of mastery.values()) {
    entry.mastery = entry.possible > 0 ? entry.earned / entry.possible : 0;
  }

  return mastery;
}

/** 计算班级整体掌握度 */
export function computeClassMastery(allStudentMasteries) {
  // allStudentMasteries: Array of { name, studentId, masteryMap }
  const classMap = new Map(); // nodeName → { avgMastery, students[] }

  for (const { name, studentId, masteryMap } of allStudentMasteries) {
    for (const [nodeName, data] of masteryMap) {
      if (!classMap.has(nodeName)) {
        classMap.set(nodeName, { totalMastery: 0, count: 0, students: [] });
      }
      const entry = classMap.get(nodeName);
      entry.totalMastery += data.mastery;
      entry.count += 1;
      entry.students.push({
        name,
        studentId,
        mastery: data.mastery,
        earned: data.earned,
        possible: data.possible,
        wrongQuestions: data.wrongQuestions,
      });
    }
  }

  // 计算平均值
  const result = new Map();
  for (const [nodeName, entry] of classMap) {
    entry.students.sort((a, b) => a.mastery - b.mastery);
    result.set(nodeName, {
      avgMastery: entry.count > 0 ? entry.totalMastery / entry.count : 0,
      studentCount: entry.count,
      students: entry.students,
    });
  }

  return result;
}
