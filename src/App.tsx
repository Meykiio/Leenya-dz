import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/auth/ProtectedRoute";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Lazy-loaded pages for code splitting
const Landing = React.lazy(() => import("@/pages/Landing"));
const Login = React.lazy(() => import("@/pages/Login"));
const Onboarding = React.lazy(() => import("@/pages/Onboarding"));
const BusinessPublic = React.lazy(() => import("@/pages/BusinessPublic"));
const QueuePublic = React.lazy(() => import("@/pages/QueuePublic"));
const QueueDisplay = React.lazy(() => import("@/pages/QueueDisplay"));
const StaffView = React.lazy(() => import("@/pages/StaffView"));
const MyBookings = React.lazy(() => import("@/pages/MyBookings"));
const NotFound = React.lazy(() => import("@/pages/NotFound"));
const ResetPassword = React.lazy(() => import("@/pages/ResetPassword"));
const BookingTrack = React.lazy(() => import("@/pages/BookingTrack"));
const TermsOfService = React.lazy(() => import("@/pages/TermsOfService"));
const PrivacyPolicy = React.lazy(() => import("@/pages/PrivacyPolicy"));
const Admin = React.lazy(() => import("@/pages/Admin"));

// Dashboard pages
const Dashboard = React.lazy(() => import("@/pages/dashboard/Dashboard"));
const DashboardBookings = React.lazy(() => import("@/pages/dashboard/DashboardBookings"));
const DashboardQueue = React.lazy(() => import("@/pages/dashboard/DashboardQueue"));
const DashboardServices = React.lazy(() => import("@/pages/dashboard/DashboardServices"));
const DashboardStaff = React.lazy(() => import("@/pages/dashboard/DashboardStaff"));
const DashboardSettings = React.lazy(() => import("@/pages/dashboard/DashboardSettings"));
const DashboardAnalytics = React.lazy(() => import("@/pages/dashboard/DashboardAnalytics"));
const DashboardFeedback = React.lazy(() => import("@/pages/dashboard/DashboardFeedback"));

/** Spinner shown as a Suspense fallback while lazy-loaded page chunks load. */
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]" role="status" aria-live="polite">
    <div className="h-8 w-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
  </div>
);

/**
 * Root application component.
 * Sets up:
 * - Error boundaries at multiple nesting levels
 * - Auth provider (Supabase session + role)
 * - Tooltip provider and toast/sonner toasters
 * - React Router with lazy-loaded public, client, owner dashboard, staff, and display routes
 * - Public business pages (/:slug) must be placed last to avoid catch-all conflicts
 */
const App = () => (
  <ErrorBoundary>
    <ErrorBoundary>
      <AuthProvider>
        <ErrorBoundary>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <ErrorBoundary>
              <BrowserRouter>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Public routes */}
                    <Route path="/" element={<Landing />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/booking/track/:token" element={<BookingTrack />} />

                    {/* Admin routes */}
                    <Route path="/admin" element={<ProtectedRoute allowedRoles={["superadmin"]}><Admin /></ProtectedRoute>} />

                    {/* Client routes */}
                    <Route path="/mes-reservations" element={<ProtectedRoute allowedRoles={["client", "superadmin"]}><MyBookings /></ProtectedRoute>} />

                    {/* Owner dashboard routes — layout route keeps DashboardLayout + sidebar mounted */}
                    <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["owner", "superadmin"]}><DashboardLayout><Outlet /></DashboardLayout></ProtectedRoute>}>
                      <Route index element={<Dashboard />} />
                      <Route path="bookings" element={<DashboardBookings />} />
                      <Route path="queue" element={<DashboardQueue />} />
                      <Route path="services" element={<DashboardServices />} />
                      <Route path="staff" element={<DashboardStaff />} />
                      <Route path="settings" element={<DashboardSettings />} />
                      <Route path="analytics" element={<DashboardAnalytics />} />
                      <Route path="feedback" element={<DashboardFeedback />} />
                      <Route path="*" element={<NotFound />} />
                    </Route>

                    {/* Staff routes */}
                    <Route path="/staff" element={<ProtectedRoute allowedRoles={["staff", "owner", "superadmin"]}><StaffView /></ProtectedRoute>} />

                    {/* TV display mode */}
                    <Route path="/display/:slug" element={<QueueDisplay />} />

                    {/* Public business routes — MUST be last before catch-all */}
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/:slug/queue" element={<QueuePublic />} />
                    <Route path="/:slug" element={<BusinessPublic />} />

                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
              </BrowserRouter>
            </ErrorBoundary>
          </TooltipProvider>
        </ErrorBoundary>
      </AuthProvider>
    </ErrorBoundary>
  </ErrorBoundary>
);

export default App;
