// Utility functions for camera handling

export const checkCameraPermission = async (): Promise<{
  hasPermission: boolean;
  error?: string;
}> => {
  try {
    // Check if navigator.permissions is available
    if ('permissions' in navigator) {
      const permission = await navigator.permissions.query({ name: 'camera' as PermissionName });
      
      if (permission.state === 'granted') {
        return { hasPermission: true };
      } else if (permission.state === 'denied') {
        return { 
          hasPermission: false, 
          error: 'Quyền camera bị từ chối. Vui lòng cấp quyền trong cài đặt trình duyệt.' 
        };
      } else {
        return { 
          hasPermission: false, 
          error: 'Cần cấp quyền truy cập camera.' 
        };
      }
    }
    
    // Fallback: try to access camera directly
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop()); // Stop immediately
      return { hasPermission: true };
    } catch (error: any) {
      return { 
        hasPermission: false, 
        error: getCameraErrorMessage(error) 
      };
    }
    
  } catch (error: any) {
    return { 
      hasPermission: false, 
      error: getCameraErrorMessage(error) 
    };
  }
};

export const getCameraErrorMessage = (error: any): string => {
  if (!error) return 'Lỗi không xác định';
  
  switch (error.name) {
    case 'NotAllowedError':
      return 'Quyền truy cập camera bị từ chối. Vui lòng cấp quyền camera trong cài đặt trình duyệt.';
    case 'NotFoundError':
      return 'Không tìm thấy camera trên thiết bị. Kiểm tra kết nối camera.';
    case 'NotReadableError':
      return 'Camera đang được sử dụng bởi ứng dụng khác. Đóng các ứng dụng khác và thử lại.';
    case 'OverconstrainedError':
      return 'Cấu hình camera không được hỗ trợ. Thử trình duyệt khác.';
    case 'SecurityError':
      return 'Lỗi bảo mật. Đảm bảo trang web được truy cập qua HTTPS.';
    case 'AbortError':
      return 'Quá trình truy cập camera bị hủy bỏ.';
    case 'TypeError':
      return 'Lỗi cấu hình camera. Refresh trang và thử lại.';
    default:
      if (error.message && error.message.includes('cameraIdOrConfig')) {
        return 'Lỗi cấu hình camera. Refresh trang và thử lại.';
      }
      return `Lỗi camera: ${error.message || 'Không xác định'}`;
  }
};

export const getCameraDevices = async (): Promise<MediaDeviceInfo[]> => {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('Error getting camera devices:', error);
    return [];
  }
};

export const getBrowserInfo = (): {
  name: string;
  isSupported: boolean;
  recommendation?: string;
} => {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (userAgent.includes('chrome')) {
    return { name: 'Chrome', isSupported: true };
  } else if (userAgent.includes('safari') && !userAgent.includes('chrome')) {
    return { name: 'Safari', isSupported: true };
  } else if (userAgent.includes('firefox')) {
    return { 
      name: 'Firefox', 
      isSupported: true,
      recommendation: 'Chrome hoặc Safari được khuyến nghị cho hiệu suất tốt hơn'
    };
  } else if (userAgent.includes('edge')) {
    return { 
      name: 'Edge', 
      isSupported: true,
      recommendation: 'Chrome được khuyến nghị cho hiệu suất tốt hơt'
    };
  } else {
    return { 
      name: 'Unknown', 
      isSupported: false,
      recommendation: 'Vui lòng sử dụng Chrome hoặc Safari'
    };
  }
};
