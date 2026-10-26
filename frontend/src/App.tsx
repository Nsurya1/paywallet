import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { useAuth } from '@/hooks/useAuth';
import { ProtectedRoute, PublicOnlyRoute } from '@/components/ProtectedRoute';
import { AppLayout } from '@/components/layout/AppLayout';
import { LandingPage } from '@/pages/LandingPage';
import { LoginPage } from '@/pages/LoginPage';
import { RegisterPage } from '@/pages/RegisterPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { PlaceholderPage } from '@/pages/PlaceholderPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      {/* Explicit Marketing Landing Page */}
      <Route path="/landing" element={<LandingPage />} />

      {/* Public-only Auth Pages (redirects to / if already logged in) */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <LoginPage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <RegisterPage />
          </PublicOnlyRoute>
        }
      />

      {/* Main / Root Route: Shows Landing when unauthenticated, Dashboard when logged in */}
      {isAuthenticated ? (
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/" element={<DashboardPage />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route
            path="/transfer"
            element={
              <PlaceholderPage
                pageTitle="Transfer Flow"
                pageStep="Page 4 Target"
                description="3-step transfer flow: recipient avatars, balance check, review & confirm, UUID Idempotency-Key retry reuse, 409/422 guards, and animated PDF receipt."
              />
            }
          />
          <Route
            path="/transactions"
            element={
              <PlaceholderPage
                pageTitle="Transactions Ledger"
                pageStep="Page 5 Target"
                description="Server-side pagination, type/status/date/amount filters, color-coded +/- indicators, row-click detail drawer, CSV export, and skeleton loaders."
              />
            }
          />
          <Route
            path="/notifications"
            element={
              <PlaceholderPage
                pageTitle="Notifications & Events"
                pageStep="Page 6 Target"
                description="Unread dots, mark all read, filters, webhook subscription URL manager, and live test dispatcher."
              />
            }
          />
          <Route
            path="/settings"
            element={
              <PlaceholderPage
                pageTitle="Settings & Preferences"
                pageStep="Page 6 Target"
                description="User profile, change password, theme choices (light/dark/system), webhook endpoints, and active session audit."
              />
            }
          />
        </Route>
      ) : (
        <Route path="/" element={<LandingPage />} />
      )}

      {/* Fallback Catch-All */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <AppRoutes />
          {/* Sonner Toast Notification Host */}
          <Toaster richColors position="bottom-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
