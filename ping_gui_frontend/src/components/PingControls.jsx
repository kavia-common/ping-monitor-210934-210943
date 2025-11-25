import React, { useMemo, useState } from 'react';

// PUBLIC_INTERFACE
export default function PingControls({ disabledStart, disabledStop, onStart, onStop }) {
  /** PingControls renders inputs for host and count, and Start/Stop buttons.
   * Start is disabled until host passes a basic IP/domain regex validation.
   */
  const [host, setHost] = useState('');
  const [count, setCount] = useState('');

  const hostValid = useMemo(() => validateHost(host), [host]);
  const canStart = hostValid && !disabledStart;

  return (
    <div className="form" role="form" aria-label="Ping Controls">
      <div className="field">
        <label htmlFor="host" className="label">Host (IP or domain)</label>
        <input
          id="host"
          className="input"
          placeholder="e.g. 8.8.8.8 or example.com"
          value={host}
          onChange={(e) => setHost(e.target.value.trim())}
          aria-invalid={host.length > 0 && !hostValid}
          aria-describedby="host-help"
        />
        <div id="host-help" className={`helper ${host && !hostValid ? 'error' : ''}`}>
          {host && !hostValid ? 'Enter a valid IPv4/IPv6 or domain.' : 'Enter a host to ping.'}
        </div>
      </div>

      <div className="field">
        <label htmlFor="count" className="label">Count (optional)</label>
        <input
          id="count"
          className="input"
          placeholder="Number of echo requests"
          value={count}
          onChange={(e) => {
            const v = e.target.value;
            if (v === '' || /^[0-9]+$/.test(v)) setCount(v);
          }}
          inputMode="numeric"
        />
        <div className="helper">Leave empty to use backend default (continuous).</div>
      </div>

      <div className="field" style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          className="btn btn-primary"
          disabled={!canStart}
          onClick={() => onStart({ host, count: count === '' ? undefined : Number(count) })}
        >
          Start
        </button>
        <button className="btn btn-danger" disabled={disabledStop} onClick={onStop}>
          Stop
        </button>
      </div>
    </div>
  );
}

function validateHost(value) {
  if (!value) return false;
  // IPv4
  const ipv4 =
    /^(?:(?:25[0-5]|2[0-4]\d|[01]?\d?\d)(?:\.|$)){4}$/.test(value);
  // IPv6 (basic)
  const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|(::1)|(::))$/.test(value);
  // domain (simple)
  const domain = /^(?=.{1,253}$)(?!-)([a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,63}$/.test(value);
  // single label like 'localhost'
  const localhost = value === 'localhost';
  return ipv4 || ipv6 || domain || localhost;
}
