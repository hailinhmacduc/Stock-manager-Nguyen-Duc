import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import bcrypt from 'https://esm.sh/bcryptjs@2.4.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UserPermissions {
  can_view_inventory: boolean;
  can_add_items: boolean;
  can_move_items: boolean;
  can_sell_items: boolean;
  is_full_access: boolean;
  is_admin: boolean;
}

interface CreateUserRequest {
  email: string;
  password: string;
  full_name: string;
  permissions: UserPermissions;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { email, password, full_name, permissions }: CreateUserRequest = await req.json();

    // Validate input
    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and full_name are required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Password must be at least 6 characters long' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check if user already exists
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'User with this email already exists' }),
        { 
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Hash password with bcrypt
    const saltRounds = 10;
    const password_hash = bcrypt.hashSync(password, saltRounds);

    // Determine role based on permissions
    let role = 'staff';
    if (permissions.is_admin) {
      role = 'admin';
    } else if (permissions.is_full_access) {
      role = 'manager';
    }

    // Create user
    const { data: newUser, error } = await supabaseClient
      .from('users')
      .insert({
        email,
        password_hash,
        full_name,
        role,
        can_view_inventory: permissions.can_view_inventory,
        can_add_items: permissions.can_add_items,
        can_move_items: permissions.can_move_items,
        can_sell_items: permissions.can_sell_items,
        is_full_access: permissions.is_full_access,
        is_admin: permissions.is_admin,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to create user' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Return success (without password hash)
    const { password_hash: _, ...userWithoutPassword } = newUser;

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: userWithoutPassword,
        message: 'User created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
