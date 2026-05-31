import { useEffect, useMemo, useState } from 'react';
import AppLayout from './components/layout/AppLayout';
import DashboardStateView from './components/dashboard/DashboardStateView';
import GuidedDemoPanel from './components/demo/GuidedDemoPanel';
import CompanyContextBanner from './components/organization/CompanyContextBanner';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import CompanyRegistrationPage from './pages/CompanyRegistrationPage';
import AdminDashboard from './pages/AdminDashboard';
import BuyerDashboard from './pages/BuyerDashboard';
import SupplierDashboard from './pages/SupplierDashboard';
import ComplianceDashboard from './pages/ComplianceDashboard';
import AuditorDashboard from './pages/AuditorDashboard';
import RegulatorDashboard from './pages/RegulatorDashboard';
import SecurityDashboard from './pages/SecurityDashboard';
import ShariahDashboard from './pages/ShariahDashboard';
import FinancingDashboard from './pages/FinancingDashboard';
import RoleDashboard from './pages/RoleDashboard';
import DocumentWorkspacePage from './pages/DocumentWorkspacePage';
import ContractNegotiationPage from './pages/ContractNegotiationPage';
import OrganizationNetworkPage from './pages/OrganizationNetworkPage';
import OrganizationUsersPage from './pages/OrganizationUsersPage';
import AccountSettingsPage from './pages/AccountSettingsPage';
import CompanyLedgerPage from './pages/CompanyLedgerPage';
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
import { isGuidedDemoEnabled } from './lib/runtime-config';

type RouteKey = 'landing' | 'login' | 'register' | 'dashboard';

function isGuidedDemoModeFromLocation(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return isGuidedDemoEnabled() && new URLSearchParams(window.location.search).get('demo') === 'guided';
}

function routeFromLocation(): RouteKey {
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

function routePath(route: RouteKey): string {
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

function renderRoleDashboard(
  role: SupportedDashboardRole,
  activeTarget: DashboardNavigationTarget,
  session: AuthenticatedFrontendSession,
  onOpenCompanyLedger: () => void,
) {
  if (activeTarget === 'settings') {
    return <AccountSettingsPage session={session} />;
  }

  if (activeTarget === 'company-ledger') {
    return <CompanyLedgerPage session={session} />;
  }

  if (activeTarget === 'organization-users') {
    return <OrganizationUsersPage session={session} />;
  }

  if (activeTarget === 'documents') {
    return <DocumentWorkspacePage session={session} />;
  }

  if (activeTarget === 'contracts') {
    return <ContractNegotiationPage session={session} />;
  }

  if (activeTarget === 'organization-network') {
    return <OrganizationNetworkPage session={session} onOpenCompanyLedger={onOpenCompanyLedger} />;
  }

  if (role === 'buyer') {
    return <BuyerDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'administrator') {
    return <AdminDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'supplier') {
    return <SupplierDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'complianceReviewer') {
    return <ComplianceDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'auditor') {
    return <AuditorDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'regulator') {
    return <RegulatorDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'securityOperator') {
    return <SecurityDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'shariahReviewer') {
    return <ShariahDashboard activeTarget={activeTarget} session={session} />;
  }

  if (role === 'financier') {
    return <FinancingDashboard activeTarget={activeTarget} session={session} />;
  }

  return <RoleDashboard role={role} activeTarget={activeTarget} />;
}

function routeUrl(route: RouteKey, guidedDemoMode: boolean): string {
  const path = routePath(route);
  return guidedDemoMode ? `${path}?demo=guided` : path;
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
