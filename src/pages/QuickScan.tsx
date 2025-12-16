import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarcodeScanner } from '@/components/BarcodeScanner';
import { SellItemDialog } from '@/components/SellItemDialog';
import { EditItemDialog } from '@/components/EditItemDialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { 
  Scan, 
  Package, 
  ShoppingCart, 
  Move, 
  Edit, 
  Trash2, 
  MapPin, 
  Tag, 
  AlertCircle,
  Calendar,
  RefreshCw,
  X
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getStatusDisplayName, getConditionDisplayName, getLocationDisplayName } from '@/lib/constants';

interface InventoryItem {
  id: string;
  sku_id: string;
  serial_number: string;
  status: string;
  condition: string;
  location: string;
  received_at: string;
  cost: number;
  sku_info?: {
    brand: string;
    model_name: string;
    spec: string;
  };
}

const QuickScan = () => {
  const { toast } = useToast();
  const { user, permissions } = useAuth();
  
  const [scannedItem, setScannedItem] = useState<InventoryItem | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Dialog states
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [targetLocation, setTargetLocation] = useState<string>('');

  const handleScan = async (decodedText: string) => {
    // Nếu đang hiện dialog kết quả thì không scan nữa
    if (showResultDialog) return;

    console.log('Quét được mã vạch:', decodedText);
    setLoading(true);
    
    try {
      // Tìm sản phẩm theo serial number
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          sku_info:sku_id (
            brand,
            model_name,
            spec
          )
        `)
        .eq('serial_number', decodedText)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // Không tìm thấy sản phẩm
          toast({
            title: '❌ Không Tìm Thấy',
            description: `Không tìm thấy sản phẩm với mã "${decodedText}"`,
            variant: 'destructive',
            duration: 4000,
          });
          setScannedItem(null);
        } else {
          throw error;
        }
      } else {
        setScannedItem(data);
        setShowResultDialog(true); // Hiển thị popup kết quả
        toast({
          title: '✅ Quét Thành Công',
          description: `Đã tìm thấy: ${data.sku_info?.model_name || data.sku_id}`,
          duration: 2000,
        });
      }
    } catch (error: any) {
      console.error('Lỗi khi tìm sản phẩm:', error);
      toast({
        title: '❌ Lỗi',
        description: error.message || 'Không thể tìm sản phẩm',
        variant: 'destructive',
      });
      setScannedItem(null);
    } finally {
      setLoading(false);
    }
  };

  const handleScanError = (error: string) => {
    console.error('Lỗi quét:', error);
  };

  const handleDelete = async () => {
    if (!scannedItem) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', scannedItem.id);

      if (error) throw error;

      toast({
        title: '✅ Đã Xóa',
        description: `Sản phẩm ${scannedItem.serial_number} đã được xóa`,
      });

      setScannedItem(null);
      setShowResultDialog(false);
      setDeleteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: '❌ Lỗi',
        description: error.message || 'Không thể xóa sản phẩm',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMove = async () => {
    if (!scannedItem || !targetLocation) return;
    
    setLoading(true);
    try {
      // Update location
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({ 
          location: targetLocation,
          last_move_at: new Date().toISOString()
        })
        .eq('id', scannedItem.id);

      if (updateError) throw updateError;

      // Log the move
      const { error: logError } = await supabase
        .from('stock_move_logs')
        .insert({
          item_id: scannedItem.id,
          serial_number: scannedItem.serial_number,
          from_location: scannedItem.location,
          to_location: targetLocation,
          moved_by: user?.id || '',
        });

      if (logError) throw logError;

      toast({
        title: '✅ Đã Luân Chuyển',
        description: `Sản phẩm đã được chuyển đến ${getLocationDisplayName(targetLocation)}`,
      });

      // Refresh item data
      setScannedItem({ ...scannedItem, location: targetLocation });
      setMoveDialogOpen(false);
    } catch (error: any) {
      toast({
        title: '❌ Lỗi',
        description: error.message || 'Không thể luân chuyển sản phẩm',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshItem = async () => {
    if (!scannedItem) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          sku_info:sku_id (
            brand,
            model_name,
            spec
          )
        `)
        .eq('id', scannedItem.id)
        .single();

      if (error) throw error;
      
      setScannedItem(data);
      toast({
        title: '✅ Đã Cập Nhật',
        description: 'Thông tin sản phẩm đã được làm mới',
      });
    } catch (error: any) {
      toast({
        title: '❌ Lỗi',
        description: 'Không thể làm mới thông tin',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Close popup and reset
  const closeResultDialog = () => {
    setShowResultDialog(false);
    setScannedItem(null); // Reset để sẵn sàng quét mới
  };

  return (
    <Layout>
      <div className="mobile-compact space-y-4 md:space-y-6 pb-20">
        {/* Header */}
        <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 mobile-header text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
          <div className="relative">
            <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
              <Scan className="h-6 w-6 md:h-10 md:w-10" />
              Quét Nhanh
            </h1>
            <p className="text-violet-100 text-xs md:text-lg">
              Quét mã vạch để xem và quản lý sản phẩm
            </p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        </div>

        {/* Scanner Card */}
        <Card className="shadow-xl border-4 border-violet-300">
          <CardHeader className="pb-3 md:pb-4 bg-gradient-to-r from-violet-50 to-purple-50 border-b-2 border-violet-200">
            <CardTitle className="text-lg md:text-2xl font-bold text-violet-900 flex items-center gap-2">
              <Scan className="h-5 w-5 md:h-6 md:w-6" />
              Quét Mã Vạch Sản Phẩm
            </CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Hướng camera vào mã vạch trên sản phẩm
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 md:pt-6">
            <BarcodeScanner onScan={handleScan} onError={handleScanError} />
          </CardContent>
        </Card>

        {/* Empty State - No Item Scanned (Chỉ hiện khi không có item và không có dialog) */}
        {!scannedItem && !showResultDialog && (
          <Card className="shadow-lg border-2 border-dashed border-slate-300 bg-slate-50">
            <CardContent className="py-12 text-center">
              <Package className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <h3 className="text-lg font-bold text-slate-700 mb-2">Sẵn Sàng Quét</h3>
              <p className="text-sm text-slate-500">
                Sử dụng camera phía trên để quét mã vạch sản phẩm
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* POPUP KẾT QUẢ QUÉT */}
      <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
        <DialogContent className="max-w-lg w-[95vw] rounded-2xl p-0 overflow-hidden border-0 shadow-3xl">
          {scannedItem && (
            <>
              {/* Header của Popup */}
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-4 text-white relative">
                <button 
                  onClick={closeResultDialog}
                  className="absolute top-3 right-3 p-1 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                <div className="flex gap-3 items-start pr-8">
                  <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <Package className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg leading-tight mb-1">
                      {scannedItem.sku_info?.model_name || scannedItem.sku_id}
                    </h3>
                    <div className="flex items-center gap-2 text-emerald-100 text-xs font-mono bg-emerald-700/50 px-2 py-0.5 rounded w-fit">
                      <span>SN: {scannedItem.serial_number}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Nội dung Popup */}
              <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto bg-slate-50">
                {/* Thông tin chi tiết */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Location */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1 text-slate-500">
                      <MapPin className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Vị Trí</span>
                    </div>
                    <p className="font-bold text-slate-800 text-sm">
                      {getLocationDisplayName(scannedItem.location)}
                    </p>
                  </div>

                  {/* Status */}
                  <div className={`p-3 rounded-xl border shadow-sm ${
                    scannedItem.status === 'AVAILABLE' ? 'bg-green-50 border-green-200 text-green-800' :
                    scannedItem.status === 'SOLD' ? 'bg-gray-50 border-gray-200 text-gray-800' :
                    'bg-red-50 border-red-200 text-red-800'
                  }`}>
                    <div className="flex items-center gap-1.5 mb-1 opacity-80">
                      <Package className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Trạng Thái</span>
                    </div>
                    <p className="font-bold text-sm">
                      {getStatusDisplayName(scannedItem.status)}
                    </p>
                  </div>
                  
                  {/* Condition */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1 text-slate-500">
                      <Tag className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Tình Trạng</span>
                    </div>
                    <p className="font-bold text-slate-800 text-sm">
                      {getConditionDisplayName(scannedItem.condition)}
                    </p>
                  </div>

                  {/* Date */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                    <div className="flex items-center gap-1.5 mb-1 text-slate-500">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className="text-xs font-semibold">Ngày Nhập</span>
                    </div>
                    <p className="font-bold text-slate-800 text-sm">
                      {formatDate(scannedItem.received_at)}
                    </p>
                  </div>
                </div>

                {/* Specs */}
                {scannedItem.sku_info?.spec && (
                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3">
                    <h4 className="text-xs font-bold text-blue-800 mb-1">Thông số kỹ thuật</h4>
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
                      {scannedItem.sku_info.spec}
                    </p>
                  </div>
                )}

                {/* Warning if sold */}
                {scannedItem.status === 'SOLD' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-2 text-amber-800">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <p className="text-xs font-semibold">Sản phẩm này đã được bán</p>
                  </div>
                )}
              </div>

              {/* Footer Actions */}
              <div className="p-4 bg-white border-t border-slate-100 grid grid-cols-2 gap-2">
                {/* Bán Hàng Button */}
                {permissions.canSellItems() && scannedItem.status === 'AVAILABLE' && (
                  <Button
                    onClick={() => setSellDialogOpen(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-11"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Bán Ngay
                  </Button>
                )}

                {/* Luân Chuyển Button */}
                {permissions.canMoveItems() && (
                  <Button
                    onClick={() => setMoveDialogOpen(true)}
                    className="bg-violet-600 hover:bg-violet-700 text-white font-bold h-11"
                  >
                    <Move className="h-4 w-4 mr-2" />
                    Chuyển Kho
                  </Button>
                )}

                {/* Chỉnh Sửa Button */}
                {permissions.canEditItems() && (
                  <Button
                    variant="outline"
                    onClick={() => setEditDialogOpen(true)}
                    className="border-slate-300 text-slate-700 h-11"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Sửa
                  </Button>
                )}

                {/* Xóa Button */}
                {permissions.canDeleteItems() && (
                  <Button
                    variant="ghost"
                    onClick={() => setDeleteDialogOpen(true)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 h-11"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* CÁC DIALOG CHỨC NĂNG (Giữ nguyên logic cũ nhưng được trigger từ Popup mới) */}
      
      {/* Sell Dialog */}
      {scannedItem && (
        <SellItemDialog
          open={sellDialogOpen}
          onOpenChange={setSellDialogOpen}
          serialNumber={scannedItem.serial_number}
          onSuccess={() => {
            refreshItem();
            setSellDialogOpen(false);
          }}
        />
      )}

      {/* Edit Dialog */}
      {scannedItem && (
        <EditItemDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          serialNumber={scannedItem.serial_number}
          onSuccess={() => {
            refreshItem();
            setEditDialogOpen(false);
          }}
        />
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-900">Xác Nhận Xóa Sản Phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa sản phẩm này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy Bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={loading}
            >
              {loading ? 'Đang Xóa...' : 'Xác Nhận Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Move Dialog */}
      <AlertDialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-purple-900">Luân Chuyển Sản Phẩm</AlertDialogTitle>
            <AlertDialogDescription>
              Chọn vị trí mới cho sản phẩm này
            </AlertDialogDescription>
          </AlertDialogHeader>
          {scannedItem && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-sm font-bold text-purple-900">
                  {scannedItem.sku_info?.model_name || scannedItem.sku_id}
                </p>
                <p className="text-xs text-purple-700 mt-1">
                  Vị trí hiện tại: <span className="font-bold">{getLocationDisplayName(scannedItem.location)}</span>
                </p>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-900">Chọn Vị Trí Mới:</label>
                <div className="grid grid-cols-1 gap-2">
                  {['DISPLAY_T1', 'STORAGE_T1', 'WAREHOUSE_T3'].map((loc) => (
                    <Button
                      key={loc}
                      variant={targetLocation === loc ? 'default' : 'outline'}
                      onClick={() => setTargetLocation(loc)}
                      disabled={loc === scannedItem.location}
                      className="justify-start h-12"
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      {getLocationDisplayName(loc)}
                      {loc === scannedItem.location && (
                        <span className="ml-auto text-xs">(Hiện Tại)</span>
                      )}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Hủy Bỏ</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleMove}
              disabled={!targetLocation || loading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {loading ? 'Đang Chuyển...' : 'Xác Nhận Luân Chuyển'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
};

export default QuickScan;
