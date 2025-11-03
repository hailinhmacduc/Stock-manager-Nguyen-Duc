-- Migration: Fix foreign key constraints to allow CASCADE DELETE
-- Created: 2025-11-03

-- Drop existing foreign key constraint and recreate with CASCADE DELETE
ALTER TABLE public.stock_move_logs 
DROP CONSTRAINT IF EXISTS stock_move_logs_item_id_fkey;

ALTER TABLE public.stock_move_logs 
ADD CONSTRAINT stock_move_logs_item_id_fkey 
FOREIGN KEY (item_id) 
REFERENCES public.inventory_items(id) 
ON DELETE CASCADE;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_stock_move_logs_item_id ON public.stock_move_logs(item_id);

-- Add comment
COMMENT ON CONSTRAINT stock_move_logs_item_id_fkey ON public.stock_move_logs IS 'Foreign key with CASCADE DELETE to allow item deletion';
