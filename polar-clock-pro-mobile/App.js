import React, { useState } from 'react';
import { StyleSheet, View, StatusBar, Button } from 'react-native';
import PolarClock from './src/components/PolarClock';
import DigitalClock from './src/components/DigitalClock';
import TimerScreen from './src/screens/TimerScreen';
import StopwatchScreen from './src/screens/StopwatchScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import { colorSchemes } from './src/constants/colors';

export default function App() {
  const [timerData, setTimerData] = useState(null);
  const [stopwatchData, setStopwatchData] = useState(0);
  const [activeScreen, setActiveScreen] = useState('clock'); // clock, timer, stopwatch, settings
  const [settings, setSettings] = useState({
    colorScheme: 'default',
    is24Hour: false,
    showSeparators: true,
  });

  const handleTimerUpdate = (data) => {
    setTimerData(data);
  };

  const handleStopwatchUpdate = (time) => {
    setStopwatchData(time);
  };

  const handleSettingsChange = (key, value) => {
    setSettings((prevSettings) => ({
      ...prevSettings,
      [key]: value,
    }));
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <PolarClock
        timerData={timerData}
        stopwatchData={activeScreen === 'stopwatch' ? stopwatchData : null}
        settings={settings}
        colors={colorSchemes[settings.colorScheme]}
      />
      <View style={{position: 'absolute'}}>
        {activeScreen === 'clock' && <DigitalClock settings={settings} />}
        {activeScreen === 'timer' && <TimerScreen onTimerUpdate={handleTimerUpdate} />}
        {activeScreen === 'stopwatch' && <StopwatchScreen onUpdate={handleStopwatchUpdate} />}
        {activeScreen === 'settings' && <SettingsScreen settings={settings} onSettingsChange={handleSettingsChange} />}
      </View>
      <View style={styles.buttonContainer}>
        <Button title="Clock" onPress={() => setActiveScreen('clock')} />
        <Button title="Timer" onPress={() => setActiveScreen('timer')} />
        <Button title="Stopwatch" onPress={() => setActiveScreen('stopwatch')} />
        <Button title="Settings" onPress={() => setActiveScreen('settings')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
