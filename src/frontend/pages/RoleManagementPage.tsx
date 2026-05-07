import { useState, useEffect, type FormEvent } from 'react';
import { listRoles, createRole, updateRole } from '../api/roles';
import type { RoleResponse, CreateRoleRequest, UpdateRoleRequest } from '../types/role';
import { BackendApiError, normalizeApiError } from '../api/errors';
import ErrorDisplay from '../components/ErrorDisplay';

function RoleManagementPage() {
  // State for roles list
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<BackendApiError | null>(null);

  // State for create form
  const [roleCode, setRoleCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [permissions, setPermissions] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [isSystemReserved, setIsSystemReserved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<BackendApiError | null>(null);
  const [successMessage, setSuccessMessage] = useState('');

  // State for update form
  const [selectedRole, setSelectedRole] = useState<RoleResponse | null>(null);
  const [updateDisplayName, setUpdateDisplayName] = useState('');
  const [updateDescription, setUpdateDescription] = useState('');
  const [updatePermissions, setUpdatePermissions] = useState('');
  const [updateStatus, setUpdateStatus] = useState<'active' | 'inactive'>('active');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState<BackendApiError | null>(null);
  const [updateSuccessMessage, setUpdateSuccessMessage] = useState('');

  // Load roles on component mount
  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      setListError(null);
      const fetchedRoles = await listRoles();
      setRoles(fetchedRoles);
    } catch (error) {
      setListError(normalizeApiError(error));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRole = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Client-side validation
    if (!roleCode.trim()) {
      setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Role code is required'));
      return;
    }
    
    if (!displayName.trim()) {
      setSubmitError(new BackendApiError('VALIDATION_ERROR', 'Display name is required'));
      return;
    }
    
    const permissionsArray = permissions
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
      
    if (permissionsArray.length === 0) {
      setSubmitError(new BackendApiError('VALIDATION_ERROR', 'At least one permission is required'));
      return;
    }
    
    try {
      setSubmitting(true);
      setSubmitError(null);
      setSuccessMessage('');
      
      const payload: CreateRoleRequest = {
        roleCode: roleCode.trim(),
        displayName: displayName.trim(),
        scope: 'organization',
        permissions: permissionsArray,
        status,
        isSystemReserved,
        description: description.trim() || undefined
      };
      
      await createRole(payload);
      setSuccessMessage('Role created successfully!');
      
      // Reset form
      setRoleCode('');
      setDisplayName('');
      setPermissions('');
      setDescription('');
      setStatus('active');
      setIsSystemReserved(false);
      
      // Refresh roles list
      await loadRoles();
    } catch (error) {
      setSubmitError(normalizeApiError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSelectRoleForUpdate = (role: RoleResponse) => {
    setSelectedRole(role);
    setUpdateDisplayName(role.displayName);
    setUpdateDescription(role.description || '');
    setUpdatePermissions(role.permissions.join(', '));
    setUpdateStatus(role.status);
    setUpdateError(null);
    setUpdateSuccessMessage('');
  };

  const handleCancelUpdate = () => {
    setSelectedRole(null);
    setUpdateError(null);
    setUpdateSuccessMessage('');
  };

  const handleUpdateRole = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!selectedRole) return;
    
    // Client-side validation
    if (!updateDisplayName.trim()) {
      setUpdateError(new BackendApiError('VALIDATION_ERROR', 'Display name is required'));
      return;
    }
    
    const permissionsArray = updatePermissions
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
      
    if (permissionsArray.length === 0) {
      setUpdateError(new BackendApiError('VALIDATION_ERROR', 'At least one permission is required'));
      return;
    }
    
    try {
      setUpdating(true);
      setUpdateError(null);
      setUpdateSuccessMessage('');
      
      const payload: UpdateRoleRequest = {
        displayName: updateDisplayName.trim(),
        description: updateDescription.trim() || undefined,
        permissions: permissionsArray,
        status: updateStatus
      };
      
      await updateRole(selectedRole.id, payload);
      setUpdateSuccessMessage('Role updated successfully!');
      
      // Refresh roles list
      await loadRoles();
      
      // Clear selection
      setSelectedRole(null);
    } catch (error) {
      setUpdateError(normalizeApiError(error));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Role Management</h1>
      
      {/* Advisory notice for protected operations */}
      <div style={{
        border: '1px solid #f0ad4e',
        backgroundColor: '#fff8e5',
        padding: '1rem',
        margin: '1rem 0',
        borderRadius: '4px'
      }}>
        <p>
          <strong>Protected operation notice:</strong> role management actions are checked by the backend. 
          Authorization and deactivation rules may deny create or update requests. 
          Backend responses are shown below when an action is rejected.
        </p>
      </div>
      
      {/* Role List Section */}
      <section style={{ marginBottom: '2rem' }}>
        <h2>Roles</h2>
        
        {loading ? (
          <p>Loading roles...</p>
        ) : listError ? (
          <ErrorDisplay error={listError} />
        ) : roles.length === 0 ? (
          <p>No roles found.</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Role Code</th>
                <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Display Name</th>
                <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Scope</th>
                <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Permissions</th>
                <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Status</th>
                <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>System Reserved</th>
                <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Description</th>
                <th style={{ border: '1px solid #ddd', padding: '0.5rem' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map(role => (
                <tr key={role.id}>
                  <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{role.roleCode}</td>
                  <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{role.displayName}</td>
                  <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{role.scope}</td>
                  <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                    {role.permissions.join(', ')}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>{role.status}</td>
                  <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                    {role.isSystemReserved ? 'Yes' : 'No'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                    {role.description || '-'}
                  </td>
                  <td style={{ border: '1px solid #ddd', padding: '0.5rem' }}>
                    <button
                      onClick={() => handleSelectRoleForUpdate(role)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        backgroundColor: '#28a745',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
      
      {/* Update Role Form Section */}
      {selectedRole && (
        <section style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid #ccc', borderRadius: '4px' }}>
          <h2>Update Role</h2>
          
          <div style={{ marginBottom: '1rem', padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
            <h3>Role Identity (Read-only)</h3>
            <p><strong>Role Code:</strong> {selectedRole.roleCode}</p>
            <p><strong>Scope:</strong> {selectedRole.scope}</p>
            <p><strong>System Reserved:</strong> {selectedRole.isSystemReserved ? 'Yes' : 'No'}</p>
          </div>
          
          {updateSuccessMessage && (
            <div style={{ 
              border: '1px solid #00aa00', 
              backgroundColor: '#eeffee', 
              padding: '1rem', 
              margin: '1rem 0',
              borderRadius: '4px'
            }}>
              <p>{updateSuccessMessage}</p>
            </div>
          )}
          
          <ErrorDisplay error={updateError} />
          
          <form onSubmit={handleUpdateRole} style={{ maxWidth: '500px' }}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Display Name *
              </label>
              <input
                type="text"
                value={updateDisplayName}
                onChange={(e) => setUpdateDisplayName(e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
                disabled={updating}
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Permissions * (comma separated)
              </label>
              <input
                type="text"
                value={updatePermissions}
                onChange={(e) => setUpdatePermissions(e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
                placeholder="permission1, permission2, permission3"
                disabled={updating}
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Description
              </label>
              <textarea
                value={updateDescription}
                onChange={(e) => setUpdateDescription(e.target.value)}
                style={{ width: '100%', padding: '0.5rem' }}
                disabled={updating}
              />
            </div>
            
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                Status
              </label>
              <select
                value={updateStatus}
                onChange={(e) => setUpdateStatus(e.target.value as 'active' | 'inactive')}
                style={{ width: '100%', padding: '0.5rem' }}
                disabled={updating}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                type="submit"
                disabled={updating}
                style={{ 
                  padding: '0.5rem 1rem',
                  backgroundColor: '#007bff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: updating ? 'not-allowed' : 'pointer'
                }}
              >
                {updating ? 'Updating...' : 'Update Role'}
              </button>
              
              <button
                type="button"
                onClick={handleCancelUpdate}
                disabled={updating}
                style={{ 
                  padding: '0.5rem 1rem',
                  backgroundColor: '#6c757d',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: updating ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}
      
      {/* Create Role Form Section */}
      <section>
        <h2>Create New Role</h2>
        
        {successMessage && (
          <div style={{ 
            border: '1px solid #00aa00', 
            backgroundColor: '#eeffee', 
            padding: '1rem', 
            margin: '1rem 0',
            borderRadius: '4px'
          }}>
            <p>{successMessage}</p>
          </div>
        )}
        
        <ErrorDisplay error={submitError} />
        
        <form onSubmit={handleCreateRole} style={{ maxWidth: '500px' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Role Code *
            </label>
            <input
              type="text"
              value={roleCode}
              onChange={(e) => setRoleCode(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
              disabled={submitting}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Display Name *
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
              disabled={submitting}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Permissions * (comma separated)
            </label>
            <input
              type="text"
              value={permissions}
              onChange={(e) => setPermissions(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
              placeholder="permission1, permission2, permission3"
              disabled={submitting}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ width: '100%', padding: '0.5rem' }}
              disabled={submitting}
            />
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              style={{ width: '100%', padding: '0.5rem' }}
              disabled={submitting}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>
              <input
                type="checkbox"
                checked={isSystemReserved}
                onChange={(e) => setIsSystemReserved(e.target.checked)}
                disabled={submitting}
              />
              System Reserved
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
            {submitting ? 'Creating...' : 'Create Role'}
          </button>
        </form>
      </section>
    </div>
  );
}

export default RoleManagementPage;
