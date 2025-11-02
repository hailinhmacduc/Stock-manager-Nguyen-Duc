import { useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const MoveItem = () => {
  const [serialNumber, setSerialNumber] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [movedBy, setMovedBy] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Find the item by serial number
      const { data: item, error: itemError } = await supabase
        .from('inventory_items')
        .select('*')
        .eq('serial_number', serialNumber)
        .neq('status', 'SOLD')
        .single();

      if (itemError || !item) {
        toast({
          title: 'Error',
          description: 'Item not found or already sold',
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      const fromLocation = item.location;

      // Update item location
      const { error: updateError } = await supabase
        .from('inventory_items')
        .update({
          location: toLocation,
          last_move_at: new Date().toISOString(),
        })
        .eq('id', item.id);

      if (updateError) throw updateError;

      // Insert move log
      const { error: logError } = await supabase
        .from('stock_move_logs')
        .insert({
          item_id: item.id,
          serial_number: serialNumber,
          from_location: fromLocation,
          to_location: toLocation,
          moved_by: movedBy,
        });

      if (logError) throw logError;

      toast({
        title: 'Success',
        description: `Item moved from ${fromLocation} to ${toLocation}`,
      });

      // Reset form
      setSerialNumber('');
      setToLocation('');
      setMovedBy('');
    } catch (error) {
      console.error('Error moving item:', error);
      toast({
        title: 'Error',
        description: 'Failed to move item. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <h1 className="text-3xl font-bold">Move Item</h1>
          <p className="text-muted-foreground mt-1">
            Move inventory between storage locations
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Stock Movement</CardTitle>
            <CardDescription>
              Enter the serial number and select the destination location
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="serial">Serial Number</Label>
                <Input
                  id="serial"
                  placeholder="e.g. DELL7440F-ABC123"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Destination Location</Label>
                <Select value={toLocation} onValueChange={setToLocation} required>
                  <SelectTrigger id="location">
                    <SelectValue placeholder="Select destination" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DISPLAY_T1">Display T1 (Kệ trưng bày tầng 1)</SelectItem>
                    <SelectItem value="STORAGE_T1">Storage T1 (Tủ đựng máy tầng 1)</SelectItem>
                    <SelectItem value="WAREHOUSE_T3">Warehouse T3 (Kho tầng 3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="movedBy">Moved By (Staff Name)</Label>
                <Input
                  id="movedBy"
                  placeholder="e.g. Long"
                  value={movedBy}
                  onChange={(e) => setMovedBy(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Moving...
                  </>
                ) : (
                  'Move Item'
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Location Reference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary" />
                <span className="font-medium">DISPLAY_T1</span>
                <span className="text-muted-foreground">- Display units on floor 1 (demo)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-success" />
                <span className="font-medium">STORAGE_T1</span>
                <span className="text-muted-foreground">- Storage cabinet floor 1 (sealed, ready to sell)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-muted" />
                <span className="font-medium">WAREHOUSE_T3</span>
                <span className="text-muted-foreground">- Warehouse floor 3 (backup stock)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default MoveItem;
