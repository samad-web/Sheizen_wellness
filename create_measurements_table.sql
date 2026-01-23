-- Create client_measurements table
CREATE TABLE IF NOT EXISTS public.client_measurements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    arm_inches NUMERIC,
    chest_inches NUMERIC,
    waist_inches NUMERIC,
    hip_inches NUMERIC,
    thigh_inches NUMERIC,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.client_measurements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Clients can view their own measurements"
    ON public.client_measurements
    FOR SELECT
    USING (auth.uid()::text IN (
        SELECT user_id FROM public.clients WHERE id = client_measurements.client_id
    ));

CREATE POLICY "Clients can insert their own measurements"
    ON public.client_measurements
    FOR INSERT
    WITH CHECK (auth.uid()::text IN (
        SELECT user_id FROM public.clients WHERE id = client_measurements.client_id
    ));

CREATE POLICY "Admins can view all measurements"
    ON public.client_measurements
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles
            WHERE user_id = auth.uid()::text
            AND role IN ('admin', 'manager')
        )
    );

-- Create index for faster querying by client and date
CREATE INDEX idx_client_measurements_client_date ON public.client_measurements(client_id, recorded_at DESC);
