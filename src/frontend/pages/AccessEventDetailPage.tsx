import React, { useState } from 'react';

const AccessEventDetailPage: React.FC = () => {
  const [eventId, setEventId] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would call the API
    console.log('Event ID:', eventId);
    alert(`In a real implementation, this would call GET /api/v1/access-history/events/${eventId}`);
  };

  return (
    <div className="page-container">
      <h1>Access Event Detail</h1>
      <p>View detailed information about a specific access audit event.</p>
      
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
          <button type="submit" className="btn-primary">
            View Event Detail
          </button>
        </div>
      </form>
      
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
