import React, { useEffect, useMemo, useRef } from 'react';

// PUBLIC_INTERFACE
export default function LogViewer({ logs, error, connectionStatus, onClear }) {
  /** LogViewer renders a scrollable live log area with auto scroll to bottom,
   * copy and clear actions, and colors error lines.
   */
  const scrollerRef = useRef(null);
  const textToCopy = useMemo(() => (logs || []).join('\n'), [logs]);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    // Auto-scroll to bottom
    el.scrollTop = el.scrollHeight;
  }, [logs]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      // No-op for environments without clipboard
    }
  };

  return (
    <div className="log-container" aria-live="polite">
      <div className="log-toolbar">
        <div className="status-badges">
          <span className="badge">Log Stream</span>
          <span
            className={`badge ${
              connectionStatus === 'connected'
                ? 'badge-success'
                : connectionStatus === 'connecting'
                ? 'badge-warn'
                : 'badge-muted'
            }`}
          >
            WS: {connectionStatus.toUpperCase()}
          </span>
          {error ? <span className="badge badge-error">Error</span> : null}
        </div>
        <div className="footer-actions">
          <button className="btn" onClick={handleCopy} aria-label="Copy logs">Copy</button>
          <button className="btn btn-secondary" onClick={onClear} aria-label="Clear logs">Clear</button>
        </div>
      </div>
      <div className="log-view" ref={scrollerRef}>
        {(!logs || logs.length === 0) && !error ? (
          <div className="log-empty">Logs will appear here once you start.</div>
        ) : null}
        {error ? (
          <div className="log-line error">{String(error)}</div>
        ) : null}
        {(logs || []).map((line, idx) => {
          const isError = looksLikeError(line);
          return (
            <div key={idx} className={`log-line ${isError ? 'error' : ''}`}>
              {line}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function looksLikeError(line) {
  if (!line) return false;
  const s = String(line).toLowerCase();
  return s.includes('error') || s.includes('unreachable') || s.includes('timed out') || s.includes('100% packet loss');
}
