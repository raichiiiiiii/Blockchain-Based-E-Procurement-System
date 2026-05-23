import React, { useState } from 'react';

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real implementation, this would call the API
    console.log('Search filters:', filters);
    alert('In a real implementation, this would call GET /api/v1/access-history with these filters');
  };

  return (
    <div className="page-container">
      <h1>Access History Search</h1>
      <p>Search access history events using the supported filters from the contract.</p>
      
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
          <button type="submit" className="btn-primary">
            Search Access History
          </button>
        </div>
      </form>
      
      <div className="result-section">
        <h2>Results</h2>
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
      </div>
    </div>
  );
};

export default AccessHistorySearchPage;
