import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Package, Move, ClipboardCheck, AlertCircle, Users, ScanLine } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const BottomNavigation: React.FC = () => {
  const { permissions } = useAuth();
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

  const navItems = [
    { path: '/dashboard', icon: BarChart3, label: 'Tổng Quan', show: true },
    { path: '/inventory', icon: Package, label: 'Kho', show: permissions.canViewInventory() },
    { path: '/quick-scan', icon: ScanLine, label: 'Quét', show: permissions.canViewInventory() },
    { path: '/move', icon: Move, label: 'Chuyển', show: permissions.canMoveItems() },
    { path: '/inventory-check', icon: ClipboardCheck, label: 'Kiểm', show: permissions.canViewInventory() },
    { path: '/reports', icon: AlertCircle, label: 'Báo Cáo', show: permissions.canViewReports(), badge: pendingReportsCount > 0 ? pendingReportsCount : null },
    { path: '/users', icon: Users, label: 'Users', show: permissions.canManageUsers() },
  ];

  const visibleItems = navItems.filter(item => item.show);

  return (
    <div className="md:hidden mobile-top-nav">
      <div className="mobile-nav-scroll">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`mobile-nav-pill ${active ? 'mobile-nav-pill-active' : 'mobile-nav-pill-inactive'}`}
            >
              <div className="relative">
                <Icon className="h-4 w-4" strokeWidth={active ? 2.5 : 1.8} />
                {item.badge && (
                  <Badge className="absolute -top-2 -right-3 bg-red-500 text-white text-[7px] px-1 min-w-[14px] h-3.5 shadow-sm border-0">
                    {item.badge}
                  </Badge>
                )}
              </div>
              <span className="text-[11px] font-medium whitespace-nowrap">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
