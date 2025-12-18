import { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    userRole: "admin" | "client" | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, name: string, phone: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userRole, setUserRole] = useState<"admin" | "client" | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchUserRole = async (userId: string) => {
        try {
            console.log("Fetching role for user:", userId);
            // 5 second timeout to prevent hanging
            const { data, error } = await Promise.race([
                supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", userId)
                    .maybeSingle(), // Use maybeSingle to avoid 406
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error("Timeout fetching role")), 5000)
                )
            ]) as { data: any, error: any };

            if (error) {
                console.error("Error fetching user role:", error);
                return null;
            }

            if (!data) {
                console.warn("No role found for user:", userId);
                return null;
            }

            console.log("Fetched role:", data.role);
            return data.role as "admin" | "client" | null;
        } catch (error) {
            console.error("Error or timeout fetching user role:", error);
            return null;
        }
    };

    // Clear any persisted Supabase sessions from storage to avoid auto re-login
    const clearStoredSession = () => {
        try {
            Object.keys(localStorage)
                .filter((key) => key.startsWith("sb-"))
                .forEach((key) => localStorage.removeItem(key));
        } catch (err) {
            console.warn("Could not clear stored session:", err);
        }
    };

    useEffect(() => {
        // Fetch current session on mount so we have initial auth state
        const initSession = async () => {
            const { data, error } = await supabase.auth.getSession();
            if (error) {
                console.error("Error getting session:", error);
            }

            const currentSession = data?.session ?? null;
            setSession(currentSession);
            setUser(currentSession?.user ?? null);

            if (currentSession?.user) {
                const role = await fetchUserRole(currentSession.user.id);
                setUserRole(role);
            } else {
                setUserRole(null);
            }
            setLoading(false);
        };

        initSession();

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log("Auth State Change:", event);

                if (session?.user) {
                    setSession(session);
                    setUser(session.user);

                    try {
                        // Only fetch role if we don't have it or user changed
                        const role = await fetchUserRole(session.user.id);
                        setUserRole(role);
                    } catch (err) {
                        console.error("Error fetching user role:", err);
                        setUserRole(null);
                    }
                } else {
                    setSession(null);
                    setUser(null);
                    setUserRole(null);
                    clearStoredSession();
                }

                // Explicitly handle signed out event with navigation
                if (event === "SIGNED_OUT") {
                    clearStoredSession();
                    navigate("/auth");
                }

                setLoading(false);
            }
        );

        // Session Timeout Logic (15 minutes)
        const TIMEOUT_DURATION = 15 * 60 * 1000; // 15 minutes in milliseconds
        let logoutTimer: NodeJS.Timeout;

        const resetTimer = () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            if (session?.user) {
                logoutTimer = setTimeout(() => {
                    console.log("Session timed out due to inactivity");
                    signOut();
                    toast.info("Session expired due to inactivity. Please sign in again.");
                }, TIMEOUT_DURATION);
            }
        };

        // Events to listen for activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

        const handleActivity = () => {
            resetTimer();
        };

        if (session?.user) {
            resetTimer();
            events.forEach(event => {
                window.addEventListener(event, handleActivity);
            });
        }

        return () => {
            subscription.unsubscribe();
            if (logoutTimer) clearTimeout(logoutTimer);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [session?.user?.id]); // Re-run effect when user changes (login/logout) // Re-run effect when user changes (login/logout)

    const signIn = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error("SignIn: Supabase error", error);
                toast.error(error.message);
                return { error };
            }

            if (data.session) {
                setSession(data.session);
                setUser(data.session.user);

                // Fetch role immediately
                const role = await fetchUserRole(data.session.user.id);
                setUserRole(role);

                // Force navigation based on role
                if (role === 'admin') {
                    navigate("/admin");
                } else {
                    // Default to dashboard for clients or if role is missing (handled by ProtectedRoute if invalid)
                    navigate("/dashboard");
                }
            }

            toast.success("Signed in successfully!");
            return { error: null };
        } catch (error: any) {
            console.error("SignIn: Unexpected error", error);
            toast.error(error.message || "An error occurred during sign in");
            return { error };
        }
    };

    const signUp = async (email: string, password: string, name: string, phone: string) => {
        const redirectUrl = `${window.location.origin}/`;

        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: redirectUrl,
                data: {
                    name,
                    phone,
                },
            },
        });

        if (error) {
            toast.error(error.message);
            return { error };
        }

        toast.success("Account created successfully!");
        return { error: null };
    };

    const signOut = async () => {
        try {
            const { error } = await supabase.auth.signOut({ scope: "global" });
            if (error) {
                console.error("Error during sign out:", error);
            }
        } catch (error) {
            console.error("Unexpected error during sign out:", error);
        } finally {
            clearStoredSession();
            // Clear local state
            setUser(null);
            setSession(null);
            setUserRole(null);

            // Always navigate to auth
            navigate("/auth");
            toast.success("Signed out successfully");
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, userRole, loading, signIn, signUp, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
