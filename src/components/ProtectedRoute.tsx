import { useEffect } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    requiredRole?: "admin" | "client";
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
        // If user has no role, they might be in a bad state or role fetch failed
        if (!userRole) {
            return (
                <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
                    <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
                    <p className="text-muted-foreground mb-4">
                        Your account does not have a valid role assigned. Please contact support.
                    </p>
                    <button
                        onClick={() => window.location.href = '/auth'}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90"
                    >
                        Return to Login
                    </button>
                </div>
            );
        }

        // Redirect to correct dashboard if role doesn't match
        if (userRole === "admin") {
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
