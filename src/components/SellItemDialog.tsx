import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface SellItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serialNumber: string;
  onSuccess: () => void;
}

export const SellItemDialog: React.FC<SellItemDialogProps> = ({
  open,
  onOpenChange,
  serialNumber,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSell = async () => {
    setLoading(true);

    try {
      const { error } = await supabase
        .from('inventory_items')
        .update({
          status: 'SOLD',
          sold_at: new Date().toISOString(),
        })
        .eq('serial_number', serialNumber);

      if (error) throw error;

      toast({
        title: 'Success',
        description: `Item ${serialNumber} marked as sold`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to mark item as sold',
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
          <DialogTitle>Confirm Sale</DialogTitle>
          <DialogDescription>
            Are you sure you want to mark this item as sold?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">Serial Number:</p>
            <p className="font-mono font-medium">{serialNumber}</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSell}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Confirm Sale'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
