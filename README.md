# Laptop Inventory Management System

A full-stack internal inventory web application for tracking laptop retail stock by serial number, storage locations, aging, and capital lock analysis.

## Features

- **SKU Dashboard**: View capital lock analysis and aging reports for each product SKU
- **Inventory Tracking**: Track individual laptop units by serial number with detailed filtering
- **Stock Movement**: Log internal movements between storage locations (Display T1, Storage T1, Warehouse T3)
- **Sales Recording**: Mark items as sold and track sales history
- **Authentication**: Simple email/password login system for staff access

## Tech Stack

- **Frontend**: React 18 with TypeScript, TailwindCSS, shadcn/ui components
- **Backend**: Supabase (PostgreSQL database + Edge Functions)
- **Authentication**: Custom auth using bcrypt password hashing
- **Deployment**: Built with Vite for fast development and optimized production builds

## Database Schema

### Tables

1. **users** - Staff authentication
   - email, password_hash, role, full_name

2. **sku_info** - Product SKU master data
   - sku_id, brand, model_name, spec, default_cost

3. **inventory_items** - Individual laptop units
   - serial_number, sku_id, status, condition, location, cost, supplier, received_at, sold_at

4. **stock_move_logs** - Movement history
   - item_id, serial_number, from_location, to_location, moved_by, moved_at

### Storage Locations

- **DISPLAY_T1**: Display units on floor 1 (demo units for customers)
- **STORAGE_T1**: Storage cabinet floor 1 (sealed units ready to sell)
- **WAREHOUSE_T3**: Warehouse floor 3 (backup stock)

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (already configured for this project)

### Installation

1. Clone the repository:
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

2. Install dependencies:
```bash
npm install
```

3. The project is already connected to Supabase. Environment variables are pre-configured.

4. Start the development server:
```bash
npm run dev
```

5. Open your browser to `http://localhost:8080`

### Login Credentials

The database is seeded with demo users:

**Admin Account:**
- Email: `admin@store.com`
- Password: `password123`

**Staff Account:**
- Email: `staff@store.com`
- Password: `password123`

## Database Migrations

The database schema is automatically created via Supabase migrations. The migration includes:

- All table schemas with proper foreign keys
- Row Level Security (RLS) policies
- Seed data (2 SKUs, 3 inventory items, 2 users)

To view or modify the database:
1. Visit the [Supabase Dashboard](https://supabase.com/dashboard/project/ewzntoebiavqojdesfip)
2. Navigate to Table Editor or SQL Editor

## API Endpoints

All API logic is handled through Supabase:

- **GET /api/sku-status**: SKU summary with capital lock & aging (implemented via frontend query)
- **GET /api/items**: Fetch inventory items with filters (Supabase direct query)
- **POST /api/items**: Add new inventory item (Supabase insert)
- **POST /api/move**: Move item between locations (Supabase update + log insert)
- **POST /api/sell**: Mark item as sold (Supabase update)
- **POST /auth-login**: Custom authentication endpoint (Supabase Edge Function)

## Application Structure

```
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── Layout.tsx      # App layout with navigation
│   │   ├── AddItemDialog.tsx
│   │   ├── SellItemDialog.tsx
│   │   └── ProtectedRoute.tsx
│   ├── contexts/           # React contexts
│   │   └── AuthContext.tsx # Authentication state
│   ├── pages/              # Main application pages
│   │   ├── Login.tsx       # Login page
│   │   ├── Dashboard.tsx   # SKU dashboard
│   │   ├── Inventory.tsx   # Inventory listing
│   │   └── MoveItem.tsx    # Stock movement
│   ├── integrations/       # Supabase integration
│   └── hooks/              # Custom React hooks
├── supabase/
│   └── functions/
│       └── auth-login/     # Authentication edge function
└── README.md
```

## Development Guide

### Adding New Inventory Items

1. Navigate to "Inventory" page
2. Click "Add New Item" button
3. Fill in: SKU, Serial Number, Cost, Supplier, Location, Condition
4. Submit to add to database

### Moving Stock

1. Navigate to "Move Item" page
2. Enter serial number
3. Select destination location
4. Enter staff name (moved_by)
5. Submit to log movement

### Recording Sales

1. Navigate to "Inventory" page
2. Find the item (use filters if needed)
3. Click "Sell" button next to available items
4. Confirm to mark as sold

### Key Business Logic

**Aging Calculation:**
- Items older than 30 days are highlighted in yellow
- Helps identify slow-moving stock that needs promotion

**Capital Lock:**
- Tracks total cost of available inventory per SKU
- SKUs with >5 units AND >100M VND capital are highlighted in bold
- Helps identify which products are tying up the most money

**Status Indicators:**
- AVAILABLE: Normal stock ready to sell
- SOLD: Already sold to customers (red background)
- OPEN_BOX: Demo units, needs discount (yellow background)
- HOLD: Temporarily reserved
- DEFECT: Damaged/defective units

## Deployment

This project can be deployed on Lovable:

1. Push changes to your Git repository
2. Visit [Lovable Dashboard](https://lovable.dev/projects/c0dfd3f9-1ad1-4e96-8a1d-6b84dbfee5bb)
3. Click "Share" → "Publish"
4. Your app will be deployed with a production URL

## Database Management

### Viewing Data

Access the Supabase dashboard:
- Tables: https://supabase.com/dashboard/project/ewzntoebiavqojdesfip/editor
- SQL Editor: https://supabase.com/dashboard/project/ewzntoebiavqojdesfip/sql/new

### Adding More Seed Data

Use the SQL Editor to insert more SKUs or items:

```sql
-- Add new SKU
INSERT INTO sku_info (sku_id, brand, model_name, spec, default_cost)
VALUES ('HP-VICTUS-4060-16-512-144HZ', 'HP', 'Victus 16', 'Core i5-13500H / 16GB / 512GB / RTX 4060 / 16" 144Hz', 28500000);

-- Add new inventory item
INSERT INTO inventory_items (sku_id, serial_number, status, condition, location, cost, supplier)
VALUES ('HP-VICTUS-4060-16-512-144HZ', 'HPVICTUS-DEF456', 'AVAILABLE', 'NEW_SEAL', 'WAREHOUSE_T3', 28500000, 'NhaCungCapC');
```

## Troubleshooting

### Can't see data after adding items
- Check RLS policies are enabled in Supabase dashboard
- Verify you're logged in (check localStorage for 'inventory_user')

### Login not working
- Edge function 'auth-login' must be deployed
- Check Supabase Functions logs for errors
- Verify users table has seeded data

### Items not moving/selling
- Check browser console for errors
- Verify Supabase connection is active
- Ensure serial numbers match exactly (case-sensitive)

## Support

For issues or questions:
- Check the [Lovable Documentation](https://docs.lovable.dev/)
- Visit the [Supabase Documentation](https://supabase.com/docs)
- Review console logs in browser DevTools

## License

Internal use only - Laptop Retail Store Inventory System
