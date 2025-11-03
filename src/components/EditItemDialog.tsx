import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Edit, Trash2, AlertTriangle } from 'lucide-react';
import { getLocationDisplayName, getConditionDisplayName } from '@/lib/constants';

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serialNumber?: string;
  onSuccess: () => void;
}

interface InventoryItem {
  id: string;
  sku_id: string;
  serial_number: string;
  status: string;
  condition: string;
  location: string;
  received_at: string;
  sku_info?: {
    brand: string;
    model_name: string;
    spec: string;
  };
}

export const EditItemDialog: React.FC<EditItemDialogProps> = ({
  open,
  onOpenChange,
  serialNumber,
  onSuccess
}) => {
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [productName, setProductName] = useState('');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeleteRequest, setShowDeleteRequest] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const { toast } = useToast();
  const { user, permissions } = useAuth();

  useEffect(() => {
    if (open && serialNumber) {
      fetchItemDetails();
    }
  }, [open, serialNumber]);

  const fetchItemDetails = async () => {
    if (!serialNumber) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          sku_info (
            brand,
            model_name,
            spec
          )
        `)
        .eq('serial_number', serialNumber)
        .single();

      if (error) throw error;

      setItem(data);
      setProductName(data.sku_info?.model_name || '');
      setLocation(data.location);
      setCondition(data.condition);
    } catch (error) {
      console.error('Error fetching item:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Không thể tải thông tin sản phẩm',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    setLoading(true);
    try {
      // Update SKU info if product name changed
      if (productName !== item.sku_info?.model_name) {
        const { error: skuError } = await supabase
          .from('sku_info')
          .update({
            model_name: productName,
            brand: productName.split(' ')[0] || 'Unknown'
          })
          .eq('sku_id', item.sku_id);

        if (skuError) throw skuError;
      }

      // Update inventory item
      const { error } = await supabase
        .from('inventory_items')
        .update({
          location,
          condition
        })
        .eq('id', item.id);

      if (error) throw error;

      toast({
        title: '✅ Thành Công',
        description: 'Đã cập nhật thông tin sản phẩm'
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error updating item:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Không thể cập nhật sản phẩm',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    if (!item || !deleteReason.trim()) {
      toast({
        title: '⚠️ Thiếu Thông Tin',
        description: 'Vui lòng nhập lý do yêu cầu xóa',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('submit-delete-request', {
        body: {
          item_serial: item.serial_number,
          description: deleteReason,
          reported_by: user?.id
        }
      });

      // Handle function invoke errors
      if (error) {
        console.error('Delete request invoke error:', error);
        toast({
          title: '❌ Lỗi',
          description: error.message || 'Không thể gửi yêu cầu xóa',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      // Handle error response from function
      if (data?.error) {
        console.error('Delete request function error:', data.error);
        toast({
          title: '❌ Lỗi',
          description: data.error,
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      toast({
        title: '✅ Đã Gửi Yêu Cầu',
        description: 'Yêu cầu xóa sản phẩm đã được gửi đến Admin'
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting delete request:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Lỗi mạng. Vui lòng thử lại.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setItem(null);
    setProductName('');
    setLocation('');
    setCondition('');
    setShowDeleteRequest(false);
    setDeleteReason('');
  };

  if (loading && !item) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Edit className="h-5 w-5 text-blue-600" />
            Chỉnh Sửa Sản Phẩm
          </DialogTitle>
          <DialogDescription>
            Cập nhật thông tin sản phẩm: {serialNumber}
          </DialogDescription>
        </DialogHeader>

        {!showDeleteRequest ? (
          <form onSubmit={handleUpdateItem} className="space-y-6">
            {/* Product Information */}
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
              <h3 className="font-semibold text-slate-900">Thông Tin Sản Phẩm</h3>
              
              <div className="space-y-2">
                <Label htmlFor="serial" className="font-semibold">Serial/Service Tag</Label>
                <Input
                  id="serial"
                  value={serialNumber}
                  disabled
                  className="bg-gray-100"
                />
                <p className="text-xs text-slate-500">Serial không thể thay đổi</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName" className="font-semibold">Tên Sản Phẩm</Label>
                <Input
                  id="productName"
                  placeholder="Ví dụ: Dell Inspiron 14 Plus 7440F"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location" className="font-semibold">Vị Trí Lưu Trữ</Label>
                <Select value={location} onValueChange={setLocation} required>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Chọn vị trí" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISPLAY_T1">Kệ Trưng Bày T1</SelectItem>
                    <SelectItem value="STORAGE_T1">Tủ Chứa T1</SelectItem>
                    <SelectItem value="WAREHOUSE_T3">Kho T3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="condition" className="font-semibold">Tình Trạng</Label>
                <Select value={condition} onValueChange={setCondition} required>
                  <SelectTrigger id="condition">
                    <SelectValue placeholder="Chọn tình trạng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW_SEAL">New Box</SelectItem>
                    <SelectItem value="NEW_OPEN">Open Box</SelectItem>
                    <SelectItem value="USED_GOOD">Used Good</SelectItem>
                    <SelectItem value="USED_FAIR">Used Fair</SelectItem>
                    <SelectItem value="REFURBISHED">Refurbished</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Hủy
              </Button>
              
              <Button
                type="button"
                variant="outline"
                className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => setShowDeleteRequest(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Yêu Cầu Xóa
              </Button>

              <Button
                type="submit"
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang Cập Nhật...
                  </>
                ) : (
                  <>
                    <Edit className="mr-2 h-4 w-4" />
                    Cập Nhật
                  </>
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            {/* Delete Request Form */}
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h3 className="font-semibold text-red-900">Yêu Cầu Xóa Sản Phẩm</h3>
              </div>
              <p className="text-sm text-red-700 mb-4">
                Bạn đang yêu cầu Admin xóa sản phẩm <strong>{serialNumber}</strong> khỏi hệ thống.
                Vui lòng cung cấp lý do cụ thể.
              </p>

              <div className="space-y-2">
                <Label htmlFor="deleteReason" className="font-semibold text-red-900">
                  Lý Do Yêu Cầu Xóa <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  id="deleteReason"
                  placeholder="Ví dụ: Sản phẩm bị hỏng không thể sửa chữa, sản phẩm bị mất, thông tin sai..."
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  rows={4}
                  required
                />
              </div>
            </div>

            {/* Delete Request Buttons */}
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => setShowDeleteRequest(false)}
              >
                Quay Lại
              </Button>

              <Button
                type="button"
                variant="destructive"
                className="flex-1"
                onClick={handleDeleteRequest}
                disabled={loading || !deleteReason.trim()}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Đang Gửi...
                  </>
                ) : (
                  <>
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Gửi Yêu Cầu Xóa
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
