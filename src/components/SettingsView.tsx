import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { useDispenser } from '../context/DispenserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings } = useDispenser();

  const [espIp, setEspIp] = useState(settings.esp32IpAddress);
  const [firebaseUrl, setFirebaseUrl] = useState(settings.firebaseUrl);
  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [missedWindow, setMissedWindow] = useState(settings.missedWindowMinutes);
  const [vibrate, setVibrate] = useState(settings.vibrateEnabled);

  const handleSave = () => {
    updateSettings({
      esp32IpAddress: espIp,
      firebaseUrl,
      apiKey,
      missedWindowMinutes: missedWindow,
      vibrateEnabled: vibrate,
    });
    Alert.alert('Settings Saved', 'System configurations updated successfully.');
  };

  const handleResetData = () => {
    Alert.alert(
      'Reset Demo State',
      'Are you sure you want to restore default mock medicine inventory and logs?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.clear();
            Alert.alert('Reset Complete', 'Please restart the app to see fresh initial data.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentPadding}>
      
      {/* Grace Window Box */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Ionicons name="time-outline" size={18} color="#0d9488" />
          <Text style={styles.cardTitle}>Missed Dose Grace Window</Text>
        </View>
        <Text style={styles.cardDesc}>
          If an acknowledgment or IR sensor drop is not recorded within this window after scheduled time, the dose is marked as &quot;Missed&quot; and an emergency alert is triggered.
        </Text>

        <View style={styles.windowRow}>
          {[15, 30, 45, 60].map((mins) => (
            <TouchableOpacity
              key={mins}
              style={[styles.minBtn, missedWindow === mins && styles.minBtnActive]}
              onPress={() => setMissedWindow(mins)}
            >
              <Text style={[styles.minBtnText, missedWindow === mins && styles.minBtnTextActive]}>
                {mins} min{mins === 30 ? ' (Standard)' : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Gateway & Cloud Sync */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <MaterialCommunityIcons name="wifi-cog" size={18} color="#10b981" />
          <Text style={styles.cardTitle}>ESP32 Gateway & Firebase Sync</Text>
        </View>

        <Text style={styles.inputLabel}>ESP32 Local Gateway IP</Text>
        <TextInput
          value={espIp}
          onChangeText={setEspIp}
          placeholder="192.168.1.100"
          style={styles.textInput}
        />

        <Text style={styles.inputLabel}>Firebase Realtime Database URL</Text>
        <TextInput
          value={firebaseUrl}
          onChangeText={setFirebaseUrl}
          placeholder="https://your-app-default-rtdb.firebaseio.com"
          style={styles.textInput}
        />

        <Text style={styles.inputLabel}>Database Web API Key</Text>
        <TextInput
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="API Key"
          secureTextEntry={true}
          style={styles.textInput}
        />
      </View>

      {/* Hardware Haptic Vibration */}
      <View style={[styles.card, styles.rowBetween]}>
        <View>
          <Text style={styles.cardTitle}>Haptic Vibration Feedback</Text>
          <Text style={styles.cardDesc}>Vibrate phone during motor actuation & alerts</Text>
        </View>
        <Switch
          value={vibrate}
          onValueChange={setVibrate}
          trackColor={{ false: '#cbd5e1', true: '#99f6e4' }}
          thumbColor={vibrate ? '#0d9488' : '#f8fafc'}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveBtnText}>Save Configurations</Text>
      </TouchableOpacity>

      {/* Official Ownership, License & Intellectual Property Notice */}
      <View style={styles.ipCard}>
        <View style={styles.ipHeader}>
          <Ionicons name="ribbon-outline" size={20} color="#0d9488" />
          <Text style={styles.ipTitle}>Intellectual Property & Ownership</Text>
        </View>

        <View style={styles.ipDetailsBox}>
          <Text style={styles.ipRow}>
            <Text style={styles.ipLabel}>Inventor & Author: </Text>
            <Text style={styles.ipValue}>Shivraj Deshmukh</Text>
          </Text>
          <Text style={styles.ipRow}>
            <Text style={styles.ipLabel}>Application: </Text>
            <Text style={styles.ipValue}>Smart Medicine Dispenser (Android)</Text>
          </Text>
          <Text style={styles.ipRow}>
            <Text style={styles.ipLabel}>Copyright: </Text>
            <Text style={styles.ipValue}>© 2026 Shivraj Deshmukh. All Rights Reserved.</Text>
          </Text>
          <Text style={styles.ipRow}>
            <Text style={styles.ipLabel}>License: </Text>
            <Text style={styles.ipValue}>Strict Proprietary & Confidential</Text>
          </Text>
          <Text style={styles.ipWarning}>
            All software algorithms, circuit architecture, ESP32 telemetry schemas, and hardware designs are the exclusive intellectual property of Shivraj Deshmukh. Unauthorized copying, distribution, or commercial use is strictly prohibited.
          </Text>
        </View>

        <TouchableOpacity style={styles.resetBtn} onPress={handleResetData}>
          <Ionicons name="refresh" size={14} color="#e11d48" />
          <Text style={styles.resetBtnText}>Reset Demo State</Text>
        </TouchableOpacity>
      </View>
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
    paddingBottom: 34,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  cardDesc: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 16,
    marginBottom: 10,
  },
  windowRow: {
    flexDirection: 'row',
    gap: 6,
  },
  minBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
  },
  minBtnActive: {
    backgroundColor: '#0d9488',
  },
  minBtnText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#475569',
  },
  minBtnTextActive: {
    color: '#ffffff',
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    marginTop: 6,
  },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  rowBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  saveBtn: {
    backgroundColor: '#0d9488',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#ffffff',
  },
  ipCard: {
    backgroundColor: '#ffffff',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    padding: 16,
  },
  ipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  ipTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0f172a',
  },
  ipDetailsBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 4,
  },
  ipRow: {
    fontSize: 12,
    lineHeight: 18,
  },
  ipLabel: {
    fontWeight: '700',
    color: '#334155',
  },
  ipValue: {
    fontWeight: '700',
    color: '#0d9488',
  },
  ipWarning: {
    fontSize: 11,
    color: '#64748b',
    lineHeight: 15,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 6,
  },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
  },
  resetBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e11d48',
  },
});
