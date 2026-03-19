import { useState, useEffect, useCallback } from 'react';
import { checkInteractiveSuitability, generateInteractiveHtml } from '../../utils/llmClient';
import { cachedGenerate } from '../../utils/genCache';
import './Interactive.css';

export default function InteractiveModal({ question, onClose }) {
  const [phase, setPhase] = useState('checking'); // checking | unsuitable | generating | ready | error
  const [suitability, setSuitability] = useState(null);
  const [html, setHtml] = useState('');
  const [error, setError] = useState('');

  const run = useCallback(async () => {
    setPhase('checking');
    setError('');
    try {
      // Cache the full result (suitability + html) as one unit
      const { data: cached } = await cachedGenerate(
        'interactive', question,
        async () => {
          const result = await checkInteractiveSuitability(question);
          if (!result.suitable) {
            return { suitable: false, reason: result.reason };
          }
          const htmlContent = await generateInteractiveHtml(question, result.simulationIdea);
          return { suitable: true, simulationIdea: result.simulationIdea, html: htmlContent };
        }
      );

      if (!cached.suitable) {
        setSuitability(cached);
        setPhase('unsuitable');
        return;
      }

      setSuitability(cached);
      setHtml(cached.html);
      setPhase('ready');
    } catch (e) {
      setError(e.message);
      setPhase('error');
    }
  }, [question]);

  useEffect(() => {
    run();
  }, [run]);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="inter-overlay" onClick={onClose}>
      <div className="inter-modal" onClick={(e) => e.stopPropagation()}>
        <button className="inter-close" onClick={onClose}>&#x2715;</button>

        {phase === 'checking' && (
          <div className="inter-status">
            <div className="inter-spinner" />
            <p>AI 正在分析这道题是否适合互动模拟...</p>
          </div>
        )}

        {phase === 'unsuitable' && (
          <div className="inter-status">
            <div className="inter-status-icon">&#x1F4DD;</div>
            <p className="inter-status-title">这道题不太适合互动模拟</p>
            <p className="inter-status-reason">{suitability?.reason}</p>
            <p className="inter-status-hint">推荐使用「PPT 讲解」或「强化练习」来巩固这个知识点。</p>
            <button className="inter-btn" onClick={onClose}>我知道了</button>
          </div>
        )}

        {phase === 'generating' && (
          <div className="inter-status">
            <div className="inter-spinner" />
            <p className="inter-status-title">正在生成互动实验</p>
            <p className="inter-status-idea">{suitability?.simulationIdea}</p>
          </div>
        )}

        {phase === 'error' && (
          <div className="inter-status">
            <p className="inter-status-error">生成失败：{error}</p>
            <button className="inter-btn" onClick={run}>重试</button>
          </div>
        )}

        {phase === 'ready' && (
          <div className="inter-stage">
            <div className="inter-header">
              <span className="inter-header-icon">&#x1F52C;</span>
              <span className="inter-header-title">互动模拟实验</span>
              <span className="inter-header-kp">{question['知识点']}</span>
            </div>
            <iframe
              className="inter-iframe"
              title="互动模拟"
              srcDoc={html}
              sandbox="allow-scripts allow-same-origin"
            />
          </div>
        )}
      </div>
    </div>
  );
}
