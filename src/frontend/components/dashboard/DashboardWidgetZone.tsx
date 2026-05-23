import React from 'react';
import { DashboardWidgetZone as DashboardWidgetZoneType, DashboardWidget } from '../../types/dashboard';

interface DashboardWidgetZoneProps {
  zone: DashboardWidgetZoneType;
  widgets: DashboardWidget[];
  onPageChange: (target: string) => void;
}

const DashboardWidgetZone: React.FC<DashboardWidgetZoneProps> = ({ zone, widgets, onPageChange }) => {
  // Special rendering for the alerts zone with authorization boundary message
  if (zone.id === 'alerts') {
    return (
      <section className={`widget-zone widget-zone-${zone.id}`}>
        <header>
          <h2>{zone.label}</h2>
          <p className="zone-purpose">{zone.purpose}</p>
        </header>

        <div className="widgets">
          {widgets.length > 0 ? (
            widgets.map(widget => (
              <div key={widget.id} className={`widget widget-${widget.status}`}>
                <h3>{widget.title}</h3>
                {widget.id === 'admin-access-boundary-alert' ? (
                  <div className="widget-content">
                    <p><strong>Backend authorization remains authoritative.</strong></p>
                    <p>Frontend role visibility does not grant backend admin privileges.</p>
                  </div>
                ) : widget.id === 'compliance-blocked-state-alert' ? (
                  <div className="widget-content">
                    <p><strong>Compliance dashboard visibility is not backend authorization.</strong></p>
                    <p>Backend authorization and governed workflow state remain authoritative.</p>
                    <p>Forbidden backend outcomes must remain visible as blocked actions, not frontend success.</p>
                  </div>
                ) : widget.id === 'shariah-review-boundary-alert' ? (
                  <div className="widget-content">
                    <p><strong>Review dashboard visibility is not backend authorization.</strong></p>
                    <p>Checklist and decision actions remain governed by backend state and actor context.</p>
                    <p>Backend FORBIDDEN and VALIDATION_ERROR responses remain authoritative.</p>
                  </div>
                ) : widget.id === 'auditor-investigation-boundary-alert' ? (
                  <div className="widget-content">
                    <p><strong>Investigation dashboard visibility is not backend authorization.</strong></p>
                    <p>Access-history payloads, evidence fields, ordering, and completeness semantics remain governed by the backend access-history contracts.</p>
                  </div>
                ) : widget.id === 'security-investigation-boundary-alert' ? (
                  <div className="widget-content">
                    <p><strong>Security dashboard visibility does not grant access-history API permission.</strong></p>
                    <p>Auditor-only backend contracts remain authoritative until an approved security investigation contract exists.</p>
                  </div>
                ) : widget.status === 'placeholder' ? (
                  <div className="widget-placeholder">
                    <p>This is a placeholder widget for {widget.title.toLowerCase()}.</p>
                    <p>Functionality will be implemented in future stories.</p>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="zone-empty">
              <p>{zone.emptyState.message}</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Special rendering for the actions zone with navigation buttons
  if (zone.id === 'actions') {
    return (
      <section className={`widget-zone widget-zone-${zone.id}`}>
        <header>
          <h2>{zone.label}</h2>
          <p className="zone-purpose">{zone.purpose}</p>
        </header>

        <div className="widgets">
          {widgets.length > 0 ? (
            widgets.map(widget => (
              <div key={widget.id} className={`widget widget-${widget.status}`}>
                <h3>{widget.title}</h3>
                {widget.status === 'active' && !widget.placeholder ? (
                  <div className="widget-content">
                    {widget.id === 'shariah-decision-overview' && (
                      <div className="widget-status-note">
                        <p>Decision recording is a governed workflow entry point.</p>
                        <p>Final decisions are valid only from <strong>checklistComplete</strong>.</p>
                        <p><strong>submitted</strong> and <strong>checklistInProgress</strong> reviews cannot directly record a final decision.</p>
                        <p>Backend VALIDATION_ERROR remains authoritative if workflow state rules fail.</p>
                      </div>
                    )}
                    <button 
                      className="action-button"
                      onClick={() => {
                        // Map widget IDs to target pages
                        switch (widget.id) {
                          case 'admin-member-onboarding-action':
                            onPageChange('member-onboarding');
                            break;
                          case 'admin-role-management-action':
                            onPageChange('role-management');
                            break;
                          case 'admin-role-assignment-action':
                            onPageChange('role-assignment');
                            break;
                          case 'shariah-decision-overview':
                            onPageChange('shariah-decisions');
                            break;
                          default:
                            return;
                        }
                      }}
                    >
                      Go to {widget.title}
                    </button>
                  </div>
                ) : widget.status === 'placeholder' ? (
                  <div className="widget-placeholder">
                    <p>This is a placeholder widget for {widget.title.toLowerCase()}.</p>
                    <p>Functionality will be implemented in future stories.</p>
                    {widget.id === 'compliance-kyc-queue-overview' && (
                      <>
                        <p>KYC queue workflow is contract-pending. No queue count is available.</p>
                        <button 
                          className="action-button"
                          onClick={() => onPageChange('kyc-queue')}
                        >
                          View KYC Queue (Unavailable)
                        </button>
                      </>
                    )}
                    {widget.id === 'compliance-aml-review-overview' && (
                      <>
                        <p>AML review workflow is contract-pending. No review count is available.</p>
                        <button 
                          className="action-button"
                          onClick={() => onPageChange('aml-reviews')}
                        >
                          View AML Reviews (Unavailable)
                        </button>
                      </>
                    )}
                    {widget.id === 'compliance-onboarding-status-overview' && (
                      <>
                        <p>Onboarding status review is contract-pending. No blocked or flagged count is available.</p>
                        <button 
                          className="action-button"
                          onClick={() => onPageChange('onboarding-status')}
                        >
                          View Onboarding Status (Unavailable)
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="zone-empty">
              <p>{zone.emptyState.message}</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Special rendering for the primary zone with descriptive content
  if (zone.id === 'primary') {
    return (
      <section className={`widget-zone widget-zone-${zone.id}`}>
        <header>
          <h2>{zone.label}</h2>
          <p className="zone-purpose">{zone.purpose}</p>
        </header>

        <div className="widgets">
          {widgets.length > 0 ? (
            widgets.map(widget => (
              <div key={widget.id} className={`widget widget-${widget.status}`}>
                <h3>{widget.title}</h3>
                {widget.status === 'active' && !widget.placeholder ? (
                  <div className="widget-content">
                    {widget.id === 'admin-membership-overview' && (
                      <p>Process new member organization registrations and begin onboarding workflows.</p>
                    )}
                    {widget.id === 'admin-role-catalog-overview' && (
                      <p>Define and manage role definitions, permissions, and organizational access policies.</p>
                    )}
                    {widget.id === 'admin-role-assignment-overview' && (
                      <p>Assign roles to users within organizations and manage active assignments.</p>
                    )}
                    {widget.id === 'shariah-review-submission-overview' && (
                      <p>Submit new Shariah review requests for products or services requiring compliance assessment. Protected writes remain backend-authorized.</p>
                    )}
                    {widget.id === 'shariah-checklist-overview' && (
                      <div className="widget-status-note">
                        <p>Complete Shariah compliance checklists for submitted reviews.</p>
                        <p>Checklist completion depends on mandatory item, comment, and evidence rules.</p>
                        <p>Completion failures must surface validation errors, not frontend success.</p>
                      </div>
                    )}
                    {widget.id === 'auditor-access-history-search-overview' && (
                      <div className="widget-content">
                        <p>Search access history events using various filters.</p>
                        <button 
                          className="action-button"
                          onClick={() => onPageChange('access-history-search')}
                        >
                          Open Access History Search
                        </button>
                      </div>
                    )}
                    {widget.id === 'auditor-event-detail-overview' && (
                      <div className="widget-content">
                        <p>Inspect individual audit event evidence and details.</p>
                        <button 
                          className="action-button"
                          onClick={() => onPageChange('access-event-detail')}
                        >
                          Open Event Detail
                        </button>
                      </div>
                    )}
                    {widget.id === 'security-investigation-placeholder' && (
                      <div className="widget-content">
                        <p>Security investigation functionality is contract-pending.</p>
                        <p>Current access-history APIs require auditor backend authorization.</p>
                        <p>Security dashboard visibility does not grant access-history API permission.</p>
                        <p>No fake results or metrics are shown.</p>
                        <button 
                          className="action-button"
                          onClick={() => onPageChange('security-investigation')}
                        >
                          View Security Investigation (Unavailable)
                        </button>
                      </div>
                    )}
                    {(widget.id === 'admin-membership-overview' ||
                      widget.id === 'admin-role-catalog-overview' ||
                      widget.id === 'admin-role-assignment-overview' ||
                      widget.id === 'shariah-review-submission-overview' ||
                      widget.id === 'shariah-checklist-overview') && (
                      <button 
                        className="action-button"
                        onClick={() => {
                          // Map widget IDs to target pages
                          switch (widget.id) {
                            case 'admin-membership-overview':
                              onPageChange('member-onboarding');
                              break;
                            case 'admin-role-catalog-overview':
                              onPageChange('role-management');
                              break;
                            case 'admin-role-assignment-overview':
                              onPageChange('role-assignment');
                              break;
                            case 'shariah-review-submission-overview':
                              onPageChange('shariah-reviews');
                              break;
                            case 'shariah-checklist-overview':
                              onPageChange('shariah-checklists');
                              break;
                            default:
                              return;
                          }
                        }}
                      >
                        Open {widget.title}
                      </button>
                    )}
                  </div>
                ) : widget.status === 'placeholder' ? (
                  <div className="widget-placeholder">
                    <p>This is a placeholder widget for {widget.title.toLowerCase()}.</p>
                    <p>Functionality will be implemented in future stories.</p>
                    {widget.id === 'compliance-kyc-queue-overview' && (
                      <>
                        <p>KYC queue workflow is contract-pending. Missing data is unavailable, not zero.</p>
                        <button 
                          className="action-button"
                          onClick={() => onPageChange('kyc-queue')}
                        >
                          View KYC Queue (Unavailable)
                        </button>
                      </>
                    )}
                    {widget.id === 'compliance-aml-review-overview' && (
                      <>
                        <p>AML review workflow is contract-pending. Missing data is unavailable, not zero.</p>
                        <button 
                          className="action-button"
                          onClick={() => onPageChange('aml-reviews')}
                        >
                          View AML Reviews (Unavailable)
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="zone-empty">
              <p>{zone.emptyState.message}</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Special rendering for the summary zone
  if (zone.id === 'summary') {
    return (
      <section className={`widget-zone widget-zone-${zone.id}`}>
        <header>
          <h2>{zone.label}</h2>
          <p className="zone-purpose">{zone.purpose}</p>
        </header>

        <div className="widgets">
          {widgets.length > 0 ? (
            widgets.map(widget => (
              <div key={widget.id} className={`widget widget-${widget.status}`}>
                <h3>{widget.title}</h3>
                {widget.status === 'active' && !widget.placeholder ? (
                  <div className="widget-content">
                    {widget.id === 'compliance-onboarding-status-overview' && (
                      <p>View onboarding status and compliance review progress for member organizations.</p>
                    )}
                    <button 
                      className="action-button"
                      onClick={() => {
                        switch (widget.id) {
                          case 'compliance-onboarding-status-overview':
                            onPageChange('onboarding-status');
                            break;
                          default:
                            return;
                        }
                      }}
                    >
                      View {widget.title}
                    </button>
                  </div>
                ) : widget.status === 'placeholder' ? (
                  <div className="widget-placeholder">
                    <p>This is a placeholder widget for {widget.title.toLowerCase()}.</p>
                    <p>Functionality will be implemented in future stories.</p>
                    {widget.id === 'compliance-onboarding-status-overview' && (
                      <>
                        <p>Onboarding eligibility checks are contract-pending. Missing blocked or flagged data is unavailable, not zero.</p>
                        <button 
                          className="action-button"
                          onClick={() => onPageChange('onboarding-status')}
                        >
                          View Onboarding Status (Unavailable)
                        </button>
                      </>
                    )}
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="zone-empty">
              <p>{zone.emptyState.message}</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Special rendering for the secondary zone with member management placeholder and shariah history
  if (zone.id === 'secondary') {
    return (
      <section className={`widget-zone widget-zone-${zone.id}`}>
        <header>
          <h2>{zone.label}</h2>
          <p className="zone-purpose">{zone.purpose}</p>
        </header>

        <div className="widgets">
          {widgets.length > 0 ? (
            widgets.map(widget => (
              <div key={widget.id} className={`widget widget-${widget.status}`}>
                <h3>{widget.title}</h3>
                {widget.id === 'admin-member-management-placeholder' ? (
                  <div className="widget-placeholder">
                    <p>Member management functionality is not yet implemented.</p>
                    <p>This area will provide tools for managing existing member organizations.</p>
                    <button 
                      className="action-button"
                      onClick={() => onPageChange('member-management')}
                    >
                      View Member Management (Unavailable)
                    </button>
                  </div>
                ) : widget.id === 'shariah-history-overview' && widget.status === 'active' && !widget.placeholder ? (
                  <div className="widget-content">
                    <p>View the complete history and status progression for Shariah reviews.</p>
                    <p>Intermediate histories are valid and must not be treated as errors.</p>
                    <p>Absence of a final decision is not an error condition.</p>
                    <button 
                      className="action-button"
                      onClick={() => onPageChange('shariah-history')}
                    >
                      View {widget.title}
                    </button>
                  </div>
                ) : widget.status === 'placeholder' ? (
                  <div className="widget-placeholder">
                    <p>This is a placeholder widget for {widget.title.toLowerCase()}.</p>
                    <p>Functionality will be implemented in future stories.</p>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="zone-empty">
              <p>{zone.emptyState.message}</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Special rendering for the investigation zone
  if (zone.id === 'investigation') {
    return (
      <section className={`widget-zone widget-zone-${zone.id}`}>
        <header>
          <h2>{zone.label}</h2>
          <p className="zone-purpose">{zone.purpose}</p>
        </header>

        <div className="widgets">
          {widgets.length > 0 ? (
            widgets.map(widget => (
              <div key={widget.id} className={`widget widget-${widget.status}`}>
                <h3>{widget.title}</h3>
                {widget.id === 'auditor-event-sequence-overview' && widget.status === 'active' && !widget.placeholder ? (
                  <div className="widget-content">
                    <p>Inspect actor or target chronological sequences.</p>
                    <p>Completeness metadata must be shown when present.</p>
                    <button 
                      className="action-button"
                      onClick={() => onPageChange('access-event-sequence')}
                    >
                      Open Event Sequence
                    </button>
                  </div>
                ) : widget.status === 'placeholder' ? (
                  <div className="widget-placeholder">
                    <p>This is a placeholder widget for {widget.title.toLowerCase()}.</p>
                    <p>Functionality will be implemented in future stories.</p>
                  </div>
                ) : null}
              </div>
            ))
          ) : (
            <div className="zone-empty">
              <p>{zone.emptyState.message}</p>
            </div>
          )}
        </div>
      </section>
    );
  }

  // Default rendering for other zones
  return (
    <section className={`widget-zone widget-zone-${zone.id}`}>
      <header>
        <h2>{zone.label}</h2>
        <p className="zone-purpose">{zone.purpose}</p>
      </header>

      <div className="widgets">
        {widgets.length > 0 ? (
          widgets.map(widget => (
            <div key={widget.id} className={`widget widget-${widget.status}`}>
              <h3>{widget.title}</h3>
              {widget.status === 'placeholder' && (
                <div className="widget-placeholder">
                  <p>This is a placeholder widget for {widget.title.toLowerCase()}.</p>
                  <p>Functionality will be implemented in future stories.</p>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="zone-empty">
            <p>{zone.emptyState.message}</p>
          </div>
        )}
      </div>
    </section>
  );
};

export default DashboardWidgetZone;
