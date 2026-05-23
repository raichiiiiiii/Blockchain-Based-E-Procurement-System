import React from 'react';
import { DashboardWidgetZone as DashboardWidgetZoneType, DashboardWidget } from '../../types/dashboard';

interface DashboardWidgetZoneProps {
  zone: DashboardWidgetZoneType;
  widgets: DashboardWidget[];
}

const DashboardWidgetZone: React.FC<DashboardWidgetZoneProps> = ({ zone, widgets }) => {
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
                {widget.id === 'admin-authorization-alert' ? (
                  <div className="widget-content">
                    <p><strong>Backend authorization remains authoritative.</strong></p>
                    <p>Frontend role visibility does not grant backend admin privileges.</p>
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
                    <button 
                      className="action-button"
                      onClick={() => {
                        // Map widget IDs to target pages
                        let target = '';
                        switch (widget.id) {
                          case 'admin-member-onboarding-action':
                            target = 'member-onboarding';
                            break;
                          case 'admin-role-management-action':
                            target = 'role-management';
                            break;
                          case 'admin-role-assignment-action':
                            target = 'role-assignment';
                            break;
                          default:
                            return;
                        }
                        // In a real implementation, this would trigger navigation
                        console.log(`Navigate to ${target}`);
                      }}
                    >
                      Go to {widget.title}
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
                    {widget.id === 'admin-member-onboarding-widget' && (
                      <p>Process new member organization registrations and begin onboarding workflows.</p>
                    )}
                    {widget.id === 'admin-role-management-widget' && (
                      <p>Define and manage role definitions, permissions, and organizational access policies.</p>
                    )}
                    {widget.id === 'admin-role-assignment-widget' && (
                      <p>Assign roles to users within organizations and manage active assignments.</p>
                    )}
                    <button 
                      className="action-button"
                      onClick={() => {
                        // Map widget IDs to target pages
                        let target = '';
                        switch (widget.id) {
                          case 'admin-member-onboarding-widget':
                            target = 'member-onboarding';
                            break;
                          case 'admin-role-management-widget':
                            target = 'role-management';
                            break;
                          case 'admin-role-assignment-widget':
                            target = 'role-assignment';
                            break;
                          default:
                            return;
                        }
                        // In a real implementation, this would trigger navigation
                        console.log(`Navigate to ${target}`);
                      }}
                    >
                      Open {widget.title}
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

  // Special rendering for the secondary zone with member management placeholder
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
