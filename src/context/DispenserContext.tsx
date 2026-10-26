import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { Vibration, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  Compartment,
  CompartmentId,
  DoseLog,
  Esp32Telemetry,
  ScheduleItem,
  CaretakerProfile,
  SystemSettings,
  JsonPacketLog,
} from '../types/dispenser';

interface DispenserContextType {
  compartments: Compartment[];
  logs: DoseLog[];
  telemetry: Esp32Telemetry;
  caretaker: CaretakerProfile;
  settings: SystemSettings;
  jsonPackets: JsonPacketLog[];
  missedDoses: DoseLog[];
  isDispensing: Record<CompartmentId, boolean>;
  debounceCooldown: Record<CompartmentId, number>; // countdown seconds
  
  // Actions
  dispenseNow: (compartmentId: CompartmentId) => Promise<boolean>;
  updateSchedules: (compartmentId: CompartmentId, schedules: ScheduleItem[]) => void;
  refillCompartment: (compartmentId: CompartmentId, pillCount: number) => void;
  updateCompartmentInfo: (compartmentId: CompartmentId, info: Partial<Compartment>) => void;
  updateCaretaker: (caretaker: CaretakerProfile) => void;
  updateSettings: (settings: Partial<SystemSettings>) => void;
  notifyCaretakerForMissed: (doseLogId?: string) => Promise<boolean>;
  
  // Hardware Simulator Controls
  simulatePhysicalDrop: (compartmentId: CompartmentId) => void;
  simulatePhysicalJam: (compartmentId: CompartmentId) => void;
  toggleEsp32Connection: () => void;
  clearPacketLogs: () => void;
}

const DispenserContext = createContext<DispenserContextType | undefined>(undefined);

const INITIAL_COMPARTMENTS: Compartment[] = [
  {
    id: 'A',
    medicineName: 'Amoxicillin',
    dosage: '500 mg (1 Capsule)',
    pillCount: 18,
    maxCapacity: 30,
    lowStockThreshold: 6,
    colorTheme: 'emerald',
    dispensingState: 'idle',
    schedules: [
      { id: 'sch-a-1', time: '08:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], everyday: true, mealRelation: 'after', enabled: true },
      { id: 'sch-a-2', time: '20:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], everyday: true, mealRelation: 'after', enabled: true },
    ],
  },
  {
    id: 'B',
    medicineName: 'Atorvastatin',
    dosage: '20 mg (1 Tablet)',
    pillCount: 22,
    maxCapacity: 30,
    lowStockThreshold: 5,
    colorTheme: 'teal',
    dispensingState: 'idle',
    schedules: [
      { id: 'sch-b-1', time: '21:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], everyday: true, mealRelation: 'after', enabled: true },
    ],
  },
  {
    id: 'C',
    medicineName: 'Metformin HCl',
    dosage: '850 mg (1 Tablet)',
    pillCount: 4, // Intentionally low stock
    maxCapacity: 30,
    lowStockThreshold: 6,
    colorTheme: 'amber',
    dispensingState: 'idle',
    schedules: [
      { id: 'sch-c-1', time: '13:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], everyday: true, mealRelation: 'with', enabled: true },
      { id: 'sch-c-2', time: '19:30', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], everyday: true, mealRelation: 'with', enabled: true },
    ],
  },
  {
    id: 'D',
    medicineName: 'Vitamin D3 + Zinc',
    dosage: '1000 IU (2 Gummies)',
    pillCount: 26,
    maxCapacity: 30,
    lowStockThreshold: 5,
    colorTheme: 'orange',
    dispensingState: 'idle',
    schedules: [
      { id: 'sch-d-1', time: '09:30', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], everyday: true, mealRelation: 'before', enabled: true },
    ],
  },
];

export const DispenserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [compartments, setCompartments] = useState<Compartment[]>(INITIAL_COMPARTMENTS);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [telemetry, setTelemetry] = useState<Esp32Telemetry>({
    deviceId: 'ESP32_DISPENSER_SHIVRAJ_01',
    status: 'ONLINE',
    wifiRssi: -58,
    batteryLevel: 94,
    irSensorDetected: false,
    errorCode: 'NONE',
    firmwareVersion: 'v2.4.1-esp32',
    lastHeartbeat: Date.now(),
  });

  const [caretaker, setCaretaker] = useState<CaretakerProfile>({
    name: 'Dr. Ramesh Deshmukh',
    phone: '+91 98220 12345',
    relation: 'Family Physician / Caretaker',
    email: 'care.deshmukh@example.com',
    smsAlerts: true,
    callAlerts: true,
  });

  const [settings, setSettings] = useState<SystemSettings>({
    soundEnabled: true,
    vibrateEnabled: true,
    missedWindowMinutes: 30,
    autoSyncWithEsp32: true,
    esp32IpAddress: '192.168.1.100',
    firebaseUrl: 'https://smart-dispenser-default-rtdb.firebaseio.com',
    apiKey: 'AIzaSyA8MockKeyDispenserShivraj',
  });

  const [jsonPackets, setJsonPackets] = useState<JsonPacketLog[]>([]);
  const [isDispensing, setIsDispensing] = useState<Record<CompartmentId, boolean>>({
    A: false,
    B: false,
    C: false,
    D: false,
  });
  const [debounceCooldown, setDebounceCooldown] = useState<Record<CompartmentId, number>>({
    A: 0,
    B: 0,
    C: 0,
    D: 0,
  });

  // Load persisted state from AsyncStorage on Android launch
  useEffect(() => {
    const loadState = async () => {
      try {
        const savedComps = await AsyncStorage.getItem('smart_dispenser_compartments');
        const savedLogs = await AsyncStorage.getItem('smart_dispenser_logs');
        const savedCaretaker = await AsyncStorage.getItem('smart_dispenser_caretaker');
        const savedSettings = await AsyncStorage.getItem('smart_dispenser_settings');

        if (savedComps) setCompartments(JSON.parse(savedComps));
        if (savedLogs) {
          setLogs(JSON.parse(savedLogs));
        } else {
          // Seed initial realistic medical logs
          const today = new Date().toISOString().split('T')[0];
          const seeded: DoseLog[] = [
            {
              id: 'log-seed-1',
              compartmentId: 'A',
              medicineName: 'Amoxicillin',
              dosage: '500 mg',
              scheduledTime: `${today}T08:00:00.000Z`,
              dispensedTime: `${today}T08:01:14.000Z`,
              status: 'Taken',
              source: 'scheduled',
              sensorConfirmed: true,
              notes: 'Optical IR sensor confirmed 1 capsule dropped cleanly.',
            },
            {
              id: 'log-seed-2',
              compartmentId: 'D',
              medicineName: 'Vitamin D3 + Zinc',
              dosage: '1000 IU',
              scheduledTime: `${today}T09:30:00.000Z`,
              dispensedTime: `${today}T09:32:02.000Z`,
              status: 'Taken',
              source: 'scheduled',
              sensorConfirmed: true,
              notes: 'Optical IR sensor confirmed 2 gummies dropped cleanly.',
            },
            {
              id: 'log-seed-3',
              compartmentId: 'C',
              medicineName: 'Metformin HCl',
              dosage: '850 mg',
              scheduledTime: `${today}T13:00:00.000Z`,
              status: 'Missed',
              source: 'scheduled',
              sensorConfirmed: false,
              notes: '30-minute grace window elapsed without pill drop or confirmation.',
              caretakerNotified: false,
            },
          ];
          setLogs(seeded);
        }

        if (savedCaretaker) setCaretaker(JSON.parse(savedCaretaker));
        if (savedSettings) setSettings((prev) => ({ ...prev, ...JSON.parse(savedSettings) }));
      } catch {
        // Fallback gracefully
      }
    };

    loadState();
  }, []);

  // Persist state updates to AsyncStorage
  useEffect(() => {
    AsyncStorage.setItem('smart_dispenser_compartments', JSON.stringify(compartments)).catch(() => {});
  }, [compartments]);

  useEffect(() => {
    AsyncStorage.setItem('smart_dispenser_logs', JSON.stringify(logs)).catch(() => {});
  }, [logs]);

  useEffect(() => {
    AsyncStorage.setItem('smart_dispenser_caretaker', JSON.stringify(caretaker)).catch(() => {});
  }, [caretaker]);

  useEffect(() => {
    AsyncStorage.setItem('smart_dispenser_settings', JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  // JSON packet logger for Android Virtual Hardware Deck
  const recordPacket = useCallback((direction: 'INBOUND' | 'OUTBOUND', endpoint: string, payload: Record<string, unknown>) => {
    const packet: JsonPacketLog = {
      id: `pkt-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      direction,
      endpoint,
      timestamp: new Date().toLocaleTimeString(),
      payload,
    };
    setJsonPackets((prev) => [packet, ...prev].slice(0, 30));
  }, []);

  const clearPacketLogs = useCallback(() => {
    setJsonPackets([]);
  }, []);

  // Debounce Countdown Timer (1-second tick)
  useEffect(() => {
    const timer = setInterval(() => {
      setDebounceCooldown((prev) => {
        let changed = false;
        const updated = { ...prev };
        (Object.keys(updated) as CompartmentId[]).forEach((cid) => {
          if (updated[cid] > 0) {
            updated[cid] -= 1;
            changed = true;
          }
        });
        return changed ? updated : prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 30-Minute Missed Dose Evaluation Logic
  useEffect(() => {
    const checkMissedDoses = () => {
      const now = new Date();
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const currentTotalMinutes = currentHours * 60 + currentMinutes;

      const daysOfWeekMap: Record<number, string> = {
        0: 'Sun', 1: 'Mon', 2: 'Tue', 3: 'Wed', 4: 'Thu', 5: 'Fri', 6: 'Sat',
      };
      const currentDay = daysOfWeekMap[now.getDay()];
      const todayDateStr = now.toISOString().split('T')[0];

      compartments.forEach((comp) => {
        comp.schedules.forEach((sch) => {
          if (!sch.enabled) return;
          if (!sch.everyday && !sch.days.includes(currentDay as import('../types/dispenser').DayOfWeek)) {
            return;
          }

          const [sHour, sMinute] = sch.time.split(':').map(Number);
          const scheduledTotalMinutes = sHour * 60 + sMinute;
          const diffMinutes = currentTotalMinutes - scheduledTotalMinutes;

          // If scheduled dose passed by more than 30 minutes
          if (diffMinutes > settings.missedWindowMinutes && diffMinutes < 1440) {
            const alreadyLogged = logs.some((l) => {
              const logDate = l.scheduledTime.split('T')[0];
              const logTime = new Date(l.scheduledTime);
              return (
                l.compartmentId === comp.id &&
                logDate === todayDateStr &&
                Math.abs(logTime.getHours() * 60 + logTime.getMinutes() - scheduledTotalMinutes) < 15
              );
            });

            if (!alreadyLogged) {
              const scheduledIso = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate(),
                sHour,
                sMinute
              ).toISOString();

              const missedLog: DoseLog = {
                id: `missed-${comp.id}-${Date.now()}`,
                compartmentId: comp.id,
                medicineName: comp.medicineName,
                dosage: comp.dosage,
                scheduledTime: scheduledIso,
                status: 'Missed',
                source: 'scheduled',
                sensorConfirmed: false,
                notes: '30-minute grace window elapsed without drop confirmation.',
                caretakerNotified: false,
              };

              setLogs((prev) => [missedLog, ...prev]);
              if (settings.vibrateEnabled) {
                Vibration.vibrate([0, 300, 150, 300]);
              }
            }
          }
        });
      });
    };

    const interval = setInterval(checkMissedDoses, 15000);
    return () => clearInterval(interval);
  }, [compartments, logs, settings.missedWindowMinutes, settings.vibrateEnabled]);

  // Derived: List of currently missed doses
  const missedDoses = useMemo(() => {
    return logs.filter((log) => log.status === 'Missed');
  }, [logs]);

  // Manual Override: "Dispense Now" with Debounce & Sensor Verification
  const dispenseNow = useCallback(
    async (compartmentId: CompartmentId): Promise<boolean> => {
      if (debounceCooldown[compartmentId] > 0 || isDispensing[compartmentId]) {
        Alert.alert(
          'Dispenser Busy',
          `Please wait ${debounceCooldown[compartmentId] || 3}s before triggering again. Mechanical cycle is active.`
        );
        return false;
      }

      const comp = compartments.find((c) => c.id === compartmentId);
      if (!comp) return false;

      if (comp.pillCount <= 0) {
        Alert.alert(
          'Empty Slot',
          `Compartment ${compartmentId} has 0 pills. Please refill before dispensing.`
        );
        if (settings.vibrateEnabled) Vibration.vibrate(400);
        return false;
      }

      // Initiate dispensing state & lock with 5s debounce cooldown
      setIsDispensing((prev) => ({ ...prev, [compartmentId]: true }));
      setDebounceCooldown((prev) => ({ ...prev, [compartmentId]: 5 }));

      if (settings.vibrateEnabled) {
        Vibration.vibrate(80);
      }

      const commandPayload = {
        action: 'DISPENSE',
        compartment: compartmentId,
        pills: 1,
        timestamp: Math.floor(Date.now() / 1000),
      };
      recordPacket('OUTBOUND', '/api/esp32/command', commandPayload);

      // Simulate physical mechanical servo rotation & IR drop (1.8s)
      return new Promise<boolean>((resolve) => {
        setTimeout(() => {
          // Decrement pill count
          setCompartments((prev) =>
            prev.map((c) => {
              if (c.id === compartmentId) {
                const nextCount = Math.max(0, c.pillCount - 1);
                return {
                  ...c,
                  pillCount: nextCount,
                  lastDispensed: new Date().toISOString(),
                  dispensingState: nextCount <= c.lowStockThreshold ? 'refill_needed' : 'idle',
                };
              }
              return c;
            })
          );

          // Add dose log
          const newLog: DoseLog = {
            id: `log-${Date.now()}`,
            compartmentId,
            medicineName: comp.medicineName,
            dosage: comp.dosage,
            scheduledTime: new Date().toISOString(),
            dispensedTime: new Date().toISOString(),
            status: 'Taken',
            source: 'manual_override',
            sensorConfirmed: true,
            notes: 'Physical IR beam break sensor confirmed 1 unit dropped.',
          };
          setLogs((prev) => [newLog, ...prev]);

          const telemetryPayload = {
            deviceId: telemetry.deviceId,
            event: 'PILL_DISPENSED',
            compartment: compartmentId,
            irSensorDetected: true,
            dropCount: 1,
            errorCode: 'NONE',
          };
          recordPacket('INBOUND', '/api/esp32/telemetry', telemetryPayload);

          setIsDispensing((prev) => ({ ...prev, [compartmentId]: false }));

          if (settings.vibrateEnabled) {
            Vibration.vibrate([0, 100, 50, 150]);
          }

          Alert.alert(
            'Dispense Verified',
            `1 dose of ${comp.medicineName} dropped & verified by IR optical sensor!`
          );

          resolve(true);
        }, 1800);
      });
    },
    [compartments, debounceCooldown, isDispensing, recordPacket, settings.vibrateEnabled, telemetry.deviceId]
  );

  const updateSchedules = useCallback(
    (compartmentId: CompartmentId, schedules: ScheduleItem[]) => {
      setCompartments((prev) =>
        prev.map((c) => (c.id === compartmentId ? { ...c, schedules } : c))
      );
      recordPacket('OUTBOUND', '/api/esp32/sync', {
        action: 'UPDATE_SCHEDULE',
        compartment: compartmentId,
        schedules,
      });
      Alert.alert('Schedule Updated', `Schedules saved for Compartment ${compartmentId}.`);
    },
    [recordPacket]
  );

  const refillCompartment = useCallback(
    (compartmentId: CompartmentId, pillCount: number) => {
      setCompartments((prev) =>
        prev.map((c) =>
          c.id === compartmentId
            ? {
                ...c,
                pillCount: Math.min(c.maxCapacity, pillCount),
                dispensingState: 'idle',
              }
            : c
        )
      );
      if (settings.vibrateEnabled) Vibration.vibrate(100);
      Alert.alert('Inventory Refilled', `Compartment ${compartmentId} updated to ${pillCount} pills.`);
    },
    [settings.vibrateEnabled]
  );

  const updateCompartmentInfo = useCallback(
    (compartmentId: CompartmentId, info: Partial<Compartment>) => {
      setCompartments((prev) =>
        prev.map((c) => (c.id === compartmentId ? { ...c, ...info } : c))
      );
    },
    []
  );

  const notifyCaretakerForMissed = useCallback(
    async (doseLogId?: string): Promise<boolean> => {
      const targetLog = doseLogId ? logs.find((l) => l.id === doseLogId) : missedDoses[0];
      const compId = targetLog?.compartmentId || 'C';
      const medName = targetLog?.medicineName || 'Scheduled Medicine';

      if (targetLog) {
        setLogs((prev) =>
          prev.map((l) => (l.id === targetLog.id ? { ...l, caretakerNotified: true } : l))
        );
      }

      recordPacket('OUTBOUND', '/api/caretaker/notify', {
        doseId: targetLog?.id,
        recipient: caretaker.phone,
        message: `Patient missed ${medName} (Slot ${compId})`,
      });

      if (settings.vibrateEnabled) Vibration.vibrate([0, 150, 100, 150]);

      Alert.alert(
        'Caretaker Notified',
        `SMS alert dispatched to ${caretaker.name} (${caretaker.phone}) for ${medName}.`
      );
      return true;
    },
    [logs, missedDoses, caretaker, recordPacket, settings.vibrateEnabled]
  );

  const updateCaretaker = useCallback((profile: CaretakerProfile) => {
    setCaretaker(profile);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<SystemSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  }, []);

  // Hardware Simulator Controls
  const simulatePhysicalDrop = useCallback(
    (compartmentId: CompartmentId) => {
      const comp = compartments.find((c) => c.id === compartmentId);
      if (!comp) return;

      setCompartments((prev) =>
        prev.map((c) =>
          c.id === compartmentId
            ? { ...c, pillCount: Math.max(0, c.pillCount - 1), lastDispensed: new Date().toISOString() }
            : c
        )
      );

      const simLog: DoseLog = {
        id: `log-sim-${Date.now()}`,
        compartmentId,
        medicineName: comp.medicineName,
        dosage: comp.dosage,
        scheduledTime: new Date().toISOString(),
        dispensedTime: new Date().toISOString(),
        status: 'Taken',
        source: 'manual_override',
        sensorConfirmed: true,
        notes: 'Simulated Optical IR Sensor Drop Trigger',
      };
      setLogs((prev) => [simLog, ...prev]);

      recordPacket('INBOUND', '/api/esp32/telemetry', {
        deviceId: telemetry.deviceId,
        event: 'PILL_DISPENSED',
        compartment: compartmentId,
        irSensorDetected: true,
        dropCount: 1,
      });

      if (settings.vibrateEnabled) Vibration.vibrate(100);
      Alert.alert('IR Sensor Triggered', `Hardware drop recorded for Slot ${compartmentId}.`);
    },
    [compartments, recordPacket, settings.vibrateEnabled, telemetry.deviceId]
  );

  const simulatePhysicalJam = useCallback(
    (compartmentId: CompartmentId) => {
      setCompartments((prev) =>
        prev.map((c) => (c.id === compartmentId ? { ...c, dispensingState: 'jammed' } : c))
      );

      setTelemetry((prev) => ({
        ...prev,
        errorCode: 'JAM_DETECTED',
        status: 'ERROR',
      }));

      recordPacket('INBOUND', '/api/esp32/telemetry', {
        deviceId: telemetry.deviceId,
        event: 'JAM_DETECTED',
        compartment: compartmentId,
        errorCode: 'JAM_DETECTED',
      });

      if (settings.vibrateEnabled) Vibration.vibrate([0, 300, 100, 300]);
      Alert.alert('Jam Alert', `Compartment ${compartmentId} motor stall / IR beam blocked.`);
    },
    [recordPacket, settings.vibrateEnabled, telemetry.deviceId]
  );

  const toggleEsp32Connection = useCallback(() => {
    setTelemetry((prev) => {
      const nextStatus = prev.status === 'ONLINE' ? 'OFFLINE' : 'ONLINE';
      return {
        ...prev,
        status: nextStatus,
        lastHeartbeat: nextStatus === 'ONLINE' ? Date.now() : prev.lastHeartbeat - 40000,
      };
    });
  }, []);

  return (
    <DispenserContext.Provider
      value={{
        compartments,
        logs,
        telemetry,
        caretaker,
        settings,
        jsonPackets,
        missedDoses,
        isDispensing,
        debounceCooldown,
        dispenseNow,
        updateSchedules,
        refillCompartment,
        updateCompartmentInfo,
        updateCaretaker,
        updateSettings,
        notifyCaretakerForMissed,
        simulatePhysicalDrop,
        simulatePhysicalJam,
        toggleEsp32Connection,
        clearPacketLogs,
      }}
    >
      {children}
    </DispenserContext.Provider>
  );
};

export const useDispenser = () => {
  const context = useContext(DispenserContext);
  if (!context) {
    throw new Error('useDispenser must be used within a DispenserProvider');
  }
  return context;
};
