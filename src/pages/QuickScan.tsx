import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScanLine, Package, Search } from "lucide-react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ScanResult {
    id: string;
    serial_number: string;
    status: string;
    condition: string;
    location: string;
    cost: number;
    brand?: string;
    model_name?: string;
    spec?: string;
}

export default function QuickScan() {
    const [serialNumber, setSerialNumber] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<ScanResult | null>(null);

    const handleSearch = async () => {
        if (!serialNumber.trim()) {
            toast.error("Vui lòng nhập serial number");
            return;
        }

        setIsSearching(true);
        try {
            const { data, error } = await supabase
                .from("inventory_items")
                .select(`
          id,
          serial_number,
          status,
          condition,
          location,
          cost,
          sku_info (
            brand,
            model_name,
            spec
          )
        `)
                .eq("serial_number", serialNumber.trim())
                .single();

            if (error) {
                if (error.code === "PGRST116") {
                    toast.error("Không tìm thấy sản phẩm với serial number này");
                } else {
                    throw error;
                }
                setResult(null);
            } else {
                setResult({
                    id: data.id,
                    serial_number: data.serial_number,
                    status: data.status,
                    condition: data.condition,
                    location: data.location,
                    cost: data.cost,
                    brand: (data.sku_info as any)?.brand,
                    model_name: (data.sku_info as any)?.model_name,
                    spec: (data.sku_info as any)?.spec,
                });
            }
        } catch (error: any) {
            toast.error("Lỗi: " + error.message);
            setResult(null);
        } finally {
            setIsSearching(false);
        }
    };

    const formatPrice = (price: number) => {
        return new Intl.NumberFormat("vi-VN", {
            style: "currency",
            currency: "VND",
        }).format(price);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "available":
                return "text-green-600 bg-green-100";
            case "sold":
                return "text-red-600 bg-red-100";
            default:
                return "text-gray-600 bg-gray-100";
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case "available":
                return "Còn hàng";
            case "sold":
                return "Đã bán";
            default:
                return status;
        }
    };

    return (
        <Layout>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Quick Scan</h1>
                    <p className="text-gray-600 mt-1">Tra cứu nhanh sản phẩm theo serial number</p>
                </div>

                <Card className="max-w-2xl">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <ScanLine className="w-5 h-5" />
                            Tìm kiếm sản phẩm
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nhập serial number..."
                                value={serialNumber}
                                onChange={(e) => setSerialNumber(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                            />
                            <Button onClick={handleSearch} disabled={isSearching}>
                                <Search className="w-4 h-4 mr-2" />
                                {isSearching ? "Đang tìm..." : "Tìm kiếm"}
                            </Button>
                        </div>

                        {result && (
                            <Card className="border-blue-200 bg-blue-50/50">
                                <CardContent className="pt-4">
                                    <div className="flex items-start gap-4">
                                        <Package className="w-10 h-10 text-blue-600" />
                                        <div className="flex-1 space-y-2">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono text-lg font-bold">
                                                    {result.serial_number}
                                                </span>
                                                <span className={`px-2 py-1 rounded text-sm font-medium ${getStatusColor(result.status)}`}>
                                                    {getStatusText(result.status)}
                                                </span>
                                            </div>
                                            <p className="font-medium text-gray-900">
                                                {result.brand} {result.model_name}
                                            </p>
                                            {result.spec && (
                                                <p className="text-sm text-gray-600">{result.spec}</p>
                                            )}
                                            <div className="grid grid-cols-2 gap-2 text-sm">
                                                <div>
                                                    <span className="text-gray-500">Vị trí: </span>
                                                    <span className="font-medium">{result.location}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Tình trạng: </span>
                                                    <span className="font-medium">{result.condition}</span>
                                                </div>
                                                <div>
                                                    <span className="text-gray-500">Giá nhập: </span>
                                                    <span className="font-medium text-blue-600">{formatPrice(result.cost)}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </CardContent>
                </Card>
            </div>
        </Layout>
    );
}
