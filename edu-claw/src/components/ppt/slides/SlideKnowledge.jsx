export default function SlideKnowledge({ slide }) {
  return (
    <div className="slide slide-knowledge">
      <h2 className="slide-heading">{slide.heading}</h2>
      <ul className="slide-bullets">
        {slide.bullets.map((b, i) => (
          <li key={i} className="slide-bullet">{b}</li>
        ))}
      </ul>
    </div>
  );
}
