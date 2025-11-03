# Hệ Thống Phân Quyền - Hướng Dẫn Implementation

## 📋 Tổng Quan

Hệ thống phân quyền mới cho phép Admin quản lý chi tiết quyền của từng user:

### **Các Loại Quyền:**
1. ✅ **Xem Kho Hàng** (`can_view_inventory`)
2. ➕ **Nhập Hàng** (`can_add_items`) - Không được xóa
3. 🔄 **Luân Chuyển** (`can_move_items`)
4. 💰 **Bán Hàng** (`can_sell_items`)
5. 🔓 **Toàn Quyền** (`is_full_access`) - Tất cả trừ quản lý user
6. 👑 **Admin** (`is_admin`) - Toàn bộ quyền

### **Tính Năng Báo Cáo Lỗi:**
- User nhập sai có thể báo cáo cho Admin
- Admin xem và xử lý báo cáo
- Chỉ Admin mới có quyền xóa/sửa sản phẩm

---

## 🗄️ Database Schema

### Migration Đã Tạo:
`supabase/migrations/20251103000000_add_permissions_system.sql`

**Thêm vào `users` table:**
- `can_view_inventory` BOOLEAN DEFAULT true
- `can_add_items` BOOLEAN DEFAULT false
- `can_move_items` BOOLEAN DEFAULT false
- `can_sell_items` BOOLEAN DEFAULT false
- `is_full_access` BOOLEAN DEFAULT false
- `is_admin` BOOLEAN DEFAULT false
- `is_active` BOOLEAN DEFAULT true

**Bảng mới `error_reports`:**
```sql
CREATE TABLE error_reports (
  id UUID PRIMARY KEY,
  reported_by UUID REFERENCES users(id),
  item_serial TEXT,
  error_type TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMP,
  resolved_at TIMESTAMP,
  resolved_by UUID REFERENCES users(id),
  resolution_notes TEXT
);
```

---

## 📁 Files Đã Tạo

### 1. **Permission Types & Utilities**
`src/lib/permissions.ts`
- Interface `User` với đầy đủ permissions
- Interface `ErrorReport`
- Class `PermissionChecker` với methods:
  - `canViewInventory()`
  - `canAddItems()`
  - `canMoveItems()`
  - `canSellItems()`
  - `hasFullAccess()`
  - `isAdmin()`
  - `canManageUsers()`
  - `canDeleteItems()`
- Permission presets cho các vai trò:
  - `VIEWER` - Chỉ xem
  - `STOCK_CLERK` - Nhân viên kho
  - `WAREHOUSE_MANAGER` - Quản lý kho
  - `SALES_STAFF` - Nhân viên bán hàng
  - `FULL_ACCESS` - Toàn quyền
  - `ADMIN` - Quản trị viên

### 2. **Auth Context Updated**
`src/contexts/AuthContext.tsx`
- Thêm `permissions: PermissionChecker`
- Thêm `refreshUser()` function
- Load đầy đủ user data với permissions

### 3. **Report Error Dialog**
`src/components/ReportErrorDialog.tsx`
- Form báo cáo lỗi cho Admin
- Các loại lỗi: Sai tên, sai serial, sai giá, sai vị trí, sai tình trạng
- Gửi vào bảng `error_reports`

---

## 🚀 Các Bước Cần Làm Tiếp

### **BƯỚC 1: Chạy Migration**
```bash
# Trong Supabase Dashboard hoặc CLI
supabase db reset
# hoặc
supabase migration up
```

### **BƯỚC 2: Tạo Trang User Management**

Tạo file `src/pages/UserManagement.tsx`:
```tsx
- Hiển thị danh sách users
- Form thêm user mới
- Checkbox cho từng quyền
- Preset buttons (Viewer, Stock Clerk, etc.)
- Activate/Deactivate users
- CHỈ Admin mới truy cập được
```

### **BƯỚC 3: Tạo Trang Error Reports**

Tạo file `src/pages/ErrorReports.tsx`:
```tsx
- Danh sách báo cáo lỗi
- Filter: PENDING, RESOLVED, DISMISSED
- Admin có thể:
  - Xem chi tiết
  - Đánh dấu đã xử lý
  - Thêm ghi chú giải quyết
  - Xóa sản phẩm nếu cần
```

### **BƯỚC 4: Update Components với Permission Checks**

#### **Inventory.tsx:**
```tsx
const { permissions } = useAuth();

// Hide "Thêm Sản Phẩm" nếu không có quyền
{permissions.canAddItems() && (
  <Button onClick={() => setAddDialogOpen(true)}>
    Thêm Sản Phẩm
  </Button>
)}

// Hide "Bán Hàng" nếu không có quyền
{permissions.canSellItems() && item.status === 'AVAILABLE' && (
  <Button onClick={() => handleSellClick(item.serial_number)}>
    Bán Hàng
  </Button>
)}

// Thêm nút "Báo Cáo Lỗi"
{permissions.canReportErrors() && (
  <Button onClick={() => handleReportError(item)}>
    ⚠️ Báo Lỗi
  </Button>
)}
```

#### **MoveItem.tsx:**
```tsx
// Redirect nếu không có quyền
useEffect(() => {
  if (!permissions.canMoveItems()) {
    navigate('/inventory');
    toast({ title: 'Bạn không có quyền luân chuyển hàng' });
  }
}, [permissions]);
```

#### **Layout.tsx:**
```tsx
// Hide menu items dựa trên permissions
{permissions.canViewInventory() && (
  <Link to="/inventory">Kho Hàng</Link>
)}

{permissions.canMoveItems() && (
  <Link to="/move">Luân Chuyển</Link>
)}

{permissions.canManageUsers() && (
  <Link to="/users">Quản Lý Users</Link>
)}

{permissions.canViewReports() && (
  <Link to="/reports">Báo Cáo Lỗi</Link>
)}
```

#### **Dashboard.tsx:**
```tsx
// Dashboard có thể xem nếu có bất kỳ quyền nào
useEffect(() => {
  if (!permissions.canViewInventory()) {
    navigate('/login');
  }
}, [permissions]);
```

### **BƯỚC 5: Update Routes**

`src/App.tsx`:
```tsx
<Route path="/users" element={
  <ProtectedRoute requiredPermission="canManageUsers">
    <UserManagement />
  </ProtectedRoute>
} />

<Route path="/reports" element={
  <ProtectedRoute requiredPermission="canViewReports">
    <ErrorReports />
  </ProtectedRoute>
} />
```

Update `ProtectedRoute.tsx`:
```tsx
interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: keyof PermissionChecker;
}

// Check permission và redirect nếu không đủ quyền
```

### **BƯỚC 6: Update Edge Function**

`supabase/functions/auth-login/index.ts`:
```typescript
// Đảm bảo return đầy đủ user data với permissions
const { data: user, error } = await supabaseClient
  .from('users')
  .select('*') // Lấy tất cả columns bao gồm permissions
  .eq('email', email)
  .single();
```

---

## 🎨 UI/UX Considerations

### **Badge Quyền:**
```tsx
<Badge className="bg-blue-100">👁️ Xem</Badge>
<Badge className="bg-green-100">➕ Nhập</Badge>
<Badge className="bg-purple-100">🔄 Luân Chuyển</Badge>
<Badge className="bg-orange-100">💰 Bán</Badge>
<Badge className="bg-red-100">🔓 Toàn Quyền</Badge>
<Badge className="bg-gray-900">👑 Admin</Badge>
```

### **Permission Presets UI:**
```tsx
<div className="grid grid-cols-2 gap-2">
  <Button onClick={() => applyPreset('VIEWER')}>
    Chỉ Xem
  </Button>
  <Button onClick={() => applyPreset('STOCK_CLERK')}>
    Nhân Viên Kho
  </Button>
  <Button onClick={() => applyPreset('WAREHOUSE_MANAGER')}>
    Quản Lý Kho
  </Button>
  <Button onClick={() => applyPreset('SALES_STAFF')}>
    Nhân Viên Bán
  </Button>
  <Button onClick={() => applyPreset('FULL_ACCESS')}>
    Toàn Quyền
  </Button>
</div>
```

---

## 🔒 Security Best Practices

1. **Backend Validation:**
   - RLS policies đã được setup
   - Mọi operation đều check permissions ở database level

2. **Frontend Validation:**
   - Hide UI elements user không có quyền
   - Redirect nếu access route không được phép
   - Show friendly error messages

3. **Audit Trail:**
   - `error_reports` table track ai báo cáo gì
   - `stock_move_logs` track ai di chuyển hàng
   - Có thể thêm bảng `audit_logs` cho toàn bộ actions

---

## 📊 Testing Scenarios

### **Test Case 1: Viewer Role**
- ✅ Xem được danh sách hàng
- ❌ Không thấy nút "Thêm Sản Phẩm"
- ❌ Không thấy nút "Bán Hàng"
- ❌ Không vào được trang "Luân Chuyển"
- ✅ Thấy nút "Báo Cáo Lỗi"

### **Test Case 2: Stock Clerk**
- ✅ Xem được danh sách hàng
- ✅ Thêm được sản phẩm
- ❌ Không xóa được sản phẩm
- ❌ Không bán được hàng
- ✅ Báo cáo được lỗi

### **Test Case 3: Full Access**
- ✅ Làm được tất cả
- ❌ Không quản lý được users
- ✅ Xem được báo cáo lỗi

### **Test Case 4: Admin**
- ✅ Làm được tất cả
- ✅ Quản lý được users
- ✅ Xem và xử lý báo cáo
- ✅ Xóa được sản phẩm

---

## 🐛 Troubleshooting

### **Lỗi: User không có permissions sau khi login**
→ Check migration đã chạy chưa
→ Check edge function có return đầy đủ data không

### **Lỗi: Cannot read property của permissions**
→ Check PermissionChecker có được init trong AuthContext không
→ Check user data có đầy đủ permission fields không

### **Lỗi: RLS blocking queries**
→ Check RLS policies trong migration
→ Ensure user authenticated đúng cách

---

## 📞 Support

Nếu có vấn đề, check:
1. Browser console logs
2. Supabase logs
3. Network tab (xem API responses)
4. Permission checker methods

---

**Status:** 
- ✅ Database schema
- ✅ Types & utilities
- ✅ Auth context
- ✅ Report dialog
- ⏳ User management page (cần tạo)
- ⏳ Error reports page (cần tạo)
- ⏳ Update components (cần implement)
- ⏳ Routes & protected routes (cần update)

