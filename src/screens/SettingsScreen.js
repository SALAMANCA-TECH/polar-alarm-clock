import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';

const SettingsScreen = ({ settings, onSettingsChange }) => {
  return (
    <View style={styles.container}>
      <View style={styles.settingContainer}>
        <Text style={styles.label}>Color Scheme</Text>
        <Picker
          selectedValue={settings.colorScheme}
          style={styles.picker}
          onValueChange={(itemValue) => onSettingsChange('colorScheme', itemValue)}
        >
          <Picker.Item label="Default" value="default" />
          <Picker.Item label="Neon" value="neon" />
          <Picker.Item label="Pastel" value="pastel" />
          <Picker.Item label="Colorblind" value="colorblind" />
          <Picker.Item label="Planets" value="planets" />
        </Picker>
      </View>
      <View style={styles.settingContainer}>
        <Text style={styles.label}>24-Hour Format</Text>
        <Switch
          value={settings.is24Hour}
          onValueChange={(value) => onSettingsChange('is24Hour', value)}
        />
      </View>
      <View style={styles.settingContainer}>
        <Text style={styles.label}>Separator Lines</Text>
        <Switch
          value={settings.showSeparators}
          onValueChange={(value) => onSettingsChange('showSeparators', value)}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#121212',
  },
  settingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    color: '#FFFFFF',
  },
  picker: {
    height: 50,
    width: 150,
    color: '#FFFFFF',
  },
});

export default SettingsScreen;
