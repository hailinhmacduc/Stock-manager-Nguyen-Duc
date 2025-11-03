import { useRef } from 'react';
import Barcode from 'react-barcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer, Download } from 'lucide-react';

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
    const svg = printRef.current?.querySelector('svg');
    if (!svg) return;

    // Convert SVG to canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height + 60; // Extra space for text
      
      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw product name if exists
      if (productName) {
        ctx.fillStyle = 'black';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(productName, canvas.width / 2, 20);
      }
      
      // Draw barcode
      ctx.drawImage(img, 0, 30);
      
      // Download
      const link = document.createElement('a');
      link.download = `barcode-${serialNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
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
              <div className="product-name text-xs font-bold text-slate-800 mb-2 px-2 leading-tight" style={{ 
                height: '32px', 
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical' as const,
                wordBreak: 'break-word'
              }}>
                {productName}
              </div>
            )}
            
            <div className="flex justify-center items-center pb-2">
              <div className="inline-block" style={{ maxWidth: '100%', overflow: 'hidden' }}>
                <Barcode 
                  value={serialNumber}
                  format="CODE128"
                  width={1.2}
                  height={45}
                  displayValue={true}
                  fontSize={10}
                  margin={3}
                />
              </div>
            </div>
            
            <div className="serial-text text-xs font-mono text-slate-600 mt-1 px-2 leading-tight" style={{
              height: '24px',
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical' as const,
              wordBreak: 'break-all'
            }}>
              {serialNumber}
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

