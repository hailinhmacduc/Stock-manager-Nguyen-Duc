import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, AlertCircle } from 'lucide-react';
import { ERROR_TYPES, ERROR_TYPE_LABELS } from '@/lib/permissions';

interface ReportErrorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serialNumber?: string;
}

export const ReportErrorDialog: React.FC<ReportErrorDialogProps> = ({
  open,
  onOpenChange,
  serialNumber: initialSerial
}) => {
  const [serialNumber, setSerialNumber] = useState(initialSerial || '');
  const [errorType, setErrorType] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Sync serial number when dialog opens with different product
  useEffect(() => {
    if (open && initialSerial) {
      setSerialNumber(initialSerial);
    }
  }, [open, initialSerial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);

    try {
      const { error } = await supabase.from('error_reports').insert({
        reported_by: user.id,
        item_serial: serialNumber || null,
        error_type: errorType,
        description: description,
        status: 'PENDING'
      });

      if (error) throw error;

      toast({
        title: '✅ Đã Gửi Báo Cáo',
        description: 'Admin sẽ xem xét và xử lý báo cáo của bạn sớm nhất',
      });

      onOpenChange(false);
      resetForm();
    } catch (error: unknown) {
      toast({
        title: '❌ Lỗi',
        description: error instanceof Error ? error.message : 'Không thể gửi báo cáo',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    if (!initialSerial) {
      setSerialNumber('');
    }
    setErrorType('');
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-orange-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Báo Cáo Sản Phẩm Có Vấn Đề
          </DialogTitle>
          <DialogDescription>
            Sản phẩm sai tag, không có hàng, hoặc đã bán nhưng chưa đánh dấu? Báo cho Admin kiểm tra!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="serial" className="font-semibold">
              Serial/ Service Tag (Tùy chọn)
            </Label>
            <Input
              id="serial"
              placeholder="Ví dụ: DELL7440F-ABC125"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="font-mono"
            />
            <p className="text-xs text-slate-500">
              Để trống nếu lỗi không liên quan đến sản phẩm cụ thể
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="errorType" className="font-semibold">
              Loại Lỗi <span className="text-red-500">*</span>
            </Label>
            <Select value={errorType} onValueChange={setErrorType} required>
              <SelectTrigger id="errorType">
                <SelectValue placeholder="Chọn loại lỗi" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ERROR_TYPE_LABELS).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="font-semibold">
              Mô Tả Chi Tiết <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Mô tả chi tiết lỗi gì, nhập sai gì, cần sửa như thế nào..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-sm text-amber-800">
              <strong>Lưu ý:</strong> Chỉ Admin mới có quyền xóa/sửa sản phẩm.
              Báo cáo của bạn sẽ được Admin xem xét và xử lý.
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Đang Gửi...
                </>
              ) : (
                '📨 Gửi Báo Cáo'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

