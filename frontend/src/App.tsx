import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { AuthProvider } from '@/components/providers/AuthProvider';
import { AppLayout } from '@/components/layout/AppLayout';
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

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Protected Application Shell */}
            <Route element={<AppLayout />}>
              <Route
                path="/"
                element={
                  <PlaceholderPage
                    pageTitle="Dashboard"
                    pageStep="Page 2 Target"
                    description="Greeting, hero wallet card with glass effect, count-up balance, quick actions (Add Money, Send, Request), spending charts, and recent transactions."
                  />
                }
              />
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

            {/* Auth Placeholders (Awaiting Page 1 Prompt) */}
            <Route
              path="/login"
              element={
                <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                  <PlaceholderPage
                    pageTitle="Login & Registration"
                    pageStep="Page 1 Target"
                    description="Landing hero, split-screen login/register with validation, password meter, and animated gradient testimonial panel."
                  />
                </div>
              }
            />
            <Route
              path="/register"
              element={<Navigate to="/login" replace />}
            />

            {/* Catch-All */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

          {/* Sonner Toast Notification Host */}
          <Toaster richColors position="bottom-right" />
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
