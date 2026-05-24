import React from 'react';

interface DashboardStateMessageProps {
  state: 'noRole' | 'unsupportedRole' | 'forbidden' | 'loading' | 'error';
  message?: string;
}

const DashboardStateMessage: React.FC<DashboardStateMessageProps> = ({ state, message }) => {
  const getStateContent = () => {
    switch (state) {
      case 'noRole':
        return {
          title: 'No Role Assigned',
          message: message || 'You don\'t have any roles assigned to your account. Please contact your administrator.'
        };
      case 'unsupportedRole':
        return {
          title: 'Unsupported Role',
          message: message || 'Your assigned roles are not supported by the dashboard. Please contact your administrator.'
        };
      case 'forbidden':
        return {
          title: 'Access Denied',
          message: message || 'Access is blocked in the dashboard shell. Backend authorization remains authoritative for protected actions.'
        };
      case 'loading':
        return {
          title: 'Loading',
          message: message || 'Dashboard is loading...'
        };
      case 'error':
        return {
          title: 'Error',
          message: message || 'An error occurred while loading the dashboard.'
        };
      default:
        return {
          title: 'Unknown State',
          message: 'An unknown error occurred.'
        };
    }
  };

  const content = getStateContent();

  return (
    <div className={`dashboard-state-message dashboard-state-${state}`}>
      <div className="state-content">
        <h2>{content.title}</h2>
        <p>{content.message}</p>
      </div>
    </div>
  );
};

export default DashboardStateMessage;
