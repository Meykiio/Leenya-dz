import React, { Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

// Dashboard pages
const Dashboard = React.lazy(() => import("@/pages/dashboard/Dashboard"));
const DashboardBookings = React.lazy(() => import("@/pages/dashboard/DashboardBookings"));
const DashboardQueue = React.lazy(() => import("@/pages/dashboard/DashboardQueue"));
const DashboardServices = React.lazy(() => import("@/pages/dashboard/DashboardServices"));
const DashboardStaff = React.lazy(() => import("@/pages/dashboard/DashboardStaff"));
const DashboardSettings = React.lazy(() => import("@/pages/dashboard/DashboardSettings"));
const DashboardAnalytics = React.lazy(() => import("@/pages/dashboard/DashboardAnalytics"));
const DashboardFeedback = React.lazy(() => import("@/pages/dashboard/DashboardFeedback"));

const queryClient = new QueryClient();

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-base)]">
    <div className="h-8 w-8 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin" />
  </div>
);

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
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

                      {/* Client routes */}
                      <Route path="/mes-reservations" element={<ProtectedRoute allowedRoles={["client"]}><MyBookings /></ProtectedRoute>} />

                      {/* Owner dashboard routes — layout route keeps DashboardLayout + sidebar mounted */}
                      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={["owner"]}><DashboardLayout><Outlet /></DashboardLayout></ProtectedRoute>}>
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
                      <Route path="/staff" element={<ProtectedRoute allowedRoles={["staff", "owner"]}><StaffView /></ProtectedRoute>} />

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
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
