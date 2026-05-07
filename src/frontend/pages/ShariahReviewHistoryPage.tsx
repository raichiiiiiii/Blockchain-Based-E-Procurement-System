import { useState, type FormEvent } from 'react';
import { getShariahReviewHistory } from '../api/shariah-reviews';
import type {
  ShariahReviewHistoryResponse,
  ShariahReviewStatusHistoryEntry
} from '../types/shariah-review';
import { BackendApiError, normalizeApiError } from '../api/errors';
import ErrorDisplay from '../components/ErrorDisplay';

function ShariahReviewHistoryPage() {
  // Form state
  const [reviewId, setReviewId] = useState('');
  
  // Fetch state
  const [fetching, setFetching] = useState(false);
  const [historyError, setHistoryError] = useState<BackendApiError | null>(null);
  const [historyData, setHistoryData] = useState<ShariahReviewHistoryResponse | null>(null);
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Clear previous state
    setHistoryError(null);
    setHistoryData(null);
    
    // Client-side validation
    if (!reviewId.trim()) {
      setHistoryError(new BackendApiError('VALIDATION_ERROR', 'Review ID is required'));
      return;
    }
    
    try {
      setFetching(true);
      
      // Call API
      const result = await getShariahReviewHistory(reviewId.trim());
      setHistoryData(result);
    } catch (error) {
      setHistoryError(normalizeApiError(error));
    } finally {
      setFetching(false);
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Shariah Review History</h1>
      
      {/* Advisory notice for protected operations */}
      <div style={{
        border: '1px solid #f0ad4e',
        backgroundColor: '#fff8e5',
        padding: '1rem',
        margin: '1rem 0',
        borderRadius: '4px'
      }}>
        <p>
          <strong>Protected read notice:</strong> Shariah review history access requires a valid authenticated actor session. 
          The backend derives actor identity from trusted actor context before checking whether the actor may view the review history. 
          If no actor context is available, the backend may return a validation error before read authorization is evaluated. 
          Backend responses are shown below when access is rejected.
        </p>
        <p style={{ fontSize: '0.9em', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          History reads may be audit-logged by the backend. Internal audit metadata is not displayed here.
        </p>
        <p style={{ fontSize: '0.9em', marginTop: '0.5rem', marginBottom: 0 }}>
          Local browser verification may show "Missing or invalid x-actor-id header" until the real auth/session path is implemented.
        </p>
      </div>
      
      {/* Error display */}
      <ErrorDisplay error={historyError} />
      
      {/* History form */}
      <form onSubmit={handleSubmit} style={{ maxWidth: '600px', marginBottom: '2rem' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Review ID *
          </label>
          <input
            type="text"
            value={reviewId}
            onChange={(e) => setReviewId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
            disabled={fetching}
          />
        </div>
        
        <button
          type="submit"
          disabled={fetching}
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: fetching ? 'not-allowed' : 'pointer'
          }}
        >
          {fetching ? 'Fetching...' : 'Fetch History'}
        </button>
      </form>
      
      {/* History display */}
      {historyData && (
        <div style={{ 
          border: '1px solid #ddd', 
          padding: '1rem', 
          borderRadius: '4px'
        }}>
          <h2>Review Information</h2>
          <div style={{ marginBottom: '1rem' }}>
            <p><strong>Review ID:</strong> {historyData.reviewId}</p>
            <p><strong>Organization ID:</strong> {historyData.organizationId}</p>
            <p><strong>Current Status:</strong> {historyData.currentStatus}</p>
          </div>
          
          <h2>History</h2>
          {historyData.history.length === 0 ? (
            <p>No status history entries are available for this review.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'left' }}>Action</th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'left' }}>From Status</th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'left' }}>To Status</th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'left' }}>Performed At</th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'left' }}>Performed By</th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'left' }}>Notes</th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'left' }}>Rationale</th>
                    <th style={{ border: '1px solid #ddd', padding: '0.5rem', textAlign: 'left' }}>Conditions</th>
                  </tr>
                </thead>
                <tbody>
                  {historyData.history.map((entry: ShariahReviewStatusHistoryEntry, index: number) => (
                    <tr key={index}>
                      <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{entry.action}</td>
                      <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                        {entry.fromStatus ?? '—'}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{entry.toStatus}</td>
                      <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                        {formatDate(entry.performedAt)}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{entry.performedByUserId}</td>
                      <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                        {entry.notes || '—'}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                        {entry.rationale || '—'}
                      </td>
                      <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                        {entry.conditions && entry.conditions.length > 0 ? (
                          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
                            {entry.conditions.map((condition, condIndex) => (
                              <li key={condIndex}>
                                {condition.description} — {condition.dueDate}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ShariahReviewHistoryPage;
