export default function SlideMistakes({ slide }) {
  return (
    <div className="slide slide-mistakes">
      <h2 className="slide-heading">{slide.heading}</h2>
      <div className="slide-mistake-list">
        {slide.items.map((item, i) => (
          <div key={i} className="slide-mistake-item">
            <div className="slide-mistake-wrong">
              <span className="slide-mistake-icon">&#x2717;</span>
              <span>{item.misconception}</span>
            </div>
            <div className="slide-mistake-right">
              <span className="slide-mistake-icon">&#x2713;</span>
              <span>{item.correction}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
