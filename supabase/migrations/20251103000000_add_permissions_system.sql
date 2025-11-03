-- Migration: Add permissions system
-- Created: 2025-11-03

-- Add permissions columns to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS can_view_inventory BOOLEAN DEFAULT true;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS can_add_items BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS can_move_items BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS can_sell_items BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_full_access BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create error_reports table for user error reporting
CREATE TABLE IF NOT EXISTS public.error_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reported_by UUID NOT NULL REFERENCES public.users(id),
  item_serial TEXT,
  error_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES public.users(id),
  resolution_notes TEXT
);

-- Enable RLS on error_reports
ALTER TABLE public.error_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policy for error_reports
CREATE POLICY "Allow authenticated users to view their own reports and admins see all"
  ON public.error_reports FOR SELECT
  USING (
    reported_by = auth.uid() OR 
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Allow authenticated users to create error reports"
  ON public.error_reports FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow admins to update error reports"
  ON public.error_reports FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- Update existing admin user
UPDATE public.users 
SET 
  can_view_inventory = true,
  can_add_items = true,
  can_move_items = true,
  can_sell_items = true,
  is_full_access = true,
  is_admin = true
WHERE email = 'admin@store.com';

-- Update existing staff user with limited permissions
UPDATE public.users 
SET 
  can_view_inventory = true,
  can_add_items = true,
  can_move_items = false,
  can_sell_items = false,
  is_full_access = false,
  is_admin = false
WHERE email = 'staff@store.com';

-- Add comments
COMMENT ON COLUMN public.users.can_view_inventory IS 'Permission to view inventory list';
COMMENT ON COLUMN public.users.can_add_items IS 'Permission to add new items to inventory';
COMMENT ON COLUMN public.users.can_move_items IS 'Permission to move items between locations';
COMMENT ON COLUMN public.users.can_sell_items IS 'Permission to mark items as sold';
COMMENT ON COLUMN public.users.is_full_access IS 'Full access except user management';
COMMENT ON COLUMN public.users.is_admin IS 'Full admin access including user management';
COMMENT ON TABLE public.error_reports IS 'Error reports from users to admins';

