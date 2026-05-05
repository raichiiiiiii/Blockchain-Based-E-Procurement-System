import { useState } from 'react';
import { createMemberOrganization } from '../api/member-organizations';
import { normalizeApiError, type BackendApiError } from '../api/errors';
import ErrorDisplay from '../components/ErrorDisplay';
import type { CreateMemberOrganizationRequest, MemberOrganizationResponse } from '../types/member-organization';

function MemberOnboardingPage() {
  // Form state
  const [formData, setFormData] = useState({
    registrationNumber: '',
    legalName: '',
    organizationType: '',
    displayName: '',
    businessType: '',
    contactEmail: '',
    contactPhone: '',
    countryCode: '',
    notes: ''
  });

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<BackendApiError | null>(null);
  const [successData, setSuccessData] = useState<MemberOrganizationResponse | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validate required fields
  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!formData.registrationNumber.trim()) {
      errors.push('Registration Number is required');
    }
    
    if (!formData.legalName.trim()) {
      errors.push('Legal Name is required');
    }
    
    if (!formData.organizationType.trim()) {
      errors.push('Organization Type is required');
    }
    
    setValidationErrors(errors);
    return errors.length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous state
    setApiError(null);
    setSuccessData(null);
    setValidationErrors([]);
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    // Prepare payload
    const payload: CreateMemberOrganizationRequest = {
      registrationNumber: formData.registrationNumber.trim(),
      legalName: formData.legalName.trim(),
      organizationType: formData.organizationType.trim(),
      ...(formData.displayName.trim() && { displayName: formData.displayName.trim() }),
      ...(formData.businessType?.trim() && { businessType: formData.businessType.trim() }),
      ...(formData.contactEmail?.trim() && { contactEmail: formData.contactEmail.trim() }),
      ...(formData.contactPhone?.trim() && { contactPhone: formData.contactPhone.trim() }),
      ...(formData.countryCode?.trim() && { countryCode: formData.countryCode.trim() }),
      ...(formData.notes?.trim() && { notes: formData.notes.trim() })
    };
    
    try {
      setSubmitting(true);
      
      // Submit to backend
      const result = await createMemberOrganization(payload);
      
      // Handle success
      setSuccessData(result);
    } catch (error) {
      // Handle error
      const normalizedError = normalizeApiError(error);
      setApiError(normalizedError);
    } finally {
      setSubmitting(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      registrationNumber: '',
      legalName: '',
      organizationType: '',
      displayName: '',
      businessType: '',
      contactEmail: '',
      contactPhone: '',
      countryCode: '',
      notes: ''
    });
    setApiError(null);
    setSuccessData(null);
    setValidationErrors([]);
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Member Onboarding</h1>
      
      {successData ? (
        <div style={{ 
          border: '1px solid #28a745', 
          backgroundColor: '#d4edda', 
          padding: '1rem', 
          margin: '1rem 0',
          borderRadius: '4px'
        }}>
          <h2>Success!</h2>
          <p>Organization created successfully and is pending review.</p>
          <div style={{ marginTop: '1rem' }}>
            <p><strong>ID:</strong> {successData.id}</p>
            <p><strong>Registration Number:</strong> {successData.registrationNumber}</p>
            <p><strong>Legal Name:</strong> {successData.legalName}</p>
            <p><strong>Organization Type:</strong> {successData.organizationType}</p>
            <p><strong>Status:</strong> {successData.status}</p>
          </div>
          <button 
            onClick={handleReset}
            style={{
              marginTop: '1rem',
              padding: '0.5rem 1rem',
              backgroundColor: '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Create Another Organization
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Client-side validation errors */}
          {validationErrors.length > 0 && (
            <div style={{ 
              border: '1px solid #ff0000', 
              backgroundColor: '#ffeeee', 
              padding: '1rem', 
              margin: '1rem 0',
              borderRadius: '4px'
            }}>
              <h3>Validation Errors</h3>
              <ul>
                {validationErrors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}
          
          {/* Backend API errors */}
          <ErrorDisplay error={apiError} />
          
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="registrationNumber" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Registration Number *
            </label>
            <input
              type="text"
              id="registrationNumber"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleChange}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="legalName" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Legal Name *
            </label>
            <input
              type="text"
              id="legalName"
              name="legalName"
              value={formData.legalName}
              onChange={handleChange}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="organizationType" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Organization Type *
            </label>
            <input
              type="text"
              id="organizationType"
              name="organizationType"
              value={formData.organizationType}
              onChange={handleChange}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="displayName" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Display Name
            </label>
            <input
              type="text"
              id="displayName"
              name="displayName"
              value={formData.displayName}
              onChange={handleChange}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="businessType" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Business Type
            </label>
            <input
              type="text"
              id="businessType"
              name="businessType"
              value={formData.businessType}
              onChange={handleChange}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="contactEmail" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Contact Email
            </label>
            <input
              type="email"
              id="contactEmail"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="contactPhone" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Contact Phone
            </label>
            <input
              type="text"
              id="contactPhone"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleChange}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="countryCode" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Country Code
            </label>
            <input
              type="text"
              id="countryCode"
              name="countryCode"
              value={formData.countryCode}
              onChange={handleChange}
              disabled={submitting}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="notes" style={{ display: 'block', marginBottom: '0.5rem' }}>
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              disabled={submitting}
              rows={4}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #ccc',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor: submitting ? '#6c757d' : '#007bff',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Submitting...' : 'Create Organization'}
          </button>
        </form>
      )}
      
      <div style={{ marginTop: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
        <h2>Contract-consumer pattern</h2>
        <ul>
          <li>Request type: <code>CreateMemberOrganizationRequest</code></li>
          <li>Response type: <code>MemberOrganizationResponse</code></li>
          <li>API function: <code>createMemberOrganization(...)</code></li>
          <li>Standardized error component: <code>ErrorDisplay</code></li>
        </ul>
      </div>
    </div>
  );
}

export default MemberOnboardingPage;
