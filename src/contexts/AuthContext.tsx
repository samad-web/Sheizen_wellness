import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface AuthContextType {
    user: User | null;
    session: Session | null;
    userRole: "admin" | "client" | "manager" | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: any }>;
    signUp: (email: string, password: string, name: string, phone: string) => Promise<{ error: any }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userRole, setUserRole] = useState<"admin" | "client" | "manager" | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const fetchUserRole = async (userId: string, attempt = 1): Promise<"admin" | "client" | "manager" | null> => {
        try {
            console.log(`[AuthContext] Fetching user role via RPC for ${userId} (attempt ${attempt})`);

            // Create a promise that rejects after 5 seconds to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                const id = setTimeout(() => {
                    clearTimeout(id);
                    reject(new Error("Role fetch timeout"));
                }, 5000);
            });

            // RPC Call
            const rpcPromise = supabase.rpc('ensure_user_role', { p_user_id: userId });

            // Race against timeout
            const { data, error } = (await Promise.race([
                rpcPromise.then(res => res),
                timeoutPromise
            ])) as any; // Cast to avoid TS issues with race result types

            if (error) {
                console.error(`[AuthContext] RPC error (attempt ${attempt}):`, error);

                // Retry once on network error/timeout if attempt 1
                if (attempt < 2) {
                    console.log(`[AuthContext] Retrying role fetch...`);
                    return fetchUserRole(userId, attempt + 1);
                }

                toast.error("Failed to verify user permissions. Please try again.");
                return null;
            }

            console.log('[AuthContext] Successfully fetched role via RPC:', data);
            return (data as "admin" | "client" | "manager") || null;

        } catch (err) {
            console.error(`[AuthContext] Critical role fetch error:`, err);
            // Retry once on unexpected error if attempt 1
            if (attempt < 2) {
                return fetchUserRole(userId, attempt + 1);
            }
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

    const lastFetchedUserId = useRef<string | null>(null);



    useEffect(() => {
        // Safety timeout: ensure loading is set to false after 10 seconds max
        const safetyTimeout = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    console.warn("[AuthContext] Force clearing loading state after 10s timeout");
                    return false;
                }
                return prev;
            });
        }, 10000);

        // Fetch current session on mount
        const initSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) {
                    console.error("Error getting session:", error);
                }

                const currentSession = data?.session ?? null;
                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (currentSession?.user) {
                    // STRATEGY: Hybrid Optimistic Loader
                    // 1. Check Metadata (Best - Trusted & Fast)
                    let foundRole = currentSession.user.user_metadata?.role as "admin" | "client" | "manager" | undefined;

                    // 2. Check LocalStorage (Optimistic - Fast, verifies in background)
                    if (!foundRole) {
                        const cached = localStorage.getItem("app-user-role") as "admin" | "client" | "manager" | null;
                        if (cached) foundRole = cached;
                    }

                    if (foundRole) {
                        console.log("[AuthContext] Optimistically setting role:", foundRole);
                        setUserRole(foundRole);
                        // UNBLOCK UI IMMEDIATELY
                        setLoading(false);
                        clearTimeout(safetyTimeout);

                        // 3. Verify in Background (Critical for security if using LocalStorage cache)
                        // If we used cache or metadata is missing, we must verify
                        const isMetadataTrusted = !!currentSession.user.user_metadata?.role;

                        if (!isMetadataTrusted) {
                            console.log("[AuthContext] Verifying role in background...");
                            fetchUserRole(currentSession.user.id).then(async (verifiedRole) => {
                                if (verifiedRole) {
                                    // If verified role differs or was missing, update state
                                    if (verifiedRole !== foundRole) {
                                        setUserRole(verifiedRole);
                                    }
                                    lastFetchedUserId.current = currentSession.user.id;
                                    localStorage.setItem("app-user-role", verifiedRole);

                                    // Sync to metadata for next time (making it Trusted)
                                    if (currentSession.user.user_metadata?.role !== verifiedRole) {
                                        await supabase.auth.updateUser({
                                            data: { role: verifiedRole }
                                        });
                                    }
                                } else {
                                    // Verification Failed! Revoke access if we let them in optimistically
                                    console.warn("[AuthContext] Background verification failed. Revoking access.");
                                    setUserRole(null);
                                    toast.error("Session verification failed. Please login again.");
                                    // Optional: Force logout or redirect? 
                                    // For now, removing role might trigger ProtectedRoute to show Access Denied
                                }
                            }).catch(err => {
                                console.error("Background role check error:", err);
                            });
                        } else {
                            lastFetchedUserId.current = currentSession.user.id;
                        }
                    } else {
                        // 4. NO ROLE FOUND - MUST FETCH (Blocking)
                        // This prevents the "hanging" issue where we didn't await the fetch
                        console.log("[AuthContext] No optimistic role found. Fetching (Blocking)...");
                        try {
                            const verifiedRole = await fetchUserRole(currentSession.user.id);

                            if (verifiedRole) {
                                setUserRole(verifiedRole);
                                lastFetchedUserId.current = currentSession.user.id;
                                localStorage.setItem("app-user-role", verifiedRole);

                                // Sync to metadata
                                if (currentSession.user.user_metadata?.role !== verifiedRole) {
                                    await supabase.auth.updateUser({
                                        data: { role: verifiedRole }
                                    });
                                }
                            } else {
                                console.warn("[AuthContext] Failed to fetch role for user");
                                setUserRole(null);
                            }
                        } catch (err) {
                            console.error("[AuthContext] Error in blocking fetch:", err);
                        } finally {
                            setLoading(false);
                            clearTimeout(safetyTimeout);
                        }
                    }
                } else {
                    setUserRole(null);
                    lastFetchedUserId.current = null;
                    setLoading(false);
                    clearTimeout(safetyTimeout);
                }
            } catch (err) {
                console.error("Error in initSession:", err);
                setLoading(false);
                clearTimeout(safetyTimeout);
            }
        };

        initSession();

        // Set up auth state listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'INITIAL_SESSION') return;

                if (session?.user) {
                    setSession(session);
                    setUser(session.user);

                    // 1. Check Metadata
                    const metadataRole = session.user.user_metadata?.role as "admin" | "client" | "manager" | undefined;

                    // 2. Decide to Fetch
                    // If metadata exists, we can use it.
                    // If user changed, we MUST re-verify.
                    // If we have no role, we MUST fetch.

                    const userChanged = session.user.id !== lastFetchedUserId.current;
                    const needsRole = !metadataRole;

                    if (userChanged || needsRole) {
                        try {
                            const role = await fetchUserRole(session.user.id);
                            if (role) {
                                setUserRole(role);
                                lastFetchedUserId.current = session.user.id;

                                // SYNC: If metadata is stale/missing, update it
                                if (session.user.user_metadata?.role !== role) {
                                    console.log("[AuthContext] Syncing role to metadata:", role);
                                    await supabase.auth.updateUser({
                                        data: { role: role }
                                    });
                                }
                            } else {
                                // Fetch failed (Access Denied)
                                if (userChanged) setUserRole(null);
                            }
                        } catch (err) {
                            console.error("Error fetching user role:", err);
                        }
                    } else if (metadataRole) {
                        // Securely use metadata
                        setUserRole(metadataRole);
                        lastFetchedUserId.current = session.user.id;
                    }
                } else {
                    setSession(null);
                    setUser(null);
                    setUserRole(null);
                    lastFetchedUserId.current = null;
                }

                if (event === "SIGNED_OUT") {
                    clearStoredSession();
                    navigate("/auth");
                }

                setLoading(false);
                clearTimeout(safetyTimeout);
            }
        );

        return () => {
            subscription.unsubscribe();
            clearTimeout(safetyTimeout);
        };
    }, []); // Only run on mount

    // Separate effect for Session Timeout Logic (60 minutes) - DEPENDS ON SESSION
    useEffect(() => {
        const TIMEOUT_DURATION = 60 * 60 * 1000; // 60 minutes in milliseconds
        let logoutTimer: NodeJS.Timeout;

        const resetTimer = () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            if (session?.user) {
                logoutTimer = setTimeout(() => {
                    signOut();
                    toast.info("Session expired due to inactivity. Please sign in again.");
                }, TIMEOUT_DURATION);
            }
        };

        // Events to listen for activity
        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];

        const handleActivity = () => {
            // Debounce the restTimer slightly if needed, but usually fine
            resetTimer();
        };

        if (session?.user) {
            resetTimer();
            events.forEach(event => {
                window.addEventListener(event, handleActivity);
            });
        }

        return () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            events.forEach(event => {
                window.removeEventListener(event, handleActivity);
            });
        };
    }, [session?.user?.id]); // Re-run when user changes // Re-run effect when user changes (login/logout)

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
                if (role === 'admin' || role === 'manager') {
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
