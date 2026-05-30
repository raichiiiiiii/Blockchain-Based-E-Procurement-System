CREATE TABLE IF NOT EXISTS operational_incidents (
  incident_id TEXT PRIMARY KEY,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  source TEXT NOT NULL CHECK (source IN ('database', 'fabric', 'payment', 'runtime')),
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
  occurred_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_operational_incidents_status
  ON operational_incidents(status);

CREATE INDEX IF NOT EXISTS idx_operational_incidents_source
  ON operational_incidents(source);

CREATE INDEX IF NOT EXISTS idx_operational_incidents_occurred_at
  ON operational_incidents(occurred_at DESC);
