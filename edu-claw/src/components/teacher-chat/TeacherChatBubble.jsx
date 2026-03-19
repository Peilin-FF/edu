import { useState, useEffect, useRef, useCallback } from 'react';
import { streamChat } from '../../utils/llmClient';
import { sendNotification, sendBatchNotification } from '../../utils/notificationStore';
import './TeacherChat.css';

export default function TeacherChatBubble({ classMastery, allStudents, studentRoster, courseId }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  // Draggable position (default: bottom-left)
  const [pos, setPos] = useState({ x: 24, y: typeof window !== 'undefined' ? window.innerHeight - 80 : 600 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ dx: 0, dy: 0 });
  const didDrag = useRef(false);
  const bodyRef = useRef(null);
  const abortRef = useRef(null);
  const greetedRef = useRef(false);

  // --- Drag logic ---
  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    dragOffset.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y };
    didDrag.current = false;
    setDragging(true);
  }, [pos]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e) => {
      didDrag.current = true;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - 48, e.clientX - dragOffset.current.dx)),
        y: Math.max(0, Math.min(window.innerHeight - 48, e.clientY - dragOffset.current.dy)),
      });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); };
  }, [dragging]);

  useEffect(() => {
    if (open && !greetedRef.current) {
      greetedRef.current = true;
      setMessages([{ role: 'assistant', content: '老师好！我是小雷助教。我可以帮您分析班级学情、查看作业提交情况、给学生发提醒通知。有什么需要帮忙的？' }]);
    }
  }, [open]);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [messages]);

  const buildSystemPrompt = useCallback(() => {
    let masterySummary = '';
    if (classMastery) {
      const entries = Array.from(classMastery.entries()).sort((a, b) => a[1].avgMastery - b[1].avgMastery);
      masterySummary = '\n\n## 班级知识图谱掌握情况（Skill: class-knowledge-analysis）\n' +
        entries.map(([name, d]) => {
          const pct = Math.round(d.avgMastery * 100);
          const level = pct < 50 ? '严重薄弱' : pct < 80 ? '需巩固' : '已掌握';
          return `- [${pct}% ${level}] ${name}（错${d.totalWrong || 0}题）`;
        }).join('\n');
    }

    let studentSummary = '';
    if (allStudents?.length > 0) {
      const sorted = [...allStudents].sort((a, b) => (b['总分'] || 0) - (a['总分'] || 0));
      const avg = (sorted.reduce((s, d) => s + (d['总分'] || 0), 0) / sorted.length).toFixed(1);
      studentSummary = `\n\n## 学生成绩排名（Skill: student-detail-analysis）\n班级均分：${avg}\n` +
        sorted.map((s, i) => `${i + 1}. ${s['姓名']}（${s['学生ID']}）${s['总分']}分`).join('\n');
    }

    let errorSummary = '';
    if (allStudents?.length > 0) {
      const questionStats = {};
      for (const student of allStudents) {
        for (const q of student['题目列表'] || []) {
          const key = q['题目ID'];
          if (!questionStats[key]) questionStats[key] = { ...q, errorCount: 0, totalCount: 0 };
          questionStats[key].totalCount += 1;
          if (q['得分'] < q['满分']) questionStats[key].errorCount += 1;
        }
      }
      const highError = Object.values(questionStats)
        .map(q => ({ ...q, errorRate: q.errorCount / q.totalCount }))
        .filter(q => q.errorRate > 0.3).sort((a, b) => b.errorRate - a.errorRate).slice(0, 10);
      if (highError.length > 0) {
        errorSummary = '\n\n## 高错率题目（Skill: high-error-questions）\n' +
          highError.map(q => `- 第${q['题目ID']}题 [错误率 ${Math.round(q.errorRate * 100)}%] ${q['题目'].substring(0, 50)}...\n  知识点：${q['知识点']} | 正确答案：${q['正确答案']}`).join('\n');
      }
    }

    let wrongDetail = '';
    if (allStudents?.length > 0) {
      const details = allStudents.map(s => {
        const wrongs = (s['题目列表'] || []).filter(q => q['得分'] < q['满分']);
        if (wrongs.length === 0) return null;
        return `### ${s['姓名']}（${s['学生ID']}）错${wrongs.length}题\n` +
          wrongs.map(q => `- [${q['知识点']}] ${q['题目'].substring(0, 40)}... 答${q['学生答案']}→正确${q['正确答案']}`).join('\n');
      }).filter(Boolean);
      if (details.length > 0) wrongDetail = '\n\n## 各学生错题明细\n' + details.join('\n\n');
    }

    let submissionSummary = '';
    if (studentRoster?.length > 0) {
      const withData = new Set(allStudents?.map(s => s['学生ID']) || []);
      const notSubmitted = studentRoster.filter(s => !withData.has(s['学生ID']));
      submissionSummary = `\n\n## 作业提交情况（Skill: submission-status）\n已提交 ${withData.size}/${studentRoster.length} 人（${Math.round(withData.size / studentRoster.length * 100)}%）`;
      if (notSubmitted.length > 0) {
        submissionSummary += '\n\n未提交学生：\n' + notSubmitted.map(s => `- ${s['姓名']}（${s['学生ID']}）${s.class || ''}班`).join('\n');
      }
    }

    return `你是"小雷助教"，一个运行在 OpenClaw 上的教师端 AI 助教 Agent。

## 性格
专业高效、条理清晰、用数据说话。回复简洁有力，3-5 句话。

## Skills
1. class-knowledge-analysis — 分析班级知识图谱薄弱点
2. high-error-questions — 分析高错率题目
3. student-detail-analysis — 查看个别学生学情
4. submission-status — 查看作业提交情况
5. send-notification — 向学生发送提醒通知

## 重要规则
- 始终用中文，基于数据回答，不要编造
- 提醒学生时在末尾加：[NOTIFY:学生ID:消息] 或 [NOTIFY_BATCH:ALL_UNSUBMITTED:消息]
${masterySummary}${errorSummary}${studentSummary}${wrongDetail}${submissionSummary}`;
  }, [classMastery, allStudents, studentRoster]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);
    const controller = new AbortController();
    abortRef.current = controller;
    let fullResponse = '';

    try {
      await streamChat(
        [{ role: 'system', content: buildSystemPrompt() }, ...newMessages.slice(-16)],
        (chunk) => {
          fullResponse += chunk;
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
            return updated;
          });
        },
        controller.signal,
      );
      processNotifications(fullResponse);
    } catch (e) {
      if (e.name === 'AbortError') return;
      setMessages((prev) => { const u = [...prev]; u[u.length - 1] = { role: 'assistant', content: '网络出了点问题，请重试。' }; return u; });
    } finally { setStreaming(false); abortRef.current = null; }
  }, [input, messages, streaming, buildSystemPrompt]);

  const processNotifications = (text) => {
    const notifyRegex = /\[NOTIFY:(\w+):([^\]]+)\]/g;
    let match;
    while ((match = notifyRegex.exec(text)) !== null) sendNotification(match[1], match[2]);
    const batchRegex = /\[NOTIFY_BATCH:ALL_UNSUBMITTED:([^\]]+)\]/g;
    while ((match = batchRegex.exec(text)) !== null) {
      const withData = new Set(allStudents?.map(s => s['学生ID']) || []);
      const unsubmitted = studentRoster?.filter(s => !withData.has(s['学生ID'])).map(s => s['学生ID']) || [];
      sendBatchNotification(unsubmitted, match[1]);
    }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
  const toggleOpen = () => { if (didDrag.current) return; setOpen((v) => !v); };
  const cleanMsg = (content) => content.replace(/\[NOTIFY[^\]]*\]/g, '').trim();
  const suggestions = ['哪些知识点班级整体最薄弱？', '还有哪些同学没交作业？', '提醒所有没交作业的同学'];

  // Panel position
  const panelOnLeft = pos.x > window.innerWidth / 2;
  const panelOnTop = pos.y > window.innerHeight / 2;
  const panelStyle = {
    left: panelOnLeft ? pos.x - 380 + 48 : pos.x,
    ...(panelOnTop ? { bottom: window.innerHeight - pos.y + 12 } : { top: pos.y + 60 }),
  };

  return (
    <>
      <button
        className={`teacher-fab ${dragging ? 'teacher-fab--dragging' : ''}`}
        style={{ left: pos.x, top: pos.y }}
        onPointerDown={onPointerDown}
        onClick={toggleOpen}
      >
        {open ? '\u2715' : '\uD83D\uDC66'}
      </button>

      {open && (
        <div className="teacher-chat-panel" style={panelStyle}>
          <div className="teacher-chat-header">
            <span style={{ fontSize: 24 }}>&#x1F468;&#x200D;&#x1F393;</span>
            <div>
              <div className="teacher-chat-name">小雷助教 <span className="chat-agent-badge">Agent</span></div>
              <div className="teacher-chat-status">OpenClaw 教学助理</div>
            </div>
          </div>

          <div className="teacher-chat-body" ref={bodyRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
                {msg.role === 'assistant' && <span className="chat-msg-avatar">&#x1F468;&#x200D;&#x1F393;</span>}
                <div className="chat-msg-bubble">{cleanMsg(msg.content) || (streaming && i === messages.length - 1 ? <span className="chat-typing">分析中...</span> : null)}</div>
              </div>
            ))}
            {messages.length <= 1 && !streaming && (
              <div className="chat-suggestions">
                <p className="chat-suggestions-title">您可以问我：</p>
                {suggestions.map((s, i) => (
                  <button key={i} className="chat-suggestion" onClick={() => setInput(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>

          <div className="chat-panel-input">
            <textarea className="chat-input" placeholder="输入指令..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown} rows={1} disabled={streaming} />
            <button className="chat-send" onClick={handleSend} disabled={!input.trim() || streaming}>&#x27A4;</button>
          </div>
        </div>
      )}
    </>
  );
}
