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
        // This is a placeholder for the full alarm checking logic
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

    const drawLabel = (arc) => {
        const textX = dimensions.centerX;
        const textY = dimensions.centerY + arc.radius;
        
        let fontSizeMultiplier = (arc.key === 'month') ? 0.8 : 0.6;
        let circleSizeMultiplier = (arc.key === 'month') ? 0.85 : 0.7;
        if (settings.labelDisplayMode === 'percentage') fontSizeMultiplier *= 0.85; 

        const circleRadius = arc.lineWidth * circleSizeMultiplier;
        ctx.beginPath();
        ctx.arc(textX, textY, circleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#000000';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(textX, textY, circleRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `${arc.lineWidth * fontSizeMultiplier}px Bahnschrift`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(arc.text, textX, textY);
    };
    
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

    const getLabelText = (unit, now) => {
        const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds(), milliseconds = now.getMilliseconds();
        const daysInMonth = getDaysInMonth(year, month);

        switch (settings.labelDisplayMode) {
            case 'percentage':
                let percent = 0;
                const totalMsInDay = 86400000;
                const currentMsInDay = (hours * 3600 + minutes * 60 + seconds) * 1000 + milliseconds;
                if (unit === 'seconds') percent = (seconds * 1000 + milliseconds) / 60000 * 100;
                if (unit === 'minutes') percent = (minutes * 60000 + seconds * 1000 + milliseconds) / 3600000 * 100;
                if (unit === 'hours') percent = ((hours % 12) * 3600000 + minutes * 60000 + seconds * 1000 + milliseconds) / 43200000 * 100;
                if (unit === 'day') percent = ((date - 1) * totalMsInDay + currentMsInDay) / (daysInMonth * totalMsInDay) * 100;
                if (unit === 'month') percent = (month + ((date - 1) * totalMsInDay + currentMsInDay) / (daysInMonth * totalMsInDay)) / 12 * 100;
                return `${Math.floor(percent)}%`;
            case 'remainder':
                if (unit === 'seconds') return 59 - seconds;
                if (unit === 'minutes') return 59 - minutes;
                if (unit === 'hours') return 11 - (hours % 12);
                if (unit === 'day') return daysInMonth - date;
                if (unit === 'month') return 11 - month;
                return '';
            default: // standard
                if (unit === 'seconds') return seconds.toString().padStart(2, '0');
                if (unit === 'minutes') return minutes.toString().padStart(2, '0');
                if (unit === 'hours') {
                    if (settings.is24HourFormat) {
                        return hours.toString().padStart(2, '0');
                    } else {
                        return (hours % 12 || 12).toString();
                    }
                }
                if (unit === 'day') return date.toString();
                if (unit === 'month') return (month + 1).toString().padStart(2, '0');
                return '';
        }
    };

    const drawClock = () => {
        const now = new Date();
        const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
        const daysInMonth = getDaysInMonth(year, month);

        const monthEndAngle = baseStartAngle + ((month + date / daysInMonth) / 12) * Math.PI * 2;
        const dayEndAngle = baseStartAngle + ((date - 1 + (hours + minutes / 60) / 24) / daysInMonth) * Math.PI * 2;
        const hoursEndAngle = baseStartAngle + (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;
        const minutesEndAngle = baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
        const secondsEndAngle = baseStartAngle + ((seconds + now.getMilliseconds() / 1000) / 60) * Math.PI * 2;
        
        const arcs = [
            { key: 'month', radius: dimensions.monthRadius, colors: settings.currentColors.month, lineWidth: 20, endAngle: monthEndAngle },
            { key: 'day', radius: dimensions.dayRadius, colors: settings.currentColors.day, lineWidth: 30, endAngle: dayEndAngle },
            { key: 'hours', radius: dimensions.hoursRadius, colors: settings.currentColors.hours, lineWidth: 45, endAngle: hoursEndAngle },
            { key: 'minutes', radius: dimensions.minutesRadius, colors: settings.currentColors.minutes, lineWidth: 30, endAngle: minutesEndAngle },
            { key: 'seconds', radius: dimensions.secondsRadius, colors: settings.currentColors.seconds, lineWidth: 30, endAngle: secondsEndAngle }
        ];

        drawTrackedAlarmTimer(now);
        if (state.timer.totalSeconds > 0 && dimensions.timerRadius > 0) {
            const timerProgress = state.timer.remainingSeconds / state.timer.totalSeconds;
            const timerStartAngle = baseStartAngle + (1 - timerProgress) * Math.PI * 2;
            drawArc(dimensions.centerX, dimensions.centerY, dimensions.timerRadius, timerStartAngle, baseStartAngle + Math.PI * 2, '#FF8A80', '#D50000', 30);
        }
        arcs.forEach(arc => {
            if (arc.radius > 0 && settings.currentColors) {
                drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, arc.endAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
                arc.text = getLabelText(arc.key, now);
                drawLabel(arc);
            }
        });
        
        lastNow = now;
    };

    const drawStopwatch = () => {
        const time = new Date(state.stopwatch.elapsedTime);
        const milliseconds = time.getUTCMilliseconds();
        const seconds = time.getUTCSeconds();
        const minutes = time.getUTCMinutes();
        const hours = time.getUTCHours();

        const secondsEndAngle = baseStartAngle + ((seconds + milliseconds / 1000) / 60) * Math.PI * 2;
        const minutesEndAngle = baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
        const hoursEndAngle = baseStartAngle + (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;

        const arcs = [
            { key: 'hours', radius: dimensions.hoursRadius, colors: settings.currentColors.hours, lineWidth: 45, endAngle: hoursEndAngle, text: hours.toString().padStart(2, '0') },
            { key: 'minutes', radius: dimensions.minutesRadius, colors: settings.currentColors.minutes, lineWidth: 30, endAngle: minutesEndAngle, text: minutes.toString().padStart(2, '0') },
            { key: 'seconds', radius: dimensions.secondsRadius, colors: settings.currentColors.seconds, lineWidth: 30, endAngle: secondsEndAngle, text: seconds.toString().padStart(2, '0') }
        ];

        arcs.forEach(arc => {
            if (arc.radius > 0 && settings.currentColors) {
                drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, arc.endAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
                drawLabel(arc);
            }
        });
    };

    function drawTrackedAlarmTimer(now) {
        // ... drawing logic for tracked alarm ...
    }

    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        if (state.mode === 'stopwatch') {
            drawStopwatch();
        } else {
            drawClock();
        }
        requestAnimationFrame(animate);
    };

    const ClockModule = {
        init() {
            this.resize();
            window.addEventListener('resize', () => this.resize());
            if (canvas.width > 0 && canvas.height > 0) {
                animate();
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
```javascript
// alarms.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. STATE MANAGEMENT & CONSTANTS ---
    let alarms = [];
    let groups = [];
    let editingAlarmId = null;
    let tempAlarmData = null;
    let isBatchEditMode = false;
    let selectedAlarmIds = [];
    let batchChanges = {};
    let editingGroupId = null;
    let settings = {
        timeFormat: '12h',
        frequencyDisplay: 'standard',
        alarmPalette: 'default',
        showOnlyUnorganized: false,
        searchQuery: '',
        sortOrder: 'creation_desc',
    };
    const palettes = {
        default: ['bg-slate-500', 'bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500', 'bg-indigo-500'],
        neon: ['bg-lime-400', 'bg-fuchsia-500', 'bg-cyan-400', 'bg-emerald-400', 'bg-amber-400', 'bg-pink-500'],
        pastel: ['bg-pink-300', 'bg-blue-300', 'bg-green-300', 'bg-yellow-300', 'bg-purple-300', 'bg-gray-400'],
        colorblind: ['bg-blue-600', 'bg-orange-500', 'bg-yellow-400', 'bg-cyan-400', 'bg-gray-400', 'bg-pink-500']
    };
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

    const ALARM_MODAL_TEMPLATE = `
        <div class="bg-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 id="modalTitle" class="text-2xl font-semibold mb-6 text-center">Add Alarm</h3>
            <div class="flex justify-center items-center mb-6">
                <input type="number" id="modalHour" class="time-input bg-slate-700 text-5xl font-mono w-24 text-center rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" value="07" min="1" max="12">
                <span class="text-5xl font-mono mx-2">:</span>
                <input type="number" id="modalMinute" class="time-input bg-slate-700 text-5xl font-mono w-24 text-center rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500" value="30" min="0" max="59">
                <div id="modalAmPmContainer" class="ml-4 text-xl">
                    <select id="modalAmPm" class="bg-slate-700 rounded-lg p-2 outline-none focus:ring-2 focus:ring-indigo-500">
                        <option>AM</option>
                        <option>PM</option>
                    </select>
                </div>
            </div>
            <div class="mb-6">
                <label class="block text-slate-400 mb-2">Repeat</label>
                <div id="daySelector" class="flex justify-between">
                    <button data-day="0" class="day-btn bg-slate-700 w-10 h-10 rounded-full hover:bg-slate-600 transition-colors">S</button>
                    <button data-day="1" class="day-btn bg-slate-700 w-10 h-10 rounded-full hover:bg-slate-600 transition-colors">M</button>
                    <button data-day="2" class="day-btn bg-slate-700 w-10 h-10 rounded-full hover:bg-slate-600 transition-colors">T</button>
                    <button data-day="3" class="day-btn bg-slate-700 w-10 h-10 rounded-full hover:bg-slate-600 transition-colors">W</button>
                    <button data-day="4" class="day-btn bg-slate-700 w-10 h-10 rounded-full hover:bg-slate-600 transition-colors">T</button>
                    <button data-day="5" class="day-btn bg-slate-700 w-10 h-10 rounded-full hover:bg-slate-600 transition-colors">F</button>
                    <button data-day="6" class="day-btn bg-slate-700 w-10 h-10 rounded-full hover:bg-slate-600 transition-colors">S</button>
                </div>
            </div>
            <div class="flex gap-4 mb-4">
                <div class="w-1/2">
                    <label for="alarmLabel" class="block text-slate-400 mb-1">Label</label>
                    <input type="text" id="alarmLabel" maxlength="15" class="w-full bg-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Wake Up">
                    <span id="labelCharCount" class="text-xs text-slate-500">0/15</span>
                </div>
                <div class="w-1/2">
                    <label for="alarmGroupSelect" class="block text-slate-400 mb-1">Group</label>
                    <select id="alarmGroupSelect" class="w-full bg-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500"></select>
                    <div id="newGroupContainer" class="relative mt-2 hidden">
                        <input type="text" id="newGroupInput" maxlength="10" class="w-full bg-slate-700 rounded-lg p-3 pr-16 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="New Group Name">
                        <div class="absolute right-1 top-1/2 -translate-y-1/2 flex items-center">
                            <button id="confirmNewGroupBtn" class="p-2 text-green-400 hover:text-green-300"><i class="ph-check"></i></button>
                            <button id="cancelNewGroupBtn" class="p-2 text-red-400 hover:text-red-300"><i class="ph-x"></i></button>
                        </div>
                    </div>
                </div>
            </div>
             <div class="mb-4">
                <label for="alarmDescription" class="block text-slate-400 mb-1">Description (Optional)</label>
                <textarea id="alarmDescription" maxlength="35" rows="2" class="w-full bg-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Details..."></textarea>
                <span id="descriptionCharCount" class="text-xs text-slate-500">0/35</span>
            </div>
            <div class="mb-4">
                <label for="soundSelector" class="block text-slate-400 mb-1">Sound</label>
                <div class="flex items-center gap-2">
                    <select id="soundSelector" class="w-full bg-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="Ahooga.wav">Ahooga</option>
                        <option value="bell01.mp3" selected>Bell 1</option>
                        <option value="Bwauhm.mp3">Bwauhm</option>
                        <option value="Lenovo_Error.mp3">Lenovo Error</option>
                        <option value="nice_digital_watch.mp3">Nice Watch</option>
                        <option value="rotten_digital_watch.wav">Rotten Watch</option>
                        <option value="Tick_Tock.wav">Tick Tock 1</option>
                        <option value="Tick_Tock_Two.wav">Tick Tock 2</option>
                    </select>
                    <button type="button" id="previewAlarmSound" class="bg-slate-600 hover:bg-slate-500 text-white font-bold py-3 px-4 rounded-lg flex items-center transition-colors duration-300">
                        <i class="ph-play text-xl"></i>
                    </button>
                </div>
            </div>
            <div class="mb-6">
                <label class="block text-slate-400 mb-2">Color</label>
                <div id="colorSelector" class="flex justify-between items-center"></div>
            </div>
            <div class="flex justify-between items-center">
                <button id="deleteAlarmBtn" class="text-red-500 hover:text-red-400 font-semibold transition-colors hidden">Delete</button>
                <div>
                    <button id="cancelBtn" class="bg-slate-600 hover:bg-slate-500 text-white font-bold py-2 px-6 rounded-lg mr-2 transition-colors">Cancel</button>
                    <button id="saveBtn" class="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-lg transition-colors">Save</button>
                </div>
            </div>
        </div>`;

    // --- 2. DOM Element Selections ---
    const elements = {
        mainContent: document.getElementById('mainContent'),
        currentTime: document.getElementById('currentTime'),
        currentDate: document.getElementById('currentDate'),
        alarmList: document.getElementById('alarmList'),
        noAlarmsView: document.getElementById('noAlarmsView'),
        noAlarmsSubtext: document.getElementById('noAlarmsSubtext'),
        header: {
            actions: document.getElementById('headerActions'),
            addAlarmBtn: document.getElementById('addAlarmBtn'),
            manageGroupsBtn: document.getElementById('manageGroupsBtn'),
            batchEditBtn: document.getElementById('batchEditBtn'),
        },
        batch: {
            actions: document.getElementById('batchEditActions'),
            cancelBtn: document.getElementById('cancelBatchEditBtn'),
            confirmBtn: document.getElementById('confirmBatchEditBtn'),
            deleteBtn: document.getElementById('batchDeleteBtn'),
            selectionCount: document.getElementById('selectionCount'),
        },
        settingsBar: {
            timeFormatToggle: document.getElementById('timeFormatToggle'),
            frequencyToggle: document.getElementById('frequencyToggle'),
            unorganizedToggle: document.getElementById('unorganizedToggle'),
            paletteSelector: document.getElementById('alarmPaletteSelector'),
            searchBar: document.getElementById('searchBar'),
            sortAlarms: document.getElementById('sortAlarms'),
        },
        modals: {
            alarm: document.getElementById('alarmModal'),
            temporaryConfirm: document.getElementById('tempAlarmModal'),
            batchConfirm: document.getElementById('batchConfirmModal'),
            batchDeleteConfirm: document.getElementById('batchDeleteConfirmModal'),
            manageGroups: document.getElementById('manageGroupsModal'),
            applyGroupDefaults: document.getElementById('applyGroupDefaultsModal'),
        },
        tempConfirm: {
            goBackBtn: document.getElementById('goBackBtn'),
            oneTimeBtn: document.getElementById('oneTimeBtn'),
            keepFinishedBtn: document.getElementById('keepFinishedBtn'),
        },
        batchConfirm: {
            list: document.getElementById('batchChangesList'),
            returnBtn: document.getElementById('returnToEditingBtn'),
            confirmBtn: document.getElementById('confirmBatchChangesBtn'),
        },
        batchDelete: {
            text: document.getElementById('batchDeleteText'),
            cancelBtn: document.getElementById('cancelBatchDeleteBtn'),
            confirmBtn: document.getElementById('confirmBatchDeleteBtn'),
        },
        groups: {
            container: document.getElementById('groupListContainer'),
            list: document.getElementById('groupsList'),
            showCreateBtn: document.getElementById('showCreateGroupBtn'),
            editContainer: document.getElementById('groupEditContainer'),
            closeBtn: document.getElementById('closeGroupsModalBtn'),
        },
        applyDefaults: {
            applyBtn: document.getElementById('applyDefaultsBtn'),
            dontApplyBtn: document.getElementById('dontApplyDefaultsBtn'),
        }
    };

    // --- 3. LOCALSTORAGE FUNCTIONS ---
    function saveStateToStorage() {
        localStorage.setItem('polarAlarms', JSON.stringify(alarms));
        localStorage.setItem('polarGroups', JSON.stringify(groups));
        localStorage.setItem('polarSettings', JSON.stringify(settings));
    }
    function loadStateFromStorage() {
        const storedAlarms = localStorage.getItem('polarAlarms');
        const storedGroups = localStorage.getItem('polarGroups');
        const storedSettings = localStorage.getItem('polarSettings');
        if (storedAlarms) alarms = JSON.parse(storedAlarms);
        if (storedGroups) groups = JSON.parse(storedGroups);
        if (storedSettings) settings = { ...settings, ...JSON.parse(storedSettings) };
    }

    // --- 4. CORE FUNCTIONS ---
    function applySettings() {
        elements.settingsBar.timeFormatToggle.checked = settings.timeFormat === '24h';
        elements.settingsBar.frequencyToggle.checked = settings.frequencyDisplay === 'except';
        elements.settingsBar.unorganizedToggle.checked = settings.showOnlyUnorganized;
        elements.settingsBar.paletteSelector.value = settings.alarmPalette;
        elements.settingsBar.searchBar.value = settings.searchQuery;
        elements.settingsBar.sortAlarms.value = settings.sortOrder;
        updateClock();
        renderAlarms();
    }

    function createAlarmCardHTML(alarm) {
        const timeData = formatTime(alarm.hour, alarm.minute, alarm.ampm);
        const daysStr = getDaysString(alarm.days);
        const groupStr = alarm.group ? `<span class="bg-slate-700 text-xs px-2 py-1 rounded-full">${alarm.group}</span>` : '';
        const descriptionStr = alarm.description ? `<p class="text-muted text-sm mt-2 italic truncate">${alarm.description}</p>` : '';
        const temporaryStr = alarm.isTemporary ? `<p class="text-red-400 font-bold text-sm mt-1">Temporary</p>` : `<p class="text-muted text-sm mt-1">${daysStr}</p>`;

        return `
            <div class="absolute left-0 top-0 bottom-0 w-3 ${alarm.color || 'bg-transparent'}"></div>
            <div class="absolute right-0 top-0 bottom-0 w-3 ${alarm.color || 'bg-transparent'}"></div>
            <div class="px-5 flex-grow">
                <div class="flex justify-between items-start">
                    <p class="text-4xl font-mono time-display">${timeData.time} <span class="text-2xl">${timeData.ampm}</span></p>
                    <div class="text-right space-y-1">
                        <p class="text-sm font-semibold">${alarm.label || 'Alarm'}</p>
                        ${groupStr}
                    </div>
                </div>
                <div>
                    ${temporaryStr}
                    ${descriptionStr}
                </div>
            </div>
            <div class="px-5 flex items-center justify-between mt-4">
                <div class="flex items-center gap-2">
                    <label for="track-${alarm.id}" class="text-sm font-medium">Track</label>
                    <div class="relative inline-block w-12 align-middle select-none transition duration-200 ease-in z-10">
                        <input type="checkbox" data-action="track" id="track-${alarm.id}" class="toggle-checkbox absolute block w-7 h-7 rounded-full bg-white border-4 appearance-none cursor-pointer" ${alarm.isTracked ? 'checked' : ''} ${!alarm.enabled ? 'disabled' : ''}/>
                        <label for="track-${alarm.id}" class="toggle-label block overflow-hidden h-7 rounded-full bg-slate-600 cursor-pointer"></label>
                    </div>
                </div>
                <button data-action="edit" class="p-2 rounded-full hover:bg-slate-700 transition-colors"><i class="ph-pencil-simple text-xl"></i></button>
                 <div class="flex items-center gap-2">
                    <label for="toggle-${alarm.id}" class="text-sm font-medium">Enable</label>
                    <div class="relative inline-block w-12 align-middle select-none transition duration-200 ease-in z-10">
                        <input type="checkbox" data-action="toggle" id="toggle-${alarm.id}" class="toggle-checkbox absolute block w-7 h-7 rounded-full bg-white border-4 appearance-none cursor-pointer" ${alarm.enabled ? 'checked' : ''}/>
                        <label for="toggle-${alarm.id}" class="toggle-label block overflow-hidden h-7 rounded-full bg-slate-600 cursor-pointer"></label>
                    </div>
                </div>
            </div>
        `;
    }

    function renderAlarms() {
        let alarmsToRender = [...alarms];

        if (settings.showOnlyUnorganized) {
            alarmsToRender = alarmsToRender.filter(a => !a.group && !a.color);
        }
        
        if (settings.searchQuery) {
            const query = settings.searchQuery.toLowerCase();
            const dayIndex = dayNames.findIndex(day => day.startsWith(query));
            alarmsToRender = alarmsToRender.filter(a => {
                const timeData = formatTime(a.hour, a.minute, a.ampm);
                const timeStr = `${timeData.time}${timeData.ampm}`.toLowerCase();
                return (a.label && a.label.toLowerCase().includes(query)) ||
                       (a.group && a.group.toLowerCase().includes(query)) ||
                       (a.description && a.description.toLowerCase().includes(query)) ||
                       timeStr.includes(query) ||
                       (dayIndex !== -1 && a.days.includes(dayIndex));
            });
        }

        elements.alarmList.innerHTML = '';
        const hasResults = alarmsToRender.length > 0;
        elements.noAlarmsView.style.display = hasResults ? 'none' : 'block';
        elements.alarmList.style.display = hasResults ? 'grid' : 'none';
        
        if (!hasResults && (settings.searchQuery || settings.showOnlyUnorganized)) {
            elements.noAlarmsSubtext.textContent = "No alarms match your current filters.";
        } else if (alarms.length === 0) {
            elements.noAlarmsSubtext.textContent = 'Click "Add Alarm" to get started.';
        }

        sortAlarms(alarmsToRender);

        alarmsToRender.forEach(alarm => {
            const alarmDiv = document.createElement('div');
            const isSelected = selectedAlarmIds.includes(alarm.id);
            alarmDiv.className = `alarm-card card-bg rounded-2xl p-4 flex flex-col justify-between shadow-lg transition-all relative overflow-hidden border-2 ${isSelected ? 'border-blue-400' : 'border-transparent'} ${!alarm.enabled ? 'opacity-60' : ''}`;
            alarmDiv.dataset.id = alarm.id;
            alarmDiv.innerHTML = createAlarmCardHTML(alarm);
            elements.alarmList.appendChild(alarmDiv);
        });
    }
    
    function getDaysString(days) {
        if (!days || days.length === 0) return 'Once';
        const dayMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        if (days.length === 7) return 'Everyday';
        if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';
        if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
        if (settings.frequencyDisplay === 'except' && days.length >= 4) {
            const allDays = [0, 1, 2, 3, 4, 5, 6];
            const excludedDays = allDays.filter(d => !days.includes(d));
            return `Except ${excludedDays.map(d => dayMap[d]).join(', ')}`;
        }
        return days.map(d => dayMap[d]).join(', ');
    }

    function handleSaveAttempt() {
        const alarmModalInstance = elements.modals.alarm;
        if (isBatchEditMode) {
            showBatchConfirmModal(alarmModalInstance);
            return;
        }

        const selectedDays = Array.from(alarmModalInstance.querySelector('#daySelector').querySelectorAll('.active')).map(btn => parseInt(btn.dataset.day));
        const selectedColorSwatch = alarmModalInstance.querySelector('#colorSelector .selected');
        const selectedColor = selectedColorSwatch ? selectedColorSwatch.dataset.color : null;

        let hour = alarmModalInstance.querySelector('#modalHour').value;
        let ampm = alarmModalInstance.querySelector('#modalAmPm').value;
        if (settings.timeFormat === '24h') {
            const h24 = parseInt(hour);
            ampm = h24 >= 12 ? 'PM' : 'AM';
            hour = h24 % 12;
            if (hour === 0) hour = 12;
        }

        let group = alarmModalInstance.querySelector('#alarmGroupSelect').value;
        if (group === 'new_group') {
            group = '';
        }

        tempAlarmData = {
            hour: hour.toString(),
            minute: alarmModalInstance.querySelector('#modalMinute').value,
            ampm: ampm,
            days: selectedDays,
            label: alarmModalInstance.querySelector('#alarmLabel').value,
            group: group,
            description: alarmModalInstance.querySelector('#alarmDescription').value,
            color: selectedColor,
            sound: alarmModalInstance.querySelector('#soundSelector').value,
        };
        
        if (selectedDays.length === 0 && !editingAlarmId) {
            showModal(elements.modals.temporaryConfirm);
            elements.mainContent.classList.add('backdrop-blur-sm');
        } else {
            finalizeSave(false);
        }
    }
    
    function finalizeSave(isTemporary) {
        const alarmData = {
            ...tempAlarmData,
            id: editingAlarmId || Date.now(),
            enabled: true,
            isTracked: false,
            isTemporary: isTemporary,
            createdAt: editingAlarmId ? alarms.find(a => a.id === editingAlarmId).createdAt : new Date().toISOString()
        };

        if (editingAlarmId) {
            const index = alarms.findIndex(a => a.id === editingAlarmId);
            const existingAlarm = alarms[index];
            alarmData.enabled = existingAlarm.enabled;
            alarmData.isTracked = existingAlarm.isTracked;
            alarms[index] = alarmData;
        } else {
            alarms.push(alarmData);
        }
        
        saveStateToStorage();
        renderAlarms();
        hideModal(elements.modals.alarm);
        hideModal(elements.modals.temporaryConfirm);
        elements.mainContent.classList.remove('backdrop-blur-sm');
        tempAlarmData = null;
    }

    function deleteAlarm() {
        if (!editingAlarmId) return;
        alarms = alarms.filter(alarm => alarm.id !== editingAlarmId);
        saveStateToStorage();
        renderAlarms();
        hideModal(elements.modals.alarm);
    }

    // --- 5. UTILITY FUNCTIONS ---
    function sortAlarms(alarmArray) {
        alarmArray.sort((a, b) => {
            switch (settings.sortOrder) {
                case 'creation_desc': 
                    const dateA = a.createdAt ? new Date(a.createdAt) : 0;
                    const dateB = b.createdAt ? new Date(b.createdAt) : 0;
                    return dateB - dateA;
                case 'time':
                    const timeA = convertTo24Hour(a.hour, a.ampm) * 60 + parseInt(a.minute);
                    const timeB = convertTo24Hour(b.hour, b.ampm) * 60 + parseInt(b.minute);
                    return timeA - timeB;
                case 'label': return (a.label || '').localeCompare(b.label || '');
                case 'group': return (a.group || '').localeCompare(b.group || '');
                case 'color': return (a.color || '').localeCompare(b.color || '');
                default: return 0;
            }
        });
    }

    function convertTo24Hour(hour, ampm) {
        hour = parseInt(hour);
        if (ampm === 'PM' && hour !== 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        return hour;
    }

    function formatTime(hour, minute, ampm) {
        if (settings.timeFormat === '24h') {
            const h24 = convertTo24Hour(hour, ampm);
            return { time: `${h24.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`, ampm: '' };
        }
        return { time: `${hour}:${minute.toString().padStart(2, '0')}`, ampm: ampm };
    }

    function updateClock() {
        const now = new Date();
        const use24Hour = settings.timeFormat === '24h';
        let timeString;
        if(use24Hour) {
            const h24 = now.getHours().toString().padStart(2, '0');
            const min = now.getMinutes().toString().padStart(2, '0');
            timeString = `${h24}:${min}`;
        } else {
            timeString = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
        }
        const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        elements.currentTime.textContent = timeString;
        elements.currentDate.textContent = dateString;
    }

    // --- 6. Modal Control & UI Updates ---
    function playSound(soundFile, volume = 1.0) {
        if (!soundFile) return;
        const audio = new Audio(`assets/sounds/${soundFile}`);
        audio.volume = volume;
        audio.play().catch(e => console.error("Error playing sound:", e));
        setTimeout(() => {
            audio.pause();
            audio.currentTime = 0;
        }, 4000);
    }

    function updateCharCount(input, countEl) {
        countEl.textContent = `${input.value.length}/${input.maxLength}`;
    }
    
    function populateColorPicker(container) {
        const currentPalette = palettes[settings.alarmPalette];
        container.innerHTML = currentPalette.map(color => 
            `<button class="color-swatch w-10 h-10 rounded-full ${color}" data-color="${color}"></button>`
        ).join('');
    }

    function populateGroupDropdown(selectEl, selectedGroup = '') {
        selectEl.innerHTML = `
            <option value="">---</option>
            ${groups.map(g => `<option value="${g.name}" ${g.name === selectedGroup ? 'selected' : ''}>${g.name}</option>`).join('')}
            <option value="new_group">-- New Group --</option>
        `;
    }

    function showModal(modalEl) { modalEl.classList.remove('hidden'); }
    function hideModal(modalEl) { modalEl.classList.add('hidden'); }

    function populateAlarmModal(modalInstance, mode, alarm) {
        // ... (implementation remains the same)
    }

    function setupAlarmModalEventListeners(modalInstance) {
        // ... (implementation remains the same)
    }

    function showAlarmModal(mode = 'add', alarm = null) {
        elements.modals.alarm.innerHTML = ALARM_MODAL_TEMPLATE;
        const is24h = settings.timeFormat === '24h';
        elements.modals.alarm.querySelector('#modalAmPmContainer').style.display = is24h ? 'none' : 'block';
        elements.modals.alarm.querySelector('#modalHour').max = is24h ? '23' : '12';
        elements.modals.alarm.querySelector('#modalHour').min = is24h ? '0' : '1';
        populateAlarmModal(elements.modals.alarm, mode, alarm);
        setupAlarmModalEventListeners(elements.modals.alarm);
        showModal(elements.modals.alarm);
    }
    
    function confirmNewGroup(selectEl, containerEl, inputEl) {
        // ... (implementation remains the same)
    }
    
    // --- 7. BATCH EDIT & GROUP FUNCTIONS ---
    // ... (All batch and group functions remain the same)

    // --- 8. EVENT LISTENER SETUP ---
    function setupHeaderEventListeners() {
        // ... (implementation remains the same)
    }
    function setupSettingsBarEventListeners() {
        // ... (implementation remains the same)
    }
    function setupAlarmListEventListeners() {
        // ... (implementation remains the same)
    }
    function setupModalEventListeners() {
        // ... (implementation remains the same)
    }

    // --- 9. Initialization ---
    function initializeApp() {
        loadStateFromStorage();
        applySettings();
        setupHeaderEventListeners();
        setupSettingsBarEventListeners();
        setupAlarmListEventListeners();
        setupModalEventListeners();
        setInterval(updateClock, 1000);
        console.log("Polar Alarm Clock UI Initialized.");
    }

    initializeApp();
});
