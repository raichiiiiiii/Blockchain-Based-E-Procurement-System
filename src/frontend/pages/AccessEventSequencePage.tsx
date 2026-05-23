import React, { useState } from 'react';

const AccessEventSequencePage: React.FC = () => {
  const [mode, setMode] = useState<'actor' | 'target'>('actor');
  const [actorUserId, setActorUserId] = useState('');
  const [targetType, setTargetType] = useState('');
  const [targetId, setTargetId] = useState('');
  const [timeRange, setTimeRange] = useState({
    occurredFrom: '',
    occurredTo: ''
  });

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setTimeRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'actor' && !actorUserId) {
      alert('Please enter an Actor User ID');
      return;
    }
    
    if (mode === 'target' && (!targetType || !targetId)) {
      alert('Please enter both Target Type and Target ID');
      return;
    }
    
    // In a real implementation, this would call the API
    const params = mode === 'actor' 
      ? { scope: 'actor', actorUserId }
      : { scope: 'target', targetType, targetId };
    
    console.log('Sequence parameters:', { ...params, ...timeRange });
    alert(`In a real implementation, this would call GET /api/v1/access-history/sequences with these parameters`);
  };

  return (
    <div className="page-container">
      <h1>Access Event Sequence</h1>
      <p>View chronological sequences of access events for an actor or target.</p>
      
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
          <button type="submit" className="btn-primary">
            View Event Sequence
          </button>
        </div>
      </form>
      
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
