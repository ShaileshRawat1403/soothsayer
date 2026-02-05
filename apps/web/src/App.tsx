import { Routes, Route, Navigate } from 'react-router-dom';
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
import { ThemeProvider } from '@/components/common/ThemeProvider';

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
  return (
    <ThemeProvider>
      <Routes>
        {/* Public routes */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={
            <PublicRoute><LoginPage /></PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute><RegisterPage /></PublicRoute>
          } />
        </Route>

        {/* Protected routes */}
        <Route element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/chat/:conversationId" element={<ChatPage />} />
          <Route path="/terminal" element={<TerminalPage />} />
          <Route path="/workflows" element={<WorkflowsPage />} />
          <Route path="/workflows/:workflowId" element={<WorkflowsPage />} />
          <Route path="/personas" element={<PersonasPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ThemeProvider>
  );
}

export default App;
