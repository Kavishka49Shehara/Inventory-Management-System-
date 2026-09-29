import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  terminate,
  setLogLevel
} from 'firebase/firestore';
import { 
  Employee, 
  Product, 
  PartRequest, 
  Transaction, 
  DeviceStatus, 
  ConveyorStatus, 
  RequestStatus,
  ESP32CommandLog,
  UserRole
} from './src/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// Path to the local JSON database
const DB_FILE = path.join(process.cwd(), 'db.json');

// Firebase Configuration (Matching user specifications)
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || "AIzaSyB2uHD8W6ocMWNI1KVUU_w7AWQSt0SFn8M",
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || "inventory-new-e4b8c.firebaseapp.com",
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || "inventory-new-e4b8c",
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || "inventory-new-e4b8c.firebasestorage.app",
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "1040875350784",
  appId: process.env.VITE_FIREBASE_APP_ID || "1:1040875350784:web:71f9f9bec1e93d8a96a1e5",
  measurementId: process.env.VITE_FIREBASE_MEASUREMENT_ID || "G-4C0C771QV8"
};

// Silence background SDK stream retry logs if Cloud Firestore API is not provisioned
try {
  setLogLevel('silent');
} catch (_) {}

let firebaseInitialized = false;
let firestoreDb: any = null;
let useFirestore = false;

// Initial seed data
const initialEmployees: Employee[] = [
  {
    id: 'emp-1',
    employee_id: 'EMP001',
    name: 'Anjana',
    username: 'Anjana SE',
    password: '1111',
    role: 'EMPLOYEE',
    barcode_id: 'EMP001',
    department: 'System Engineering',
    position: 'System Engineer',
    authorization_status: 'Authorized',
    contact: '+1 (555) 100-1111',
    registered_at: '2026-01-10T08:00:00Z'
  },
  {
    id: 'emp-2',
    employee_id: 'EMP002',
    name: 'Thisraka',
    username: 'Thisraka M',
    password: '2222',
    role: 'EMPLOYEE',
    barcode_id: 'EMP002',
    department: 'Maintenance',
    position: 'Maintenance Engineer',
    authorization_status: 'Authorized',
    contact: '+1 (555) 200-2222',
    registered_at: '2026-02-15T09:30:00Z'
  },
  {
    id: 'emp-3',
    employee_id: 'EMP003',
    name: 'Nikini',
    username: 'Nikini O',
    password: '3333',
    role: 'EMPLOYEE',
    barcode_id: 'EMP003',
    department: 'Operations',
    position: 'Operations Officer',
    authorization_status: 'Authorized',
    contact: '+1 (555) 300-3333',
    registered_at: '2026-03-20T11:00:00Z'
  },
  {
    id: 'emp-4',
    employee_id: 'STK001',
    name: 'Inshaf',
    username: 'SK inshaf',
    password: '4444',
    role: 'STOREKEEPER',
    barcode_id: 'STK001',
    department: 'Storekeeping',
    position: 'Head Storekeeper',
    authorization_status: 'Authorized',
    contact: '+1 (555) 400-4444',
    registered_at: '2026-04-01T08:00:00Z'
  },
  {
    id: 'emp-5',
    employee_id: 'ADM001',
    name: 'Kavishka',
    username: 'Adm Kavishka',
    password: '1234',
    role: 'ADMINISTRATOR',
    barcode_id: 'ADM001',
    department: 'System Administration',
    position: 'System Administrator',
    authorization_status: 'Authorized',
    contact: '+1 (555) 500-1234',
    registered_at: '2026-05-01T08:00:00Z'
  }
];

const initialProducts: Product[] = [
  {
    id: 'prod-1',
    product_id: 'SP001',
    barcode: 'SP001',
    product_name: 'Bearing',
    category: 'Mechanical',
    subcategory: 'Bearings',
    description: 'Precision deep groove ball bearing assembly for conveyor rollers and shafts (Gate 01 / Bin 01).',
    quantity: 32,
    minimum_stock: 5,
    rack_location: 'A1',
    sorting_bin: 'Bin 1',
    status: 'Available'
  },
  {
    id: 'prod-2',
    product_id: 'P-002',
    barcode: '890123456790',
    product_name: 'Coils & Shaft',
    category: 'Mechanical',
    subcategory: 'Coils & Shaft',
    description: 'Electromagnetic actuator coils and precision stainless drive shafts.',
    quantity: 15,
    minimum_stock: 4,
    rack_location: 'B2',
    sorting_bin: 'Bin 1',
    status: 'Available'
  },
  {
    id: 'prod-3',
    product_id: 'SP002',
    barcode: 'SP002',
    product_name: 'DC Motor',
    category: 'Electrical',
    subcategory: 'Motors',
    description: '24V High-Torque DC Geared Motor for automated sorting diverters and drive shafts (Gate 02 / Bin 02).',
    quantity: 12,
    minimum_stock: 3,
    rack_location: 'A2',
    sorting_bin: 'Bin 2',
    status: 'Available'
  },
  {
    id: 'prod-4',
    product_id: 'P-004',
    barcode: '890123456792',
    product_name: 'Drivers & Sensors',
    category: 'Electrical',
    subcategory: 'Drivers and Sensors',
    description: 'High-current motor controller driver boards, PWM modules, optical encoders, and photoelectric sensors.',
    quantity: 10,
    minimum_stock: 3,
    rack_location: 'E2',
    sorting_bin: 'Bin 2',
    status: 'Available'
  }
];

const initialDeviceStatus: DeviceStatus[] = [
  {
    id: 'dev-1',
    device_name: 'ESP32-C3',
    device_status: 'Online',
    last_connection: new Date().toISOString(),
    conveyor_status: 'IDLE',
    sensor_status: 'RFID Reader Active | Barcode Reader Ready'
  },
  {
    id: 'dev-2',
    device_name: 'ESP32-S3',
    device_status: 'Online',
    last_connection: new Date().toISOString(),
    conveyor_status: 'IDLE',
    sensor_status: 'IR1: Clear | IR2: Clear | Servo Sorter: Home (90°)'
  }
];

const initialRequests: PartRequest[] = [
  {
    id: 'req-1',
    request_id: 'REQ001',
    employee_id: 'EMP001',
    employee_name: 'Anjana',
    department: 'System Engineering',
    defective_product_id: 'P-001',
    defective_product_name: 'Bearings',
    replacement_product_id: 'P-001',
    replacement_product_name: 'Bearings',
    rack_location: 'B1',
    sorting_bin: 'Bin 1',
    status: 'Completed',
    request_time: '2026-07-15T09:30:00Z',
    completion_time: '2026-07-15T09:45:00Z'
  },
  {
    id: 'req-2',
    request_id: 'REQ002',
    employee_id: 'EMP002',
    employee_name: 'Thisraka',
    department: 'Maintenance',
    defective_product_id: 'P-003',
    defective_product_name: 'Motors',
    replacement_product_id: 'P-003',
    replacement_product_name: 'Motors',
    rack_location: 'E1',
    sorting_bin: 'Bin 2',
    status: 'Completed',
    request_time: '2026-07-15T14:10:00Z',
    completion_time: '2026-07-15T14:22:00Z'
  },
  {
    id: 'req-3',
    request_id: 'REQ003',
    employee_id: 'EMP001',
    employee_name: 'Anjana',
    department: 'System Engineering',
    defective_product_id: 'P-002',
    defective_product_name: 'Coils & Shaft',
    replacement_product_id: 'P-002',
    replacement_product_name: 'Coils & Shaft',
    rack_location: 'B2',
    sorting_bin: 'Bin 1',
    status: 'Completed',
    request_time: new Date(Date.now() - 30 * 60 * 1000).toISOString()
  }
];

const initialTransactions: Transaction[] = [
  {
    id: 'tx-1',
    transaction_id: 'TX001',
    request_id: 'REQ001',
    employee_id: 'EMP001',
    employee_name: 'Anjana',
    defective_product: 'Bearings',
    replacement_product: 'Bearings',
    quantity: 1,
    rack_location: 'B1',
    sorting_bin: 'Bin 1',
    storekeeper_id: 'STK001',
    date: '2026-07-15',
    time: '09:45:00',
    status: 'Completed'
  },
  {
    id: 'tx-2',
    transaction_id: 'TX002',
    request_id: 'REQ002',
    employee_id: 'EMP002',
    employee_name: 'Thisraka',
    defective_product: 'Motors',
    replacement_product: 'Motors',
    quantity: 1,
    rack_location: 'E1',
    sorting_bin: 'Bin 2',
    storekeeper_id: 'STK001',
    date: '2026-07-15',
    time: '14:22:00',
    status: 'Completed'
  }
];

interface DatabaseSchema {
  employees: Employee[];
  products: Product[];
  requests: PartRequest[];
  transactions: Transaction[];
  device_status: DeviceStatus[];
  esp_logs: ESP32CommandLog[];
}

// Database helper functions
let lastKnownDbState: DatabaseSchema | null = null;

function readDbLocal(): DatabaseSchema {
  if (!fs.existsSync(DB_FILE)) {
    const data: DatabaseSchema = {
      employees: initialEmployees,
      products: initialProducts,
      requests: initialRequests,
      transactions: initialTransactions,
      device_status: initialDeviceStatus,
      esp_logs: [
        {
          id: 'log-1',
          timestamp: new Date().toISOString(),
          device: 'ESP32-C3',
          type: 'RECEIVED',
          payload: { event: 'SYSTEM_BOOT', status: 'OK' }
        },
        {
          id: 'log-2',
          timestamp: new Date().toISOString(),
          device: 'ESP32-S3',
          type: 'RECEIVED',
          payload: { command: 'CONVEYOR_TEST', status: 'SUCCESS' }
        }
      ]
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return data;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch (err) {
    console.error('Error reading DB, re-seeding...', err);
    const data: DatabaseSchema = {
      employees: initialEmployees,
      products: initialProducts,
      requests: initialRequests,
      transactions: initialTransactions,
      device_status: initialDeviceStatus,
      esp_logs: []
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    return data;
  }
}

function writeDbLocal(data: DatabaseSchema) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function readDb(): DatabaseSchema {
  return readDbLocal();
}

// Robust product code resolver matching SP001 (Bearing) and SP002 (DC Motor) with aliases
function findProductByCode(products: Product[], rawCode: string): Product | null {
  if (!rawCode) return null;
  let code = String(rawCode).trim();
  try {
    const parsed = JSON.parse(code);
    if (parsed.barcode) code = parsed.barcode;
    else if (parsed.productId) code = parsed.productId;
    else if (parsed.product_id) code = parsed.product_id;
  } catch (_) {}

  const clean = code.trim().toLowerCase();

  // 1. Direct barcode / ID match
  const match = products.find(p => 
    p.barcode.toLowerCase() === clean ||
    p.product_id.toLowerCase() === clean ||
    p.id.toLowerCase() === clean ||
    p.product_name.toLowerCase() === clean
  );
  if (match) return match;

  // 2. Specific alias mapping for SP001 -> Bearing (Bin 1 / Gate 01)
  if (
    clean === 'sp001' || 
    clean === 'sp-001' || 
    clean === 'sp_001' || 
    clean === 'p-001' || 
    clean === '890123456789' || 
    clean.includes('bearing')
  ) {
    return products.find(p => 
      p.product_id === 'SP001' || 
      p.barcode === 'SP001' || 
      p.product_name.toLowerCase().includes('bearing')
    ) || null;
  }

  // 3. Specific alias mapping for SP002 -> DC Motor (Bin 2 / Gate 02)
  if (
    clean === 'sp002' || 
    clean === 'sp-002' || 
    clean === 'sp_002' || 
    clean === 'p-003' || 
    clean === '890123456791' || 
    clean.includes('motor')
  ) {
    return products.find(p => 
      p.product_id === 'SP002' || 
      p.barcode === 'SP002' || 
      p.product_name.toLowerCase().includes('motor')
    ) || null;
  }

  return null;
}

// Active Two-Way Operational State for ESP32 and Web UI
interface ActiveOperationState {
  id: string;
  type: 'MECHANIC_DEFECT_INTAKE' | 'STOREKEEPER_DISPENSE' | 'STANDBY';
  started_at: number;
  duration_ms: number; // 10000ms
  direction: 'FORWARD' | 'REVERSE' | 'STOP';
  gate: number; // 1 for SP001 Bearing, 2 for SP002 DC Motor, 0 for none
  gate_motor_type: 'JGB_DC' | 'NONE';
  gate_open_ms: number; // 1500ms for ~60 degrees
  gate_return_ms: number; // 1500ms return to initial position
  target_angle_deg: number; // 60
  product_id: string;
  product_name: string;
  rack_location: string;
  sorting_bin: string;
  mechanic_name?: string;
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

let activeOperation: ActiveOperationState = {
  id: 'op-init',
  type: 'STANDBY',
  started_at: 0,
  duration_ms: 0,
  direction: 'STOP',
  gate: 0,
  gate_motor_type: 'NONE',
  gate_open_ms: 1500,
  gate_return_ms: 1500,
  target_angle_deg: 0,
  product_id: '',
  product_name: '',
  rack_location: '',
  sorting_bin: '',
  storekeeper_alert: null
};

let conveyorTimeoutTimer: NodeJS.Timeout | null = null;

// Background sync differ
async function syncDiffToFirestore(newDb: DatabaseSchema, oldDb: DatabaseSchema) {
  if (!useFirestore || !firestoreDb) return;
  
  const collections: (keyof DatabaseSchema)[] = ['employees', 'products', 'requests', 'transactions', 'device_status', 'esp_logs'];
  
  for (const colName of collections) {
    const newList = newDb[colName] || [];
    const oldList = oldDb ? (oldDb[colName] || []) : [];
    
    // 1. Added or modified items
    for (const item of newList) {
      const oldItem = oldList.find((x: any) => x.id === item.id);
      if (!oldItem || JSON.stringify(item) !== JSON.stringify(oldItem)) {
        try {
          await setDoc(doc(firestoreDb, colName, item.id), item);
        } catch (err) {
          console.error(`Error syncing doc ${item.id} to Firestore collection ${colName}:`, err);
        }
      }
    }
    
    // 2. Deleted items (only for employees & products)
    if (colName === 'employees' || colName === 'products') {
      for (const oldItem of oldList) {
        const exists = newList.some((x: any) => x.id === oldItem.id);
        if (!exists) {
          try {
            await deleteDoc(doc(firestoreDb, colName, oldItem.id));
          } catch (err) {
            console.error(`Error deleting doc ${oldItem.id} from Firestore collection ${colName}:`, err);
          }
        }
      }
    }
  }
}

function writeDb(data: DatabaseSchema) {
  const oldDb = lastKnownDbState || readDbLocal();
  writeDbLocal(data);
  lastKnownDbState = JSON.parse(JSON.stringify(data));
  
  if (useFirestore) {
    syncDiffToFirestore(data, oldDb).catch(err => {
      console.error("Background Firestore difference sync failed:", err);
    });
  }
}

// Asynchronous Firestore Initializer
async function initializeFirestoreSync() {
  if (!firebaseConfig.projectId) return;
  let dbInstance: any = null;
  try {
    console.log(`Checking Cloud Firestore connection for project '${firebaseConfig.projectId}'...`);
    const firebaseApp = initializeApp(firebaseConfig);
    dbInstance = getFirestore(firebaseApp);
    
    const empSnap = await getDocs(collection(dbInstance, 'employees'));
    console.log(`Firestore connected successfully! Retrieved ${empSnap.size} employees.`);
    
    firestoreDb = dbInstance;
    useFirestore = true;
    firebaseInitialized = true;
    
    const localDb = readDbLocal();
    
    if (empSnap.empty) {
      console.log("Firestore collections are empty. Seeding Firestore with local db.json data...");
      const collections: (keyof DatabaseSchema)[] = ['employees', 'products', 'requests', 'transactions', 'device_status', 'esp_logs'];
      for (const colName of collections) {
        const items = localDb[colName] || [];
        for (const item of items) {
          await setDoc(doc(firestoreDb, colName, item.id), item);
        }
      }
      console.log("Firestore seeding completed successfully!");
    } else {
      console.log("Firestore contains existing data. Restoring local database from Firestore...");
      const [
        prodSnap,
        reqSnap,
        txSnap,
        devSnap,
        logSnap
      ] = await Promise.all([
        getDocs(collection(firestoreDb, 'products')),
        getDocs(collection(firestoreDb, 'requests')),
        getDocs(collection(firestoreDb, 'transactions')),
        getDocs(collection(firestoreDb, 'device_status')),
        getDocs(collection(firestoreDb, 'esp_logs'))
      ]);
      
      const employees = empSnap.docs.map(d => d.data() as Employee);
      const products = prodSnap.docs.map(d => d.data() as Product);
      const requests = reqSnap.docs.map(d => d.data() as PartRequest);
      const transactions = txSnap.docs.map(d => d.data() as Transaction);
      const device_status = devSnap.docs.map(d => d.data() as DeviceStatus);
      const esp_logs = logSnap.docs.map(d => d.data() as ESP32CommandLog);
      
      // Sort lists
      requests.sort((a, b) => new Date(b.request_time).getTime() - new Date(a.request_time).getTime());
      transactions.sort((a, b) => {
        const aTime = new Date(`${a.date}T${a.time}`).getTime();
        const bTime = new Date(`${b.date}T${b.time}`).getTime();
        return bTime - aTime;
      });
      esp_logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      const syncedDb: DatabaseSchema = {
        employees: employees.length > 0 ? employees : localDb.employees,
        products: products.length > 0 ? products : localDb.products,
        requests: requests.length > 0 ? requests : localDb.requests,
        transactions: transactions.length > 0 ? transactions : localDb.transactions,
        device_status: device_status.length > 0 ? device_status : localDb.device_status,
        esp_logs: esp_logs.length > 0 ? esp_logs.slice(0, 100) : localDb.esp_logs
      };
      
      writeDbLocal(syncedDb);
      console.log("Local database successfully synced with Cloud Firestore.");
    }
    
    lastKnownDbState = JSON.parse(JSON.stringify(readDbLocal()));
  } catch (err: any) {
    console.log(`Firestore API is not enabled or accessible (${err?.message || 'Permission denied'}). Operating in standalone local db.json mode.`);
    useFirestore = false;
    firebaseInitialized = false;
    if (dbInstance) {
      try {
        await terminate(dbInstance);
      } catch (_) {}
    }
    firestoreDb = null;
  }
}

// Initial Local Load and Trigger Sync
readDbLocal();
initializeFirestoreSync();

// Determine product stock status based on quantities
function getProductStatus(quantity: number, minimumStock: number): 'Available' | 'Low Stock' | 'Out of Stock' {
  if (quantity <= 0) return 'Out of Stock';
  if (quantity <= minimumStock) return 'Low Stock';
  return 'Available';
}

// Determine sorting bin based on category
function getSortingBin(category: 'Mechanical' | 'Electrical' | 'Other'): 'Bin 1' | 'Bin 2' | 'Bin 3' {
  if (category === 'Mechanical') return 'Bin 1';
  if (category === 'Electrical') return 'Bin 2';
  return 'Bin 3';
}

// Helper to push a command log
function logCommand(device: 'ESP32-C3' | 'ESP32-S3', type: 'RECEIVED' | 'SENT', payload: any) {
  const db = readDb();
  const newLog: ESP32CommandLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    device,
    type,
    payload
  };
  db.esp_logs.unshift(newLog); // Place at top
  if (db.esp_logs.length > 100) {
    db.esp_logs = db.esp_logs.slice(0, 100); // limit logs to 100
  }
  writeDb(db);
}

// --------------------------------------------------
// API ENDPOINTS
// --------------------------------------------------

// 1. STATS ENDPOINT
app.get('/api/stats', (req, res) => {
  const db = readDb();
  const totalItems = db.products.length;
  const totalQuantity = db.products.reduce((acc, p) => acc + p.quantity, 0);
  const pendingRequests = db.requests.filter(r => r.status !== 'Completed' && r.status !== 'Rejected').length;
  const defectiveReturned = db.requests.filter(r => r.status === 'Completed' || r.status === 'Defective Item Received' || r.status === 'Sorting' || r.status === 'Awaiting Storekeeper' || r.status === 'Approved' || r.status === 'Delivering').length;
  const completedTransactions = db.transactions.filter(t => t.status === 'Completed').length;

  res.json({
    totalItems,
    totalQuantity,
    pendingRequests,
    defectiveReturned,
    completedTransactions
  });
});

// AUTHENTICATION LOGIN PORTAL API
app.post('/api/auth/login', (req, res) => {
  const db = readDb();
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required.' });
  }

  const user = db.employees.find(e => 
    (e.username && e.username.trim().toLowerCase() === username.trim().toLowerCase()) ||
    (e.employee_id.trim().toLowerCase() === username.trim().toLowerCase()) ||
    (e.name.trim().toLowerCase() === username.trim().toLowerCase())
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid username. Portal access denied.' });
  }

  if (user.password && user.password !== password) {
    return res.status(401).json({ error: 'Invalid password. Please check your login credentials.' });
  }

  if (user.authorization_status !== 'Authorized') {
    return res.status(403).json({ error: 'Account access suspended. Contact System Administrator.' });
  }

  // Derived user role
  const role: UserRole = user.role || 
    (user.position?.toLowerCase().includes('admin') || user.department?.toLowerCase().includes('admin') ? 'ADMINISTRATOR' :
     user.position?.toLowerCase().includes('store') || user.department?.toLowerCase().includes('store') ? 'STOREKEEPER' : 'EMPLOYEE');

  res.json({
    success: true,
    user: {
      id: user.id,
      employee_id: user.employee_id,
      name: user.name,
      username: user.username || user.name,
      role: role,
      department: user.department,
      position: user.position,
      barcode_id: user.barcode_id,
      contact: user.contact
    }
  });
});

// 2. EMPLOYEES API
app.get('/api/employees', (req, res) => {
  const db = readDb();
  res.json(db.employees);
});

app.post('/api/employees', (req, res) => {
  const db = readDb();
  const employeeData = req.body;

  if (employeeData.id) {
    // Edit mode
    const idx = db.employees.findIndex(e => e.id === employeeData.id);
    if (idx !== -1) {
      db.employees[idx] = { ...db.employees[idx], ...employeeData };
      writeDb(db);
      return res.json(db.employees[idx]);
    }
    return res.status(404).json({ error: 'Employee not found' });
  } else {
    // Add mode
    const newEmp: Employee = {
      id: `emp-${Date.now()}`,
      employee_id: employeeData.employee_id || `EMP${String(db.employees.length + 1).padStart(3, '0')}`,
      name: employeeData.name,
      username: employeeData.username || employeeData.name,
      password: employeeData.password || '1234',
      role: employeeData.role || 'EMPLOYEE',
      barcode_id: employeeData.barcode_id || employeeData.employee_id,
      department: employeeData.department,
      position: employeeData.position,
      authorization_status: employeeData.authorization_status || 'Authorized',
      contact: employeeData.contact || '',
      registered_at: new Date().toISOString()
    };
    db.employees.push(newEmp);
    writeDb(db);
    res.json(newEmp);
  }
});

app.delete('/api/employees/:id', (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const filtered = db.employees.filter(e => e.id !== id);
  if (filtered.length === db.employees.length) {
    return res.status(404).json({ error: 'Employee not found' });
  }
  db.employees = filtered;
  writeDb(db);
  res.json({ success: true });
});

// 3. PRODUCTS/INVENTORY API
app.get('/api/products', (req, res) => {
  const db = readDb();
  res.json(db.products);
});

app.post('/api/products', (req, res) => {
  const db = readDb();
  const productData = req.body;

  const quantity = Number(productData.quantity || 0);
  const minStock = Number(productData.minimum_stock || 0);
  const status = getProductStatus(quantity, minStock);
  const sorting_bin = getSortingBin(productData.category);

  if (productData.id) {
    // Edit mode
    const idx = db.products.findIndex(p => p.id === productData.id);
    if (idx !== -1) {
      db.products[idx] = {
        ...db.products[idx],
        ...productData,
        quantity,
        minimum_stock: minStock,
        status,
        sorting_bin
      };
      writeDb(db);
      return res.json(db.products[idx]);
    }
    return res.status(404).json({ error: 'Product not found' });
  } else {
    // Add mode
    const newProd: Product = {
      id: `prod-${Date.now()}`,
      product_id: productData.product_id || `P-${String(db.products.length + 1).padStart(3, '0')}`,
      barcode: productData.barcode || String(Date.now()),
      product_name: productData.product_name,
      category: productData.category || 'Other',
      description: productData.description || '',
      quantity,
      minimum_stock: minStock,
      rack_location: productData.rack_location || 'A1',
      sorting_bin,
      status
    };
    db.products.push(newProd);
    writeDb(db);
    res.json(newProd);
  }
});

app.delete('/api/products/:id', (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const filtered = db.products.filter(p => p.id !== id);
  if (filtered.length === db.products.length) {
    return res.status(404).json({ error: 'Product not found' });
  }
  db.products = filtered;
  writeDb(db);
  res.json({ success: true });
});

// Identify product by barcode, product_id, or id
app.get('/api/products/identify/:code', (req, res) => {
  const db = readDb();
  const rawCode = (req.params.code || '').trim();
  const product = findProductByCode(db.products, rawCode);

  if (!product) {
    return res.status(404).json({ error: 'Component not found for scanned code', code: rawCode });
  }

  res.json(product);
});

// Perform direct inventory scan update (Stock In, Stock Out, Audit Count, Relocation)
app.post('/api/inventory/scan-update', (req, res) => {
  const db = readDb();
  const { code, action, quantity = 1, new_quantity, rack_location, notes, performed_by = 'Storekeeper QR Scan' } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Scanned code is required.' });
  }

  const product = findProductByCode(db.products, String(code));
  if (!product) {
    return res.status(404).json({ error: `No component matches scanned code: ${code}` });
  }

  const idx = db.products.findIndex(p => p.id === product.id);
  const oldQuantity = product.quantity;
  let delta = 0;

  if (action === 'ADD_STOCK') {
    const addAmt = Math.max(1, Number(quantity) || 1);
    product.quantity += addAmt;
    delta = addAmt;
  } else if (action === 'REMOVE_STOCK') {
    const subAmt = Math.max(1, Number(quantity) || 1);
    product.quantity = Math.max(0, product.quantity - subAmt);
    delta = -(oldQuantity - product.quantity);
  } else if (action === 'SET_STOCK') {
    const targetAmt = Math.max(0, Number(new_quantity !== undefined ? new_quantity : quantity) || 0);
    delta = targetAmt - oldQuantity;
    product.quantity = targetAmt;
  } else if (action === 'RELOCATE') {
    if (rack_location) {
      product.rack_location = rack_location.trim().toUpperCase();
    }
  } else {
    return res.status(400).json({ error: `Unknown action: ${action}` });
  }

  // Re-evaluate stock status
  product.status = getProductStatus(product.quantity, product.minimum_stock);
  if (idx !== -1) {
    db.products[idx] = product;
  }

  // Record an audit transaction if quantity changed
  if (delta !== 0 || action === 'RELOCATE') {
    const txId = `TX-QR-${Date.now().toString().slice(-6)}`;
    const txRecord: Transaction = {
      id: `tx-${Date.now()}`,
      transaction_id: txId,
      request_id: `QR-SCAN-${product.product_id}`,
      employee_id: performed_by || 'QR_SCANNER',
      employee_name: performed_by || 'Storekeeper Scanner',
      defective_product: action === 'REMOVE_STOCK' ? product.product_name : 'N/A',
      replacement_product: action === 'ADD_STOCK' ? product.product_name : (action === 'SET_STOCK' ? `Audit: ${oldQuantity} -> ${product.quantity}` : product.product_name),
      quantity: Math.abs(delta) || 1,
      rack_location: product.rack_location,
      sorting_bin: product.sorting_bin,
      storekeeper_id: performed_by || 'QR_TERMINAL',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0],
      status: 'Completed'
    };
    db.transactions.unshift(txRecord);

    logCommand('ESP32-C3', 'RECEIVED', {
      event: 'QR_INVENTORY_SCAN_UPDATE',
      product_id: product.product_id,
      action,
      delta,
      new_quantity: product.quantity,
      user: performed_by,
      notes
    });
  }

  writeDb(db);

  res.json({
    success: true,
    action,
    product,
    previous_quantity: oldQuantity,
    new_quantity: product.quantity,
    delta,
    message: action === 'RELOCATE' 
      ? `Relocated ${product.product_name} to Rack ${product.rack_location}`
      : `Inventory updated for ${product.product_name}: ${oldQuantity} -> ${product.quantity} units.`
  });
});

// =========================================================================
// TWO-WAY AUTOMATED CONVEYOR & JGB MOTOR OPERATIONS API
// =========================================================================

// Helper to calculate dynamic live operation progress
function getLiveOperation() {
  if (activeOperation.type === 'STANDBY') {
    return {
      ...activeOperation,
      conveyor_running: false,
      conveyor_remaining_sec: 0,
      conveyor_remaining_ms: 0,
      elapsed_ms: 0,
      gate_angle: 0,
      gate_status: 'CLOSED'
    };
  }

  const now = Date.now();
  const elapsed = Math.max(0, now - activeOperation.started_at);
  const remainingMs = Math.max(0, activeOperation.duration_ms - elapsed);
  const conveyorRunning = remainingMs > 0;

  let gateAngle = 0;
  let gateStatus = 'CLOSED';

  if (activeOperation.type === 'MECHANIC_DEFECT_INTAKE' && activeOperation.gate > 0) {
    if (elapsed < activeOperation.gate_open_ms) {
      // 0 to 1.5s: JGB motor moves forward to ~60 deg
      const pct = elapsed / activeOperation.gate_open_ms;
      gateAngle = Math.round(pct * activeOperation.target_angle_deg);
      gateStatus = `OPENING (Forward ${gateAngle}°)`;
    } else if (elapsed < activeOperation.gate_open_ms + activeOperation.gate_return_ms) {
      // 1.5s to 3.0s: JGB motor reverses back to initial position (0 deg)
      const returnElapsed = elapsed - activeOperation.gate_open_ms;
      const pct = 1 - (returnElapsed / activeOperation.gate_return_ms);
      gateAngle = Math.max(0, Math.round(pct * activeOperation.target_angle_deg));
      gateStatus = `RETURNING (Reverse ${gateAngle}°)`;
    } else {
      gateAngle = 0;
      gateStatus = 'CLOSED (At initial 0° position)';
    }
  }

  return {
    ...activeOperation,
    conveyor_running: conveyorRunning,
    conveyor_remaining_sec: Math.ceil(remainingMs / 1000),
    conveyor_remaining_ms: remainingMs,
    elapsed_ms: elapsed,
    gate_angle: gateAngle,
    gate_status: gateStatus
  };
}

// 1. GET Current Live Operation Status
app.get('/api/operations/active', (req, res) => {
  res.json(getLiveOperation());
});

// 2. STEP 1: Mechanic scans QR defect item (SP001 Bearing or SP002 DC Motor)
app.post('/api/operations/mechanic-scan-defect', (req, res) => {
  const db = readDb();
  const { code, mechanic_id = 'EMP002', mechanic_name = 'Mechanic (Workshop)' } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Defective item QR code is required.' });
  }

  const product = findProductByCode(db.products, String(code));
  if (!product) {
    return res.status(404).json({ 
      error: `Scanned code "${code}" not found in inventory. Please scan SP001 (Bearing) or SP002 (DC Motor).` 
    });
  }

  // Determine Sorting Gate:
  // SP001 / Bearing -> Gate 01 / Bin 1
  // SP002 / DC Motor -> Gate 02 / Bin 2
  const gateNumber = (product.product_id === 'SP001' || product.sorting_bin === 'Bin 1') ? 1 : 2;
  const targetBin = gateNumber === 1 ? 'Bin 1' : 'Bin 2';

  // Clear any previous running timers
  if (conveyorTimeoutTimer) {
    clearTimeout(conveyorTimeoutTimer);
    conveyorTimeoutTimer = null;
  }

  const opId = `OP-DEFECT-${Date.now().toString().slice(-6)}`;
  const reqId = `REQ${String(db.requests.length + 1001)}`;

  // Create or update defect request
  const newRequest: PartRequest = {
    id: `req-${Date.now()}`,
    request_id: reqId,
    employee_id: mechanic_id,
    employee_name: mechanic_name,
    department: 'Maintenance Workshop',
    defective_product_id: product.product_id,
    defective_product_name: product.product_name,
    replacement_product_id: product.product_id,
    replacement_product_name: product.product_name,
    rack_location: product.rack_location,
    sorting_bin: targetBin,
    status: 'Awaiting Storekeeper',
    request_time: new Date().toISOString()
  };

  db.requests.unshift(newRequest);

  // Set active operation state
  activeOperation = {
    id: opId,
    type: 'MECHANIC_DEFECT_INTAKE',
    started_at: Date.now(),
    duration_ms: 10000, // 10 seconds conveyor run
    direction: 'FORWARD', // Mechanic to Storage / Bins
    gate: gateNumber, // Gate 1 or Gate 2
    gate_motor_type: 'JGB_DC',
    gate_open_ms: 1500, // 1.5s forward for ~60 degrees
    gate_return_ms: 1500, // 1.5s reverse back to 0 deg
    target_angle_deg: 60,
    product_id: product.product_id,
    product_name: product.product_name,
    rack_location: product.rack_location,
    sorting_bin: targetBin,
    mechanic_name,
    storekeeper_alert: {
      active: true,
      required_part_id: product.product_id,
      required_part_name: product.product_name,
      required_rack: product.rack_location,
      sorting_bin: targetBin,
      message: `Mechanic returned defective ${product.product_name} (${product.product_id}). Please dispense replacement from Rack ${product.rack_location}!`,
      request_id: reqId,
      timestamp: new Date().toISOString()
    }
  };

  // Synchronize ESP32 device status
  const s3idx = db.device_status.findIndex(d => d.device_name === 'ESP32-S3');
  if (s3idx !== -1) {
    db.device_status[s3idx].conveyor_status = 'RECEIVING DEFECTIVE ITEM';
    db.device_status[s3idx].sensor_status = `Conveyor: FORWARD (10s) | JGB Gate ${gateNumber}: 60° (1.5s open -> 1.5s return) | Target: ${targetBin} | LED ${product.rack_location} BLINKING`;
    db.device_status[s3idx].last_connection = new Date().toISOString();
  }

  logCommand('ESP32-S3', 'SENT', {
    command: 'CONVEYOR_FORWARD_GATE_SORT',
    direction: 'FORWARD',
    duration_ms: 10000,
    gate: gateNumber,
    gate_motor: 'JGB_DC',
    gate_open_ms: 1500,
    gate_return_ms: 1500,
    gate_angle_deg: 60,
    product_id: product.product_id,
    product_name: product.product_name,
    sorting_bin: targetBin,
    rack_location: product.rack_location
  });

  writeDb(db);

  // Auto-stop conveyor after 10 seconds
  conveyorTimeoutTimer = setTimeout(() => {
    const updatedDb = readDb();
    const devIdx = updatedDb.device_status.findIndex(d => d.device_name === 'ESP32-S3');
    if (devIdx !== -1) {
      updatedDb.device_status[devIdx].conveyor_status = 'WAITING FOR STOREKEEPER';
      updatedDb.device_status[devIdx].sensor_status = `Conveyor: STOPPED (10s complete) | Gates: CLOSED | Waiting for Storekeeper to scan replacement from Rack ${product.rack_location}`;
      updatedDb.device_status[devIdx].last_connection = new Date().toISOString();
      writeDb(updatedDb);
    }
  }, 10000);

  res.json({
    success: true,
    message: `Defective ${product.product_name} (${product.product_id}) registered. Conveyor running FORWARD for 10s. Gate ${gateNumber} opening 60° (1.5s forward -> 1.5s reverse). Storekeeper notified to pick from Rack ${product.rack_location}!`,
    product,
    gate: gateNumber,
    sorting_bin: targetBin,
    rack_location: product.rack_location,
    operation: getLiveOperation(),
    request: newRequest
  });
});

// 3. STEP 2: Storekeeper scans the new replacement product QR
// Updates inventory (-1 stock), then runs conveyor REVERSE for 10s (no gates open)
app.post('/api/operations/storekeeper-scan-issue', (req, res) => {
  const db = readDb();
  const { code, storekeeper_id = 'STK001', storekeeper_name = 'Head Storekeeper' } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Replacement product QR code is required.' });
  }

  const product = findProductByCode(db.products, String(code));
  if (!product) {
    return res.status(404).json({ 
      error: `Scanned code "${code}" not found in inventory. Please scan SP001 (Bearing) or SP002 (DC Motor).` 
    });
  }

  if (product.quantity <= 0) {
    return res.status(400).json({ 
      error: `Cannot issue ${product.product_name}: Inventory is currently Out of Stock (0 units).` 
    });
  }

  // 1. UPDATE INVENTORY: Reduce quantity by 1
  const prevQuantity = product.quantity;
  product.quantity -= 1;
  product.status = getProductStatus(product.quantity, product.minimum_stock);

  const prodIdx = db.products.findIndex(p => p.id === product.id);
  if (prodIdx !== -1) {
    db.products[prodIdx] = product;
  }

  // 2. Find and complete any active/matching pending request
  let matchedReq = db.requests.find(r => 
    (r.replacement_product_id === product.product_id || r.defective_product_id === product.product_id) && 
    r.status !== 'Completed' && r.status !== 'Rejected'
  );

  if (!matchedReq) {
    // If no explicit pending request, find the latest active request
    matchedReq = db.requests.find(r => r.status !== 'Completed' && r.status !== 'Rejected');
  }

  if (matchedReq) {
    matchedReq.status = 'Completed';
    matchedReq.completion_time = new Date().toISOString();
  }

  // 3. Create Transaction Record
  const txId = `TX${String(db.transactions.length + 1001)}`;
  const newTx: Transaction = {
    id: `tx-${Date.now()}`,
    transaction_id: txId,
    request_id: matchedReq ? matchedReq.request_id : `ISSUE-${product.product_id}`,
    employee_id: matchedReq ? matchedReq.employee_id : 'EMP002',
    employee_name: matchedReq ? matchedReq.employee_name : 'Mechanic',
    defective_product: product.product_name,
    replacement_product: product.product_name,
    quantity: 1,
    rack_location: product.rack_location,
    sorting_bin: product.sorting_bin,
    storekeeper_id: storekeeper_id || 'STK001',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0],
    status: 'Completed'
  };
  db.transactions.unshift(newTx);

  // Clear any existing timer
  if (conveyorTimeoutTimer) {
    clearTimeout(conveyorTimeoutTimer);
    conveyorTimeoutTimer = null;
  }

  // 4. TRIGGER CONVEYOR IN REVERSE DIRECTION FOR 10 SECONDS (NO GATES OPEN)
  const opId = `OP-DELIVER-${Date.now().toString().slice(-6)}`;
  activeOperation = {
    id: opId,
    type: 'STOREKEEPER_DISPENSE',
    started_at: Date.now(),
    duration_ms: 10000, // 10 seconds
    direction: 'REVERSE', // Storekeeper to Mechanic
    gate: 0, // NO sorting gates open!
    gate_motor_type: 'NONE',
    gate_open_ms: 0,
    gate_return_ms: 0,
    target_angle_deg: 0,
    product_id: product.product_id,
    product_name: product.product_name,
    rack_location: product.rack_location,
    sorting_bin: product.sorting_bin,
    storekeeper_alert: null // Alert resolved!
  };

  // Synchronize ESP32 device status
  const s3idx = db.device_status.findIndex(d => d.device_name === 'ESP32-S3');
  if (s3idx !== -1) {
    db.device_status[s3idx].conveyor_status = 'DELIVERING REPLACEMENT';
    db.device_status[s3idx].sensor_status = `Conveyor: REVERSE (10s) | Gates: ALL CLOSED | Delivering new ${product.product_name} from Rack ${product.rack_location} to Mechanic | LED OFF`;
    db.device_status[s3idx].last_connection = new Date().toISOString();
  }

  logCommand('ESP32-S3', 'SENT', {
    command: 'CONVEYOR_REVERSE_DELIVER',
    direction: 'REVERSE',
    duration_ms: 10000,
    gate: 0,
    product_id: product.product_id,
    product_name: product.product_name,
    rack_location: product.rack_location,
    inventory_quantity: product.quantity
  });

  writeDb(db);

  // Auto-stop conveyor after 10 seconds
  conveyorTimeoutTimer = setTimeout(() => {
    const updatedDb = readDb();
    const devIdx = updatedDb.device_status.findIndex(d => d.device_name === 'ESP32-S3');
    if (devIdx !== -1) {
      updatedDb.device_status[devIdx].conveyor_status = 'COMPLETED';
      updatedDb.device_status[devIdx].sensor_status = `Delivery sequence complete | Conveyor: STOPPED | System Standby`;
      updatedDb.device_status[devIdx].last_connection = new Date().toISOString();
      writeDb(updatedDb);
    }
    activeOperation = {
      ...activeOperation,
      type: 'STANDBY',
      direction: 'STOP'
    };
  }, 10000);

  res.json({
    success: true,
    message: `Issued replacement ${product.product_name}. Inventory reduced from ${prevQuantity} -> ${product.quantity}. Conveyor running REVERSE for 10s to Mechanic (Gates closed).`,
    product,
    previous_quantity: prevQuantity,
    new_quantity: product.quantity,
    transaction: newTx,
    operation: getLiveOperation()
  });
});

// 4. Reset Active Operation
app.post('/api/operations/reset-active', (req, res) => {
  if (conveyorTimeoutTimer) {
    clearTimeout(conveyorTimeoutTimer);
    conveyorTimeoutTimer = null;
  }
  activeOperation = {
    id: 'op-reset',
    type: 'STANDBY',
    started_at: 0,
    duration_ms: 0,
    direction: 'STOP',
    gate: 0,
    gate_motor_type: 'NONE',
    gate_open_ms: 1500,
    gate_return_ms: 1500,
    target_angle_deg: 0,
    product_id: '',
    product_name: '',
    rack_location: '',
    sorting_bin: '',
    storekeeper_alert: null
  };

  const db = readDb();
  const s3idx = db.device_status.findIndex(d => d.device_name === 'ESP32-S3');
  if (s3idx !== -1) {
    db.device_status[s3idx].conveyor_status = 'IDLE';
    db.device_status[s3idx].sensor_status = 'Manual Reset | Standby';
    writeDb(db);
  }

  res.json({ success: true, operation: getLiveOperation() });
});

// 4. REQUESTS API
app.get('/api/requests', (req, res) => {
  const db = readDb();
  res.json(db.requests);
});

// Create a request manually from the web UI (simulating barcode scan or storekeeper override)
app.post('/api/requests', (req, res) => {
  const db = readDb();
  const { employee_barcode, product_barcode } = req.body;

  // Find employee
  const employee = db.employees.find(e => e.barcode_id === employee_barcode || e.employee_id === employee_barcode);
  if (!employee) {
    return res.status(400).json({ error: 'Employee not found.' });
  }

  if (employee.authorization_status !== 'Authorized') {
    return res.status(403).json({ error: 'Employee is unauthorized to request replacement parts.' });
  }

  // Find product
  const product = db.products.find(p => p.barcode === product_barcode || p.product_id === product_barcode);
  if (!product) {
    return res.status(400).json({ error: 'Product barcode not recognized in inventory.' });
  }

  // Stock check
  if (product.quantity <= 0) {
    return res.status(400).json({ error: `Replacement part is out of stock (Stock: 0). Request rejected.` });
  }

  const reqId = `REQ${String(db.requests.length + 1001)}`;

  const newRequest: PartRequest = {
    id: `req-${Date.now()}`,
    request_id: reqId,
    employee_id: employee.employee_id,
    employee_name: employee.name,
    department: employee.department,
    defective_product_id: product.product_id,
    defective_product_name: product.product_name,
    replacement_product_id: product.product_id,
    replacement_product_name: product.product_name,
    rack_location: product.rack_location,
    sorting_bin: product.sorting_bin,
    status: 'Pending',
    request_time: new Date().toISOString()
  };

  db.requests.unshift(newRequest); // Add to beginning

  // Update ESP32 status logs
  logCommand('ESP32-C3', 'RECEIVED', {
    employee_barcode,
    product_barcode,
    event: 'NEW_REQUEST'
  });

  // Automatically trigger conveyor sequence
  // Put S3 into RECEIVING mode
  const s3idx = db.device_status.findIndex(d => d.device_name === 'ESP32-S3');
  if (s3idx !== -1) {
    db.device_status[s3idx].conveyor_status = 'RECEIVING DEFECTIVE ITEM';
    db.device_status[s3idx].sensor_status = `IR1: DETECTED | IR2: Clear | Sorter Sorter: Moving to ${product.sorting_bin}`;
    db.device_status[s3idx].last_connection = new Date().toISOString();
  }

  writeDb(db);

  // Return the standard ESP response format
  res.json({
    request_id: reqId,
    status: 'REQUEST_CREATED',
    rack_location: product.rack_location,
    sorting_bin: product.sorting_bin,
    request: newRequest
  });
});

// Update request status directly
app.post('/api/requests/:id/status', (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const { status } = req.body as { status: RequestStatus };

  const idx = db.requests.findIndex(r => r.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: 'Request not found' });
  }

  db.requests[idx].status = status;

  // Synchronize device status
  const s3idx = db.device_status.findIndex(d => d.device_name === 'ESP32-S3');
  if (s3idx !== -1) {
    if (status === 'Defective Item Received') {
      db.device_status[s3idx].conveyor_status = 'SORTING';
      db.device_status[s3idx].sensor_status = `IR1: Clear | IR2: DETECTED | Sorter Sorter: Aligned at Bin`;
    } else if (status === 'Sorting') {
      db.device_status[s3idx].conveyor_status = 'SORTING';
    } else if (status === 'Awaiting Storekeeper') {
      db.device_status[s3idx].conveyor_status = 'WAITING FOR STOREKEEPER';
      db.device_status[s3idx].sensor_status = 'IR1: Clear | IR2: Clear | LED Indicator ON for Rack ' + db.requests[idx].rack_location;
    } else if (status === 'Delivering') {
      db.device_status[s3idx].conveyor_status = 'DELIVERING REPLACEMENT';
      db.device_status[s3idx].sensor_status = 'IR1: DETECTED | IR2: Clear | Reverse Direction';
    } else if (status === 'Completed') {
      db.device_status[s3idx].conveyor_status = 'COMPLETED';
      db.device_status[s3idx].sensor_status = 'IR1: Clear | IR2: Clear | LED Indicators OFF';
      db.requests[idx].completion_time = new Date().toISOString();
    }
  }

  writeDb(db);
  res.json(db.requests[idx]);
});

// Storekeeper confirms the issue / deliver replacement
app.post('/api/requests/:id/confirm-issue', (req, res) => {
  const db = readDb();
  const { id } = req.params;
  const { storekeeper_id } = req.body;

  const request = db.requests.find(r => r.id === id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  if (request.status === 'Completed' || request.status === 'Rejected') {
    return res.status(400).json({ error: 'Request is already finalized' });
  }

  // Find the product
  const productIdx = db.products.findIndex(p => p.product_id === request.replacement_product_id);
  if (productIdx === -1) {
    return res.status(404).json({ error: 'Replacement product not found in database.' });
  }

  const product = db.products[productIdx];
  if (product.quantity <= 0) {
    return res.status(400).json({ error: 'Product out of stock. Cannot issue.' });
  }

  // 1. Reduce inventory count by 1
  product.quantity -= 1;
  product.status = getProductStatus(product.quantity, product.minimum_stock);

  // 2. Set Request Status to Delivering
  request.status = 'Completed';
  request.completion_time = new Date().toISOString();

  // 3. Create Transaction Record
  const txId = `TX${String(db.transactions.length + 1001)}`;
  const newTx: Transaction = {
    id: `tx-${Date.now()}`,
    transaction_id: txId,
    request_id: request.request_id,
    employee_id: request.employee_id,
    employee_name: request.employee_name,
    defective_product: request.defective_product_name,
    replacement_product: request.replacement_product_name,
    quantity: 1,
    rack_location: request.rack_location,
    sorting_bin: request.sorting_bin,
    storekeeper_id: storekeeper_id || 'STOREKEEPER_1',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0],
    status: 'Completed'
  };

  db.transactions.unshift(newTx);

  // Log ESP32-S3 command
  logCommand('ESP32-S3', 'SENT', {
    command: 'DELIVER_ITEM',
    direction: 'REVERSE',
    rack_location: request.rack_location,
    led: 'OFF'
  });

  // Update ESP32 S3 Status
  const s3idx = db.device_status.findIndex(d => d.device_name === 'ESP32-S3');
  if (s3idx !== -1) {
    db.device_status[s3idx].conveyor_status = 'COMPLETED';
    db.device_status[s3idx].sensor_status = 'IR1: Clear | IR2: Clear | Delivery Sequence Finished | LED Indicators OFF';
    db.device_status[s3idx].last_connection = new Date().toISOString();
  }

  writeDb(db);
  res.json({
    success: true,
    request,
    transaction: newTx,
    updated_product: product
  });
});

// 5. TRANSACTIONS API
app.get('/api/transactions', (req, res) => {
  const db = readDb();
  res.json(db.transactions);
});

// 6. DEVICE STATUS API
app.get('/api/device-status', (req, res) => {
  const db = readDb();
  res.json(db.device_status);
});

app.post('/api/device-status', (req, res) => {
  const db = readDb();
  const { device_name, conveyor_status, sensor_status, device_status } = req.body;

  const idx = db.device_status.findIndex(d => d.device_name === device_name);
  if (idx !== -1) {
    if (conveyor_status) db.device_status[idx].conveyor_status = conveyor_status as ConveyorStatus;
    if (sensor_status) db.device_status[idx].sensor_status = sensor_status;
    if (device_status) db.device_status[idx].device_status = device_status;
    db.device_status[idx].last_connection = new Date().toISOString();
    writeDb(db);
    return res.json(db.device_status[idx]);
  }
  res.status(404).json({ error: 'Device not found' });
});

// 7. ESP COMMAND LOGS API
app.get('/api/esp-logs', (req, res) => {
  const db = readDb();
  res.json(db.esp_logs);
});

// 8. SPECIAL ESP32 SCAN GATEWAY ENDPOINT (Mimics the required exact specification)
app.post('/api/esp/scan', (req, res) => {
  const db = readDb();
  const { device, employee_barcode, product_barcode, event } = req.body;

  logCommand('ESP32-C3', 'RECEIVED', { device, employee_barcode, product_barcode, event });

  if (device !== 'ESP32-C3' || event !== 'NEW_REQUEST') {
    return res.status(400).json({ error: 'Invalid device or event type' });
  }

  const employee = db.employees.find(e => e.barcode_id === employee_barcode || e.employee_id === employee_barcode);
  if (!employee) {
    return res.json({
      status: 'REJECTED',
      reason: 'Employee barcode unrecognized'
    });
  }

  if (employee.authorization_status !== 'Authorized') {
    return res.json({
      status: 'REJECTED',
      reason: 'Employee unauthorized'
    });
  }

  const product = db.products.find(p => p.barcode === product_barcode || p.product_id === product_barcode);
  if (!product) {
    return res.json({
      status: 'REJECTED',
      reason: 'Product barcode unrecognized'
    });
  }

  if (product.quantity <= 0) {
    return res.json({
      status: 'REJECTED',
      reason: 'Replacement product is out of stock'
    });
  }

  const reqId = `REQ${String(db.requests.length + 1001)}`;
  const sortingBinMapped = product.category === 'Mechanical' ? 'Bin 1' : product.category === 'Electrical' ? 'Bin 2' : 'Bin 3';
  const sortingBinRaw = product.category === 'Mechanical' ? 'BIN_1' : product.category === 'Electrical' ? 'BIN_2' : 'BIN_3';

  const newRequest: PartRequest = {
    id: `req-${Date.now()}`,
    request_id: reqId,
    employee_id: employee.employee_id,
    employee_name: employee.name,
    department: employee.department,
    defective_product_id: product.product_id,
    defective_product_name: product.product_name,
    replacement_product_id: product.product_id,
    replacement_product_name: product.product_name,
    rack_location: product.rack_location,
    sorting_bin: sortingBinMapped,
    status: 'Pending',
    request_time: new Date().toISOString()
  };

  db.requests.unshift(newRequest);

  // Trigger S3 conveyor
  const s3idx = db.device_status.findIndex(d => d.device_name === 'ESP32-S3');
  if (s3idx !== -1) {
    db.device_status[s3idx].conveyor_status = 'RECEIVING DEFECTIVE ITEM';
    db.device_status[s3idx].sensor_status = `IR1: DETECTED | Sorter: Aligning to ${sortingBinMapped} | LED ${product.rack_location} BLINKING`;
  }

  writeDb(db);

  // S3 command log
  logCommand('ESP32-S3', 'SENT', {
    device: 'ESP32-S3',
    command: 'SORT_ITEM',
    bin: sortingBinRaw
  });

  res.json({
    request_id: reqId,
    status: 'REQUEST_CREATED',
    rack_location: product.rack_location,
    sorting_bin: sortingBinRaw
  });
});

// POST to trigger conveyor manual override or specific test command
app.post('/api/esp/conveyor-trigger', (req, res) => {
  const { command, value } = req.body;
  logCommand('ESP32-S3', 'SENT', { command, value });
  res.json({ success: true, command, value });
});

// GET ESP-S3 / Dev Kit Active Poll endpoint (returns current two-way conveyor & JGB motor automation script commands)
app.get('/api/esp/commands', (req, res) => {
  const live = getLiveOperation();

  if (live.type === 'MECHANIC_DEFECT_INTAKE' && live.conveyor_running) {
    return res.json({
      device: 'ESP32-S3',
      operation: 'DEFECT_INTAKE_SORT',
      conveyor: {
        run: true,
        direction: 'FORWARD',
        duration_ms: live.duration_ms,
        remaining_ms: live.conveyor_remaining_ms,
        speed_pct: 60
      },
      gate: {
        active_gate: live.gate, // 1 for SP001 Bearing (Bin 1), 2 for SP002 DC Motor (Bin 2)
        motor_type: 'JGB_DC',
        open_time_ms: live.gate_open_ms, // 1500ms forward
        return_time_ms: live.gate_return_ms, // 1500ms reverse back to initial position
        target_angle_deg: live.target_angle_deg, // 60 degrees
        current_status: live.gate_status,
        current_angle: live.gate_angle
      },
      product: {
        id: live.product_id,
        name: live.product_name,
        bin: live.sorting_bin,
        rack: live.rack_location
      },
      rack_indicator_led: {
        rack: live.rack_location,
        state: 'BLINKING'
      }
    });
  }

  if (live.type === 'STOREKEEPER_DISPENSE' && live.conveyor_running) {
    return res.json({
      device: 'ESP32-S3',
      operation: 'REPLACEMENT_DELIVER',
      conveyor: {
        run: true,
        direction: 'REVERSE',
        duration_ms: live.duration_ms,
        remaining_ms: live.conveyor_remaining_ms,
        speed_pct: 60
      },
      gate: {
        active_gate: 0, // NO sorting gates open during reverse delivery
        motor_type: 'NONE',
        open_time_ms: 0,
        return_time_ms: 0,
        target_angle_deg: 0,
        current_status: 'ALL_GATES_CLOSED'
      },
      product: {
        id: live.product_id,
        name: live.product_name,
        rack: live.rack_location
      },
      rack_indicator_led: {
        rack: live.rack_location,
        state: 'OFF'
      }
    });
  }

  // Standby state
  res.json({
    device: 'ESP32-S3',
    operation: 'STANDBY',
    conveyor: {
      run: false,
      direction: 'STOP',
      duration_ms: 0,
      remaining_ms: 0
    },
    gate: {
      active_gate: 0,
      motor_type: 'NONE',
      current_status: 'STANDBY_CLOSED'
    },
    storekeeper_alert: live.storekeeper_alert
  });
});

// GET ESP32 Dev Kit Arduino/C++ code snippet tailored for JGB motors and bidirectional conveyor
app.get('/api/esp/firmware-snippet', (req, res) => {
  const code = `/*
 * ESP32-S3 / Dev Kit Firmware: Automated Defect Sorting & Delivery
 * 
 * Hardware Setup:
 * - Conveyor Motor Driver (e.g. L298N / TB6612FNG):
 *   - PIN_CONVEYOR_IN1 = 18
 *   - PIN_CONVEYOR_IN2 = 19
 *   - PIN_CONVEYOR_PWM = 21
 * - Gate 1 (SP001 Bearing - Bin 1) JGB DC Motor:
 *   - PIN_GATE1_IN1 = 22
 *   - PIN_GATE1_IN2 = 23
 * - Gate 2 (SP002 DC Motor - Bin 2) JGB DC Motor:
 *   - PIN_GATE2_IN1 = 25
 *   - PIN_GATE2_IN2 = 26
 * 
 * JGB Motor Timing Spec:
 * - 1.5 seconds forward to open gate nearly 60 degrees
 * - 1.5 seconds reverse to return gate to initial 0 degree position
 * - Total conveyor runtime: 10 seconds (Forward for defect intake, Reverse for replacement deliver)
 */

#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";
const char* serverUrl = "http://YOUR_SERVER_IP:3000/api/esp/commands";

#define PIN_CONV_IN1  18
#define PIN_CONV_IN2  19
#define PIN_GATE1_IN1 22
#define PIN_GATE1_IN2 23
#define PIN_GATE2_IN1 25
#define PIN_GATE2_IN2 26

void setup() {
  Serial.begin(115200);
  pinMode(PIN_CONV_IN1, OUTPUT);
  pinMode(PIN_CONV_IN2, OUTPUT);
  pinMode(PIN_GATE1_IN1, OUTPUT);
  pinMode(PIN_GATE1_IN2, OUTPUT);
  pinMode(PIN_GATE2_IN1, OUTPUT);
  pinMode(PIN_GATE2_IN2, OUTPUT);
  stopAll();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\nWiFi Connected!");
}

void stopAll() {
  digitalWrite(PIN_CONV_IN1, LOW);
  digitalWrite(PIN_CONV_IN2, LOW);
  digitalWrite(PIN_GATE1_IN1, LOW);
  digitalWrite(PIN_GATE1_IN2, LOW);
  digitalWrite(PIN_GATE2_IN1, LOW);
  digitalWrite(PIN_GATE2_IN2, LOW);
}

void runConveyor(bool forward) {
  if (forward) {
    digitalWrite(PIN_CONV_IN1, HIGH);
    digitalWrite(PIN_CONV_IN2, LOW);
  } else {
    digitalWrite(PIN_CONV_IN1, LOW);
    digitalWrite(PIN_CONV_IN2, HIGH);
  }
}

void actuateJGBGate(int gateNum) {
  int pinFwd = (gateNum == 1) ? PIN_GATE1_IN1 : PIN_GATE2_IN1;
  int pinRev = (gateNum == 1) ? PIN_GATE1_IN2 : PIN_GATE2_IN2;

  // 1. Run forward for 1.5 seconds (~60 degrees)
  digitalWrite(pinFwd, HIGH);
  digitalWrite(pinRev, LOW);
  delay(1500);

  // 2. Run reverse for 1.5 seconds (back to initial position)
  digitalWrite(pinFwd, LOW);
  digitalWrite(pinRev, HIGH);
  delay(1500);

  // 3. Stop gate motor
  digitalWrite(pinFwd, LOW);
  digitalWrite(pinRev, LOW);
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverUrl);
    int httpCode = http.GET();

    if (httpCode == 200) {
      String payload = http.getString();
      StaticJsonDocument<1024> doc;
      deserializeJson(doc, payload);

      const char* op = doc["operation"];
      if (strcmp(op, "DEFECT_INTAKE_SORT") == 0) {
        int gate = doc["gate"]["active_gate"];
        Serial.printf("Step 1: Defect Intake. Gate: %d. Running Forward 10s...\\n", gate);
        runConveyor(true);
        if (gate == 1 || gate == 2) {
          actuateJGBGate(gate); // 1.5s open 60 deg -> 1.5s return
        }
        delay(7000); // Remaining 7s of 10s conveyor
        stopAll();
      } else if (strcmp(op, "REPLACEMENT_DELIVER") == 0) {
        Serial.println("Step 2: Replacement Deliver. Running Reverse 10s (No Gates)...");
        runConveyor(false);
        delay(10000); // 10s reverse
        stopAll();
      } else {
        stopAll();
      }
    }
    http.end();
  }
  delay(500);
}`;

  res.setHeader('Content-Type', 'text/plain');
  res.send(code);
});

// --------------------------------------------------
// VITE MIDDLEWARE CONFIG / STATIC SERVING
// --------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
