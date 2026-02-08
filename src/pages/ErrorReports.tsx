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
import { Loader2, AlertCircle, CheckCircle, XCircle, Eye, Trash2, Clock, User } from 'lucide-react';
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
        .select(`*, reporter:reported_by (full_name, email)`)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setReports(data as any[] || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!permissions.canViewReports()) {
      toast({ title: 'Không Có Quyền', description: 'Bạn không có quyền truy cập', variant: 'destructive' });
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
        .update({ status, resolved_at: new Date().toISOString(), resolved_by: user?.id, resolution_notes: resolutionNotes })
        .eq('id', selectedReport.id);
      if (error) throw error;
      toast({ title: 'Thành Công', description: `Đã ${status === 'RESOLVED' ? 'giải quyết' : 'bỏ qua'} báo cáo` });
      setDetailDialogOpen(false);
      fetchReports();
    } catch (error) {
      toast({ title: 'Lỗi', description: 'Không thể cập nhật', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (serialNumber: string) => {
    if (!permissions.canDeleteItems()) return;
    if (!serialNumber?.trim()) return;
    if (!confirm(`Xóa sản phẩm "${serialNumber}"? Không thể hoàn tác!`)) return;

    setLoading(true);
    try {
      const { data: existingItem, error: checkError } = await supabase
        .from('inventory_items').select('serial_number').eq('serial_number', serialNumber).single();
      if (checkError || !existingItem) { toast({ title: 'Không tìm thấy', description: `Serial "${serialNumber}" không tồn tại`, variant: 'destructive' }); return; }

      const { error, data } = await supabase.from('inventory_items').delete().eq('serial_number', serialNumber).select();
      if (error) throw error;
      if (!data?.length) throw new Error('Không có SP nào được xóa');

      toast({ title: 'Đã Xóa', description: `${serialNumber} đã xóa thành công` });

      if (selectedReport) {
        await supabase.from('error_reports').update({
          status: 'RESOLVED', resolved_at: new Date().toISOString(), resolved_by: user?.id,
          resolution_notes: resolutionNotes || `Đã duyệt xóa SP ${serialNumber}`
        }).eq('id', selectedReport.id);
      }
      setDetailDialogOpen(false);
      fetchReports();
    } catch (error) {
      toast({ title: 'Lỗi', description: error instanceof Error ? error.message : 'Không thể xóa', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><AlertCircle className="h-3 w-3" />Chờ</span>;
      case 'RESOLVED': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="h-3 w-3" />Xong</span>;
      case 'DISMISSED': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-500 border border-slate-200"><XCircle className="h-3 w-3" />Bỏ qua</span>;
      default: return <Badge>{status}</Badge>;
    }
  };

  const filteredReports = reports.filter(r => filter === 'ALL' || r.status === filter);
  const pendingCount = reports.filter(r => r.status === 'PENDING').length;

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="space-y-3 md:space-y-4 animate-fade-in">
        {/* Page Header */}
        <div className="page-header">
          <h1>
            <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
            Báo Cáo Lỗi
          </h1>
          <p>Quản lý báo cáo lỗi từ nhân viên • {pendingCount} chờ xử lý</p>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {[
            { key: 'ALL' as const, label: 'Tất Cả', count: reports.length },
            { key: 'PENDING' as const, label: 'Chờ', count: pendingCount },
            { key: 'RESOLVED' as const, label: 'Xong', count: reports.filter(r => r.status === 'RESOLVED').length },
            { key: 'DISMISSED' as const, label: 'Bỏ qua', count: reports.filter(r => r.status === 'DISMISSED').length },
          ].map(tab => (
            <Button
              key={tab.key}
              variant={filter === tab.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(tab.key)}
              className={`text-xs gap-1 whitespace-nowrap h-8 px-3 ${filter === tab.key ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
            >
              {tab.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-white/20' : 'bg-slate-100'}`}>{tab.count}</span>
            </Button>
          ))}
        </div>

        {/* Reports List */}
        <div className="section-card">
          <div className="section-card-header justify-between">
            <div className="flex items-center gap-2">
              <h3>Danh Sách Báo Cáo</h3>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filteredReports.length}</span>
            </div>
          </div>

          {filteredReports.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Không có báo cáo nào</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="px-3.5 py-3 hover:bg-slate-50 transition-colors cursor-pointer active:bg-slate-100"
                  onClick={() => handleViewDetails(report)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`text-sm font-medium ${report.error_type === 'DELETE_REQUEST' ? 'text-red-600' : 'text-slate-800'}`}>
                          {ERROR_TYPE_LABELS[report.error_type] || report.error_type}
                        </span>
                        {getStatusBadge(report.status)}
                      </div>
                      {report.item_serial && (
                        <div className="font-mono text-xs text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded inline-block mb-1">
                          {report.item_serial}
                        </div>
                      )}
                      <p className="text-xs text-slate-600 line-clamp-2">{report.description}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-slate-400">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {(report as any).reporter?.full_name || 'Không rõ'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistance(new Date(report.created_at), new Date(), { addSuffix: true, locale: vi })}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="shrink-0 h-7 px-2 text-xs text-slate-400">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                Chi Tiết Báo Cáo
              </DialogTitle>
              <DialogDescription className="text-xs">Xem và xử lý báo cáo lỗi</DialogDescription>
            </DialogHeader>

            {selectedReport && (
              <div className="space-y-4">
                <div className="p-3 bg-slate-50 rounded-lg space-y-3">
                  <div>
                    <Label className="text-xs text-slate-500">Loại Lỗi</Label>
                    <p className="text-sm font-medium mt-0.5">{ERROR_TYPE_LABELS[selectedReport.error_type] || selectedReport.error_type}</p>
                  </div>
                  {selectedReport.item_serial && (
                    <div>
                      <Label className="text-xs text-slate-500">Serial</Label>
                      <p className="font-mono text-sm mt-0.5 bg-white px-2 py-1 rounded border border-slate-200">{selectedReport.item_serial}</p>
                    </div>
                  )}
                  <div>
                    <Label className="text-xs text-slate-500">Mô Tả</Label>
                    <p className="text-sm mt-0.5 leading-relaxed">{selectedReport.description}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-slate-500">Người Báo Cáo</Label>
                      <p className="text-sm mt-0.5 font-medium">{(selectedReport as any).reporter?.full_name || 'Không rõ'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-slate-500">Thời Gian</Label>
                      <p className="text-sm mt-0.5">{new Date(selectedReport.created_at).toLocaleString('vi-VN')}</p>
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Trạng Thái</Label>
                    <div className="mt-0.5">{getStatusBadge(selectedReport.status)}</div>
                  </div>
                </div>

                {selectedReport.status === 'PENDING' && (
                  <>
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Ghi Chú Xử Lý</Label>
                      <Textarea
                        placeholder="Nhập ghi chú..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1 text-sm h-9" onClick={() => updateReportStatus('RESOLVED')} disabled={loading}>
                          <CheckCircle className="h-4 w-4 mr-1" />Giải Quyết
                        </Button>
                        <Button variant="outline" className="flex-1 text-sm h-9 text-slate-500" onClick={() => updateReportStatus('DISMISSED')} disabled={loading}>
                          <XCircle className="h-4 w-4 mr-1" />Bỏ Qua
                        </Button>
                      </div>
                      {selectedReport.item_serial?.trim() && permissions.canDeleteItems() && selectedReport.error_type === 'DELETE_REQUEST' && (
                        <Button variant="destructive" className="text-sm h-9" onClick={() => deleteItem(selectedReport.item_serial!)} disabled={loading}>
                          <Trash2 className="h-4 w-4 mr-1" /> Duyệt Xóa SP
                        </Button>
                      )}
                    </div>
                  </>
                )}

                {selectedReport.status !== 'PENDING' && selectedReport.resolution_notes && (
                  <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <Label className="text-xs text-emerald-600">Ghi Chú Xử Lý</Label>
                    <p className="text-sm mt-0.5">{selectedReport.resolution_notes}</p>
                    {selectedReport.resolved_at && (
                      <p className="text-xs text-emerald-500 mt-1.5">Xử lý: {new Date(selectedReport.resolved_at).toLocaleString('vi-VN')}</p>
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
