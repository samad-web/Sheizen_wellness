import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: "admin" | "client" | "manager";
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
    const { user, userRole, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/auth" state={{ from: location }} replace />;
    }

    if (requiredRole && userRole !== requiredRole) {
        // If user has no role, they likely haven't completed onboarding
        if (!userRole) {
            console.log("[ProtectedRoute] No role found for user, redirecting to onboarding");
            return <Navigate to="/onboarding" replace />;
        }

        // Allow managers to access admin routes
        if (requiredRole === "admin" && userRole === "manager") {
            // Manager can access admin dashboard
            return <>{children}</>;
        }

        // Redirect to correct dashboard if role doesn't match
        if (userRole === "admin" || userRole === "manager") {
            return <Navigate to="/admin" replace />;
        } else {
            // If we are already on dashboard, don't redirect (loop protection)
            // But here userRole is 'client' (implied by previous logic? No, userRole is NOT requiredRole)
            // If requiredRole is 'admin' and user is 'client', send to dashboard.
            return <Navigate to="/dashboard" replace />;
        }
    }

    return <>{children}</>;
}
