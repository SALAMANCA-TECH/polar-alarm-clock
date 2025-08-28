// main.js

document.addEventListener('DOMContentLoaded', function() {
    // --- DOM ELEMENTS ---
    const clockContainer = document.querySelector('.canvas-container');
    const digitalTime = document.getElementById('digitalTime');
    const digitalDate = document.getElementById('digitalDate');
    const digitalDisplay = document.getElementById('digitalDisplay');
    
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

    // --- SETTINGS & ALARMS ---
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
        document.getElementById('pomodoroGlowToggle').checked = settings.pomodoroGlowEnabled;
        document.getElementById('pomodoroPulseToggle').checked = settings.pomodoroPulseEnabled;
    }
    
    function loadAdvancedAlarms() {
        const storedAlarms = localStorage.getItem('polarAlarms');
        if (storedAlarms) state.advancedAlarms = JSON.parse(storedAlarms);
    }
    function checkAdvancedAlarms(now) {
        // ... alarm checking logic ...
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

        window.ClockModule.init();
        window.ToolsModule.init(state);
        window.PomodoroModule.init(state, settings);

        requestAnimationFrame(update);

        document.addEventListener('modechange', (e) => {
            state.mode = e.detail.mode;
            if (state.mode === 'timer') window.ToolsModule.resetTimer();
            if (state.mode === 'stopwatch') window.ToolsModule.resetStopwatch();
            if (state.mode === 'pomodoro') window.PomodoroModule.reset();
        });
        
        document.addEventListener('play-sound', (e) => {
            playSound(e.detail.soundFile, settings.volume);
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
    
    initializeApp();
});
```javascript
// clock.js

/**
 * clock.js: A dedicated module for rendering the Polar Clock.
 */
document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('polarClockCanvas');
    if (!canvas) { return; }
    const ctx = canvas.getContext('2d');
    
    let settings = {};
    let state = {
        mode: 'clock',
        timer: { totalSeconds: 0, remainingSeconds: 0 },
        stopwatch: { elapsedTime: 0 },
        trackedAlarm: { nextAlarmTime: null }
    };

    let dimensions = {};
    const baseStartAngle = -Math.PI / 2;
    let lastNow = new Date();

    const drawArc = (x, y, radius, startAngle, endAngle, colorLight, colorDark, lineWidth) => {
        if (startAngle >= endAngle - 0.01 || radius <= 0) return;
        const gradient = ctx.createConicGradient(baseStartAngle, x, y);
        gradient.addColorStop(0, colorLight);
        gradient.addColorStop(1, colorDark);
        ctx.strokeStyle = settings.useGradient ? gradient : colorLight;
        ctx.beginPath();
        ctx.arc(x, y, radius, startAngle, endAngle);
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    };

    const drawLabel = (arc) => { /* ... */ };
    const getLabelText = (unit, now) => { /* ... */ };

    const drawClock = (deltaTime) => {
        const now = new Date();
        // ... drawing logic for clock arcs ...
        lastNow = now;
    };

    const drawStopwatch = () => {
        // ... drawing logic for stopwatch arcs ...
    };

    function drawTrackedAlarmTimer(now) {
        // ... drawing logic for tracked alarm ...
    }

    const animate = (timestamp) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (state.mode === 'stopwatch') {
            drawStopwatch();
        } else {
            drawClock(0); // deltaTime is managed in main.js
        }
        requestAnimationFrame(animate);
    };

    const ClockModule = {
        init() {
            this.resize();
            window.addEventListener('resize', () => this.resize());
            if (canvas.width > 0 && canvas.height > 0) {
                animate(0);
            } else {
                requestAnimationFrame(() => this.init());
            }
        },
        resize() {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
            dimensions.centerX = canvas.width / 2;
            dimensions.centerY = canvas.height / 2;
            dimensions.clockRadius = Math.min(dimensions.centerX, dimensions.centerY) * 0.9;

            const monthLineWidth = 20;
            const otherLineWidth = 30;
            const hourLineWidth = 45;
            const gap = 20;

            dimensions.secondsRadius = dimensions.clockRadius - (otherLineWidth / 2);
            dimensions.minutesRadius = dimensions.secondsRadius - otherLineWidth - gap;
            dimensions.hoursRadius = dimensions.minutesRadius - otherLineWidth - gap;
            dimensions.dayRadius = dimensions.hoursRadius - hourLineWidth - gap;
            dimensions.monthRadius = dimensions.dayRadius - otherLineWidth - gap;
            dimensions.timerRadius = dimensions.monthRadius - monthLineWidth - gap;
            dimensions.trackedAlarmRadius = dimensions.timerRadius - otherLineWidth - gap;
        },
        update(newSettings, newState) {
            settings = newSettings;
            state = { ...state, ...newState };
        }
    };
    window.ClockModule = ClockModule;
});
```javascript
// ui.js

document.addEventListener('DOMContentLoaded', function() {
    const views = {
        main: document.getElementById('mainView'),
        settings: document.getElementById('settingsView'),
        customize: document.getElementById('customizeView'),
        tools: document.getElementById('toolsView'),
    };
    const navButtons = {
        goToSettings: document.getElementById('goToSettingsBtn'),
        goToCustomize: document.getElementById('goToCustomizeBtn'),
        goToTools: document.getElementById('goToToolsBtn'),
        goToAlarms: document.getElementById('goToAlarmsBtn'),
        backFromSettings: document.getElementById('backToMainFromSettings'),
        backFromCustomize: document.getElementById('backToMainFromCustomize'),
        backFromTools: document.getElementById('backToMainFromTools'),
    };
    const toolTabs = {
        timer: document.getElementById('timerTab'),
        pomodoro: document.getElementById('pomodoroTab'),
        alarm: document.getElementById('alarmTab'),
        stopwatch: document.getElementById('stopwatchTab'),
    };
    const toolPanels = {
        timer: document.getElementById('timerPanel'),
        pomodoro: document.getElementById('pomodoroPanel'),
        alarm: document.getElementById('alarmPanel'),
        stopwatch: document.getElementById('stopwatchPanel'),
    };
    const pomodoroInfoModal = document.getElementById('pomodoroInfoModal');
    const pomodoroInfoBtn = document.getElementById('pomodoroInfoBtn');
    const closePomodoroInfoBtn = document.getElementById('closePomodoroInfoBtn');

    function showView(viewToShow) {
        Object.values(views).forEach(v => v.style.display = 'none');
        viewToShow.style.display = 'flex';
    }
    function handleActiveButton(clickedButton, buttonGroup) {
        buttonGroup.forEach(button => button.classList.remove('active'));
        clickedButton.classList.add('active');
    }
    function showToolsPanel(panelToShow, tabToActivate) {
        Object.values(toolPanels).forEach(p => p.style.display = 'none');
        panelToShow.style.display = 'flex';
        handleActiveButton(tabToActivate, Object.values(toolTabs));
        const event = new CustomEvent('modechange', { 
            detail: { mode: panelToShow.id.replace('Panel', '').toLowerCase() } 
        });
        document.dispatchEvent(event);
    }

    navButtons.goToSettings.addEventListener('click', () => showView(views.settings));
    navButtons.goToCustomize.addEventListener('click', () => showView(views.customize));
    navButtons.goToTools.addEventListener('click', () => showView(views.tools));
    navButtons.backFromSettings.addEventListener('click', () => showView(views.main));
    navButtons.backFromCustomize.addEventListener('click', () => showView(views.main));
    navButtons.backFromTools.addEventListener('click', () => showView(views.main));
    navButtons.goToAlarms.addEventListener('click', () => { window.location.href = 'alarms.html'; });

    toolTabs.timer.addEventListener('click', () => showToolsPanel(toolPanels.timer, toolTabs.timer));
    toolTabs.pomodoro.addEventListener('click', () => showToolsPanel(toolPanels.pomodoro, toolTabs.pomodoro));
    toolTabs.alarm.addEventListener('click', () => showToolsPanel(toolPanels.alarm, toolTabs.alarm));
    toolTabs.stopwatch.addEventListener('click', () => showToolsPanel(toolPanels.stopwatch, toolTabs.stopwatch));

    pomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.remove('hidden'));
    closePomodoroInfoBtn.addEventListener('click', () => pomodoroInfoModal.classList.add('hidden'));

    window.handleActiveButton = handleActiveButton;
});
```javascript
// tools.js

document.addEventListener('DOMContentLoaded', function() {
    const timerHoursInput = document.getElementById('timerHours');
    const timerMinutesInput = document.getElementById('timerMinutes');
    const timerSecondsInput = document.getElementById('timerSeconds');
    const intervalToggle = document.getElementById('intervalToggle');
    const startStopwatchBtn = document.getElementById('startStopwatch');
    const stopStopwatchBtn = document.getElementById('stopStopwatch');
    const lapStopwatchBtn = document.getElementById('lapStopwatch');
    const resetStopwatchBtn = document.getElementById('resetStopwatch');
    const lapTimesContainer = document.getElementById('lapTimes');
    const catchUpMinutesInput = document.getElementById('catchUpMinutes');
    const catchUpSecondsInput = document.getElementById('catchUpSeconds');
    const addCatchUpTimeBtn = document.getElementById('addCatchUpTimeBtn');

    const ToolsModule = {
        state: null,
        init(appState) {
            this.state = appState;
            this.setupEventListeners();
        },
        startTimer() {
            if (this.state.timer.isRunning) return;
            if (this.state.timer.remainingSeconds <= 0) {
                this.state.timer.totalSeconds = (parseInt(timerHoursInput.value) || 0) * 3600 + (parseInt(timerMinutesInput.value) || 0) * 60 + (parseInt(timerSecondsInput.value) || 0);
                this.state.timer.remainingSeconds = this.state.timer.totalSeconds;
            }
            if (this.state.timer.remainingSeconds > 0) {
                this.state.timer.isRunning = true;
            }
        },
        pauseTimer() { this.state.timer.isRunning = false; },
        resetTimer() {
            this.state.timer.isRunning = false;
            this.state.timer.totalSeconds = 0;
            this.state.timer.remainingSeconds = 0;
            timerHoursInput.value = "0";
            timerMinutesInput.value = "0";
            timerSecondsInput.value = "0";
        },
        startStopwatch() {
            if (this.state.stopwatch.isRunning) return;
            this.state.stopwatch.isRunning = true;
            this.state.stopwatch.startTime = Date.now() - this.state.stopwatch.elapsedTime;
        },
        stopStopwatch() { this.state.stopwatch.isRunning = false; },
        resetStopwatch() {
            this.state.stopwatch.isRunning = false;
            this.state.stopwatch.elapsedTime = 0;
            this.state.stopwatch.laps = [];
            this.updateLapDisplay();
            catchUpMinutesInput.value = '';
            catchUpSecondsInput.value = '';
        },
        lapStopwatch() {
            if (!this.state.stopwatch.isRunning) return;
            this.state.stopwatch.laps.push(this.state.stopwatch.elapsedTime);
            this.updateLapDisplay();
        },
        updateLapDisplay() {
            lapTimesContainer.innerHTML = '';
            this.state.stopwatch.laps.forEach((lap, index) => {
                const lapElement = document.createElement('div');
                lapElement.classList.add('lap-item');
                lapElement.innerHTML = `<span class="lap-number">Lap ${index + 1}</span><span>${this.formatTime(lap)}</span>`;
                lapTimesContainer.prepend(lapElement);
            });
        },
        formatTime(ms) {
            const d = new Date(ms);
            return `${d.getUTCMinutes().toString().padStart(2, '0')}:${d.getUTCSeconds().toString().padStart(2, '0')}.${d.getUTCMilliseconds().toString().padStart(3, '0')}`;
        },
        addManualCatchUpTime() {
            const minutes = parseInt(catchUpMinutesInput.value) || 0;
            const seconds = parseInt(catchUpSecondsInput.value) || 0;
            const timeToAddMs = (minutes * 60 + seconds) * 1000;
            if (timeToAddMs > 0) {
                this.state.stopwatch.elapsedTime += timeToAddMs;
                if (this.state.stopwatch.isRunning) {
                    this.state.stopwatch.startTime -= timeToAddMs;
                }
                catchUpMinutesInput.value = '';
                catchUpSecondsInput.value = '';
            }
        },
        setupEventListeners() {
            document.getElementById('startTimer').addEventListener('click', () => this.startTimer());
            document.getElementById('pauseTimer').addEventListener('click', () => this.pauseTimer());
            document.getElementById('resetTimer').addEventListener('click', () => this.resetTimer());
            intervalToggle.addEventListener('change', (e) => this.state.timer.isInterval = e.target.checked);
            startStopwatchBtn.addEventListener('click', () => this.startStopwatch());
            stopStopwatchBtn.addEventListener('click', () => this.stopStopwatch());
            resetStopwatchBtn.addEventListener('click', () => this.resetStopwatch());
            lapStopwatchBtn.addEventListener('click', () => this.lapStopwatch());
            addCatchUpTimeBtn.addEventListener('click', () => this.addManualCatchUpTime());
        }
    };
    window.ToolsModule = ToolsModule;
});
```javascript
// pomodoro.js

document.addEventListener('DOMContentLoaded', function() {
    const statusDisplay = document.getElementById('pomodoroStatus');
    const timerDisplay = document.getElementById('pomodoroTimerDisplay');
    const workDurationInput = document.getElementById('pomodoroWorkDuration');
    const shortBreakDurationInput = document.getElementById('pomodoroShortBreakDuration');
    const longBreakDurationInput = document.getElementById('pomodoroLongBreakDuration');

    const PomodoroModule = {
        state: null,
        settings: null,
        init(appState, appSettings) {
            this.state = appState;
            this.settings = appSettings;
            this.setupEventListeners();
            this.updateDisplay();
        },
        start() {
            if (this.state.pomodoro.isRunning) return;
            this.state.pomodoro.isRunning = true;
            if (this.state.pomodoro.remainingSeconds <= 0) {
                this.startNextPhase();
            }
        },
        pause() {
            this.state.pomodoro.isRunning = false;
        },
        reset() {
            this.state.pomodoro.isRunning = false;
            this.state.pomodoro.phase = 'work';
            this.state.pomodoro.cycles = 0;
            this.state.pomodoro.remainingSeconds = (parseInt(workDurationInput.value) || 25) * 60;
            this.updateDisplay();
            document.dispatchEvent(new CustomEvent('pomodoro-reset'));
        },
        startNextPhase() {
            let nextPhase = 'work';
            let duration = (parseInt(workDurationInput.value) || 25) * 60;
            if (this.state.pomodoro.phase === 'work') {
                this.state.pomodoro.cycles++;
                if (this.state.pomodoro.cycles % 4 === 0) {
                    nextPhase = 'longBreak';
                    duration = (parseInt(longBreakDurationInput.value) || 15) * 60;
                } else {
                    nextPhase = 'shortBreak';
                    duration = (parseInt(shortBreakDurationInput.value) || 5) * 60;
                }
            }
            this.state.pomodoro.phase = nextPhase;
            this.state.pomodoro.remainingSeconds = duration;
            this.playSound();
            this.updateDisplay();
        },
        updateDisplay() {
            const minutes = Math.floor(this.state.pomodoro.remainingSeconds / 60);
            const seconds = Math.floor(this.state.pomodoro.remainingSeconds % 60);
            timerDisplay.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            let statusText = "Work Session";
            if (this.state.pomodoro.phase === 'shortBreak') statusText = "Short Break";
            if (this.state.pomodoro.phase === 'longBreak') statusText = "Long Break";
            statusDisplay.textContent = statusText;
        },
        playSound() {
            const event = new CustomEvent('play-sound', { detail: { soundFile: this.settings.timerSound } });
            document.dispatchEvent(event);
        },
        setupEventListeners() {
            document.getElementById('startPomodoro').addEventListener('click', () => this.start());
            document.getElementById('pausePomodoro').addEventListener('click', () => this.pause());
            document.getElementById('resetPomodoro').addEventListener('click', () => this.reset());
        }
    };
    window.PomodoroModule = PomodoroModule;
});
