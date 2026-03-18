export default function SlideAnalysis({ slide }) {
  return (
    <div className="slide slide-analysis">
      <h2 className="slide-heading">{slide.heading}</h2>
      <div className="slide-steps">
        {slide.steps.map((s) => (
          <div key={s.step} className="slide-step">
            <span className="slide-step-num">{s.step}</span>
            <span className="slide-step-text">{s.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
