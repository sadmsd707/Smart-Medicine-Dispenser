import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useDispenser } from '../context/DispenserContext';
import { CompartmentId, DoseStatus } from '../types/dispenser';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export const AdherenceView: React.FC<{ onOpenCaretaker: () => void }> = ({ onOpenCaretaker }) => {
  const { logs, notifyCaretakerForMissed } = useDispenser();

  const [filterSlot, setFilterSlot] = useState<'ALL' | CompartmentId>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | DoseStatus>('ALL');

  const totalCount = logs.length;
  const takenCount = logs.filter((l) => l.status === 'Taken').length;
  const missedCount = logs.filter((l) => l.status === 'Missed').length;
  const adherenceRate = totalCount > 0 ? Math.round((takenCount / (takenCount + missedCount || 1)) * 100) : 100;

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchComp = filterSlot === 'ALL' || log.compartmentId === filterSlot;
      const matchStatus = filterStatus === 'ALL' || log.status === filterStatus;
      return matchComp && matchStatus;
    });
  }, [logs, filterSlot, filterStatus]);

  const handleExportSummary = () => {
    Alert.alert(
      'Medical Summary Ready',
      `Adherence Rate: ${adherenceRate}%\nDoses Taken: ${takenCount}\nDoses Missed: ${missedCount}\nTotal Events: ${totalCount}\n\nClinical report formatted for patient consultation.`
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
      
      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Adherence</Text>
          <Text style={styles.metricBig}>{adherenceRate}%</Text>
          <View style={styles.rateBarBg}>
            <View style={[styles.rateBarFill, { width: `${adherenceRate}%` }]} />
          </View>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Doses Taken</Text>
          <Text style={[styles.metricBig, { color: '#10b981' }]}>{takenCount}</Text>
          <Text style={styles.metricSub}>IR verified</Text>
        </View>

        <View style={styles.metricCard}>
          <Text style={styles.metricLabel}>Missed</Text>
          <Text style={[styles.metricBig, { color: '#e11d48' }]}>{missedCount}</Text>
          <Text style={styles.metricSub}>&gt;30m window</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {(['ALL', 'Taken', 'Missed'] as const).map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.filterPill, filterStatus === s && styles.filterPillActive]}
              onPress={() => setFilterStatus(s)}
            >
              <Text style={[styles.filterText, filterStatus === s && styles.filterTextActive]}>
                {s}
              </Text>
            </TouchableOpacity>
          ))}

          <View style={styles.filterDivider} />

          {(['ALL', 'A', 'B', 'C', 'D'] as const).map((c) => (
            <TouchableOpacity
              key={c}
              style={[styles.filterPill, filterSlot === c && styles.filterPillActive]}
              onPress={() => setFilterSlot(c)}
            >
              <Text style={[styles.filterText, filterSlot === c && styles.filterTextActive]}>
                {c === 'ALL' ? 'All Slots' : `Slot ${c}`}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Audit Log Header */}
      <View style={styles.logHeaderRow}>
        <Text style={styles.logSectionTitle}>Chronological Adherence Records</Text>
        <TouchableOpacity style={styles.exportBtn} onPress={handleExportSummary}>
          <Ionicons name="document-text-outline" size={14} color="#0d9488" />
          <Text style={styles.exportBtnText}>Summary</Text>
        </TouchableOpacity>
      </View>

      {/* Log Items List */}
      {filteredLogs.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>No records match current filter.</Text>
        </View>
      ) : (
        filteredLogs.map((log) => {
          const timeFormatted = new Date(log.scheduledTime).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          });
          const dateFormatted = new Date(log.scheduledTime).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
          });

          const isTaken = log.status === 'Taken';
          const isMissed = log.status === 'Missed';

          return (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logLeft}>
                <View style={styles.slotTag}>
                  <Text style={styles.slotTagText}>{log.compartmentId}</Text>
                </View>
                <View>
                  <Text style={styles.medicineTitle}>{log.medicineName}</Text>
                  <Text style={styles.dosageInfo}>
                    {timeFormatted} • {dateFormatted} ({log.dosage})
                  </Text>
                </View>
              </View>

              <View style={styles.logRight}>
                <View
                  style={[
                    styles.statusPill,
                    isTaken && { backgroundColor: '#ecfdf5' },
                    isMissed && { backgroundColor: '#fee2e2' },
                    !isTaken && !isMissed && { backgroundColor: '#fef3c7' },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusPillText,
                      isTaken && { color: '#047857' },
                      isMissed && { color: '#b91c1c' },
                      !isTaken && !isMissed && { color: '#b45309' },
                    ]}
                  >
                    {log.status}
                  </Text>
                </View>

                {log.sensorConfirmed && (
                  <View style={styles.sensorBadge}>
                    <Ionicons name="shield-checkmark" size={10} color="#0d9488" />
                    <Text style={styles.sensorBadgeText}>IR Drop</Text>
                  </View>
                )}

                {isMissed && !log.caretakerNotified && (
                  <TouchableOpacity
                    style={styles.alertCaretakerBtn}
                    onPress={() => notifyCaretakerForMissed(log.id)}
                  >
                    <Ionicons name="notifications-outline" size={12} color="#ffffff" />
                    <Text style={styles.alertBtnText}>Alert</Text>
                  </TouchableOpacity>
                )}
              </View>
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
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
    marginBottom: 2,
  },
  metricBig: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0f172a',
  },
  metricSub: {
    fontSize: 10,
    color: '#94a3b8',
    marginTop: 2,
  },
  rateBarBg: {
    width: '100%',
    height: 4,
    backgroundColor: '#f1f5f9',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  rateBarFill: {
    height: '100%',
    backgroundColor: '#0d9488',
  },
  filterSection: {
    marginBottom: 14,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginRight: 6,
  },
  filterPillActive: {
    backgroundColor: '#0d9488',
    borderColor: '#0d9488',
  },
  filterText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  filterTextActive: {
    color: '#ffffff',
  },
  filterDivider: {
    width: 1,
    backgroundColor: '#cbd5e1',
    marginHorizontal: 4,
    height: 24,
  },
  logHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  logSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.2,
  },
  exportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#ccfbf1',
  },
  exportBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0d9488',
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyText: {
    fontSize: 13,
    color: '#94a3b8',
  },
  logCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    elevation: 1,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  slotTag: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotTagText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#334155',
  },
  medicineTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  dosageInfo: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '800',
  },
  sensorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sensorBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#0d9488',
  },
  alertCaretakerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e11d48',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 2,
  },
  alertBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#ffffff',
  },
});
