# ✅ Test Checklist - Mobile Improvements

## 🎥 Camera Scanner (Quét Nhanh)

### Pre-test Setup
- [ ] Mở app trên mobile device hoặc Chrome DevTools (F12 → Toggle device toolbar)
- [ ] Đảm bảo đang dùng HTTPS hoặc localhost
- [ ] Chuẩn bị một vài mã vạch để test (in ra hoặc hiển thị trên màn hình khác)

### Test Cases

#### 1. Kiểm Tra Quyền Camera
- [ ] Vào trang "Quét Nhanh" (/quick-scan)
- [ ] Nhấn nút Settings (⚙️) để test quyền camera
- [ ] **Expected**: Hiển thị popup xin quyền camera
- [ ] Cho phép quyền camera
- [ ] **Expected**: Toast "✅ Camera Hoạt Động Tốt"

#### 2. Khởi Động Camera
- [ ] Nhấn nút "🎯 Bắt Đầu Quét"
- [ ] **Expected**: 
  - Loading spinner hiển thị
  - Camera khởi động thành công
  - Xuất hiện khung quét màu xanh với animation
  - Đường quét di chuyển từ trên xuống
  - 4 góc khung có animation pulse

#### 3. Quét Mã Vạch
- [ ] Đưa mã vạch vào khung xanh
- [ ] **Expected**:
  - Phát âm thanh "beep" (800Hz)
  - Điện thoại rung (nếu hỗ trợ)
  - Hiển thị "✅ Đã quét: [mã]" ở trên cùng
  - Toast "✅ Quét Thành Công"
  - Thông tin sản phẩm hiển thị bên dưới

#### 4. Đèn Flash (nếu hỗ trợ)
- [ ] Kiểm tra có nút đèn flash ở góc trên phải không
- [ ] Nhấn nút đèn flash
- [ ] **Expected**: 
  - Đèn bật (nút chuyển màu vàng)
  - Icon đổi từ Zap → ZapOff
- [ ] Nhấn lại để tắt
- [ ] **Expected**: Đèn tắt (nút chuyển về màu tối)

#### 5. Dừng Quét
- [ ] Nhấn nút "⏹️ Dừng Quét"
- [ ] **Expected**:
  - Camera dừng
  - Khung quét biến mất
  - Đèn flash tự động tắt (nếu đang bật)
  - Nút đổi về "🎯 Bắt Đầu Quét"

#### 6. Test Lỗi
- [ ] Từ chối quyền camera
- [ ] **Expected**: Hiển thị lỗi "Quyền truy cập camera bị từ chối..."
- [ ] Mở camera trong app khác
- [ ] Thử khởi động camera trong app
- [ ] **Expected**: Lỗi "Camera đang được sử dụng..."

#### 7. Test Các Loại Mã Vạch
- [ ] Test CODE_128
- [ ] Test CODE_39
- [ ] Test EAN_13
- [ ] Test UPC_A
- [ ] Test UPC_E
- [ ] Test EAN_8
- [ ] **Expected**: Tất cả đều quét được

---

## 📱 Mobile Navigation (Bottom Bar)

### Pre-test Setup
- [ ] Login với các user có quyền khác nhau để test
- [ ] Test trên mobile device hoặc Chrome DevTools

### Test Cases

#### 1. Layout với Ít Items (≤5)
- [ ] Login với user có ít quyền (chỉ view)
- [ ] **Expected**:
  - Tất cả items hiển thị đều nhau
  - Không có scroll
  - Mỗi item chiếm width bằng nhau

#### 2. Layout với Nhiều Items (>5)
- [ ] Login với Admin hoặc Full Access user
- [ ] **Expected**:
  - Items có thể scroll ngang
  - Gradient fade xuất hiện ở 2 bên
  - Mỗi item rộng ~80px

#### 3. Swipe Gesture
- [ ] Vuốt trái để xem items bên phải
- [ ] **Expected**: Scroll mượt mà, không giật
- [ ] Vuốt phải để quay lại
- [ ] **Expected**: Scroll về items bên trái
- [ ] Vuốt nhanh và thả
- [ ] **Expected**: Snap to nearest item

#### 4. Active State
- [ ] Nhấn vào "Tổng Quan"
- [ ] **Expected**: 
  - Item "Tổng Quan" highlight (gradient blue)
  - Có chấm trắng ở trên
  - Text màu trắng
- [ ] Chuyển sang "Kho Hàng"
- [ ] **Expected**: Active state chuyển sang "Kho Hàng"

#### 5. Badge Notification
- [ ] Tạo error report (nếu có quyền)
- [ ] Kiểm tra tab "Báo Cáo"
- [ ] **Expected**: 
  - Badge đỏ hiển thị số lượng pending reports
  - Badge có animation pulse
  - Badge ở góc trên phải của icon

#### 6. Responsive
- [ ] Xoay điện thoại ngang
- [ ] **Expected**: Navigation vẫn hoạt động tốt
- [ ] Xoay dọc lại
- [ ] **Expected**: Layout tự động điều chỉnh

#### 7. Touch Target
- [ ] Nhấn vào các items
- [ ] **Expected**: 
  - Dễ nhấn (min 44x44px)
  - Có feedback animation (scale)
  - Navigation hoạt động đúng

---

## 🖥️ Desktop Navigation

### Test Cases

#### 1. Scroll với Nhiều Items
- [ ] Login với Admin
- [ ] Resize browser về width nhỏ (~800px)
- [ ] **Expected**: 
  - Menu items có thể scroll ngang
  - Scrollbar ẩn
  - Logo không bị scroll (fixed)

#### 2. Hover Effects
- [ ] Hover vào các menu items
- [ ] **Expected**: Background color thay đổi
- [ ] Hover vào logo
- [ ] **Expected**: Scale animation (1.05)

---

## 🔧 Browser Compatibility

### Chrome (Desktop & Mobile)
- [ ] Camera hoạt động
- [ ] Navigation hoạt động
- [ ] Animations mượt

### Safari (iOS)
- [ ] Camera hoạt động (có thể cần Settings → Safari → Camera)
- [ ] Navigation hoạt động
- [ ] Touch gestures hoạt động

### Edge
- [ ] Camera hoạt động
- [ ] Navigation hoạt động

### Firefox
- [ ] Camera hoạt động
- [ ] Navigation hoạt động

---

## 📊 Performance

### Camera
- [ ] FPS ổn định (~25fps)
- [ ] Không lag khi quét
- [ ] Memory không tăng quá nhiều
- [ ] Battery drain chấp nhận được

### Navigation
- [ ] Scroll mượt (60fps)
- [ ] Không jank khi swipe
- [ ] Animation không giật

---

## 🐛 Known Issues & Workarounds

### Camera không khởi động
1. Kiểm tra HTTPS
2. Clear cache & reload
3. Thử browser khác
4. Restart device

### Navigation không scroll
1. Kiểm tra có >5 items
2. Clear cache
3. Disable browser extensions

---

## ✅ Sign Off

**Tested by**: _______________  
**Date**: _______________  
**Device**: _______________  
**Browser**: _______________  
**Version**: _______________  

**Overall Status**: 
- [ ] ✅ All tests passed
- [ ] ⚠️ Some issues found (document below)
- [ ] ❌ Major issues found (document below)

**Notes**:
```
[Add any additional notes here]
```

