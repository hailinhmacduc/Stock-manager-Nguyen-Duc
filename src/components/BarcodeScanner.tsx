import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Loader2, AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onScan, onError }) => {
  const [status, setStatus] = useState<'loading' | 'scanning' | 'error'>('loading');
  const [error, setError] = useState('');
  const [lastResult, setLastResult] = useState('');

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const mountedRef = useRef(true);
  const startedRef = useRef(false);

  // Multi-read confirmation: require same barcode decoded N times before accepting
  const readBufferRef = useRef<{ text: string; count: number }>({ text: '', count: 0 });
  const REQUIRED_READS = 2; // Must decode same barcode this many times

  const scannerId = useRef(`scanner-${Date.now()}`).current;

  const playBeep = useCallback(() => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      osc.type = 'square';
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch { /* silent */ }
  }, []);

  const cleanup = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        if (state === 2) await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch { /* ignore */ }
      scannerRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!mountedRef.current || startedRef.current) return;
    startedRef.current = true;

    setStatus('loading');
    setError('');

    await cleanup();
    await new Promise(r => setTimeout(r, 300));
    if (!mountedRef.current) return;

    try {
      scannerRef.current = new Html5Qrcode(scannerId, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.CODE_93,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        verbose: false,
        useBarCodeDetectorIfSupported: true, // Use native BarcodeDetector API!
      });

      // Camera selection
      let cameraConfig: any = { facingMode: "environment" };
      try {
        const devices = await Html5Qrcode.getCameras();
        if (devices && devices.length > 0) {
          const backCam = devices.find(d =>
            /back|rear|environment|sau/i.test(d.label)
          );
          if (backCam) cameraConfig = backCam.id;
          else if (devices.length === 1) cameraConfig = devices[0].id;
        }
      } catch { /* fallback to facingMode */ }

      if (!mountedRef.current) return;

      await scannerRef.current.start(
        cameraConfig,
        {
          fps: 30,
          qrbox: (vw: number, vh: number) => {
            const w = Math.floor(Math.min(vw * 0.9, 350));
            const h = Math.floor(Math.min(vh * 0.6, 200));
            return { width: w, height: h };
          },
          aspectRatio: 1.0,
          disableFlip: false,
        },
        (decodedText: string) => {
          if (!mountedRef.current) return;
          const cleaned = decodedText.trim();
          if (!cleaned) return;

          // Multi-read confirmation: require same barcode N times
          const buf = readBufferRef.current;
          if (buf.text === cleaned) {
            buf.count++;
          } else {
            buf.text = cleaned;
            buf.count = 1;
          }

          if (buf.count < REQUIRED_READS) return; // Not confirmed yet

          // Confirmed! Reset buffer and process
          readBufferRef.current = { text: '', count: 0 };
          setLastResult(cleaned);
          playBeep();
          if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
          onScan(cleaned);

          // Brief pause then resume for next scan
          try {
            scannerRef.current?.pause(true);
            setTimeout(() => {
              if (mountedRef.current && scannerRef.current) {
                try { scannerRef.current.resume(); } catch { }
              }
            }, 1500);
          } catch { }
        },
        () => { } // Ignore miss
      );

      if (mountedRef.current) {
        setStatus('scanning');

        // After camera starts, try to improve video quality
        try {
          const videoEl = document.querySelector(`#${scannerId} video`) as HTMLVideoElement;
          if (videoEl?.srcObject) {
            const track = (videoEl.srcObject as MediaStream).getVideoTracks()[0];
            if (track) {
              const capabilities = track.getCapabilities?.() as any;
              const constraints: any = {};

              // Autofocus
              if (capabilities?.focusMode?.includes('continuous')) {
                constraints.focusMode = 'continuous';
              }
              // Torch for dark environments
              // Don't auto-enable, but store capability

              if (Object.keys(constraints).length > 0) {
                await track.applyConstraints({ advanced: [constraints] });
              }
            }
          }
        } catch { /* not critical */ }
      }
    } catch (err: any) {
      if (!mountedRef.current) return;
      startedRef.current = false;

      console.error('Camera error:', err);
      const msg = String(err?.message || err || '');

      let errorMsg = 'Không thể mở camera.';
      if (msg.includes('NotAllowed') || msg.includes('Permission') || msg.includes('denied')) {
        errorMsg = 'Camera bị từ chối. Vào Cài đặt > Safari > Camera > Cho phép.';
      } else if (msg.includes('NotFound')) {
        errorMsg = 'Không tìm thấy camera.';
      } else if (msg.includes('NotReadable') || msg.includes('Could not start')) {
        errorMsg = 'Camera đang bận. Đóng app khác dùng camera.';
      } else if (msg.includes('Overconstrained')) {
        retryMinimal();
        return;
      } else if (msg.includes('insecure') || msg.includes('secure') || msg.includes('https')) {
        errorMsg = 'Cần HTTPS để dùng camera.';
      }

      setError(errorMsg);
      setStatus('error');
      if (onError) onError(errorMsg);
    }
  }, [scannerId, cleanup, playBeep, onScan, onError]);

  const retryMinimal = useCallback(async () => {
    await cleanup();
    startedRef.current = false;
    await new Promise(r => setTimeout(r, 500));
    if (!mountedRef.current) return;

    try {
      scannerRef.current = new Html5Qrcode(scannerId, {
        verbose: false,
        useBarCodeDetectorIfSupported: true,
      });
      const devices = await Html5Qrcode.getCameras();
      if (!devices?.length) { setError('Không tìm thấy camera.'); setStatus('error'); return; }
      const camId = devices[devices.length - 1].id;

      await scannerRef.current.start(
        camId,
        { fps: 15, qrbox: { width: 280, height: 160 } },
        (text: string) => {
          if (!mountedRef.current) return;
          setLastResult(text);
          playBeep();
          if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
          onScan(text);
        },
        () => { }
      );
      if (mountedRef.current) { setStatus('scanning'); setError(''); }
    } catch {
      if (mountedRef.current) { setError('Không thể mở camera. Thử tải lại trang.'); setStatus('error'); }
    }
  }, [scannerId, cleanup, playBeep, onScan]);

  const handleRetry = useCallback(() => {
    startedRef.current = false;
    setError('');
    setLastResult('');
    startCamera();
  }, [startCamera]);

  // AUTO-START
  useEffect(() => {
    mountedRef.current = true;
    const timer = setTimeout(() => startCamera(), 100);
    return () => {
      clearTimeout(timer);
      mountedRef.current = false;
      cleanup();
    };
  }, []);

  // Pause/resume on visibility
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && scannerRef.current) {
        cleanup();
        startedRef.current = false;
      } else if (!document.hidden && status !== 'error') {
        startCamera();
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [status, cleanup, startCamera]);

  return (
    <div className="scanner-container">
      {/* Camera viewfinder — NO dark overlay, clean view */}
      <div className="relative w-full rounded-xl overflow-hidden bg-slate-900" style={{ aspectRatio: '1' }}>
        <div
          id={scannerId}
          className="w-full h-full [&>video]:object-cover"
          style={{ minHeight: '280px' }}
        />

        {/* Minimal scan guide — just corner markers, no dark shading */}
        {status === 'scanning' && (
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative" style={{ width: '80%', maxWidth: '300px', height: '45%', maxHeight: '180px' }}>
                {/* Four corners only — no border, no dark area */}
                <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-emerald-400 rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-emerald-400 rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-emerald-400 rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-emerald-400 rounded-br-lg" />
                {/* Scan line */}
                <div className="absolute inset-x-4 h-[2px] bg-emerald-400/70 animate-scan-line rounded-full" />
              </div>
            </div>
          </div>
        )}

        {/* Loading */}
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-20">
            <div className="text-center text-white">
              <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-emerald-400" />
              <p className="text-xs opacity-80">Đang mở camera...</p>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="absolute inset-0 flex items-center justify-center bg-slate-900 z-20">
            <div className="text-center text-white px-6">
              <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-amber-400" />
              <p className="text-xs opacity-90 mb-3">{error}</p>
              <Button onClick={handleRetry} size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8">
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> Thử Lại
              </Button>
            </div>
          </div>
        )}

        {/* Scan result */}
        {lastResult && (
          <div className="absolute top-2 inset-x-2 z-30">
            <div className="bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold text-center shadow-lg">
              ✅ {lastResult}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};