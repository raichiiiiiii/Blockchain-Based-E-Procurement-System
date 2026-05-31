import type { AuthProvider, AuthProviderStatus } from './auth-provider.js';

export class ExternalOidcAuthProvider implements AuthProvider {
  status(): AuthProviderStatus {
    return {
      provider: 'externalOidc',
      status: 'notConfigured',
      authenticationMethod: 'externalOidc',
      scopes: [
        'org:read',
        'org:write',
        'org:users:manage',
        'network:read',
        'network:write',
        'deals:read',
        'productivity:read',
        'proof:read',
        'proof:verify',
        'email:read',
        'admin:platform',
      ],
      message: 'OIDC is a readiness boundary only. No external identity provider or JWKS is configured.',
    };
  }
}
