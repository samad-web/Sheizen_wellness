import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/setup-admin" element={<SetupAdmin />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/dashboard" element={<ClientDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/client/:id" element={<ClientDetail />} />
            <Route path="/admin/assessments/:id/edit-sleep" element={<AdminEditSleepAssessment />} />
            <Route path="/admin/assessments/:id/edit-stress" element={<AdminEditStressAssessment />} />
            <Route path="/admin/assessments/:id/edit-health" element={<AdminEditHealthAssessment />} />
            <Route path="/client/assessments/:id/edit-sleep" element={<ClientEditSleepForm />} />
            <Route path="/client/assessments/:id/edit-stress" element={<ClientEditStressForm />} />
            <Route path="/client/assessments/:id/edit-health" element={<ClientEditHealthForm />} />
            <Route path="/interest" element={<InterestForm />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
