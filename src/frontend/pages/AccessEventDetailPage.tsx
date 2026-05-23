import React, { useState } from 'react';

type DetailState = 'idle' | 'loading' | 'success' | 'notFound' | 'validationError' | 'forbidden' | 'error';

const AccessEventDetailPage: React.FC = () => {
  const [eventId, setEventId] = useState('');
  const [detailState, setDetailState] = useState<DetailState>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset previous errors
    setErrorMessage('');
    
    // Simple validation
    if (!eventId.trim()) {
      setDetailState('validationError');
      setErrorMessage('Event ID is required');
      return;
    }
    
    // Simulate API call
    setDetailState('loading');
    
    // Simulate different responses based on eventId for demonstration
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
      
      {/* Demo Controls */}
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
      
      {/* Validation Error */}
      {detailState === 'validationError' && (
        <div className="validation-error-section">
          <h3>Validation Error</h3>
          <div className="error-message">
            <p>{errorMessage}</p>
          </div>
          <p><strong>Note:</strong> Invalid Event ID format must be shown as VALIDATION_ERROR.</p>
        </div>
      )}
      
      {/* Forbidden State */}
      {detailState === 'forbidden' && (
        <div className="forbidden-section">
          <h3>Access Denied</h3>
          <div className="error-message">
            <p>{errorMessage || 'You do not have permission to access this resource.'}</p>
          </div>
          <p><strong>Note:</strong> Backend FORBIDDEN means auditor authorization failed or actor lacks access.</p>
        </div>
      )}
      
      {/* Not Found State */}
      {detailState === 'notFound' && (
        <div className="not-found-section">
          <h3>Event Not Found</h3>
          <div className="error-message">
            <p>Access audit event with ID "{eventId}" was not found.</p>
          </div>
          <p><strong>Note:</strong> Missing event is NOT_FOUND, not empty result.</p>
        </div>
      )}
      
      {/* Error State */}
      {detailState === 'error' && (
        <div className="error-section">
          <h3>Error</h3>
          <div className="error-message">
            <p>{errorMessage || 'An unexpected error occurred while processing your request.'}</p>
          </div>
          <p><strong>Note:</strong> Safe generic error, no sensitive details.</p>
        </div>
      )}
      
      {/* Success State */}
      {detailState === 'success' && (
        <div className="detail-section">
          <h2>Event Details</h2>
          <div className="event-details">
            <h3>Sample Event Data</h3>
            <p>In a real implementation, this would display the event details from calling:</p>
            <code>GET /api/v1/access-history/events/{eventId}</code>
            
            <div className="event-fields">
              <div className="field-row">
                <span className="field-label">Event ID:</span>
                <span className="field-value">{eventId || '550e8400-e29b-41d4-a716-446655440000'}</span>
              </div>
              <div className="field-row">
                <span className="field-label">Schema Version:</span>
                <span className="field-value">access-audit-event.v1</span>
              </div>
              <div className="field-row">
                <span className="field-label">Occurred At:</span>
                <span className="field-value">2026-04-01T10:30:00Z</span>
              </div>
              <div className="field-row">
                <span className="field-label">Request ID:</span>
                <span className="field-value">req-event-detail-sample</span>
              </div>
              <div className="field-row">
                <span className="field-label">Actor User ID:</span>
                <span className="field-value">admin-user</span>
              </div>
              <div className="field-row">
                <span className="field-label">Actor Source:</span>
                <span className="field-value">actorContext</span>
              </div>
              <div className="field-row">
                <span className="field-label">Action:</span>
                <span className="field-value">changeRoleAssignment</span>
              </div>
              <div className="field-row">
                <span className="field-label">Target Type:</span>
                <span className="field-value">roleAssignment</span>
              </div>
              <div className="field-row">
                <span className="field-label">Target ID:</span>
                <span className="field-value">user-001:org-001:role-reviewer</span>
              </div>
              <div className="field-row">
                <span className="field-label">Outcome:</span>
                <span className="field-value">forbidden</span>
              </div>
              <div className="field-row">
                <span className="field-label">Reason:</span>
                <span className="field-value">admin_required</span>
              </div>
              <div className="field-row">
                <span className="field-label">Module:</span>
                <span className="field-value">access-control</span>
              </div>
              <div className="field-row">
                <span className="field-label">Route:</span>
                <span className="field-value">/api/v1/role-assignments/change</span>
              </div>
              <div className="field-row">
                <span className="field-label">Method:</span>
                <span className="field-value">PATCH</span>
              </div>
              <div className="field-row">
                <span className="field-label">Evidence Payload Hash:</span>
                <span className="field-value">sha256-placeholder</span>
              </div>
              <div className="field-row">
                <span className="field-label">Canonicalization:</span>
                <span className="field-value">json-stable-v1</span>
              </div>
              <div className="field-row">
                <span className="field-label">Previous Event Hash:</span>
                <span className="field-value">previous-sha256-placeholder</span>
              </div>
            </div>
          </div>
          
          <div className="info-note">
            <p><strong>Note:</strong> Event fields preserve backend semantics. Evidence fields are not synthesized.</p>
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
          <li><code>eventId</code></li>
          <li><code>schemaVersion</code></li>
          <li><code>occurredAt</code></li>
          <li><code>requestId</code></li>
          <li><code>actorUserId</code></li>
          <li><code>actorSource</code></li>
          <li><code>action</code></li>
          <li><code>targetType</code></li>
          <li><code>targetId</code></li>
          <li><code>outcome</code></li>
          <li><code>reason</code> (when present)</li>
          <li><code>module</code></li>
          <li><code>route</code> (when present)</li>
          <li><code>method</code> (when present)</li>
          <li><code>evidence.payloadHash</code></li>
          <li><code>evidence.canonicalization</code></li>
          <li><code>evidence.previousEventHash</code> (when present)</li>
        </ul>
        <p>
          A missing event would return a NOT_FOUND response, not an empty result.
        </p>
      </div>
    </div>
  );
};

export default AccessEventDetailPage;
