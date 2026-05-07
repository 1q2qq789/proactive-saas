-- Create agents table (Agent 配置表)
CREATE TABLE IF NOT EXISTS public.agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    checklists JSONB DEFAULT '[]'::jsonb,
    notification_channels JSONB DEFAULT '[]'::jsonb,
    schedule TEXT, -- cron expression for scheduling agent runs
    last_run_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.agents ENABLE ROW LEVEL SECURITY;

-- Agents can only be seen by their owner
CREATE POLICY "Users can read own agents"
    ON public.agents
    FOR SELECT
    USING (user_id = auth.uid());

-- Agents can only be created by the authenticated user
CREATE POLICY "Users can create own agents"
    ON public.agents
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Agents can only be updated by their owner
CREATE POLICY "Users can update own agents"
    ON public.agents
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Agents can only be deleted by their owner
CREATE POLICY "Users can delete own agents"
    ON public.agents
    FOR DELETE
    USING (user_id = auth.uid());

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_user_id ON public.agents (user_id);

-- Create an index on schedule for querying agents due to run
CREATE INDEX IF NOT EXISTS idx_agents_schedule ON public.agents (schedule);

-- Auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_agents_updated_at
    BEFORE UPDATE ON public.agents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
