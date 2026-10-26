import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispenser } from '../context/DispenserContext';
import { MaterialCommunityIcons, Ionicons, FontAwesome5 } from '@expo/vector-icons';

export type TabType = 'slots' | 'adherence' | 'mcu' | 'settings';

interface BottomTabsProps {
  activeTab: TabType;
  onChangeTab: (tab: TabType) => void;
}

export const BottomTabs: React.FC<BottomTabsProps> = ({ activeTab, onChangeTab }) => {
  const { missedDoses } = useDispenser();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onChangeTab('slots')}
      >
        <MaterialCommunityIcons
          name="pill"
          size={22}
          color={activeTab === 'slots' ? '#0d9488' : '#94a3b8'}
        />
        <Text style={[styles.tabLabel, activeTab === 'slots' && styles.tabLabelActive]}>
          4 Slots
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onChangeTab('adherence')}
      >
        <View>
          <Ionicons
            name="calendar-outline"
            size={20}
            color={activeTab === 'adherence' ? '#0d9488' : '#94a3b8'}
          />
          {missedDoses.length > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeText}>{missedDoses.length}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.tabLabel, activeTab === 'adherence' && styles.tabLabelActive]}>
          Adherence
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onChangeTab('mcu')}
      >
        <MaterialCommunityIcons
          name="chip"
          size={22}
          color={activeTab === 'mcu' ? '#0d9488' : '#94a3b8'}
        />
        <Text style={[styles.tabLabel, activeTab === 'mcu' && styles.tabLabelActive]}>
          ESP32 Deck
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tabItem}
        onPress={() => onChangeTab('settings')}
      >
        <Ionicons
          name="settings-outline"
          size={20}
          color={activeTab === 'settings' ? '#0d9488' : '#94a3b8'}
        />
        <Text style={[styles.tabLabel, activeTab === 'settings' && styles.tabLabelActive]}>
          Settings
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 60,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'space-around',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: -2 },
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 6,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    marginTop: 3,
  },
  tabLabelActive: {
    color: '#0d9488',
    fontWeight: '800',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#e11d48',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
  },
});
