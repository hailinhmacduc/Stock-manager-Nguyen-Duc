-- Create users table for authentication
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'staff',
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sku_info table
CREATE TABLE IF NOT EXISTS public.sku_info (
  sku_id TEXT PRIMARY KEY,
  brand TEXT NOT NULL,
  model_name TEXT NOT NULL,
  spec TEXT NOT NULL,
  default_cost NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS public.inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku_id TEXT NOT NULL REFERENCES public.sku_info(sku_id),
  serial_number TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE',
  condition TEXT NOT NULL DEFAULT 'NEW_SEAL',
  location TEXT NOT NULL,
  cost NUMERIC NOT NULL,
  supplier TEXT,
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_move_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sold_at TIMESTAMP WITH TIME ZONE
);

-- Create stock_move_logs table
CREATE TABLE IF NOT EXISTS public.stock_move_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.inventory_items(id),
  serial_number TEXT NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  moved_by TEXT NOT NULL,
  moved_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sku_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_move_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow authenticated users to access all data)
CREATE POLICY "Allow authenticated users full access to users"
  ON public.users FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to sku_info"
  ON public.sku_info FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to inventory_items"
  ON public.inventory_items FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Allow authenticated users full access to stock_move_logs"
  ON public.stock_move_logs FOR ALL
  USING (true)
  WITH CHECK (true);

-- Insert seed data
-- Seed users (password is 'password123' hashed with bcrypt)
INSERT INTO public.users (email, password_hash, role, full_name) VALUES
  ('admin@store.com', '$2a$10$rKvHPqzYeHqLqWXqmQYn2OGKqH7J8v6UmHzj4iBqOJLJj8K8YqHxK', 'admin', 'Admin User'),
  ('staff@store.com', '$2a$10$rKvHPqzYeHqLqWXqmQYn2OGKqH7J8v6UmHzj4iBqOJLJj8K8YqHxK', 'staff', 'Staff User')
ON CONFLICT (email) DO NOTHING;

-- Seed SKUs
INSERT INTO public.sku_info (sku_id, brand, model_name, spec, default_cost) VALUES
  ('DELL-7440F-I5-16-512-FHD', 'Dell', 'Inspiron 14 Plus 7440F', 'Core 5-210H / 16GB / 512GB / 14" FHD', 18500000),
  ('LENOVO-LOQ-4050-12-512-144HZ', 'Lenovo', 'LOQ 15ARP9', 'Ryzen 5-7235HS / 12GB / 512GB / RTX 4050 / 15.6" 144Hz', 23500000)
ON CONFLICT (sku_id) DO NOTHING;

-- Seed inventory items
INSERT INTO public.inventory_items (sku_id, serial_number, status, condition, location, cost, supplier, received_at) VALUES
  ('DELL-7440F-I5-16-512-FHD', 'DELL7440F-ABC123', 'AVAILABLE', 'NEW_SEAL', 'WAREHOUSE_T3', 18500000, 'NhaCungCapA', NOW() - INTERVAL '45 days'),
  ('DELL-7440F-I5-16-512-FHD', 'DELL7440F-ABC124', 'AVAILABLE', 'OPEN_BOX', 'DISPLAY_T1', 18500000, 'NhaCungCapA', NOW() - INTERVAL '35 days'),
  ('LENOVO-LOQ-4050-12-512-144HZ', 'LOQ4050-XYZ999', 'AVAILABLE', 'NEW_SEAL', 'STORAGE_T1', 23500000, 'NhaCungCapB', NOW() - INTERVAL '10 days')
ON CONFLICT (serial_number) DO NOTHING;