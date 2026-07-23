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
import CalculatorPage from './pages/Calculator';
import ProgressPage from './pages/Progress';
import ProfilePage from './pages/Profile';
import WorkoutDetailPage from './pages/WorkoutDetail';

function AppContent() {
  const { user, profile, loading, passwordRecovery } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedLift, setSelectedLift] = useState<string | null>(null);

  useEffect(() => {
    const path = window.location.pathname;
    const params = new URLSearchParams(window.location.search);

    if (path === '/' || path === '/home') {
      setCurrentPage('home');
      setSelectedLift(null);
    } else if (path === '/calculator') {
      setCurrentPage('calculator');
      setSelectedLift(null);
    } else if (path === '/progress') {
      setCurrentPage('progress');
      setSelectedLift(null);
    } else if (path === '/profile') {
      setCurrentPage('profile');
      setSelectedLift(null);
    } else if (path === '/workout') {
      const lift = params.get('lift');
      if (lift) {
        setCurrentPage('workout');
        setSelectedLift(lift);
      } else {
        setCurrentPage('home');
        setSelectedLift(null);
      }
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const params = new URLSearchParams(window.location.search);

      if (path === '/' || path === '/home') {
        setCurrentPage('home');
        setSelectedLift(null);
      } else if (path === '/calculator') {
        setCurrentPage('calculator');
        setSelectedLift(null);
      } else if (path === '/progress') {
        setCurrentPage('progress');
        setSelectedLift(null);
      } else if (path === '/profile') {
        setCurrentPage('profile');
        setSelectedLift(null);
      } else if (path === '/workout') {
        const lift = params.get('lift');
        if (lift) {
          setCurrentPage('workout');
          setSelectedLift(lift);
        } else {
          setCurrentPage('home');
          setSelectedLift(null);
        }
      }

      window.scrollTo(0, 0);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleNavigate = (page: string, liftType?: string) => {
    if (page === 'workout' && liftType) {
      setSelectedLift(liftType);
      setCurrentPage('workout');
      window.history.pushState({}, '', `/workout?lift=${liftType}`);
    } else {
      setCurrentPage(page);
      setSelectedLift(null);
      const path = page === 'home' ? '/' : `/${page}`;
      window.history.pushState({}, '', path);
    }

    window.scrollTo(0, 0);

    setTimeout(() => {
      const mainContent = document.getElementById('main-content');
      mainContent?.focus();
    }, 100);
  };

  const handleBack = () => {
    window.history.back();
  };

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
          {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
          {currentPage === 'calculator' && <CalculatorPage />}
          {currentPage === 'progress' && <ProgressPage />}
          {currentPage === 'profile' && <ProfilePage />}
          {currentPage === 'workout' && selectedLift && (
            <WorkoutDetailPage
              liftType={selectedLift}
              onBack={handleBack}
              onNavigateToProgress={() => handleNavigate('progress')}
            />
          )}
        </main>

        {currentPage !== 'workout' && (
          <div id="navigation">
            <Navigation currentPage={currentPage} onNavigate={handleNavigate} />
          </div>
        )}
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
