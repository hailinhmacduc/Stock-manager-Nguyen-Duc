import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ScanBarcode } from 'lucide-react';
import { BarcodeScanner } from '@/components/BarcodeScanner';

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddItemDialog: React.FC<AddItemDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const [productName, setProductName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState('NEW_SEAL');
  const [loading, setLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Kiểm tra serial number đã tồn tại chưa
      const { data: existingItems, error: checkError } = await supabase
        .from('inventory_items')
        .select('serial_number')
        .eq('serial_number', serialNumber);

      if (checkError) throw checkError;

      if (existingItems && existingItems.length > 0) {
        toast({
          title: '⚠️ Cảnh Báo',
          description: `Serial/ Service Tag "${serialNumber}" đã tồn tại trong hệ thống!`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      // Tạo hoặc tìm SKU ID dựa trên tên sản phẩm
      // Sử dụng tên sản phẩm làm SKU ID (có thể trùng)
      const skuId = productName.trim().replace(/\s+/g, '-').toUpperCase();

      // Kiểm tra xem SKU đã tồn tại chưa, nếu chưa thì tạo mới
      const { data: existingSku, error: skuCheckError } = await supabase
        .from('sku_info')
        .select('sku_id')
        .eq('sku_id', skuId)
        .single();

      if (skuCheckError && skuCheckError.code !== 'PGRST116') {
        // PGRST116 = no rows returned, which is expected for new SKUs
        throw skuCheckError;
      }

      if (!existingSku) {
        // Tạo SKU mới nếu chưa tồn tại
        const brandName = productName.split(' ')[0] || 'Unknown';
        
        const { error: skuError } = await supabase.from('sku_info').insert({
          sku_id: skuId,
          brand: brandName,
          model_name: productName, // Lưu tên đầy đủ
          spec: 'N/A',
          default_cost: 0,
        });

        if (skuError) {
          console.error('SKU creation error:', skuError);
          throw new Error(`Không thể tạo SKU: ${skuError.message}`);
        }
      }

      // Thêm sản phẩm vào inventory
      const { error } = await supabase.from('inventory_items').insert({
        sku_id: skuId,
        serial_number: serialNumber,
        cost: 0,
        supplier: '',
        location,
        condition,
        status: 'AVAILABLE',
      });

      if (error) throw error;

      toast({
        title: '✅ Thành Công',
        description: 'Đã thêm sản phẩm mới vào kho',
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      toast({
        title: '❌ Lỗi',
        description: error instanceof Error ? error.message : 'Không thể thêm sản phẩm',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setProductName('');
    setSerialNumber('');
    setLocation('');
    setCondition('NEW_SEAL');
    setShowScanner(false);
  };

  const handleScanSuccess = (decodedText: string) => {
    setSerialNumber(decodedText.trim());
    setShowScanner(false);
    toast({
      title: '✅ Quét Thành Công',
      description: `Đã quét serial: ${decodedText}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-900">Thêm Sản Phẩm Mới</DialogTitle>
          <DialogDescription>
            Nhập thông tin chi tiết của máy laptop mới để thêm vào kho
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productName" className="font-semibold">Tên Sản Phẩm</Label>
            <Input
              id="productName"
              placeholder="Ví dụ: Dell Inspiron 14 Plus 7440F"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              required
            />
            <p className="text-xs text-slate-500">
              💡 Tên sản phẩm có thể trùng nhau
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial" className="font-semibold">Serial/ Service Tag</Label>
            <div className="flex gap-2">
              <Input
                id="serial"
                placeholder="Ví dụ: DELL7440F-ABC125"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value.trim())}
                required
                className="font-mono flex-1"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowScanner(!showScanner)}
                className="shrink-0"
              >
                <ScanBarcode className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-amber-600 font-medium">
              ⚠️ Serial/ Service Tag phải là duy nhất
            </p>
            
            {/* Barcode Scanner */}
            {showScanner && (
              <div className="mt-4 border-2 border-blue-300 rounded-lg p-4 bg-slate-50">
                <BarcodeScanner 
                  onScan={handleScanSuccess}
                  onError={(error) => {
                    toast({
                      title: '❌ Lỗi Quét',
                      description: error,
                      variant: 'destructive'
                    });
                  }}
                />
              </div>
            )}
          </div>


          <div className="space-y-2">
            <Label htmlFor="location" className="font-semibold">Vị Trí Lưu Trữ</Label>
            <Select value={location} onValueChange={setLocation} required>
              <SelectTrigger id="location">
                <SelectValue placeholder="Chọn vị trí" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DISPLAY_T1">🖥️ Kệ Trưng Bày T1</SelectItem>
                <SelectItem value="STORAGE_T1">📦 Tủ Chứa T1</SelectItem>
                <SelectItem value="WAREHOUSE_T3">🏢 Kho T3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition" className="font-semibold">Tình Trạng</Label>
            <Select value={condition} onValueChange={setCondition} required>
              <SelectTrigger id="condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW_SEAL">✅ New Box</SelectItem>
                <SelectItem value="OPEN_BOX">📦 Open Box</SelectItem>
                <SelectItem value="USED">💻 Máy Cũ</SelectItem>
                <SelectItem value="REPAIRING">🔧 Đang Sửa/Đóng Lại</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" 
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang Thêm...
              </>
            ) : (
              'Thêm Sản Phẩm'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
