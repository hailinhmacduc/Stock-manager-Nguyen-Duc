import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Package, BarChart3, Move, Laptop, Users, AlertCircle, ClipboardCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, permissions } = useAuth();
  const location = useLocation();
  const [pendingReportsCount, setPendingReportsCount] = useState(0);

  const isActive = (path: string) => location.pathname === path;

  useEffect(() => {
    if (permissions.canViewReports()) {
      fetchPendingReportsCount();
      // Update count every 30 seconds
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
    if (user?.is_admin) return <Badge className="bg-gray-900 text-white text-xs">Admin</Badge>;
    if (user?.is_full_access) return <Badge className="bg-red-100 text-red-800 text-xs">Toàn Quyền</Badge>;
    return <Badge variant="outline" className="text-xs">Nhân Viên</Badge>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <nav className="border-b bg-white shadow-sm">
        <div className="container mx-auto px-2 md:px-4">
          <div className="flex h-14 md:h-16 items-center justify-between">
            <div className="flex items-center gap-2 md:gap-6">
              <Link to="/dashboard" className="flex items-center gap-1 md:gap-2 hover:opacity-80 transition-opacity">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-1.5 md:p-2 rounded-lg shadow-md">
                  <Laptop className="h-4 w-4 md:h-5 md:w-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <span className="font-bold text-base md:text-lg bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Quản Lý Tồn Kho
                  </span>
                  <p className="text-xs text-muted-foreground">Laptop Store</p>
                </div>
              </Link>
              <div className="flex gap-1 md:gap-2 overflow-x-auto">
                <Link to="/dashboard">
                  <Button
                    variant={isActive('/dashboard') ? 'default' : 'ghost'}
                    size="sm"
                    className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
                  >
                    <BarChart3 className="h-3 w-3 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">Tổng Quan</span>
                  </Button>
                </Link>
                {permissions.canViewInventory() && (
                  <Link to="/inventory">
                    <Button
                      variant={isActive('/inventory') ? 'default' : 'ghost'}
                      size="sm"
                      className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
                    >
                      <Package className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Kho Hàng</span>
                    </Button>
                  </Link>
                )}
                {permissions.canMoveItems() && (
                  <Link to="/move">
                    <Button
                      variant={isActive('/move') ? 'default' : 'ghost'}
                      size="sm"
                      className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
                    >
                      <Move className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Luân Chuyển</span>
                    </Button>
                  </Link>
                )}
                {permissions.canViewInventory() && (
                  <Link to="/inventory-check">
                    <Button
                      variant={isActive('/inventory-check') ? 'default' : 'ghost'}
                      size="sm"
                      className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
                    >
                      <ClipboardCheck className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Kiểm Kho</span>
                    </Button>
                  </Link>
                )}
                {permissions.canViewReports() && (
                  <Link to="/reports">
                    <Button
                      variant={isActive('/reports') ? 'default' : 'ghost'}
                      size="sm"
                      className="gap-1 md:gap-2 relative text-xs md:text-sm px-2 md:px-3"
                    >
                      <AlertCircle className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Báo Cáo Lỗi</span>
                      {pendingReportsCount > 0 && (
                        <Badge className="bg-red-500 text-white text-xs px-1 py-0 min-w-[16px] h-4 md:min-w-[20px] md:h-5">
                          {pendingReportsCount}
                        </Badge>
                      )}
                    </Button>
                  </Link>
                )}
                {permissions.canManageUsers() && (
                  <Link to="/users">
                    <Button
                      variant={isActive('/users') ? 'default' : 'ghost'}
                      size="sm"
                      className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3"
                    >
                      <Users className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Users</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <div className="text-right hidden md:block">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-xs md:text-sm font-medium">{user?.full_name}</p>
                  {getUserRoleBadge()}
                </div>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button onClick={logout} variant="ghost" size="sm" className="gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-3">
                <LogOut className="h-3 w-3 md:h-4 md:w-4" />
                <span className="hidden sm:inline">Đăng Xuất</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-2 md:px-4 py-4 md:py-8">{children}</main>
    </div>
  );
};
