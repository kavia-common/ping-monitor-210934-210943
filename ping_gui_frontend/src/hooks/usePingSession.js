import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../services/api';
import { connectPingStream } from '../services/ws';

// PUBLIC_INTERFACE
export function usePingSession({ maxLogLength = 5000, retry = { attempts: 3, backoffMs: 1000 } } = {}) {
  /** Hook to manage ping session:
   * - startSession({ host, count })
   * - stopSession()
   * - logs, error, status, connectionStatus
   * - clearLogs()
   */
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // idle | starting | running | stopping
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // connecting | connected | disconnected

  const sessionIdRef = useRef(null);
  const wsRef = useRef(null);
  const disconnectRef = useRef(null);
  const unmountedRef = useRef(false);

  const appendLog = useCallback((line) => {
    setLogs((prev) => {
      const next = [...prev, line];
      if (next.length > maxLogLength) {
        return next.slice(next.length - maxLogLength);
      }
      return next;
    });
  }, [maxLogLength]);

  const clearLogs = useCallback(() => {
    setLogs([]);
    setError(null);
  }, []);

  const stopSession = useCallback(async () => {
    if (status === 'idle') return;
    setStatus('stopping');
    try {
      if (disconnectRef.current) disconnectRef.current();
      setConnectionStatus('disconnected');
      if (sessionIdRef.current) {
        await api.stop({ sessionId: sessionIdRef.current });
      }
    } catch (e) {
      // surface but don't block
      setError((e && e.message) || 'Failed to stop session');
    } finally {
      sessionIdRef.current = null;
      wsRef.current = null;
      disconnectRef.current = null;
      if (!unmountedRef.current) setStatus('idle');
    }
  }, [status]);

  const startSession = useCallback(async ({ host, count }) => {
    setError(null);
    setLogs([]);
    setStatus('starting');
    let attempt = 0;
    async function tryStart() {
      attempt += 1;
      try {
        const { sessionId } = await api.start({ host, count });
        if (unmountedRef.current) return;
        sessionIdRef.current = sessionId;
        setConnectionStatus('connecting');

        const { socket, disconnect } = connectPingStream({
          sessionId,
          onOpen: () => setConnectionStatus('connected'),
          onClose: () => {
            setConnectionStatus('disconnected');
            // If still running, consider as end-of-stream
            if (!unmountedRef.current && status !== 'idle') {
              appendLog('[stream closed]');
              setStatus('idle');
            }
          },
          onError: () => {
            setConnectionStatus('disconnected');
            appendLog('[websocket error]');
          },
          onMessage: (msg) => {
            appendLog(String(msg));
          },
        });
        wsRef.current = socket;
        disconnectRef.current = disconnect;
        setStatus('running');
      } catch (e) {
        if (attempt < (retry?.attempts ?? 0)) {
          await new Promise((r) => setTimeout(r, retry?.backoffMs ?? 1000));
          return tryStart();
        }
        setError((e && e.message) || 'Failed to start session');
        setStatus('idle');
      }
    }
    await tryStart();
  }, [appendLog, retry]);

  useEffect(() => {
    return () => {
      unmountedRef.current = true;
      try {
        if (disconnectRef.current) disconnectRef.current();
      } catch {
        // ignore
      }
    };
  }, []);

  return {
    logs,
    error,
    status,
    connectionStatus,
    startSession,
    stopSession,
    clearLogs,
  };
}
