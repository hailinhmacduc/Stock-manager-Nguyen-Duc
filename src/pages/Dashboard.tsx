import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Package, TrendingUp, TrendingDown, Clock, MapPin, Box } from 'lucide-react';
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
    if (days > 14) return 'text-orange-600';
    return 'text-green-600';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  const totalItems = data.length;
  const oldItems = data.filter(item => item.age_days > 30).length;
  const mediumAgeItems = data.filter(item => item.age_days > 14 && item.age_days <= 30).length;
  const newItems = data.filter(item => item.age_days <= 14).length;

  // Location breakdown
  const displayItems = data.filter(item => item.location === 'DISPLAY_T1').length;
  const storageItems = data.filter(item => item.location === 'STORAGE_T1').length;
  const warehouseItems = data.filter(item => item.location === 'WAREHOUSE_T3').length;

  // Condition breakdown
  const newBoxItems = data.filter(item => ['NEW_SEAL', 'NEW_BOX'].includes(item.condition)).length;
  const openBoxItems = data.filter(item => item.condition === 'OPEN_BOX').length;
  const usedItems = data.filter(item => item.condition === 'USED').length;

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header with Animation */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 p-8 text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
          <div className="relative">
            <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
              <Package className="h-10 w-10" />
              Dashboard Tổng Quan
            </h1>
            <p className="text-blue-100 text-lg">Giám sát tồn kho và hiệu suất kinh doanh</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        </div>

        {/* Main Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Items Card */}
          <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-emerald-100 text-xs font-medium">TỔNG SẢN PHẨM</CardDescription>
                <Package className="h-5 w-5 text-emerald-100" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-4xl font-bold mb-1">{totalItems}</CardTitle>
              <p className="text-xs text-emerald-100 flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                Đang có sẵn trong kho
              </p>
            </CardContent>
          </Card>

          {/* New Items */}
          <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-blue-100 text-xs font-medium">HÀNG MỚI</CardDescription>
                <Clock className="h-5 w-5 text-blue-100" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-4xl font-bold mb-1">{newItems}</CardTitle>
              <p className="text-xs text-blue-100">Dưới 14 ngày</p>
            </CardContent>
          </Card>

          {/* Medium Age Items */}
          <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-amber-100 text-xs font-medium">HÀNG TỒN</CardDescription>
                <TrendingDown className="h-5 w-5 text-amber-100" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-4xl font-bold mb-1">{mediumAgeItems}</CardTitle>
              <p className="text-xs text-amber-100">14-30 ngày</p>
            </CardContent>
          </Card>

          {/* Old Items */}
          <Card className="bg-gradient-to-br from-red-500 to-red-600 border-0 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription className="text-red-100 text-xs font-medium">HÀNG TỒN LÂU</CardDescription>
                <TrendingDown className="h-5 w-5 text-red-100" />
              </div>
            </CardHeader>
            <CardContent>
              <CardTitle className="text-4xl font-bold mb-1">{oldItems}</CardTitle>
              <p className="text-xs text-red-100">Trên 30 ngày</p>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats - Location & Condition */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location Breakdown */}
          <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-600" />
                <CardTitle className="text-xl">Phân Bố Theo Vị Trí</CardTitle>
              </div>
              <CardDescription>Tình trạng kho theo từng khu vực</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                    <span className="font-medium">Kệ Trưng Bày T1</span>
                  </div>
                  <span className="text-2xl font-bold text-purple-600">{displayItems}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Tủ Chứa T1</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{storageItems}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                    <span className="font-medium">Kho T3</span>
                  </div>
                  <span className="text-2xl font-bold text-orange-600">{warehouseItems}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Condition Breakdown */}
          <Card className="shadow-lg border-2 hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Box className="h-5 w-5 text-emerald-600" />
                <CardTitle className="text-xl">Phân Loại Theo Tình Trạng</CardTitle>
              </div>
              <CardDescription>Chất lượng sản phẩm trong kho</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                    <span className="font-medium">New Box / Seal</span>
                  </div>
                  <span className="text-2xl font-bold text-emerald-600">{newBoxItems}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
                    <span className="font-medium">Open Box</span>
                  </div>
                  <span className="text-2xl font-bold text-amber-600">{openBoxItems}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="font-medium">Máy Cũ / Used</span>
                  </div>
                  <span className="text-2xl font-bold text-blue-600">{usedItems}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card className="shadow-lg border-2">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-xl">Chi Tiết Tồn Kho</CardTitle>
            </div>
            <CardDescription className="text-sm">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 mt-2">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-500 shadow-sm"></span>
                  <span className="text-xs font-medium">Hàng mới (dưới 14 ngày)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-orange-500 shadow-sm"></span>
                  <span className="text-xs font-medium">Hàng tồn (14-30 ngày)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-3 h-3 rounded-full bg-red-500 shadow-sm"></span>
                  <span className="text-xs font-medium">Hàng tồn lâu (trên 30 ngày)</span>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-gradient-to-r from-slate-100 to-slate-50 border-b-2 border-slate-300">
                  <tr>
                    <th className="text-left p-3 font-semibold text-slate-700 w-[100px] md:w-auto">Serial/Service Tag</th>
                    <th className="text-left p-3 font-semibold text-slate-700 min-w-[120px]">Tên Sản Phẩm</th>
                    <th className="text-center p-3 font-semibold text-slate-700 w-[100px] md:w-auto">Vị Trí</th>
                    <th className="text-center p-3 font-semibold text-slate-700 w-[100px] md:w-auto">Tình Trạng</th>
                    <th className="text-center p-3 font-semibold text-slate-700 w-[80px] md:w-auto">Tuổi Hàng</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item, index) => (
                    <tr 
                      key={item.serial_number}
                      className={`border-b border-slate-200 hover:bg-blue-50/50 transition-all duration-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                      }`}
                    >
                      <td className="p-3 font-mono text-blue-600 font-medium">
                        <div className="md:truncate md:max-w-none">
                          <span className="md:hidden break-all text-[10px] leading-tight">{item.serial_number}</span>
                          <span className="hidden md:inline text-sm">{item.serial_number}</span>
                        </div>
                      </td>
                      <td className="p-3 text-slate-900 text-[10px] md:text-sm font-medium">{item.model_name}</td>
                      <td className="text-center p-3">
                        <span className={`inline-block px-2 md:px-3 py-1 rounded-full text-[9px] md:text-xs font-medium shadow-sm ${
                          item.location === 'DISPLAY_T1' ? 'bg-purple-100 text-purple-700 border border-purple-200' :
                          item.location === 'STORAGE_T1' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          'bg-orange-100 text-orange-700 border border-orange-200'
                        }`}>
                          <span className="hidden md:inline">{getLocationDisplayName(item.location)}</span>
                          <span className="md:hidden">
                            {item.location === 'DISPLAY_T1' ? 'Kệ T1' :
                             item.location === 'STORAGE_T1' ? 'Tủ T1' : 'Kho T3'}
                          </span>
                        </span>
                      </td>
                      <td className="text-center p-3">
                        <span className={`inline-block px-2 md:px-3 py-1 rounded-full text-[9px] md:text-xs font-medium shadow-sm ${
                          ['NEW_SEAL', 'NEW_BOX'].includes(item.condition) ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          item.condition === 'OPEN_BOX' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
                          item.condition === 'USED' ? 'bg-blue-100 text-blue-700 border border-blue-200' :
                          'bg-orange-100 text-orange-700 border border-orange-200'
                        }`}>
                          <span className="hidden md:inline">{getConditionDisplayName(item.condition)}</span>
                          <span className="md:hidden">
                            {['NEW_SEAL', 'NEW_BOX'].includes(item.condition) ? 'New' :
                             item.condition === 'OPEN_BOX' ? 'Open' :
                             item.condition === 'USED' ? 'Used' : 'Ref'}
                          </span>
                        </span>
                      </td>
                      <td className={`text-center p-3 font-bold text-[10px] md:text-sm ${getAgeColor(item.age_days)}`}>
                        <div className="flex items-center justify-center gap-1">
                          <Clock className="h-3 w-3 md:h-4 md:w-4" />
                          <span className="md:hidden">{item.age_days}d</span>
                          <span className="hidden md:inline">{item.age_days} ngày</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
