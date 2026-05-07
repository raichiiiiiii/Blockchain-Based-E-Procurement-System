import { useState, type FormEvent } from 'react';
import { submitShariahReview } from '../api/shariah-reviews';
import type { SubmitShariahReviewRequest, ShariahReviewReference, ShariahReviewResponse } from '../types/shariah-review';
import { BackendApiError, normalizeApiError } from '../api/errors';
import ErrorDisplay from '../components/ErrorDisplay';

function ShariahReviewSubmissionPage() {
  // Form state
  const [organizationId, setOrganizationId] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  
  // Reference state
  const [references, setReferences] = useState<ShariahReviewReference[]>([
    { type: '', name: '', uri: '', description: '', mediaType: '' }
  ]);
  
  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<BackendApiError | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<ShariahReviewResponse | null>(null);
  
  // Handle reference changes
  const handleReferenceChange = (index: number, field: keyof ShariahReviewReference, value: string) => {
    const newReferences = [...references];
    newReferences[index] = { ...newReferences[index], [field]: value };
    setReferences(newReferences);
  };
  
  // Add a new reference row
  const addReference = () => {
    setReferences([...references, { type: '', name: '', uri: '', description: '', mediaType: '' }]);
  };
  
  // Remove a reference row
  const removeReference = (index: number) => {
    if (references.length <= 1) {
      setReferences([{ type: '', name: '', uri: '', description: '', mediaType: '' }]);
      return;
    }
    
    const newReferences = [...references];
    newReferences.splice(index, 1);
    setReferences(newReferences);
  };
  
  // Handle form submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Clear previous state
    setSubmitError(null);
    setSubmitSuccess(null);
    
    // Client-side validation
    if (!organizationId.trim()) {
      setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Organization ID is required'));
      return;
    }
    
    if (!title.trim()) {
      setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Title is required'));
      return;
    }
    
    if (!summary.trim()) {
      setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Summary is required'));
      return;
    }
    
    // Filter out empty references
    const filteredReferences = references.filter(ref => 
      ref.type.trim() || ref.name.trim() || ref.uri.trim() || ref.description.trim() || ref.mediaType.trim()
    );
    
    try {
      setSubmitting(true);
      
      const payload: SubmitShariahReviewRequest = {
        organizationId: organizationId.trim(),
        title: title.trim(),
        summary: summary.trim(),
        ...(filteredReferences.length > 0 && { references: filteredReferences })
      };
      
      const result = await submitShariahReview(payload);
      setSubmitSuccess(result);
      
      // Reset form
      setOrganizationId('');
      setTitle('');
      setSummary('');
      setReferences([{ type: '', name: '', uri: '', description: '', mediaType: '' }]);
    } catch (error) {
      setSubmitError(normalizeApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Shariah Review Submission</h1>
      
      {/* Advisory notice for protected operations */}
      <div style={{
        border: '1px solid #f0ad4e',
        backgroundColor: '#fff8e5',
        padding: '1rem',
        margin: '1rem 0',
        borderRadius: '4px'
      }}>
        <p>
          <strong>Protected operation notice:</strong> Shariah review submission requires a valid authenticated actor session. 
          The backend derives actor identity from trusted actor context before checking whether the actor has the coordinator role for the target organization. 
          If no actor context is available, the backend may return a validation error before coordinator authorization is evaluated. 
          Backend responses are shown below when a submission is rejected.
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
          <p>Shariah review submitted successfully.</p>
          <div>
            <p><strong>ID:</strong> {submitSuccess.id}</p>
            <p><strong>Organization ID:</strong> {submitSuccess.organizationId}</p>
            <p><strong>Title:</strong> {submitSuccess.title}</p>
            <p><strong>Status:</strong> {submitSuccess.status}</p>
            <p><strong>Submitted By:</strong> {submitSuccess.submittedByUserId}</p>
            <p><strong>Created At:</strong> {submitSuccess.createdAt}</p>
          </div>
        </div>
      )}
      
      {/* Error display */}
      <ErrorDisplay error={submitError} />
      
      {/* Submission form */}
      <form onSubmit={handleSubmit} style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Organization ID *
          </label>
          <input
            type="text"
            value={organizationId}
            onChange={(e) => setOrganizationId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
            disabled={submitting}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Title *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%', padding: '0.5rem' }}
            disabled={submitting}
          />
        </div>
        
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            Summary *
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', minHeight: '100px' }}
            disabled={submitting}
          />
        </div>
        
        {/* References section */}
        <div style={{ marginBottom: '1rem' }}>
          <h3>References (Optional)</h3>
          {references.map((ref, index) => (
            <div 
              key={index} 
              style={{ 
                border: '1px solid #ddd', 
                padding: '1rem', 
                marginBottom: '1rem',
                borderRadius: '4px'
              }}
            >
              <h4>Reference #{index + 1}</h4>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Type
                </label>
                <input
                  type="text"
                  value={ref.type}
                  onChange={(e) => handleReferenceChange(index, 'type', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                  placeholder="e.g., document, uri, attachment"
                  disabled={submitting}
                />
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Name
                </label>
                <input
                  type="text"
                  value={ref.name}
                  onChange={(e) => handleReferenceChange(index, 'name', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                  placeholder="e.g., document.pdf"
                  disabled={submitting}
                />
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                  URI
                </label>
                <input
                  type="text"
                  value={ref.uri}
                  onChange={(e) => handleReferenceChange(index, 'uri', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                  placeholder="e.g., https://example.com/document.pdf"
                  disabled={submitting}
                />
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Description
                </label>
                <input
                  type="text"
                  value={ref.description}
                  onChange={(e) => handleReferenceChange(index, 'description', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                  placeholder="Brief description of the reference"
                  disabled={submitting}
                />
              </div>
              
              <div style={{ marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', marginBottom: '0.25rem' }}>
                  Media Type
                </label>
                <input
                  type="text"
                  value={ref.mediaType}
                  onChange={(e) => handleReferenceChange(index, 'mediaType', e.target.value)}
                  style={{ width: '100%', padding: '0.5rem' }}
                  placeholder="e.g., application/pdf"
                  disabled={submitting}
                />
              </div>
              
              <button
                type="button"
                onClick={() => removeReference(index)}
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
                Remove Reference
              </button>
            </div>
          ))}
          
          <button
            type="button"
            onClick={addReference}
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
            Add Reference
          </button>
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
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </form>
    </div>
  );
}

export default ShariahReviewSubmissionPage;
