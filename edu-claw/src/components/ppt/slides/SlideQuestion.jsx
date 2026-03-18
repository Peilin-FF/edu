export default function SlideQuestion({ slide }) {
  return (
    <div className="slide slide-question">
      <h2 className="slide-heading">{slide.heading}</h2>
      <div className="slide-q-text">{slide.question}</div>
      {slide.options && slide.options.length > 0 && (
        <div className="slide-q-options">
          {slide.options.map((opt) => (
            <div key={opt.key} className={`slide-q-opt slide-q-opt--${opt.status}`}>
              <span className="slide-q-opt-key">{opt.key}</span>
              <span>{opt.text}</span>
            </div>
          ))}
        </div>
      )}
      <div className="slide-q-answers">
        <div className="slide-q-ans slide-q-ans--wrong">
          <span className="slide-q-ans-label">你的答案</span>
          <span className="slide-q-ans-value">{slide.studentAnswer}</span>
        </div>
        <div className="slide-q-ans slide-q-ans--correct">
          <span className="slide-q-ans-label">正确答案</span>
          <span className="slide-q-ans-value">{slide.correctAnswer}</span>
        </div>
      </div>
    </div>
  );
}
