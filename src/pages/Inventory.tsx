import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, AlertCircle, Search, Filter, Package, X, Edit, Move, Barcode } from 'lucide-react';
import { AddItemDialog } from '@/components/AddItemDialog';
import { SellItemDialog } from '@/components/SellItemDialog';
import { ReturnItemDialog } from '@/components/ReturnItemDialog';
import { ReportErrorDialog } from '@/components/ReportErrorDialog';
import { EditItemDialog } from '@/components/EditItemDialog';
import { BarcodeGenerator } from '@/components/BarcodeGenerator';
import { getStatusDisplayName, getConditionDisplayName, getLocationDisplayName } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

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

const Inventory = () => {
  const [data, setData] = useState<InventoryItem[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [locationFilter, setLocationFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [conditionFilter, setConditionFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [selectedSerial, setSelectedSerial] = useState('');
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState({ serial: '', name: '' });
  const { permissions } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchItems();
  }, []);

  // Filter and search effect
  useEffect(() => {
    let filtered = [...data];

    // Apply location filter
    if (locationFilter !== 'All') {
      filtered = filtered.filter(item => item.location === locationFilter);
    }

    // Apply status filter
    if (statusFilter !== 'All') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Apply condition filter
    if (conditionFilter !== 'All') {
      filtered = filtered.filter(item => item.condition === conditionFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.serial_number.toLowerCase().includes(query) ||
        (item.sku_info?.brand || '').toLowerCase().includes(query) ||
        (item.sku_info?.model_name || '').toLowerCase().includes(query) ||
        item.sku_id.toLowerCase().includes(query)
      );
    }

    // Sort: Available items first, then sold items at bottom
    filtered.sort((a, b) => {
      if (a.status === 'SOLD' && b.status !== 'SOLD') return 1;
      if (a.status !== 'SOLD' && b.status === 'SOLD') return -1;
      return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
    });

    setFilteredData(filtered);
  }, [data, locationFilter, statusFilter, conditionFilter, searchQuery]);

  // Calculate inventory statistics
  const getInventoryStats = () => {
    const availableItems = filteredData.filter(item => item.status === 'AVAILABLE');
    
    return {
      availableCount: availableItems.length,
      soldCount: filteredData.filter(item => item.status === 'SOLD').length
    };
  };

  const stats = getInventoryStats();

  const fetchItems = async () => {
    try {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select(`
          *,
          sku_info:sku_id (
            brand,
            model_name,
            spec
          )
        `)
        .order('received_at', { ascending: false });

      if (error) throw error;
      setData(items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
      
      // Show user-friendly error message
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          console.error('Network error - showing cached data if available');
          // Keep existing data if network fails
        } else {
          console.error('Database error:', error.message);
        }
      }
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
    const classes = ['border-b transition-colors'];
    
    if (item.status === 'SOLD') {
      classes.push('bg-gray-100 text-gray-600 opacity-75');
    } else {
      classes.push('hover:bg-emerald-50/50');
      if (item.condition === 'OPEN_BOX') {
        classes.push('bg-amber-50/30');
      }
    }
    
    return classes.join(' ');
  };

  const [returnDialogOpen, setReturnDialogOpen] = useState(false);

  const handleSellClick = (serialNumber: string) => {
    setSelectedSerial(serialNumber);
    setSellDialogOpen(true);
  };

  const handleReturnClick = (serialNumber: string) => {
    setSelectedSerial(serialNumber);
    setReturnDialogOpen(true);
  };

  const handleReportError = (serialNumber: string) => {
    setSelectedSerial(serialNumber);
    setReportDialogOpen(true);
  };

  const handleEditItem = (serialNumber: string) => {
    setSelectedSerial(serialNumber);
    setEditDialogOpen(true);
  };

  const handleMoveClick = (serialNumber: string) => {
    navigate('/move');
  };

  const handleShowBarcode = (item: InventoryItem) => {
    setSelectedProduct({
      serial: item.serial_number,
      name: item.sku_info ? item.sku_info.model_name : item.sku_id
    });
    setBarcodeDialogOpen(true);
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

  // Using centralized constants for consistency

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Kho Hàng Chi Tiết
            </h1>
            <p className="text-muted-foreground mt-1">
              Theo dõi từng máy laptop cụ thể theo số serial
            </p>
          </div>
          {permissions.canAddItems() && (
            <Button onClick={() => setAddDialogOpen(true)} className="gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700">
              <Plus className="h-4 w-4" />
              Thêm Sản Phẩm
            </Button>
          )}
        </div>

        {/* Search and Filters - Compact */}
        <Card className="shadow-sm">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Bar */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Tìm kiếm theo serial, tên sản phẩm, nhà cung cấp..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-8 h-9"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              {/* Compact Filters */}
              <div className="flex gap-2">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue placeholder="Vị trí" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Tất Cả Vị Trí</SelectItem>
                    <SelectItem value="DISPLAY_T1">Kệ T1</SelectItem>
                    <SelectItem value="STORAGE_T1">Tủ T1</SelectItem>
                    <SelectItem value="WAREHOUSE_T3">Kho T3</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Tất Cả</SelectItem>
                    <SelectItem value="AVAILABLE">Sẵn Sàng</SelectItem>
                    <SelectItem value="SOLD">Đã Bán</SelectItem>
                    <SelectItem value="HOLD">Đang Giữ</SelectItem>
                    <SelectItem value="DEFECT">Lỗi</SelectItem>
                  </SelectContent>
                </Select>

                {/* Condition Filter */}
                <Select value={conditionFilter} onValueChange={setConditionFilter}>
                  <SelectTrigger className="w-[140px] h-9">
                    <SelectValue placeholder="Tình trạng" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">Tất Cả</SelectItem>
                    <SelectItem value="NEW_SEAL">New Box</SelectItem>
                    <SelectItem value="OPEN_BOX">Open Box</SelectItem>
                    <SelectItem value="USED">Máy Cũ</SelectItem>
                    <SelectItem value="REPAIRING">Đang Sửa/Đóng Lại</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory Statistics */}
        <Card className="shadow-sm bg-gradient-to-r from-emerald-50 to-blue-50 border-emerald-200">
          <CardContent className="pt-4 pb-3">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">{stats.availableCount}</div>
                <div className="text-sm text-slate-600 font-medium">Đang Tồn Kho</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-600">{stats.soldCount}</div>
                <div className="text-sm text-slate-600 font-medium">Đã Bán</div>
              </div>
            </div>
            {(searchQuery || locationFilter !== 'All' || statusFilter !== 'All' || conditionFilter !== 'All') && (
              <div className="mt-3 pt-3 border-t border-emerald-200">
                <div className="text-xs text-slate-600 text-center">
                  <span className="font-medium text-emerald-700">{stats.availableCount} sản phẩm đang tồn</span>
                  {searchQuery && <span> • Tìm kiếm: "{searchQuery}"</span>}
                  {locationFilter !== 'All' && <span> • Vị trí: {getLocationDisplayName(locationFilter)}</span>}
                  {statusFilter !== 'All' && <span> • Trạng thái: {getStatusDisplayName(statusFilter)}</span>}
                  {conditionFilter !== 'All' && <span> • Tình trạng: {getConditionDisplayName(conditionFilter)}</span>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Danh Sách Sản Phẩm</CardTitle>
                <CardDescription className="mt-1">
                  Hiển thị {filteredData.length} / {data.length} sản phẩm
                </CardDescription>
              </div>
              <div className="flex gap-2 text-xs">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-emerald-100 border border-emerald-300 rounded"></div>
                  <span>Sẵn hàng</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-gray-300 rounded"></div>
                  <span>Đã bán</span>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredData.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-slate-400 mb-2">
                  {searchQuery ? (
                    <>
                      <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Không tìm thấy sản phẩm nào với từ khóa "{searchQuery}"</p>
                    </>
                  ) : (
                    <>
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Chưa có sản phẩm nào trong kho</p>
                    </>
                  )}
                </div>
                {(searchQuery || locationFilter !== 'All' || statusFilter !== 'All' || conditionFilter !== 'All') && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => {
                      setSearchQuery('');
                      setLocationFilter('All');
                      setStatusFilter('All');
                      setConditionFilter('All');
                    }}
                    className="mt-2"
                  >
                    Xóa tất cả bộ lọc
                  </Button>
                )}
              </div>
            ) : (
              <div className="responsive-table">
                <table className="w-full min-w-full">
                  <thead>
                    <tr className="border-b bg-gradient-to-r from-slate-100 to-slate-50">
                      <th className="text-left p-2 md:p-3 font-semibold text-slate-700 text-xs md:text-sm w-[100px] md:w-auto">Serial/ Service Tag</th>
                      <th className="text-left p-2 md:p-3 font-semibold text-slate-700 text-xs md:text-sm min-w-[200px] md:min-w-0">Tên Sản Phẩm</th>
                      <th className="text-left p-2 md:p-3 font-semibold text-slate-700 text-xs md:text-sm w-[80px] md:w-auto">Vị Trí</th>
                      <th className="text-left p-2 md:p-3 font-semibold text-slate-700 text-xs md:text-sm w-[80px] md:w-auto">Tình Trạng</th>
                      <th className="text-left p-2 md:p-3 font-semibold text-slate-700 text-xs md:text-sm w-[80px] md:w-auto">Trạng Thái</th>
                      <th className="text-left p-2 md:p-3 font-semibold text-slate-700 text-xs md:text-sm w-[90px] md:w-auto">Ngày Nhập</th>
                      <th className="text-left p-2 md:p-3 font-semibold text-slate-700 text-xs md:text-sm w-[120px] md:w-auto">Hành Động</th>
                    </tr>
                  </thead>
                <tbody>
                  {filteredData.map((item) => (
                    <tr key={item.id} className={getRowClassName(item)}>
                      <td className="p-2 md:p-3 font-mono text-xs bg-slate-50">
                        <div className="md:truncate md:max-w-none">
                          <span className="md:hidden break-all text-[10px] leading-tight">{item.serial_number}</span>
                          <span className="hidden md:inline">{item.serial_number}</span>
                        </div>
                      </td>
                      <td className="p-2 md:p-3 min-w-[200px]">
                        <div className="font-medium text-slate-900 text-xs md:text-sm leading-tight">
                          {item.sku_info ? item.sku_info.model_name : item.sku_id}
                        </div>
                        {item.sku_info && (
                          <div className="text-xs text-slate-500 mt-0.5 leading-tight">{item.sku_info.spec}</div>
                        )}
                      </td>
                      <td className="p-2 md:p-3">
                        <span className={`inline-block px-1 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium ${
                          item.location === 'DISPLAY_T1' ? 'bg-purple-100 text-purple-700' :
                          item.location === 'STORAGE_T1' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          <span className="hidden md:inline">{getLocationDisplayName(item.location)}</span>
                          <span className="md:hidden text-[10px] leading-tight">
                            {item.location === 'DISPLAY_T1' ? 'Kệ Trưng Bày T1' :
                             item.location === 'STORAGE_T1' ? 'Tủ Chứa T1' : 'Kho T3'}
                          </span>
                        </span>
                      </td>
                      <td className="p-2 md:p-3">
                        <span className={`inline-block px-1 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium ${
                          ['NEW_SEAL', 'NEW_BOX'].includes(item.condition) ? 'bg-green-100 text-green-700' :
                          item.condition === 'OPEN_BOX' ? 'bg-amber-100 text-amber-700' :
                          item.condition === 'USED' ? 'bg-blue-100 text-blue-700' :
                          'bg-orange-100 text-orange-700'
                        }`}>
                          <span className="hidden md:inline">{getConditionDisplayName(item.condition)}</span>
                          <span className="md:hidden">
                            {['NEW_SEAL', 'NEW_BOX'].includes(item.condition) ? 'New' :
                             item.condition === 'OPEN_BOX' ? 'Open' :
                             item.condition === 'USED' ? 'Used' : 'Ref'}
                          </span>
                        </span>
                      </td>
                      <td className="p-2 md:p-3">
                        <span className={`px-1 md:px-2 py-0.5 md:py-1 rounded text-xs font-medium ${
                          item.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
                          item.status === 'SOLD' ? 'bg-gray-200 text-gray-600' :
                          item.status === 'HOLD' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          <span className="hidden md:inline">{getStatusDisplayName(item.status)}</span>
                          <span className="md:hidden">
                            {item.status === 'AVAILABLE' ? 'Sẵn' :
                             item.status === 'SOLD' ? 'Bán' : 
                             item.status === 'HOLD' ? 'Giữ' : 'Khác'}
                          </span>
                        </span>
                      </td>
                      <td className="p-2 md:p-3 text-xs text-slate-600">
                        <div className="hidden md:block">{formatDate(item.received_at)}</div>
                        <div className="md:hidden">
                          {new Date(item.received_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-2 md:p-3">
                        <div className="flex gap-0.5 md:gap-2 flex-wrap">
                          {/* Barcode Button - Always visible */}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleShowBarcode(item)}
                            className="text-xs px-1 md:px-2 py-0.5 md:py-1 h-6 md:h-8 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300"
                          >
                            <Barcode className="h-3 w-3 md:mr-1" />
                            <span className="hidden md:inline ml-1">Mã</span>
                          </Button>
                          
                          {permissions.canSellItems() && item.status === 'AVAILABLE' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSellClick(item.serial_number)}
                              className="text-xs px-1 md:px-2 py-0.5 md:py-1 h-6 md:h-8 hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                            >
                              <span className="md:hidden">Bán</span>
                              <span className="hidden md:inline">Bán Hàng</span>
                            </Button>
                          )}
                          {permissions.canSellItems() && item.status === 'SOLD' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReturnClick(item.serial_number)}
                              className="text-xs px-1 md:px-2 py-0.5 md:py-1 h-6 md:h-8 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                            >
                              <span className="md:hidden">Nhập</span>
                              <span className="hidden md:inline">Nhập Lại</span>
                            </Button>
                          )}
                          {permissions.canEditItems() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditItem(item.serial_number)}
                              className="text-xs px-1 md:px-2 py-0.5 md:py-1 h-6 md:h-8 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300"
                            >
                              <Edit className="h-3 w-3 md:mr-1" />
                              <span className="hidden md:inline ml-1">Sửa</span>
                            </Button>
                          )}
                          {permissions.canReportErrors() && !permissions.isAdmin() && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReportError(item.serial_number)}
                              className="text-xs px-1 md:px-2 py-0.5 md:py-1 h-6 md:h-8 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
                            >
                              <AlertCircle className="h-3 w-3 md:mr-1" />
                              <span className="hidden md:inline ml-1">Báo Lỗi</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                    </tbody>
                  </table>
                </div>
            )}
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

      <ReturnItemDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        serialNumber={selectedSerial}
        onSuccess={fetchItems}
      />

      <ReportErrorDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        serialNumber={selectedSerial}
      />

      <EditItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        serialNumber={selectedSerial}
        onSuccess={fetchItems}
      />

      <BarcodeGenerator
        open={barcodeDialogOpen}
        onOpenChange={setBarcodeDialogOpen}
        serialNumber={selectedProduct.serial}
        productName={selectedProduct.name}
      />
    </Layout>
  );
};

export default Inventory;
