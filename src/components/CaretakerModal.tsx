import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  Linking,
  Alert,
} from 'react-native';
import { useDispenser } from '../context/DispenserContext';
import { CaretakerProfile } from '../types/dispenser';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';

interface CaretakerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CaretakerModal: React.FC<CaretakerModalProps> = ({ isOpen, onClose }) => {
  const { caretaker, updateCaretaker, notifyCaretakerForMissed } = useDispenser();

  if (!isOpen) return null;

  return (
    <CaretakerModalInner
      caretaker={caretaker}
      onClose={onClose}
      updateCaretaker={updateCaretaker}
      notifyCaretakerForMissed={notifyCaretakerForMissed}
    />
  );
};

const CaretakerModalInner: React.FC<{
  caretaker: CaretakerProfile;
  onClose: () => void;
  updateCaretaker: (p: CaretakerProfile) => void;
  notifyCaretakerForMissed: () => Promise<boolean>;
}> = ({ caretaker, onClose, updateCaretaker, notifyCaretakerForMissed }) => {
  const [form, setForm] = useState<CaretakerProfile>({ ...caretaker });

  const handleSave = () => {
    updateCaretaker(form);
    Alert.alert('Contact Saved', `Emergency notifications configured for ${form.name}.`);
    onClose();
  };

  const handleCall = () => {
    Linking.openURL(`tel:${form.phone}`).catch(() => {
      Alert.alert('Calling', `Simulating direct call to ${form.phone}`);
    });
  };

  const handleSendTestAlert = async () => {
    await notifyCaretakerForMissed();
  };

  return (
    <Modal visible={true} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.badge}>
                <Ionicons name="person" size={18} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.title}>Caretaker & Emergency</Text>
                <Text style={styles.subtitle}>Automated alert recipient for missed doses</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.formArea}>
            <Text style={styles.inputLabel}>Full Name / Title</Text>
            <TextInput
              value={form.name}
              onChangeText={(v) => setForm({ ...form, name: v })}
              placeholder="e.g. Dr. Ramesh Deshmukh"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>Phone Number (SMS & Calls)</Text>
            <TextInput
              value={form.phone}
              onChangeText={(v) => setForm({ ...form, phone: v })}
              placeholder="+91 98220 12345"
              keyboardType="phone-pad"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>Relationship</Text>
            <TextInput
              value={form.relation}
              onChangeText={(v) => setForm({ ...form, relation: v })}
              placeholder="Family Physician / Daughter"
              style={styles.textInput}
            />

            <Text style={styles.inputLabel}>Email Address</Text>
            <TextInput
              value={form.email}
              onChangeText={(v) => setForm({ ...form, email: v })}
              placeholder="care.deshmukh@example.com"
              keyboardType="email-address"
              style={styles.textInput}
            />

            {/* Emergency Action Buttons */}
            <View style={styles.emergencyCard}>
              <Text style={styles.emerTitle}>Emergency Actions</Text>
              <View style={styles.emerRow}>
                <TouchableOpacity style={styles.callBtn} onPress={handleCall}>
                  <Ionicons name="call" size={14} color="#ffffff" />
                  <Text style={styles.btnTextWhite}>Call Caretaker</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.testAlertBtn} onPress={handleSendTestAlert}>
                  <Ionicons name="notifications" size={14} color="#ffffff" />
                  <Text style={styles.btnTextWhite}>Send Test Alert</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.footerRow}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Contact</Text>
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
    marginBottom: 4,
    marginTop: 4,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  emergencyCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
  },
  emerTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 8,
  },
  emerRow: {
    flexDirection: 'row',
    gap: 8,
  },
  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#10b981',
  },
  testAlertBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: '#e11d48',
  },
  btnTextWhite: {
    fontSize: 12,
    fontWeight: '700',
    color: '#ffffff',
  },
  footerRow: {
    flexDirection: 'row',
    gap: 10,
    paddingTop: 14,
    marginTop: 10,
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
