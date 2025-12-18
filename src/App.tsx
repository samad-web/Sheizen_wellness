import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Onboarding from "./pages/Onboarding";
import ClientDashboard from "./pages/ClientDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import ClientDetail from "./pages/ClientDetail";
import SetupAdmin from "./pages/SetupAdmin";
import InterestForm from "./pages/InterestForm";
import NotFound from "./pages/NotFound";
import AdminEditSleepAssessment from "./pages/AdminEditSleepAssessment";
import AdminEditStressAssessment from "./pages/AdminEditStressAssessment";
import AdminEditHealthAssessment from "./pages/AdminEditHealthAssessment";
import ClientEditSleepForm from "./components/client/ClientEditSleepForm";
import ClientEditStressForm from "./components/client/ClientEditStressForm";
import ClientEditHealthForm from "./components/client/ClientEditHealthForm";
import Community from "./pages/Community";
import SupabaseConnectionTest from "./components/SupabaseConnectionTest";
import { DatabaseConnectionTest } from "./components/DatabaseConnectionTest";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data considered fresh
      gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

import { ThemeProvider } from "@/components/theme-provider";

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme" attribute="class">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/setup-admin" element={<SetupAdmin />} />
              <Route path="/onboarding" element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute requiredRole="client">
                  <ClientDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              <Route path="/admin/client/:id" element={
                <ProtectedRoute requiredRole="admin">
                  <ClientDetail />
                </ProtectedRoute>
              } />
              <Route path="/admin/assessments/:id/edit-sleep" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminEditSleepAssessment />
                </ProtectedRoute>
              } />
              <Route path="/admin/assessments/:id/edit-stress" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminEditStressAssessment />
                </ProtectedRoute>
              } />
              <Route path="/admin/assessments/:id/edit-health" element={
                <ProtectedRoute requiredRole="admin">
                  <AdminEditHealthAssessment />
                </ProtectedRoute>
              } />
              <Route path="/client/assessments/:id/edit-sleep" element={
                <ProtectedRoute requiredRole="client">
                  <ClientEditSleepForm />
                </ProtectedRoute>
              } />
              <Route path="/client/assessments/:id/edit-stress" element={
                <ProtectedRoute requiredRole="client">
                  <ClientEditStressForm />
                </ProtectedRoute>
              } />
              <Route path="/client/assessments/:id/edit-health" element={
                <ProtectedRoute requiredRole="client">
                  <ClientEditHealthForm />
                </ProtectedRoute>
              } />
              <Route path="/interest" element={<InterestForm />} />
              <Route path="/community" element={
                <ProtectedRoute>
                  <Community />
                </ProtectedRoute>
              } />
              <Route path="/test-connection" element={<SupabaseConnectionTest />} />
              <Route path="/test-db" element={<DatabaseConnectionTest />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
