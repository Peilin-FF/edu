export default function MasteryLegend({ teacher }) {
  return (
    <div className="mastery-legend">
      <span className="legend-label">掌握度：</span>
      <div className="gradient-bar" />
      <div className="gradient-labels">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
      <span className="legend-sep" />
      <span className="not-tested-dot" />
      <span className="legend-label">未考查</span>
      {teacher && (
        <>
          <span className="legend-sep" />
          <span className="legend-label">节点越大=掌握越好</span>
        </>
      )}
    </div>
  );
}
