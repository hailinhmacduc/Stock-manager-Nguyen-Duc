-- Create inventory_check_logs table for tracking stock checks
CREATE TABLE IF NOT EXISTS public.inventory_check_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_session_id UUID NOT NULL,
  serial_number TEXT NOT NULL,
  expected_location TEXT NOT NULL,
  actual_location TEXT NOT NULL,
  is_match BOOLEAN NOT NULL,
  checked_by TEXT NOT NULL,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT
);

-- Create inventory_check_sessions table to group check sessions
CREATE TABLE IF NOT EXISTS public.inventory_check_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  started_by TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  total_items_checked INTEGER DEFAULT 0,
  matched_items INTEGER DEFAULT 0,
  mismatched_items INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'IN_PROGRESS'
);

-- Enable RLS
ALTER TABLE public.inventory_check_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_check_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users to access all data)
CREATE POLICY "Allow authenticated users full access to inventory_check_logs"
  ON public.inventory_check_logs FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to inventory_check_sessions"
  ON public.inventory_check_sessions FOR ALL
  USING (true)
  WITH CHECK (true);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_check_logs_session_id ON public.inventory_check_logs(check_session_id);
CREATE INDEX IF NOT EXISTS idx_check_logs_serial ON public.inventory_check_logs(serial_number);
CREATE INDEX IF NOT EXISTS idx_check_sessions_location ON public.inventory_check_sessions(location);
CREATE INDEX IF NOT EXISTS idx_check_sessions_status ON public.inventory_check_sessions(status);

