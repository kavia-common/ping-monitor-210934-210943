import React from 'react';
import './index.css';
import './App.css';
import './theme.css';
import PingMonitor from './components/PingMonitor';

// PUBLIC_INTERFACE
function App() {
  /** App entrypoint that renders the PingMonitor component.
   * The PingMonitor component provides a 1024x768 canvas with left IP input panel,
   * right log area, and bottom Start/Stop buttons with Ocean Professional styling.
   */
  return (
    <div className="app-root">
      <PingMonitor />
    </div>
  );
}

export default App;
