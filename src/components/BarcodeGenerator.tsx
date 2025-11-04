import { useRef, useEffect, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Download } from 'lucide-react';
import html2canvas from 'html2canvas';

interface BarcodeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serialNumber: string;
  productName?: string;
}

export const BarcodeGenerator: React.FC<BarcodeGeneratorProps> = ({
  open,
  onOpenChange,
  serialNumber,
  productName = ''
}) => {
  const printRef = useRef<HTMLDivElement>(null);
  const barcodeRef = useRef<SVGSVGElement>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Effect 1: Đồng bộ state với prop 'open'
  useEffect(() => {
    setIsDialogOpen(open);
  }, [open]);

  // Effect 2: Chỉ vẽ mã vạch khi dialog đã thực sự mở
  useEffect(() => {
    if (isDialogOpen && barcodeRef.current && serialNumber) {
      try {
        JsBarcode(barcodeRef.current, serialNumber, {
          format: "CODE128", // Sử dụng CODE128 chung cho độ tương thích cao nhất
          width: 2,
          height: 60,
          displayValue: true,
          fontSize: 16,
          margin: 10,
        });
      } catch (e) {
        console.error("Lỗi tạo mã vạch:", e);
        // Tùy chọn: Hiển thị lỗi cho người dùng
      }
    }
  }, [isDialogOpen, serialNumber]); // Chạy lại khi dialog mở hoặc serial thay đổi

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>In Mã Vạch - ${serialNumber}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            .barcode-container {
              text-align: center;
              padding: 20px;
              border: 2px dashed #ccc;
              background: white;
            }
            .product-name {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 10px;
              color: #333;
            }
            .serial-text {
              font-size: 12px;
              margin-top: 5px;
              font-family: monospace;
              color: #666;
            }
            @media print {
              body {
                padding: 0;
              }
              .barcode-container {
                border: none;
                padding: 10px;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    
    // Đợi content load xong rồi mới print
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const handleDownloadImage = () => {
    const container = printRef.current;
    if (!container) return;

    html2canvas(container, {
      scale: 3, // Tăng độ phân giải
      backgroundColor: '#ffffff', // Đảm bảo nền trắng
      onclone: (document) => {
        // Tùy chỉnh clone DOM trước khi chụp ảnh nếu cần
        const clonedContainer = document.querySelector('.barcode-container') as HTMLElement;
        if (clonedContainer) {
          clonedContainer.style.border = 'none'; // Bỏ viền dashed
        }
      }
    }).then(canvas => {
      const link = document.createElement('a');
      link.download = `barcode-${serialNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-blue-900">Mã Vạch Sản Phẩm</DialogTitle>
          <DialogDescription>
            In hoặc tải xuống mã vạch để dán lên sản phẩm
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Barcode Display */}
          <div 
            ref={printRef}
            className="barcode-container bg-white border-2 border-dashed border-slate-300 rounded-lg p-4 text-center"
            style={{ width: '100%', maxWidth: '350px', margin: '0 auto' }}
          >
            {productName && (
              <div 
                className="product-name text-sm font-bold text-slate-800 mb-2 px-2" 
                style={{ wordBreak: 'break-word', lineHeight: '1.4' }}
              >
                {productName}
              </div>
            )}
            
            <div className="flex justify-center items-center pb-2 min-h-[80px]">
              <svg ref={barcodeRef}></svg>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button
              onClick={handlePrint}
              className="h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              <Printer className="mr-2 h-4 w-4" />
              In Mã Vạch
            </Button>
            
            <Button
              onClick={handleDownloadImage}
              variant="outline"
              className="h-11"
            >
              <Download className="mr-2 h-4 w-4" />
              Tải Về PNG
            </Button>
          </div>

          {/* Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-amber-800">
              💡 <strong>Lưu ý:</strong> Dán mã vạch lên sản phẩm để dễ dàng quét khi kiểm kho hoặc bán hàng
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

