import React from 'react';

const SecurityInvestigationPlaceholderPage: React.FC = () => {
  return (
    <div className="page-container">
      <h1>Security Investigation</h1>
      <div className="placeholder-content">
        <div className="status-banner unavailable">
          <h2>Unavailable / Contract Pending</h2>
          <p>This functionality is currently unavailable as it is still under development.</p>
        </div>
        
        <div className="explanation-section">
          <h3>Current Status</h3>
          <p>
            <strong>Security investigation functionality is contract-pending.</strong>
          </p>
          <p>
            Current access-history APIs require <code>auditor</code> backend authorization.
          </p>
          <p>
            This placeholder ensures security operators can see that investigation capabilities exist
            conceptually, but are not yet available for use.
          </p>
        </div>
        
        <div className="note-box">
          <h3>Important Notes:</h3>
          <ul>
            <li>Security dashboard visibility does not grant access-history API permission.</li>
            <li>Auditor-only backend contracts remain authoritative until an approved security investigation contract exists.</li>
            <li>No fake results or metrics are shown here.</li>
            <li>This page does not bypass <code>resolveDashboardTargetAccess(...)</code>.</li>
          </ul>
        </div>
        
        <div className="boundary-warning">
          <h3>Authorization Boundary:</h3>
          <p>
            Investigation dashboard visibility is not backend authorization.
            Access-history payloads, evidence fields, ordering, and completeness semantics
            remain governed by the backend access-history contracts.
          </p>
        </div>
        
        <div className="restriction-note">
          <h3>Restrictions:</h3>
          <ul>
            <li>No fake results, metrics, incidents, alerts, or event data are shown.</li>
            <li>Backend contracts remain authoritative at all times.</li>
            <li>Security operators are not granted auditor-only API permissions.</li>
            <li>All access remains subject to backend authorization checks.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SecurityInvestigationPlaceholderPage;
