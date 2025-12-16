# 🔒 Hướng Dẫn Kích Hoạt HTTPS & Sửa Lỗi Camera

## 🚨 Nguyên Nhân Lỗi
Bạn gặp lỗi "Browser không hỗ trợ camera" hoặc "Không thể khởi động camera" vì:
- Bạn truy cập qua địa chỉ IP mạng LAN (ví dụ `192.168.1.5:8080`)
- Giao thức đang dùng là **HTTP**
- Các trình duyệt (Safari, Chrome, v.v.) **CHẶN HOÀN TOÀN** camera trên HTTP (trừ localhost).

## ✅ Giải Pháp Đã Áp Dụng
Tôi đã bật chế độ **HTTPS** cho dự án.

## 📝 Hướng Dẫn Sử Dụng Mới

### 1. Khởi động lại Server
Tắt server hiện tại và chạy lại:
```bash
npm run dev
```

### 2. Truy cập địa chỉ HTTPS
Nhìn vào terminal, bạn sẽ thấy địa chỉ mới dạng:
```
➜  Local:   https://localhost:8080/
➜  Network: https://192.168.x.x:8080/  <-- Dùng link này trên điện thoại
```
⚠️ **LƯU Ý QUAN TRỌNG:**
- Phải dùng **https://** (không phải http://)
- Khi truy cập, trình duyệt sẽ báo "Kết nối không riêng tư" (Connection is not private) hoặc "Not Secure".
- Đây là bình thường vì chúng ta dùng chứng chỉ tự ký (Self-signed certificate) cho môi trường dev.

### 3. Vượt qua màn hình cảnh báo
- **Chrome/Android**: Nhấn "Nâng cao" (Advanced) -> Chọn "Tiếp tục truy cập..." (Proceed to...)
- **Safari/iOS**: Nhấn "Show Details" -> "visit this website" -> "Visit Website"

### 4. Cấp quyền Camera
Sau khi vào được web qua HTTPS:
- Vào chức năng Quét Nhanh
- Nhấn nút cài đặt ⚙️
- Trình duyệt sẽ hỏi quyền Camera -> Chọn "Cho phép" (Allow)

## 📱 Troubleshooting

### Vẫn không vào được?
- Đảm bảo điện thoại và máy tính cùng mạng Wifi
- Tắt tường lửa (Firewall) trên máy tính nếu không kết nối được
- Thử mở port 8080 trên Windows Firewall

### Camera vẫn đen ngòm?
- Thử refresh lại trang sau khi cấp quyền
- Kiểm tra xem có ứng dụng nào khác đang chiếm camera không

