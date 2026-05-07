import { useState, type FormEvent } from 'react';
import { recordShariahReviewDecision } from '../api/shariah-reviews';
import type {
  ShariahDecisionOutcome,
  ShariahDecisionCondition,
  RecordShariahDecisionRequest,
  ShariahDecisionResponse
} from '../types/shariah-review';
import { BackendApiError, normalizeApiError } from '../api/errors';
import ErrorDisplay from '../components/ErrorDisplay';

function ShariahReviewDecisionPage() {
  // Form state
  const [reviewId, setReviewId] = useState('');
  const [outcome, setOutcome] = useState<ShariahDecisionOutcome>('approved');
  const [rationale, setRationale] = useState('');
  const [conditions, setConditions] = useState<ShariahDecisionCondition[]>([
    { description: '', dueDate: '' }
  ]);
  
  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<BackendApiError | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<ShariahDecisionResponse | null>(null);
  
  // Handle condition changes
  const handleConditionChange = (index: number, field: keyof ShariahDecisionCondition, value: string) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], [field]: value };
    setConditions(newConditions);
  };
  
  // Add a new condition row
  const addCondition = () => {
    setConditions([...conditions, { description: '', dueDate: '' }]);
  };
  
  // Remove a condition row
  const removeCondition = (index: number) => {
    if (conditions.length <= 1) {
      setConditions([{ description: '', dueDate: '' }]);
      return;
    }
    
    const newConditions = [...conditions];
    newConditions.splice(index, 1);
    setConditions(newConditions);
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
    
    if (!outcome) {
      setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Decision outcome is required'));
      return;
    }
    
    if (!rationale.trim()) {
      setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Rationale is required'));
      return;
    }
    
    // Validate conditions for conditional approval
    if (outcome === 'conditionalApproved') {
      if (conditions.length === 0) {
        setSubmitError(new BackendApiError('VALIDATION_ERROR', 'At least one condition is required for conditional approval'));
        return;
      }
      
      for (const condition of conditions) {
        if (!condition.description.trim()) {
          setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Condition description is required'));
          return;
        }
        
        if (!condition.dueDate.trim()) {
          setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Condition due date is required'));
          return;
        }
      }
    }
    
    try {
      setSubmitting(true);
      
      // Build payload
      const payload: RecordShariahDecisionRequest = {
        outcome,
        rationale: rationale.trim()
      };
      
      // Add conditions only for conditional approval
      if (outcome === 'conditionalApproved') {
        payload.conditions = conditions.map(condition => ({
          description: condition.description.trim(),
          dueDate: condition.dueDate.trim()
        })).filter(condition => 
          condition.description.length > 0 && condition.dueDate.length > 0
        );
      }
      
      // Call API
      const result = await recordShariahReviewDecision(reviewId.trim(), payload);
      setSubmitSuccess(result);
      
      // Reset form (except reviewId to allow multiple submissions)
      setOutcome('approved');
      setRationale('');
      setConditions([{ description: '', dueDate: '' }]);
    } catch (error) {
      setSubmitError(normalizeApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Shariah Review Decision</h1>
      
      {/* Advisory notice for protected operations */}
      <div style={{
        border: '1px solid #f0ad4e',
        backgroundColor: '#fff8e5',
        padding: '1rem',
        margin: '1rem 0',
        borderRadius: '4px'
      }}>
        <p>
          <strong>Protected operation notice:</strong> Shariah decision recording requires a valid authenticated actor session. 
          The backend derives actor identity from trusted actor context before checking whether the actor has the coordinator role for the review organization. 
          If no actor context is available, the backend may return a validation error before coordinator authorization is evaluated. 
          Backend responses are shown below when an action is rejected.
        </p>
        <p style={{ fontSize: '0.9em', marginTop: '0.5rem', marginBottom: '0.5rem' }}>
          <strong>Workflow prerequisite:</strong> a decision can only be recorded after the review checklist is complete.
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
          <p>Decision recorded successfully.</p>
          <div>
            <p><strong>Review ID:</strong> {submitSuccess.reviewId}</p>
            <p><strong>Status:</strong> {submitSuccess.status}</p>
            <p><strong>Decided At:</strong> {submitSuccess.decidedAt}</p>
          </div>
        </div>
      )}
      
      {/* Error display */}
      <ErrorDisplay error={submitError} />
      
      {/* Decision form */}
      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
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
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Decision Outcome *
          </label>
          <select
            value={outcome}
            onChange={(e) => setOutcome(e.target.value as ShariahDecisionOutcome)}
            style={{ width: '100%', padding: '0.5rem' }}
            disabled={submitting}
          >
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="conditionalApproved">Conditionally Approved</option>
          </select>
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Rationale *
          </label>
          <textarea
            value={rationale}
            onChange={(e) => setRationale(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', minHeight: '100px' }}
            disabled={submitting}
            placeholder="Provide rationale for the decision"
          />
        </div>
        
        {/* Conditions section - only shown for conditional approval */}
        {outcome === 'conditionalApproved' && (
          <div style={{ marginBottom: '1rem' }}>
            <h3>Conditions</h3>
            <p style={{ fontSize: '0.9em', fontStyle: 'italic', marginBottom: '1rem' }}>
              At least one condition is required for conditional approval
            </p>
            
            {conditions.map((condition, index) => (
              <div 
                key={index} 
                style={{ 
                  border: '1px solid #ddd', 
                  padding: '1rem', 
                  marginBottom: '1rem',
                  borderRadius: '4px'
                }}
              >
                <h4>Condition #{index + 1}</h4>
                
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Description *
                  </label>
                  <textarea
                    value={condition.description}
                    onChange={(e) => handleConditionChange(index, 'description', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', minHeight: '60px' }}
                    disabled={submitting}
                    placeholder="Describe the condition"
                  />
                </div>
                
                <div style={{ marginBottom: '0.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={condition.dueDate}
                    onChange={(e) => handleConditionChange(index, 'dueDate', e.target.value)}
                    style={{ width: '100%', padding: '0.5rem' }}
                    disabled={submitting}
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => removeCondition(index)}
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
                  Remove Condition
                </button>
              </div>
            ))}
            
            <button
              type="button"
              onClick={addCondition}
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
              Add Condition
            </button>
          </div>
        )}
        
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
          {submitting ? 'Recording...' : 'Record Decision'}
        </button>
      </form>
    </div>
  );
}

export default ShariahReviewDecisionPage;
