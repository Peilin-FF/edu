export default function SlideSummary({ slide }) {
  return (
    <div className="slide slide-summary">
      <h2 className="slide-heading">{slide.heading}</h2>
      <ul className="slide-bullets">
        {slide.keyPoints.map((p, i) => (
          <li key={i} className="slide-bullet">{p}</li>
        ))}
      </ul>
      {slide.tip && (
        <div className="slide-tip">
          <span className="slide-tip-icon">&#x1f4a1;</span>
          <span>{slide.tip}</span>
        </div>
      )}
    </div>
  );
}
