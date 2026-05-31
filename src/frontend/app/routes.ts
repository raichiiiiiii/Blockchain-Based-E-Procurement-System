import { isGuidedDemoEnabled } from '../lib/runtime-config';

export type RouteKey = 'landing' | 'login' | 'register' | 'dashboard';

export function isGuidedDemoModeFromLocation(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return isGuidedDemoEnabled() && new URLSearchParams(window.location.search).get('demo') === 'guided';
}

export function routeFromLocation(): RouteKey {
  if (typeof window === 'undefined') {
    return 'landing';
  }

  switch (window.location.pathname) {
    case '/login':
      return 'login';
    case '/register-company':
      return 'register';
    case '/dashboard':
      return 'dashboard';
    case '/':
      return 'landing';
    default:
      return 'landing';
  }
}

export function routePath(route: RouteKey): string {
  switch (route) {
    case 'login':
      return '/login';
    case 'register':
      return '/register-company';
    case 'dashboard':
      return '/dashboard';
    case 'landing':
    default:
      return '/';
  }
}

export function routeUrl(route: RouteKey, guidedDemoMode: boolean): string {
  const path = routePath(route);
  return guidedDemoMode ? `${path}?demo=guided` : path;
}
