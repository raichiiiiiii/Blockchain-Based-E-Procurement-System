import React from 'react';

const SecurityInvestigationPlaceholderPage: React.FC = () => {
  return (
    <div className="page-container">
      <h1>Security Investigation</h1>
      <div className="placeholder-content">
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
      </div>
    </div>
  );
};

export default SecurityInvestigationPlaceholderPage;
