import React, { useEffect, useMemo, useState } from 'react';
import './index.css';
import './App.css';
import './theme.css';
import PingControls from './components/PingControls';
import LogViewer from './components/LogViewer';
import { usePingSession } from './hooks/usePingSession';
import { api } from './services/api';

// PUBLIC_INTERFACE
function App() {
  /** App entrypoint that renders a 1024x768 canvas with left controls and right log area.
   * It manages backend health banner, integrates the ping session hook, and provides
   * Start/Stop behaviors with clean teardown.
   */
  const [healthOk, setHealthOk] = useState(true);
  const [checkingHealth, setCheckingHealth] = useState(true);

  const {
    status,
    logs,
    error,
    startSession,
    stopSession,
    clearLogs,
    connectionStatus,
  } = usePingSession({
    maxLogLength: 5000,
    retry: { attempts: 3, backoffMs: 1000 },
  });

  useEffect(() => {
    let cancelled = false;
    async function check() {
      setCheckingHealth(true);
      try {
        const ok = await api.health();
        if (!cancelled) {
          setHealthOk(ok);
        }
      } catch (e) {
        if (!cancelled) setHealthOk(false);
      } finally {
        if (!cancelled) setCheckingHealth(false);
      }
    }
    check();
    const id = setInterval(check, 20000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const canStart = useMemo(() => status !== 'running' && status !== 'starting', [status]);
  const canStop = useMemo(() => status === 'running' || status === 'starting', [status]);

  return (
    <div className="app-root">
      {!healthOk && (
        <div className="health-banner" role="status" aria-live="polite">
          <div>
            Backend health check failed. Ensure the backend is running and serving /api/health on the same origin.
            <span className="mono">Using relative paths: /api and /ws</span>
          </div>
          <button
            className="btn btn-ghost"
            onClick={() => {
              // recheck on demand
              setCheckingHealth(true);
              api
                .health()
                .then((ok) => setHealthOk(ok))
                .catch(() => setHealthOk(false))
                .finally(() => setCheckingHealth(false));
            }}
            disabled={checkingHealth}
          >
            {checkingHealth ? 'Checking…' : 'Retry'}
          </button>
        </div>
      )}

      <div className="canvas">
        <div className="panel panel-left">
          <div className="panel-header">
            <h1 className="title">Ping Monitor</h1>
            <p className="subtitle">Ocean Professional</p>
          </div>

          <PingControls
            disabledStart={!canStart}
            disabledStop={!canStop}
            onStart={async ({ host, count }) => {
              await startSession({ host, count });
            }}
            onStop={async () => {
              await stopSession();
            }}
          />

          <div className="grow" />

          <div className="panel-footer">
            <div className="status-badges">
              <span className={`badge ${status === 'running' ? 'badge-success' : 'badge-muted'}`}>
                {status.toUpperCase()}
              </span>
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
              {!healthOk && <span className="badge badge-error">Backend Unhealthy</span>}
            </div>
            <div className="footer-actions">
              <button
                className="btn btn-secondary"
                onClick={clearLogs}
                title="Clear logs"
                aria-label="Clear logs"
              >
                Clear Logs
              </button>
            </div>
          </div>
        </div>

        <div className="panel panel-right">
          <LogViewer
            logs={logs}
            error={error}
            connectionStatus={connectionStatus}
            onClear={clearLogs}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
