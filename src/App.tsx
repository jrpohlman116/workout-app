import { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthForm from './components/AuthForm';
import Onboarding from './components/Onboarding';
import Navigation from './components/Navigation';
import HomePage from './pages/HomePage';
import CalculatorPage from './pages/CalculatorPage';
import ProgressPage from './pages/ProgressPage';
import ProfilePage from './pages/ProfilePage';
import WorkoutDetailPage from './pages/WorkoutDetailPage';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedLift, setSelectedLift] = useState<string | null>(null);

  const handleNavigate = (page: string, liftType?: string) => {
    if (page === 'workout' && liftType) {
      setSelectedLift(liftType);
      setCurrentPage('workout');
    } else {
      setCurrentPage(page);
      setSelectedLift(null);
    }
  };

  const handleBack = () => {
    setCurrentPage('home');
    setSelectedLift(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
    <div className="min-h-screen bg-gray-50">
      {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
      {currentPage === 'calculator' && <CalculatorPage />}
      {currentPage === 'progress' && <ProgressPage />}
      {currentPage === 'profile' && <ProfilePage />}
      {currentPage === 'workout' && selectedLift && (
        <WorkoutDetailPage liftType={selectedLift} onBack={handleBack} />
      )}
      {currentPage !== 'workout' && (
        <Navigation currentPage={currentPage} onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
