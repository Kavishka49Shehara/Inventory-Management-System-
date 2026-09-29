export type UserRole = 'ADMINISTRATOR' | 'STOREKEEPER' | 'EMPLOYEE';

export interface Employee {
  id: string;
  employee_id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  barcode_id: string;
  department: string;
  position: string;
  authorization_status: 'Authorized' | 'Unauthorized';
  contact: string;
  registered_at: string;
}

export interface Product {
  id: string;
  product_id: string;
  barcode: string;
  product_name: string;
  category: 'Mechanical' | 'Electrical' | 'Other';
  subcategory?: string;
  description: string;
  quantity: number;
  minimum_stock: number;
  rack_location: string;
  sorting_bin: 'Bin 1' | 'Bin 2' | 'Bin 3';
  status: 'Available' | 'Low Stock' | 'Out of Stock';
}

export type RequestStatus =
  | 'Pending'
  | 'Defective Item Received'
  | 'Sorting'
  | 'Awaiting Storekeeper'
  | 'Approved'
  | 'Delivering'
  | 'Completed'
  | 'Rejected';

export interface PartRequest {
  id: string;
  request_id: string;
  employee_id: string;
  employee_name: string;
  department: string;
  defective_product_id: string;
  defective_product_name: string;
  replacement_product_id: string;
  replacement_product_name: string;
  rack_location: string;
  sorting_bin: 'Bin 1' | 'Bin 2' | 'Bin 3';
  status: RequestStatus;
  request_time: string;
  completion_time?: string;
}

export interface Transaction {
  id: string;
  transaction_id: string;
  request_id: string;
  employee_id: string;
  employee_name: string;
  defective_product: string;
  replacement_product: string;
  quantity: number;
  rack_location: string;
  sorting_bin: 'Bin 1' | 'Bin 2' | 'Bin 3';
  storekeeper_id: string;
  date: string;
  time: string;
  status: 'Completed' | 'Rejected';
}

export type ConveyorStatus =
  | 'IDLE'
  | 'RECEIVING DEFECTIVE ITEM'
  | 'SORTING'
  | 'WAITING FOR STOREKEEPER'
  | 'DELIVERING REPLACEMENT'
  | 'COMPLETED'
  | 'ERROR';

export interface DeviceStatus {
  id: string;
  device_name: 'ESP32-C3' | 'ESP32-S3';
  device_status: 'Online' | 'Offline';
  last_connection: string;
  conveyor_status: ConveyorStatus;
  sensor_status: string;
}

export interface ESP32CommandLog {
  id: string;
  timestamp: string;
  device: 'ESP32-C3' | 'ESP32-S3';
  type: 'RECEIVED' | 'SENT';
  payload: any;
}

export interface ActiveOperation {
  id: string;
  type: 'MECHANIC_DEFECT_INTAKE' | 'STOREKEEPER_DISPENSE' | 'STANDBY';
  started_at: number;
  duration_ms: number;
  direction: 'FORWARD' | 'REVERSE' | 'STOP';
  gate: number;
  gate_motor_type: 'JGB_DC' | 'NONE';
  gate_open_ms: number;
  gate_return_ms: number;
  target_angle_deg: number;
  product_id: string;
  product_name: string;
  rack_location: string;
  sorting_bin: string;
  mechanic_name?: string;
  conveyor_running: boolean;
  conveyor_remaining_sec: number;
  conveyor_remaining_ms: number;
  elapsed_ms: number;
  gate_angle: number;
  gate_status: string;
  storekeeper_alert: {
    active: boolean;
    required_part_id: string;
    required_part_name: string;
    required_rack: string;
    sorting_bin: string;
    message: string;
    request_id?: string;
    timestamp: string;
  } | null;
}
