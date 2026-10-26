import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Compartment } from '../types/dispenser';
import { useDispenser } from '../context/DispenserContext';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

interface CompartmentCardProps {
  compartment: Compartment;
  onOpenSchedule: (compartment: Compartment) => void;
  onOpenRefill: (compartment: Compartment) => void;
}

export const CompartmentCard: React.FC<CompartmentCardProps> = ({
  compartment,
  onOpenSchedule,
  onOpenRefill,
}) => {
  const { dispenseNow, isDispensing, debounceCooldown } = useDispenser();

  const isCurrentDispensing = isDispensing[compartment.id];
  const cooldownSecs = debounceCooldown[compartment.id];
  const isDebounced = cooldownSecs > 0;
  const isLowStock = compartment.pillCount <= compartment.lowStockThreshold;
  const isCriticalEmpty = compartment.pillCount === 0;

  // Color theme definitions - strictly Emerald, Teal, Amber, and Orange (NO BLUE, NO VIOLET)
  const themeColors = {
    A: { primary: '#10b981', light: '#ecfdf5', border: '#a7f3d0' },
    B: { primary: '#0d9488', light: '#f0fdfa', border: '#99f6e4' },
    C: { primary: '#f59e0b', light: '#fffbeb', border: '#fde68a' },
    D: { primary: '#ea580c', light: '#fff7ed', border: '#fed7aa' },
  }[compartment.id];

  const fillPercentage = Math.min(100, Math.round((compartment.pillCount / compartment.maxCapacity) * 100));

  const enabledSchedules = compartment.schedules.filter((s) => s.enabled);
  const nextTimeDisplay =
    enabledSchedules.length > 0
      ? enabledSchedules
          .map((s) => {
            const [h, m] = s.time.split(':').map(Number);
            const period = h >= 12 ? 'PM' : 'AM';
            const hr12 = h % 12 || 12;
            return `${hr12}:${m < 10 ? '0' : ''}${m} ${period}`;
          })
          .join(', ')
      : 'No active schedule';

  return (
    <View style={[styles.cardContainer, { borderColor: isCurrentDispensing ? '#0d9488' : '#e2e8f0' }]}>
      
      {/* Top Header: Slot ID + Medicine Name + Status Badge */}
      <View style={styles.headerRow}>
        <View style={styles.slotIdentifier}>
          <View style={[styles.slotBadge, { backgroundColor: themeColors.primary }]}>
            <Text style={styles.slotText}>{compartment.id}</Text>
          </View>
          <View>
            <Text style={styles.slotSub}>SLOT {compartment.id}</Text>
            <Text style={styles.medicineName}>{compartment.medicineName}</Text>
          </View>
        </View>

        {/* Status Pill */}
        <View style={styles.statusBadgeContainer}>
          {isCurrentDispensing ? (
            <View style={[styles.statusBadge, { backgroundColor: '#f0fdfa' }]}>
              <ActivityIndicator size="small" color="#0d9488" />
              <Text style={[styles.statusBadgeText, { color: '#0d9488' }]}>Dispensing</Text>
            </View>
          ) : isCriticalEmpty ? (
            <View style={[styles.statusBadge, { backgroundColor: '#fee2e2' }]}>
              <Text style={[styles.statusBadgeText, { color: '#dc2626' }]}>Empty</Text>
            </View>
          ) : isLowStock ? (
            <View style={[styles.statusBadge, { backgroundColor: '#fef3c7' }]}>
              <Text style={[styles.statusBadgeText, { color: '#b45309' }]}>Low Stock</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: '#ecfdf5' }]}>
              <Ionicons name="checkmark-circle" size={12} color="#10b981" />
              <Text style={[styles.statusBadgeText, { color: '#047857' }]}>Ready</Text>
            </View>
          )}
        </View>
      </View>

      {/* Dosage Details */}
      <View style={styles.dosageRow}>
        <MaterialCommunityIcons name="pill" size={14} color="#64748b" />
        <Text style={styles.dosageText}>
          Dosage: <Text style={styles.dosageHighlight}>{compartment.dosage}</Text>
        </Text>
      </View>

      {/* Pill Capacity Progress */}
      <View style={styles.capacitySection}>
        <View style={styles.capacityLabels}>
          <Text style={styles.capacityTitle}>Pill Inventory</Text>
          <Text style={styles.capacityValue}>
            <Text style={{ fontWeight: '800', color: isLowStock ? '#b45309' : '#0f172a' }}>
              {compartment.pillCount}
            </Text>
            <Text style={{ color: '#94a3b8' }}> / {compartment.maxCapacity} pills</Text>
          </Text>
        </View>

        <View style={styles.progressBarBackground}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${fillPercentage}%`,
                backgroundColor: isCriticalEmpty ? '#ef4444' : isLowStock ? '#f59e0b' : themeColors.primary,
              },
            ]}
          />
        </View>
      </View>

      {/* Schedule Info Box */}
      <View style={styles.scheduleBox}>
        <View style={styles.scheduleHeader}>
          <View style={styles.clockRow}>
            <Ionicons name="time-outline" size={13} color="#64748b" />
            <Text style={styles.scheduleTitle}>Next Schedule</Text>
          </View>
          <Text style={styles.scheduleDoseCount}>{enabledSchedules.length} doses/day</Text>
        </View>
        <Text style={styles.scheduleTimeText} numberOfLines={1}>
          {nextTimeDisplay}
        </Text>
      </View>

      {/* Dispense Now Button with Debounce Protection */}
      <TouchableOpacity
        style={[
          styles.dispenseButton,
          {
            backgroundColor: isDebounced || isCriticalEmpty ? '#cbd5e1' : themeColors.primary,
          },
        ]}
        onPress={() => dispenseNow(compartment.id)}
        disabled={isCurrentDispensing || isDebounced || isCriticalEmpty}
      >
        {isCurrentDispensing ? (
          <View style={styles.btnRow}>
            <ActivityIndicator size="small" color="#ffffff" />
            <Text style={styles.dispenseBtnText}>Dispensing Unit...</Text>
          </View>
        ) : isDebounced ? (
          <View style={styles.btnRow}>
            <Ionicons name="lock-closed" size={14} color="#64748b" />
            <Text style={[styles.dispenseBtnText, { color: '#64748b' }]}>
              Cooldown Active ({cooldownSecs}s)
            </Text>
          </View>
        ) : isCriticalEmpty ? (
          <Text style={[styles.dispenseBtnText, { color: '#64748b' }]}>Refill Required</Text>
        ) : (
          <View style={styles.btnRow}>
            <FontAwesome5 name="hand-holding-medical" size={13} color="#ffffff" />
            <Text style={styles.dispenseBtnText}>Dispense Now (Override)</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Secondary Actions: Schedule & Refill */}
      <View style={styles.secondaryRow}>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => onOpenSchedule(compartment)}
        >
          <Ionicons name="calendar-outline" size={14} color="#334155" />
          <Text style={styles.secondaryBtnText}>Schedule</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => onOpenRefill(compartment)}
        >
          <Ionicons name="add-circle-outline" size={14} color="#334155" />
          <Text style={styles.secondaryBtnText}>Refill</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  slotIdentifier: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  slotBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  slotSub: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 0.5,
  },
  medicineName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: -1,
  },
  statusBadgeContainer: {},
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  dosageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f8fafc',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    marginBottom: 12,
  },
  dosageText: {
    fontSize: 12,
    color: '#64748b',
  },
  dosageHighlight: {
    fontWeight: '700',
    color: '#1e293b',
  },
  capacitySection: {
    marginBottom: 12,
  },
  capacityLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  capacityTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  capacityValue: {
    fontSize: 12,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  scheduleBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    padding: 10,
    marginBottom: 12,
  },
  scheduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  clockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  scheduleTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748b',
  },
  scheduleDoseCount: {
    fontSize: 10,
    fontWeight: '700',
    color: '#0d9488',
  },
  scheduleTimeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  dispenseButton: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dispenseBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#ffffff',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
  },
  secondaryBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
});
