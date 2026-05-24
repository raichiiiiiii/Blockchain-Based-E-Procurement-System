import React, { useState } from 'react';

type SearchState = 'idle' | 'loading' | 'successWithResults' | 'empty' | 'validationError' | 'forbidden' | 'error';

const AccessHistorySearchPage: React.FC = () => {
  const [filters, setFilters] = useState({
    actorUserId: '',
    targetType: '',
    targetId: '',
    action: '',
    outcome: '',
    occurredFrom: '',
    occurredTo: '',
    module: '',
    route: '',
    method: ''
  });
  
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [errorMessage, setErrorMessage] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Reset previous errors
    setValidationErrors([]);
    setErrorMessage('');
    
    // Simple validation example
    const errors: string[] = [];
    if (filters.occurredFrom && filters.occurredTo) {
      const fromDate = new Date(filters.occurredFrom);
      const toDate = new Date(filters.occurredTo);
      if (fromDate > toDate) {
        errors.push('Occurred From must be before or equal to Occurred To');
      }
    }
    
    if (errors.length > 0) {
      setValidationErrors(errors);
      setSearchState('validationError');
      return;
    }
    
    // Simulate API call
    setSearchState('loading');
    
    // Simulate different responses based on filters for demonstration
    setTimeout(() => {
      if (filters.actorUserId === 'forbidden') {
        setSearchState('forbidden');
        setErrorMessage('User must have auditor role to query access history');
      } else if (filters.actorUserId === 'error') {
        setSearchState('error');
        setErrorMessage('An unexpected error occurred while processing your request');
      } else if (filters.actorUserId === 'empty') {
        setSearchState('empty');
      } else {
        setSearchState('successWithResults');
      }
    }, 1000);
  };

  const resetDemo = () => {
    setSearchState('idle');
    setValidationErrors([]);
    setErrorMessage('');
  };

  return (
    <div className="page-container">
      <h1>Access History Search</h1>
      <p>Search access history events using the supported filters from the contract.</p>
      
      {/* Demo Controls */}
      <div className="demo-controls">
        <h3>Demo Controls (for testing states)</h3>
        <p>Enter special values to simulate different states:</p>
        <ul>
          <li><strong>"forbidden"</strong> in Actor User ID → Forbidden state</li>
          <li><strong>"error"</strong> in Actor User ID → Error state</li>
          <li><strong>"empty"</strong> in Actor User ID → Empty result state</li>
        </ul>
        <button onClick={resetDemo}>Reset to Idle State</button>
      </div>
      
      <form onSubmit={handleSubmit} className="search-form">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="actorUserId">Actor User ID:</label>
            <input
              type="text"
              id="actorUserId"
              name="actorUserId"
              value={filters.actorUserId}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="targetType">Target Type:</label>
            <input
              type="text"
              id="targetType"
              name="targetType"
              value={filters.targetType}
              onChange={handleInputChange}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="targetId">Target ID:</label>
            <input
              type="text"
              id="targetId"
              name="targetId"
              value={filters.targetId}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="action">Action:</label>
            <input
              type="text"
              id="action"
              name="action"
              value={filters.action}
              onChange={handleInputChange}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="outcome">Outcome:</label>
            <select
              id="outcome"
              name="outcome"
              value={filters.outcome}
              onChange={handleInputChange}
            >
              <option value="">Any</option>
              <option value="success">Success</option>
              <option value="forbidden">Forbidden</option>
              <option value="validationError">Validation Error</option>
              <option value="notFound">Not Found</option>
              <option value="conflict">Conflict</option>
              <option value="error">Error</option>
            </select>
          </div>
          
          <div className="form-group">
            <label htmlFor="module">Module:</label>
            <select
              id="module"
              name="module"
              value={filters.module}
              onChange={handleInputChange}
            >
              <option value="">Any</option>
              <option value="membership">Membership</option>
              <option value="access-control">Access Control</option>
              <option value="shariah-review">Shariah Review</option>
            </select>
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="occurredFrom">Occurred From:</label>
            <input
              type="datetime-local"
              id="occurredFrom"
              name="occurredFrom"
              value={filters.occurredFrom}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="occurredTo">Occurred To:</label>
            <input
              type="datetime-local"
              id="occurredTo"
              name="occurredTo"
              value={filters.occurredTo}
              onChange={handleInputChange}
            />
          </div>
        </div>
        
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="route">Route:</label>
            <input
              type="text"
              id="route"
              name="route"
              value={filters.route}
              onChange={handleInputChange}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="method">Method:</label>
            <select
              id="method"
              name="method"
              value={filters.method}
              onChange={handleInputChange}
            >
              <option value="">Any</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="btn-primary" disabled={searchState === 'loading'}>
            {searchState === 'loading' ? 'Searching...' : 'Search Access History'}
          </button>
        </div>
      </form>
      
      {/* Validation Errors */}
      {searchState === 'validationError' && validationErrors.length > 0 && (
        <div className="validation-error-section">
          <h3>Validation Error</h3>
          <div className="error-message">
            <p>The following validation errors occurred:</p>
            <ul>
              {validationErrors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
          <p><strong>Note:</strong> Invalid query/filter must be shown as VALIDATION_ERROR, not empty result.</p>
        </div>
      )}
      
      {/* Forbidden State */}
      {searchState === 'forbidden' && (
        <div className="forbidden-section">
          <h3>Access Denied</h3>
          <div className="error-message">
            <p>{errorMessage || 'You do not have permission to access this resource.'}</p>
          </div>
          <p><strong>Note:</strong> Backend FORBIDDEN means auditor authorization failed or actor lacks access.</p>
        </div>
      )}
      
      {/* Error State */}
      {searchState === 'error' && (
        <div className="error-section">
          <h3>Error</h3>
          <div className="error-message">
            <p>{errorMessage || 'An unexpected error occurred while processing your request.'}</p>
          </div>
          <p><strong>Note:</strong> Safe generic error, no sensitive details.</p>
        </div>
      )}
      
      {/* Empty State */}
      {searchState === 'empty' && (
        <div className="empty-section">
          <h3>Search Results</h3>
          <div className="empty-message">
            <p>No access history events matched your search criteria.</p>
          </div>
          <p><strong>Note:</strong> Successful search with data.items = [].</p>
        </div>
      )}
      
      {/* Success With Results */}
      {searchState === 'successWithResults' && (
        <div className="result-section">
          <h2>Search Results</h2>
          <div className="results-summary">
            <p>Showing sample results. In a real implementation, this would display the results from calling:</p>
            <code>GET /api/v1/access-history</code> with the applied filters.
          </div>
          <div className="sample-results">
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
                  <td>user-456</td>
                  <td>viewShariahReviewHistory</td>
                  <td>shariahReview</td>
                  <td>forbidden</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p>
            Results would be ordered by <code>occurredAt</code> ascending, then <code>eventId</code> ascending.
          </p>
        </div>
      )}
      
      {/* Info Section */}
      <div className="info-section">
        <h2>About Access History Search</h2>
        <p>
          In a real implementation, this would display the results from calling:
          <br />
          <code>GET /api/v1/access-history</code> with the applied filters.
        </p>
        <p>
          Results would be ordered by <code>occurredAt</code> ascending, then <code>eventId</code> ascending.
        </p>
        <p>
          Empty results would be shown as success with <code>data.items = []</code>, not as an error.
        </p>
        <p><strong>Important:</strong> No fabricated access-event counts are shown.</p>
      </div>
    </div>
  );
};

export default AccessHistorySearchPage;
