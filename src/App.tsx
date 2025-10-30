import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import Onboarding from './components/Onboarding';
import Navigation from './components/Navigation';
import SkipLink from './components/SkipLink';
import HomePage from './pages/HomePage';
import CalculatorPage from './pages/CalculatorPage';
import ProgressPage from './pages/ProgressPage';
import ProfilePage from './pages/ProfilePage';
import WorkoutDetailPage from './pages/WorkoutDetailPage';

function AppContent() {
  const { user, profile, loading } = useAuth();
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
          <p className="text-gray-600">Loading your workout data...</p>
        </div>
      </div>
    );
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

      <div className="min-h-screen bg-gray-50">
        <main id="main-content" tabIndex={-1} className="focus:outline-none">
          {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
          {currentPage === 'calculator' && <CalculatorPage />}
          {currentPage === 'progress' && <ProgressPage />}
          {currentPage === 'profile' && <ProfilePage />}
          {currentPage === 'workout' && selectedLift && (
            <WorkoutDetailPage liftType={selectedLift} onBack={handleBack} />
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
      <AppContent />
    </AuthProvider>
  );
}
