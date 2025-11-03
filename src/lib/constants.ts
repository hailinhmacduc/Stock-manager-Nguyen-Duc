// Inventory Management Constants

export const INVENTORY_STATUS = {
  AVAILABLE: 'AVAILABLE',
  SOLD: 'SOLD',
  HOLD: 'HOLD',
  DEFECT: 'DEFECT'
} as const;

export const INVENTORY_CONDITION = {
  NEW_BOX: 'NEW_BOX',
  OPEN_BOX: 'OPEN_BOX', 
  USED: 'USED',
  REPAIRING: 'REPAIRING',
  // Backward compatibility
  NEW_SEAL: 'NEW_SEAL'
} as const;

export const INVENTORY_LOCATION = {
  DISPLAY_T1: 'DISPLAY_T1',
  STORAGE_T1: 'STORAGE_T1', 
  WAREHOUSE_T3: 'WAREHOUSE_T3'
} as const;

export type InventoryStatus = keyof typeof INVENTORY_STATUS;
export type InventoryCondition = keyof typeof INVENTORY_CONDITION;
export type InventoryLocation = keyof typeof INVENTORY_LOCATION;

// Validation functions
export const isValidStatus = (status: string): status is InventoryStatus => {
  return Object.values(INVENTORY_STATUS).includes(status as InventoryStatus);
};

export const isValidCondition = (condition: string): condition is InventoryCondition => {
  return Object.values(INVENTORY_CONDITION).includes(condition as InventoryCondition);
};

export const isValidLocation = (location: string): location is InventoryLocation => {
  return Object.values(INVENTORY_LOCATION).includes(location as InventoryLocation);
};

// Display names
export const getStatusDisplayName = (status: string): string => {
  switch (status) {
    case 'AVAILABLE': return 'Sẵn Sàng';
    case 'SOLD': return 'Đã Bán';
    case 'HOLD': return 'Đang Giữ';
    case 'DEFECT': return 'Lỗi';
    default: return status;
  }
};

export const getConditionDisplayName = (condition: string): string => {
  switch (condition) {
    case 'NEW_BOX': return 'New Box';
    case 'OPEN_BOX': return 'Open Box';
    case 'USED': return 'Máy Cũ';
    case 'REPAIRING': return 'Đang Sửa/Đóng Lại';
    // Backward compatibility
    case 'NEW_SEAL': return 'New Box';
    case 'DEFECT': return 'Đang Sửa/Đóng Lại';
    default: return condition;
  }
};

export const getLocationDisplayName = (location: string): string => {
  switch (location) {
    case 'DISPLAY_T1': return 'Kệ Trưng Bày T1';
    case 'STORAGE_T1': return 'Tủ Chứa T1';
    case 'WAREHOUSE_T3': return 'Kho T3';
    default: return location;
  }
};
