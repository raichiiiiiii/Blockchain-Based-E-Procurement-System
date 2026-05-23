import React, { useState } from 'react';

type SequenceState = 'idle' | 'loading' | 'successWithItems' | 'empty' | 'validationError' | 'forbidden' | 'incompleteOrUnknown' | 'error';

const AccessEventSequencePage: React.FC = () => {
  const [mode, setMode] = useState<'actor' | 'target'>('actor');
  const [actorUserId, setActorUserId] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetId, setTargetId] = useState('');
  const [timeRange, setTimeRange] = useState({
    occurredFrom: '',
    occurredTo: ''
  });
  const [sequenceState, setSequenceState] = useState<SequenceState>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [completenessStatus, setCompletenessStatus] = useState<'complete' | 'partial' | 'unknown'>('unknown');

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTimeRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset previous errors
    setErrorMessage('');
    
    // Validation
    if (mode === 'actor' && !actorUserId.trim()) {
      setSequenceState('validationError');
      setErrorMessage('Actor User ID is required for actor sequence');
      return;
    }
    
    if (mode === 'target' && (!targetType.trim() || !targetId.trim())) {
      setSequenceState('validationError');
      setErrorMessage('Both Target Type and Target ID are required for target sequence');
      return;
    }
    
    // Time range validation
    if (timeRange.occurredFrom && timeRange.occurredTo) {
      const fromDate = new Date(timeRange.occurredFrom);
      const toDate = new Date(timeRange.occurredTo);
      if (fromDate > toDate) {
        setSequenceState('validationError');
        setErrorMessage('Occurred From must be before or equal to Occurred To');
        return;
      }
    }
    
    // Simulate API call
    setSequenceState('loading');
    
    // Simulate different responses based on inputs for demonstration
    setTimeout(() => {
      if ((mode === 'actor' && actorUserId === 'forbidden') || 
          (mode === 'target' && targetType === 'forbidden')) {
        setSequenceState('forbidden');
        setErrorMessage('User must have auditor role to query access history');
      } else if ((mode === 'actor' && actorUserId === 'error') || 
                 (mode === 'target' && targetType === 'error')) {
        setSequenceState('error');
        setErrorMessage('An unexpected error occurred while processing your request');
      } else if ((mode === 'actor' && actorUserId === 'empty') || 
                 (mode === 'target' && targetType === 'empty')) {
        setSequenceState('empty');
      } else if ((mode === 'actor' && actorUserId === 'incomplete') || 
                 (mode === 'target' && targetType === 'incomplete')) {
        setSequenceState('incompleteOrUnknown');
        setCompletenessStatus('partial');
      } else {
        // Randomly set completeness status for demo purposes
        const statuses: ('complete' | 'partial' | 'unknown')[] = ['complete', 'partial', 'unknown'];
        setCompletenessStatus(statuses[Math.floor(Math.random() * statuses.length)]);
        setSequenceState('successWithItems');
      }
    }, 1000);
  };

  const resetDemo = () => {
    setSequenceState('idle');
    setErrorMessage('');
    setCompletenessStatus('unknown');
  };

  return (
    <div className="page-container">
      <h1>Access Event Sequence</h1>
      <p>View chronological sequences of access events for an actor or target.</p>
      
      {/* Demo Controls */}
      <div className="demo-controls">
        <h3>Demo Controls (for testing states)</h3>
        <p>Enter special values to simulate different states:</p>
        <ul>
          <li><strong>"forbidden"</strong> in Actor User ID or Target Type → Forbidden state</li>
          <li><strong>"error"</strong> in Actor User ID or Target Type → Error state</li>
          <li><strong>"empty"</strong> in Actor User ID or Target Type → Empty result state</li>
          <li><strong>"incomplete"</strong> in Actor User ID or Target Type → Incomplete/Unknown state</li>
        </ul>
        <button onClick={resetDemo}>Reset to Idle State</button>
      </div>
      
      <form onSubmit={handleSubmit} className="sequence-form">
        <div className="form-group">
          <label>Sequence Mode:</label>
          <div className="radio-group">
            <label>
              <input
                type="radio"
                value="actor"
                checked={mode === 'actor'}
                onChange={() => setMode('actor')}
              />
              Actor Sequence
            </label>
            <label>
              <input
                type="radio"
                value="target"
                checked={mode === 'target'}
                onChange={() => setMode('target')}
              />
              Target Sequence
            </label>
          </div>
        </div>
        
        {mode === 'actor' ? (
          <div className="form-group">
            <label htmlFor="actorUserId">Actor User ID:</label>
            <input
              type="text"
              id="actorUserId"
              value={actorUserId}
              onChange={(e) => setActorUserId(e.target.value)}
              placeholder="Enter actor user ID"
              required
            />
          </div>
        ) : (
          <>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="targetType">Target Type:</label>
                <input
                  type="text"
                  id="targetType"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  placeholder="Enter target type"
                  required
                />
              </div>
              
              <div className="form-group">
                <label htmlFor="targetId">Target ID:</label>
                <input
                  type="text"
                  id="targetId"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  placeholder="Enter target ID"
                  required
                />
              </div>
            </div>
          </>
        )}
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="occurredFrom">Occurred From:</label>
            <input
              type="datetime-local"
              id="occurredFrom"
              name="occurredFrom"
              value={timeRange.occurredFrom}
              onChange={handleTimeChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="occurredTo">Occurred To:</label>
            <input
              type="datetime-local"
              id="occurredTo"
              name="occurredTo"
              value={timeRange.occurredTo}
              onChange={handleTimeChange}
            />
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={sequenceState === 'loading'}>
            {sequenceState === 'loading' ? 'Loading...' : 'View Event Sequence'}
          </button>
        </div>
      </form>
      
      {/* Validation Error */}
      {sequenceState === 'validationError' && (
        <div className="validation-error-section">
          <h3>Validation Error</h3>
          <div className="error-message">
            <p>{errorMessage}</p>
          </div>
          <p><strong>Note:</strong> Invalid query parameters must be shown as VALIDATION_ERROR.</p>
        </div>
      )}
      
      {/* Forbidden State */}
      {sequenceState === 'forbidden' && (
        <div className="forbidden-section">
          <h3>Access Denied</h3>
          <div className="error-message">
            <p>{errorMessage || 'You do not have permission to access this resource.'}</p>
          </div>
          <p><strong>Note:</strong> Backend FORBIDDEN means auditor authorization failed or actor lacks access.</p>
        </div>
      )}
      
      {/* Error State */}
      {sequenceState === 'error' && (
        <div className="error-section">
          <h3>Error</h3>
          <div className="error-message">
            <p>{errorMessage || 'An unexpected error occurred while processing your request.'}</p>
          </div>
          <p><strong>Note:</strong> Safe generic error, no sensitive details.</p>
        </div>
      )}
      
      {/* Empty State */}
      {sequenceState === 'empty' && (
        <div className="empty-section">
          <h3>Sequence Results</h3>
          <div className="empty-message">
            <p>No access events found for the specified sequence.</p>
          </div>
          <p><strong>Note:</strong> Empty sequence result is success with data.items = [].</p>
        </div>
      )}
      
      {/* Incomplete/Unknown State */}
      {sequenceState === 'incompleteOrUnknown' && (
        <div className="incomplete-section">
          <h3>Sequence Results</h3>
          <div className="completeness-warning">
            <h4>Completeness Warning</h4>
            <p>
              Completeness status: <strong>{completenessStatus}</strong>
            </p>
            <p>
              Reason: completeness_not_proven
            </p>
            <p>
              Message: Available events are returned, but the repository cannot prove the sequence is complete.
            </p>
          </div>
          <div className="sample-events">
            <h4>Sample Events</h4>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Occurred At</th>
                  <th>Actor User ID</th>
                  <th>Action</th>
                  <th>Target Type</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>550e8400-e29b-41d4-a716-446655440000</td>
                  <td>2026-04-01T10:30:00Z</td>
                  <td>user-123</td>
                  <td>createRoleAssignment</td>
                  <td>roleAssignment</td>
                  <td>success</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p><strong>Note:</strong> Completeness unknown/partial must show warning and must not imply complete lifecycle evidence.</p>
        </div>
      )}
      
      {/* Success With Items */}
      {sequenceState === 'successWithItems' && (
        <div className="result-section">
          <h2>Sequence Results</h2>
          <div className="completeness-info">
            <h4>Completeness Information</h4>
            <p>
              Completeness status: <strong>{completenessStatus}</strong>
            </p>
            {completenessStatus !== 'complete' && (
              <p>
                Reason: completeness_not_proven
              </p>
            )}
            <p>
              Message: {completenessStatus === 'complete' 
                ? 'All events matching the scope and time window are included in this sequence.'
                : 'Available events are returned, but the repository cannot prove the sequence is complete.'}
            </p>
          </div>
          <div className="sample-events">
            <h4>Sample Events (Ordered by occurredAt, then eventId)</h4>
            <table className="results-table">
              <thead>
                <tr>
                  <th>Event ID</th>
                  <th>Occurred At</th>
                  <th>Actor User ID</th>
                  <th>Action</th>
                  <th>Target Type</th>
                  <th>Outcome</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>550e8400-e29b-41d4-a716-446655440000</td>
                  <td>2026-04-01T10:30:00Z</td>
                  <td>user-123</td>
                  <td>createRoleAssignment</td>
                  <td>roleAssignment</td>
                  <td>success</td>
                </tr>
                <tr>
                  <td>660e8400-e29b-41d4-a716-446655440001</td>
                  <td>2026-04-01T11:45:00Z</td>
                  <td>user-123</td>
                  <td>updateRoleAssignment</td>
                  <td>roleAssignment</td>
                  <td>success</td>
                </tr>
                <tr>
                  <td>770e8400-e29b-41d4-a716-446655440002</td>
                  <td>2026-04-01T12:30:00Z</td>
                  <td>user-456</td>
                  <td>viewRoleAssignment</td>
                  <td>roleAssignment</td>
                  <td>forbidden</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Results are ordered by <code>occurredAt</code> ascending, then <code>eventId</code> ascending.
          </p>
        </div>
      )}
      
      <div className="info-section">
        <h2>About Event Sequences</h2>
        <p>
          In a real implementation, this would display chronological sequences from calling:
          <br />
          <code>GET /api/v1/access-history/sequences</code>
        </p>
        <p>
          Results would be ordered by <code>occurredAt</code> ascending, then <code>eventId</code> ascending.
        </p>
        <p>
          Completeness metadata would be displayed:
        </p>
        <ul>
          <li>Status: complete | partial | unknown</li>
          <li>Reason: completeness_not_proven (for MVP)</li>
          <li>Message explaining the completeness status</li>
        </ul>
        <p>
          Empty sequences would be shown as success with <code>data.items = []</code>, not as an error.
        </p>
        <p>
          Unknown completeness must not be presented as complete lifecycle evidence.
        </p>
      </div>
    </div>
  );
};

export default AccessEventSequencePage;
