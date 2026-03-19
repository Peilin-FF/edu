/**
 * Parse MinerU content.md into structured student JSON.
 * Ported from parse_student_md.py regex logic.
 */
export function parseContentMd(md, studentName, studentId) {
  const lines = md.split('\n');

  // Extract header info
  let examDate = '';
  let totalScore = 0;
  const headerText = lines.slice(0, 20).join(' ');

  const dateMatch = headerText.match(/(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) examDate = dateMatch[1];

  const scoreMatch = headerText.match(/(?:考试得分|总分)[：:\s]*(\d+)\s*分/);
  if (scoreMatch) totalScore = parseInt(scoreMatch[1]);

  // Parse questions by sections
  const questions = [];
  let currentSection = '';
  let currentQ = null;
  let qCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Detect section type
    const sectionMatch = line.match(/[一二三四五六七八九十]+[.．、]\s*(单选题|多选题|填空题|判断题)/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Detect question start (number followed by text)
    const qMatch = line.match(/^(\d+)[.．、]\s*(.+)/);
    if (qMatch && currentSection) {
      // Save previous question
      if (currentQ) {
        finalizeQuestion(currentQ);
        questions.push(currentQ);
      }

      qCounter++;
      currentQ = {
        '题目ID': String(qCounter).padStart(3, '0'),
        '题型': currentSection,
        '题目': qMatch[2],
        '选项': currentSection === '单选题' || currentSection === '多选题' ? {} : null,
        '满分': 0,
        '正确答案': '',
        '知识点': null,
        '评分细则': null,
        '学生答案': '',
        '得分': 0,
        '扣分原因': '无',
        _rawLines: [],
      };
      continue;
    }

    if (!currentQ) continue;
    currentQ._rawLines.push(line);

    // Parse options (A、xxx)
    const optMatch = line.match(/^([A-D])[、．.]\s*(.+)/);
    if (optMatch && currentQ['选项']) {
      currentQ['选项'][optMatch[1]] = optMatch[2].trim();
      continue;
    }

    // Parse student score
    const scoreLineMatch = line.match(/学生得分[：:]\s*(\d+)\s*分?/);
    if (scoreLineMatch) {
      currentQ['得分'] = parseInt(scoreLineMatch[1]);
      continue;
    }

    // Parse answers (various formats)
    // Format 1: "学生答案：A正确答案：B"
    const ansMatch1 = line.match(/学生答案[：:]\s*([A-D×√对错]+)\s*正确答案[：:]\s*([A-D×√对错]+)/);
    if (ansMatch1) {
      currentQ['学生答案'] = ansMatch1[1];
      currentQ['正确答案'] = ansMatch1[2];
      continue;
    }

    // Format 2: separate lines
    const stuAnsMatch = line.match(/学生答案[：:]\s*(.+)/);
    if (stuAnsMatch) {
      currentQ['学生答案'] = stuAnsMatch[1].trim();
      continue;
    }
    const corAnsMatch = line.match(/正确答案[：:]\s*(.+)/);
    if (corAnsMatch) {
      currentQ['正确答案'] = corAnsMatch[1].trim();
      continue;
    }

    // Parse score for fill-in and true/false
    const fullScoreMatch = line.match(/(\d+)分/);
    if (fullScoreMatch && currentQ['满分'] === 0) {
      // This might be the section score header
    }
  }

  // Don't forget last question
  if (currentQ) {
    finalizeQuestion(currentQ);
    questions.push(currentQ);
  }

  // Infer full scores from section
  const sectionScores = { '单选题': 3, '多选题': 4, '填空题': 3, '判断题': 2 };
  for (const q of questions) {
    if (q['满分'] === 0) {
      q['满分'] = sectionScores[q['题型']] || 3;
    }
  }

  // Calculate total if not found in header
  if (totalScore === 0) {
    totalScore = questions.reduce((s, q) => s + q['得分'], 0);
  }

  return {
    '作业考试时间': examDate || new Date().toISOString().slice(0, 10),
    '学生ID': studentId,
    '姓名': studentName,
    '总分': totalScore,
    '题目列表': questions,
  };
}

function finalizeQuestion(q) {
  delete q._rawLines;

  // Set deduction reason
  if (q['得分'] < q['满分'] && q['得分'] >= 0) {
    q['扣分原因'] = '待AI分析';
  }

  // Clean up empty options
  if (q['选项'] && Object.keys(q['选项']).length === 0) {
    q['选项'] = null;
  }
}
