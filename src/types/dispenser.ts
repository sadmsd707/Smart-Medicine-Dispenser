export type CompartmentId = 'A' | 'B' | 'C' | 'D';

export type DayOfWeek = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';

export type DoseStatus = 'Scheduled' | 'Dispensing' | 'Taken' | 'Missed';

export type MealRelation = 'before' | 'with' | 'after' | 'none';

export type ColorTheme = 'emerald' | 'teal' | 'amber' | 'orange';

export interface ScheduleItem {
  id: string;
  time: string; // "HH:MM" 24h
  days: DayOfWeek[];
  everyday: boolean;
  mealRelation: MealRelation;
  enabled: boolean;
}

export interface Compartment {
  id: CompartmentId;
  medicineName: string;
  dosage: string;
  pillCount: number;
  maxCapacity: number;
  lowStockThreshold: number;
  colorTheme: ColorTheme;
  schedules: ScheduleItem[];
  dispensingState: 'idle' | 'dispensing' | 'jammed' | 'refill_needed';
  lastDispensed?: string;
  nextScheduledTime?: string;
}

export interface DoseLog {
  id: string;
  compartmentId: CompartmentId;
  medicineName: string;
  dosage: string;
  scheduledTime: string; // ISO string
  dispensedTime?: string; // ISO string
  status: DoseStatus;
  notes?: string;
  source: 'scheduled' | 'manual_override';
  sensorConfirmed: boolean;
  caretakerNotified?: boolean;
}

export interface Esp32Command {
  commandId: string;
  action: 'DISPENSE' | 'SYNC' | 'CALIBRATE' | 'BUZZER_TEST';
  compartment: CompartmentId;
  pills: number;
  timestamp: number;
  status: 'PENDING' | 'EXECUTING' | 'COMPLETED' | 'FAILED';
}

export interface Esp32Telemetry {
  deviceId: string;
  status: 'ONLINE' | 'OFFLINE' | 'BUSY' | 'ERROR';
  wifiRssi: number;
  batteryLevel: number;
  irSensorDetected: boolean;
  lastDispensedCompartment?: CompartmentId;
  lastDispensedTimestamp?: number;
  errorCode: 'NONE' | 'JAM_DETECTED' | 'IR_TIMEOUT' | 'MOTOR_STALL' | 'DISPENSER_EMPTY';
  firmwareVersion: string;
  lastHeartbeat: number;
}

export interface CaretakerProfile {
  name: string;
  phone: string;
  relation: string;
  email: string;
  smsAlerts: boolean;
  callAlerts: boolean;
}

export interface SystemSettings {
  soundEnabled: boolean;
  vibrateEnabled: boolean;
  missedWindowMinutes: number; // default 30 mins
  autoSyncWithEsp32: boolean;
  esp32IpAddress: string;
  firebaseUrl: string;
  apiKey: string;
}

export interface JsonPacketLog {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  endpoint: string;
  timestamp: string;
  payload: Record<string, unknown>;
}
