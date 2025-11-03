import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface ReturnItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serialNumber: string;
  onSuccess: () => void;
}

export const ReturnItemDialog: React.FC<ReturnItemDialogProps> = ({
  open,
  onOpenChange,
  serialNumber,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleReturn = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          status: 'AVAILABLE',
          sold_at: null,
        })
        .eq('serial_number', serialNumber);

      if (error) throw error;

      toast({
        title: '✅ Đã Nhập Lại',
        description: `Sản phẩm ${serialNumber} đã được nhập lại vào kho`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: '❌ Lỗi',
        description: error.message || 'Không thể nhập lại sản phẩm',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-900">Xác Nhận Nhập Lại</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn nhập lại sản phẩm này vào kho? (Hoàn trả từ khách hàng)
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg border border-blue-200">
            <p className="text-sm text-slate-600 mb-1">Serial/ Service Tag:</p>
            <p className="font-mono font-bold text-lg text-slate-900">{serialNumber}</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Lưu ý:</strong> Sản phẩm sẽ được đưa trở lại trạng thái "Sẵn Sàng" và có thể bán lại.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 h-11"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Hủy Bỏ
            </Button>
            <Button
              className="flex-1 h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={handleReturn}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang Xử Lý...
                </>
              ) : (
                '✅ Xác Nhận Nhập Lại'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

