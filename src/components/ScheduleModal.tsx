import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Compartment, DayOfWeek, MealRelation, ScheduleItem } from '../types/dispenser';
import { useDispenser } from '../context/DispenserContext';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface ScheduleModalProps {
  compartment: Compartment | null;
  onClose: () => void;
}

const ALL_DAYS: DayOfWeek[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const ScheduleModal: React.FC<ScheduleModalProps> = ({ compartment, onClose }) => {
  const { updateSchedules } = useDispenser();

  if (!compartment) return null;

  return <ScheduleModalInner compartment={compartment} onClose={onClose} updateSchedules={updateSchedules} />;
};

const ScheduleModalInner: React.FC<{
  compartment: Compartment;
  onClose: () => void;
  updateSchedules: (id: import('../types/dispenser').CompartmentId, s: ScheduleItem[]) => void;
}> = ({ compartment, onClose, updateSchedules }) => {
  const [schedules, setSchedules] = useState<ScheduleItem[]>(
    JSON.parse(JSON.stringify(compartment.schedules))
  );

  const [hour, setHour] = useState<number>(8);
  const [minute, setMinute] = useState<number>(0);
  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [everyday, setEveryday] = useState<boolean>(true);
  const [days, setDays] = useState<DayOfWeek[]>([...ALL_DAYS]);
  const [mealRelation, setMealRelation] = useState<MealRelation>('after');

  const toggleDay = (d: DayOfWeek) => {
    if (days.includes(d)) {
      if (days.length > 1) {
        const next = days.filter((x) => x !== d);
        setDays(next);
        setEveryday(false);
      }
    } else {
      const next = [...days, d];
      setDays(next);
      if (next.length === 7) setEveryday(true);
    }
  };

  const handleSetEveryday = () => {
    setEveryday(true);
    setDays([...ALL_DAYS]);
  };

  const handleSetWeekdays = () => {
    setEveryday(false);
    setDays(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
  };

  const handleAddDose = () => {
    let hr24 = hour;
    if (period === 'PM' && hr24 < 12) hr24 += 12;
    if (period === 'AM' && hr24 === 12) hr24 = 0;
    const timeFormatted = `${hr24 < 10 ? '0' : ''}${hr24}:${minute < 10 ? '0' : ''}${minute}`;

    const newItem: ScheduleItem = {
      id: `sch-${compartment.id}-${Date.now()}`,
      time: timeFormatted,
      days: everyday ? [...ALL_DAYS] : days,
      everyday,
      mealRelation,
      enabled: true,
    };

    setSchedules([...schedules, newItem]);
  };

  const removeSchedule = (id: string) => {
    setSchedules(schedules.filter((s) => s.id !== id));
  };

  const toggleScheduleEnabled = (id: string) => {
    setSchedules(schedules.map((s) => (s.id === id ? { ...s, enabled: !s.enabled } : s)));
  };

  const handleSave = () => {
    updateSchedules(compartment.id, schedules);
    onClose();
  };

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.modalBadge}>
                <Text style={styles.modalBadgeText}>{compartment.id}</Text>
              </View>
              <View>
                <Text style={styles.modalTitle}>Slot {compartment.id} Schedules</Text>
                <Text style={styles.modalSub}>{compartment.medicineName} ({compartment.dosage})</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
            {/* Active Timings List */}
            <Text style={styles.sectionHeader}>Active Dose Timings ({schedules.length})</Text>
            {schedules.length === 0 ? (
              <View style={styles.emptyBox}>
                <Text style={styles.emptyText}>No dose times set yet. Add a dose below.</Text>
              </View>
            ) : (
              schedules.map((sch) => {
                const [h, m] = sch.time.split(':').map(Number);
                const isPM = h >= 12;
                const hr12 = h % 12 || 12;

                return (
                  <View key={sch.id} style={styles.scheduleItem}>
                    <TouchableOpacity
                      style={styles.checkRow}
                      onPress={() => toggleScheduleEnabled(sch.id)}
                    >
                      <Ionicons
                        name={sch.enabled ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={sch.enabled ? '#0d9488' : '#94a3b8'}
                      />
                      <View style={{ marginLeft: 8 }}>
                        <Text style={[styles.schTime, !sch.enabled && { color: '#94a3b8' }]}>
                          {hr12}:{m < 10 ? '0' : ''}{m} {isPM ? 'PM' : 'AM'}
                        </Text>
                        <Text style={styles.schDays}>
                          {sch.everyday ? 'Everyday' : sch.days.join(', ')} •{' '}
                          {sch.mealRelation === 'after'
                            ? 'After meal'
                            : sch.mealRelation === 'before'
                            ? 'Before meal'
                            : sch.mealRelation === 'with'
                            ? 'With food'
                            : 'No food limit'}
                        </Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => removeSchedule(sch.id)}>
                      <Ionicons name="trash-outline" size={18} color="#e11d48" />
                    </TouchableOpacity>
                  </View>
                );
              })
            )}

            {/* Add New Dose Section */}
            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Add New Dose Timing</Text>

            {/* Time Controls */}
            <View style={styles.timeControlRow}>
              <View style={styles.timePickerContainer}>
                {/* Hour */}
                <View style={styles.stepperBox}>
                  <TouchableOpacity
                    onPress={() => setHour((h) => (h === 1 ? 12 : h - 1))}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeDigit}>{hour < 10 ? `0${hour}` : hour}</Text>
                  <TouchableOpacity
                    onPress={() => setHour((h) => (h === 12 ? 1 : h + 1))}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.timeColon}>:</Text>

                {/* Minute */}
                <View style={styles.stepperBox}>
                  <TouchableOpacity
                    onPress={() => setMinute((m) => (m === 0 ? 45 : m - 15))}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.timeDigit}>{minute < 10 ? `0${minute}` : minute}</Text>
                  <TouchableOpacity
                    onPress={() => setMinute((m) => (m === 45 ? 0 : m + 15))}
                    style={styles.stepBtn}
                  >
                    <Text style={styles.stepBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* AM / PM Toggle */}
              <View style={styles.periodToggle}>
                <TouchableOpacity
                  style={[styles.periodBtn, period === 'AM' && styles.periodActive]}
                  onPress={() => setPeriod('AM')}
                >
                  <Text style={[styles.periodText, period === 'AM' && styles.periodTextActive]}>
                    AM
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.periodBtn, period === 'PM' && styles.periodActive]}
                  onPress={() => setPeriod('PM')}
                >
                  <Text style={[styles.periodText, period === 'PM' && styles.periodTextActive]}>
                    PM
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Meal Relation Selector */}
            <Text style={styles.fieldLabel}>Meal Relation</Text>
            <View style={styles.mealRow}>
              {(['after', 'before', 'with', 'none'] as MealRelation[]).map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.mealBtn, mealRelation === m && styles.mealBtnActive]}
                  onPress={() => setMealRelation(m)}
                >
                  <Text style={[styles.mealBtnText, mealRelation === m && styles.mealBtnTextActive]}>
                    {m === 'after' ? 'After Food' : m === 'before' ? 'Before Food' : m === 'with' ? 'With Food' : 'Any'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recurrence Days */}
            <View style={styles.recurrenceHeader}>
              <Text style={styles.fieldLabel}>Recurrence Days</Text>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.presetBtn, everyday && styles.presetBtnActive]}
                  onPress={handleSetEveryday}
                >
                  <Text style={[styles.presetText, everyday && styles.presetTextActive]}>Everyday</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.presetBtn} onPress={handleSetWeekdays}>
                  <Text style={styles.presetText}>Weekdays</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.daysGrid}>
              {ALL_DAYS.map((d) => {
                const active = days.includes(d);
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.dayPill, active && styles.dayPillActive]}
                    onPress={() => toggleDay(d)}
                  >
                    <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Add Button */}
            <TouchableOpacity style={styles.addDoseBtn} onPress={handleAddDose}>
              <Ionicons name="add" size={18} color="#0d9488" />
              <Text style={styles.addDoseBtnText}>Add Dose Timing to List</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save & Sync</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 24,
    maxHeight: '88%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBadgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  modalSub: {
    fontSize: 12,
    color: '#64748b',
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    paddingTop: 14,
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: '#64748b',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  emptyBox: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    marginBottom: 8,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  schTime: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a',
  },
  schDays: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 1,
  },
  timeControlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  timePickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingHorizontal: 4,
  },
  stepBtn: {
    width: 28,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
  },
  timeDigit: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    paddingHorizontal: 4,
  },
  timeColon: {
    fontSize: 20,
    fontWeight: '900',
    color: '#94a3b8',
  },
  periodToggle: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 3,
  },
  periodBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  periodActive: {
    backgroundColor: '#0d9488',
  },
  periodText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b',
  },
  periodTextActive: {
    color: '#ffffff',
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
  },
  mealRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 14,
  },
  mealBtn: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
  },
  mealBtnActive: {
    backgroundColor: '#0d9488',
  },
  mealBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  mealBtnTextActive: {
    color: '#ffffff',
  },
  recurrenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  presetBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: '#f1f5f9',
  },
  presetBtnActive: {
    backgroundColor: '#0d9488',
  },
  presetText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
  presetTextActive: {
    color: '#ffffff',
  },
  daysGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  dayPill: {
    width: 40,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: '#0d9488',
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
  },
  dayPillTextActive: {
    color: '#ffffff',
  },
  addDoseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#f0fdfa',
    borderWidth: 1,
    borderColor: '#99f6e4',
    marginBottom: 20,
  },
  addDoseBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0d9488',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#0d9488',
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
});
