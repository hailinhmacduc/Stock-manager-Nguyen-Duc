import { useEffect, useState, useCallback } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle, XCircle, Eye, Trash2 } from 'lucide-react';
import { ErrorReport, ERROR_TYPE_LABELS, REPORT_STATUS_LABELS } from '@/lib/permissions';
import { useNavigate } from 'react-router-dom';
import { formatDistance } from 'date-fns';
import { vi } from 'date-fns/locale';

const ErrorReports = () => {
  const [reports, setReports] = useState<ErrorReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<ErrorReport | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('ALL');
  
  const { permissions, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchReports = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('error_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setReports(data as ErrorReport[] || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({
        title: '❌ Lỗi',
        description: 'Không thể tải danh sách báo cáo',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!permissions.canViewReports()) {
      toast({
        title: '⛔ Không Có Quyền',
        description: 'Bạn không có quyền truy cập trang này',
        variant: 'destructive'
      });
      navigate('/dashboard');
      return;
    }
    fetchReports();
  }, [permissions, toast, navigate, fetchReports]);

  const handleViewDetails = (report: ErrorReport) => {
    setSelectedReport(report);
    setResolutionNotes(report.resolution_notes || '');
    setDetailDialogOpen(true);
  };

  const updateReportStatus = async (status: 'RESOLVED' | 'DISMISSED') => {
    if (!selectedReport) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('error_reports')
        .update({
          status,
          resolved_at: new Date().toISOString(),
          resolved_by: user?.id,
          resolution_notes: resolutionNotes
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast({
        title: '✅ Thành Công',
        description: `Đã ${status === 'RESOLVED' ? 'giải quyết' : 'bỏ qua'} báo cáo`
      });

      setDetailDialogOpen(false);
      fetchReports();
    } catch (error) {
      toast({
        title: '❌ Lỗi',
        description: 'Không thể cập nhật trạng thái báo cáo',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (serialNumber: string) => {
    if (!permissions.canDeleteItems()) {
      toast({
        title: '⛔ Không Có Quyền',
        description: 'Bạn không có quyền xóa sản phẩm',
        variant: 'destructive'
      });
      return;
    }

    if (!serialNumber || serialNumber.trim() === '') {
      toast({
        title: '❌ Lỗi',
        description: 'Không có thông tin serial number để xóa',
        variant: 'destructive'
      });
      return;
    }

    if (!confirm(`Bạn có chắc muốn XÓA sản phẩm có serial "${serialNumber}"? Hành động này không thể hoàn tác!`)) {
      return;
    }

    setLoading(true);
    try {
      console.log('Attempting to delete item with serial:', serialNumber);
      
      // First check if the item exists
      const { data: existingItem, error: checkError } = await supabase
        .from('inventory_items')
        .select('serial_number, sku_id')
        .eq('serial_number', serialNumber)
        .single();

      if (checkError || !existingItem) {
        console.log('Item not found:', checkError);
        toast({
          title: '❌ Không Tìm Thấy',
          description: `Không tìm thấy sản phẩm với serial "${serialNumber}"`,
          variant: 'destructive'
        });
        return;
      }

      // Now delete the item
      const { error, data } = await supabase
        .from('inventory_items')
        .delete()
        .eq('serial_number', serialNumber)
        .select();

      console.log('Delete result:', { error, data });

      if (error) {
        console.error('Delete error:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        throw new Error('Không có sản phẩm nào được xóa');
      }

      toast({
        title: '✅ Đã Xóa',
        description: `Đã xóa sản phẩm ${serialNumber} thành công`
      });

      // Also mark report as resolved
      if (selectedReport) {
        const { error: updateError } = await supabase
          .from('error_reports')
          .update({
            status: 'RESOLVED',
            resolved_at: new Date().toISOString(),
            resolved_by: user?.id,
            resolution_notes: resolutionNotes || `Đã duyệt xóa sản phẩm ${serialNumber}`
          })
          .eq('id', selectedReport.id);

        if (updateError) {
          console.error('Error updating report status:', updateError);
        }
      }

      setDetailDialogOpen(false);
      fetchReports();
    } catch (error) {
      console.error('Caught error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Không thể xóa sản phẩm';
      toast({
        title: '❌ Lỗi Xóa Sản Phẩm',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800"><AlertCircle className="h-3 w-3 mr-1" />Chờ Xử Lý</Badge>;
      case 'RESOLVED':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Đã Giải Quyết</Badge>;
      case 'DISMISSED':
        return <Badge className="bg-gray-100 text-gray-800"><XCircle className="h-3 w-3 mr-1" />Đã Bỏ Qua</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const filteredReports = reports.filter(r => filter === 'ALL' || r.status === filter);

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
      <div className="mobile-compact space-y-3 md:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-orange-600 via-red-600 to-pink-600 mobile-header text-white shadow-2xl">
          <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
          <div className="relative">
            <h1 className="text-2xl md:text-4xl font-bold mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
              <AlertCircle className="h-7 w-7 md:h-10 md:w-10" />
              Báo Cáo Lỗi
            </h1>
            <p className="text-orange-100 text-sm md:text-lg">Quản lý các báo cáo lỗi từ nhân viên</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        </div>

        {/* Filter Tabs - Mobile Optimized */}
        <Card className="shadow-lg border-2">
          <CardContent className="pt-3 md:pt-6 pb-3 md:pb-6">
            <div className="grid grid-cols-2 md:flex gap-2 md:gap-3">
              {[
                { key: 'ALL' as const, label: 'Tất Cả', count: reports.length, emoji: '📊' },
                { key: 'PENDING' as const, label: 'Chờ Xử Lý', count: reports.filter(r => r.status === 'PENDING').length, emoji: '⏳' },
                { key: 'RESOLVED' as const, label: 'Đã Giải Quyết', count: reports.filter(r => r.status === 'RESOLVED').length, emoji: '✅' },
                { key: 'DISMISSED' as const, label: 'Đã Bỏ Qua', count: reports.filter(r => r.status === 'DISMISSED').length, emoji: '❌' }
              ].map(tab => (
                <Button
                  key={tab.key}
                  variant={filter === tab.key ? 'default' : 'outline'}
                  onClick={() => setFilter(tab.key)}
                  className={`gap-1 md:gap-2 text-xs md:text-sm px-2 md:px-4 py-2 md:py-2.5 font-medium transition-all duration-200 ${
                    filter === tab.key 
                      ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-lg hover:shadow-xl' 
                      : 'hover:bg-orange-50'
                  }`}
                >
                  <span className="md:hidden">{tab.emoji}</span>
                  <span className="hidden md:inline">{tab.label}</span>
                  <span className="md:hidden text-xs">{tab.label}</span>
                  <Badge variant={filter === tab.key ? 'secondary' : 'outline'} className="ml-1 text-xs px-1.5 py-0.5">
                    {tab.count}
                  </Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reports List - Mobile Optimized */}
        <Card className="shadow-2xl border-4 border-orange-400 ring-2 ring-orange-200">
          <CardHeader className="pb-3 md:pb-4 bg-gradient-to-r from-orange-100 via-red-100 to-pink-100 border-b-4 border-orange-300 p-3 md:p-6">
            <CardTitle className="text-lg md:text-2xl flex items-center gap-2 text-orange-800">
              <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-orange-700 flex-shrink-0" />
              <span className="font-extrabold">Danh Sách Báo Cáo</span>
            </CardTitle>
            <CardDescription className="mt-1 md:mt-2 text-sm md:text-base text-orange-900">
              📊 Hiển thị <span className="font-bold text-orange-700 text-base md:text-lg">{filteredReports.length}</span> báo cáo - Click để xem chi tiết
            </CardDescription>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            <div className="space-y-2 md:space-y-3">
              {filteredReports.length === 0 ? (
                <div className="text-center py-8 md:py-12 text-slate-500">
                  <AlertCircle className="h-8 w-8 md:h-12 md:w-12 mx-auto mb-2 md:mb-3 opacity-50" />
                  <p className="text-sm md:text-base">Không có báo cáo nào</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-3 md:p-4 border-2 rounded-lg hover:shadow-lg transition-all cursor-pointer bg-white hover:bg-orange-50/30 active:scale-[0.98]"
                    onClick={() => handleViewDetails(report)}
                  >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2 md:gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-col md:flex-row md:items-center gap-2 md:gap-3 mb-2">
                          <h3 className={`font-semibold text-base md:text-lg leading-tight ${
                            report.error_type === 'DELETE_REQUEST' ? 'text-red-600' : 'text-slate-800'
                          }`}>
                            {report.error_type === 'DELETE_REQUEST' && '🗑️ '}
                            <span className="hidden md:inline">{ERROR_TYPE_LABELS[report.error_type] || report.error_type}</span>
                            <span className="md:hidden">
                              {report.error_type === 'DELETE_REQUEST' ? 'Yêu Cầu Xóa Sản Phẩm' : 
                               report.error_type === 'WRONG_SERIAL' ? 'Sai Serial/Service Tag' : 
                               ERROR_TYPE_LABELS[report.error_type] || report.error_type}
                            </span>
                          </h3>
                          <div className="flex-shrink-0">
                            {getStatusBadge(report.status)}
                          </div>
                        </div>
                        {report.item_serial && (
                          <p className="text-xs md:text-sm text-slate-600 mb-1 font-mono bg-slate-100 px-2 py-1 rounded inline-block">
                            <span className="font-medium">Serial:</span> {report.item_serial}
                          </p>
                        )}
                        <p className="text-sm md:text-base text-slate-700 mb-2 leading-snug line-clamp-2">{report.description}</p>
                        <div className="flex flex-col md:flex-row gap-1 md:gap-4 text-xs md:text-sm text-slate-500">
                          <span className="flex items-center gap-1">
                            <span className="font-medium">👤 {report.reported_by}</span>
                          </span>
                          <span className="flex items-center gap-1">
                            <span>🕒 {formatDistance(new Date(report.created_at), new Date(), { addSuffix: true, locale: vi })}</span>
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="self-start md:self-center flex-shrink-0 text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2">
                        <Eye className="h-3 w-3 md:h-4 md:w-4 mr-1" />
                        <span className="hidden md:inline">Xem</span>
                        <span className="md:hidden">Chi Tiết</span>
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detail Dialog - Mobile Optimized */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl mx-2 md:mx-auto max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-3 md:pb-4">
              <DialogTitle className="text-lg md:text-xl flex items-center gap-2">
                <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
                Chi Tiết Báo Cáo Lỗi
              </DialogTitle>
              <DialogDescription className="text-sm md:text-base">
                Xem và xử lý báo cáo lỗi từ nhân viên
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-3 md:space-y-4">
                <div className="p-3 md:p-4 bg-slate-50 rounded-lg space-y-2 md:space-y-3">
                  <div>
                    <Label className="text-xs md:text-sm text-slate-500 font-medium">Loại Lỗi</Label>
                    <p className="font-semibold text-sm md:text-base mt-1">{ERROR_TYPE_LABELS[selectedReport.error_type] || selectedReport.error_type}</p>
                  </div>
                  {selectedReport.item_serial && (
                    <div>
                      <Label className="text-xs md:text-sm text-slate-500 font-medium">Serial/Service Tag</Label>
                      <p className="font-mono text-sm md:text-base mt-1 bg-white px-2 py-1 rounded border">{selectedReport.item_serial}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs md:text-sm text-slate-500 font-medium">Mô Tả Chi Tiết</Label>
                    <p className="text-sm md:text-base mt-1 leading-relaxed">{selectedReport.description}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                    <div>
                      <Label className="text-xs md:text-sm text-slate-500 font-medium">Người Báo Cáo</Label>
                      <p className="text-sm md:text-base mt-1 font-medium">{selectedReport.reported_by}</p>
                    </div>
                    <div>
                      <Label className="text-xs md:text-sm text-slate-500 font-medium">Thời Gian</Label>
                      <p className="text-sm md:text-base mt-1">{new Date(selectedReport.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs md:text-sm text-slate-500 font-medium">Trạng Thái</Label>
                    <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                  </div>
                </div>

                {selectedReport.status === 'PENDING' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm md:text-base font-medium">Ghi Chú Xử Lý (Tùy Chọn)</Label>
                      <Textarea
                        placeholder="Nhập ghi chú về cách xử lý báo cáo này..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={3}
                        className="text-sm md:text-base"
                      />
                    </div>

                    <div className="flex flex-col md:flex-row gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1 text-sm md:text-base py-2 md:py-2.5"
                        onClick={() => updateReportStatus('DISMISSED')}
                        disabled={loading}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Bỏ Qua
                      </Button>
                      {selectedReport.item_serial && selectedReport.item_serial.trim() !== '' && permissions.canDeleteItems() && selectedReport.error_type === 'DELETE_REQUEST' && (
                        <Button
                          variant="destructive"
                          className="flex-1 text-sm md:text-base py-2 md:py-2.5"
                          onClick={() => deleteItem(selectedReport.item_serial!)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Duyệt Xóa
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {selectedReport.status !== 'PENDING' && selectedReport.resolution_notes && (
                  <div className="p-3 md:p-4 bg-green-50 rounded-lg border border-green-200">
                    <Label className="text-xs md:text-sm text-green-700 font-medium">Ghi Chú Xử Lý</Label>
                    <p className="text-sm md:text-base mt-1 leading-relaxed">{selectedReport.resolution_notes}</p>
                    {selectedReport.resolved_at && (
                      <p className="text-xs md:text-sm text-green-600 mt-2">
                        Xử lý lúc: {new Date(selectedReport.resolved_at).toLocaleString('vi-VN')}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default ErrorReports;

