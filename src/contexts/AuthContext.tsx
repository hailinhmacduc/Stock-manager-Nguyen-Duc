import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, PermissionChecker } from '@/lib/permissions';

interface AuthContextType {
  user: User | null;
  permissions: PermissionChecker;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  loading: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const permissions = new PermissionChecker(user);

  useEffect(() => {
    // Check for stored session
    const storedUser = localStorage.getItem('inventory_user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data, error: invokeError } = await supabase.functions.invoke<{ user: User; error?: string }>('auth-login', {
        body: { email, password },
      });

      // Handle function invoke errors (network, etc.)
      if (invokeError) {
        console.error('Login invoke error:', invokeError);
        
        // Try to extract error message from the response
        if (invokeError.message && invokeError.message.includes('Invalid credentials')) {
          return { error: 'Email hoặc mật khẩu không đúng' };
        }
        
        return { error: invokeError.message || 'Lỗi kết nối. Vui lòng thử lại.' };
      }

      // Handle successful response with user data
      if (data?.user) {
        setUser(data.user);
        localStorage.setItem('inventory_user', JSON.stringify(data.user));
        return { error: null };
      }

      // Handle error response from function
      if (data?.error) {
        if (data.error === 'Invalid credentials') {
          return { error: 'Email hoặc mật khẩu không đúng' };
        }
        return { error: data.error };
      }

      return { error: 'Đăng nhập thất bại. Vui lòng thử lại.' };
    } catch (error) {
      console.error('Login error:', error);
      return { error: 'Lỗi mạng. Vui lòng kiểm tra kết nối và thử lại.' };
    }
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem('inventory_user');
  };

  const refreshUser = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!error && data) {
        setUser(data as User);
        localStorage.setItem('inventory_user', JSON.stringify(data));
      }
    } catch (error) {
      console.error('Error refreshing user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, permissions, login, logout, loading, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
