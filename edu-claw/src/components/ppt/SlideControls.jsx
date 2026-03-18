export default function SlideControls({ current, total, onPrev, onNext, onDownload }) {
  return (
    <div className="ppt-controls">
      <button className="ppt-ctrl-btn" onClick={onPrev} disabled={current <= 0}>
        &#x25C0; 上一页
      </button>
      <span className="ppt-ctrl-page">{current + 1} / {total}</span>
      <button className="ppt-ctrl-btn" onClick={onNext} disabled={current >= total - 1}>
        下一页 &#x25B6;
      </button>
      <button className="ppt-ctrl-btn ppt-ctrl-download" onClick={onDownload}>
        &#x2B73; 下载 PPTX
      </button>
    </div>
  );
}
