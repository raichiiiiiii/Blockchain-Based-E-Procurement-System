import type { BackendApiError } from '../api/errors';

type ErrorDisplayProps = {
  error?: BackendApiError | null;
};

function ErrorDisplay({ error }: ErrorDisplayProps) {
  if (!error) {
    return null;
  }

  return (
    <div style={{ 
      border: '1px solid #ff0000', 
      backgroundColor: '#ffeeee', 
      padding: '1rem', 
      margin: '1rem 0',
      borderRadius: '4px'
    }}>
      <h3>Error ({error.code})</h3>
      <p>{error.message}</p>
      {error.issues && error.issues.length > 0 && (
        <div>
          <h4>Details:</h4>
          <ul>
            {error.issues.map((issue, index) => (
              <li key={index}>{String(issue)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default ErrorDisplay;
