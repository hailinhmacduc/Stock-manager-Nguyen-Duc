import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Package, BarChart3, Move } from 'lucide-react';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b bg-card">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="flex items-center gap-2">
                <Package className="h-6 w-6 text-primary" />
                <span className="font-semibold text-lg">Laptop Inventory</span>
              </Link>
              <div className="flex gap-2">
                <Link to="/dashboard">
                  <Button
                    variant={isActive('/dashboard') ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <BarChart3 className="h-4 w-4" />
                    SKU Dashboard
                  </Button>
                </Link>
                <Link to="/inventory">
                  <Button
                    variant={isActive('/inventory') ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Package className="h-4 w-4" />
                    Inventory
                  </Button>
                </Link>
                <Link to="/move">
                  <Button
                    variant={isActive('/move') ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-2"
                  >
                    <Move className="h-4 w-4" />
                    Move Item
                  </Button>
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">
                {user?.full_name} ({user?.role})
              </span>
              <Button onClick={logout} variant="ghost" size="sm" className="gap-2">
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
};
