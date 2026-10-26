import React, { useState } from 'react';
import {
  SafeAreaView,
  View,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { DispenserProvider, useDispenser } from './src/context/DispenserContext';
import { Header } from './src/components/Header';
import { MissedDoseAlert } from './src/components/MissedDoseAlert';
import { CompartmentCard } from './src/components/CompartmentCard';
import { ScheduleModal } from './src/components/ScheduleModal';
import { RefillModal } from './src/components/RefillModal';
import { AdherenceView } from './src/components/AdherenceView';
import { Esp32DeckView } from './src/components/Esp32DeckView';
import { CaretakerModal } from './src/components/CaretakerModal';
import { SettingsView } from './src/components/SettingsView';
import { BottomTabs, TabType } from './src/components/BottomTabs';
import { Compartment } from './src/types/dispenser';

function MainAppScreen() {
  const { compartments } = useDispenser();

  const [activeTab, setActiveTab] = useState<TabType>('slots');
  const [selectedScheduleComp, setSelectedScheduleComp] = useState<Compartment | null>(null);
  const [selectedRefillComp, setSelectedRefillComp] = useState<Compartment | null>(null);
  const [isCaretakerOpen, setIsCaretakerOpen] = useState<boolean>(false);

  return (
    <SafeAreaView style={styles.safeContainer}>
      <StatusBar style="dark" backgroundColor="#ffffff" />
      
      {/* Top Header */}
      <Header onOpenCaretaker={() => setIsCaretakerOpen(true)} />

      {/* Missed Dose Alert Banner (Shows when > 30-min window elapsed) */}
      <MissedDoseAlert onOpenCaretaker={() => setIsCaretakerOpen(true)} />

      {/* Tab 1: 4 Compartment Management */}
      {activeTab === 'slots' && (
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent}>
          <View style={styles.subHeaderRow}>
            <Text style={styles.screenTitle}>4 Compartment Slots</Text>
            <Text style={styles.screenSub}>Independent schedules & debounced dispense</Text>
          </View>

          {compartments.map((comp) => (
            <CompartmentCard
              key={comp.id}
              compartment={comp}
              onOpenSchedule={(c) => setSelectedScheduleComp(c)}
              onOpenRefill={(c) => setSelectedRefillComp(c)}
            />
          ))}
        </ScrollView>
      )}

      {/* Tab 2: Adherence & Missed Medicine Tracker */}
      {activeTab === 'adherence' && (
        <AdherenceView onOpenCaretaker={() => setIsCaretakerOpen(true)} />
      )}

      {/* Tab 3: ESP32 Virtual Hardware Deck */}
      {activeTab === 'mcu' && <Esp32DeckView />}

      {/* Tab 4: Settings & Ownership */}
      {activeTab === 'settings' && <SettingsView />}

      {/* Bottom Tabs */}
      <BottomTabs activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Modals */}
      <ScheduleModal
        compartment={selectedScheduleComp}
        onClose={() => setSelectedScheduleComp(null)}
      />

      <RefillModal
        compartment={selectedRefillComp}
        onClose={() => setSelectedRefillComp(null)}
      />

      <CaretakerModal
        isOpen={isCaretakerOpen}
        onClose={() => setIsCaretakerOpen(false)}
      />
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <DispenserProvider>
      <MainAppScreen />
    </DispenserProvider>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scrollArea: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  subHeaderRow: {
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  screenSub: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
});
