import { useState, useEffect } from 'react';

const GRID_BG = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
  backgroundSize: '32px 32px',
};
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AuthForm from './components/features/AuthForm';
import ResetPasswordForm from './components/features/ResetPasswordForm';
import Onboarding from './components/features/Onboarding';
import Navigation from './components/layout/Navigation';
import SkipLink from './components/accessible/SkipLink';
import InstallPrompt from './components/features/InstallPrompt';
import UpdateToast from './components/features/UpdateToast';
import HomePage from './pages/Home';
import ProgressPage from './pages/Progress';
import TodayPage from './pages/Today';
import MorePage from './pages/More';
import ActiveWorkoutBar from './components/layout/ActiveWorkoutBar';
import { useActiveSession } from './hooks/useActiveSession';
import { isLegacyPath, parseRoute, routeToPath, type Route } from './lib/routes';
import { useTodayReadiness } from './hooks/useTodayReadiness';

function AppContent() {
  const { user, profile, loading, passwordRecovery } = useAuth();
  // Computes and stores today's readiness on the first open of the day; Home
  // and Today read it in later phases.
  useTodayReadiness(user?.id, !!profile?.onboarding_completed);
  const [route, setRoute] = useState<Route>(() => parseRoute(window.location.pathname, window.location.search));

  // One route parser for first load and back/forward. Old links (/workout,
  // /calculator, /profile) are rewritten to their new paths in place.
  useEffect(() => {
    if (isLegacyPath(window.location.pathname, window.location.search)) {
      window.history.replaceState({}, '', routeToPath(route));
    }
    const handlePopState = () => {
      setRoute(parseRoute(window.location.pathname, window.location.search));
      window.scrollTo(0, 0);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keepPlace: a change within a page (picking a lift, opening a sheet) keeps
  // the scroll position and focus instead of starting the page over.
  const go = (next: Route, keepPlace = false) => {
    setRoute(next);
    window.history.pushState({}, '', routeToPath(next));
    if (keepPlace) return;
    window.scrollTo(0, 0);
    setTimeout(() => document.getElementById('main-content')?.focus(), 100);
  };

  // Pages written before the four tabs still navigate by page name.
  const handleNavigate = (page: string, liftType?: string) => {
    if (page === 'workout' || page === 'today') go(liftType ? { tab: 'today', lift: liftType } : { tab: 'today' });
    else if (page === 'calculator') go({ tab: 'more', sub: '1rm' });
    else if (page === 'profile') go({ tab: 'more', sub: 'account' });
    else if (page === 'progress' || page === 'more') go({ tab: page });
    else go({ tab: 'home' });
  };

  const activeSession = useActiveSession(user?.id, {
    cycle: profile?.current_cycle,
    week: profile?.current_week,
    unit: profile?.unit_preference || 'lb',
    enabled: !!profile?.onboarding_completed,
  });
  const showWorkoutBar = !!activeSession && route.tab !== 'today';

  // A session in progress stays mounted while another tab is open, so coming
  // back from the workout bar carries on where it was (sets, rest timer)
  // instead of offering to restore a draft.
  const [lastToday, setLastToday] = useState<Route | null>(route.tab === 'today' ? route : null);
  useEffect(() => {
    if (route.tab === 'today') setLastToday(route);
  }, [route]);
  const todayRoute = route.tab === 'today' ? route : activeSession ? lastToday : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-700 dark:bg-blue-900 flex items-center justify-center" role="status" aria-live="polite" style={GRID_BG}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-white/60">Loading your workout data...</p>
        </div>
      </div>
    );
  }

  // Checked before the normal !user gate — a recovery link establishes a
  // real session, so `user` is already truthy at this point, but the user
  // still needs to set a new password before doing anything else.
  if (passwordRecovery) {
    return <ResetPasswordForm />;
  }

  if (!user) {
    return <AuthForm />;
  }

  if (!profile?.onboarding_completed) {
    return <Onboarding />;
  }

  return (
    <>
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      <SkipLink targetId="navigation">Skip to navigation</SkipLink>
      <InstallPrompt />

      <div className="min-h-screen bg-blue-700 dark:bg-blue-900 transition-colors" style={GRID_BG}>
        <main id="main-content" tabIndex={-1} className="focus:outline-none">
          {route.tab === 'home' && <HomePage onNavigate={handleNavigate} />}
          {todayRoute && (
            <div hidden={route.tab !== 'today'}>
              <TodayPage
                lift={todayRoute.lift}
                onOpenLift={lift => go({ tab: 'today', lift })}
                onNavigateHome={() => go({ tab: 'home' })}
                onNavigateToProgress={() => go({ tab: 'progress' })}
                onOpenTrainingMax={lift => go({ tab: 'progress', sub: 'program', lift, sheet: 'tm' })}
              />
            </div>
          )}
          {route.tab === 'progress' && (
            <ProgressPage
              tab={route.sub}
              lift={route.lift}
              sheet={route.sheet}
              onRouteChange={next => go({ tab: 'progress', sub: next.tab, lift: next.lift, sheet: next.sheet }, next.tab === (route.sub ?? 'program'))}
              onEditTrainingMax={() => go({ tab: 'more', sub: 'program' })}
            />
          )}
          {route.tab === 'more' && <MorePage page={route.sub} onOpen={page => go({ tab: 'more', sub: page })} onBack={() => go({ tab: 'more' })} />}
          {/* Room for the workout bar so it never covers the end of a page. */}
          {showWorkoutBar && <div className="h-20" aria-hidden="true" />}
        </main>

        {showWorkoutBar && activeSession && (
          <ActiveWorkoutBar session={activeSession} onOpen={() => go({ tab: 'today', lift: activeSession.lift })} />
        )}

        <div id="navigation">
          <Navigation currentTab={route.tab} onNavigate={tab => go({ tab })} />
        </div>
      </div>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        {/* Outside AppContent so update notices reach every screen,
            including login and onboarding */}
        <UpdateToast />
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}
