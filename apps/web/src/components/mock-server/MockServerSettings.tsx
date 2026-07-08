import { useMockServerStore } from '@/stores/mockServerStore';
import styles from './MockServerSettings.module.css';

interface MockServerSettingsProps {
  disabled?: boolean;
}

/**
 * MockServerSettings — port, delay, and error simulation controls.
 */
export const MockServerSettings = ({ disabled = false }: MockServerSettingsProps) => {
  const port = useMockServerStore((s) => s.port);
  const errorSimulationEnabled = useMockServerStore((s) => s.errorSimulationEnabled);
  const defaultDelayMs = useMockServerStore((s) => s.defaultDelayMs);
  const { setPort, setErrorSimulation, setDefaultDelay } = useMockServerStore.getState();

  return (
    <div className={styles.settings}>
      <span className={styles.settingsTitle}>Mock Server Settings</span>

      {/* Port */}
      <div className={styles.settingRow}>
        <label className={styles.settingLabel}>
          Port
          <span className={styles.settingHint}>Must differ from main API (8000)</span>
        </label>
        <input
          className={styles.portInput}
          type="number"
          value={port}
          min={1024}
          max={65535}
          onChange={(e) => setPort(parseInt(e.target.value, 10) || 3001)}
          disabled={disabled}
        />
      </div>

      {/* Default delay */}
      <div className={styles.settingRow}>
        <label className={styles.settingLabel}>
          Response delay
          <span className={styles.settingHint}>Simulate network latency (ms). Use ?_delay=N to override per-request.</span>
        </label>
        <input
          className={styles.delayInput}
          type="number"
          value={defaultDelayMs}
          min={0}
          max={10000}
          step={100}
          onChange={(e) => setDefaultDelay(parseInt(e.target.value, 10) || 0)}
          disabled={disabled}
        />
      </div>

      {/* Error simulation */}
      <div className={styles.settingRow}>
        <label className={styles.settingLabel}>
          Error simulation hint
          <span className={styles.settingHint}>Add ?_error=500 to any request to force an error response.</span>
        </label>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={errorSimulationEnabled}
            onChange={(e) => setErrorSimulation(e.target.checked)}
            disabled={disabled}
          />
          <div className={styles.toggleTrack}>
            <div className={styles.toggleThumb} />
          </div>
        </label>
      </div>
    </div>
  );
};
