import React, { useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import './App.css';
import './theme.css';
import PingControls from './components/PingControls';
import LogViewer from './components/LogViewer';
import { usePingSession } from './hooks/usePingSession';
import { api } from './services/api';

// PUBLIC_INTERFACE
function App() {
  /** App entrypoint that renders a 1024x768 canvas with left IP input panel and right log area.
   * Start/Stop buttons are fixed at the bottom spanning the full width.
   * It manages backend health banner, integrates the ping session hook, and provides
   * Start/Stop behaviors with clean teardown.
   */
  const [healthOk, setHealthOk] = useState(true);
  const [checkingHealth, setCheckingHealth] = useState(true);
  const [host, setHost] = useState('');
  const ipInputRef = useRef(null);

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

  // Set initial focus on IP input
  useEffect(() => {
    if (ipInputRef.current) {
      ipInputRef.current.focus();
    }
  }, []);

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

  const hostValid = useMemo(() => {
    if (!host) return false;
    const value = host.trim();
    // IPv4
    const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)(?:\.|$)){4}$/.test(value);
    // IPv6 (basic)
    const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::1)|(::))$/.test(value);
    // domain (simple)
    const domain = /^(?=.{1,253}$)(?!-)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/.test(value);
    // single label like 'localhost'
    const localhost = value === 'localhost';
    return ipv4 || ipv6 || domain || localhost;
  }, [host]);

  const canStart = useMemo(() => hostValid && status !== 'running' && status !== 'starting', [hostValid, status]);
  const canStop = useMemo(() => status === 'running' || status === 'starting', [status]);

  const handleStart = async () => {
    if (!canStart) return;
    await startSession({ host: host.trim() });
  };

  const handleStop = async () => {
    await stopSession();
  };

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
            <h1 className="title">IP Address</h1>
          </div>

          <PingControls
            host={host}
            setHost={setHost}
            hostValid={hostValid}
            ipInputRef={ipInputRef}
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

        {/* Bottom buttons spanning full width */}
        <div className="bottom-controls">
          <button
            className="btn btn-primary btn-large"
            disabled={!canStart}
            onClick={handleStart}
            aria-label="Start ping"
          >
            Start
          </button>
          <button
            className="btn btn-danger btn-large"
            disabled={!canStop}
            onClick={handleStop}
            aria-label="Stop ping"
          >
            Stop
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
