import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Compartment } from '../types/dispenser';
import { useDispenser } from '../context/DispenserContext';
import { Ionicons } from '@expo/vector-icons';

interface RefillModalProps {
  compartment: Compartment | null;
  onClose: () => void;
}

export const RefillModal: React.FC<RefillModalProps> = ({ compartment, onClose }) => {
  const { refillCompartment, updateCompartmentInfo } = useDispenser();

  if (!compartment) return null;

  return (
    <RefillModalInner
      compartment={compartment}
      onClose={onClose}
      refillCompartment={refillCompartment}
      updateCompartmentInfo={updateCompartmentInfo}
    />
  );
};

const RefillModalInner: React.FC<{
  compartment: Compartment;
  onClose: () => void;
  refillCompartment: (id: import('../types/dispenser').CompartmentId, count: number) => void;
  updateCompartmentInfo: (id: import('../types/dispenser').CompartmentId, info: Partial<Compartment>) => void;
}> = ({ compartment, onClose, refillCompartment, updateCompartmentInfo }) => {
  const [name, setName] = useState(compartment.medicineName);
  const [dosage, setDosage] = useState(compartment.dosage);
  const [count, setCount] = useState<number>(compartment.pillCount);
  const maxCap = compartment.maxCapacity;

  const handleSave = () => {
    updateCompartmentInfo(compartment.id, {
      medicineName: name.trim() || compartment.medicineName,
      dosage: dosage.trim() || compartment.dosage,
    });
    refillCompartment(compartment.id, count);
    onClose();
  };

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{compartment.id}</Text>
              </View>
              <View>
                <Text style={styles.title}>Refill Slot {compartment.id}</Text>
                <Text style={styles.subtitle}>Inventory & Medication Details</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.formArea}>
            <Text style={styles.inputLabel}>Medicine Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Amoxicillin"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>Dosage Description</Text>
            <TextInput
              value={dosage}
              onChangeText={setDosage}
              placeholder="e.g. 500 mg (1 Capsule)"
              style={styles.textInput}
            />

            {/* Stepper Card */}
            <View style={styles.stepperCard}>
              <Text style={styles.stepperTitle}>Pill Count (Current)</Text>
              <Text style={styles.maxCapText}>Max Capacity: {maxCap} pills</Text>

              <View style={styles.counterRow}>
                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setCount((c) => Math.max(0, c - 1))}
                >
                  <Text style={styles.counterBtnText}>-</Text>
                </TouchableOpacity>

                <Text style={styles.countNumber}>{count}</Text>

                <TouchableOpacity
                  style={styles.counterBtn}
                  onPress={() => setCount((c) => Math.min(maxCap, c + 1))}
                >
                  <Text style={styles.counterBtnText}>+</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickAddRow}>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => setCount((c) => Math.min(maxCap, c + 5))}
                >
                  <Text style={styles.quickBtnText}>+5</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.quickBtn}
                  onPress={() => setCount((c) => Math.min(maxCap, c + 10))}
                >
                  <Text style={styles.quickBtnText}>+10</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.quickBtn, styles.quickBtnFull]}
                  onPress={() => setCount(maxCap)}
                >
                  <Text style={[styles.quickBtnText, { color: '#0d9488', fontWeight: '800' }]}>
                    Full ({maxCap})
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Update Inventory</Text>
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
  badge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#0d9488',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#ffffff',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748b',
  },
  closeBtn: {
    padding: 6,
  },
  formArea: {
    paddingTop: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 6,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  stepperCard: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 16,
    padding: 14,
    marginTop: 6,
    alignItems: 'center',
  },
  stepperTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  maxCapText: {
    fontSize: 11,
    color: '#94a3b8',
    marginBottom: 8,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginVertical: 4,
  },
  counterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterBtnText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#334155',
  },
  countNumber: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0d9488',
    minWidth: 50,
    textAlign: 'center',
  },
  quickAddRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    width: '100%',
  },
  quickBtn: {
    flex: 1,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    alignItems: 'center',
  },
  quickBtnFull: {
    backgroundColor: '#f0fdfa',
    borderColor: '#99f6e4',
  },
  quickBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 16,
    marginTop: 12,
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
