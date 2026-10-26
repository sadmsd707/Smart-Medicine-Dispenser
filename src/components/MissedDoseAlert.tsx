import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispenser } from '../context/DispenserContext';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

interface MissedDoseAlertProps {
  onOpenCaretaker: () => void;
}

export const MissedDoseAlert: React.FC<MissedDoseAlertProps> = ({ onOpenCaretaker }) => {
  const { missedDoses, notifyCaretakerForMissed } = useDispenser();

  if (missedDoses.length === 0) return null;

  const firstMissed = missedDoses[0];
  const schedTime = new Date(firstMissed.scheduledTime).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={styles.bannerContainer}>
      <View style={styles.topRow}>
        <View style={styles.iconBadge}>
          <MaterialIcons name="warning" size={18} color="#ffffff" />
        </View>
        <View style={styles.headerInfo}>
          <Text style={styles.alertTag}>ACTION REQUIRED • 30M GRACE EXPIRED</Text>
          <Text style={styles.title}>
            Missed Dose: Slot {firstMissed.compartmentId} ({firstMissed.medicineName})
          </Text>
        </View>
      </View>

      <Text style={styles.description}>
        Scheduled for {schedTime} ({firstMissed.dosage}). IR sensor did not detect pill drop within 30 minutes.
      </Text>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.notifyButton}
          onPress={() => notifyCaretakerForMissed(firstMissed.id)}
        >
          <Ionicons name="notifications" size={14} color="#ffffff" />
          <Text style={styles.notifyBtnText}>
            {firstMissed.caretakerNotified ? 'Caretaker Notified' : 'Notify Caretaker'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.detailsButton} onPress={onOpenCaretaker}>
          <Text style={styles.detailsBtnText}>Contact Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#fff1f2',
    borderWidth: 1.5,
    borderColor: '#fecdd3',
    elevation: 2,
    shadowColor: '#e11d48',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#e11d48',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  alertTag: {
    fontSize: 10,
    fontWeight: '800',
    color: '#be123c',
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 1,
  },
  description: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
    marginBottom: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  notifyButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#e11d48',
  },
  notifyBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  detailsButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  detailsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
  },
});
