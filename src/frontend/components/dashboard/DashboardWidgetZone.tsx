import React from 'react';
import { DashboardWidgetZone as DashboardWidgetZoneType, DashboardWidget } from '../../types/dashboard';

interface DashboardWidgetZoneProps {
  zone: DashboardWidgetZoneType;
  widgets: DashboardWidget[];
}

const DashboardWidgetZone: React.FC<DashboardWidgetZoneProps> = ({ zone, widgets }) => {
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
