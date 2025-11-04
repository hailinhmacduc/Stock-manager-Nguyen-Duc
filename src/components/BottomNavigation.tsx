import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Package, Move, ClipboardCheck, AlertCircle, Users } from 'lucide-react';
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

  const navItems = [
    {
      path: '/dashboard',
      icon: BarChart3,
      label: 'Tổng Quan',
      emoji: '📊',
      color: 'from-blue-600 to-indigo-600',
      hoverColor: 'hover:bg-blue-50',
      show: true
    },
    {
      path: '/inventory',
      icon: Package,
      label: 'Kho Hàng',
      emoji: '📦',
      color: 'from-emerald-600 to-teal-600',
      hoverColor: 'hover:bg-emerald-50',
      show: permissions.canViewInventory()
    },
    {
      path: '/move',
      icon: Move,
      label: 'Luân Chuyển',
      emoji: '🔄',
      color: 'from-purple-600 to-pink-600',
      hoverColor: 'hover:bg-purple-50',
      show: permissions.canMoveItems()
    },
    {
      path: '/inventory-check',
      icon: ClipboardCheck,
      label: 'Kiểm Kho',
      emoji: '✅',
      color: 'from-cyan-600 to-blue-600',
      hoverColor: 'hover:bg-cyan-50',
      show: permissions.canViewInventory()
    },
    {
      path: '/reports',
      icon: AlertCircle,
      label: 'Báo Cáo',
      emoji: '⚠️',
      color: 'from-orange-600 to-red-600',
      hoverColor: 'hover:bg-orange-50',
      show: permissions.canViewReports(),
      badge: pendingReportsCount > 0 ? pendingReportsCount : null
    },
    {
      path: '/users',
      icon: Users,
      label: 'Users',
      emoji: '👥',
      color: 'from-slate-700 to-slate-900',
      hoverColor: 'hover:bg-slate-50',
      show: permissions.canManageUsers()
    }
  ];

  const visibleItems = navItems.filter(item => item.show);

  return (
    <div className="md:hidden mobile-bottom-nav">
      {/* Decorative top border */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500"></div>
      
      <div className="bottom-nav-grid">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          
          return (
            <Link key={item.path} to={item.path} className="flex-1">
              <div className={`
                relative flex flex-col items-center justify-center p-2 rounded-xl mx-1 transition-all duration-300 mobile-touch-target
                ${active 
                  ? `mobile-nav-active ${item.color}` 
                  : `mobile-nav-inactive ${item.hoverColor}`
                }
              `}>
                <div className="relative">
                  <Icon className={`h-5 w-5 mb-1 ${active ? 'text-white' : 'text-slate-600'}`} />
                  {item.badge && (
                    <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-4 animate-pulse shadow-lg">
                      {item.badge}
                    </Badge>
                  )}
                </div>
                <span className={`mobile-text-xs font-medium text-center leading-tight ${
                  active ? 'text-white' : 'text-slate-600'
                }`}>
                  {item.label}
                </span>
                {active && (
                  <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full shadow-sm"></div>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
};
