import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface SKUStatus {
  sku_id: string;
  brand: string;
  model_name: string;
  spec: string;
  qty_available: number;
  qty_display: number;
  qty_storage: number;
  qty_warehouse: number;
  avg_age_days: number;
  oldest_age_days: number;
  total_capital_lock: number;
}

const Dashboard = () => {
  const [data, setData] = useState<SKUStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSKUStatus();
  }, []);

  const fetchSKUStatus = async () => {
    try {
      // Fetch SKU info
      const { data: skus, error: skuError } = await supabase
        .from('sku_info')
        .select('*');

      if (skuError) throw skuError;

      // Fetch inventory items
      const { data: items, error: itemsError } = await supabase
        .from('inventory_items')
        .select('*');

      if (itemsError) throw itemsError;

      // Calculate statistics for each SKU
      const skuStats = skus?.map((sku) => {
        const skuItems = items?.filter(
          (item) => item.sku_id === sku.sku_id && item.status === 'AVAILABLE'
        ) || [];

        const qty_available = skuItems.length;
        const qty_display = skuItems.filter((i) => i.location === 'DISPLAY_T1').length;
        const qty_storage = skuItems.filter((i) => i.location === 'STORAGE_T1').length;
        const qty_warehouse = skuItems.filter((i) => i.location === 'WAREHOUSE_T3').length;

        const ages = skuItems.map((i) =>
          Math.floor((Date.now() - new Date(i.received_at).getTime()) / (1000 * 60 * 60 * 24))
        );
        const avg_age_days = ages.length > 0 ? Math.floor(ages.reduce((a, b) => a + b, 0) / ages.length) : 0;
        const oldest_age_days = ages.length > 0 ? Math.max(...ages) : 0;

        const total_capital_lock = skuItems.reduce((sum, item) => sum + Number(item.cost || 0), 0);

        return {
          sku_id: sku.sku_id,
          brand: sku.brand,
          model_name: sku.model_name,
          spec: sku.spec,
          qty_available,
          qty_display,
          qty_storage,
          qty_warehouse,
          avg_age_days,
          oldest_age_days,
          total_capital_lock,
        };
      }) || [];

      // Sort by capital lock descending
      skuStats.sort((a, b) => b.total_capital_lock - a.total_capital_lock);
      setData(skuStats);
    } catch (error) {
      console.error('Error fetching SKU status:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const getRowClassName = (sku: SKUStatus) => {
    const classes = ['border-b transition-colors'];
    
    if (sku.oldest_age_days > 30) {
      classes.push('bg-[hsl(var(--highlight-aging))]');
    }
    
    if (sku.qty_available > 5 && sku.total_capital_lock > 100000000) {
      classes.push('font-semibold');
    }
    
    return classes.join(' ');
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
        <div>
          <h1 className="text-3xl font-bold">SKU Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Capital lock analysis and inventory aging report
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inventory Status by SKU</CardTitle>
            <CardDescription>
              Items highlighted in yellow are aging (30+ days). Bold items have high capital lock (&gt;100M VND with 5+ units).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-[hsl(var(--table-header))]">
                    <th className="text-left p-3 font-semibold">SKU</th>
                    <th className="text-left p-3 font-semibold">Model</th>
                    <th className="text-right p-3 font-semibold">Total</th>
                    <th className="text-right p-3 font-semibold">Display T1</th>
                    <th className="text-right p-3 font-semibold">Storage T1</th>
                    <th className="text-right p-3 font-semibold">Warehouse T3</th>
                    <th className="text-right p-3 font-semibold">Avg Age</th>
                    <th className="text-right p-3 font-semibold">Oldest</th>
                    <th className="text-right p-3 font-semibold">Capital Lock</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((sku) => (
                    <tr key={sku.sku_id} className={getRowClassName(sku)}>
                      <td className="p-3 font-mono text-sm">{sku.sku_id}</td>
                      <td className="p-3">
                        <div className="font-medium">{sku.brand} {sku.model_name}</div>
                        <div className="text-sm text-muted-foreground">{sku.spec}</div>
                      </td>
                      <td className="text-right p-3">{sku.qty_available}</td>
                      <td className="text-right p-3">{sku.qty_display}</td>
                      <td className="text-right p-3">{sku.qty_storage}</td>
                      <td className="text-right p-3">{sku.qty_warehouse}</td>
                      <td className="text-right p-3">{sku.avg_age_days}d</td>
                      <td className="text-right p-3">{sku.oldest_age_days}d</td>
                      <td className="text-right p-3 font-medium">
                        {formatCurrency(sku.total_capital_lock)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
};

export default Dashboard;
