import { useState, useEffect, useCallback } from 'react';
import SlideViewer from './SlideViewer';
import SlideControls from './SlideControls';
import { generatePptSlides } from '../../utils/llmClient';
import { exportToPptx } from '../../utils/pptxExport';
import './Ppt.css';

export default function PptModal({ question, onClose }) {
  const [slideData, setSlideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSlide, setCurrentSlide] = useState(0);

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

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') setCurrentSlide((v) => Math.max(0, v - 1));
      if (e.key === 'ArrowRight' && slideData) {
        setCurrentSlide((v) => Math.min(slideData.slides.length - 1, v + 1));
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [slideData, onClose]);

  const handleDownload = () => {
    if (slideData) exportToPptx(slideData);
  };

  return (
    <div className="ppt-overlay" onClick={onClose}>
      <div className="ppt-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ppt-close" onClick={onClose}>&#x2715;</button>

        {loading && (
          <div className="ppt-loading">
            <div className="ppt-spinner" />
            <p>AI 正在生成讲解课件...</p>
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
            <SlideControls
              current={currentSlide}
              total={slideData.slides.length}
              onPrev={() => setCurrentSlide((v) => Math.max(0, v - 1))}
              onNext={() => setCurrentSlide((v) => Math.min(slideData.slides.length - 1, v + 1))}
              onDownload={handleDownload}
            />
          </>
        )}
      </div>
    </div>
  );
}
