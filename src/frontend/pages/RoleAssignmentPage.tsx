import { useState, useEffect, type FormEvent } from 'react';
import { listRoles } from '../api/roles';
import { createRoleAssignment, changeRoleAssignment, removeRoleAssignment } from '../api/role-assignments';
import type { RoleResponse } from '../types/role';
import type { 
  CreateRoleAssignmentRequest, 
  RoleAssignmentResponse,
  ChangeRoleAssignmentRequest,
  ChangeRoleAssignmentResponse,
  RemoveRoleAssignmentRequest,
  RemoveRoleAssignmentResponse
} from '../types/role-assignment';
import { BackendApiError, normalizeApiError } from '../api/errors';
import ErrorDisplay from '../components/ErrorDisplay';

function RoleAssignmentPage() {
  // Role state
  const [roles, setRoles] = useState<RoleResponse[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [rolesError, setRolesError] = useState<BackendApiError | null>(null);

  // Create form state
  const [userId, setUserId] = useState('');
  const [organizationId, setOrganizationId] = useState('');
  const [roleId, setRoleId] = useState('');

  // Create submission state
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<BackendApiError | null>(null);
  const [createSuccess, setCreateSuccess] = useState<RoleAssignmentResponse | null>(null);

  // Change form state
  const [changeUserId, setChangeUserId] = useState('');
  const [changeOrganizationId, setChangeOrganizationId] = useState('');
  const [currentRoleId, setCurrentRoleId] = useState('');
  const [newRoleId, setNewRoleId] = useState('');

  // Change submission state
  const [changing, setChanging] = useState(false);
  const [changeError, setChangeError] = useState<BackendApiError | null>(null);
  const [changeSuccess, setChangeSuccess] = useState<ChangeRoleAssignmentResponse | null>(null);

  // Remove form state
  const [removeUserId, setRemoveUserId] = useState('');
  const [removeOrganizationId, setRemoveOrganizationId] = useState('');
  const [removeRoleId, setRemoveRoleId] = useState('');

  // Remove submission state
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<BackendApiError | null>(null);
  const [removeSuccess, setRemoveSuccess] = useState<RemoveRoleAssignmentResponse | null>(null);

  // Load roles on component mount
  useEffect(() => {
    const loadRoles = async () => {
      try {
        setRolesLoading(true);
        setRolesError(null);
        const fetchedRoles = await listRoles();
        setRoles(fetchedRoles);
      } catch (error) {
        setRolesError(normalizeApiError(error));
      } finally {
        setRolesLoading(false);
      }
    };

    loadRoles();
  }, []);

  // Handle create form submission
  const handleCreateSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous state
    setCreateError(null);
    setCreateSuccess(null);

    // Client-side validation
    if (!userId.trim()) {
      setCreateError(new BackendApiError('VALIDATION_ERROR', 'User ID is required'));
      return;
    }

    if (!organizationId.trim()) {
      setCreateError(new BackendApiError('VALIDATION_ERROR', 'Organization ID is required'));
      return;
    }

    if (!roleId) {
      setCreateError(new BackendApiError('VALIDATION_ERROR', 'Role must be selected'));
      return;
    }

    try {
      setCreating(true);

      const payload: CreateRoleAssignmentRequest = {
        userId: userId.trim(),
        organizationId: organizationId.trim(),
        roleId
      };

      const result = await createRoleAssignment(payload);
      setCreateSuccess(result);
      
      // Reset form
      setUserId('');
      setOrganizationId('');
      setRoleId('');
    } catch (error) {
      setCreateError(normalizeApiError(error));
    } finally {
      setCreating(false);
    }
  };

  // Handle change form submission
  const handleChangeSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous state
    setChangeError(null);
    setChangeSuccess(null);

    // Client-side validation
    if (!changeUserId.trim()) {
      setChangeError(new BackendApiError('VALIDATION_ERROR', 'User ID is required'));
      return;
    }

    if (!changeOrganizationId.trim()) {
      setChangeError(new BackendApiError('VALIDATION_ERROR', 'Organization ID is required'));
      return;
    }

    if (!currentRoleId) {
      setChangeError(new BackendApiError('VALIDATION_ERROR', 'Current role must be selected'));
      return;
    }

    if (!newRoleId) {
      setChangeError(new BackendApiError('VALIDATION_ERROR', 'New role must be selected'));
      return;
    }

    if (currentRoleId === newRoleId) {
      setChangeError(new BackendApiError('VALIDATION_ERROR', 'Current role and new role must be different'));
      return;
    }

    try {
      setChanging(true);

      const payload: ChangeRoleAssignmentRequest = {
        userId: changeUserId.trim(),
        organizationId: changeOrganizationId.trim(),
        currentRoleId,
        newRoleId
      };

      const result = await changeRoleAssignment(payload);
      setChangeSuccess(result);
      
      // Reset form
      setChangeUserId('');
      setChangeOrganizationId('');
      setCurrentRoleId('');
      setNewRoleId('');
    } catch (error) {
      setChangeError(normalizeApiError(error));
    } finally {
      setChanging(false);
    }
  };

  // Handle remove form submission
  const handleRemoveSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Clear previous state
    setRemoveError(null);
    setRemoveSuccess(null);

    // Client-side validation
    if (!removeUserId.trim()) {
      setRemoveError(new BackendApiError('VALIDATION_ERROR', 'User ID is required'));
      return;
    }

    if (!removeOrganizationId.trim()) {
      setRemoveError(new BackendApiError('VALIDATION_ERROR', 'Organization ID is required'));
      return;
    }

    if (!removeRoleId) {
      setRemoveError(new BackendApiError('VALIDATION_ERROR', 'Role must be selected'));
      return;
    }

    try {
      setRemoving(true);

      const payload: RemoveRoleAssignmentRequest = {
        userId: removeUserId.trim(),
        organizationId: removeOrganizationId.trim(),
        roleId: removeRoleId
      };

      const result = await removeRoleAssignment(payload);
      setRemoveSuccess(result);
      
      // Reset form
      setRemoveUserId('');
      setRemoveOrganizationId('');
      setRemoveRoleId('');
    } catch (error) {
      setRemoveError(normalizeApiError(error));
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div style={{ padding: '1rem' }}>
      <h1>Role Assignment</h1>

      {/* Role loading state */}
      {rolesLoading && <p>Loading roles...</p>}

      {/* Role loading error */}
      {rolesError && <ErrorDisplay error={rolesError} />}

      {/* Main content */}
      {!rolesLoading && (
        <>
          {/* No roles message */}
          {!rolesError && roles.length === 0 && (
            <p>No roles available. Create roles first before managing assignments.</p>
          )}

          {/* Forms section */}
          {roles.length > 0 && (
            <>
              {/* Create Role Assignment Section */}
              <section style={{ marginBottom: '2rem' }}>
                <h2>Create Role Assignment</h2>

                {/* Success message */}
                {createSuccess && (
                  <div style={{ 
                    border: '1px solid #00aa00', 
                    backgroundColor: '#eeffee', 
                    padding: '1rem', 
                    margin: '1rem 0',
                    borderRadius: '4px'
                  }}>
                    <h3>Success!</h3>
                    <p>Role assignment created successfully.</p>
                    <div>
                      <p><strong>ID:</strong> {createSuccess.id}</p>
                      <p><strong>User ID:</strong> {createSuccess.userId}</p>
                      <p><strong>Organization ID:</strong> {createSuccess.organizationId}</p>
                      <p><strong>Role ID:</strong> {createSuccess.roleId}</p>
                      <p><strong>Status:</strong> {createSuccess.status}</p>
                      {createSuccess.createdAt && <p><strong>Created At:</strong> {createSuccess.createdAt}</p>}
                    </div>
                  </div>
                )}

                {/* Error display */}
                <ErrorDisplay error={createError} />

                {/* Form */}
                <form onSubmit={handleCreateSubmit} style={{ maxWidth: '500px' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      User ID *
                    </label>
                    <input
                      type="text"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem' }}
                      disabled={creating}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Organization ID *
                    </label>
                    <input
                      type="text"
                      value={organizationId}
                      onChange={(e) => setOrganizationId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem' }}
                      disabled={creating}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Role *
                    </label>
                    <select
                      value={roleId}
                      onChange={(e) => setRoleId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem' }}
                      disabled={creating}
                    >
                      <option value="">Select a role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.roleCode} — {role.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={creating}
                    style={{ 
                      padding: '0.5rem 1rem',
                      backgroundColor: '#007bff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: creating ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {creating ? 'Creating...' : 'Create Assignment'}
                  </button>
                </form>
              </section>

              {/* Change Role Assignment Section */}
              <section style={{ marginBottom: '2rem' }}>
                <h2>Change Role Assignment</h2>

                {/* Success message */}
                {changeSuccess && (
                  <div style={{ 
                    border: '1px solid #00aa00', 
                    backgroundColor: '#eeffee', 
                    padding: '1rem', 
                    margin: '1rem 0',
                    borderRadius: '4px'
                  }}>
                    <h3>Success!</h3>
                    <p>Role assignment changed successfully.</p>
                    <div>
                      <h4>Old Assignment</h4>
                      <p><strong>ID:</strong> {changeSuccess.oldAssignment.id}</p>
                      <p><strong>Role ID:</strong> {changeSuccess.oldAssignment.roleId}</p>
                      <p><strong>Status:</strong> {changeSuccess.oldAssignment.status}</p>
                      
                      <h4>New Assignment</h4>
                      <p><strong>ID:</strong> {changeSuccess.newAssignment.id}</p>
                      <p><strong>Role ID:</strong> {changeSuccess.newAssignment.roleId}</p>
                      <p><strong>Status:</strong> {changeSuccess.newAssignment.status}</p>
                    </div>
                  </div>
                )}

                {/* Error display */}
                <ErrorDisplay error={changeError} />

                {/* Form */}
                <form onSubmit={handleChangeSubmit} style={{ maxWidth: '500px' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      User ID *
                    </label>
                    <input
                      type="text"
                      value={changeUserId}
                      onChange={(e) => setChangeUserId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem' }}
                      disabled={changing}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Organization ID *
                    </label>
                    <input
                      type="text"
                      value={changeOrganizationId}
                      onChange={(e) => setChangeOrganizationId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem' }}
                      disabled={changing}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Current Role *
                    </label>
                    <select
                      value={currentRoleId}
                      onChange={(e) => setCurrentRoleId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem' }}
                      disabled={changing}
                    >
                      <option value="">Select current role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.roleCode} — {role.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      New Role *
                    </label>
                    <select
                      value={newRoleId}
                      onChange={(e) => setNewRoleId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem' }}
                      disabled={changing}
                    >
                      <option value="">Select new role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.roleCode} — {role.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={changing}
                    style={{ 
                      padding: '0.5rem 1rem',
                      backgroundColor: '#007bff',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: changing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {changing ? 'Changing...' : 'Change Assignment'}
                  </button>
                </form>
              </section>

              {/* Remove Role Assignment Section */}
              <section>
                <h2>Remove Role Assignment</h2>

                {/* Success message */}
                {removeSuccess && (
                  <div style={{ 
                    border: '1px solid #00aa00', 
                    backgroundColor: '#eeffee', 
                    padding: '1rem', 
                    margin: '1rem 0',
                    borderRadius: '4px'
                  }}>
                    <h3>Success!</h3>
                    <p>Role assignment removed successfully.</p>
                    <div>
                      <p><strong>ID:</strong> {removeSuccess.id}</p>
                      <p><strong>Status:</strong> {removeSuccess.status}</p>
                    </div>
                  </div>
                )}

                {/* Error display */}
                <ErrorDisplay error={removeError} />

                {/* Form */}
                <form onSubmit={handleRemoveSubmit} style={{ maxWidth: '500px' }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      User ID *
                    </label>
                    <input
                      type="text"
                      value={removeUserId}
                      onChange={(e) => setRemoveUserId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem' }}
                      disabled={removing}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Organization ID *
                    </label>
                    <input
                      type="text"
                      value={removeOrganizationId}
                      onChange={(e) => setRemoveOrganizationId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem' }}
                      disabled={removing}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>
                      Role *
                    </label>
                    <select
                      value={removeRoleId}
                      onChange={(e) => setRemoveRoleId(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem' }}
                      disabled={removing}
                    >
                      <option value="">Select a role</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.roleCode} — {role.displayName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={removing}
                    style={{ 
                      padding: '0.5rem 1rem',
                      backgroundColor: '#dc3545',
                      color: '#fff',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: removing ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {removing ? 'Removing...' : 'Remove Assignment'}
                  </button>
                </form>
              </section>
            </>
          )}
        </>
      )}
    </div>
  );
}

export default RoleAssignmentPage;
