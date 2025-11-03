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

const InventoryCheck = () => {
  const [checkingLocation, setCheckingLocation] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [checkedItems, setCheckedItems] = useState<CheckedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Statistics
  const totalChecked = checkedItems.length;
  const matchedCount = checkedItems.filter(item => item.is_match).length;
  const mismatchedCount = checkedItems.filter(item => !item.is_match).length;

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
        description: `Đang kiểm kho: ${getLocationDisplayName(checkingLocation)}`,
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
      // Lấy thông tin sản phẩm từ database
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
        .single();

      if (fetchError || !item) {
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
          title: '✅ Khớp!',
          description: `${productName} - Đúng vị trí`,
          className: 'bg-green-50 border-green-500'
        });
      } else {
        toast({
          title: '❌ Không Khớp!',
          description: `${productName} - Đang ở ${getLocationDisplayName(item.location)}`,
          variant: 'destructive'
        });
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

      toast({
        title: '✅ Hoàn Thành Kiểm Kho',
        description: `Đã kiểm ${totalChecked} sản phẩm - Khớp: ${matchedCount} - Không khớp: ${mismatchedCount}`,
      });

      // Reset state
      setSessionId(null);
      setIsScanning(false);
      setCheckingLocation('');
      setCheckedItems([]);
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
            {/* Statistics */}
            <Card className="shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300">
              <CardContent className="pt-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{totalChecked}</div>
                    <div className="text-sm text-slate-600 font-medium">Đã Quét</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">{matchedCount}</div>
                    <div className="text-sm text-slate-600 font-medium">Khớp</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-red-600">{mismatchedCount}</div>
                    <div className="text-sm text-slate-600 font-medium">Không Khớp</div>
                  </div>
                </div>
                <div className="mt-4 text-center text-sm font-medium text-blue-800 border-t border-blue-200 pt-3">
                  Đang Kiểm: <span className="font-bold">{getLocationDisplayName(checkingLocation)}</span>
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

            {/* Checked Items List */}
            <Card className="shadow-lg">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Danh Sách Đã Quét ({checkedItems.length})</CardTitle>
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
                        className={`p-4 rounded-lg border-2 ${
                          item.is_match
                            ? 'bg-green-50 border-green-300'
                            : 'bg-red-50 border-red-300'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {item.is_match ? (
                                <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-600 shrink-0" />
                              )}
                              <span className={`font-bold ${item.is_match ? 'text-green-800' : 'text-red-800'}`}>
                                {item.is_match ? 'Khớp' : 'Không Khớp'}
                              </span>
                            </div>
                            <div className="text-sm font-medium text-slate-900">{item.product_name}</div>
                            <div className="text-xs font-mono text-slate-600 mt-1">{item.serial_number}</div>
                            {!item.is_match && (
                              <div className="mt-2 text-xs">
                                <span className="text-slate-600">Đang ở: </span>
                                <span className="font-bold text-red-700">
                                  {getLocationDisplayName(item.actual_location)}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
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

