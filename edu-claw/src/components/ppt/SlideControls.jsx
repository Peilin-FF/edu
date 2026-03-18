export default function SlideControls({
  current, total, onPrev, onNext, onDownload,
  speaking, ttsLoading, onToggleSpeech, autoPlay, onToggleAutoPlay, supported,
}) {
  return (
    <div className="ppt-controls">
      <button className="ppt-ctrl-btn" onClick={onPrev} disabled={current <= 0}>
        &#x25C0; 上一页
      </button>
      <span className="ppt-ctrl-page">{current + 1} / {total}</span>
      <button className="ppt-ctrl-btn" onClick={onNext} disabled={current >= total - 1}>
        下一页 &#x25B6;
      </button>

      <span className="ppt-ctrl-sep" />

      {supported && (
        <>
          <button
            className={`ppt-ctrl-btn ppt-ctrl-voice ${speaking ? 'ppt-ctrl-voice--active' : ''} ${ttsLoading ? 'ppt-ctrl-voice--loading' : ''}`}
            onClick={onToggleSpeech}
            title={ttsLoading ? '语音生成中...' : speaking ? '暂停朗读' : '朗读当前页'}
            disabled={ttsLoading}
          >
            {ttsLoading ? '\u23F3 生成中' : speaking ? '\u23F8 暂停' : '\u25B6 朗读'}
          </button>
          <button
            className={`ppt-ctrl-btn ${autoPlay ? 'ppt-ctrl-auto--on' : ''}`}
            onClick={onToggleAutoPlay}
            title={autoPlay ? '关闭自动朗读' : '开启自动朗读'}
          >
            {autoPlay ? '\uD83D\uDD0A 自动朗读' : '\uD83D\uDD07 自动朗读'}
          </button>
        </>
      )}

      <span className="ppt-ctrl-sep" />

      <button className="ppt-ctrl-btn ppt-ctrl-download" onClick={onDownload}>
        &#x2B73; 下载 PPTX
      </button>
    </div>
  );
}
