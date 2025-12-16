import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Camera, CameraOff, Loader2, AlertTriangle, Settings, Zap, ZapOff, Scan } from 'lucide-react';
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
    
    // HTTP Check: Kiểm tra xem có đang chạy trên môi trường không an toàn không
    const isSecureContext = window.isSecureContext;
    if (!isSecureContext) {
      const errorMsg = '⚠️ Lỗi Bảo Mật Trình Duyệt:\nBạn đang truy cập qua HTTP (không an toàn).\nTrình duyệt CHẶN camera trên kết nối này.\n\nVui lòng truy cập qua HTTPS hoặc localhost.';
      setError(errorMsg);
      if (onError) onError(errorMsg);
      setIsLoading(false);
      toast({
        title: '❌ Kết Nối Không An Toàn',
        description: 'Vui lòng sử dụng HTTPS để sử dụng camera.',
        variant: 'destructive',
        duration: 8000,
      });
      return;
    }

    try {
      // SAFARI FIX: Kiểm tra MediaDevices API theo cách tương thích với Safari
      const hasGetUserMedia = !!(
        navigator.mediaDevices?.getUserMedia ||
        (navigator as any).getUserMedia ||
        (navigator as any).webkitGetUserMedia ||
        (navigator as any).mozGetUserMedia ||
        (navigator as any).msGetUserMedia
      );
      
      if (!hasGetUserMedia) {
        throw new Error('Browser không hỗ trợ truy cập camera. Vui lòng dùng Safari 11+ hoặc Chrome.');
      }
      
      // SAFARI FIX: Sử dụng getUserMedia với fallback cho các browser cũ
      const getUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices) ||
        (navigator as any).getUserMedia?.bind(navigator) ||
        (navigator as any).webkitGetUserMedia?.bind(navigator) ||
        (navigator as any).mozGetUserMedia?.bind(navigator) ||
        (navigator as any).msGetUserMedia?.bind(navigator);
      
      if (!getUserMedia) {
        throw new Error('Không thể truy cập getUserMedia API');
      }
      
      // SAFARI FIX: Đơn giản hóa constraints cho Safari
      const constraints = {
        video: {
          facingMode: "environment", // Safari không thích { ideal: "environment" }
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      
      // Kiểm tra quyền camera
      let stream;
      if (navigator.mediaDevices?.getUserMedia) {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } else {
        // Fallback cho Safari cũ
        stream = await new Promise((resolve, reject) => {
          getUserMedia(constraints, resolve, reject);
        });
      }
      
      // Dừng stream ngay sau khi kiểm tra
      if (stream && stream.getTracks) {
        stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
      
      setError('');
      
      // Thông báo thành công
      toast({
        title: '✅ Camera Hoạt Động Tốt',
        description: 'Quyền camera đã được cấp. Bạn có thể bắt đầu quét.',
        duration: 3000,
      });
    } catch (err: any) {
      console.error('Camera permission error:', err);
      let errorMsg = 'Không thể truy cập camera.';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Quyền camera bị từ chối. Safari: Vào Settings → Safari → Camera → Cho phép.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'Không tìm thấy camera. Kiểm tra kết nối camera.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera đang được dùng bởi app khác. Đóng các app khác và thử lại.';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMsg = 'Cấu hình camera không được hỗ trợ. Thử browser khác.';
      } else if (err.name === 'SecurityError') {
        errorMsg = 'Lỗi bảo mật. Đảm bảo truy cập qua HTTPS hoặc localhost.';
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      if (onError) onError(errorMsg);
      
      toast({
        title: '❌ Lỗi Camera',
        description: errorMsg,
        variant: 'destructive',
        duration: 5000,
      });
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
      scannerRef.current = new Html5Qrcode(scannerId, {
        verbose: false, // Tắt verbose logging
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.EAN_8,
        ]
      });

      // Cấu hình tối ưu cho độ nhạy và độ sáng
      const config = {
        fps: 30, // Tăng FPS lên 30 để mượt hơn và bắt hình nhanh hơn
        qrbox: { width: 320, height: 180 }, // Tăng kích thước khung quét để dễ đưa mã vào
        aspectRatio: 1.777778,
        disableFlip: false,
        experimentalFeatures: {
          useBarCodeDetectorIfSupported: true // Bật lại tính năng này để dùng thuật toán native của trình duyệt (nhanh hơn)
        },
        videoConstraints: {
          facingMode: { ideal: "environment" },
          // Tăng độ phân giải lên Full HD để mã vạch rõ nét hơn
          width: { min: 1280, ideal: 1920, max: 3840 },
          height: { min: 720, ideal: 1080, max: 2160 },
          // Yêu cầu lấy nét liên tục và cân bằng trắng
          advanced: [
            { focusMode: "continuous" },
            { whiteBalanceMode: "continuous" },
            { exposureMode: "continuous" }
          ] as any // Ép kiểu vì TS có thể chưa cập nhật đủ type
        }
      };

      // SAFARI FIX: Thử nhiều cách khởi động camera
      let cameraStarted = false;
      const startMethods = [
        // Method 1: Sử dụng facingMode (ưu tiên cho mobile)
        async () => {
          await scannerRef.current!.start(
            { facingMode: "environment" },
            config,
            handleScanSuccess,
            handleScanError
          );
        },
        // Method 2: Sử dụng camera ID (fallback)
        async () => {
          const devices = await Html5Qrcode.getCameras();
          if (devices && devices.length > 0) {
            // Tìm camera sau, nếu không có thì dùng camera đầu tiên
            const backCamera = devices.find(d => d.label.toLowerCase().includes('back')) || devices[devices.length - 1];
            await scannerRef.current!.start(
              backCamera.id,
              config,
              handleScanSuccess,
              handleScanError
            );
          } else {
            throw new Error('Không tìm thấy camera nào');
          }
        }
      ];

      // Thử từng method cho đến khi thành công
      for (const method of startMethods) {
        try {
          await method();
          cameraStarted = true;
          break;
        } catch (err) {
          console.warn('Camera start method failed, trying next...', err);
          continue;
        }
      }

      if (!cameraStarted) {
        throw new Error('Không thể khởi động camera với bất kỳ phương pháp nào');
      }

      // Success handler được định nghĩa ở đây
      function handleScanSuccess(decodedText: string) {
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
      }

      // Error handler được định nghĩa ở đây
      function handleScanError(errorMessage: string) {
        // Chỉ log lỗi quan trọng, bỏ qua lỗi "không tìm thấy mã"
        if (!errorMessage.includes('NotFoundException') && 
            !errorMessage.includes('No MultiFormat Readers')) {
          console.debug('Scan error:', errorMessage);
        }
      }
      
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
      clearTimeout(scanTimeout);
      
      let errorMsg = 'Không thể khởi động camera.';
      
      // SAFARI FIX: Xử lý lỗi chi tiết cho Safari
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = 'Quyền camera bị từ chối.\n\nSafari iOS: Settings → Safari → Camera → Cho phép\nSafari Mac: Safari → Settings → Websites → Camera';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorMsg = 'Không tìm thấy camera. Kiểm tra:\n• Camera có hoạt động không?\n• Có app nào đang dùng camera không?';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorMsg = 'Camera đang được dùng bởi app khác. Đóng các app khác và thử lại.';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorMsg = 'Cấu hình camera không được hỗ trợ. Thử:\n• Cập nhật Safari/iOS\n• Dùng Chrome nếu có thể';
      } else if (err.name === 'SecurityError') {
        errorMsg = 'Lỗi bảo mật. Đảm bảo:\n• Truy cập qua HTTPS\n• Không dùng chế độ Private/Incognito';
      } else if (err.message) {
        errorMsg = `Lỗi: ${err.message}\n\nThử:\n• Refresh trang\n• Cấp quyền camera\n• Dùng Chrome nếu Safari không hoạt động`;
      }
      
      setError(errorMsg);
      if (onError) onError(errorMsg);
      setIsLoading(false);
      
      toast({
        title: '❌ Không Thể Khởi Động Camera',
        description: errorMsg.split('\n')[0], // Chỉ hiện dòng đầu trong toast
        variant: 'destructive',
        duration: 7000,
      });
      
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
      {/* Scanner Display Area */}
      <Card className="overflow-hidden bg-black border-0 shadow-2xl relative rounded-xl">
        <div className="relative w-full h-[500px] md:h-[450px]">
          {/* Scanner Container - Full Height */}
          <div
            ref={containerRef}
            id={scannerId}
            className="w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full"
          />

          {/* KHUNG CHECKING - Overlay sáng hơn */}
          {isScanning && (
            <div className="absolute inset-0 z-20 pointer-events-none">
              {/* Lớp phủ mờ nhẹ xung quanh để tập trung vào giữa, nhưng không quá tối */}
              <div className="absolute inset-0 bg-black/10"></div>
              
              {/* Khung quét chính */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  {/* Khung quét với animation nâng cao */}
                  <div className="w-[320px] h-[180px] border-2 border-emerald-400/80 rounded-lg relative overflow-hidden shadow-[0_0_0_9999px_rgba(0,0,0,0.2)]">
                    {/* 4 góc khung quét sáng rõ */}
                    <div className="absolute -top-1 -left-1 w-10 h-10 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl corner-pulse shadow-sm"></div>
                    <div className="absolute -top-1 -right-1 w-10 h-10 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl corner-pulse shadow-sm"></div>
                    <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl corner-pulse shadow-sm"></div>
                    <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-4 border-r-4 border-emerald-500 rounded-br-xl corner-pulse shadow-sm"></div>
                    
                    {/* Đường quét Laser đỏ mảnh và sắc nét hơn */}
                    <div className="absolute inset-0">
                      <div className="w-full h-[2px] bg-red-500/90 shadow-[0_0_10px_rgba(239,68,68,0.8)] scan-line"></div>
                    </div>
                  </div>
                  
                  {/* Hướng dẫn gọn gàng hơn */}
                  <div className="absolute -bottom-16 left-1/2 transform -translate-x-1/2 text-center w-full">
                    <div className="bg-black/60 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg inline-flex items-center gap-2">
                      <Scan className="w-4 h-4 text-emerald-400" />
                      <span>Di chuyển mã vào khung</span>
                    </div>
                  </div>
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

      {/* Control Buttons */}
      <div className="space-y-3">
        <div className="flex gap-3">
          {!isScanning ? (
            <>
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
              <Button
                onClick={checkPermissions}
                disabled={isLoading}
                variant="outline"
                className="h-12 px-4 shadow-lg"
                title="Kiểm tra quyền camera"
              >
                <Settings className="h-5 w-5" />
              </Button>
            </>
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
        
        {/* Help text */}
        {!isScanning && !error && (
          <div className="text-center">
            <p className="text-xs text-slate-500">
              💡 Nhấn <Settings className="inline h-3 w-3" /> để kiểm tra quyền camera trước khi quét
            </p>
          </div>
        )}
      </div>
    </div>
  );
};