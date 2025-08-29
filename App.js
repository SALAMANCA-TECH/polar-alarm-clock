import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Button, Platform, AppState, Modal, TouchableOpacity } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { Audio } from 'expo-av';

// Configure how notifications are handled when the app is running.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true, // While we play our own sound, this can be useful for system-level handling.
    shouldSetBadge: false,
  }),
});

export default function App() {
  // State for the alarm time selected by the user.
  const [alarmTime, setAlarmTime] = useState(new Date());
  // State to control the visibility of the time picker.
  const [showTimePicker, setShowTimePicker] = useState(false);
  // State to track the scheduled notification ID.
  const [notificationId, setNotificationId] = useState(null);
  // State to manage the modal visibility when the alarm is ringing.
  const [isAlarmModalVisible, setAlarmModalVisible] = useState(false);

  // useRef is used to hold the sound object. This prevents it from being re-created on every render.
  const sound = useRef(new Audio.Sound());

  // Effect hook to run once when the component mounts.
  useEffect(() => {
    // 1. Request necessary permissions for notifications.
    registerForPushNotificationsAsync();

    // 2. Load the alarm sound into memory.
    const loadSound = async () => {
      try {
        await sound.current.loadAsync(require('./assets/alarm.mp3'));
        console.log('Alarm sound loaded successfully.');
      } catch (error) {
        console.error('Failed to load alarm sound', error);
      }
    };
    loadSound();

    // 3. Set up listeners for notifications.
    // This listener handles what happens when a notification is received.
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      playAlarmSound();
      setAlarmModalVisible(true); // Show the alarm modal.
    });

    // This listener handles user interaction with the notification (e.g., tapping on it).
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response received:', response);
      stopAlarmSound();
      setAlarmModalVisible(false);
    });

    // Cleanup function: This runs when the component unmounts.
    return () => {
      // Unload the sound from memory to free up resources.
      sound.current.unloadAsync();
      console.log('Alarm sound unloaded.');
      // Remove the notification listeners to prevent memory leaks.
      Notifications.removeNotificationSubscription(notificationListener);
      Notifications.removeNotificationSubscription(responseListener);
    };
  }, []); // The empty dependency array ensures this effect runs only once.


  // Function to request notification permissions.
  async function registerForPushNotificationsAsync() {
    let token;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      const { status: finalStatus } = await Notifications.requestPermissionsAsync();
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
    }
  }


  // Function to handle changes from the DateTimePicker.
  const onTimeChange = (event, selectedTime) => {
    const currentTime = selectedTime || alarmTime;
    setShowTimePicker(Platform.OS === 'ios'); // On Android, the picker closes itself.
    setAlarmTime(currentTime);
  };

  // Function to schedule the alarm notification.
  const scheduleAlarm = async () => {
    // Cancel any previously scheduled alarm.
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      console.log('Previous alarm cancelled.');
    }

    const now = new Date();
    let alarmTriggerDate = new Date(alarmTime);

    // If the selected alarm time is in the past for today, schedule it for tomorrow.
    if (alarmTriggerDate <= now) {
      alarmTriggerDate.setDate(alarmTriggerDate.getDate() + 1);
    }
    
    // BUG FIX: Calculate the time difference in SECONDS, not as a Date object.
    const secondsUntilAlarm = (alarmTriggerDate.getTime() - now.getTime()) / 1000;

    if (secondsUntilAlarm <= 0) {
        console.error("Attempted to schedule an alarm in the past.");
        return;
    }

    console.log(`Scheduling alarm for ${alarmTriggerDate.toLocaleTimeString()}, which is in ${secondsUntilAlarm.toFixed(0)} seconds.`);

    // Schedule the notification.
    const newNotificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: "Polar Alarm Clock",
        body: "Time to wake up!",
        sound: false, // We handle the sound manually to allow for looping and custom controls.
      },
      trigger: {
        seconds: secondsUntilAlarm,
      },
    });

    setNotificationId(newNotificationId);
    alert(`Alarm set for ${alarmTriggerDate.toLocaleTimeString()}`);
  };

  // Function to cancel the scheduled alarm.
  const cancelAlarm = async () => {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      setNotificationId(null);
      stopAlarmSound(); // Also stop the sound if it's playing.
      setAlarmModalVisible(false);
      alert('Alarm cancelled.');
    } else {
      alert('No alarm is currently set.');
    }
  };

  // Function to play the alarm sound on a loop.
  const playAlarmSound = async () => {
    try {
      // Check if the sound is already playing
      const status = await sound.current.getStatusAsync();
      if (!status.isPlaying) {
        await sound.current.setIsLoopingAsync(true);
        await sound.current.playAsync();
        console.log('Playing alarm sound.');
      }
    } catch (error) {
      console.error('Error playing alarm sound', error);
    }
  };

  // Function to stop the alarm sound.
  const stopAlarmSound = async () => {
    try {
      await sound.current.stopAsync();
      // Reset the sound to the beginning for the next time.
      await sound.current.setPositionAsync(0);
      console.log('Alarm sound stopped.');
    } catch (error) {
      console.error('Error stopping alarm sound', error);
    }
  };
  
  // Function to handle dismissing the alarm from the modal.
  const dismissAlarm = () => {
    stopAlarmSound();
    setAlarmModalVisible(false);
    setNotificationId(null); // Clear the notification ID as it has been triggered.
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Polar Alarm Clock</Text>
      <Text style={styles.alarmTimeText}>
        {notificationId ? `Alarm set for: ${alarmTime.toLocaleTimeString()}` : "No alarm set"}
      </Text>

      {/* Button to show the time picker */}
      <TouchableOpacity style={styles.button} onPress={() => setShowTimePicker(true)}>
        <Text style={styles.buttonText}>Set Alarm Time</Text>
      </TouchableOpacity>

      {/* The DateTimePicker component */}
      {showTimePicker && (
        <DateTimePicker
          testID="dateTimePicker"
          value={alarmTime}
          mode={'time'}
          is24Hour={true}
          display="default"
          onChange={onTimeChange}
        />
      )}
      
      {/* Schedule and Cancel Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.scheduleButton]} onPress={scheduleAlarm}>
          <Text style={styles.buttonText}>Schedule Alarm</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={cancelAlarm}>
          <Text style={styles.buttonText}>Cancel Alarm</Text>
        </TouchableOpacity>
      </View>
      
      {/* Modal for when the alarm is ringing */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isAlarmModalVisible}
        onRequestClose={dismissAlarm}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalView}>
            <Text style={styles.modalText}>Wake Up!</Text>
            <TouchableOpacity
              style={[styles.button, styles.dismissButton]}
              onPress={dismissAlarm}
            >
              <Text style={styles.buttonText}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// --- Styles ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e', // Dark blue background
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#e0e0e0', // Light gray text
    marginBottom: 20,
  },
  alarmTimeText: {
    fontSize: 18,
    color: '#b3b3b3', // Medium gray text
    marginBottom: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginVertical: 10,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  scheduleButton: {
    backgroundColor: '#4a90e2', // Bright blue
  },
  cancelButton: {
    backgroundColor: '#d0021b', // Red
  },
  dismissButton: {
    backgroundColor: '#4a90e2', // Bright blue
    marginTop: 20,
    width: '80%',
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // Semi-transparent background
  },
  modalView: {
    margin: 20,
    backgroundColor: '#2c2c54', // Darker modal background
    borderRadius: 20,
    padding: 35,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalText: {
    marginBottom: 15,
    textAlign: 'center',
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
});
