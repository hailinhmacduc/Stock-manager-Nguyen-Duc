import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Package, BarChart3, Move, Users, AlertCircle, ClipboardCheck, Key } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { BottomNavigation } from '@/components/BottomNavigation';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, permissions } = useAuth();
  const location = useLocation();
  const [pendingReportsCount, setPendingReportsCount] = useState(0);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (permissions.canViewReports()) {
      fetchPendingReportsCount();
      const interval = setInterval(fetchPendingReportsCount, 30000);
      return () => clearInterval(interval);
    }
  }, [permissions]);

  const fetchPendingReportsCount = async () => {
    const { count } = await supabase
      .from('error_reports')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'PENDING');
    setPendingReportsCount(count || 0);
  };

  const getUserRoleBadge = () => {
    if (user?.is_admin) return <Badge className="bg-slate-900 text-white text-xs">Admin</Badge>;
    if (user?.is_full_access) return <Badge className="bg-blue-100 text-blue-800 text-xs">Toàn Quyền</Badge>;
    return <Badge variant="outline" className="text-xs">Nhân Viên</Badge>;
  };

  const navLinkClass = (active: boolean) =>
    `gap-2 text-sm px-4 py-2 font-medium transition-all duration-200 rounded-lg ${active
      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Navigation */}
      <nav className="hidden md:block border-b border-slate-200 bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-6">
              <Link to="/dashboard" className="flex items-center gap-2.5 transition-opacity hover:opacity-80">
                <img src="/logo.png" alt="Logo" className="h-9 w-9" />
                <div>
                  <span className="font-bold text-lg text-slate-900">Quản Lý Tồn Kho</span>
                  <p className="text-xs text-slate-500">Điện máy Nguyễn Đức</p>
                </div>
              </Link>

              <div className="flex gap-1 ml-4">
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className={navLinkClass(isActive('/dashboard'))}>
                    <BarChart3 className="h-4 w-4" />
                    <span>Tổng Quan</span>
                  </Button>
                </Link>

                {permissions.canViewInventory() && (
                  <Link to="/inventory">
                    <Button variant="ghost" size="sm" className={navLinkClass(isActive('/inventory'))}>
                      <Package className="h-4 w-4" />
                      <span>Kho Hàng</span>
                    </Button>
                  </Link>
                )}

                {permissions.canMoveItems() && (
                  <Link to="/move">
                    <Button variant="ghost" size="sm" className={navLinkClass(isActive('/move'))}>
                      <Move className="h-4 w-4" />
                      <span>Luân Chuyển</span>
                    </Button>
                  </Link>
                )}

                {permissions.canViewInventory() && (
                  <Link to="/inventory-check">
                    <Button variant="ghost" size="sm" className={navLinkClass(isActive('/inventory-check'))}>
                      <ClipboardCheck className="h-4 w-4" />
                      <span>Kiểm Kho</span>
                    </Button>
                  </Link>
                )}

                {permissions.canViewReports() && (
                  <Link to="/reports">
                    <Button variant="ghost" size="sm" className={`${navLinkClass(isActive('/reports'))} relative`}>
                      <AlertCircle className="h-4 w-4" />
                      <span>Báo Cáo</span>
                      {pendingReportsCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 min-w-[18px] h-5 shadow-sm">
                          {pendingReportsCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )}

                {permissions.canManageUsers() && (
                  <Link to="/users">
                    <Button variant="ghost" size="sm" className={navLinkClass(isActive('/users'))}>
                      <Users className="h-4 w-4" />
                      <span>Users</span>
                    </Button>
                  </Link>
                )}

                {permissions.isAdmin() && (
                  <Link to="/api-keys">
                    <Button variant="ghost" size="sm" className={navLinkClass(isActive('/api-keys'))}>
                      <Key className="h-4 w-4" />
                      <span>API</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-sm font-semibold text-slate-800">{user?.full_name}</p>
                  {getUserRoleBadge()}
                </div>
                <p className="text-xs text-slate-500">{user?.email}</p>
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="text-sm px-3 py-2 font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 rounded-lg"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <header className="md:hidden bg-white/95 backdrop-blur-lg shadow-sm sticky top-0 z-40 border-b border-slate-200">
        <div className="px-3 py-2.5">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2">
              <img src="/logo.png" alt="Logo" className="h-8 w-8" />
              <div>
                <span className="font-bold text-sm text-slate-900">Quản Lý Tồn Kho</span>
                <p className="text-xs text-slate-500 leading-none">Điện máy Nguyễn Đức</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-xs font-semibold text-slate-800">{user?.full_name}</p>
                {getUserRoleBadge()}
              </div>
              <Button
                onClick={logout}
                variant="ghost"
                size="sm"
                className="text-xs px-2 py-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 pb-24 md:pb-6">{children}</main>

      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
    </div>
  );
};
