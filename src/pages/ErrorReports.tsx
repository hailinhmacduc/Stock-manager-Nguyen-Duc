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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
            Báo Cáo Lỗi
          </h1>
          <p className="text-muted-foreground mt-1">
            Quản lý các báo cáo lỗi từ nhân viên
          </p>
        </div>

        {/* Filter Tabs */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              {[
                { key: 'ALL' as const, label: 'Tất Cả', count: reports.length },
                { key: 'PENDING' as const, label: 'Chờ Xử Lý', count: reports.filter(r => r.status === 'PENDING').length },
                { key: 'RESOLVED' as const, label: 'Đã Giải Quyết', count: reports.filter(r => r.status === 'RESOLVED').length },
                { key: 'DISMISSED' as const, label: 'Đã Bỏ Qua', count: reports.filter(r => r.status === 'DISMISSED').length }
              ].map(tab => (
                <Button
                  key={tab.key}
                  variant={filter === tab.key ? 'default' : 'outline'}
                  onClick={() => setFilter(tab.key)}
                  className="gap-2"
                >
                  {tab.label}
                  <Badge variant="secondary" className="ml-1">{tab.count}</Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle>
              Danh Sách Báo Cáo ({filteredReports.length})
            </CardTitle>
            <CardDescription>
              Click để xem chi tiết và xử lý
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredReports.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Không có báo cáo nào</p>
                </div>
              ) : (
                filteredReports.map((report) => (
                  <div
                    key={report.id}
                    className="p-4 border rounded-lg hover:shadow-md transition-all cursor-pointer bg-white"
                    onClick={() => handleViewDetails(report)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className={`font-semibold text-lg ${
                            report.error_type === 'DELETE_REQUEST' ? 'text-red-600' : ''
                          }`}>
                            {report.error_type === 'DELETE_REQUEST' && '🗑️ '}
                            {ERROR_TYPE_LABELS[report.error_type] || report.error_type}
                          </h3>
                          {getStatusBadge(report.status)}
                        </div>
                        {report.item_serial && (
                          <p className="text-sm text-slate-600 mb-1">
                            <span className="font-medium">Serial:</span> {report.item_serial}
                          </p>
                        )}
                        <p className="text-sm text-slate-700 mb-2">{report.description}</p>
                        <div className="flex gap-4 text-xs text-slate-500">
                          <span>
                            Báo cáo bởi: <span className="font-medium">{report.reported_by}</span>
                          </span>
                          <span>
                            {formatDistance(new Date(report.created_at), new Date(), { addSuffix: true, locale: vi })}
                          </span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        Xem
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Chi Tiết Báo Cáo Lỗi</DialogTitle>
              <DialogDescription>
                Xem và xử lý báo cáo lỗi
              </DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500">Loại Lỗi</Label>
                    <p className="font-semibold">{ERROR_TYPE_LABELS[selectedReport.error_type] || selectedReport.error_type}</p>
                  </div>
                  {selectedReport.item_serial && (
                    <div>
                      <Label className="text-xs text-slate-500">Serial/Service Tag</Label>
                      <p className="font-mono">{selectedReport.item_serial}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-500">Mô Tả Chi Tiết</Label>
                    <p className="text-sm">{selectedReport.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500">Người Báo Cáo</Label>
                      <p className="text-sm">{selectedReport.reported_by}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Thời Gian</Label>
                      <p className="text-sm">{new Date(selectedReport.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Trạng Thái</Label>
                    <div className="mt-1">{getStatusBadge(selectedReport.status)}</div>
                  </div>
                </div>

                {selectedReport.status === 'PENDING' && (
                  <>
                    <div className="space-y-2">
                      <Label>Ghi Chú Xử Lý (Tùy Chọn)</Label>
                      <Textarea
                        placeholder="Nhập ghi chú về cách xử lý báo cáo này..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => updateReportStatus('DISMISSED')}
                        disabled={loading}
                      >
                        <XCircle className="h-4 w-4 mr-2" />
                        Bỏ Qua
                      </Button>
                      {selectedReport.item_serial && selectedReport.item_serial.trim() !== '' && permissions.canDeleteItems() && selectedReport.error_type === 'DELETE_REQUEST' && (
                        <Button
                          variant="destructive"
                          className="flex-1"
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
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <Label className="text-xs text-green-700">Ghi Chú Xử Lý</Label>
                    <p className="text-sm mt-1">{selectedReport.resolution_notes}</p>
                    {selectedReport.resolved_at && (
                      <p className="text-xs text-green-600 mt-2">
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

