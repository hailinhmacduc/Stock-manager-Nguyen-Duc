import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, AlertCircle, Search, Filter, Package, X, Edit, Move, Barcode, Printer, Download } from 'lucide-react';
import * as XLSX from 'xlsx';
import { AddItemDialog } from '@/components/AddItemDialog';
import { SellItemDialog } from '@/components/SellItemDialog';
import { ReturnItemDialog } from '@/components/ReturnItemDialog';
import { ReportErrorDialog } from '@/components/ReportErrorDialog';
import { EditItemDialog } from '@/components/EditItemDialog';
import { BarcodeGenerator } from '@/components/BarcodeGenerator';
import { BatchBarcodeGenerator } from '@/components/BatchBarcodeGenerator';
import { getStatusDisplayName, getConditionDisplayName, getLocationDisplayName } from '@/lib/constants';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Checkbox } from "@/components/ui/checkbox";
// Bỏ import useIsMobile

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
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [sellDialogOpen, setSellDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [barcodeDialogOpen, setBarcodeDialogOpen] = useState(false);
  const [batchBarcodeDialogOpen, setBatchBarcodeDialogOpen] = useState(false); // State mới
  const [selectedSerial, setSelectedSerial] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: 'all', condition: 'all', location: 'all' });
  const [locations, setLocations] = useState<string[]>([]);
  const { user, permissions } = useAuth();
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  // Bỏ isMobile

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchItems();
  }, [user, navigate]);

  // Filter and search effect
  useEffect(() => {
    let filtered = [...data];

    // Apply location filter
    if (filters.location !== 'all') {
      filtered = filtered.filter(item => item.location === filters.location);
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(item => item.status === filters.status);
    }

    // Apply condition filter
    if (filters.condition !== 'all') {
      filtered = filtered.filter(item => item.condition === filters.condition);
    }

    // Apply search query
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
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
  }, [data, filters, searchTerm]);

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
    setLoading(true);
    setError(null);
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(filteredData.map(item => item.serial_number));
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (serialNumber: string, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, serialNumber]);
    } else {
      setSelectedItems(prev => prev.filter(sn => sn !== serialNumber));
    }
  };

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
    setSelectedSerial(item.serial_number); // Sửa lỗi ở đây
    setSelectedProductName(item.sku_info ? `${item.sku_info.brand} ${item.sku_info.model_name}` : item.sku_id);
    setBarcodeDialogOpen(true);
  };

  // Export to Excel function
  const exportToExcel = () => {
    const exportData = filteredData.map((item, index) => ({
      'STT': index + 1,
      'Serial Number': item.serial_number,
      'Tên Sản Phẩm': item.sku_info ? item.sku_info.model_name : item.sku_id,
      'Thông Số Kỹ Thuật': item.sku_info?.spec || '',
      'Vị Trí': getLocationDisplayName(item.location),
      'Tình Trạng': getConditionDisplayName(item.condition),
      'Trạng Thái': getStatusDisplayName(item.status),
      'Ngày Nhập': formatDate(item.received_at),
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh Sách Kho Hàng');

    // Auto-fit column widths
    const colWidths = [
      { wch: 5 },   // STT
      { wch: 15 },  // Serial Number
      { wch: 50 },  // Tên Sản Phẩm
      { wch: 60 },  // Thông Số Kỹ Thuật
      { wch: 15 },  // Vị Trí
      { wch: 15 },  // Tình Trạng
      { wch: 15 },  // Trạng Thái
      { wch: 12 },  // Ngày Nhập
    ];
    worksheet['!cols'] = colWidths;

    // Generate filename with current date
    const today = new Date().toISOString().split('T')[0];
    const filename = `Danh-sach-kho-hang_${today}.xlsx`;

    XLSX.writeFile(workbook, filename);
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
      <div className="mobile-compact space-y-3 md:space-y-6">
        {/* Enhanced Header - Mobile Optimized */}
        <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 mobile-header text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
          <div className="relative flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-4xl font-bold mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
                <Package className="h-6 w-6 md:h-10 md:w-10 flex-shrink-0" />
                <span className="truncate">Kho Hàng Chi Tiết</span>
              </h1>
              <p className="text-emerald-100 text-xs md:text-lg hidden md:block">
                Theo dõi từng máy laptop cụ thể theo số serial
              </p>
            </div>
            {permissions.canAddItems() && (
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="gap-1 md:gap-2 bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex-shrink-0 text-xs md:text-base h-8 md:h-10 px-2 md:px-4"
                size="sm"
              >
                <Plus className="h-4 w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">Thêm Sản Phẩm</span>
                <span className="sm:hidden">Thêm</span>
              </Button>
            )}
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        </div>

        {/* Search and Filters - Sticky Mobile Optimized */}
        <div className="sticky-search-filters sticky-transition">
          {/* Sticky indicator line */}
          <div className="h-0.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 opacity-80"></div>
          <Card className="sticky-backdrop sticky-transition">
            <CardContent className="pt-3 md:pt-6 pb-3 md:pb-6">
              <div className="space-y-2 md:space-y-0 md:flex md:flex-row md:gap-3">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-emerald-500" />
                  <Input
                    placeholder="🔍 Tìm kiếm theo serial, tên sản phẩm..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 md:pl-11 pr-10 h-10 md:h-12 border-2 border-slate-200 focus:border-emerald-500 focus:ring-emerald-500 text-sm md:text-base"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 md:h-6 md:w-6 text-slate-400 hover:text-slate-600 transition-colors rounded-full hover:bg-slate-100"
                    >
                      <X className="h-3 w-3 md:h-4 md:w-4" />
                    </button>
                  )}
                </div>

                {/* Enhanced Filters - Responsive Grid */}
                <div className="grid grid-cols-3 gap-1.5 md:flex md:gap-2">
                  <Select value={filters.location} onValueChange={(value) => setFilters(prev => ({ ...prev, location: value }))}>
                    <SelectTrigger className="w-full md:w-[140px] h-9 md:h-12 border-2 border-slate-200 font-medium text-xs md:text-sm px-2 md:px-3">
                      <Filter className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 text-purple-600" />
                      <SelectValue placeholder="Vị trí" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📍 Tất Cả</SelectItem>
                      <SelectItem value="DISPLAY_T1">🏪 Kệ T1</SelectItem>
                      <SelectItem value="STORAGE_T1">📦 Tủ T1</SelectItem>
                      <SelectItem value="WAREHOUSE_T3">🏭 Kho T3</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger className="w-full md:w-[130px] h-9 md:h-12 border-2 border-slate-200 font-medium text-xs md:text-sm px-2 md:px-3">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📊 Tất Cả</SelectItem>
                      <SelectItem value="AVAILABLE">✅ Sẵn</SelectItem>
                      <SelectItem value="SOLD">💰 Bán</SelectItem>
                      <SelectItem value="HOLD">⏸️ Giữ</SelectItem>
                      <SelectItem value="DEFECT">⚠️ Lỗi</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Condition Filter */}
                  <Select value={filters.condition} onValueChange={(value) => setFilters(prev => ({ ...prev, condition: value }))}>
                    <SelectTrigger className="w-full md:w-[140px] h-9 md:h-12 border-2 border-slate-200 font-medium text-xs md:text-sm px-2 md:px-3">
                      <SelectValue placeholder="Tình trạng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">📋 Tất Cả</SelectItem>
                      <SelectItem value="NEW_SEAL">🆕 New</SelectItem>
                      <SelectItem value="OPEN_BOX">📦 Open</SelectItem>
                      <SelectItem value="USED">🔧 Cũ</SelectItem>
                      <SelectItem value="REPAIRING">🛠️ Sửa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inventory Statistics - Mobile Optimized & Compact */}
        <Card className="shadow-lg bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 border-2 border-emerald-300">
          <CardContent className="pt-3 pb-3 md:pt-5 md:pb-4">
            <div className="grid grid-cols-2 gap-3 md:gap-6">
              <div className="text-center p-2.5 md:p-4 bg-white rounded-lg md:rounded-xl shadow-sm border-2 border-emerald-200">
                <div className="text-3xl md:text-5xl font-bold text-emerald-600 mb-0.5 md:mb-1">{stats.availableCount}</div>
                <div className="text-xs md:text-sm text-slate-600 font-semibold flex items-center justify-center gap-1 md:gap-2">
                  <Package className="h-3 w-3 md:h-4 md:w-4" />
                  Đang Tồn Kho
                </div>
              </div>
              <div className="text-center p-2.5 md:p-4 bg-white rounded-lg md:rounded-xl shadow-sm border-2 border-slate-200">
                <div className="text-2xl md:text-4xl font-bold text-slate-600 mb-0.5 md:mb-1">{stats.soldCount}</div>
                <div className="text-xs md:text-sm text-slate-600 font-semibold flex items-center justify-center gap-1 md:gap-2">
                  <Package className="h-3 w-3 md:h-4 md:w-4" />
                  Đã Bán
                </div>
              </div>
            </div>
            {(searchTerm || filters.location !== 'all' || filters.status !== 'all' || filters.condition !== 'all') && (
              <div className="mt-2 md:mt-3 pt-2 md:pt-3 border-t-2 border-emerald-200">
                <div className="text-xs md:text-sm text-slate-700 text-center bg-white py-1.5 md:py-2 px-3 md:px-4 rounded-lg">
                  <span className="font-bold text-emerald-700">{stats.availableCount} sản phẩm đang tồn</span>
                  {searchTerm && <span className="ml-1 md:ml-2">• 🔍 "{searchTerm}"</span>}
                  {filters.location !== 'all' && <span className="ml-1 md:ml-2">• 📍 {getLocationDisplayName(filters.location)}</span>}
                  {filters.status !== 'all' && <span className="ml-1 md:ml-2">• 📊 {getStatusDisplayName(filters.status)}</span>}
                  {filters.condition !== 'all' && <span className="ml-1 md:ml-2">• 📋 {getConditionDisplayName(filters.condition)}</span>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DANH SÁCH SẢN PHẨM - Phần Quan Trọng Nhất - Nổi Bật */}
        <Card className="shadow-2xl border-4 border-emerald-400 ring-2 ring-emerald-200">
          <CardHeader className="pb-3 md:pb-4 bg-gradient-to-r from-emerald-100 via-teal-100 to-cyan-100 border-b-4 border-emerald-300 p-3 md:p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
              <CardTitle className="text-2xl md:text-3xl font-bold tracking-tight text-emerald-800">
                Danh Sách Sản Phẩm
              </CardTitle>
              <div className="flex items-center gap-2 mt-4 md:mt-0">
                {selectedItems.length > 0 && (
                  <Button onClick={() => setBatchBarcodeDialogOpen(true)}>
                    <Printer className="mr-2 h-4 w-4" />
                    In Mã Vạch ({selectedItems.length})
                  </Button>
                )}
                <Button onClick={exportToExcel} variant="outline" className="bg-green-50 border-green-300 text-green-700 hover:bg-green-100">
                  <Download className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Xuất Excel</span>
                  <span className="sm:hidden">Excel</span>
                </Button>
                {permissions.canAddItems() && (
                  <Button onClick={() => setAddDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm Sản Phẩm
                  </Button>
                )}
              </div>
            </div>
            <CardDescription className="text-sm md:text-base text-gray-600 mt-2">
              Hiển thị {filteredData.length} / {data.length} sản phẩm
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 md:p-2">
            {filteredData.length === 0 ? (
              <div className="text-center py-12 px-6">
                <div className="text-slate-400 mb-2">
                  {searchTerm ? (
                    <>
                      <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Không tìm thấy sản phẩm nào với từ khóa "{searchTerm}"</p>
                    </>
                  ) : (
                    <>
                      <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Chưa có sản phẩm nào trong kho</p>
                    </>
                  )}
                </div>
                {(searchTerm || filters.location !== 'all' || filters.status !== 'all' || filters.condition !== 'all') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearchTerm('');
                      setFilters({ status: 'all', condition: 'all', location: 'all' });
                    }}
                    className="mt-2"
                  >
                    Xóa tất cả bộ lọc
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] md:min-w-full">
                  <thead className="bg-emerald-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-2.5 md:p-4 font-bold text-emerald-900 text-xs md:text-sm w-10">
                        <Checkbox
                          checked={selectedItems.length > 0 && selectedItems.length === filteredData.length}
                          onCheckedChange={handleSelectAll}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="text-left p-2.5 md:p-4 font-bold text-emerald-900 text-xs md:text-sm">Serial/ Service Tag</th>
                      <th className="text-left p-2.5 md:p-4 font-bold text-emerald-900 text-xs md:text-sm">Tên Sản Phẩm</th>
                      <th className="text-left p-2.5 md:p-4 font-bold text-emerald-900 text-xs md:text-sm">Vị Trí</th>
                      <th className="text-left p-2.5 md:p-4 font-bold text-emerald-900 text-xs md:text-sm">Tình Trạng</th>
                      <th className="text-left p-2.5 md:p-4 font-bold text-emerald-900 text-xs md:text-sm">Trạng Thái</th>
                      <th className="text-left p-2.5 md:p-4 font-bold text-emerald-900 text-xs md:text-sm w-[90px] md:w-auto">Ngày Nhập</th>
                      <th className="text-left p-2.5 md:p-4 font-bold text-emerald-900 text-xs md:text-sm w-[130px] md:w-auto">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50 transition-colors duration-200">
                        <td className="p-2.5 md:p-4">
                          <Checkbox
                            checked={selectedItems.includes(item.serial_number)}
                            onCheckedChange={(checked) => handleSelectItem(item.serial_number, !!checked)}
                            aria-label={`Select item ${item.serial_number}`}
                          />
                        </td>
                        <td className="p-2.5 md:p-4 text-xs md:text-sm font-medium text-gray-800">
                          <div className="font-bold text-emerald-700">{item.serial_number}</div>
                        </td>
                        <td className="p-2.5 md:p-4 min-w-[220px] bg-emerald-50/30">
                          <div className="font-bold text-slate-900 text-sm md:text-base leading-snug">
                            {item.sku_info ? item.sku_info.model_name : item.sku_id}
                          </div>
                          {item.sku_info && (
                            <div className="text-xs md:text-sm text-slate-600 mt-0.5 leading-snug">{item.sku_info.spec}</div>
                          )}
                        </td>
                        <td className="p-2.5 md:p-4">
                          <span className={`inline-block px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-md text-[11px] md:text-xs font-semibold border ${item.location === 'DISPLAY_T1' ? 'bg-purple-100 text-purple-800 border-purple-300' :
                            item.location === 'STORAGE_T1' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                              'bg-orange-100 text-orange-800 border-orange-300'
                            }`}>
                            <span className="hidden md:inline">{getLocationDisplayName(item.location)}</span>
                            <span className="md:hidden leading-tight">
                              {item.location === 'DISPLAY_T1' ? 'Kệ T1' :
                                item.location === 'STORAGE_T1' ? 'Tủ T1' : 'Kho T3'}
                            </span>
                          </span>
                        </td>
                        <td className="p-2.5 md:p-4">
                          <span className={`inline-block px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-md text-[11px] md:text-xs font-semibold border ${['NEW_SEAL', 'NEW_BOX'].includes(item.condition) ? 'bg-green-100 text-green-800 border-green-300' :
                            item.condition === 'OPEN_BOX' ? 'bg-amber-100 text-amber-800 border-amber-300' :
                              item.condition === 'USED' ? 'bg-blue-100 text-blue-800 border-blue-300' :
                                'bg-orange-100 text-orange-800 border-orange-300'
                            }`}>
                            <span className="hidden md:inline">{getConditionDisplayName(item.condition)}</span>
                            <span className="md:hidden">
                              {['NEW_SEAL', 'NEW_BOX'].includes(item.condition) ? 'New' :
                                item.condition === 'OPEN_BOX' ? 'Open' :
                                  item.condition === 'USED' ? 'Used' : 'Ref'}
                            </span>
                          </span>
                        </td>
                        <td className="p-2.5 md:p-4">
                          <span className={`px-1.5 md:px-2.5 py-1 md:py-1.5 rounded-md text-[11px] md:text-xs font-bold border-2 ${item.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800 border-emerald-400' :
                            item.status === 'SOLD' ? 'bg-gray-200 text-gray-700 border-gray-300' :
                              item.status === 'HOLD' ? 'bg-yellow-100 text-yellow-800 border-yellow-400' :
                                'bg-red-100 text-red-800 border-red-400'
                            }`}>
                            <span className="hidden md:inline">{getStatusDisplayName(item.status)}</span>
                            <span className="md:hidden">
                              {item.status === 'AVAILABLE' ? 'Sẵn' :
                                item.status === 'SOLD' ? 'Bán' :
                                  item.status === 'HOLD' ? 'Giữ' : 'Khác'}
                            </span>
                          </span>
                        </td>
                        <td className="p-2.5 md:p-4 text-xs md:text-sm text-slate-700 font-medium">
                          <div className="hidden md:block">{formatDate(item.received_at)}</div>
                          <div className="md:hidden">
                            {new Date(item.received_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                          </div>
                        </td>
                        <td className="p-2.5 md:p-4">
                          <div className="flex gap-1 md:gap-2 flex-wrap">
                            <Button size="sm" variant="outline" onClick={() => handleShowBarcode(item)} className="text-xs md:text-sm px-1.5 md:px-3 py-1 md:py-1.5 h-7 md:h-9">
                              <Barcode className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-1" />
                              <span className="hidden md:inline ml-1">Mã</span>
                            </Button>

                            {permissions.canSellItems() && item.status === 'AVAILABLE' && (
                              <Button size="sm" variant="outline" onClick={() => handleSellClick(item.serial_number)} className="text-xs md:text-sm px-1.5 md:px-3 py-1 md:py-1.5 h-7 md:h-9">
                                <span className="md:hidden">Bán</span>
                                <span className="hidden md:inline">Bán Hàng</span>
                              </Button>
                            )}
                            {permissions.canSellItems() && item.status === 'SOLD' && (
                              <Button size="sm" variant="outline" onClick={() => handleReturnClick(item.serial_number)} className="text-xs md:text-sm px-1.5 md:px-3 py-1 md:py-1.5 h-7 md:h-9">
                                <span className="md:hidden">Nhập</span>
                                <span className="hidden md:inline">Nhập Lại</span>
                              </Button>
                            )}
                            {permissions.canEditItems() && (
                              <Button size="sm" variant="outline" onClick={() => handleEditItem(item.serial_number)} className="text-xs md:text-sm px-1.5 md:px-3 py-1 md:py-1.5 h-7 md:h-9">
                                <Edit className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-1" />
                                <span className="hidden md:inline ml-1">Sửa</span>
                              </Button>
                            )}
                            {permissions.canReportErrors() && (
                              <Button size="sm" variant="outline" onClick={() => handleReportError(item.serial_number)} className="text-xs md:text-sm px-1.5 md:px-3 py-1 md:py-1.5 h-7 md:h-9 text-orange-600 border-orange-300 hover:bg-orange-50">
                                <AlertCircle className="h-3.5 w-3.5 md:h-4 md:w-4 md:mr-1" />
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
        serialNumber={selectedSerial}
        productName={selectedProductName}
      />

      <BatchBarcodeGenerator
        open={batchBarcodeDialogOpen}
        onOpenChange={setBatchBarcodeDialogOpen}
        items={
          data
            .filter(item => selectedItems.includes(item.serial_number))
            .map(item => ({
              serialNumber: item.serial_number,
              productName: item.sku_info?.model_name || item.sku_id
            }))
        }
      />
    </Layout>
  );
};

export default Inventory;
