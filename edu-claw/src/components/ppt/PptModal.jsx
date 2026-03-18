import { useState, useEffect, useCallback } from 'react';
import SlideViewer from './SlideViewer';
import SlideControls from './SlideControls';
import { generatePptSlides } from '../../utils/llmClient';
import { exportToPptx } from '../../utils/pptxExport';
import useSpeech from '../../utils/useSpeech';
import './Ppt.css';

export default function PptModal({ question, onClose }) {
  const [slideData, setSlideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const { speak, stop, toggle, speaking, loading: ttsLoading, supported } = useSpeech();

  const fetchSlides = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await generatePptSlides(question);
      setSlideData(data);
      setCurrentSlide(0);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [question]);

  useEffect(() => {
    fetchSlides();
  }, [fetchSlides]);

  // Auto-speak narration when slide changes
  useEffect(() => {
    if (!slideData || !autoPlay || !supported) return;
    const narration = slideData.slides[currentSlide]?.narration;
    if (narration) {
      speak(narration);
    }
    return () => stop();
  }, [currentSlide, slideData, autoPlay, supported, speak, stop]);

  const handleClose = useCallback(() => {
    stop();
    onClose();
  }, [stop, onClose]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') {
        stop();
        setCurrentSlide((v) => Math.max(0, v - 1));
      }
      if (e.key === 'ArrowRight' && slideData) {
        stop();
        setCurrentSlide((v) => Math.min(slideData.slides.length - 1, v + 1));
      }
      if (e.key === 'Escape') handleClose();
      if (e.key === ' ') {
        e.preventDefault();
        const narration = slideData?.slides[currentSlide]?.narration;
        if (narration) toggle(narration);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slideData, currentSlide, handleClose, stop, toggle]);

  const handlePrev = () => {
    stop();
    setCurrentSlide((v) => Math.max(0, v - 1));
  };

  const handleNext = () => {
    stop();
    setCurrentSlide((v) => Math.min(slideData.slides.length - 1, v + 1));
  };

  const handleDownload = () => {
    if (slideData) exportToPptx(slideData);
  };

  const handleToggleSpeech = () => {
    const narration = slideData?.slides[currentSlide]?.narration;
    if (narration) toggle(narration);
  };

  const currentNarration = slideData?.slides[currentSlide]?.narration || '';

  return (
    <div className="ppt-overlay" onClick={handleClose}>
      <div className="ppt-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ppt-close" onClick={handleClose}>&#x2715;</button>

        {loading && (
          <div className="ppt-loading">
            <div className="ppt-spinner" />
            <p>AI 老师正在备课中...</p>
          </div>
        )}

        {error && (
          <div className="ppt-error">
            <p>生成失败：{error}</p>
            <button className="ppt-retry-btn" onClick={fetchSlides}>重试</button>
          </div>
        )}

        {slideData && !loading && !error && (
          <>
            <div className="ppt-stage">
              <SlideViewer slide={slideData.slides[currentSlide]} />
            </div>

            {currentNarration && (
              <div className="ppt-narration">
                <span className={`ppt-narration-icon ${speaking ? 'speaking' : ''}`}>
                  &#x1f3a4;
                </span>
                <p className="ppt-narration-text">{currentNarration}</p>
              </div>
            )}

            <SlideControls
              current={currentSlide}
              total={slideData.slides.length}
              onPrev={handlePrev}
              onNext={handleNext}
              onDownload={handleDownload}
              speaking={speaking}
              ttsLoading={ttsLoading}
              onToggleSpeech={handleToggleSpeech}
              autoPlay={autoPlay}
              onToggleAutoPlay={() => setAutoPlay((v) => !v)}
              supported={supported}
            />
          </>
        )}
      </div>
    </div>
  );
}
