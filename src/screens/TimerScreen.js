import React, { useState, useEffect } from 'react';
import { View, TextInput, Button, StyleSheet, Text } from 'react-native';
import { Audio } from 'expo-av';

const TimerScreen = ({ onTimerUpdate }) => {
  const [initialTime, setInitialTime] = useState({ h: 0, m: 0, s: 0 });
  const [time, setTime] = useState(0); // time in seconds
  const [isActive, setIsActive] = useState(false);
  const [sound, setSound] = useState();

  async function playSound() {
    console.log('Loading Sound');
    const { sound } = await Audio.Sound.createAsync(
       require('../../assets/sounds/bell01.mp3')
    );
    setSound(sound);

    console.log('Playing Sound');
    await sound.playAsync();
  }

  useEffect(() => {
    return sound
      ? () => {
          console.log('Unloading Sound');
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  useEffect(() => {
    let interval = null;
    if (isActive && time > 0) {
      interval = setInterval(() => {
        setTime((prevTime) => prevTime - 1);
      }, 1000);
    } else if (time === 0 && isActive) {
      setIsActive(false);
      playSound();
    }
    return () => clearInterval(interval);
  }, [isActive, time]);

  useEffect(() => {
    if(onTimerUpdate) {
      onTimerUpdate({ time, initialTime: initialTime.h * 3600 + initialTime.m * 60 + initialTime.s });
    }
  }, [time, initialTime.h, initialTime.m, initialTime.s, onTimerUpdate]);


  const handleStart = () => {
    const totalSeconds = initialTime.h * 3600 + initialTime.m * 60 + initialTime.s;
    setTime(totalSeconds);
    setIsActive(true);
  };

  const handleStop = () => {
    setIsActive(false);
  };

  const handleReset = () => {
    setIsActive(false);
    setTime(initialTime.h * 3600 + initialTime.m * 60 + initialTime.s);
  };

  const formatTime = (totalSeconds) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          onChangeText={(text) => setInitialTime(t => ({...t, h: parseInt(text) || 0}))}
          value={initialTime.h.toString()}
        />
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          onChangeText={(text) => setInitialTime(t => ({...t, m: parseInt(text) || 0}))}
          value={initialTime.m.toString()}
        />
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          onChangeText={(text) => setInitialTime(t => ({...t, s: parseInt(text) || 0}))}
          value={initialTime.s.toString()}
        />
      </View>
      <Text style={styles.timerText}>{formatTime(time)}</Text>
      <View style={styles.buttonContainer}>
        <Button title={isActive ? "Pause" : "Start"} onPress={isActive ? handleStop : handleStart} />
        <Button title="Reset" onPress={handleReset} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#121212',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  input: {
    width: 60,
    height: 60,
    marginHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FFFFFF',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 24,
    color: '#FFFFFF',
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '60%',
    justifyContent: 'space-around',
  },
});

export default TimerScreen;
