document.addEventListener('DOMContentLoaded', function() {
    // --- DOM ELEMENTS ---
    const clockContainer = document.querySelector('.canvas-container');
    const digitalTime = document.getElementById('digitalTime');
    const digitalDate = document.getElementById('digitalDate');
    const digitalDisplay = document.getElementById('digitalDisplay');
    // Add a reference to the loading overlay
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // --- GLOBAL STATE ---
    let settings = {};
    let state = {
        mode: 'clock',
        timer: { totalSeconds: 0, remainingSeconds: 0, isRunning: false, isInterval: false },
        pomodoro: {
            isRunning: false,
            phase: 'work', // 'work', 'shortBreak', 'longBreak'
            cycles: 0,
            remainingSeconds: 25 * 60,
        },
        stopwatch: { startTime: 0, elapsedTime: 0, isRunning: false, laps: [] },
        trackedAlarm: { id: null, nextAlarmTime: null },
        advancedAlarms: [],
        lastMinuteChecked: -1
    };
    
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
        
        if (state.timer.isRunning) {
            state.timer.remainingSeconds -= deltaTime / 1000;
            if (state.timer.remainingSeconds <= 0) {
                timerFinished();
            }
        }
        
        if (state.pomodoro.isRunning) {
            state.pomodoro.remainingSeconds -= deltaTime / 1000;
            window.PomodoroModule.updateDisplay();

            if (settings.pomodoroGlowEnabled && state.pomodoro.remainingSeconds <= 30) {
                const glowClass = state.pomodoro.phase === 'work' ? 'glowing-work' : 'glowing-break';
                if (!clockContainer.classList.contains(glowClass)) {
                    clockContainer.classList.remove('glowing-work', 'glowing-break');
                    clockContainer.classList.add(glowClass);
                }
            } else {
                clockContainer.classList.remove('glowing-work', 'glowing-break');
            }

            if (settings.pomodoroPulseEnabled && state.pomodoro.remainingSeconds <= 10) {
                if (!clockContainer.classList.contains('pulsing-warning')) {
                    clockContainer.classList.add('pulsing-warning');
                }
            } else {
                clockContainer.classList.remove('pulsing-warning');
            }
            
            if (state.pomodoro.remainingSeconds <= 0) {
                window.PomodoroModule.startNextPhase();
                clockContainer.classList.remove('pulsing-warning', 'glowing-work', 'glowing-break');
            }
        } else {
            clockContainer.classList.remove('pulsing-warning', 'glowing-work', 'glowing-break');
        }

        if (state.stopwatch.isRunning) {
            state.stopwatch.elapsedTime = Date.now() - state.stopwatch.startTime;
        }

        digitalTime.textContent = now.toLocaleTimeString([], { hour12: !settings.is24HourFormat, hour: 'numeric', minute: '2-digit' });
        digitalDate.textContent = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
        
        checkAdvancedAlarms(now);
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

    // --- STATE & SETTINGS PERSISTENCE ---
    function saveState() {
        localStorage.setItem('polarClockState', JSON.stringify(state));
    }
    function loadState() {
        const savedState = localStorage.getItem('polarClockState');
        if (savedState) {
            const loadedState = JSON.parse(savedState);
            state = { ...state, ...loadedState };
            state.timer.isRunning = false;
            state.stopwatch.isRunning = false;
            state.pomodoro.isRunning = false;
        }
    }
    function saveSettings() { localStorage.setItem('polarClockSettings', JSON.stringify(settings)); }
    function loadSettings() {
        const savedSettings = localStorage.getItem('polarClockSettings');
        const defaultSettings = {
            is24HourFormat: false, labelDisplayMode: 'standard',
            showDateLines: true, showTimeLines: true, useGradient: true, colorPreset: 'default',
            volume: 1.0, timerSound: 'bell01.mp3', alarmSound: 'bell01.mp3', stopwatchSound: 'Tick_Tock.wav',
            pomodoroGlowEnabled: true, pomodoroPulseEnabled: true
        };
        settings = savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
        settings.currentColors = colorPalettes[settings.colorPreset];
        applySettingsToUI();
    }
    function applySettingsToUI() {
        const format12Btn = document.getElementById('format12');
        const format24Btn = document.getElementById('format24');
        const modeStandardBtn = document.getElementById('modeStandard');
        const modePercentageBtn = document.getElementById('modePercentage');
        const modeRemainderBtn = document.getElementById('modeRemainder');
        const presetDefaultBtn = document.getElementById('presetDefault');
        const presetNeonBtn = document.getElementById('presetNeon');
        const presetPastelBtn = document.getElementById('presetPastel');
        const presetColorblindBtn = document.getElementById('presetColorblind');
        const gradientToggle = document.getElementById('gradientToggle');
        const dateLinesToggle = document.getElementById('dateLinesToggle');
        const timeLinesToggle = document.getElementById('timeLinesToggle');
        const volumeControl = document.getElementById('volumeControl');

        if(settings.is24HourFormat) {
            window.handleActiveButton(format24Btn, [format12Btn, format24Btn]);
        } else {
            window.handleActiveButton(format12Btn, [format12Btn, format24Btn]);
        }

        const modeMap = { standard: modeStandardBtn, percentage: modePercentageBtn, remainder: modeRemainderBtn };
        window.handleActiveButton(modeMap[settings.labelDisplayMode], [modeStandardBtn, modePercentageBtn, modeRemainderBtn]);

        const colorMap = { default: presetDefaultBtn, neon: presetNeonBtn, pastel: presetPastelBtn, colorblind: presetColorblindBtn };
        window.handleActiveButton(colorMap[settings.colorPreset], [presetDefaultBtn, presetNeonBtn, presetPastelBtn, presetColorblindBtn]);

        gradientToggle.checked = settings.useGradient;
        dateLinesToggle.checked = settings.showDateLines;
        timeLinesToggle.checked = settings.showTimeLines;
        volumeControl.value = settings.volume;

        document.getElementById('pomodoroGlowToggle').checked = settings.pomodoroGlowEnabled;
        document.getElementById('pomodoroPulseToggle').checked = settings.pomodoroPulseEnabled;
    }
    
    function loadAdvancedAlarms() {
        const storedAlarms = localStorage.getItem('polarAlarms');
        if (storedAlarms) state.advancedAlarms = JSON.parse(storedAlarms);
    }
    function checkAdvancedAlarms(now) {
        const currentMinute = now.getMinutes();
        if (currentMinute === state.lastMinuteChecked) {
            return; // Already checked this minute
        }
        state.lastMinuteChecked = currentMinute;

        const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
        const currentHour = now.getHours(); // 0 to 23

        state.advancedAlarms.forEach(alarm => {
            if (!alarm.enabled) {
                return;
            }

            const alarmHour24 = convertTo24Hour(alarm.hour, alarm.ampm);

            if (alarmHour24 === currentHour && parseInt(alarm.minute) === currentMinute) {
                if (alarm.days && alarm.days.length > 0) {
                    if (alarm.days.includes(currentDay)) {
                        playSound(alarm.sound, settings.volume);
                        if (alarm.isTemporary) {
                            alarm.enabled = false;
                            // Save the updated alarms array back to localStorage
                            localStorage.setItem('polarAlarms', JSON.stringify(state.advancedAlarms));
                        }
                    }
                } else if (alarm.isTemporary) {
                    // One-time temporary alarm
                    playSound(alarm.sound, settings.volume);
                    alarm.enabled = false;
                    localStorage.setItem('polarAlarms', JSON.stringify(state.advancedAlarms));
                }
            }
        });
    }

    function convertTo24Hour(hour, ampm) {
        hour = parseInt(hour);
        if (ampm === 'PM' && hour !== 12) {
            hour += 12;
        }
        if (ampm === 'AM' && hour === 12) {
            hour = 0; // Midnight case
        }
        return hour;
    }
    function playSound(soundFile, volume) {
        if (!soundFile) return;
        const audio = new Audio(`assets/Sounds/${soundFile}`);
        audio.volume = volume;
        audio.play().catch(e => console.error("Error playing sound:", e));
    }

    function setupEventListeners() {
        const format12Btn = document.getElementById('format12');
        const format24Btn = document.getElementById('format24');
        const modeStandardBtn = document.getElementById('modeStandard');
        const modePercentageBtn = document.getElementById('modePercentage');
        const modeRemainderBtn = document.getElementById('modeRemainder');
        const presetDefaultBtn = document.getElementById('presetDefault');
        const presetNeonBtn = document.getElementById('presetNeon');
        const presetPastelBtn = document.getElementById('presetPastel');
        const presetColorblindBtn = document.getElementById('presetColorblind');
        const gradientToggle = document.getElementById('gradientToggle');
        const dateLinesToggle = document.getElementById('dateLinesToggle');
        const timeLinesToggle = document.getElementById('timeLinesToggle');
        const volumeControl = document.getElementById('volumeControl');
        const formatButtons = [format12Btn, format24Btn];
        const modeButtons = [modeStandardBtn, modePercentageBtn, modeRemainderBtn];
        const colorPresetButtons = [presetDefaultBtn, presetNeonBtn, presetPastelBtn, presetColorblindBtn];

        document.addEventListener('modechange', (e) => {
            state.mode = e.detail.mode;
            if (state.mode === 'timer') window.ToolsModule.resetTimer();
            if (state.mode === 'stopwatch') window.ToolsModule.resetStopwatch();
            if (state.mode === 'pomodoro') window.PomodoroModule.reset();
        });
        document.addEventListener('play-sound', (e) => playSound(e.detail.soundFile, settings.volume));
        document.addEventListener('statechange', saveState);

        format12Btn.addEventListener('click', () => {
            settings.is24HourFormat = false;
            window.handleActiveButton(format12Btn, formatButtons);
            saveSettings();
        });
        format24Btn.addEventListener('click', () => {
            settings.is24HourFormat = true;
            window.handleActiveButton(format24Btn, formatButtons);
            saveSettings();
        });
        modeStandardBtn.addEventListener('click', () => {
            settings.labelDisplayMode = 'standard';
            window.handleActiveButton(modeStandardBtn, modeButtons);
            saveSettings();
        });
        modePercentageBtn.addEventListener('click', () => {
            settings.labelDisplayMode = 'percentage';
            window.handleActiveButton(modePercentageBtn, modeButtons);
            saveSettings();
        });
        modeRemainderBtn.addEventListener('click', () => {
            settings.labelDisplayMode = 'remainder';
            window.handleActiveButton(modeRemainderBtn, modeButtons);
            saveSettings();
        });

        colorPresetButtons.forEach(button => {
            button.addEventListener('click', () => {
                const preset = button.id.replace('preset', '').toLowerCase();
                settings.colorPreset = preset;
                settings.currentColors = colorPalettes[preset];
                window.handleActiveButton(button, colorPresetButtons);
                saveSettings();
            });
        });
        gradientToggle.addEventListener('change', (e) => {
            settings.useGradient = e.target.checked;
            saveSettings();
        });
        dateLinesToggle.addEventListener('change', (e) => {
            settings.showDateLines = e.target.checked;
            saveSettings();
        });
        timeLinesToggle.addEventListener('change', (e) => {
            settings.showTimeLines = e.target.checked;
            saveSettings();
        });
        volumeControl.addEventListener('input', (e) => {
            settings.volume = parseFloat(e.target.value);
            saveSettings();
        });

        document.getElementById('pomodoroGlowToggle').addEventListener('change', (e) => {
            settings.pomodoroGlowEnabled = e.target.checked;
            saveSettings();
        });
        document.getElementById('pomodoroPulseToggle').addEventListener('change', (e) => {
            settings.pomodoroPulseEnabled = e.target.checked;
            saveSettings();
        });
    }

    // --- INITIALIZATION ---
    function initializeApp() {
        loadState();
        loadSettings();
        loadAdvancedAlarms();

        window.ClockModule.init(settings);
        window.ToolsModule.init(state);
        window.PomodoroModule.init(state, settings);

        setupEventListeners();

        requestAnimationFrame(update);

        // Hide the loading overlay now that everything is initialized
        if (loadingOverlay) {
            loadingOverlay.style.opacity = '0';
            // Remove it from the DOM after the transition
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 500);
        }
    }
    
    initializeApp();
});
