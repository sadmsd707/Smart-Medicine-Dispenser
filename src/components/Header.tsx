import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispenser } from '../context/DispenserContext';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface HeaderProps {
  onOpenCaretaker: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenCaretaker }) => {
  const { telemetry } = useDispenser();
  const isOnline = telemetry.status === 'ONLINE';

  return (
    <View style={styles.headerContainer}>
      <View style={styles.brandRow}>
        <View style={styles.logoBadge}>
          <MaterialCommunityIcons name="pill" size={22} color="#ffffff" />
        </View>
        <View style={styles.titleColumn}>
          <View style={styles.nameRow}>
            <Text style={styles.appName}>SmartMed </Text>
            <Text style={styles.appBadge}>IoT Android</Text>
          </View>
          <Text style={styles.authorSubtitle}>By Shivraj Deshmukh</Text>
        </View>
      </View>

      <View style={styles.rightActions}>
        {/* Hardware Status Pill */}
        <View style={styles.statusPill}>
          <View style={[styles.dot, isOnline ? styles.onlineDot : styles.offlineDot]} />
          <Text style={styles.statusText}>{isOnline ? 'ESP32' : 'Offline'}</Text>
          <Text style={styles.batteryText}>{telemetry.batteryLevel}%</Text>
        </View>

        {/* Caretaker Quick Button */}
        <TouchableOpacity style={styles.caretakerBtn} onPress={onOpenCaretaker}>
          <Ionicons name="person-circle-outline" size={24} color="#0d9488" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleColumn: {
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  appName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  appBadge: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d9488',
  },
  authorSubtitle: {
    fontSize: 11,
    fontWeight: '500',
    color: '#64748b',
    marginTop: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#f1f5f9',
    gap: 5,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  onlineDot: {
    backgroundColor: '#10b981',
  },
  offlineDot: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
  },
  batteryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#0d9488',
    marginLeft: 2,
  },
  caretakerBtn: {
    padding: 4,
  },
});
