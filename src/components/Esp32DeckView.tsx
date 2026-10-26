import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispenser } from '../context/DispenserContext';
import { CompartmentId } from '../types/dispenser';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';

export const Esp32DeckView: React.FC = () => {
  const {
    telemetry,
    jsonPackets,
    clearPacketLogs,
    simulatePhysicalDrop,
    simulatePhysicalJam,
    toggleEsp32Connection,
  } = useDispenser();

  const [selectedDropSlot, setSelectedDropSlot] = useState<CompartmentId>('A');
  const [selectedJamSlot, setSelectedJamSlot] = useState<CompartmentId>('C');

  const isOnline = telemetry.status === 'ONLINE';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
      
      {/* Microcontroller Status Card */}
      <View style={styles.hardwareCard}>
        <View style={styles.cardHeader}>
          <View style={styles.mcuIconBadge}>
            <MaterialCommunityIcons name="chip" size={24} color="#ffffff" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={styles.mcuTitle}>ESP32-WROOM-32</Text>
              <View style={styles.firmwareBadge}>
                <Text style={styles.firmwareText}>{telemetry.firmwareVersion}</Text>
              </View>
            </View>
            <Text style={styles.mcuSub}>Dual-Core 240MHz • FreeRTOS • 4-Slot GPIO</Text>
          </View>
        </View>

        {/* Telemetry Metrics */}
        <View style={styles.telemetryGrid}>
          <View style={styles.telemetryBox}>
            <Text style={styles.telLabel}>WiFi RSSI</Text>
            <Text style={styles.telValue}>{telemetry.wifiRssi} dBm</Text>
          </View>

          <View style={styles.telemetryBox}>
            <Text style={styles.telLabel}>Battery</Text>
            <Text style={styles.telValue}>{telemetry.batteryLevel}%</Text>
          </View>

          <View style={styles.telemetryBox}>
            <Text style={styles.telLabel}>IR Sensor</Text>
            <Text style={[styles.telValue, { color: telemetry.irSensorDetected ? '#10b981' : '#64748b' }]}>
              {telemetry.irSensorDetected ? 'DETECTED' : 'IDLE'}
            </Text>
          </View>

          <View style={styles.telemetryBox}>
            <Text style={styles.telLabel}>Error Status</Text>
            <Text style={[styles.telValue, { color: telemetry.errorCode === 'NONE' ? '#10b981' : '#e11d48' }]}>
              {telemetry.errorCode === 'NONE' ? 'OK (0x00)' : 'JAMMED'}
            </Text>
          </View>
        </View>

        {/* Connection Toggle */}
        <TouchableOpacity
          style={[styles.connToggleBtn, isOnline ? styles.connOnline : styles.connOffline]}
          onPress={toggleEsp32Connection}
        >
          <View style={[styles.statusDot, isOnline ? styles.dotGreen : styles.dotRed]} />
          <Text style={[styles.connToggleText, isOnline ? { color: '#047857' } : { color: '#b91c1c' }]}>
            {isOnline ? 'Hardware Connected (Tap to Disconnect)' : 'Hardware Offline (Tap to Reconnect)'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Hardware Triggers */}
      <Text style={styles.sectionHeader}>Virtual Hardware Simulator</Text>

      {/* Trigger 1: IR Optical Drop */}
      <View style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <Ionicons name="shield-checkmark" size={18} color="#10b981" />
          <Text style={styles.actionTitle}>Simulate Optical IR Drop Sensor</Text>
        </View>
        <Text style={styles.actionDesc}>
          Simulates pill chute beam-break on GPIO 34/35/32/33.
        </Text>

        <View style={styles.slotSelectorRow}>
          <Text style={styles.selectLabel}>Target:</Text>
          {(['A', 'B', 'C', 'D'] as CompartmentId[]).map((cid) => (
            <TouchableOpacity
              key={cid}
              style={[styles.slotBtn, selectedDropSlot === cid && styles.slotBtnActive]}
              onPress={() => setSelectedDropSlot(cid)}
            >
              <Text style={[styles.slotBtnText, selectedDropSlot === cid && styles.slotBtnTextActive]}>
                {cid}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.triggerBtnGreen}
          onPress={() => simulatePhysicalDrop(selectedDropSlot)}
        >
          <Text style={styles.triggerBtnText}>Trigger IR Drop Sensor (Slot {selectedDropSlot})</Text>
        </TouchableOpacity>
      </View>

      {/* Trigger 2: Mechanical Jam */}
      <View style={styles.actionCard}>
        <View style={styles.actionHeader}>
          <MaterialCommunityIcons name="alert-decagram" size={18} color="#f59e0b" />
          <Text style={styles.actionTitle}>Simulate Mechanical Jam</Text>
        </View>
        <Text style={styles.actionDesc}>
          Simulates motor stall / beam obstruction timeout during rotation.
        </Text>

        <View style={styles.slotSelectorRow}>
          <Text style={styles.selectLabel}>Target:</Text>
          {(['A', 'B', 'C', 'D'] as CompartmentId[]).map((cid) => (
            <TouchableOpacity
              key={cid}
              style={[styles.slotBtn, selectedJamSlot === cid && styles.slotBtnActiveAmber]}
              onPress={() => setSelectedJamSlot(cid)}
            >
              <Text style={[styles.slotBtnText, selectedJamSlot === cid && styles.slotBtnTextActive]}>
                {cid}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={styles.triggerBtnAmber}
          onPress={() => simulatePhysicalJam(selectedJamSlot)}
        >
          <Text style={styles.triggerBtnText}>Trigger Jam Event (Slot {selectedJamSlot})</Text>
        </TouchableOpacity>
      </View>

      {/* Live JSON Packet Inspector */}
      <View style={styles.packetHeaderRow}>
        <Text style={styles.sectionHeader}>Bi-Directional JSON Inspector</Text>
        <TouchableOpacity onPress={clearPacketLogs}>
          <Text style={styles.clearLogsText}>Clear</Text>
        </TouchableOpacity>
      </View>

      {jsonPackets.length === 0 ? (
        <View style={styles.emptyPacketBox}>
          <Text style={styles.emptyText}>No JSON packets recorded yet. Trigger a dispense above.</Text>
        </View>
      ) : (
        jsonPackets.map((pkt) => {
          const isOutbound = pkt.direction === 'OUTBOUND';
          return (
            <View key={pkt.id} style={styles.packetCard}>
              <View style={styles.packetTop}>
                <View
                  style={[
                    styles.directionBadge,
                    isOutbound ? { backgroundColor: '#f0fdfa' } : { backgroundColor: '#ecfdf5' },
                  ]}
                >
                  <Text
                    style={[
                      styles.directionText,
                      isOutbound ? { color: '#0d9488' } : { color: '#047857' },
                    ]}
                  >
                    {isOutbound ? 'APP -> ESP32' : 'ESP32 -> APP'}
                  </Text>
                </View>
                <Text style={styles.endpointText}>{pkt.endpoint}</Text>
                <Text style={styles.timeText}>{pkt.timestamp}</Text>
              </View>

              <Text style={styles.jsonPayloadText}>
                {JSON.stringify(pkt.payload, null, 2)}
              </Text>
            </View>
          );
        })
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  contentPadding: {
    padding: 16,
    paddingBottom: 30,
  },
  hardwareCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 16,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  mcuIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mcuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  firmwareBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  firmwareText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#0d9488',
  },
  mcuSub: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  telemetryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  telemetryBox: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  telLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginBottom: 2,
  },
  telValue: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f172a',
  },
  connToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  connOnline: {
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
  },
  connOffline: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotGreen: {
    backgroundColor: '#10b981',
  },
  dotRed: {
    backgroundColor: '#ef4444',
  },
  connToggleText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  actionCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 14,
    marginBottom: 12,
  },
  actionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  actionDesc: {
    fontSize: 11,
    color: '#64748b',
    marginBottom: 10,
  },
  slotSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  selectLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  slotBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotBtnActive: {
    backgroundColor: '#10b981',
  },
  slotBtnActiveAmber: {
    backgroundColor: '#f59e0b',
  },
  slotBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#475569',
  },
  slotBtnTextActive: {
    color: '#ffffff',
  },
  triggerBtnGreen: {
    backgroundColor: '#10b981',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  triggerBtnAmber: {
    backgroundColor: '#f59e0b',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  triggerBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
  },
  packetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 8,
  },
  clearLogsText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
  },
  emptyPacketBox: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  packetCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 10,
    marginBottom: 8,
  },
  packetTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  directionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  directionText: {
    fontSize: 9,
    fontWeight: '800',
  },
  endpointText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    fontFamily: 'monospace',
  },
  timeText: {
    fontSize: 10,
    color: '#94a3b8',
  },
  jsonPayloadText: {
    backgroundColor: '#f8fafc',
    padding: 8,
    borderRadius: 8,
    fontSize: 10,
    color: '#0f172a',
    fontFamily: 'monospace',
  },
});
