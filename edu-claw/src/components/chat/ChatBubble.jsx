import { useState, useEffect, useRef, useCallback } from 'react';
import { streamChat } from '../../utils/llmClient';
import { buildChatSystemPrompt } from '../../utils/chatPrompt';
import './Chat.css';

export default function ChatBubble({ studentName, wrongQuestions, masteryMap, knowledgeTree }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [hasNewMsg, setHasNewMsg] = useState(false);
  // Position state (default: bottom-left)
  const [pos, setPos] = useState({ x: 24, y: window.innerHeight - 80 });
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
      const nx = Math.max(0, Math.min(window.innerWidth - 56, e.clientX - dragOffset.current.dx));
      const ny = Math.max(0, Math.min(window.innerHeight - 56, e.clientY - dragOffset.current.dy));
      setPos({ x: nx, y: ny });
    };
    const onUp = () => setDragging(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [dragging]);

  // Auto-greet on first open
  useEffect(() => {
    if (open && !greetedRef.current && studentName) {
      greetedRef.current = true;
      const greeting = `${studentName}同学你好！我是小智老师，你的 AI 学习伙伴。有什么不懂的知识点或者想聊的，随时跟我说！`;
      setMessages([{ role: 'assistant', content: greeting }]);
    }
  }, [open, studentName]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg = { role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setStreaming(true);

    const systemPrompt = buildChatSystemPrompt({
      studentName,
      wrongQuestions,
      masteryMap,
      knowledgeTree,
    });

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...newMessages.slice(-16),
    ];

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      await streamChat(
        apiMessages,
        (chunk) => {
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
            return updated;
          });
        },
        controller.signal,
      );
    } catch (e) {
      if (e.name === 'AbortError') return;
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '抱歉，网络好像出了点问题，你再试试？',
        };
        return updated;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, messages, streaming, studentName, wrongQuestions, masteryMap, knowledgeTree]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleOpen = () => {
    // Only toggle if not a drag
    if (didDrag.current) return;
    setOpen((v) => !v);
    setHasNewMsg(false);
  };

  const suggestions = [
    '帮我梳理一下这门课的知识脉络',
    '我哪些知识点最薄弱？该怎么补？',
    '帮我分析一下我的错题有什么共性',
  ];

  const handleSuggestion = (text) => {
    setInput(text);
  };

  // Calculate panel position relative to FAB
  const panelOnLeft = pos.x > window.innerWidth / 2;
  const panelOnTop = pos.y > window.innerHeight / 2;
  const panelStyle = {
    left: panelOnLeft ? pos.x - 380 + 56 : pos.x,
    ...(panelOnTop
      ? { bottom: window.innerHeight - pos.y + 12 }
      : { top: pos.y + 68 }),
  };

  return (
    <>
      {/* Draggable floating bubble */}
      <button
        className={`chat-fab ${hasNewMsg ? 'chat-fab--new' : ''} ${dragging ? 'chat-fab--dragging' : ''}`}
        style={{ left: pos.x, top: pos.y }}
        onPointerDown={onPointerDown}
        onClick={toggleOpen}
      >
        {open ? '\u2715' : '\uD83D\uDCAC'}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="chat-panel" style={panelStyle}>
          <div className="chat-panel-header">
            <div className="chat-panel-avatar">&#x1F9D1;&#x200D;&#x1F3EB;</div>
            <div>
              <div className="chat-panel-name">小智老师</div>
              <div className="chat-panel-status">AI 学习伙伴 · 随时为你答疑</div>
            </div>
          </div>

          <div className="chat-panel-body" ref={bodyRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`chat-msg chat-msg--${msg.role}`}>
                {msg.role === 'assistant' && (
                  <span className="chat-msg-avatar">&#x1F9D1;&#x200D;&#x1F3EB;</span>
                )}
                <div className="chat-msg-bubble">
                  {msg.content || (streaming && i === messages.length - 1 ? (
                    <span className="chat-typing">思考中...</span>
                  ) : null)}
                </div>
              </div>
            ))}

            {messages.length <= 1 && !streaming && (
              <div className="chat-suggestions">
                <p className="chat-suggestions-title">你可以试着问我：</p>
                {suggestions.map((s, i) => (
                  <button key={i} className="chat-suggestion" onClick={() => handleSuggestion(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="chat-panel-input">
            <textarea
              className="chat-input"
              placeholder="输入你的问题..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={streaming}
            />
            <button
              className="chat-send"
              onClick={handleSend}
              disabled={!input.trim() || streaming}
            >
              &#x27A4;
            </button>
          </div>
        </div>
      )}
    </>
  );
}
