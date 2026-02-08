import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLine, Package, Search, MapPin, Tag, DollarSign, Calendar, CheckCircle2, XCircle } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getStatusDisplayName, getConditionDisplayName, getLocationDisplayName } from '@/lib/constants';
import { BarcodeScanner } from '@/components/BarcodeScanner';

interface ScanResult {
    id: string;
    serial_number: string;
    status: string;
    condition: string;
    location: string;
    cost: number;
    received_at: string;
    brand?: string;
    model_name?: string;
    spec?: string;
}

export default function QuickScan() {
    const [serialNumber, setSerialNumber] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);
    const [notFound, setNotFound] = useState(false);

    const handleSearch = async (serial?: string) => {
        const searchSerial = serial || serialNumber.trim();
        if (!searchSerial) { toast.error("Vui lòng nhập serial number"); return; }
        setIsSearching(true);
        setNotFound(false);
        try {
            const { data, error } = await supabase
                .from("inventory_items")
                .select(`id, serial_number, status, condition, location, cost, received_at, sku_info (brand, model_name, spec)`)
                .eq("serial_number", searchSerial)
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    toast.error("Không tìm thấy sản phẩm với mã: " + searchSerial);
                    setNotFound(true);
                }
                else throw error;
                setResult(null);
            } else {
                setResult({
                    id: data.id, serial_number: data.serial_number, status: data.status,
                    condition: data.condition, location: data.location, cost: data.cost,
                    received_at: data.received_at,
                    brand: (data.sku_info as any)?.brand, model_name: (data.sku_info as any)?.model_name,
                    spec: (data.sku_info as any)?.spec,
                });
                setNotFound(false);
                toast.success("Tìm thấy sản phẩm!");
            }
        } catch (error: any) {
            toast.error("Lỗi: " + error.message);
            setResult(null);
        } finally {
            setIsSearching(false);
        }
    };

    const handleBarcodeScan = (decodedText: string) => {
        setSerialNumber(decodedText);
        toast.info("Đã quét: " + decodedText);
        handleSearch(decodedText);
    };

    const handleScanError = (error: string) => {
        console.warn("Scan error:", error);
    };

    const formatPrice = (price: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(price);

    const formatDate = (dateStr: string) => {
        if (!dateStr) return "N/A";
        const date = new Date(dateStr);
        return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
    };

    const getStatusBadge = (status: string) => {
        if (status === 'AVAILABLE') return 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (status === 'SOLD') return 'bg-red-50 text-red-600 border-red-200';
        return 'bg-amber-50 text-amber-700 border-amber-200';
    };

    const getStatusIcon = (status: string) => {
        if (status === 'AVAILABLE') return <CheckCircle2 className="h-4 w-4 text-emerald-600" />;
        if (status === 'SOLD') return <XCircle className="h-4 w-4 text-red-500" />;
        return <Package className="h-4 w-4 text-amber-600" />;
    };

    return (
        <Layout>
            <div className="space-y-3 md:space-y-4 max-w-2xl mx-auto animate-fade-in">
                {/* Page Header */}
                <div className="page-header">
                    <h1>
                        <ScanLine className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                        Quét Mã Sản Phẩm
                    </h1>
                    <p>Quét barcode hoặc nhập serial để tra cứu</p>
                </div>

                {/* Camera Scanner - always visible */}
                <div className="section-card">
                    <div className="section-card-content pt-3">
                        <BarcodeScanner
                            onScan={handleBarcodeScan}
                            onError={handleScanError}
                        />
                    </div>
                </div>

                {/* Manual Search */}
                <div className="section-card">
                    <div className="section-card-header">
                        <Search className="h-4 w-4 text-slate-500" />
                        <h3>Tìm Thủ Công</h3>
                    </div>
                    <div className="section-card-content">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nhập serial number..."
                                value={serialNumber}
                                onChange={(e) => setSerialNumber(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="h-10 border-slate-200 text-sm"
                            />
                            <Button onClick={() => handleSearch()} disabled={isSearching} className="h-10 bg-blue-600 hover:bg-blue-700 px-4">
                                <Search className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Not Found */}
                {notFound && !result && (
                    <div className="section-card animate-slide-up border-l-4 border-l-red-400">
                        <div className="section-card-content py-6 text-center">
                            <XCircle className="h-10 w-10 mx-auto text-red-300 mb-2" />
                            <p className="text-sm font-medium text-slate-700">Không tìm thấy sản phẩm</p>
                            <p className="text-xs text-slate-400 mt-1">Kiểm tra lại mã hoặc thử quét lại</p>
                        </div>
                    </div>
                )}

                {/* Result */}
                {result && (
                    <div className="section-card animate-slide-up border-l-4 border-l-blue-400">
                        <div className="section-card-header">
                            <Package className="h-4 w-4 text-blue-500" />
                            <h3>Thông Tin Sản Phẩm</h3>
                        </div>
                        <div className="section-card-content space-y-3">
                            {/* Product Name + Status */}
                            <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <div className="text-base font-semibold text-slate-900">
                                        {result.brand} {result.model_name}
                                    </div>
                                    <div className="font-mono text-xs text-slate-500 mt-0.5">{result.serial_number}</div>
                                    {result.spec && <div className="text-xs text-slate-400 mt-0.5 line-clamp-2">{result.spec}</div>}
                                </div>
                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border shrink-0 ${getStatusBadge(result.status)}`}>
                                    {getStatusIcon(result.status)}
                                    {getStatusDisplayName(result.status)}
                                </span>
                            </div>

                            {/* Detail Grid */}
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-blue-50/60 rounded-lg p-3 text-center">
                                    <MapPin className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                                    <div className="text-xs font-semibold text-slate-800">{getLocationDisplayName(result.location)}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Vị Trí</div>
                                </div>
                                <div className="bg-amber-50/60 rounded-lg p-3 text-center">
                                    <Tag className="h-4 w-4 mx-auto text-amber-500 mb-1" />
                                    <div className="text-xs font-semibold text-slate-800">{getConditionDisplayName(result.condition)}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Tình Trạng</div>
                                </div>
                                <div className="bg-emerald-50/60 rounded-lg p-3 text-center">
                                    <Calendar className="h-4 w-4 mx-auto text-emerald-500 mb-1" />
                                    <div className="text-xs font-semibold text-slate-800">{formatDate(result.received_at)}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Ngày Nhập Kho</div>
                                </div>
                                <div className="bg-purple-50/60 rounded-lg p-3 text-center">
                                    <DollarSign className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                                    <div className="text-xs font-semibold text-blue-600">{formatPrice(result.cost)}</div>
                                    <div className="text-[10px] text-slate-400 mt-0.5">Giá Nhập</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
