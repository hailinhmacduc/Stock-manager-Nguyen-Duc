import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, TrendingUp, Clock, MapPin, Box, Wrench, AlertTriangle, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import { getLocationDisplayName, getConditionDisplayName } from '@/lib/constants';

interface InventoryItemStatus {
  serial_number: string;
  model_name: string;
  location: string;
  condition: string;
  age_days: number;
  received_at: string;
}

const Dashboard = () => {
  const [data, setData] = useState<InventoryItemStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInventoryStatus();
    const interval = setInterval(fetchInventoryStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchInventoryStatus = async () => {
    try {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select(`
          serial_number,
          location,
          condition,
          received_at,
          status,
          sku_info (
            model_name
          )
        `)
        .eq('status', 'AVAILABLE')
        .order('received_at', { ascending: false });

      if (error) throw error;

      const itemsWithAge = items?.map((item) => {
        const age_days = Math.floor(
          (Date.now() - new Date(item.received_at).getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          serial_number: item.serial_number,
          model_name: item.sku_info?.model_name || 'N/A',
          location: item.location,
          condition: item.condition,
          age_days,
          received_at: item.received_at,
        };
      }) || [];

      setData(itemsWithAge);
    } catch (error) {
      console.error('Error fetching inventory status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getAgeBadge = (days: number) => {
    if (days > 30) return 'bg-red-50 border-red-200 text-red-700';
    if (days > 14) return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  };

  const getLocationBadge = (loc: string) => {
    if (loc === 'DISPLAY_T1') return 'bg-purple-50 text-purple-700';
    if (loc === 'STORAGE_T1') return 'bg-blue-50 text-blue-700';
    if (loc === 'WAREHOUSE_T3') return 'bg-orange-50 text-orange-700';
    if (loc === 'WARRANTY_KT') return 'bg-rose-50 text-rose-700';
    return 'bg-slate-100 text-slate-700';
  };

  const getConditionBadge = (cond: string) => {
    if (['NEW_SEAL', 'NEW_BOX'].includes(cond)) return 'bg-emerald-50 text-emerald-700';
    if (cond === 'OPEN_BOX') return 'bg-amber-50 text-amber-700';
    if (cond === 'USED') return 'bg-blue-50 text-blue-700';
    return 'bg-gray-100 text-gray-700';
  };

  // Pagination state (must be before any conditional returns)
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  const totalItems = data.length;
  const oldItems = data.filter(item => item.age_days > 30).length;
  const mediumAgeItems = data.filter(item => item.age_days > 14 && item.age_days <= 30).length;
  const newItems = data.filter(item => item.age_days <= 14).length;

  const displayItems = data.filter(item => item.location === 'DISPLAY_T1').length;
  const storageItems = data.filter(item => item.location === 'STORAGE_T1').length;
  const warehouseItems = data.filter(item => item.location === 'WAREHOUSE_T3').length;
  const warrantyItems = data.filter(item => item.location === 'WARRANTY_KT').length;

  const newBoxItems = data.filter(item => ['NEW_SEAL', 'NEW_BOX'].includes(item.condition)).length;
  const openBoxItems = data.filter(item => item.condition === 'OPEN_BOX').length;
  const usedItems = data.filter(item => item.condition === 'USED').length;
  const repairingItems = data.filter(item => item.condition === 'REPAIRING').length;

  // Pagination derived values
  const totalPages = Math.ceil(data.length / ITEMS_PER_PAGE);
  const paginatedData = data.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <Layout>
      <div className="space-y-4 md:space-y-6 max-w-7xl mx-auto animate-fade-in">
        {/* Page Header */}
        <div className="page-header">
          <h1>
            <BarChart3 className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            Tổng Quan Kho Hàng
          </h1>
          <p>Giám sát tồn kho realtime • Cập nhật mỗi 30 giây</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div className="stat-card animate-slide-up animate-delay-1 border-l-4 border-l-blue-500 bg-blue-50/40">
            <div className="stat-card-label">
              <span>Tổng SP</span>
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="h-3.5 w-3.5 text-blue-600" />
              </div>
            </div>
            <div className="stat-card-value text-slate-900">{totalItems}</div>
            <div className="stat-card-desc flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Đang có sẵn
            </div>
          </div>

          <div className="stat-card animate-slide-up animate-delay-2 border-l-4 border-l-emerald-500 bg-emerald-50/40">
            <div className="stat-card-label">
              <span>Hàng Mới</span>
              <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Clock className="h-3.5 w-3.5 text-emerald-600" />
              </div>
            </div>
            <div className="stat-card-value text-emerald-600">{newItems}</div>
            <div className="stat-card-desc">Dưới 14 ngày</div>
          </div>

          <div className="stat-card animate-slide-up animate-delay-3 border-l-4 border-l-amber-500 bg-amber-50/40">
            <div className="stat-card-label">
              <span>Hàng Tồn</span>
              <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
              </div>
            </div>
            <div className="stat-card-value text-amber-600">{mediumAgeItems}</div>
            <div className="stat-card-desc">14 - 30 ngày</div>
          </div>

          <div className="stat-card animate-slide-up animate-delay-4 border-l-4 border-l-red-500 bg-red-50/40">
            <div className="stat-card-label">
              <span>Tồn Lâu</span>
              <div className="w-7 h-7 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
              </div>
            </div>
            <div className="stat-card-value text-red-600">{oldItems}</div>
            <div className="stat-card-desc">Trên 30 ngày</div>
          </div>
        </div>

        {/* Location & Condition */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Location */}
          <div className="section-card">
            <div className="section-card-header">
              <MapPin className="h-4 w-4 text-slate-500" />
              <h3>Phân Bố Vị Trí</h3>
            </div>
            <div className="section-card-content space-y-2">
              {[
                { label: 'Kệ Trưng Bày T1', count: displayItems, color: 'bg-purple-500', textColor: 'text-purple-600' },
                { label: 'Tủ Chứa T1', count: storageItems, color: 'bg-blue-500', textColor: 'text-blue-600' },
                { label: 'Kho T3', count: warehouseItems, color: 'bg-orange-500', textColor: 'text-orange-600' },
                { label: 'BH Phòng KT', count: warrantyItems, color: 'bg-rose-500', textColor: 'text-rose-600', icon: Wrench },
              ].map((loc) => (
                <div key={loc.label} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 ${loc.color} rounded-full`}></div>
                    <span className="text-sm font-medium text-slate-700 flex items-center gap-1">
                      {loc.icon && <loc.icon className="h-3.5 w-3.5 text-rose-500" />}
                      {loc.label}
                    </span>
                  </div>
                  <span className={`text-lg font-bold ${loc.textColor}`}>{loc.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Condition */}
          <div className="section-card">
            <div className="section-card-header">
              <Box className="h-4 w-4 text-slate-500" />
              <h3>Tình Trạng Máy</h3>
            </div>
            <div className="section-card-content space-y-2">
              {[
                { label: 'New Box / Seal', count: newBoxItems, color: 'bg-emerald-500', textColor: 'text-emerald-600' },
                { label: 'Open Box', count: openBoxItems, color: 'bg-amber-500', textColor: 'text-amber-600' },
                { label: 'Máy Cũ / Used', count: usedItems, color: 'bg-blue-500', textColor: 'text-blue-600' },
                { label: 'Đang Sửa / Đóng Lại', count: repairingItems, color: 'bg-gray-400', textColor: 'text-gray-600' },
              ].map((cond) => (
                <div key={cond.label} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-2.5 h-2.5 ${cond.color} rounded-full`}></div>
                    <span className="text-sm font-medium text-slate-700">{cond.label}</span>
                  </div>
                  <span className={`text-lg font-bold ${cond.textColor}`}>{cond.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Detail Table (Desktop) / Card List (Mobile) */}
        <div className="section-card">
          <div className="section-card-header justify-between flex-col md:flex-row gap-2">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-500" />
              <h3>Chi Tiết Tồn Kho</h3>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{totalItems} SP</span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span><span className="text-slate-500">&lt;14d</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span><span className="text-slate-500">14-30d</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-slate-500">&gt;30d</span></div>
            </div>
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Serial</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Sản Phẩm</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Vị Trí</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tình Trạng</th>
                  <th className="text-right px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Tuổi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedData.map((item) => (
                  <tr key={item.serial_number} className="even:bg-slate-50/60 hover:bg-blue-50/50 transition-colors">
                    <td className="px-4 py-2.5">
                      <span className="font-mono text-sm text-slate-800 font-medium">{item.serial_number}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-slate-900 font-medium">{item.model_name}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getLocationBadge(item.location)}`}>
                        {item.location === 'WARRANTY_KT' && <Wrench className="h-3 w-3" />}
                        {getLocationDisplayName(item.location)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getConditionBadge(item.condition)}`}>
                        {getConditionDisplayName(item.condition)}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${getAgeBadge(item.age_days)}`}>
                        <Clock className="h-3 w-3" />
                        {item.age_days}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card List */}
          <div className="md:hidden divide-y divide-slate-100">
            {paginatedData.map((item) => (
              <div key={item.serial_number} className="px-3.5 py-3 flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">{item.model_name}</div>
                  <div className="font-mono text-xs text-slate-500 mt-0.5">{item.serial_number}</div>
                  <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${getLocationBadge(item.location)}`}>
                      {getLocationDisplayName(item.location)}
                    </span>
                    <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${getConditionBadge(item.condition)}`}>
                      {getConditionDisplayName(item.condition)}
                    </span>
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border whitespace-nowrap ${getAgeBadge(item.age_days)}`}>
                  <Clock className="h-3 w-3" />
                  {item.age_days}d
                </span>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
              <div className="text-xs text-slate-500">
                Trang {currentPage}/{totalPages} • {data.length} SP
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 text-slate-600" />
                </button>
                {getPageNumbers().map((page, i) =>
                  page === '...' ? (
                    <span key={`dots-${i}`} className="px-1 text-slate-400 text-xs">…</span>
                  ) : (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page as number)}
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${currentPage === page
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-200'
                        }`}
                    >
                      {page}
                    </button>
                  )
                )}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="h-4 w-4 text-slate-600" />
                </button>
              </div>
            </div>
          )}

          {data.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <Package className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Không có sản phẩm nào trong kho</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

const BarChart3Icon = BarChart3;
export default Dashboard;
