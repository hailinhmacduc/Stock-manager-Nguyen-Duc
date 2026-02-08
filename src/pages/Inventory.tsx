import { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Plus, AlertCircle, Search, Filter, Package, X, Edit, Move, Barcode, Printer, Download, ChevronLeft, ChevronRight } from 'lucide-react';
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
  const [batchBarcodeDialogOpen, setBatchBarcodeDialogOpen] = useState(false);
  const [selectedSerial, setSelectedSerial] = useState('');
  const [selectedProductName, setSelectedProductName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({ status: 'all', condition: 'all', location: 'all' });
  const [locations, setLocations] = useState<string[]>([]);
  const { user, permissions } = useAuth();
  const navigate = useNavigate();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchItems();
  }, [user, navigate]);

  useEffect(() => {
    let filtered = [...data];
    if (filters.location !== 'all') filtered = filtered.filter(item => item.location === filters.location);
    if (filters.status !== 'all') filtered = filtered.filter(item => item.status === filters.status);
    if (filters.condition !== 'all') filtered = filtered.filter(item => item.condition === filters.condition);
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase();
      filtered = filtered.filter(item =>
        item.serial_number.toLowerCase().includes(query) ||
        (item.sku_info?.brand || '').toLowerCase().includes(query) ||
        (item.sku_info?.model_name || '').toLowerCase().includes(query) ||
        item.sku_id.toLowerCase().includes(query)
      );
    }
    filtered.sort((a, b) => {
      if (a.status === 'SOLD' && b.status !== 'SOLD') return 1;
      if (a.status !== 'SOLD' && b.status === 'SOLD') return -1;
      return new Date(b.received_at).getTime() - new Date(a.received_at).getTime();
    });
    setFilteredData(filtered);
  }, [data, filters, searchTerm]);

  const getInventoryStats = () => {
    const availableItems = filteredData.filter(item => item.status === 'AVAILABLE');
    return {
      availableCount: availableItems.length,
      soldCount: filteredData.filter(item => item.status === 'SOLD').length
    };
  };
  const stats = getInventoryStats();

  // Pagination
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
  const paginatedData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filters]);

  const getPageNumbers = () => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const fetchItems = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: items, error } = await supabase
        .from('inventory_items')
        .select(`*, sku_info:sku_id (brand, model_name, spec)`)
        .order('received_at', { ascending: false });
      if (error) throw error;
      setData(items || []);
    } catch (error) {
      console.error('Error fetching items:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('vi-VN');

  const getLocationBadge = (loc: string) => {
    if (loc === 'DISPLAY_T1') return 'bg-purple-50 text-purple-700 border-purple-200';
    if (loc === 'STORAGE_T1') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (loc === 'WAREHOUSE_T3') return 'bg-orange-50 text-orange-700 border-orange-200';
    if (loc === 'WARRANTY_KT') return 'bg-rose-50 text-rose-700 border-rose-200';
    return 'bg-slate-50 text-slate-700 border-slate-200';
  };

  const getConditionBadge = (cond: string) => {
    if (['NEW_SEAL', 'NEW_BOX'].includes(cond)) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (cond === 'OPEN_BOX') return 'bg-amber-50 text-amber-700 border-amber-200';
    if (cond === 'USED') return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-gray-50 text-gray-700 border-gray-200';
  };

  const getStatusBadge = (status: string) => {
    if (status === 'AVAILABLE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    if (status === 'SOLD') return 'bg-gray-100 text-gray-500 border-gray-200';
    if (status === 'HOLD') return 'bg-yellow-50 text-yellow-700 border-yellow-200';
    return 'bg-red-50 text-red-700 border-red-200';
  };

  const handleSelectAll = (checked: boolean) => {
    setSelectedItems(checked ? filteredData.map(item => item.serial_number) : []);
  };
  const handleSelectItem = (serialNumber: string, checked: boolean) => {
    setSelectedItems(prev => checked ? [...prev, serialNumber] : prev.filter(sn => sn !== serialNumber));
  };
  const handleSellClick = (sn: string) => { setSelectedSerial(sn); setSellDialogOpen(true); };
  const handleReturnClick = (sn: string) => { setSelectedSerial(sn); setReturnDialogOpen(true); };
  const handleReportError = (sn: string) => { setSelectedSerial(sn); setReportDialogOpen(true); };
  const handleEditItem = (sn: string) => { setSelectedSerial(sn); setEditDialogOpen(true); };
  const handleMoveClick = (sn: string) => { navigate('/move'); };
  const handleShowBarcode = (item: InventoryItem) => {
    setSelectedSerial(item.serial_number);
    setSelectedProductName(item.sku_info ? `${item.sku_info.brand} ${item.sku_info.model_name}` : item.sku_id);
    setBarcodeDialogOpen(true);
  };

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
    worksheet['!cols'] = [{ wch: 5 }, { wch: 15 }, { wch: 50 }, { wch: 60 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 12 }];
    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Danh-sach-kho-hang_${today}.xlsx`);
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-3 md:space-y-4 animate-fade-in">
        {/* Page Header */}
        <div className="page-header flex items-start justify-between">
          <div>
            <h1>
              <Package className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
              Kho Hàng Chi Tiết
            </h1>
            <p>Theo dõi từng sản phẩm theo serial number</p>
          </div>
          {permissions.canAddItems() && (
            <Button
              onClick={() => setAddDialogOpen(true)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5 text-xs md:text-sm h-8 md:h-9 px-3"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Thêm SP</span>
              <span className="sm:hidden">Thêm</span>
            </Button>
          )}
        </div>

        {/* Search & Filters */}
        <div className="sticky-search-filters">
          <div className="filter-bar space-y-2 md:space-y-0 md:flex md:gap-2.5">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Tìm serial, tên sản phẩm..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-9 h-9 md:h-10 border-slate-200 focus:border-blue-400 focus:ring-blue-400 text-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filters */}
            <div className="grid grid-cols-3 gap-1.5 md:flex md:gap-2">
              <Select value={filters.location} onValueChange={(v) => setFilters(p => ({ ...p, location: v }))}>
                <SelectTrigger className="w-full md:w-[130px] h-9 md:h-10 border-slate-200 text-xs md:text-sm">
                  <SelectValue placeholder="Vị trí" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả vị trí</SelectItem>
                  <SelectItem value="DISPLAY_T1">Kệ T1</SelectItem>
                  <SelectItem value="STORAGE_T1">Tủ T1</SelectItem>
                  <SelectItem value="WAREHOUSE_T3">Kho T3</SelectItem>
                  <SelectItem value="WARRANTY_KT">BH/KT</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(v) => setFilters(p => ({ ...p, status: v }))}>
                <SelectTrigger className="w-full md:w-[120px] h-9 md:h-10 border-slate-200 text-xs md:text-sm">
                  <SelectValue placeholder="Trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả TT</SelectItem>
                  <SelectItem value="AVAILABLE">Sẵn hàng</SelectItem>
                  <SelectItem value="SOLD">Đã bán</SelectItem>
                  <SelectItem value="HOLD">Giữ hàng</SelectItem>
                  <SelectItem value="DEFECT">Lỗi</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.condition} onValueChange={(v) => setFilters(p => ({ ...p, condition: v }))}>
                <SelectTrigger className="w-full md:w-[120px] h-9 md:h-10 border-slate-200 text-xs md:text-sm">
                  <SelectValue placeholder="Tình trạng" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả ĐK</SelectItem>
                  <SelectItem value="NEW_SEAL">New Seal</SelectItem>
                  <SelectItem value="OPEN_BOX">Open Box</SelectItem>
                  <SelectItem value="USED">Cũ</SelectItem>
                  <SelectItem value="REPAIRING">Đang sửa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 gap-2 md:gap-3">
          <div className="stat-card border-l-4 border-l-emerald-500 bg-emerald-50/40">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Đang Tồn Kho</div>
                <div className="text-2xl font-bold text-emerald-600 mt-0.5">{stats.availableCount}</div>
              </div>
              <Package className="h-5 w-5 text-emerald-400" />
            </div>
          </div>
          <div className="stat-card border-l-4 border-l-slate-400 bg-slate-50">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Đã Bán</div>
                <div className="text-2xl font-bold text-slate-600 mt-0.5">{stats.soldCount}</div>
              </div>
              <Package className="h-5 w-5 text-slate-300" />
            </div>
          </div>
        </div>

        {/* Active filters indicator */}
        {(searchTerm || filters.location !== 'all' || filters.status !== 'all' || filters.condition !== 'all') && (
          <div className="flex items-center gap-2 text-xs text-slate-600 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
            <Filter className="h-3 w-3 text-blue-500" />
            <span className="font-medium text-blue-700">{stats.availableCount} SP tồn</span>
            {searchTerm && <span className="text-slate-500">• "{searchTerm}"</span>}
            {filters.location !== 'all' && <span className="text-slate-500">• {getLocationDisplayName(filters.location)}</span>}
            {filters.status !== 'all' && <span className="text-slate-500">• {getStatusDisplayName(filters.status)}</span>}
            {filters.condition !== 'all' && <span className="text-slate-500">• {getConditionDisplayName(filters.condition)}</span>}
            <button
              onClick={() => { setSearchTerm(''); setFilters({ status: 'all', condition: 'all', location: 'all' }); }}
              className="ml-auto text-blue-600 hover:text-blue-800 font-medium"
            >Xóa</button>
          </div>
        )}

        {/* Product List */}
        <div className="section-card">
          <div className="section-card-header justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <h3>Danh Sách Sản Phẩm</h3>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                {filteredData.length} / {data.length}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {selectedItems.length > 0 && (
                <Button size="sm" variant="outline" onClick={() => setBatchBarcodeDialogOpen(true)} className="h-7 md:h-8 text-xs gap-1">
                  <Printer className="h-3.5 w-3.5" />In ({selectedItems.length})
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={exportToExcel} className="h-7 md:h-8 text-xs gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <Download className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Excel</span>
              </Button>
              {permissions.canAddItems() && (
                <Button size="sm" onClick={() => setAddDialogOpen(true)} className="h-7 md:h-8 text-xs gap-1 bg-blue-600 hover:bg-blue-700">
                  <Plus className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Thêm</span>
                </Button>
              )}
            </div>
          </div>

          {filteredData.length === 0 ? (
            <div className="text-center py-12 px-6 text-slate-400">
              {searchTerm ? (
                <>
                  <Search className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Không tìm thấy "{searchTerm}"</p>
                </>
              ) : (
                <>
                  <Package className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Chưa có sản phẩm nào</p>
                </>
              )}
              {(searchTerm || filters.location !== 'all' || filters.status !== 'all' || filters.condition !== 'all') && (
                <Button variant="outline" size="sm" onClick={() => { setSearchTerm(''); setFilters({ status: 'all', condition: 'all', location: 'all' }); }} className="mt-3 text-xs">
                  Xóa bộ lọc
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-100/80 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase w-10">
                        <Checkbox
                          checked={selectedItems.length > 0 && selectedItems.length === filteredData.length}
                          onCheckedChange={handleSelectAll}
                        />
                      </th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Serial</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Sản Phẩm</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Vị Trí</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Tình Trạng</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Trạng Thái</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Ngày Nhập</th>
                      <th className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedData.map((item) => (
                      <tr key={item.id} className={`transition-colors ${item.status === 'SOLD' ? 'bg-gray-50/70 opacity-60' : 'even:bg-slate-50/60 hover:bg-blue-50/50'}`}>
                        <td className="px-3 py-2.5">
                          <Checkbox
                            checked={selectedItems.includes(item.serial_number)}
                            onCheckedChange={(checked) => handleSelectItem(item.serial_number, !!checked)}
                          />
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="font-mono text-sm text-slate-800 font-medium">{item.serial_number}</span>
                        </td>
                        <td className="px-3 py-2.5 min-w-[200px]">
                          <div className="font-medium text-sm text-slate-900">{item.sku_info ? item.sku_info.model_name : item.sku_id}</div>
                          {item.sku_info && <div className="text-xs text-slate-500 mt-0.5 line-clamp-1">{item.sku_info.spec}</div>}
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getLocationBadge(item.location)}`}>
                            {getLocationDisplayName(item.location)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium border ${getConditionBadge(item.condition)}`}>
                            {getConditionDisplayName(item.condition)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${getStatusBadge(item.status)}`}>
                            {getStatusDisplayName(item.status)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-slate-600">{formatDate(item.received_at)}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 flex-wrap">
                            <Button size="sm" variant="ghost" onClick={() => handleShowBarcode(item)} className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700">
                              <Barcode className="h-3.5 w-3.5" />
                            </Button>
                            {permissions.canSellItems() && item.status === 'AVAILABLE' && (
                              <Button size="sm" variant="ghost" onClick={() => handleSellClick(item.serial_number)} className="h-7 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50">
                                Bán
                              </Button>
                            )}
                            {permissions.canSellItems() && item.status === 'SOLD' && (
                              <Button size="sm" variant="ghost" onClick={() => handleReturnClick(item.serial_number)} className="h-7 px-2 text-xs text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50">
                                Nhập lại
                              </Button>
                            )}
                            {permissions.canEditItems() && (
                              <Button size="sm" variant="ghost" onClick={() => handleEditItem(item.serial_number)} className="h-7 px-2 text-xs text-slate-500 hover:text-slate-700">
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {permissions.canReportErrors() && (
                              <Button size="sm" variant="ghost" onClick={() => handleReportError(item.serial_number)} className="h-7 px-2 text-xs text-orange-500 hover:text-orange-700 hover:bg-orange-50">
                                <AlertCircle className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List */}
              <div className="md:hidden divide-y divide-slate-100">
                {paginatedData.map((item) => (
                  <div key={item.id} className={`px-3.5 py-3 ${item.status === 'SOLD' ? 'opacity-50' : ''}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Checkbox
                          checked={selectedItems.includes(item.serial_number)}
                          onCheckedChange={(checked) => handleSelectItem(item.serial_number, !!checked)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {item.sku_info ? item.sku_info.model_name : item.sku_id}
                          </div>
                          <div className="font-mono text-xs text-slate-500 mt-0.5">{item.serial_number}</div>
                          {item.sku_info?.spec && (
                            <div className="text-xs text-slate-400 mt-0.5 line-clamp-1">{item.sku_info.spec}</div>
                          )}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${getLocationBadge(item.location)}`}>
                              {item.location === 'DISPLAY_T1' ? 'Kệ T1' :
                                item.location === 'STORAGE_T1' ? 'Tủ T1' :
                                  item.location === 'WAREHOUSE_T3' ? 'Kho T3' : 'BH/KT'}
                            </span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium border ${getConditionBadge(item.condition)}`}>
                              {getConditionDisplayName(item.condition)}
                            </span>
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(item.status)}`}>
                              {item.status === 'AVAILABLE' ? 'Sẵn' : item.status === 'SOLD' ? 'Bán' : item.status === 'HOLD' ? 'Giữ' : 'Lỗi'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right text-xs text-slate-500 whitespace-nowrap">
                        {new Date(item.received_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                      </div>
                    </div>
                    {/* Mobile Actions */}
                    <div className="flex gap-1 mt-2 pl-6 flex-wrap">
                      <Button size="sm" variant="ghost" onClick={() => handleShowBarcode(item)} className="h-6 px-2 text-[11px] text-slate-500">
                        <Barcode className="h-3 w-3 mr-0.5" />Mã
                      </Button>
                      {permissions.canSellItems() && item.status === 'AVAILABLE' && (
                        <Button size="sm" variant="ghost" onClick={() => handleSellClick(item.serial_number)} className="h-6 px-2 text-[11px] text-blue-600">Bán</Button>
                      )}
                      {permissions.canSellItems() && item.status === 'SOLD' && (
                        <Button size="sm" variant="ghost" onClick={() => handleReturnClick(item.serial_number)} className="h-6 px-2 text-[11px] text-emerald-600">Nhập lại</Button>
                      )}
                      {permissions.canEditItems() && (
                        <Button size="sm" variant="ghost" onClick={() => handleEditItem(item.serial_number)} className="h-6 px-2 text-[11px] text-slate-500">
                          <Edit className="h-3 w-3 mr-0.5" />Sửa
                        </Button>
                      )}
                      {permissions.canReportErrors() && (
                        <Button size="sm" variant="ghost" onClick={() => handleReportError(item.serial_number)} className="h-6 px-2 text-[11px] text-orange-500">
                          <AlertCircle className="h-3 w-3 mr-0.5" />Lỗi
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
                  <div className="text-xs text-slate-500">
                    Trang {currentPage}/{totalPages} • {filteredData.length} SP
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4 text-slate-600" />
                    </button>
                    {getPageNumbers().map((page, i) =>
                      page === '...' ? (
                        <span key={`dots-${i}`} className="px-1 text-slate-400 text-xs">…</span>
                      ) : (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page as number)}
                          className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${currentPage === page
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-slate-600 hover:bg-slate-200'
                            }`}
                        >
                          {page}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg hover:bg-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronRight className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <AddItemDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} onSuccess={fetchItems} />
      <SellItemDialog open={sellDialogOpen} onOpenChange={setSellDialogOpen} serialNumber={selectedSerial} onSuccess={fetchItems} />
      <ReturnItemDialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen} serialNumber={selectedSerial} onSuccess={fetchItems} />
      <ReportErrorDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen} serialNumber={selectedSerial} />
      <EditItemDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} serialNumber={selectedSerial} onSuccess={fetchItems} />
      <BarcodeGenerator open={barcodeDialogOpen} onOpenChange={setBarcodeDialogOpen} serialNumber={selectedSerial} productName={selectedProductName} />
      <BatchBarcodeGenerator
        open={batchBarcodeDialogOpen}
        onOpenChange={setBatchBarcodeDialogOpen}
        items={data.filter(item => selectedItems.includes(item.serial_number)).map(item => ({
          serialNumber: item.serial_number,
          productName: item.sku_info?.model_name || item.sku_id
        }))}
      />
    </Layout>
  );
};

export default Inventory;
