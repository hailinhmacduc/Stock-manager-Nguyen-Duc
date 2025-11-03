import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
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

  return (
    <Layout>
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-600">Tổng quan hệ thống quản lý kho</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="pb-2 p-3 md:p-6">
              <CardDescription className="text-blue-700 text-xs md:text-sm">Tổng Sản Phẩm Có Sẵn</CardDescription>
              <CardTitle className="text-2xl md:text-3xl font-bold text-blue-900">{totalItems}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <p className="text-xs text-blue-600">Đang có sẵn trong kho</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardHeader className="pb-2 p-3 md:p-6">
              <CardDescription className="text-orange-700 text-xs md:text-sm">Hàng Tồn Lâu</CardDescription>
              <CardTitle className="text-2xl md:text-3xl font-bold text-orange-900">{oldItems}</CardTitle>
            </CardHeader>
            <CardContent className="p-3 md:p-6 pt-0">
              <p className="text-xs text-orange-600">Trên 30 ngày</p>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tình Trạng Tồn Kho Theo Serial/Service Tag</CardTitle>
            <CardDescription className="text-sm">
              <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                  <span className="text-xs">Hàng mới (dưới 14 ngày)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-orange-500"></span>
                  <span className="text-xs">Hàng tồn (14-30 ngày)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="text-xs">Hàng tồn lâu (trên 30 ngày)</span>
                </div>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-100 border-b-2 border-slate-300">
                  <tr>
                    <th className="text-left p-1 md:p-2 font-semibold text-slate-700 w-[100px] md:w-auto">Serial/Service Tag</th>
                    <th className="text-left p-1 md:p-2 font-semibold text-slate-700 min-w-[120px]">Tên Sản Phẩm</th>
                    <th className="text-center p-1 md:p-2 font-semibold text-slate-700 w-[80px] md:w-auto">Vị Trí</th>
                    <th className="text-center p-1 md:p-2 font-semibold text-slate-700 w-[80px] md:w-auto">Tình Trạng</th>
                    <th className="text-center p-1 md:p-2 font-semibold text-slate-700 w-[70px] md:w-auto">Tuổi Hàng</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr 
                      key={item.serial_number}
                      className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                    >
                      <td className="p-1 md:p-2 font-mono text-blue-600 font-medium">
                        <div className="md:truncate md:max-w-none">
                          <span className="md:hidden break-all text-[10px] leading-tight">{item.serial_number}</span>
                          <span className="hidden md:inline">{item.serial_number}</span>
                        </div>
                      </td>
                      <td className="p-1 md:p-2 text-slate-900 text-[10px] md:text-xs">{item.model_name}</td>
                      <td className="text-center p-1 md:p-2">
                        <span className="inline-block px-1 md:px-2 py-0.5 rounded text-[9px] md:text-xs bg-blue-100 text-blue-800">
                          <span className="hidden md:inline">{getLocationDisplayName(item.location)}</span>
                          <span className="md:hidden">
                            {item.location === 'DISPLAY_T1' ? 'Kệ T1' :
                             item.location === 'STORAGE_T1' ? 'Tủ T1' : 'Kho T3'}
                          </span>
                        </span>
                      </td>
                      <td className="text-center p-1 md:p-2">
                        <span className="inline-block px-1 md:px-2 py-0.5 rounded text-[9px] md:text-xs bg-green-100 text-green-800">
                          <span className="hidden md:inline">{getConditionDisplayName(item.condition)}</span>
                          <span className="md:hidden">
                            {['NEW_SEAL', 'NEW_BOX'].includes(item.condition) ? 'New' :
                             item.condition === 'OPEN_BOX' ? 'Open' :
                             item.condition === 'USED' ? 'Used' : 'Ref'}
                          </span>
                        </span>
                      </td>
                      <td className={`text-center p-1 md:p-2 font-semibold text-[10px] md:text-xs ${getAgeColor(item.age_days)}`}>
                        <span className="md:hidden">{item.age_days}d</span>
                        <span className="hidden md:inline">{item.age_days} ngày</span>
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
