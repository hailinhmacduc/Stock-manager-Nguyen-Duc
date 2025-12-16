import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, Package, BarChart3, Move, Laptop, Users, AlertCircle, ClipboardCheck } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Desktop Navigation - Hidden on Mobile */}
      <nav className="hidden md:block border-b bg-white/80 backdrop-blur-lg shadow-lg sticky top-0 z-50">
        <div className="container mx-auto px-2 md:px-4">
          <div className="flex h-16 md:h-20 items-center justify-between">
            <div className="flex items-center gap-2 md:gap-6">
              <Link to="/dashboard" className="flex items-center gap-2 md:gap-3 hover:scale-105 transition-transform duration-200 flex-shrink-0">
                <img src="/logo.png" alt="Logo" className="h-10 w-10 md:h-12 md:w-12" />
                <div className="hidden sm:block">
                  <span className="font-bold text-lg md:text-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    Quản Lý Tồn Kho
                  </span>
                  <p className="text-xs text-muted-foreground font-medium">💻 Điện máy Nguyễn Đức</p>
                </div>
              </Link>
              <div className="flex gap-1 md:gap-2 overflow-x-auto scrollbar-hide flex-1">
                <Link to="/dashboard">
                  <Button
                    variant={isActive('/dashboard') ? 'default' : 'ghost'}
                    size="sm"
                    className={`gap-1 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 font-medium transition-all duration-200 ${
                      isActive('/dashboard') 
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg hover:shadow-xl' 
                        : 'hover:bg-blue-50'
                    }`}
                  >
                    <BarChart3 className="h-4 w-4 md:h-4 md:w-4" />
                    <span className="hidden sm:inline">📊 Tổng Quan</span>
                  </Button>
                </Link>
                {permissions.canViewInventory() && (
                  <Link to="/inventory">
                    <Button
                      variant={isActive('/inventory') ? 'default' : 'ghost'}
                      size="sm"
                      className={`gap-1 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 font-medium transition-all duration-200 ${
                        isActive('/inventory') 
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg hover:shadow-xl' 
                          : 'hover:bg-emerald-50'
                      }`}
                    >
                      <Package className="h-4 w-4 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">📦 Kho Hàng</span>
                    </Button>
                  </Link>
                )}
                {permissions.canMoveItems() && (
                  <Link to="/move">
                    <Button
                      variant={isActive('/move') ? 'default' : 'ghost'}
                      size="sm"
                      className={`gap-1 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 font-medium transition-all duration-200 ${
                        isActive('/move') 
                          ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl' 
                          : 'hover:bg-purple-50'
                      }`}
                    >
                      <Move className="h-4 w-4 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">🔄 Luân Chuyển</span>
                    </Button>
                  </Link>
                )}
                {permissions.canViewInventory() && (
                  <Link to="/inventory-check">
                    <Button
                      variant={isActive('/inventory-check') ? 'default' : 'ghost'}
                      size="sm"
                      className={`gap-1 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 font-medium transition-all duration-200 ${
                        isActive('/inventory-check') 
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg hover:shadow-xl' 
                          : 'hover:bg-cyan-50'
                      }`}
                    >
                      <ClipboardCheck className="h-4 w-4 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">✅ Kiểm Kho</span>
                    </Button>
                  </Link>
                )}
                {permissions.canViewReports() && (
                  <Link to="/reports">
                    <Button
                      variant={isActive('/reports') ? 'default' : 'ghost'}
                      size="sm"
                      className={`gap-1 md:gap-2 relative text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 font-medium transition-all duration-200 ${
                        isActive('/reports') 
                          ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg hover:shadow-xl' 
                          : 'hover:bg-orange-50'
                      }`}
                    >
                      <AlertCircle className="h-4 w-4 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">⚠️ Báo Cáo</span>
                      {pendingReportsCount > 0 && (
                        <Badge className="absolute -top-1 -right-1 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5 animate-pulse shadow-lg">
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
                      className={`gap-1 md:gap-2 text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 font-medium transition-all duration-200 ${
                        isActive('/users') 
                          ? 'bg-gradient-to-r from-slate-700 to-slate-900 text-white shadow-lg hover:shadow-xl' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <Users className="h-4 w-4 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">👥 Users</span>
                    </Button>
                  </Link>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3 md:gap-4">
              <div className="text-right hidden md:block bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-2 rounded-xl border-2 border-slate-200 shadow-sm">
                <div className="flex items-center gap-2 justify-end">
                  <p className="text-sm font-bold text-slate-800">{user?.full_name}</p>
                  {getUserRoleBadge()}
                </div>
                <p className="text-xs text-muted-foreground">✉️ {user?.email}</p>
              </div>
              <Button 
                onClick={logout} 
                variant="ghost" 
                size="sm" 
                className="gap-2 text-xs md:text-sm px-3 md:px-4 py-2 md:py-2.5 font-medium hover:bg-red-50 hover:text-red-600 transition-all duration-200 border-2 border-transparent hover:border-red-200"
              >
                <LogOut className="h-4 w-4 md:h-4 md:w-4" />
                <span className="hidden sm:inline">🚪 Đăng Xuất</span>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header - Simplified */}
      <header className="md:hidden bg-white/90 backdrop-blur-lg shadow-lg sticky top-0 z-40 border-b-2 border-slate-200">
        <div className="px-3 py-3">
          <div className="flex items-center justify-between">
            <Link to="/dashboard" className="flex items-center gap-2 hover:scale-105 transition-transform duration-200">
              <img src="/logo.png" alt="Logo" className="h-10 w-10" />
              <div>
                <span className="font-bold text-base bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  Quản Lý Tồn Kho
                </span>
                <p className="text-xs text-muted-foreground font-medium">💻 Điện máy Nguyễn Đức</p>
              </div>
            </Link>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="text-sm font-bold text-slate-800">{user?.full_name}</p>
                {getUserRoleBadge()}
              </div>
              <Button 
                onClick={logout} 
                variant="ghost" 
                size="sm" 
                className="gap-1 text-xs px-2 py-1.5 font-medium hover:bg-red-50 hover:text-red-600 transition-all duration-200"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Bottom Padding for Mobile Navigation */}
      <main className="container mx-auto px-2 md:px-4 py-4 md:py-10 pb-24 md:pb-10">{children}</main>
      
      {/* Bottom Navigation for Mobile */}
      <BottomNavigation />
      
      {/* Decorative Elements - Hidden on Mobile */}
      <div className="hidden md:block fixed bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500 opacity-50"></div>
    </div>
  );
};
