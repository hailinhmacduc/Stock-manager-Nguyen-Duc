import { useState, useEffect } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { ClipboardCheck, CheckCircle2, XCircle, AlertCircle, PlayCircle, StopCircle } from 'lucide-react';
import { getLocationDisplayName } from '@/lib/constants';
import { Alert, AlertDescription } from '@/components/ui/alert';

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

  // Statistics
  const totalChecked = checkedItems.length;
  const matchedCount = checkedItems.filter(item => item.is_match).length;
  const mismatchedCount = checkedItems.filter(item => !item.is_match).length;
  const totalExpected = expectedItems.length;
  const missingCount = totalExpected - matchedCount;

  const startCheckSession = async () => {
    if (!checkingLocation) {
      toast({
        title: '❌ Lỗi',
        description: 'Vui lòng chọn vị trí cần kiểm kho',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Load danh sách sản phẩm dự kiến tại vị trí này
      const { data: itemsData, error: itemsError } = await supabase
        .from('inventory_items')
        .select(`
          id,
          serial_number,
          status,
          sku_info:sku_id (
            model_name
          )
        `)
        .eq('location', checkingLocation)
        .eq('status', 'AVAILABLE');

      if (itemsError) throw itemsError;

      const expectedList: ExpectedItem[] = (itemsData || []).map(item => ({
        id: item.id,
        serial_number: item.serial_number,
        product_name: item.sku_info?.model_name || 'N/A',
        status: item.status
      }));

      setExpectedItems(expectedList);

      // Tạo session kiểm kho
      const { data, error } = await supabase
        .from('inventory_check_sessions')
        .insert({
          location: checkingLocation,
          started_by: user?.email || 'unknown',
          status: 'IN_PROGRESS'
        })
        .select()
        .single();

      if (error) throw error;

      setSessionId(data.id);
      setIsScanning(true);
      setCheckedItems([]);

      toast({
        title: '✅ Bắt Đầu Kiểm Kho',
        description: `Đang kiểm kho: ${getLocationDisplayName(checkingLocation)} - Có ${expectedList.length} sản phẩm cần kiểm`,
      });
    } catch (error) {
      console.error('Error starting check session:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Không thể bắt đầu phiên kiểm kho',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = async (serialNumber: string) => {
    if (!sessionId) return;

    // Kiểm tra xem đã quét sản phẩm này chưa
    if (checkedItems.some(item => item.serial_number === serialNumber)) {
      toast({
        title: '⚠️ Cảnh Báo',
        description: 'Sản phẩm này đã được quét rồi!',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      // Lấy thông tin sản phẩm từ database - SỬ DỤNG .maybeSingle() ĐỂ AN TOÀN HƠN
      const { data: item, error: fetchError } = await supabase
        .from('inventory_items')
        .select(`
          id,
          serial_number,
          location,
          sku_info:sku_id (
            brand,
            model_name
          )
        `)
        .eq('serial_number', serialNumber)
        .maybeSingle();

      if (fetchError) {
        // Log lỗi chi tiết để debug
        console.error('Supabase fetch error:', fetchError);
        throw fetchError;
      }

      if (!item) {
        toast({
          title: '❌ Không Tìm Thấy',
          description: `Serial "${serialNumber}" không tồn tại trong hệ thống`,
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      const isMatch = item.location === checkingLocation;
      const productName = item.sku_info
        ? item.sku_info.model_name
        : 'N/A';

      // Lưu log kiểm kho
      const { error: logError } = await supabase
        .from('inventory_check_logs')
        .insert({
          check_session_id: sessionId,
          serial_number: serialNumber,
          expected_location: checkingLocation,
          actual_location: item.location,
          is_match: isMatch,
          checked_by: user?.email || 'unknown'
        });

      if (logError) throw logError;

      // Thêm vào danh sách đã quét
      const newCheckedItem: CheckedItem = {
        id: item.id,
        serial_number: serialNumber,
        expected_location: checkingLocation,
        actual_location: item.location,
        is_match: isMatch,
        product_name: productName,
        checked_at: new Date().toISOString()
      };

      setCheckedItems(prev => [newCheckedItem, ...prev]);

      // Show toast based on match/mismatch
      if (isMatch) {
        toast({
          title: '✅ Khớp - Đúng Vị Trí!',
          description: `${productName}\nSerial: ${serialNumber}`,
          className: 'bg-green-50 border-green-500'
        });

        // Vibration feedback cho khớp
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]); // 2 lần rung ngắn
        }
      } else {
        toast({
          title: '⚠️ SAI VỊ TRÍ!',
          description: `${productName}\nSản phẩm thuộc: ${getLocationDisplayName(item.location)}\n⚠️ Vui lòng trả lại về đúng vị trí hoặc luân chuyển sản phẩm`,
          variant: 'destructive',
          duration: 5000 // Hiển thị lâu hơn cho sai vị trí
        });

        // Vibration feedback cho không khớp - rung dài hơn
        if ('vibrate' in navigator) {
          navigator.vibrate([200, 100, 200, 100, 200]); // Rung 3 lần dài
        }
      }
    } catch (error) {
      console.error('Error processing scan:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Không thể xử lý kết quả quét',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const endCheckSession = async () => {
    if (!sessionId) return;

    setLoading(true);
    try {
      // Tính toán kết quả chi tiết
      const missingSummary = missingCount > 0
        ? `\n⚠️ CÒN THIẾU ${missingCount} SẢN PHẨM (có thể đã bán hoặc chưa quét)`
        : '';

      const mismatchSummary = mismatchedCount > 0
        ? `\n⚠️ ${mismatchedCount} sản phẩm SAI VỊ TRÍ - cần luân chuyển`
        : '';

      // Cập nhật session với kết quả
      const { error } = await supabase
        .from('inventory_check_sessions')
        .update({
          completed_at: new Date().toISOString(),
          status: 'COMPLETED',
          total_items_checked: totalChecked,
          matched_items: matchedCount,
          mismatched_items: mismatchedCount
        })
        .eq('id', sessionId);

      if (error) throw error;

      // Hiển thị kết quả chi tiết
      const resultMessage = `📊 Kết quả kiểm kho:\n` +
        `• Tổng quét: ${totalChecked} sản phẩm\n` +
        `• Dự kiến: ${totalExpected} sản phẩm\n` +
        `• ✅ Khớp: ${matchedCount}\n` +
        `• ❌ Sai vị trí: ${mismatchedCount}${missingSummary}${mismatchSummary}`;

      toast({
        title: missingCount > 0 || mismatchedCount > 0
          ? '⚠️ Hoàn Thành - Có Vấn Đề!'
          : '✅ Hoàn Thành - Tất Cả Khớp!',
        description: resultMessage,
        duration: 8000,
        variant: missingCount > 0 || mismatchedCount > 0 ? 'destructive' : 'default',
        className: missingCount === 0 && mismatchedCount === 0 ? 'bg-green-50 border-green-500' : ''
      });

      // Reset state sau 2 giây để người dùng đọc kết quả
      setTimeout(() => {
        setSessionId(null);
        setIsScanning(false);
        setCheckingLocation('');
        setCheckedItems([]);
        setExpectedItems([]);
      }, 2000);

    } catch (error) {
      console.error('Error ending check session:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Không thể kết thúc phiên kiểm kho',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 pb-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Kiểm Kho Theo Mã Vạch
          </h1>
          <p className="text-muted-foreground mt-1">
            Quét mã vạch để kiểm tra vị trí sản phẩm trong kho
          </p>
        </div>

        {/* Start Check Session */}
        {!sessionId && (
          <Card className="shadow-lg border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-blue-600" />
                Bắt Đầu Kiểm Kho
              </CardTitle>
              <CardDescription>
                Chọn vị trí cần kiểm và bắt đầu quét mã vạch sản phẩm
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Chọn Vị Trí Cần Kiểm</label>
                <Select value={checkingLocation} onValueChange={setCheckingLocation}>
                  <SelectTrigger className="h-12 text-base">
                    <SelectValue placeholder="-- Chọn vị trí --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISPLAY_T1">🖥️ Kệ Trưng Bày T1</SelectItem>
                    <SelectItem value="STORAGE_T1">📦 Tủ Chứa T1</SelectItem>
                    <SelectItem value="WAREHOUSE_T3">🏢 Kho T3</SelectItem>
                    <SelectItem value="WARRANTY_KT">🔧 Lỗi/ Bảo Hành Phòng KT</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={startCheckSession}
                disabled={!checkingLocation || loading}
                className="w-full h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              >
                <PlayCircle className="mr-2 h-5 w-5" />
                Bắt Đầu Kiểm Kho
              </Button>

              <Alert className="bg-amber-50 border-amber-300">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800 text-sm">
                  <strong>Lưu ý:</strong> Mỗi phiên kiểm kho chỉ kiểm tra 1 vị trí.
                  Hệ thống sẽ so sánh vị trí thực tế của sản phẩm với vị trí đang kiểm.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        )}

        {/* Active Check Session */}
        {sessionId && (
          <>
            {/* Statistics - Cải thiện hiển thị*/}
            <Card className="shadow-lg bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-4 border-emerald-400">
              <CardContent className="pt-4 pb-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
                  <div className="text-center p-3 bg-white rounded-lg shadow-sm border-2 border-blue-200">
                    <div className="text-2xl md:text-3xl font-bold text-blue-600">{totalExpected}</div>
                    <div className="text-xs md:text-sm text-slate-600 font-medium">Dự Kiến</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg shadow-sm border-2 border-indigo-200">
                    <div className="text-2xl md:text-3xl font-bold text-indigo-600">{totalChecked}</div>
                    <div className="text-xs md:text-sm text-slate-600 font-medium">Đã Quét</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg shadow-sm border-2 border-green-200">
                    <div className="text-2xl md:text-3xl font-bold text-green-600">{matchedCount}</div>
                    <div className="text-xs md:text-sm text-slate-600 font-medium">✅ Khớp</div>
                  </div>
                  <div className="text-center p-3 bg-white rounded-lg shadow-sm border-2 border-red-200">
                    <div className="text-2xl md:text-3xl font-bold text-red-600">{mismatchedCount}</div>
                    <div className="text-xs md:text-sm text-slate-600 font-medium">❌ Sai VT</div>
                  </div>
                  <div className={`text-center p-3 bg-white rounded-lg shadow-sm border-2 ${missingCount > 0 ? 'border-amber-400 ring-2 ring-amber-300' : 'border-gray-200'}`}>
                    <div className={`text-2xl md:text-3xl font-bold ${missingCount > 0 ? 'text-amber-600' : 'text-gray-600'}`}>{missingCount}</div>
                    <div className="text-xs md:text-sm text-slate-600 font-medium">⚠️ Thiếu</div>
                  </div>
                </div>
                <div className="mt-3 text-center text-sm md:text-base font-bold text-emerald-800 border-t-2 border-emerald-200 pt-3 bg-white/50 rounded-lg px-3 py-2">
                  📍 Đang Kiểm: <span className="text-emerald-900">{getLocationDisplayName(checkingLocation)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Scanner */}
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Quét Mã Vạch Sản Phẩm</CardTitle>
                <CardDescription>
                  Hướng camera vào mã vạch trên sản phẩm để kiểm tra
                </CardDescription>
              </CardHeader>
              <CardContent>
                <BarcodeScanner
                  onScan={handleBarcodeScan}
                  onError={(error) => {
                    toast({
                      title: '❌ Lỗi Camera',
                      description: error,
                      variant: 'destructive'
                    });
                  }}
                />
              </CardContent>
            </Card>

            {/* Danh sách sản phẩm còn thiếu */}
            {missingCount > 0 && (
              <Alert className="bg-amber-50 border-2 border-amber-400 shadow-lg">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <AlertDescription className="text-amber-900">
                  <div className="font-bold text-base mb-2">⚠️ CÒN THIẾU {missingCount} SẢN PHẨM CHƯA QUÉT:</div>
                  <div className="space-y-1 text-sm max-h-40 overflow-y-auto">
                    {expectedItems
                      .filter(expected => !checkedItems.some(checked => checked.serial_number === expected.serial_number))
                      .map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2 py-1 border-b border-amber-200 last:border-0">
                          <span className="font-mono text-xs bg-amber-100 px-2 py-0.5 rounded">{index + 1}</span>
                          <span className="font-medium">{item.product_name}</span>
                          <span className="text-xs font-mono text-amber-700">({item.serial_number})</span>
                        </div>
                      ))
                    }
                  </div>
                  <div className="mt-2 text-xs italic">
                    💡 Các sản phẩm này có thể đã bán hoặc chưa được quét. Tiếp tục quét hoặc kết thúc để lưu kết quả.
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Checked Items List */}
            <Card className="shadow-lg border-2 border-emerald-300">
              <CardHeader className="bg-emerald-50">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-emerald-900">Danh Sách Đã Quét ({checkedItems.length})</CardTitle>
                    <CardDescription>Lịch sử các sản phẩm đã kiểm tra trong phiên này</CardDescription>
                  </div>
                  <Button
                    onClick={endCheckSession}
                    variant="destructive"
                    disabled={loading || checkedItems.length === 0}
                    className="h-10"
                  >
                    <StopCircle className="mr-2 h-4 w-4" />
                    Kết Thúc
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {checkedItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <ClipboardCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Chưa có sản phẩm nào được quét</p>
                    <p className="text-sm mt-1">Bắt đầu quét mã vạch để kiểm kho</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {checkedItems.map((item, index) => (
                      <div
                        key={`${item.serial_number}-${index}`}
                        className={`p-4 rounded-lg border-2 shadow-md ${item.is_match
                            ? 'bg-green-50 border-green-400'
                            : 'bg-red-50 border-red-400 ring-2 ring-red-200'
                          }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              {item.is_match ? (
                                <CheckCircle2 className="h-6 w-6 text-green-600 shrink-0" />
                              ) : (
                                <XCircle className="h-6 w-6 text-red-600 shrink-0" />
                              )}
                              <span className={`font-bold text-base ${item.is_match ? 'text-green-800' : 'text-red-800'}`}>
                                {item.is_match ? '✅ Khớp - Đúng Vị Trí' : '⚠️ SAI VỊ TRÍ'}
                              </span>
                            </div>
                            <div className="text-base font-bold text-slate-900 mb-1">{item.product_name}</div>
                            <div className="text-sm font-mono text-slate-600 bg-white/60 px-2 py-1 rounded inline-block">
                              {item.serial_number}
                            </div>
                            {!item.is_match && (
                              <div className="mt-3 p-3 bg-red-100 border-2 border-red-300 rounded-lg">
                                <div className="text-sm font-bold text-red-900 mb-1">
                                  🚫 Sản phẩm thuộc: <span className="text-red-700 text-base">{getLocationDisplayName(item.actual_location)}</span>
                                </div>
                                <div className="text-xs text-red-800">
                                  ⚠️ Vui lòng trả lại về đúng vị trí hoặc luân chuyển sản phẩm
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 shrink-0">
                            {new Date(item.checked_at).toLocaleTimeString('vi-VN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
};

export default InventoryCheck;

