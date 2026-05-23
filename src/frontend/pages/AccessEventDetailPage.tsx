import React, { useState } from 'react';

type DetailState = 'idle' | 'loading' | 'success' | 'notFound' | 'validationError' | 'forbidden' | 'error';

const ACCESS_EVENT_DETAIL_FIELDS = [
  'eventId',
  'schemaVersion',
  'occurredAt',
  'requestId',
  'actorUserId',
  'actorSource',
  'action',
  'targetType',
  'targetId',
  'outcome',
  'reason',
  'module',
  'route',
  'method',
  'evidence.payloadHash',
  'evidence.canonicalization',
  'evidence.previousEventHash'
];

const AccessEventDetailPage: React.FC = () => {
  const [eventId, setEventId] = useState('');
  const [detailState, setDetailState] = useState<DetailState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    setErrorMessage('');

    if (!eventId.trim()) {
      setDetailState('validationError');
      setErrorMessage('Event ID is required');
      return;
    }

    setDetailState('loading');

    setTimeout(() => {
      if (eventId === 'forbidden') {
        setDetailState('forbidden');
        setErrorMessage('User must have auditor role to query access history');
      } else if (eventId === 'notfound') {
        setDetailState('notFound');
      } else if (eventId === 'error') {
        setDetailState('error');
        setErrorMessage('An unexpected error occurred while processing your request');
      } else {
        setDetailState('success');
      }
    }, 1000);
  };

  const resetDemo = () => {
    setDetailState('idle');
    setErrorMessage('');
  };

  return (
    <div className="page-container">
      <h1>Access Event Detail</h1>
      <p>View detailed information about a specific access audit event.</p>

      <div className="demo-controls">
        <h3>Demo Controls (for testing states)</h3>
        <p>Enter special values to simulate different states:</p>
        <ul>
          <li><strong>"forbidden"</strong> → Forbidden state</li>
          <li><strong>"notfound"</strong> → Not Found state</li>
          <li><strong>"error"</strong> → Error state</li>
        </ul>
        <button onClick={resetDemo}>Reset to Idle State</button>
      </div>

      <form onSubmit={handleSubmit} className="detail-form">
        <div className="form-group">
          <label htmlFor="eventId">Event ID:</label>
          <input
            type="text"
            id="eventId"
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            placeholder="Enter event ID"
            required
          />
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={detailState === 'loading'}>
            {detailState === 'loading' ? 'Loading...' : 'View Event Detail'}
          </button>
        </div>
      </form>

      {detailState === 'validationError' && (
        <div className="validation-error-section">
          <h3>Validation Error</h3>
          <div className="error-message">
            <p>{errorMessage}</p>
          </div>
          <p><strong>Note:</strong> Invalid Event ID format must be shown as VALIDATION_ERROR.</p>
        </div>
      )}

      {detailState === 'forbidden' && (
        <div className="forbidden-section">
          <h3>Access Denied</h3>
          <div className="error-message">
            <p>{errorMessage || 'You do not have permission to access this resource.'}</p>
          </div>
          <p><strong>Note:</strong> Backend FORBIDDEN means auditor authorization failed or actor lacks access.</p>
        </div>
      )}

      {detailState === 'notFound' && (
        <div className="not-found-section">
          <h3>Event Not Found</h3>
          <div className="error-message">
            <p>Access audit event with ID "{eventId}" was not found.</p>
          </div>
          <p><strong>Note:</strong> Missing event is NOT_FOUND, not empty result.</p>
        </div>
      )}

      {detailState === 'error' && (
        <div className="error-section">
          <h3>Error</h3>
          <div className="error-message">
            <p>{errorMessage || 'An unexpected error occurred while processing your request.'}</p>
          </div>
          <p><strong>Note:</strong> Safe generic error, no sensitive details.</p>
        </div>
      )}

      {detailState === 'success' && (
        <div className="detail-section">
          <h2>Backend Event Detail Schema Preview</h2>
          <div className="event-details">
            <p>API binding is not implemented in this dashboard slice. A real implementation will display backend-provided event details from:</p>
            <code>GET /api/v1/access-history/events/{eventId}</code>

            <div className="event-fields">
              {ACCESS_EVENT_DETAIL_FIELDS.map(fieldName => (
                <div className="field-row" key={fieldName}>
                  <span className="field-label">{fieldName}:</span>
                  <span className="field-value">backend-provided value only</span>
                </div>
              ))}
            </div>
          </div>

          <div className="info-note">
            <p><strong>Note:</strong> Event fields preserve backend semantics. Evidence hash values are not synthesized by the frontend.</p>
          </div>
        </div>
      )}

      <div className="info-section">
        <h2>About Event Details</h2>
        <p>
          In a real implementation, this would display the event details from calling:
          <br />
          <code>GET /api/v1/access-history/events/{'{eventId}'}</code>
        </p>
        <p>
          All event fields would be preserved, including:
        </p>
        <ul>
          {ACCESS_EVENT_DETAIL_FIELDS.map(fieldName => (
            <li key={fieldName}><code>{fieldName}</code></li>
          ))}
        </ul>
        <p>
          A missing event would return a NOT_FOUND response, not an empty result.
        </p>
      </div>
    </div>
  );
};

export default AccessEventDetailPage;
