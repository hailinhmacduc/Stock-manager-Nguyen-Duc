import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardCheck, CheckCircle2, XCircle, AlertCircle, PlayCircle, StopCircle, MapPin } from 'lucide-react';
import { getLocationDisplayName } from '@/lib/constants';

interface CheckedItem {
  id: string;
  serial_number: string;
  expected_location: string;
  actual_location: string;
  is_match: boolean;
  product_name: string;
  checked_at: string;
}

interface ExpectedItem {
  id: string;
  serial_number: string;
  product_name: string;
  status: string;
}

const InventoryCheck = () => {
  const [checkingLocation, setCheckingLocation] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [checkedItems, setCheckedItems] = useState<CheckedItem[]>([]);
  const [expectedItems, setExpectedItems] = useState<ExpectedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const totalChecked = checkedItems.length;
  const matchedCount = checkedItems.filter(item => item.is_match).length;
  const mismatchedCount = checkedItems.filter(item => !item.is_match).length;
  const totalExpected = expectedItems.length;
  const missingCount = totalExpected - matchedCount;

  const startCheckSession = async () => {
    if (!checkingLocation) {
      toast({ title: 'Lỗi', description: 'Vui lòng chọn vị trí', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select(`id, serial_number, status, sku_info:sku_id (model_name)`)
        .eq('location', checkingLocation)
        .eq('status', 'AVAILABLE');
      if (itemsError) throw itemsError;

      const expectedList: ExpectedItem[] = (itemsData || []).map(item => ({
        id: item.id, serial_number: item.serial_number,
        product_name: item.sku_info?.model_name || 'N/A', status: item.status
      }));
      setExpectedItems(expectedList);

      const { data, error } = await supabase
        .from('inventory_check_sessions')
        .insert({ location: checkingLocation, started_by: user?.email || 'unknown', status: 'IN_PROGRESS' })
        .select().single();
      if (error) throw error;

      setSessionId(data.id);
      setIsScanning(true);
      setCheckedItems([]);
      toast({ title: 'Bắt Đầu Kiểm Kho', description: `${getLocationDisplayName(checkingLocation)} - ${expectedList.length} SP cần kiểm` });
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể bắt đầu', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = async (serialNumber: string) => {
    if (!sessionId) return;
    if (checkedItems.some(item => item.serial_number === serialNumber)) {
      toast({ title: 'Cảnh Báo', description: 'SP đã quét rồi!', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data: item, error: fetchError } = await supabase
        .from('inventory_items')
        .select(`id, serial_number, location, sku_info:sku_id (brand, model_name)`)
        .eq('serial_number', serialNumber).maybeSingle();
      if (fetchError) throw fetchError;
      if (!item) { toast({ title: 'Không Tìm Thấy', description: `"${serialNumber}" không tồn tại`, variant: 'destructive' }); setLoading(false); return; }

      const isMatch = item.location === checkingLocation;
      const productName = item.sku_info ? item.sku_info.model_name : 'N/A';

      await supabase.from('inventory_check_logs').insert({
        check_session_id: sessionId, serial_number: serialNumber,
        expected_location: checkingLocation, actual_location: item.location,
        is_match: isMatch, checked_by: user?.email || 'unknown'
      });

      setCheckedItems(prev => [{ id: item.id, serial_number: serialNumber, expected_location: checkingLocation, actual_location: item.location, is_match: isMatch, product_name: productName, checked_at: new Date().toISOString() }, ...prev]);

      if (isMatch) {
        toast({ title: 'Khớp - Đúng Vị Trí', description: `${productName} (${serialNumber})`, className: 'bg-green-50 border-green-500' });
        if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
      } else {
        toast({ title: 'SAI VỊ TRÍ', description: `${productName} thuộc ${getLocationDisplayName(item.location)}`, variant: 'destructive', duration: 5000 });
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200, 100, 200]);
      }
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể xử lý', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const endCheckSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      await supabase.from('inventory_check_sessions').update({
        completed_at: new Date().toISOString(), status: 'COMPLETED',
        total_items_checked: totalChecked, matched_items: matchedCount, mismatched_items: mismatchedCount
      }).eq('id', sessionId);

      toast({
        title: missingCount > 0 || mismatchedCount > 0 ? 'Hoàn Thành - Có Vấn Đề' : 'Hoàn Thành',
        description: `Quét: ${totalChecked} | Khớp: ${matchedCount} | Sai: ${mismatchedCount} | Thiếu: ${missingCount}`,
        duration: 8000,
        variant: missingCount > 0 || mismatchedCount > 0 ? 'destructive' : 'default',
      });

      setTimeout(() => { setSessionId(null); setIsScanning(false); setCheckingLocation(''); setCheckedItems([]); setExpectedItems([]); }, 2000);
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể kết thúc', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-3 md:space-y-4 animate-fade-in">
        {/* Page Header */}
        <div className="page-header">
          <h1>
            <ClipboardCheck className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            Kiểm Kho Mã Vạch
          </h1>
          <p>Quét mã vạch để kiểm tra vị trí sản phẩm</p>
        </div>

        {/* Start Session */}
        {!sessionId && (
          <div className="section-card">
            <div className="section-card-header">
              <PlayCircle className="h-4 w-4 text-blue-500" />
              <h3>Bắt Đầu Kiểm Kho</h3>
            </div>
            <div className="section-card-content space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Chọn Vị Trí</label>
                <Select value={checkingLocation} onValueChange={setCheckingLocation}>
                  <SelectTrigger className="h-10 border-slate-200">
                    <SelectValue placeholder="Chọn vị trí cần kiểm" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISPLAY_T1">Kệ Trưng Bày T1</SelectItem>
                    <SelectItem value="STORAGE_T1">Tủ Chứa T1</SelectItem>
                    <SelectItem value="WAREHOUSE_T3">Kho T3</SelectItem>
                    <SelectItem value="WARRANTY_KT">BH Phòng KT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={startCheckSession} disabled={!checkingLocation || loading} className="w-full h-10 bg-blue-600 hover:bg-blue-700 text-sm font-medium">
                <PlayCircle className="mr-2 h-4 w-4" /> Bắt Đầu Kiểm Kho
              </Button>

              <div className="text-xs text-slate-500 bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <AlertCircle className="h-3 w-3 inline mr-1 text-amber-500" />
                Mỗi phiên chỉ kiểm 1 vị trí. Hệ thống sẽ so sánh vị trí thực tế.
              </div>
            </div>
          </div>
        )}

        {/* Active Session */}
        {sessionId && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-5 gap-2">
              {[
                { label: 'Dự Kiến', value: totalExpected, color: 'text-blue-600' },
                { label: 'Đã Quét', value: totalChecked, color: 'text-indigo-600' },
                { label: 'Khớp', value: matchedCount, color: 'text-emerald-600' },
                { label: 'Sai VT', value: mismatchedCount, color: 'text-red-600' },
                { label: 'Thiếu', value: missingCount, color: missingCount > 0 ? 'text-amber-600' : 'text-slate-400' },
              ].map((s) => (
                <div key={s.label} className="stat-card text-center py-2">
                  <div className={`text-lg md:text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-[10px] md:text-xs text-slate-500">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="text-xs text-center text-slate-500">
              <MapPin className="h-3 w-3 inline mr-1" />
              Đang kiểm: <span className="font-medium text-slate-700">{getLocationDisplayName(checkingLocation)}</span>
            </div>

            {/* Scanner */}
            <div className="section-card">
              <div className="section-card-header">
                <h3>Quét Mã Vạch</h3>
              </div>
              <div className="section-card-content">
                <BarcodeScanner
                  onScan={handleBarcodeScan}
                  onError={(error) => toast({ title: 'Lỗi Camera', description: error, variant: 'destructive' })}
                />
              </div>
            </div>

            {/* Missing Items Alert */}
            {missingCount > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                <div className="text-xs font-semibold text-amber-800 mb-1.5">
                  <AlertCircle className="h-3.5 w-3.5 inline mr-1" />
                  Còn {missingCount} SP chưa quét:
                </div>
                <div className="space-y-1 text-xs max-h-32 overflow-y-auto">
                  {expectedItems
                    .filter(expected => !checkedItems.some(checked => checked.serial_number === expected.serial_number))
                    .map((item, i) => (
                      <div key={item.id} className="flex items-center gap-2 py-0.5">
                        <span className="font-mono text-[10px] bg-amber-100 px-1.5 py-0.5 rounded text-amber-700">{i + 1}</span>
                        <span className="text-slate-700">{item.product_name}</span>
                        <span className="font-mono text-[10px] text-amber-600">({item.serial_number})</span>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Checked Items */}
            <div className="section-card">
              <div className="section-card-header justify-between">
                <div className="flex items-center gap-2">
                  <h3>Đã Quét</h3>
                  <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{checkedItems.length}</span>
                </div>
                <Button onClick={endCheckSession} variant="destructive" size="sm" disabled={loading || checkedItems.length === 0} className="h-7 text-xs">
                  <StopCircle className="mr-1 h-3.5 w-3.5" />Kết Thúc
                </Button>
              </div>

              {checkedItems.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <ClipboardCheck className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Chưa quét SP nào</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {checkedItems.map((item, idx) => (
                    <div key={`${item.serial_number}-${idx}`} className={`px-3.5 py-3 ${item.is_match ? '' : 'bg-red-50'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            {item.is_match ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> : <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                            <span className={`text-xs font-semibold ${item.is_match ? 'text-emerald-700' : 'text-red-700'}`}>
                              {item.is_match ? 'Đúng Vị Trí' : 'SAI VỊ TRÍ'}
                            </span>
                          </div>
                          <div className="text-sm font-medium text-slate-900">{item.product_name}</div>
                          <div className="font-mono text-xs text-slate-500">{item.serial_number}</div>
                          {!item.is_match && (
                            <div className="text-xs text-red-600 mt-1 bg-red-100 px-2 py-1 rounded">
                              Thuộc: <span className="font-medium">{getLocationDisplayName(item.actual_location)}</span>
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">
                          {new Date(item.checked_at).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default InventoryCheck;
