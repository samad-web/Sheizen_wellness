import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );

        const { email, password, userData } = await req.json();

        if (!email || !password) {
            return new Response(
                JSON.stringify({ error: "Email and password are required" }),
                {
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                    status: 200,
                }
            );
        }

        // Create user with auto-confirmed email
        const { data: user, error: createUserError } =
            await supabaseClient.auth.admin.createUser({
                email,
                password,
                email_confirm: true, // Auto-confirm email
                user_metadata: userData,
            });

        if (createUserError) {
            throw createUserError;
        }

        // Explicitly create profile record
        const { error: profileError } = await supabaseClient
            .from("profiles")
            .upsert({
                id: user.user.id,
                email: email,
                name: userData.name || "",
                phone: userData.phone || "",
            }, { onConflict: 'id' });

        if (profileError) {
            console.error("Profile creation error:", profileError);
        }

        // Explicitly assign 'admin' role
        const { error: roleError } = await supabaseClient
            .from("user_roles")
            .upsert({
                user_id: user.user.id,
                role: "admin"
            }, { onConflict: 'user_id' });

        if (roleError) {
            console.error("Role assignment error:", roleError);
            throw roleError;
        }

        return new Response(JSON.stringify({ user }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message || String(error) }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    }
});
