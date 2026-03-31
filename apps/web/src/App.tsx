import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { MainLayout } from '@/components/layout/MainLayout';
import { AuthLayout } from '@/components/layout/AuthLayout';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { ChatPage } from '@/pages/ChatPage';
import { TerminalPage } from '@/pages/TerminalPage';
import { WorkflowsPage } from '@/pages/WorkflowsPage';
import { PersonasPage } from '@/pages/PersonasPage';
import { AnalyticsPage } from '@/pages/AnalyticsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { RunPage } from '@/pages/RunPage';
import { DaxOverviewPage } from '@/pages/DaxOverviewPage';
import { PicobotPage } from '@/pages/PicobotPage';
import { ThemeProvider } from '@/components/common/ThemeProvider';
import { CommandPalette } from '@/components/common/CommandPalette';
import { OnboardingWizard } from '@/components/common/OnboardingWizard';
import { PageTransition } from '@/components/common/PageTransition';
import { useEffect, useState } from 'react';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

function App() {
  const { isAuthenticated } = useAuthStore();
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem('soothsayer-onboarding-complete');
    if (isAuthenticated && !hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
  }, [isAuthenticated]);

  const handleOnboardingComplete = () => {
    localStorage.setItem('soothsayer-onboarding-complete', 'true');
    setShowOnboarding(false);
  };

  return (
    <ThemeProvider>
      {/* Skip to main content link */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>

      {/* Command Palette - Always available when authenticated */}
      {isAuthenticated && <CommandPalette />}

      {/* Onboarding Wizard */}
      {showOnboarding && <OnboardingWizard onComplete={handleOnboardingComplete} />}

      <Routes>
        {/* Public routes */}
        <Route element={<AuthLayout />}>
          <Route
            path="/login"
            element={
              <PublicRoute>
                <LoginPage />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <RegisterPage />
              </PublicRoute>
            }
          />
        </Route>

        {/* Protected routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route
            path="/dashboard"
            element={
              <PageTransition>
                <DashboardPage />
              </PageTransition>
            }
          />
          <Route
            path="/chat"
            element={
              <PageTransition>
                <ChatPage />
              </PageTransition>
            }
          />
          <Route
            path="/chat/:conversationId"
            element={
              <PageTransition>
                <ChatPage />
              </PageTransition>
            }
          />
          <Route
            path="/terminal"
            element={
              <PageTransition>
                <TerminalPage />
              </PageTransition>
            }
          />
          <Route
            path="/workflows"
            element={
              <PageTransition>
                <WorkflowsPage />
              </PageTransition>
            }
          />
          <Route
            path="/workflows/:workflowId"
            element={
              <PageTransition>
                <WorkflowsPage />
              </PageTransition>
            }
          />
          <Route
            path="/personas"
            element={
              <PageTransition>
                <PersonasPage />
              </PageTransition>
            }
          />
          <Route
            path="/analytics"
            element={
              <PageTransition>
                <AnalyticsPage />
              </PageTransition>
            }
          />
          <Route
            path="/dax"
            element={
              <PageTransition>
                <DaxOverviewPage />
              </PageTransition>
            }
          />
          <Route
            path="/picobot"
            element={
              <PageTransition>
                <PicobotPage />
              </PageTransition>
            }
          />
          <Route
            path="/settings"
            element={
              <PageTransition>
                <SettingsPage />
              </PageTransition>
            }
          />
          <Route
            path="/runs/:runId"
            element={
              <PageTransition>
                <RunPage />
              </PageTransition>
            }
          />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
