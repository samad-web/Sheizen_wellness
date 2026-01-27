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
    checkUserRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [userRole, setUserRole] = useState<"admin" | "client" | "manager" | null>(null);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    const lastFetchedUserId = useRef<string | null>(null);

    const fetchUserRole = async (userId: string, attempt = 1): Promise<"admin" | "client" | "manager" | null> => {
        try {
            console.log(`[AuthContext] Fetching user role via RPC for ${userId} (attempt ${attempt})`);

            // Create a promise that rejects after 3 seconds to prevent hanging
            const timeoutPromise = new Promise((_, reject) => {
                const id = setTimeout(() => {
                    clearTimeout(id);
                    reject(new Error("Role fetch timeout"));
                }, 3000);
            });

            // RPC Call
            const rpcPromise = supabase.rpc('ensure_user_role', { p_user_id: userId });

            // Race against timeout
            const { data, error } = (await Promise.race([
                rpcPromise.then(res => res),
                timeoutPromise
            ])) as any;

            if (error) {
                console.error(`[AuthContext] RPC error (attempt ${attempt}):`, error);

                // Fallback: Check 'clients' table directly WITH TIMEOUT
                try {
                    const fallbackQuery = supabase
                        .from('clients')
                        .select('id')
                        .eq('user_id', userId)
                        .maybeSingle();

                    const { data: clientData } = (await Promise.race([
                        fallbackQuery,
                        new Promise((_, reject) => setTimeout(() => reject(new Error("Fallback timeout")), 2000))
                    ])) as any;

                    if (clientData) {
                        console.log("[AuthContext] Fallback: User found in clients table. Assigning 'client' role.");
                        return 'client';
                    }
                } catch (fallbackErr) {
                    console.error("Fallback check failed:", fallbackErr);
                }

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
            try {
                const fallbackQuery = supabase
                    .from('clients')
                    .select('id')
                    .eq('user_id', userId)
                    .maybeSingle();

                const { data: clientData } = (await Promise.race([
                    fallbackQuery,
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Fallback timeout")), 2000))
                ])) as any;

                if (clientData) {
                    console.log("[AuthContext] Fallback: User found in clients table. Assigning 'client' role.");
                    return 'client';
                }
            } catch (fallbackErr) {
                console.error("Fallback check failed:", fallbackErr);
            }

            if (attempt < 2) {
                return fetchUserRole(userId, attempt + 1);
            }
            return null;
        }
    };

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
        const safetyTimeout = setTimeout(() => {
            setLoading((prev) => {
                if (prev) {
                    console.warn("[AuthContext] Force clearing loading state after 10s timeout");
                    return false;
                }
                return prev;
            });
        }, 10000);

        const initSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("[AuthContext] Error getting session:", error);
                    setLoading(false);
                    return;
                }

                const currentSession = data?.session ?? null;
                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                if (!currentSession?.user) {
                    setLoading(false);
                    return;
                }

                try {
                    let foundRole = currentSession.user.user_metadata?.role as "admin" | "client" | "manager" | undefined;

                    if (!foundRole) {
                        const cached = localStorage.getItem("app-user-role") as "admin" | "client" | "manager" | null;
                        if (cached) foundRole = cached;
                    }

                    if (foundRole) {
                        console.log("[AuthContext] Optimistically setting role:", foundRole);
                        setUserRole(foundRole);
                        setLoading(false);

                        const isMetadataTrusted = !!currentSession.user.user_metadata?.role;

                        // ALWAYS verify against DB, regardless of trust
                        fetchUserRole(currentSession.user.id).then(async (verifiedRole) => {
                            if (verifiedRole && verifiedRole !== foundRole) {
                                console.log("[AuthContext] Paranoid check found mismatch. DB says:", verifiedRole, "Metadata says:", foundRole);
                                setUserRole(verifiedRole);
                                localStorage.setItem("app-user-role", verifiedRole);
                                // FORCE update metadata to match DB truth
                                await supabase.auth.updateUser({ data: { role: verifiedRole } });
                            } else {
                                console.log("[AuthContext] Role verified against DB:", verifiedRole);
                            }
                        }).catch(err => console.error("Background paranoid check error", err));
                    } else {
                        console.log("[AuthContext] No optimistic role found. Fetching (Blocking)...");
                        const verifiedRole = await fetchUserRole(currentSession.user.id);
                        if (verifiedRole) {
                            console.log("[AuthContext] Setting verified role:", verifiedRole);
                            setUserRole(verifiedRole);
                            localStorage.setItem("app-user-role", verifiedRole);
                            await supabase.auth.updateUser({ data: { role: verifiedRole } });
                        } else {
                            setUserRole(null);
                        }
                        setLoading(false);
                    }

                    // Background verification: Always verify role against DB if we have a session
                    // This handles cases where database role changed but metadata is stale.
                    if (currentSession.user.id) {
                        fetchUserRole(currentSession.user.id).then(async (verifiedRole) => {
                            if (verifiedRole && verifiedRole !== foundRole) {
                                console.log("[AuthContext] Role mismatch detected. Updating to:", verifiedRole);
                                setUserRole(verifiedRole);
                                localStorage.setItem("app-user-role", verifiedRole);
                                await supabase.auth.updateUser({ data: { role: verifiedRole } });
                            }
                        }).catch(err => console.error("Background role refresh failed", err));
                    }
                } catch (roleError) {
                    console.error("[AuthContext] Error determining role:", roleError);
                    setLoading(false);
                }
            } catch (err) {
                console.error("[AuthContext] Critical error in initSession:", err);
                setLoading(false);
            }
        };

        initSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (event === 'INITIAL_SESSION') return;

                if (session?.user) {
                    setSession(session);
                    setUser(session.user);

                    const metadataRole = session.user.user_metadata?.role as "admin" | "client" | "manager" | undefined;
                    const userChanged = session.user.id !== lastFetchedUserId.current;
                    const needsRole = !metadataRole;

                    if (userChanged || needsRole) {
                        try {
                            const role = await fetchUserRole(session.user.id);
                            console.log("[AuthContext] AuthStateChange: DB Role is", role);
                            if (role) {
                                setUserRole(role);
                                lastFetchedUserId.current = session.user.id;
                                if (session.user.user_metadata?.role !== role) {
                                    console.log("[AuthContext] Syncing metadata with DB role:", role);
                                    await supabase.auth.updateUser({ data: { role: role } });
                                }
                            } else if (userChanged) {
                                setUserRole(null);
                            }
                        } catch (err) {
                            console.error("Error fetching user role:", err);
                        }
                    } else if (metadataRole) {
                        // Even if metadata exists, trigger a background refresh to be safe
                        setUserRole(metadataRole);
                        lastFetchedUserId.current = session.user.id;
                        fetchUserRole(session.user.id).then(verifiedRole => {
                            if (verifiedRole && verifiedRole !== metadataRole) {
                                console.warn("[AuthContext] Metadata vs DB Mismatch! Fixing...", { metadataRole, verifiedRole });
                                setUserRole(verifiedRole);
                                supabase.auth.updateUser({ data: { role: verifiedRole } });
                            }
                        });
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
    }, []);

    useEffect(() => {
        const TIMEOUT_DURATION = 60 * 60 * 1000;
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

        const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'];
        const handleActivity = () => resetTimer();

        if (session?.user) {
            resetTimer();
            events.forEach(event => window.addEventListener(event, handleActivity));
        }

        return () => {
            if (logoutTimer) clearTimeout(logoutTimer);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [session?.user?.id]);

    const checkUserRole = async () => {
        if (session?.user?.id) {
            const role = await fetchUserRole(session.user.id);
            setUserRole(role);
            if (role) {
                localStorage.setItem("app-user-role", role);
                await supabase.auth.updateUser({ data: { role: role } });
            }
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const signInPromise = supabase.auth.signInWithPassword({ email, password });
            const timeoutPromise = new Promise((_, reject) => {
                const id = setTimeout(() => {
                    clearTimeout(id);
                    reject(new Error("Sign in request timed out. Please check your connection."));
                }, 5000);
            });

            const { data, error } = (await Promise.race([signInPromise, timeoutPromise])) as any;

            if (error) {
                console.error("SignIn: Supabase error", error);
                toast.error(error.message);
                return { error };
            }

            if (data.session) {
                setSession(data.session);
                setUser(data.session.user);
                const role = await fetchUserRole(data.session.user.id);
                setUserRole(role);

                if (role === 'admin' || role === 'manager') {
                    navigate("/admin");
                } else if (role === 'client') {
                    navigate("/dashboard");
                } else {
                    navigate("/onboarding");
                }
            }

            toast.success("Signed in successfully!");
            return { error: null };
        } catch (error: any) {
            console.error("SignIn: Unexpected error", error);
            const message = error.message || "An error occurred during sign in";
            toast.error(message);
            return { error: { message } };
        }
    };

    const signUp = async (email: string, password: string, name: string, phone: string) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/`,
                data: { name, phone },
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
            await supabase.auth.signOut({ scope: "global" });
        } catch (error) {
            console.error("Unexpected error during sign out:", error);
        } finally {
            localStorage.removeItem("app-user-role");
            clearStoredSession();
            setUser(null);
            setSession(null);
            setUserRole(null);
            navigate("/auth");
            toast.success("Signed out successfully");
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, userRole, loading, signIn, signUp, signOut, checkUserRole }}>
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
