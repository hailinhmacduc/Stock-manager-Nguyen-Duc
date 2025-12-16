import { Link, useLocation } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { BarChart3, Package, Move, ClipboardCheck, AlertCircle, Users, Scan } from 'lucide-react';
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
      path: '/quick-scan',
      icon: Scan,
      label: 'Quét Nhanh',
      emoji: '📷',
      color: 'from-violet-600 to-purple-600',
      hoverColor: 'hover:bg-violet-50',
      show: permissions.canViewInventory()
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
    <nav className="md:hidden mobile-bottom-nav">
      {/* Decorative top border */}
      <div className="h-1 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500"></div>
      
      {/* Swipeable Navigation Container */}
      <div className="relative">
        {/* Scroll indicator - Left */}
        {visibleItems.length > 5 && (
          <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
        )}
        
        {/* Scrollable Navigation */}
        <div 
          className="overflow-x-auto overflow-y-hidden scrollbar-hide snap-x snap-mandatory"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          <div className="flex items-center gap-1 px-2 py-2 min-w-max">
            {visibleItems.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);
              
              return (
                <Link 
                  key={item.path} 
                  to={item.path} 
                  className="snap-start flex-shrink-0"
                  style={{ minWidth: visibleItems.length <= 5 ? `${100 / visibleItems.length}%` : '80px' }}
                >
                  <div className={`
                    relative flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-300 mobile-touch-target
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
                    <span className={`mobile-text-xs font-medium text-center leading-tight whitespace-nowrap ${
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
        
        {/* Scroll indicator - Right */}
        {visibleItems.length > 5 && (
          <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
        )}
      </div>
    </nav>
  );
};
