import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, CameraOff, Loader2, AlertTriangle, Settings, Zap, ZapOff } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError }) => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [lastScanResult, setLastScanResult] = useState<string>('');
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Unique ID that doesn't change on re-renders
  const scannerId = useRef(`qr-reader-${Math.random().toString(36).substr(2, 9)}`).current;

  // Tạo âm thanh beep
  useEffect(() => {
    // Tạo âm thanh beep bằng Web Audio API
    const createBeepSound = () => {
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800; // Tần số 800Hz
        oscillator.type = 'square';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.2);
      } catch (error) {
        console.warn('Cannot create beep sound:', error);
      }
    };

    // Lưu function để sử dụng
    (window as any).playBeep = createBeepSound;
  }, []);

  const checkPermissions = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      // Kiểm tra quyền camera đơn giản
      await navigator.mediaDevices.getUserMedia({ video: true });
      setError('');
    } catch (err: any) {
      let errorMsg = 'Không thể truy cập camera.';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Quyền truy cập camera bị từ chối. Vui lòng cấp quyền camera.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Không tìm thấy camera trên thiết bị.';
      }
      setError(errorMsg);
      if (onError) onError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const stopScanning = async () => {
    if (!mountedRef.current) return;
    
    // Tắt đèn khi dừng quét
    if (torchOn) {
      toggleTorch(false);
    }

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
      setTorchSupported(false); // Reset hỗ trợ đèn
    } catch (err) {
      console.warn('Stop scanning error:', err);
      setIsScanning(false);
    }
  };

  const startScanning = async () => {
    if (!mountedRef.current || isScanning || isLoading) return;
    
    setIsLoading(true);
    setError('');
    setLastScanResult('');

    // Thêm cơ chế báo lỗi nếu quét quá lâu
    const scanTimeout = setTimeout(() => {
      if (isScanning && mountedRef.current) {
        toast({
          title: '🔍 Không Nhận Diện Được Mã Vạch',
          description: 'Vui lòng kiểm tra độ sáng, giữ camera ổn định và đảm bảo mã vạch rõ nét.',
          variant: 'destructive',
          duration: 5000,
        });
      }
    }, 15000); // 15 giây

    try {
      // Ensure we stop any existing scanner first
      await stopScanning();
      
      // Wait a bit for cleanup
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (!mountedRef.current) return;

      // Create new scanner instance
      scannerRef.current = new Html5Qrcode(scannerId);

      // TÁCH RỜI CẤU HÌNH ĐỂ FIX LỖI
      // 1. Cấu hình để CHỌN camera (chỉ 1 key)
      const cameraSelectionConfig = { facingMode: 'environment' };

      // 2. Cấu hình để TỐI ƯU camera (nhiều key)
      const config = {
        fps: 30, // Tăng FPS để quét nhạy hơn
        qrbox: { width: 300, height: 150 }, // Khung chữ nhật tốt hơn cho barcode 1D
        aspectRatio: 1.777778, // 16:9 aspect ratio
        disableFlip: false,
        formatsToSupport: [
          // ÉP BUỘC CHỈ QUÉT CODE128 ĐỂ ĐỒNG BỘ VỚI BÊN TẠO MÃ
          Html5QrcodeSupportedFormats.CODE_128,
        ],
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true
        },
        videoConstraints: {
          width: { ideal: 1920, min: 1280 }, // Tăng độ phân giải
          height: { ideal: 1080, min: 720 },
          focusMode: 'continuous',
          exposureMode: 'continuous',
          whiteBalanceMode: 'continuous'
        }
      };

      await scannerRef.current.start(
        cameraSelectionConfig, // Truyền cấu hình CHỌN
        config, // Truyền cấu hình TỐI ƯU
        (decodedText: string) => {
          if (!mountedRef.current) return;
          
          console.log('🎯 Barcode detected:', decodedText);
          setLastScanResult(decodedText);
          
          // Phát âm thanh beep
          try {
            if ((window as any).playBeep) {
              (window as any).playBeep();
            }
          } catch (error) {
            console.warn('Cannot play beep:', error);
          }
          
          // Vibration feedback
          if ('vibrate' in navigator) {
            navigator.vibrate([100, 50, 100]); // Rung 2 lần ngắn
          }
          
          // Gọi callback
          onScan(decodedText);
          
          // Xóa timeout nếu quét thành công
          clearTimeout(scanTimeout);

          // Tạm dừng quét và chờ xử lý
          if (scannerRef.current?.getState() === 2) { // SCANNING
            scannerRef.current.pause(true);
            // Quét lại sau 1.5 giây
            setTimeout(() => {
              if (scannerRef.current?.getState() === 3) { // PAUSED
                scannerRef.current.resume();
              }
            }, 1500);
          }
        },
        (errorMessage: string) => {
          // Chỉ log lỗi quan trọng, bỏ qua lỗi "không tìm thấy mã"
          if (!errorMessage.includes('NotFoundException') && 
              !errorMessage.includes('No MultiFormat Readers')) {
            console.debug('Scan error:', errorMessage);
          }
        }
      );
      
      console.log('✅ Camera started successfully');

      // Kiểm tra hỗ trợ đèn flash sau khi camera khởi động
      try {
        const capabilities = scannerRef.current.getRunningTrackCapabilities();
        if (capabilities.torch) {
          console.log('🔦 Đèn flash được hỗ trợ');
          setTorchSupported(true);
        } else {
          console.log('🔦 Không hỗ trợ đèn flash');
        }
      } catch (error) {
        console.warn('Không thể kiểm tra hỗ trợ đèn flash:', error);
        setTorchSupported(false);
      }

      setIsScanning(true);
      setIsLoading(false);
      
    } catch (err: any) {
      if (!mountedRef.current) return;
      
      console.error('❌ Scanner start error:', err);
      
      let errorMsg = 'Không thể khởi động camera.';
      if (err.name === 'NotAllowedError') {
        errorMsg = 'Quyền truy cập camera bị từ chối. Vui lòng cấp quyền camera.';
      } else if (err.name === 'NotFoundError') {
        errorMsg = 'Không tìm thấy camera. Kiểm tra kết nối camera.';
      } else if (err.name === 'NotReadableError') {
        errorMsg = 'Camera đang được sử dụng bởi ứng dụng khác.';
      } else if (err.name === 'OverconstrainedError') {
        errorMsg = 'Cấu hình camera không được hỗ trợ.';
      }
      
      setError(errorMsg);
      if (onError) onError(errorMsg);
      setIsLoading(false);
      await stopScanning();
    }
  };

  // Hàm bật/tắt đèn flash
  const toggleTorch = async (newState?: boolean) => {
    if (scannerRef.current && torchSupported) {
      const capabilities = scannerRef.current.getRunningTrackCapabilities();
      const targetState = newState !== undefined ? newState : !torchOn;
      try {
        await capabilities.applyConstraints({
          advanced: [{ torch: targetState }]
        });
        setTorchOn(targetState);
      } catch (err) {
        console.error('Lỗi bật/tắt đèn:', err);
        toast({
          title: 'Lỗi Đèn Flash',
          description: 'Không thể điều khiển đèn flash.',
          variant: 'destructive',
        });
      }
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
      {/* Scanner Display Area với Khung Checking */}
      <Card className="overflow-hidden bg-black border-4 border-emerald-400 shadow-2xl">
        <div className="relative w-full h-[400px] md:h-[320px]">
          {/* Scanner Container */}
          <div
            ref={containerRef}
            id={scannerId}
            className="w-full h-full flex items-center justify-center"
            style={{
              objectFit: 'cover'
            }}
          />

          {/* KHUNG CHECKING - Overlay quét mã vạch */}
          {isScanning && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              {/* Khung quét chính */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Khung quét với animation nâng cao */}
                  <div className="w-[300px] h-[200px] border-4 border-emerald-400 rounded-lg relative overflow-hidden">
                    {/* 4 góc khung quét với animation */}
                    <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-emerald-300 rounded-tl-lg corner-pulse"></div>
                    <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-emerald-300 rounded-tr-lg corner-pulse"></div>
                    <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-emerald-300 rounded-bl-lg corner-pulse"></div>
                    <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-emerald-300 rounded-br-lg corner-pulse"></div>
                    
                    {/* Đường quét di chuyển từ trên xuống */}
                    <div className="absolute inset-0">
                      <div className="w-full h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent scan-line shadow-lg"></div>
                    </div>
                    
                    {/* Đường ngang giữa */}
                    <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-emerald-400 animate-pulse transform -translate-y-1/2 opacity-50"></div>
                    
                    {/* Hiệu ứng sáng xung quanh khung */}
                    <div className="absolute inset-0 border-2 border-emerald-300 rounded-lg animate-pulse opacity-30"></div>
                  </div>
                  
                  {/* Hướng dẫn */}
                  <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2 text-center">
                    <div className="bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg">
                      🎯 Đưa mã vạch vào khung xanh
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Overlay tối xung quanh khung quét */}
              <div className="absolute inset-0 bg-black bg-opacity-50">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[300px] h-[200px] bg-transparent border-4 border-transparent rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"></div>
                </div>
              </div>
            </div>
          )}

          {/* Placeholder when not scanning */}
          {!isScanning && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-center text-white p-6 z-10">
              <div>
                <Camera className="h-16 w-16 mx-auto mb-4 opacity-60" />
                <p className="text-sm font-medium">Nhấn "Bắt Đầu Quét" để khởi động camera</p>
                <p className="text-xs opacity-75 mt-2">Sẽ xuất hiện khung quét màu xanh</p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center text-center text-white p-6 bg-black bg-opacity-75 z-30">
              <div>
                <Loader2 className="h-12 w-12 mx-auto mb-4 animate-spin text-emerald-400" />
                <p className="text-sm font-medium">Đang khởi động camera...</p>
                <p className="text-xs opacity-75 mt-1">Vui lòng chờ...</p>
              </div>
            </div>
          )}

          {/* Nút bật/tắt đèn flash */}
          {isScanning && torchSupported && (
            <div className="absolute top-4 right-4 z-30">
              <Button 
                onClick={() => toggleTorch()}
                variant="outline"
                size="icon"
                className={`rounded-full h-12 w-12 transition-all duration-300 ${
                  torchOn 
                    ? 'bg-amber-400 text-black border-amber-500 shadow-lg' 
                    : 'bg-black/50 text-white border-white/50'
                }`}
              >
                {torchOn ? <ZapOff className="h-6 w-6" /> : <Zap className="h-6 w-6" />}
              </Button>
            </div>
          )}

          {/* Kết quả quét gần đây */}
          {lastScanResult && (
            <div className="absolute top-4 left-4 right-4 z-25">
              <div className="bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-bold text-center shadow-lg">
                ✅ Đã quét: {lastScanResult}
              </div>
            </div>
          )}

          {/* Scanning indicator */}
          {isScanning && (
            <div className="absolute bottom-4 left-0 right-0 text-center z-15">
              <div className="inline-block bg-red-500 text-white px-4 py-2 rounded-full text-sm font-medium animate-pulse">
                📷 Đang quét... Đưa mã vạch vào khung xanh
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

      {/* Control Buttons - Đơn giản hóa */}
      <div className="space-y-3">
        <div className="flex gap-3">
          {!isScanning ? (
            <Button
              onClick={startScanning}
              disabled={isLoading}
              className="flex-1 h-12 text-base bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 disabled:opacity-50 shadow-lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Đang Khởi Động...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-5 w-5" />
                  🎯 Bắt Đầu Quét
                </>
              )}
            </Button>
          ) : (
            <Button
              onClick={stopScanning}
              variant="destructive"
              className="flex-1 h-12 text-base shadow-lg"
            >
              <CameraOff className="mr-2 h-5 w-5" />
              ⏹️ Dừng Quét
            </Button>
          )}
        </div>
      </div>

      {/* Instructions với Khung Checking */}
      <div className="bg-emerald-50 border-2 border-emerald-300 rounded-lg p-4">
        <p className="text-base md:text-sm text-emerald-800 font-bold mb-3">🎯 Hướng dẫn quét với KHUNG CHECKING:</p>
        <ul className="text-sm md:text-xs text-emerald-700 space-y-2 ml-4">
          <li>• <strong>Bước 1:</strong> Nhấn "🎯 Bắt Đầu Quét" → Xuất hiện khung xanh</li>
          <li>• <strong>Bước 2:</strong> Đưa mã vạch vào CHÍNH GIỮA khung xanh</li>
          <li>• <strong>Khoảng cách:</strong> Giữ camera cách mã vạch 15-25cm</li>
          <li>• <strong>Ánh sáng:</strong> Đảm bảo đủ sáng, tránh phản quang</li>
          <li>• <strong>Thành công:</strong> Nghe "BEEP" + rung + hiển thị kết quả</li>
        </ul>
      </div>

      {/* Troubleshooting */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-lg p-4">
        <p className="text-sm md:text-xs text-amber-800 font-bold mb-2">🔧 Khắc phục sự cố:</p>
        <div className="text-sm md:text-xs text-amber-700 space-y-2">
          <div><strong>🚫 Không thấy khung xanh:</strong></div>
          <div className="ml-4 space-y-1">
            <div>• Refresh trang (F5) và cho phép quyền camera</div>
            <div>• Thử trình duyệt khác (Chrome/Safari khuyến nghị)</div>
          </div>
          
          <div><strong>🔍 Không quét được mã vạch:</strong></div>
          <div className="ml-4 space-y-1">
            <div>• Đưa mã vạch VÀO CHÍNH GIỮA khung xanh</div>
            <div>• Giữ khoảng cách 15-25cm</div>
            <div>• Giữ tay ổn định, không rung lắc</div>
            <div>• Đảm bảo mã vạch rõ nét, không bị mờ</div>
          </div>
          
          <div><strong>🔊 Không nghe thấy "BEEP":</strong></div>
          <div className="ml-4 space-y-1">
            <div>• Kiểm tra âm lượng điện thoại</div>
            <div>• Vẫn có rung và hiển thị kết quả</div>
          </div>
        </div>
      </div>
    </div>
  );
};