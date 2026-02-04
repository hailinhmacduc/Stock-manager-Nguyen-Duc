import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Move, Package, Search, ChevronRight, History, Clock, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { getLocationDisplayName } from '@/lib/constants';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface InventoryItem {
  id: string;
  sku_id: string;
  serial_number: string;
  status: string;
  condition: string;
  location: string;
  cost: number;
  supplier: string;
  received_at: string;
  sku_info?: {
    brand: string;
    model_name: string;
    spec: string;
  };
}

interface MoveLog {
  id: string;
  serial_number: string;
  from_location: string;
  to_location: string;
  moved_by: string;
  moved_at: string;
  inventory_items?: {
    sku_info?: {
      brand: string;
      model_name: string;
    };
  };
}

// Move History Component for Admin
const MoveHistorySection = () => {
  const [moveHistory, setMoveHistory] = useState<MoveLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const { toast } = useToast();

  const fetchMoveHistory = useCallback(async () => {
    try {
      const { data: logs, error } = await supabase
        .from('stock_move_logs')
        .select(`
          *,
          inventory_items:item_id (
            sku_info:sku_id (
              brand,
              model_name
            )
          )
        `)
        .order('moved_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setMoveHistory(logs || []);
    } catch (error) {
      console.error('Error fetching move history:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Không thể tải lịch sử luân chuyển',
        variant: 'destructive'
      });
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchMoveHistory();
  }, [fetchMoveHistory]);

  return (
    <Card className="shadow-md border-l-4 border-l-purple-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5 text-purple-600" />
          Lịch Sử Luân Chuyển
        </CardTitle>
        <CardDescription>
          20 giao dịch luân chuyển gần nhất (chỉ Admin)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
            <span className="ml-2 text-gray-600">Đang tải lịch sử...</span>
          </div>
        ) : moveHistory.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">Chưa có lịch sử luân chuyển nào</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {moveHistory.map((log) => (
              <div key={log.id} className="p-4 border rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">
                      {log.inventory_items?.sku_info?.brand} {log.inventory_items?.sku_info?.model_name}
                    </h4>
                    <p className="text-sm text-gray-600">Serial: {log.serial_number}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded">
                        {getLocationDisplayName(log.from_location)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-gray-400" />
                      <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                        {getLocationDisplayName(log.to_location)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{log.moved_by}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {new Date(log.moved_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MoveItem = () => {
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [toLocation, setToLocation] = useState('');
  const [movedBy, setMovedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);
  const [availableItems, setAvailableItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [locationFilter, setLocationFilter] = useState('All');
  const { toast } = useToast();
  const { permissions } = useAuth();
  const navigate = useNavigate();

  const fetchAvailableItems = useCallback(async () => {
    try {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          sku_info:sku_id (
            brand,
            model_name,
            spec
          )
        `)
        .eq('status', 'AVAILABLE')
        .order('received_at', { ascending: false });

      if (error) throw error;
      setAvailableItems(items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Không thể tải danh sách sản phẩm',
        variant: 'destructive'
      });
    }
  }, [toast]);

  useEffect(() => {
    if (!permissions.canMoveItems()) {
      toast({
        title: '⛔ Không Có Quyền',
        description: 'Bạn không có quyền truy cập trang này',
        variant: 'destructive'
      });
      navigate('/dashboard');
    } else {
      fetchAvailableItems();
    }
  }, [permissions, toast, navigate, fetchAvailableItems]);

  // Reset toLocation when selectedItem changes
  useEffect(() => {
    if (selectedItem) {
      setToLocation(''); // Reset location selection when item changes
    }
  }, [selectedItem]);

  // Filter available items based on search and location
  const filteredItems = availableItems.filter(item => {
    const matchesSearch = searchQuery === '' ||
      item.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku_info?.model_name?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation = locationFilter === 'All' || item.location === locationFilter;

    return matchesSearch && matchesLocation;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!selectedItem) {
        toast({
          title: '⚠️ Chưa Chọn Sản Phẩm',
          description: 'Vui lòng chọn sản phẩm cần luân chuyển',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!toLocation) {
        toast({
          title: '⚠️ Chưa Chọn Vị Trí',
          description: 'Vui lòng chọn vị trí đích',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!movedBy.trim()) {
        toast({
          title: '⚠️ Chưa Nhập Tên',
          description: 'Vui lòng nhập tên người thực hiện',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const fromLocation = selectedItem.location;
      const getLocationName = (loc: string) => {
        switch (loc) {
          case 'DISPLAY_T1': return 'Kệ Trưng Bày T1';
          case 'STORAGE_T1': return 'Tủ Chứa T1';
          case 'WAREHOUSE_T3': return 'Kho T3';
          case 'WARRANTY_KT': return 'Lỗi/ Bảo Hành Phòng KT';
          default: return loc;
        }
      };

      // Update item location
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          location: toLocation,
          last_move_at: new Date().toISOString(),
        })
        .eq('id', selectedItem.id);

      if (updateError) throw updateError;

      // Insert move log
      const { error: logError } = await supabase
        .from('stock_move_logs')
        .insert({
          item_id: selectedItem.id,
          serial_number: selectedItem.serial_number,
          from_location: fromLocation,
          to_location: toLocation,
          moved_by: movedBy,
        });

      if (logError) throw logError;

      toast({
        title: '✅ Thành Công',
        description: `Đã di chuyển ${selectedItem.serial_number} từ ${getLocationName(fromLocation)} đến ${getLocationName(toLocation)}`,
      });

      // Reset form
      setSelectedItem(null);
      setToLocation('');
      setMovedBy('');
      fetchAvailableItems(); // Refresh list
    } catch (error) {
      console.error('Error moving item:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Không thể luân chuyển sản phẩm. Vui lòng thử lại.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Luân Chuyển Hàng Hóa
          </h1>
          <p className="text-muted-foreground mt-1">
            Di chuyển sản phẩm giữa các vị trí lưu trữ
          </p>
        </div>

        <Card className="shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="flex items-center gap-2">
              <Move className="h-5 w-5 text-blue-600" />
              Thông Tin Luân Chuyển
            </CardTitle>
            <CardDescription>
              Chọn sản phẩm từ danh sách kho hàng và vị trí đích để di chuyển
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Chọn Sản Phẩm</Label>
                {selectedItem ? (
                  <div className="p-4 border rounded-lg bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-blue-900">
                          {selectedItem.sku_info?.brand} {selectedItem.sku_info?.model_name}
                        </h3>
                        <p className="text-sm text-blue-700">Serial: {selectedItem.serial_number}</p>
                        <p className="text-sm text-blue-600">
                          Vị trí hiện tại: <span className="font-medium">{getLocationDisplayName(selectedItem.location)}</span>
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedItem(null)}
                        className="text-blue-600 border-blue-300 hover:bg-blue-100"
                      >
                        Đổi Sản Phẩm
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-12 text-base border-dashed border-2 hover:bg-blue-50"
                    onClick={() => setSelectDialogOpen(true)}
                  >
                    <Package className="mr-2 h-5 w-5" />
                    Chọn Sản Phẩm Từ Kho Hàng
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="text-base font-semibold">Vị Trí Đích</Label>
                <Select value={toLocation} onValueChange={setToLocation} required>
                  <SelectTrigger id="location" className="text-base">
                    <SelectValue placeholder="Chọn vị trí đích" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedItem?.location !== 'DISPLAY_T1' && (
                      <SelectItem value="DISPLAY_T1">🖥️ Kệ Trưng Bày Tầng 1</SelectItem>
                    )}
                    {selectedItem?.location !== 'STORAGE_T1' && (
                      <SelectItem value="STORAGE_T1">📦 Tủ Chứa Máy Tầng 1</SelectItem>
                    )}
                    {selectedItem?.location !== 'WAREHOUSE_T3' && (
                      <SelectItem value="WAREHOUSE_T3">🏢 Kho Tầng 3</SelectItem>
                    )}
                    {selectedItem?.location !== 'WARRANTY_KT' && (
                      <SelectItem value="WARRANTY_KT">🔧 Lỗi/ Bảo Hành Phòng KT</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                {selectedItem && (
                  <p className="text-xs text-muted-foreground">
                    Không thể chọn vị trí hiện tại: {getLocationDisplayName(selectedItem.location)}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="movedBy" className="text-base font-semibold">Người Thực Hiện</Label>
                <Input
                  id="movedBy"
                  placeholder="Ví dụ: Nguyễn Văn Long"
                  value={movedBy}
                  onChange={(e) => setMovedBy(e.target.value)}
                  required
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground">Tên nhân viên thực hiện luân chuyển</p>
              </div>

              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Đang Xử Lý...
                  </>
                ) : (
                  <>
                    <Move className="mr-2 h-5 w-5" />
                    Thực Hiện Luân Chuyển
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Location Guide - Only for non-admin users */}
        {!permissions.isAdmin() && (
          <Card className="shadow-md border-l-4 border-l-blue-500">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                📍 Hướng Dẫn Vị Trí
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    🖥️
                  </div>
                  <div>
                    <span className="font-semibold text-blue-900">Kệ Trưng Bày Tầng 1</span>
                    <p className="text-sm text-blue-700 mt-1">
                      Sản phẩm trưng bày, demo cho khách hàng xem và trải nghiệm
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    📦
                  </div>
                  <div>
                    <span className="font-semibold text-green-900">Tủ Chứa Máy Tầng 1</span>
                    <p className="text-sm text-green-700 mt-1">
                      Sản phẩm nguyên seal, sẵn sàng bán ngay
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                  <div className="w-10 h-10 rounded-full bg-slate-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                    🏢
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">Kho Tầng 3</span>
                    <p className="text-sm text-slate-700 mt-1">
                      Kho dự trữ, hàng tồn kho dài hạn
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Move History - Only for admin users */}
        {permissions.isAdmin() && <MoveHistorySection />}

        {/* Product Selection Dialog */}
        <Dialog open={selectDialogOpen} onOpenChange={setSelectDialogOpen}>
          <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Chọn Sản Phẩm Cần Luân Chuyển
              </DialogTitle>
              <DialogDescription>
                Tìm kiếm và chọn sản phẩm từ danh sách kho hàng có sẵn
              </DialogDescription>
            </DialogHeader>

            {/* Search and Filter Section */}
            <div className="space-y-4 border-b pb-4">
              <div className="flex gap-4">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Tìm kiếm theo serial hoặc tên sản phẩm..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {/* Location Filter */}
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Lọc theo vị trí" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Tất Cả Vị Trí</SelectItem>
                    <SelectItem value="DISPLAY_T1">🖥️ Kệ Trưng Bày T1</SelectItem>
                    <SelectItem value="STORAGE_T1">📦 Tủ Chứa T1</SelectItem>
                    <SelectItem value="WAREHOUSE_T3">🏢 Kho T3</SelectItem>
                    <SelectItem value="WARRANTY_KT">🔧 Lỗi/ Bảo Hành Phòng KT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Results Count */}
              <div className="text-sm text-gray-600">
                Hiển thị {filteredItems.length} / {availableItems.length} sản phẩm
                {searchQuery && (
                  <span className="ml-2 text-blue-600">
                    (tìm kiếm: "{searchQuery}")
                  </span>
                )}
                {locationFilter !== 'All' && (
                  <span className="ml-2 text-purple-600">
                    (vị trí: {getLocationDisplayName(locationFilter)})
                  </span>
                )}
              </div>
            </div>

            {/* Product List */}
            <div className="overflow-y-auto max-h-[50vh]">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8">
                  <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-500">
                    {availableItems.length === 0
                      ? "Không có sản phẩm nào có sẵn để luân chuyển"
                      : "Không tìm thấy sản phẩm nào phù hợp"
                    }
                  </p>
                  {(searchQuery || locationFilter !== 'All') && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        setSearchQuery('');
                        setLocationFilter('All');
                      }}
                    >
                      Xóa Bộ Lọc
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-4 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors"
                      onClick={() => {
                        setSelectedItem(item);
                        setSelectDialogOpen(false);
                        setSearchQuery(''); // Reset search
                        setLocationFilter('All'); // Reset filter
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">
                            {item.sku_info?.brand} {item.sku_info?.model_name}
                          </h3>
                          <p className="text-sm text-gray-600">Serial: {item.serial_number}</p>
                          <div className="flex items-center gap-4 mt-2">
                            <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              {getLocationDisplayName(item.location)}
                            </span>
                            <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded">
                              {item.condition}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(item.received_at).toLocaleDateString('vi-VN')}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MoveItem;
