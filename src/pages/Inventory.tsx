import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus } from 'lucide-react';
import { AddItemDialog } from '@/components/AddItemDialog';
import { SellItemDialog } from '@/components/SellItemDialog';

interface InventoryItem {
  id: string;
  sku_id: string;
  serial_number: string;
  status: string;
  condition: string;
  location: string;
  cost: number;
  supplier: string;
  received_at: string;
}

const Inventory = () => {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedSerial, setSelectedSerial] = useState('');

  useEffect(() => {
    fetchItems();
  }, [locationFilter, statusFilter]);

  const fetchItems = async () => {
    try {
      let query = supabase.from('inventory_items').select('*');

      if (locationFilter !== 'All') {
        query = query.eq('location', locationFilter);
      }
      if (statusFilter !== 'All') {
        query = query.eq('status', statusFilter);
      }

      const { data: items, error } = await query.order('received_at', { ascending: false });

      if (error) throw error;
      setData(items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('vi-VN');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getRowClassName = (item: InventoryItem) => {
    const classes = ['border-b transition-colors hover:bg-[hsl(var(--table-row-hover))]'];
    
    if (item.status === 'SOLD') {
      classes.push('bg-[hsl(var(--highlight-sold))]');
    } else if (item.condition === 'OPEN_BOX') {
      classes.push('bg-[hsl(var(--highlight-open))]');
    }
    
    return classes.join(' ');
  };

  const handleSellClick = (serialNumber: string) => {
    setSelectedSerial(serialNumber);
    setSellDialogOpen(true);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Inventory by Serial</h1>
            <p className="text-muted-foreground mt-1">
              Track individual laptop units by serial number
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add New Item
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter inventory by location and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Locations</SelectItem>
                    <SelectItem value="DISPLAY_T1">Display T1</SelectItem>
                    <SelectItem value="STORAGE_T1">Storage T1</SelectItem>
                    <SelectItem value="WAREHOUSE_T3">Warehouse T3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="AVAILABLE">Available</SelectItem>
                    <SelectItem value="SOLD">Sold</SelectItem>
                    <SelectItem value="HOLD">Hold</SelectItem>
                    <SelectItem value="DEFECT">Defect</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Items</CardTitle>
            <CardDescription>
              Red background: SOLD items. Yellow background: OPEN_BOX items (demo units).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-[hsl(var(--table-header))]">
                    <th className="text-left p-3 font-semibold">Serial Number</th>
                    <th className="text-left p-3 font-semibold">SKU</th>
                    <th className="text-left p-3 font-semibold">Location</th>
                    <th className="text-left p-3 font-semibold">Condition</th>
                    <th className="text-left p-3 font-semibold">Status</th>
                    <th className="text-right p-3 font-semibold">Cost</th>
                    <th className="text-left p-3 font-semibold">Supplier</th>
                    <th className="text-left p-3 font-semibold">Received</th>
                    <th className="text-left p-3 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((item) => (
                    <tr key={item.id} className={getRowClassName(item)}>
                      <td className="p-3 font-mono text-sm">{item.serial_number}</td>
                      <td className="p-3 font-mono text-sm">{item.sku_id}</td>
                      <td className="p-3">{item.location}</td>
                      <td className="p-3">{item.condition}</td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          item.status === 'AVAILABLE' ? 'bg-success/20 text-success-foreground' :
                          item.status === 'SOLD' ? 'bg-destructive/20 text-destructive-foreground' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="text-right p-3">{formatCurrency(Number(item.cost))}</td>
                      <td className="p-3">{item.supplier}</td>
                      <td className="p-3">{formatDate(item.received_at)}</td>
                      <td className="p-3">
                        {item.status === 'AVAILABLE' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSellClick(item.serial_number)}
                          >
                            Sell
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchItems}
      />

      <SellItemDialog
        open={sellDialogOpen}
        onOpenChange={setSellDialogOpen}
        serialNumber={selectedSerial}
        onSuccess={fetchItems}
      />
    </Layout>
  );
};

export default Inventory;
