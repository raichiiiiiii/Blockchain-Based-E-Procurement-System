import type { AuthProvider, AuthProviderStatus } from './auth-provider.js';
import type { LoginInput, LoginResult, LoginUserService } from './login-user.js';

export class LocalPasswordAuthProvider implements AuthProvider {
  constructor(private readonly loginService: LoginUserService) {}

  status(): AuthProviderStatus {
    return {
      provider: 'localPassword',
      status: 'available',
      authenticationMethod: 'localPassword',
      scopes: [
        'org:read',
        'org:write',
        'org:users:manage',
        'network:read',
        'network:write',
        'deals:read',
        'deals:write',
        'productivity:read',
        'productivity:write',
        'proof:read',
        'proof:verify',
        'email:read',
        'admin:platform',
      ],
      message: 'Credential login remains the local identity provider compatibility mode.',
    };
  }

  login(input: LoginInput): Promise<LoginResult> {
    return this.loginService.login(input);
  }
}
