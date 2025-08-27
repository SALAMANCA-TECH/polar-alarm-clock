// main.js

document.addEventListener('DOMContentLoaded', function() {
    // --- DOM ELEMENTS ---
    const digitalTime = document.getElementById('digitalTime');
    const digitalDate = document.getElementById('digitalDate');
    const digitalDisplay = document.getElementById('digitalDisplay');
    // ... other DOM elements for settings, etc.

    // --- GLOBAL STATE ---
    let settings = {};
    let state = {
        mode: 'clock',
        timer: { totalSeconds: 0, remainingSeconds: 0, isRunning: false, isInterval: false },
        stopwatch: { startTime: 0, elapsedTime: 0, isRunning: false, laps: [], isInterval: false, intervalTime: 0, nextInterval: 0 },
        trackedAlarm: { id: null, nextAlarmTime: null },
        advancedAlarms: [],
        lastMinuteChecked: -1
    };
    // ... savedClocks state ...

    const colorPalettes = {
        default: { month: { light: '#D05CE3', dark: '#4A0055' }, day: { light: '#81C784', dark: '#003D00' }, hours: { light: '#FF9E80', dark: '#8C1C00' }, minutes: { light: '#FFF176', dark: '#B45F06' }, seconds: { light: '#81D4FA', dark: '#002E5C' } },
        neon: { month: { light: '#ff00ff', dark: '#800080' }, day: { light: '#00ff00', dark: '#008000' }, hours: { light: '#ff0000', dark: '#800000' }, minutes: { light: '#ffff00', dark: '#808000' }, seconds: { light: '#00ffff', dark: '#008080' } },
        pastel: { month: { light: '#f4a8e1', dark: '#a1428a' }, day: { light: '#a8f4b6', dark: '#42a155' }, hours: { light: '#f4a8a8', dark: '#a14242' }, minutes: { light: '#f4f4a8', dark: '#a1a142' }, seconds: { light: '#a8e1f4', dark: '#428aa1' } },
        colorblind: { month: { light: '#f7931a', dark: '#a45c05' }, day: { light: '#0072b2', dark: '#003c5c' }, hours: { light: '#d55e00', dark: '#7a3600' }, minutes: { light: '#f0e442', dark: '#8a8326' }, seconds: { light: '#cccccc', dark: '#666666' } }
    };

    // --- CORE APPLICATION LOOP ---
    let lastFrameTime = 0;
    function update(timestamp) {
        if (!lastFrameTime) lastFrameTime = timestamp;
        const deltaTime = timestamp - lastFrameTime;
        lastFrameTime = timestamp;

        const now = new Date();
        
        // Update timers and stopwatches based on elapsed time
        if (state.timer.isRunning) {
            state.timer.remainingSeconds -= deltaTime / 1000;
            if (state.timer.remainingSeconds <= 0) {
                timerFinished();
            }
        }
        if (state.stopwatch.isRunning) {
            state.stopwatch.elapsedTime = Date.now() - state.stopwatch.startTime;
            // ... stopwatch interval logic ...
        }

        // Update digital display
        digitalTime.textContent = now.toLocaleTimeString([], { hour12: !settings.is24HourFormat, hour: 'numeric', minute: '2-digit' });
        digitalDate.textContent = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
        
        checkAdvancedAlarms(now);

        // Send updates to the clock module
        window.ClockModule.update(settings, state);

        requestAnimationFrame(update);
    }

    function timerFinished() {
        playSound(settings.timerSound, settings.volume);
        if (state.timer.isInterval) {
            state.timer.remainingSeconds = state.timer.totalSeconds;
        } else {
            window.ToolsModule.resetTimer();
        }
    }

    // --- SETTINGS & ALARMS ---
    function saveSettings() { localStorage.setItem('polarClockSettings', JSON.stringify(settings)); }
    function loadSettings() {
        const savedSettings = localStorage.getItem('polarClockSettings');
        const defaultSettings = {
            is24HourFormat: false, labelDisplayMode: 'standard',
            showDateLines: true, showTimeLines: true, useGradient: true, colorPreset: 'default',
            volume: 1.0, timerSound: 'bell01.mp3', alarmSound: 'bell01.mp3', stopwatchSound: 'Tick_Tock.wav'
        };
        settings = savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
        settings.currentColors = colorPalettes[settings.colorPreset];
        // applySettingsToUI();
    }
    function loadAdvancedAlarms() {
        const storedAlarms = localStorage.getItem('polarAlarms');
        if (storedAlarms) state.advancedAlarms = JSON.parse(storedAlarms);
        // updateTrackedAlarm();
    }
    function checkAdvancedAlarms(now) {
        // ... (alarm checking logic)
    }
    function playSound(soundFile, volume) {
        if (!soundFile) return;
        const audio = new Audio(`assets/sounds/${soundFile}`);
        audio.volume = volume;
        audio.play().catch(e => console.error("Error playing sound:", e));
    }


    // --- INITIALIZATION ---
    function initializeApp() {
        loadSettings();
        loadAdvancedAlarms();

        // Initialize Modules
        window.ClockModule.init();
        window.ToolsModule.init(state);

        // Start the main application update loop
        requestAnimationFrame(update);

        // Setup event listeners
        document.addEventListener('modechange', (e) => {
            state.mode = e.detail.mode;
            if (state.mode === 'timer') window.ToolsModule.resetTimer();
            if (state.mode === 'stopwatch') window.ToolsModule.resetStopwatch();
        });
        // ... other top-level listeners
    }

    initializeApp();
});