import { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Printer } from 'lucide-react';

interface BatchBarcodeGeneratorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: {
    serialNumber: string;
    productName?: string;
  }[];
}

const BarcodeItem = ({ item }: { item: { serialNumber: string; productName?: string } }) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && item.serialNumber) {
      try {
        JsBarcode(barcodeRef.current, item.serialNumber, {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 10,
        });
      } catch (e) {
        console.error("Lỗi tạo mã vạch:", e);
      }
    }
  }, [item.serialNumber]);

  return (
    <div className="barcode-item-container">
      <div className="product-name">{item.productName}</div>
      <svg ref={barcodeRef}></svg>
    </div>
  );
};

export const BatchBarcodeGenerator: React.FC<BatchBarcodeGeneratorProps> = ({
  open,
  onOpenChange,
  items,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printContent = printRef.current;
    if (printContent) {
      const printWindow = window.open('', '', 'height=600,width=800');
      if (printWindow) {
        printWindow.document.write('<html><head><title>In Mã Vạch</title>');
        printWindow.document.write(`
          <style>
            @media print {
              @page {
                size: 3in 0.89in;
                margin: 0;
              }
              body {
                margin: 0;
                padding: 0;
                display: flex;
                flex-wrap: wrap;
                justify-content: space-around;
              }
              .barcode-item-container {
                width: 48%; /* Adjust for 2-column layout with a small gap */
                height: 100%;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                page-break-inside: avoid;
                padding: 2px;
              }
               .product-name {
                font-size: 8px; /* Adjust font size for the small label */
                text-align: center;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                width: 100%;
              }
              svg {
                width: 100%;
                height: auto;
              }
            }
          </style>
        `);
        printWindow.document.write('</head><body>');
        printWindow.document.write(printContent.innerHTML);
        printWindow.document.write('</body></html>');
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>In Hàng Loạt Mã Vạch</DialogTitle>
          <DialogDescription>
            Xem trước các mã vạch sẽ được in. Nhấn nút "In" để bắt đầu.
          </DialogDescription>
        </DialogHeader>
        <div className="flex-grow overflow-auto p-4 border rounded-md" >
           <div ref={printRef} className="grid grid-cols-2 gap-4">
            {items.map((item, index) => (
              <BarcodeItem key={index} item={item} />
            ))}
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <Button onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            In
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
