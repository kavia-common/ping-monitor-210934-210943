import React from 'react';

// PUBLIC_INTERFACE
export default function PingControls({ host, setHost, hostValid, ipInputRef }) {
  /** PingControls renders only the IP input field.
   * Start/Stop buttons are now in the parent App component at the bottom.
   */
  return (
    <div className="form" role="form" aria-label="Ping Controls">
      <div className="field">
        <label htmlFor="host" className="label">Enter IP or Domain</label>
        <input
          ref={ipInputRef}
          id="host"
          className="input"
          placeholder="e.g. 8.8.8.8 or example.com"
          value={host}
          onChange={(e) => setHost(e.target.value)}
          aria-invalid={host.length > 0 && !hostValid}
          aria-describedby="host-help"
        />
        <div id="host-help" className={`helper ${host && !hostValid ? 'error' : ''}`}>
          {host && !hostValid ? 'Enter a valid IPv4/IPv6 or domain.' : 'Enter a host to ping.'}
        </div>
      </div>
    </div>
  );
}
