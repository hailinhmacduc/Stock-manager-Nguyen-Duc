import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, CameraOff, Loader2, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);

  // Unique ID that doesn't change on re-renders
  const scannerId = useRef(`qr-reader-${Math.random().toString(36).substr(2, 9)}`).current;

  const stopScanning = async () => {
    if (!mountedRef.current) return;
    
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState();
        if (state === 2) { // SCANNING state
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
        scannerRef.current = null;
      }
      setIsScanning(false);
    } catch (err) {
      console.warn('Stop scanning error:', err);
      setIsScanning(false);
    }
  };

  const startScanning = async () => {
    if (!mountedRef.current || isScanning || isLoading) return;
    
    setIsLoading(true);
    setError('');

    try {
      // Ensure we stop any existing scanner first
      await stopScanning();
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 200));
      
      if (!mountedRef.current) return;

      // Create new scanner instance
      scannerRef.current = new Html5Qrcode(scannerId);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.777778,
        disableFlip: false
      };

      // Start scanning
      await scannerRef.current.start(
        { facingMode: 'environment' },
        config,
        (decodedText: string) => {
          if (!mountedRef.current) return;
          console.log('Barcode scanned:', decodedText);
          onScan(decodedText);
          stopScanning();
        },
        (errorMessage: string) => {
          // Ignore continuous scanning errors
        }
      );

      if (mountedRef.current) {
        setIsScanning(true);
        setIsLoading(false);
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      
      console.error('Scanner start error:', err);
      
      let errorMsg = 'Không thể khởi động camera.';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Quyền truy cập camera bị từ chối. Vui lòng cấp quyền camera.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Không tìm thấy camera trên thiết bị.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera đang được sử dụng bởi ứng dụng khác.';
      }
      
      setError(errorMsg);
      if (onError) onError(errorMsg);
      setIsLoading(false);
      await stopScanning();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    
    return () => {
      mountedRef.current = false;
      stopScanning();
    };
  }, []);

  // Handle page visibility
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isScanning) {
        stopScanning();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isScanning]);

  return (
    <div className="space-y-4">
      {/* Scanner Display Area */}
      <Card className="overflow-hidden bg-black border-2 border-slate-300">
        <div className="relative w-full h-[320px]">
          {/* Scanner Container */}
          <div
            ref={containerRef}
            id={scannerId}
            className="w-full h-full flex items-center justify-center"
          />

          {/* Placeholder when not scanning */}
          {!isScanning && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-center text-white p-6 z-10">
              <div>
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-60" />
                <p className="text-sm font-medium">Nhấn nút bên dưới để bắt đầu quét</p>
                <p className="text-xs opacity-75 mt-2">Cần cấp quyền truy cập camera</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-center text-white p-6 bg-black bg-opacity-75 z-20">
              <div>
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin" />
                <p className="text-sm font-medium">Đang khởi động camera...</p>
              </div>
            </div>
          )}

          {/* Scanning indicator */}
          {isScanning && (
            <div className="absolute bottom-4 left-0 right-0 text-center z-10">
              <div className="inline-block bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium">
                📷 Đang quét mã vạch...
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="text-sm">{error}</AlertDescription>
        </Alert>
      )}

      {/* Control Buttons */}
      <div className="flex gap-3">
        {!isScanning ? (
          <Button
            onClick={startScanning}
            disabled={isLoading}
            className="flex-1 h-12 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Đang Khởi Động...
              </>
            ) : (
              <>
                <Camera className="mr-2 h-5 w-5" />
                Bắt Đầu Quét
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={stopScanning}
            variant="destructive"
            className="flex-1 h-12 text-base"
          >
            <CameraOff className="mr-2 h-5 w-5" />
            Dừng Quét
          </Button>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800 font-medium mb-2">📱 Hướng dẫn quét:</p>
        <ul className="text-xs text-blue-700 space-y-1 ml-4">
          <li>• Giữ camera cách mã vạch khoảng 15-25cm</li>
          <li>• Đảm bảo đủ ánh sáng và mã vạch rõ nét</li>
          <li>• Đưa mã vạch vào khung quét trên màn hình</li>
          <li>• Giữ ổn định, không rung camera</li>
          <li>• Khi quét thành công, camera sẽ tự động dừng</li>
        </ul>
      </div>

      {/* Troubleshooting */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <p className="text-xs text-amber-800">
          <strong>🔧 Khắc phục sự cố:</strong>
          <br/>• Nếu camera không hoạt động: Refresh trang (F5) và cho phép quyền camera
          <br/>• Nếu không quét được: Kiểm tra ánh sáng và độ rõ nét của mã vạch
          <br/>• Thử trình duyệt khác nếu vẫn gặp lỗi (Chrome được khuyến nghị)
        </p>
      </div>
    </div>
  );
};