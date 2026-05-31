import { useEffect, useMemo, useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import DashboardStateView from './components/dashboard/DashboardStateView';
import GuidedDemoPanel from './components/demo/GuidedDemoPanel';
import CompanyContextBanner from './components/organization/CompanyContextBanner';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CompanyRegistrationPage from './pages/CompanyRegistrationPage';
import { renderRoleDashboard } from './app/dashboard-renderer';
import {
  isGuidedDemoModeFromLocation,
  routeFromLocation,
  routePath,
  routeUrl,
  type RouteKey,
} from './app/routes';
import { loginWithCredentials, logoutSession, type LoginCredentials } from './lib/auth-client';
import {
  clearStoredSession,
  loadStoredSession,
  storeSession,
  type AuthenticatedFrontendSession,
  type FrontendSessionState,
} from './lib/session-state';
import {
  resolveDashboardState,
  type DashboardStateCode,
  type DashboardStateResult,
  type SupportedDashboardRole,
} from './lib/dashboard-state-resolver';
import {
  getRoleNavigation,
  isNavigationTargetAllowed,
  type DashboardNavigationTarget,
} from './lib/role-navigation';

function getAuthenticatedSession(session: FrontendSessionState): AuthenticatedFrontendSession | null {
  return session.status === 'authenticated' ? session : null;
}

function createForcedDashboardState(
  state: Exclude<DashboardStateCode, 'ready'>,
  current: DashboardStateResult,
): DashboardStateResult {
  return {
    state,
    actor: current.actor,
    role: current.role,
  };
}

function App() {
  const [route, setRoute] = useState<RouteKey>(() => routeFromLocation());
  const [guidedDemoMode, setGuidedDemoMode] = useState(() => isGuidedDemoModeFromLocation());
  const [session, setSession] = useState<FrontendSessionState>(() => loadStoredSession());
  const [loginError, setLoginError] = useState<string | undefined>();
  const [activeDashboardTarget, setActiveDashboardTarget] = useState<DashboardNavigationTarget>('dashboard');
  const [forcedDashboardState, setForcedDashboardState] = useState<Exclude<DashboardStateCode, 'ready'> | undefined>();

  const authenticatedSession = getAuthenticatedSession(session);

  const navigate = (nextRoute: RouteKey, replace = false) => {
    const nextPath = routeUrl(nextRoute, guidedDemoMode);
    const currentPath = typeof window === 'undefined' ? '' : `${window.location.pathname}${window.location.search}`;
    if (typeof window !== 'undefined' && currentPath !== nextPath) {
      const method = replace ? 'replaceState' : 'pushState';
      window.history[method]({}, '', nextPath);
    }

    setRoute(nextRoute);
  };

  useEffect(() => {
    const handlePopState = () => {
      setRoute(routeFromLocation());
      setGuidedDemoMode(isGuidedDemoModeFromLocation());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (route === 'dashboard' && !authenticatedSession) {
      navigate('login', true);
    }
  }, [authenticatedSession, route]);

  const resolvedDashboardState = useMemo(() => resolveDashboardState({
    actor: authenticatedSession?.actor,
    userStatus: 'active',
    organizationStatus: 'active',
    roleAssignmentStatus: 'active',
    backendAvailable: true,
  }), [authenticatedSession]);

  const dashboardState = forcedDashboardState
    ? createForcedDashboardState(forcedDashboardState, resolvedDashboardState)
    : resolvedDashboardState;

  useEffect(() => {
    if (dashboardState.state !== 'ready') {
      return;
    }

    if (!isNavigationTargetAllowed(dashboardState.role, activeDashboardTarget)) {
      setActiveDashboardTarget('dashboard');
    }
  }, [activeDashboardTarget, dashboardState]);

  const finishAuthentication = (nextSession: AuthenticatedFrontendSession) => {
    storeSession(nextSession);
    setSession(nextSession);
    setLoginError(undefined);
    setActiveDashboardTarget('dashboard');
    setForcedDashboardState(undefined);
    navigate('dashboard');
  };

  const handleCredentialsSignIn = async (credentials: LoginCredentials) => {
    setSession({ status: 'authenticating' });
    setLoginError(undefined);

    try {
      finishAuthentication(await loginWithCredentials(credentials));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Sign in failed';
      clearStoredSession();
      setSession({ status: 'anonymous' });
      setLoginError(message);
    }
  };

  const handleSignOut = async () => {
    const sessionToLogout = authenticatedSession;
    clearStoredSession();
    setSession({ status: 'anonymous' });
    setActiveDashboardTarget('dashboard');
    setForcedDashboardState(undefined);
    navigate('login');

    if (!sessionToLogout) {
      return;
    }

    try {
      await logoutSession(sessionToLogout);
    } catch {
      // Local session is cleared even if backend logout is unavailable.
    }
  };

  const handleDashboardNavigation = (target: DashboardNavigationTarget) => {
    if (target === 'logout') {
      void handleSignOut();
      return;
    }

    if (dashboardState.state !== 'ready' || !isNavigationTargetAllowed(dashboardState.role, target)) {
      setForcedDashboardState('forbidden');
      setActiveDashboardTarget('dashboard');
      return;
    }

    setForcedDashboardState(undefined);
    setActiveDashboardTarget(target);
  };

  const handleExitGuidedDemo = () => {
    setGuidedDemoMode(false);

    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', routePath(route));
    }
  };

  const guidedDemoPanel = guidedDemoMode ? (
    <GuidedDemoPanel
      route={route}
      isAuthenticated={Boolean(authenticatedSession)}
      role={dashboardState.state === 'ready' ? dashboardState.role : undefined}
      activeTarget={activeDashboardTarget}
      onOpenSignIn={() => navigate('login')}
      onOpenDashboardTarget={handleDashboardNavigation}
      onExit={handleExitGuidedDemo}
    />
  ) : null;

  if (route === 'landing') {
    return (
      <div className="app">
        <LandingPage
          onSignIn={() => navigate('login')}
          onRegisterCompany={() => navigate('register')}
          onViewDashboard={() => navigate(authenticatedSession ? 'dashboard' : 'login')}
        />
        {guidedDemoPanel}
      </div>
    );
  }

  if (route === 'register') {
    return (
      <div className="app">
        <CompanyRegistrationPage
          onBack={() => navigate('landing')}
          onSignIn={() => navigate('login')}
        />
        {guidedDemoPanel}
      </div>
    );
  }

  if (route === 'login' || !authenticatedSession) {
    const notice =
      session.status === 'expired'
        ? 'Your session expired. Sign in again to continue.'
        : route === 'login'
          ? undefined
          : 'Sign in to view your dashboard.';

    return (
      <div className="app">
        <LoginPage
          notice={notice}
          isAuthenticating={session.status === 'authenticating'}
          errorMessage={loginError}
          onBack={() => navigate('landing')}
          onCredentialsSignIn={handleCredentialsSignIn}
        />
        {guidedDemoPanel}
      </div>
    );
  }

  if (dashboardState.state !== 'ready') {
    return (
      <div className="app">
        <DashboardStateView
          state={dashboardState.state}
          onSignOut={() => void handleSignOut()}
        />
        {guidedDemoPanel}
      </div>
    );
  }

  const navigationItems = getRoleNavigation(dashboardState.role);

  return (
    <div className="app">
      <AppLayout
        role={dashboardState.role}
        actorLabel={dashboardState.actor.actorUserId}
        organizationLabel={dashboardState.actor.actorOrganizationId}
        activeTarget={activeDashboardTarget}
        navigationItems={navigationItems}
        onNavigate={handleDashboardNavigation}
      >
        <CompanyContextBanner
          session={authenticatedSession}
          onOpenCompanyLedger={() => handleDashboardNavigation('company-ledger')}
          onOpenSettings={() => handleDashboardNavigation('settings')}
        />
        {renderRoleDashboard(
          dashboardState.role,
          activeDashboardTarget,
          authenticatedSession,
          () => handleDashboardNavigation('company-ledger'),
        )}
      </AppLayout>
      {guidedDemoPanel}
    </div>
  );
}

export default App;
