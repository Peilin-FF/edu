export default function SlideTitle({ slide }) {
  return (
    <div className="slide slide-title">
      <h1 className="slide-title-heading">{slide.heading}</h1>
      <p className="slide-title-sub">{slide.subheading}</p>
    </div>
  );
}
