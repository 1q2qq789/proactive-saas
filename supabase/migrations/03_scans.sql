-- Create scans table for scan results
CREATE TABLE IF NOT EXISTS public.scans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title VARCHAR(255),
    content_source TEXT,
    mode VARCHAR(10) DEFAULT 'keyword',
    summary JSONB DEFAULT '{}'::jsonb,
    issues JSONB DEFAULT '[]'::jsonb,
    score_avg INT,
    score_max INT,
    duration_ms INT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.scans ENABLE ROW LEVEL SECURITY;

-- Users can read their own scans
CREATE POLICY "Users can read own scans"
    ON public.scans FOR SELECT
    USING (user_id = auth.uid());

-- Users can insert their own scans
CREATE POLICY "Users can insert own scans"
    ON public.scans FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Users can delete their own scans
CREATE POLICY "Users can delete own scans"
    ON public.scans FOR DELETE
    USING (user_id = auth.uid());

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON public.scans (user_id);
CREATE INDEX IF NOT EXISTS idx_scans_created_at ON public.scans (created_at DESC);

-- Add quota columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS scan_quota_remaining INT DEFAULT 3;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS llm_quota_remaining INT DEFAULT 1;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_pro BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ;
