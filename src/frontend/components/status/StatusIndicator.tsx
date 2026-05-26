export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'pending';

export type StatusIndicatorProps = {
  label: string;
  tone: StatusTone;
  detail?: string;
  compact?: boolean;
};

function StatusIndicator({ label, tone, detail, compact = false }: StatusIndicatorProps) {
  return (
    <span
      className={`status-indicator status-indicator-${tone}${compact ? ' status-indicator-compact' : ''}`}
      title={detail ?? label}
      aria-label={detail ? `${label}: ${detail}` : label}
    >
      <span className="status-indicator-icon" aria-hidden="true" />
      <span className="status-indicator-label">{label}</span>
    </span>
  );
}

export default StatusIndicator;
