// Permission System Types and Utilities

export interface UserPermissions {
  can_view_inventory: boolean;
  can_add_items: boolean;
  can_move_items: boolean;
  can_sell_items: boolean;
  is_full_access: boolean;
  is_admin: boolean;
}

export interface User {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_active: boolean;
  can_view_inventory: boolean;
  can_add_items: boolean;
  can_move_items: boolean;
  can_sell_items: boolean;
  is_full_access: boolean;
  is_admin: boolean;
}

export interface ErrorReport {
  id: string;
  reported_by: string;
  item_serial: string | null;
  error_type: string;
  description: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
  resolution_notes: string | null;
}

export const ERROR_TYPES = {
  WRONG_PRODUCT: 'WRONG_PRODUCT',
  WRONG_SERIAL: 'WRONG_SERIAL',
  WRONG_TAG: 'WRONG_TAG',
  NOT_IN_STOCK: 'NOT_IN_STOCK',
  ALREADY_SOLD: 'ALREADY_SOLD',
  WRONG_PRICE: 'WRONG_PRICE',
  WRONG_LOCATION: 'WRONG_LOCATION',
  WRONG_CONDITION: 'WRONG_CONDITION',
  DELETE_REQUEST: 'DELETE_REQUEST',
  OTHER: 'OTHER'
} as const;

export const ERROR_TYPE_LABELS: Record<string, string> = {
  WRONG_PRODUCT: 'Sai Tên Sản Phẩm',
  WRONG_SERIAL: 'Sai Serial/Service Tag',
  WRONG_TAG: '🏷️ Sai Tag (Mã vạch không khớp)',
  NOT_IN_STOCK: '📦 Không Có Hàng (Nhưng hệ thống vẫn hiển thị)',
  ALREADY_SOLD: '💰 Đã Bán Rồi (Chưa đánh dấu bán)',
  WRONG_PRICE: 'Sai Giá Vốn',
  WRONG_LOCATION: 'Sai Vị Trí',
  WRONG_CONDITION: 'Sai Tình Trạng',
  DELETE_REQUEST: 'Yêu Cầu Xóa Sản Phẩm',
  OTHER: 'Lỗi Khác'
};

export const REPORT_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ Xử Lý',
  RESOLVED: 'Đã Giải Quyết',
  DISMISSED: 'Đã Bỏ Qua'
};

// Permission checker utilities
export class PermissionChecker {
  private user: User | null;

  constructor(user: User | null) {
    this.user = user;
  }

  canViewInventory(): boolean {
    return this.user?.can_view_inventory || false;
  }

  canAddItems(): boolean {
    return this.user?.can_add_items || this.user?.is_full_access || this.user?.is_admin || false;
  }

  canMoveItems(): boolean {
    return this.user?.can_move_items || this.user?.is_full_access || this.user?.is_admin || false;
  }

  canSellItems(): boolean {
    return this.user?.can_sell_items || this.user?.is_full_access || this.user?.is_admin || false;
  }

  hasFullAccess(): boolean {
    return this.user?.is_full_access || this.user?.is_admin || false;
  }

  isAdmin(): boolean {
    return this.user?.is_admin || false;
  }

  canManageUsers(): boolean {
    return this.user?.is_admin || false;
  }

  canDeleteItems(): boolean {
    // Only admins can delete
    return this.user?.is_admin || false;
  }

  canEditItems(): boolean {
    // Anyone authenticated can edit items (but not delete)
    return this.user !== null;
  }

  canReportErrors(): boolean {
    // Anyone authenticated can report errors
    return this.user !== null;
  }

  canViewReports(): boolean {
    // Admins and full access can view all reports
    return this.user?.is_admin || this.user?.is_full_access || false;
  }
}

// Permission preset templates
export const PERMISSION_PRESETS = {
  VIEWER: {
    name: 'Chỉ Xem',
    description: 'Chỉ có thể xem danh sách hàng tồn kho',
    permissions: {
      can_view_inventory: true,
      can_add_items: false,
      can_move_items: false,
      can_sell_items: false,
      is_full_access: false,
      is_admin: false
    }
  },
  STOCK_CLERK: {
    name: 'Nhân Viên Kho',
    description: 'Xem và nhập hàng vào kho',
    permissions: {
      can_view_inventory: true,
      can_add_items: true,
      can_move_items: false,
      can_sell_items: false,
      is_full_access: false,
      is_admin: false
    }
  },
  WAREHOUSE_MANAGER: {
    name: 'Quản Lý Kho',
    description: 'Xem, nhập hàng và luân chuyển giữa các kho',
    permissions: {
      can_view_inventory: true,
      can_add_items: true,
      can_move_items: true,
      can_sell_items: false,
      is_full_access: false,
      is_admin: false
    }
  },
  SALES_STAFF: {
    name: 'Nhân Viên Bán Hàng',
    description: 'Xem, bán hàng và nhập lại hàng trả',
    permissions: {
      can_view_inventory: true,
      can_add_items: false,
      can_move_items: false,
      can_sell_items: true,
      is_full_access: false,
      is_admin: false
    }
  },
  FULL_ACCESS: {
    name: 'Toàn Quyền',
    description: 'Toàn bộ quyền quản lý kho (trừ quản lý user)',
    permissions: {
      can_view_inventory: true,
      can_add_items: true,
      can_move_items: true,
      can_sell_items: true,
      is_full_access: true,
      is_admin: false
    }
  },
  ADMIN: {
    name: 'Admin',
    description: 'Toàn bộ quyền bao gồm quản lý users',
    permissions: {
      can_view_inventory: true,
      can_add_items: true,
      can_move_items: true,
      can_sell_items: true,
      is_full_access: true,
      is_admin: true
    }
  }
};

export type PermissionPresetKey = keyof typeof PERMISSION_PRESETS;

