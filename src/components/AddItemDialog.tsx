import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const AddItemDialog: React.FC<AddItemDialogProps> = ({ open, onOpenChange, onSuccess }) => {
  const [skuId, setSkuId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [cost, setCost] = useState('');
  const [supplier, setSupplier] = useState('');
  const [location, setLocation] = useState('');
  const [condition, setCondition] = useState('NEW_SEAL');
  const [loading, setLoading] = useState(false);
  const [skus, setSkus] = useState<any[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchSKUs();
    }
  }, [open]);

  const fetchSKUs = async () => {
    const { data } = await supabase.from('sku_info').select('*');
    setSkus(data || []);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('inventory_items').insert({
        sku_id: skuId,
        serial_number: serialNumber,
        cost: parseFloat(cost),
        supplier,
        location,
        condition,
        status: 'AVAILABLE',
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'New item added to inventory',
      });

      onSuccess();
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add item',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSkuId('');
    setSerialNumber('');
    setCost('');
    setSupplier('');
    setLocation('');
    setCondition('NEW_SEAL');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Inventory Item</DialogTitle>
          <DialogDescription>
            Enter the details of the new laptop unit to add to inventory
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Select value={skuId} onValueChange={setSkuId} required>
              <SelectTrigger id="sku">
                <SelectValue placeholder="Select SKU" />
              </SelectTrigger>
              <SelectContent>
                {skus.map((sku) => (
                  <SelectItem key={sku.sku_id} value={sku.sku_id}>
                    {sku.brand} {sku.model_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="serial">Serial Number</Label>
            <Input
              id="serial"
              placeholder="e.g. DELL7440F-ABC125"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Cost (VND)</Label>
            <Input
              id="cost"
              type="number"
              placeholder="e.g. 18500000"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier</Label>
            <Input
              id="supplier"
              placeholder="e.g. NhaCungCapA"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Select value={location} onValueChange={setLocation} required>
              <SelectTrigger id="location">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DISPLAY_T1">Display T1</SelectItem>
                <SelectItem value="STORAGE_T1">Storage T1</SelectItem>
                <SelectItem value="WAREHOUSE_T3">Warehouse T3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="condition">Condition</Label>
            <Select value={condition} onValueChange={setCondition} required>
              <SelectTrigger id="condition">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NEW_SEAL">New Seal</SelectItem>
                <SelectItem value="OPEN_BOX">Open Box</SelectItem>
                <SelectItem value="DEFECT">Defect</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Item'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
