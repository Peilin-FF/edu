import SlideTitle from './slides/SlideTitle';
import SlideQuestion from './slides/SlideQuestion';
import SlideKnowledge from './slides/SlideKnowledge';
import SlideAnalysis from './slides/SlideAnalysis';
import SlideMistakes from './slides/SlideMistakes';
import SlideSummary from './slides/SlideSummary';

const SLIDE_COMPONENTS = {
  title: SlideTitle,
  question: SlideQuestion,
  knowledge: SlideKnowledge,
  analysis: SlideAnalysis,
  mistakes: SlideMistakes,
  summary: SlideSummary,
};

export default function SlideViewer({ slide }) {
  const Component = SLIDE_COMPONENTS[slide.type];
  if (!Component) {
    return <div className="slide"><p>未知幻灯片类型: {slide.type}</p></div>;
  }
  return <Component slide={slide} />;
}
