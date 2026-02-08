import { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Move, Package, Search, ChevronRight, History, Clock, ArrowRight, MapPin } from 'lucide-react';
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

const MoveHistorySection = () => {
  const [moveHistory, setMoveHistory] = useState<MoveLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const { toast } = useToast();

  const fetchMoveHistory = useCallback(async () => {
    try {
      const { data: logs, error } = await supabase
        .from('stock_move_logs')
        .select(`*, inventory_items:item_id (sku_info:sku_id (brand, model_name))`)
        .order('moved_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      setMoveHistory(logs || []);
    } catch (error) {
      console.error('Error fetching move history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchMoveHistory(); }, [fetchMoveHistory]);

  return (
    <div className="section-card">
      <div className="section-card-header">
        <History className="h-4 w-4 text-slate-500" />
        <h3>Lịch Sử Luân Chuyển</h3>
        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-auto">20 gần nhất</span>
      </div>
      <div className="section-card-content">
        {historyLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : moveHistory.length === 0 ? (
          <div className="text-center py-8 text-slate-400">
            <History className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">Chưa có lịch sử luân chuyển</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {moveHistory.map((log) => (
              <div key={log.id} className="p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 truncate">
                      {log.inventory_items?.sku_info?.brand} {log.inventory_items?.sku_info?.model_name}
                    </div>
                    <div className="font-mono text-xs text-slate-500">{log.serial_number}</div>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-xs px-1.5 py-0.5 bg-red-50 text-red-600 rounded border border-red-100">
                        {getLocationDisplayName(log.from_location)}
                      </span>
                      <ArrowRight className="h-3 w-3 text-slate-400" />
                      <span className="text-xs px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100">
                        {getLocationDisplayName(log.to_location)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-medium text-slate-700">{log.moved_by}</div>
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {new Date(log.moved_at).toLocaleString('vi-VN')}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
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
        .select(`*, sku_info:sku_id (brand, model_name, spec)`)
        .eq('status', 'AVAILABLE')
        .order('received_at', { ascending: false });
      if (error) throw error;
      setAvailableItems(items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    }
  }, [toast]);

  useEffect(() => {
    if (!permissions.canMoveItems()) {
      toast({ title: 'Không Có Quyền', description: 'Bạn không có quyền truy cập trang này', variant: 'destructive' });
      navigate('/dashboard');
    } else {
      fetchAvailableItems();
    }
  }, [permissions, toast, navigate, fetchAvailableItems]);

  useEffect(() => { if (selectedItem) setToLocation(''); }, [selectedItem]);

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
      if (!selectedItem) { toast({ title: 'Chưa chọn SP', description: 'Vui lòng chọn sản phẩm', variant: 'destructive' }); setLoading(false); return; }
      if (!toLocation) { toast({ title: 'Chưa chọn vị trí', description: 'Vui lòng chọn vị trí đích', variant: 'destructive' }); setLoading(false); return; }
      if (!movedBy.trim()) { toast({ title: 'Chưa nhập tên', description: 'Vui lòng nhập tên người thực hiện', variant: 'destructive' }); setLoading(false); return; }

      const fromLocation = selectedItem.location;
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ location: toLocation, last_move_at: new Date().toISOString() })
        .eq('id', selectedItem.id);
      if (updateError) throw updateError;

      const { error: logError } = await supabase
        .from('stock_move_logs')
        .insert({ item_id: selectedItem.id, serial_number: selectedItem.serial_number, from_location: fromLocation, to_location: toLocation, moved_by: movedBy });
      if (logError) throw logError;

      toast({ title: 'Thành Công', description: `Đã di chuyển ${selectedItem.serial_number} từ ${getLocationDisplayName(fromLocation)} đến ${getLocationDisplayName(toLocation)}` });
      setSelectedItem(null); setToLocation(''); setMovedBy('');
      fetchAvailableItems();
    } catch (error) {
      console.error('Error moving item:', error);
      toast({ title: 'Lỗi', description: 'Không thể luân chuyển sản phẩm.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-4 max-w-3xl mx-auto animate-fade-in">
        {/* Page Header */}
        <div className="page-header">
          <h1>
            <Move className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            Luân Chuyển Hàng Hóa
          </h1>
          <p>Di chuyển sản phẩm giữa các vị trí lưu trữ</p>
        </div>

        {/* Move Form */}
        <div className="section-card">
          <div className="section-card-header">
            <Move className="h-4 w-4 text-blue-500" />
            <h3>Thông Tin Luân Chuyển</h3>
          </div>
          <div className="section-card-content">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Chọn Sản Phẩm</Label>
                {selectedItem ? (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">
                          {selectedItem.sku_info?.brand} {selectedItem.sku_info?.model_name}
                        </div>
                        <div className="font-mono text-xs text-slate-500 mt-0.5">{selectedItem.serial_number}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Vị trí: <span className="font-medium text-slate-700">{getLocationDisplayName(selectedItem.location)}</span>
                        </div>
                      </div>
                      <Button type="button" variant="outline" size="sm" onClick={() => setSelectedItem(null)} className="text-xs h-7 shrink-0">
                        Đổi
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button type="button" variant="outline" className="w-full h-11 border-dashed border-slate-300 hover:bg-slate-50 text-sm text-slate-500" onClick={() => setSelectDialogOpen(true)}>
                    <Package className="mr-2 h-4 w-4" /> Chọn sản phẩm từ kho
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Vị Trí Đích</Label>
                <Select value={toLocation} onValueChange={setToLocation}>
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Chọn vị trí đích" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedItem?.location !== 'DISPLAY_T1' && <SelectItem value="DISPLAY_T1">Kệ Trưng Bày T1</SelectItem>}
                    {selectedItem?.location !== 'STORAGE_T1' && <SelectItem value="STORAGE_T1">Tủ Chứa T1</SelectItem>}
                    {selectedItem?.location !== 'WAREHOUSE_T3' && <SelectItem value="WAREHOUSE_T3">Kho T3</SelectItem>}
                    {selectedItem?.location !== 'WARRANTY_KT' && <SelectItem value="WARRANTY_KT">BH Phòng KT</SelectItem>}
                  </SelectContent>
                </Select>
                {selectedItem && <p className="text-xs text-slate-400">Hiện tại: {getLocationDisplayName(selectedItem.location)}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-700">Người Thực Hiện</Label>
                <Input placeholder="Ví dụ: Nguyễn Văn Long" value={movedBy} onChange={(e) => setMovedBy(e.target.value)} className="h-10 border-slate-200" />
              </div>

              <Button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-sm font-medium" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Đang xử lý...</> : <><Move className="mr-2 h-4 w-4" />Luân Chuyển</>}
              </Button>
            </form>
          </div>
        </div>

        {/* Location Guide */}
        {!permissions.isAdmin() && (
          <div className="section-card">
            <div className="section-card-header">
              <MapPin className="h-4 w-4 text-slate-500" />
              <h3>Hướng Dẫn Vị Trí</h3>
            </div>
            <div className="section-card-content space-y-2">
              {[
                { label: 'Kệ Trưng Bày T1', desc: 'Demo cho khách xem và trải nghiệm', color: 'bg-purple-50 border-purple-100' },
                { label: 'Tủ Chứa T1', desc: 'Nguyên seal, sẵn sàng bán', color: 'bg-blue-50 border-blue-100' },
                { label: 'Kho T3', desc: 'Kho dự trữ, hàng tồn dài hạn', color: 'bg-slate-50 border-slate-100' },
              ].map((loc) => (
                <div key={loc.label} className={`p-3 rounded-lg border ${loc.color}`}>
                  <div className="text-sm font-medium text-slate-800">{loc.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{loc.desc}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Move History (Admin) */}
        {permissions.isAdmin() && <MoveHistorySection />}

        {/* Product Selection Dialog */}
        <Dialog open={selectDialogOpen} onOpenChange={setSelectDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" /> Chọn Sản Phẩm
              </DialogTitle>
              <DialogDescription className="text-xs">Tìm và chọn sản phẩm từ kho</DialogDescription>
            </DialogHeader>

            <div className="space-y-3 border-b border-slate-100 pb-3">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input placeholder="Tìm serial, tên SP..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-32 h-9 text-xs">
                    <SelectValue placeholder="Vị trí" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Tất cả</SelectItem>
                    <SelectItem value="DISPLAY_T1">Kệ T1</SelectItem>
                    <SelectItem value="STORAGE_T1">Tủ T1</SelectItem>
                    <SelectItem value="WAREHOUSE_T3">Kho T3</SelectItem>
                    <SelectItem value="WARRANTY_KT">BH/KT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-slate-500">{filteredItems.length} / {availableItems.length} sản phẩm</div>
            </div>

            <div className="overflow-y-auto max-h-[50vh] space-y-1.5">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Không tìm thấy sản phẩm</p>
                </div>
              ) : (
                filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-200 cursor-pointer transition-colors"
                    onClick={() => { setSelectedItem(item); setSelectDialogOpen(false); setSearchQuery(''); setLocationFilter('All'); }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-900 truncate">{item.sku_info?.brand} {item.sku_info?.model_name}</div>
                        <div className="font-mono text-xs text-slate-500">{item.serial_number}</div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-100">{getLocationDisplayName(item.location)}</span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded border border-emerald-100">{item.condition}</span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-300" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default MoveItem;
