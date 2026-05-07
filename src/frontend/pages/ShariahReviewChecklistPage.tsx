import { useState, type FormEvent } from 'react';
import { updateShariahReviewChecklist } from '../api/shariah-reviews';
import type {
  ChecklistEntry,
  ChecklistItemOutcome,
  ChecklistResponse,
  UpdateChecklistRequest
} from '../types/shariah-review';
import { BackendApiError, normalizeApiError } from '../api/errors';
import ErrorDisplay from '../components/ErrorDisplay';

// Form state type that uses string for evidenceRefs instead of string[]
type ChecklistEntryFormState = {
  itemCode: string;
  outcome: ChecklistItemOutcome;
  comment: string;
  evidenceRefsText: string;
};

function ShariahReviewChecklistPage() {
  // Form state
  const [reviewId, setReviewId] = useState('');
  
  // Use form state type instead of API type
  const [entries, setEntries] = useState<ChecklistEntryFormState[]>([
    {
      itemCode: '',
      outcome: 'pass',
      comment: '',
      evidenceRefsText: ''
    }
  ]);
  
  const [reviewerComment, setReviewerComment] = useState('');
  const [completeChecklist, setCompleteChecklist] = useState(false);
  
  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<BackendApiError | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<ChecklistResponse | null>(null);
  
  // Helper function to create empty entry
  const emptyEntry = (): ChecklistEntryFormState => ({
    itemCode: '',
    outcome: 'pass',
    comment: '',
    evidenceRefsText: ''
  });
  
  // Handle entry changes
  const handleEntryChange = (
    index: number,
    field: keyof ChecklistEntryFormState,
    value: string
  ) => {
    setEntries(previous =>
      previous.map((entry, entryIndex) =>
        entryIndex === index ? { ...entry, [field]: value } : entry
      )
    );
  };
  
  // Add a new entry row
  const addEntry = () => {
    setEntries([...entries, emptyEntry()]);
  };
  
  // Remove an entry row
  const removeEntry = (index: number) => {
    if (entries.length <= 1) {
      setEntries([emptyEntry()]);
      return;
    }
    
    const newEntries = [...entries];
    newEntries.splice(index, 1);
    setEntries(newEntries);
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Clear previous state
    setSubmitError(null);
    setSubmitSuccess(null);
    
    // Client-side validation
    if (!reviewId.trim()) {
      setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Review ID is required'));
      return;
    }
    
    if (entries.length === 0) {
      setSubmitError(new BackendApiError('VALIDATION_ERROR', 'At least one checklist entry is required'));
      return;
    }
    
    // Validate each entry
    for (const entry of entries) {
      if (!entry.itemCode.trim()) {
        setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Item code is required for all entries'));
        return;
      }
      
      if (!entry.outcome) {
        setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Outcome is required for all entries'));
        return;
      }
      
      if (entry.outcome === 'fail' && !entry.comment.trim()) {
        setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Comment is required when outcome is fail'));
        return;
      }
    }
    
    try {
      setSubmitting(true);
      
      // Transform form state entries to API DTO entries
      const checklistEntries: ChecklistEntry[] = entries.map(entry => {
        const evidenceRefs = entry.evidenceRefsText
          .split(',')
          .map(ref => ref.trim())
          .filter(ref => ref.length > 0);

        return {
          itemCode: entry.itemCode.trim(),
          outcome: entry.outcome,
          ...(entry.comment.trim() && { comment: entry.comment.trim() }),
          ...(evidenceRefs.length > 0 && { evidenceRefs })
        };
      });
      
      // Build payload
      const payload: UpdateChecklistRequest = {
        entries: checklistEntries,
        ...(reviewerComment.trim() && { reviewerComment: reviewerComment.trim() }),
        completeChecklist
      };
      
      // Call API
      const result = await updateShariahReviewChecklist(reviewId.trim(), payload);
      setSubmitSuccess(result);
      
      // Reset form (except reviewId to allow multiple submissions)
      setEntries([emptyEntry()]);
      setReviewerComment('');
      setCompleteChecklist(false);
    } catch (error) {
      setSubmitError(normalizeApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Shariah Review Checklist</h1>
      
      {/* Advisory notice for protected operations */}
      <div style={{
        border: '1px solid #f0ad4e',
        backgroundColor: '#fff8e5',
        padding: '1rem',
        margin: '1rem 0',
        borderRadius: '4px'
      }}>
        <p>
          <strong>Protected operation notice:</strong> Shariah checklist updates require a valid authenticated actor session. 
          The backend derives actor identity from trusted actor context before checking whether the actor has the coordinator role for the review organization. 
          If no actor context is available, the backend may return a validation error before coordinator authorization is evaluated. 
          Backend responses are shown below when an action is rejected.
        </p>
        <p style={{ fontSize: '0.9em', marginTop: '0.5rem', marginBottom: 0 }}>
          Local browser verification may show "Missing or invalid x-actor-id header" until the real auth/session path is implemented.
        </p>
      </div>
      
      {/* Success message */}
      {submitSuccess && (
        <div style={{ 
          border: '1px solid #00aa00', 
          backgroundColor: '#eeffee', 
          padding: '1rem', 
          margin: '1rem 0',
          borderRadius: '4px'
        }}>
          <h3>Success!</h3>
          <p>Checklist updated successfully.</p>
          <div>
            <p><strong>Review ID:</strong> {submitSuccess.reviewId}</p>
            <p><strong>Status:</strong> {submitSuccess.status}</p>
          </div>
        </div>
      )}
      
      {/* Error display */}
      <ErrorDisplay error={submitError} />
      
      {/* Checklist form */}
      <form onSubmit={handleSubmit} style={{ maxWidth: '800px' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Review ID *
          </label>
          <input
            type="text"
            value={reviewId}
            onChange={(e) => setReviewId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
            disabled={submitting}
          />
        </div>
        
        {/* Checklist entries */}
        <div style={{ marginBottom: '1rem' }}>
          <h3>Checklist Entries</h3>
          
          {entries.map((entry, index) => (
            <div 
              key={index} 
              style={{ 
                border: '1px solid #ddd', 
                padding: '1rem', 
                marginBottom: '1rem',
                borderRadius: '4px'
              }}
            >
              <h4>Entry #{index + 1}</h4>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Item Code *
                </label>
                <input
                  type="text"
                  value={entry.itemCode}
                  onChange={(e) => handleEntryChange(index, 'itemCode', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                  disabled={submitting}
                />
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Outcome *
                </label>
                <select
                  value={entry.outcome}
                  onChange={(e) => handleEntryChange(index, 'outcome', e.target.value as ChecklistItemOutcome)}
                  style={{ width: '100%', padding: '0.5rem' }}
                  disabled={submitting}
                >
                  <option value="pass">Pass</option>
                  <option value="fail">Fail</option>
                  <option value="notApplicable">Not Applicable</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Comment {entry.outcome === 'fail' ? '*' : ''}
                </label>
                <textarea
                  value={entry.comment}
                  onChange={(e) => handleEntryChange(index, 'comment', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem', minHeight: '60px' }}
                  disabled={submitting}
                  placeholder={entry.outcome === 'fail' ? 'Comment required for fail outcome' : 'Optional comment'}
                />
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Evidence References (comma-separated)
                </label>
                <input
                  type="text"
                  value={entry.evidenceRefsText}
                  onChange={(e) => handleEntryChange(index, 'evidenceRefsText', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                  disabled={submitting}
                  placeholder="e.g., ref1, ref2, ref3"
                />
              </div>
              
              <button
                type="button"
                onClick={() => removeEntry(index)}
                disabled={submitting}
                style={{ 
                  padding: '0.25rem 0.5rem',
                  backgroundColor: '#dc3545',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                Remove Entry
              </button>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addEntry}
            disabled={submitting}
            style={{ 
              padding: '0.5rem 1rem',
              backgroundColor: '#28a745',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            Add Checklist Entry
          </button>
        </div>
        
        {/* Reviewer comment */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Reviewer Comment
          </label>
          <textarea
            value={reviewerComment}
            onChange={(e) => setReviewerComment(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', minHeight: '80px' }}
            disabled={submitting}
          />
        </div>
        
        {/* Complete checklist checkbox */}
        <div style={{ marginBottom: '1rem' }}>
          <label>
            <input
              type="checkbox"
              checked={completeChecklist}
              onChange={(e) => setCompleteChecklist(e.target.checked)}
              disabled={submitting}
            />
            Mark checklist as complete
          </label>
        </div>
        
        <button
          type="submit"
          disabled={submitting}
          style={{ 
            padding: '0.5rem 1rem',
            backgroundColor: '#007bff',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: submitting ? 'not-allowed' : 'pointer'
          }}
        >
          {submitting ? 'Updating...' : 'Update Checklist'}
        </button>
      </form>
    </div>
  );
}

export default ShariahReviewChecklistPage;
