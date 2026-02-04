import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, TrendingUp, Clock, MapPin, Box, Wrench, AlertTriangle } from 'lucide-react';
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

    // Auto refresh every 30 seconds
    const interval = setInterval(fetchInventoryStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchInventoryStatus = async () => {
    try {
      // Fetch inventory items with SKU info
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

      // Transform data to include age calculation
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

  const getAgeColor = (days: number) => {
    if (days > 30) return 'text-red-600 font-bold';
    if (days > 14) return 'text-amber-600';
    return 'text-emerald-600';
  };

  const getAgeBadge = (days: number) => {
    if (days > 30) return 'bg-red-50 border-red-200 text-red-700';
    if (days > 14) return 'bg-amber-50 border-amber-200 text-amber-700';
    return 'bg-emerald-50 border-emerald-200 text-emerald-700';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
        </div>
      </Layout>
    );
  }

  const totalItems = data.length;
  const oldItems = data.filter(item => item.age_days > 30).length;
  const mediumAgeItems = data.filter(item => item.age_days > 14 && item.age_days <= 30).length;
  const newItems = data.filter(item => item.age_days <= 14).length;

  // Location breakdown - including WARRANTY_KT
  const displayItems = data.filter(item => item.location === 'DISPLAY_T1').length;
  const storageItems = data.filter(item => item.location === 'STORAGE_T1').length;
  const warehouseItems = data.filter(item => item.location === 'WAREHOUSE_T3').length;
  const warrantyItems = data.filter(item => item.location === 'WARRANTY_KT').length;

  // Condition breakdown - including REPAIRING
  const newBoxItems = data.filter(item => ['NEW_SEAL', 'NEW_BOX'].includes(item.condition)).length;
  const openBoxItems = data.filter(item => item.condition === 'OPEN_BOX').length;
  const usedItems = data.filter(item => item.condition === 'USED').length;
  const repairingItems = data.filter(item => item.condition === 'REPAIRING').length;

  return (
    <Layout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Clean Header */}
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
            Tổng Quan Kho Hàng
          </h1>
          <p className="text-slate-500 mt-1">
            Giám sát tồn kho realtime • Tự động cập nhật mỗi 30 giây
          </p>
        </div>

        {/* Main Stats - Flat Modern Design */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Items */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Tổng Sản Phẩm</span>
              <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                <Package className="h-4 w-4 text-slate-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-slate-900">{totalItems}</div>
            <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Đang có sẵn trong kho
            </div>
          </div>

          {/* New Items */}
          <div className="bg-white border border-emerald-200 rounded-xl p-5 hover:border-emerald-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-emerald-600 uppercase tracking-wide">Hàng Mới</span>
              <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                <Clock className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-emerald-600">{newItems}</div>
            <div className="text-xs text-slate-500 mt-1">Dưới 14 ngày</div>
          </div>

          {/* Medium Age Items */}
          <div className="bg-white border border-amber-200 rounded-xl p-5 hover:border-amber-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-amber-600 uppercase tracking-wide">Hàng Tồn</span>
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-amber-600">{mediumAgeItems}</div>
            <div className="text-xs text-slate-500 mt-1">14 - 30 ngày</div>
          </div>

          {/* Old Items */}
          <div className="bg-white border border-red-200 rounded-xl p-5 hover:border-red-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-red-600 uppercase tracking-wide">Tồn Lâu</span>
              <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <div className="text-3xl font-bold text-red-600">{oldItems}</div>
            <div className="text-xs text-slate-500 mt-1">Trên 30 ngày</div>
          </div>
        </div>

        {/* Location & Condition Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Phân Bố Vị Trí</h3>
            </div>
            <div className="p-4 space-y-3">
              {/* Kệ Trưng Bày */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="font-medium text-slate-700">Kệ Trưng Bày T1</span>
                </div>
                <span className="text-xl font-bold text-purple-600">{displayItems}</span>
              </div>

              {/* Tủ Chứa */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-slate-700">Tủ Chứa T1</span>
                </div>
                <span className="text-xl font-bold text-blue-600">{storageItems}</span>
              </div>

              {/* Kho T3 */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="font-medium text-slate-700">Kho T3</span>
                </div>
                <span className="text-xl font-bold text-orange-600">{warehouseItems}</span>
              </div>

              {/* BH/KT - New Location */}
              <div className="flex items-center justify-between p-3 bg-rose-50 rounded-lg border border-rose-100">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-rose-500 rounded-full"></div>
                  <span className="font-medium text-slate-700 flex items-center gap-1.5">
                    <Wrench className="h-3.5 w-3.5 text-rose-500" />
                    Lỗi/ BH Phòng KT
                  </span>
                </div>
                <span className="text-xl font-bold text-rose-600">{warrantyItems}</span>
              </div>
            </div>
          </div>

          {/* Condition Breakdown */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
              <Box className="h-4 w-4 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Tình Trạng Máy</h3>
            </div>
            <div className="p-4 space-y-3">
              {/* New Box */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                  <span className="font-medium text-slate-700">New Box / Seal</span>
                </div>
                <span className="text-xl font-bold text-emerald-600">{newBoxItems}</span>
              </div>

              {/* Open Box */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                  <span className="font-medium text-slate-700">Open Box</span>
                </div>
                <span className="text-xl font-bold text-amber-600">{openBoxItems}</span>
              </div>

              {/* Máy Cũ */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="font-medium text-slate-700">Máy Cũ / Used</span>
                </div>
                <span className="text-xl font-bold text-blue-600">{usedItems}</span>
              </div>

              {/* Đang Sửa */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                  <span className="font-medium text-slate-700">Đang Sửa/ Đóng Lại</span>
                </div>
                <span className="text-xl font-bold text-gray-600">{repairingItems}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Inventory Table */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-slate-600" />
              <h3 className="font-semibold text-slate-900">Chi Tiết Tồn Kho</h3>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{totalItems} sản phẩm</span>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span className="text-slate-600">&lt;14 ngày</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-slate-600">14-30 ngày</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                <span className="text-slate-600">&gt;30 ngày</span>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Serial</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Sản Phẩm</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Vị Trí</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tình Trạng</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wide">Tuổi Hàng</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item) => (
                  <tr key={item.serial_number} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-mono text-sm text-slate-800 font-medium">{item.serial_number}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm text-slate-900 font-medium">{item.model_name}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${item.location === 'DISPLAY_T1' ? 'bg-purple-50 text-purple-700' :
                          item.location === 'STORAGE_T1' ? 'bg-blue-50 text-blue-700' :
                            item.location === 'WAREHOUSE_T3' ? 'bg-orange-50 text-orange-700' :
                              item.location === 'WARRANTY_KT' ? 'bg-rose-50 text-rose-700' :
                                'bg-slate-100 text-slate-700'
                        }`}>
                        {item.location === 'WARRANTY_KT' && <Wrench className="h-3 w-3" />}
                        {getLocationDisplayName(item.location)}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${['NEW_SEAL', 'NEW_BOX'].includes(item.condition) ? 'bg-emerald-50 text-emerald-700' :
                          item.condition === 'OPEN_BOX' ? 'bg-amber-50 text-amber-700' :
                            item.condition === 'USED' ? 'bg-blue-50 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                        }`}>
                        {getConditionDisplayName(item.condition)}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${getAgeBadge(item.age_days)}`}>
                        <Clock className="h-3 w-3" />
                        {item.age_days} ngày
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Không có sản phẩm nào trong kho</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
