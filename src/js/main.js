// --- CONSOLIDATED DOM ELEMENTS ---
const clocksGrid = document.getElementById('clocks-grid');
// const digitalTime = document.getElementById('digitalTime');
// const digitalDate = document.getElementById('digitalDate');
// Views
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const customizeView = document.getElementById('customizeView');
const toolsView = document.getElementById('toolsView');
// Main Navigation
const addClockBtn = document.getElementById('addClockBtn');
const goToSettingsBtn = document.getElementById('goToSettingsBtn');
const goToCustomizeBtn = document.getElementById('goToCustomizeBtn');
const goToToolsBtn = document.getElementById('goToToolsBtn');
const backToMainFromSettings = document.getElementById('backToMainFromSettings');
const backToMainFromCustomize = document.getElementById('backToMainFromCustomize');
const backToMainFromTools = document.getElementById('backToMainFromTools');
// Tools Tabs
const timerTab = document.getElementById('timerTab');
const alarmTab = document.getElementById('alarmTab');
const stopwatchTab = document.getElementById('stopwatchTab');
const timerPanel = document.getElementById('timerPanel');
const alarmPanel = document.getElementById('alarmPanel');
const stopwatchPanel = document.getElementById('stopwatchPanel');
// Timer
const timerHoursInput = document.getElementById('timerHours');
const timerMinutesInput = document.getElementById('timerMinutes');
const timerSecondsInput = document.getElementById('timerSeconds');
const intervalToggle = document.getElementById('intervalToggle');
// Alarm (Legacy UI)
const alarmHoursInput = document.getElementById('alarmHours');
const alarmMinutesInput = document.getElementById('alarmMinutes');
const alarmToggle = document.getElementById('alarmToggle');
const amPmContainer = document.getElementById('amPmContainer');
const amButton = document.getElementById('amButton');
const pmButton = document.getElementById('pmButton');
// Settings
const format12Button = document.getElementById('format12');
const format24Button = document.getElementById('format24');
const modeStandardBtn = document.getElementById('modeStandard');
const modePercentageBtn = document.getElementById('modePercentage');
const modeRemainderBtn = document.getElementById('modeRemainder');
// Customize
const presetDefaultBtn = document.getElementById('presetDefault');
const presetNeonBtn = document.getElementById('presetNeon');
const presetPastelBtn = document.getElementById('presetPastel');
const presetColorblindBtn = document.getElementById('presetColorblind');
const gradientToggle = document.getElementById('gradientToggle');
const dateLinesToggle = document.getElementById('dateLinesToggle');
const timeLinesToggle = document.getElementById('timeLinesToggle');

// --- GLOBAL STATE ---
const MAX_CLOCKS = 12;
let clocks = []; // Centralized array for all clock instances
let settings = {};
const baseStartAngle = -Math.PI / 2;
let lastTimestamp = 0;

// --- NEW ADVANCED ALARM STATE ---
let lastMinuteChecked = -1; // To prevent multiple triggers in the same minute

// Audio
const feedbackDelay = new Tone.FeedbackDelay("8n", 0.5).toDestination();
const alarmSynth = new Tone.Synth({ volume: -8 }).connect(feedbackDelay);
let isToneStarted = false;

// Color Palettes
const colorPalettes = {
    default: { month: { light: '#D05CE3', dark: '#4A0055' }, day: { light: '#81C784', dark: '#003D00' }, hours: { light: '#FF9E80', dark: '#8C1C00' }, minutes: { light: '#FFF176', dark: '#B45F06' }, seconds: { light: '#81D4FA', dark: '#002E5C' } },
    neon: { month: { light: '#ff00ff', dark: '#800080' }, day: { light: '#00ff00', dark: '#008000' }, hours: { light: '#ff0000', dark: '#800000' }, minutes: { light: '#ffff00', dark: '#808000' }, seconds: { light: '#00ffff', dark: '#008080' } },
    pastel: { month: { light: '#f4a8e1', dark: '#a1428a' }, day: { light: '#a8f4b6', dark: '#42a155' }, hours: { light: '#f4a8a8', dark: '#a14242' }, minutes: { light: '#f4f4a8', dark: '#a1a142' }, seconds: { light: '#a8e1f4', dark: '#428aa1' } },
    colorblind: { month: { light: '#f7931a', dark: '#a45c05' }, day: { light: '#0072b2', dark: '#003c5c' }, hours: { light: '#d55e00', dark: '#7a3600' }, minutes: { light: '#f0e442', dark: '#8a8326' }, seconds: { light: '#cccccc', dark: '#666666' } }
};

// --- CORE DRAWING & ANIMATION ---

const drawArc = (ctx, x, y, radius, startAngle, endAngle, colorLight, colorDark, lineWidth) => {
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

const animate = (timestamp) => {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;

    updateClockStates(deltaTime);

    clocks.forEach(clock => {
        let clockDiv = document.getElementById(`clock-${clock.id}`);
        if (!clockDiv) {
            clockDiv = document.createElement('div');
            clockDiv.id = `clock-${clock.id}`;
            clockDiv.className = 'clock-instance';

            const canvas = document.createElement('canvas');
            const nameDisplay = document.createElement('div');
            nameDisplay.className = 'clock-name';
            nameDisplay.textContent = clock.name;

            const digitalDisplay = document.createElement('div');
            digitalDisplay.className = 'digital-display-small';
            const controlsDiv = document.createElement('div');
            controlsDiv.className = 'clock-controls';
            const lapsDiv = document.createElement('div');
            lapsDiv.className = 'laps-display';

            let buttons = `<button data-action="close" class="control-btn">Close</button>`;
            if (clock.type === 'timer') {
                buttons += `<button data-action="pause" class="control-btn">Pause</button>`;
            }
            if (clock.type === 'stopwatch') {
                buttons += `<button data-action="pause" class="control-btn">Pause</button>`;
                buttons += `<button data-action="lap" class="control-btn">Lap</button>`;
            }
            controlsDiv.innerHTML = buttons;

            clockDiv.appendChild(nameDisplay);
            clockDiv.appendChild(canvas);
            clockDiv.appendChild(digitalDisplay);
            clockDiv.appendChild(controlsDiv);
            if (clock.type === 'stopwatch') {
                clockDiv.appendChild(lapsDiv);
            }
            clocksGrid.appendChild(clockDiv);
        }

        const canvas = clockDiv.querySelector('canvas');
        if (canvas.offsetWidth > 0 && (canvas.width !== canvas.offsetWidth || canvas.height !== canvas.offsetHeight)) {
            canvas.width = canvas.offsetWidth;
            canvas.height = canvas.offsetHeight;
        }

        if (canvas.width > 0) {
            drawClockInstance(canvas, clock);
        }
    });

    const clockIds = new Set(clocks.map(c => `clock-${c.id}`));
    Array.from(clocksGrid.children).forEach(child => {
        if (!clockIds.has(child.id)) {
            clocksGrid.removeChild(child);
        }
    });

    requestAnimationFrame(animate);
};

function drawClockInstance(canvas, clock) {
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    switch (clock.type) {
        case 'clock':
            drawStandardClock(ctx, width, height, clock);
            break;
        case 'timer':
            drawTimer(ctx, width, height, clock);
            break;
        case 'stopwatch':
            drawStopwatch(ctx, width, height, clock);
            break;
        case 'alarm':
            drawAlarm(ctx, width, height, clock);
            break;
    }
}

function drawAlarm(ctx, width, height, clock) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    const { hour, minute, ampm, triggered } = clock.state;

    if (triggered) {
        // Simple animation for a triggered alarm
        const color = (Math.floor(Date.now() / 500) % 2 === 0) ? '#D50000' : '#FF8A80';
        drawArc(ctx, centerX, centerY, radius, 0, Math.PI * 2, color, color, radius * 0.2);
    } else {
        // Draw a static arc for a set alarm
        drawArc(ctx, centerX, centerY, radius, 0, Math.PI * 2, '#80DEEA', '#006064', radius * 0.2);
    }

    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')} ${ampm}`;
    const digitalDisplay = document.getElementById(`clock-${clock.id}`).querySelector('.digital-display-small');
    if (digitalDisplay) digitalDisplay.textContent = timeStr;
}

function drawStandardClock(ctx, width, height, clock) {
    const centerX = width / 2;
    const centerY = height / 2;
    const clockRadius = Math.min(centerX, centerY) * 0.8;
    const now = new Date();
    const hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
    
    const secondAngle = baseStartAngle + ((seconds + now.getMilliseconds() / 1000) / 60) * Math.PI * 2;
    const minuteAngle = baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
    const hourAngle = baseStartAngle + (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;

    const colors = settings.currentColors;
    const secondRadius = clockRadius;
    const minuteRadius = clockRadius * 0.8;
    const hourRadius = clockRadius * 0.6;
    const lineWidth = clockRadius * 0.1;

    drawArc(ctx, centerX, centerY, secondRadius, baseStartAngle, secondAngle, colors.seconds.light, colors.seconds.dark, lineWidth);
    drawArc(ctx, centerX, centerY, minuteRadius, baseStartAngle, minuteAngle, colors.minutes.light, colors.minutes.dark, lineWidth);
    drawArc(ctx, centerX, centerY, hourRadius, baseStartAngle, hourAngle, colors.hours.light, colors.hours.dark, lineWidth * 1.5);
    
    const timeStr = now.toLocaleTimeString([], { hour12: !settings.is24HourFormat, hour: 'numeric', minute: '2-digit' });
    const digitalDisplay = document.getElementById(`clock-${clock.id}`).querySelector('.digital-display-small');
    if (digitalDisplay) digitalDisplay.textContent = timeStr;
}

function drawTimer(ctx, width, height, clock) {
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(centerX, centerY) * 0.8;
    const { totalSeconds, remainingSeconds } = clock.state;
    
    const progress = Math.max(0, remainingSeconds) / totalSeconds;
    const endAngle = baseStartAngle + progress * Math.PI * 2;

    drawArc(ctx, centerX, centerY, radius, baseStartAngle, endAngle, '#FF8A80', '#D50000', radius * 0.2);

    const minutes = Math.floor(Math.abs(remainingSeconds) / 60);
    const seconds = Math.floor(Math.abs(remainingSeconds) % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    const digitalDisplay = document.getElementById(`clock-${clock.id}`).querySelector('.digital-display-small');
    if (digitalDisplay) digitalDisplay.textContent = timeStr;
}

function drawStopwatch(ctx, width, height, clock) {
    const centerX = width / 2;
    const centerY = height / 2;
    const clockRadius = Math.min(centerX, centerY) * 0.8;
    const { elapsedTime } = clock.state;

    const time = new Date(elapsedTime);
    const milliseconds = time.getUTCMilliseconds();
    const seconds = time.getUTCSeconds();
    const minutes = time.getUTCMinutes();

    const secondAngle = baseStartAngle + ((seconds + milliseconds / 1000) / 60) * Math.PI * 2;
    const minuteAngle = baseStartAngle + (minutes / 60) * Math.PI * 2;

    const colors = settings.currentColors;
    const secondRadius = clockRadius;
    const minuteRadius = clockRadius * 0.8;
    const lineWidth = clockRadius * 0.1;

    drawArc(ctx, centerX, centerY, minuteRadius, baseStartAngle, minuteAngle, colors.minutes.light, colors.minutes.dark, lineWidth);
    drawArc(ctx, centerX, centerY, secondRadius, baseStartAngle, secondAngle, colors.seconds.light, colors.seconds.dark, lineWidth);
    
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${milliseconds.toString().padStart(3, '0')}`;
    const digitalDisplay = document.getElementById(`clock-${clock.id}`).querySelector('.digital-display-small');
    if (digitalDisplay) digitalDisplay.textContent = timeStr;
}

// --- UI & CONTROLS ---

// View Switching
function showView(viewToShow) {
    [mainView, settingsView, customizeView, toolsView].forEach(v => v.style.display = 'none');
    viewToShow.style.display = 'flex';
    if (viewToShow !== toolsView) currentMode = 'clock';
}
goToSettingsBtn.addEventListener('click', () => showView(settingsView));
goToCustomizeBtn.addEventListener('click', () => showView(customizeView));
goToToolsBtn.addEventListener('click', () => showView(toolsView));
backToMainFromSettings.addEventListener('click', () => showView(mainView));
backToMainFromCustomize.addEventListener('click', () => showView(mainView));
backToMainFromTools.addEventListener('click', () => showView(mainView));
goToAlarmsBtn.addEventListener('click', () => { window.location.href = 'alarms.html'; });


// Tools Tabs
function showToolsPanel(panelToShow, tabToActivate) {
    [timerPanel, alarmPanel, stopwatchPanel].forEach(p => p.style.display = 'none');
    panelToShow.style.display = 'flex';
    handleActiveButton(tabToActivate, [timerTab, alarmTab, stopwatchTab]);
    currentMode = (panelToShow === stopwatchPanel) ? 'stopwatch' : 'clock';
    if (currentMode === 'stopwatch') resetStopwatch(); // Reset on tab switch
}
timerTab.addEventListener('click', () => showToolsPanel(timerPanel, timerTab));
alarmTab.addEventListener('click', () => showToolsPanel(alarmPanel, alarmTab));
stopwatchTab.addEventListener('click', () => showToolsPanel(stopwatchPanel, stopwatchTab));

function handleActiveButton(clickedButton, buttonGroup) {
    buttonGroup.forEach(button => button.classList.remove('active'));
    clickedButton.classList.add('active');
}

// Settings Logic
function setDisplayMode(mode) {
    settings.labelDisplayMode = mode;
    handleActiveButton(document.getElementById(`mode${mode.charAt(0).toUpperCase() + mode.slice(1)}`), [modeStandardBtn, modePercentageBtn, modeRemainderBtn]);
    saveSettings();
}
modeStandardBtn.addEventListener('click', () => setDisplayMode('standard'));
modePercentageBtn.addEventListener('click', () => setDisplayMode('percentage'));
modeRemainderBtn.addEventListener('click', () => setDisplayMode('remainder'));

format12Button.addEventListener('click', () => { settings.is24HourFormat = false; handleActiveButton(format12Button, [format12Button, format24Button]); amPmContainer.style.display = 'flex'; alarmHoursInput.max = "12"; alarmHoursInput.min = "1"; saveSettings(); });
format24Button.addEventListener('click', () => { settings.is24HourFormat = true; handleActiveButton(format24Button, [format12Button, format24Button]); amPmContainer.style.display = 'none'; alarmHoursInput.max = "23"; alarmHoursInput.min = "0"; saveSettings(); });
amButton.addEventListener('click', () => { settings.alarmAmPm = 'am'; handleActiveButton(amButton, [amButton, pmButton]); });
pmButton.addEventListener('click', () => { settings.alarmAmPm = 'pm'; handleActiveButton(pmButton, [amButton, pmButton]); });
alarmToggle.addEventListener('change', (e) => {
    if(e.target.checked) {
        createClock('alarm');
        e.target.checked = false; // Reset toggle after creating
    }
});

function setColorPreset(preset) {
    settings.colorPreset = preset;
    settings.currentColors = colorPalettes[preset];
    handleActiveButton(document.getElementById(`preset${preset.charAt(0).toUpperCase() + preset.slice(1)}`), [presetDefaultBtn, presetNeonBtn, presetPastelBtn, presetColorblindBtn]);
    saveSettings();
}
presetDefaultBtn.addEventListener('click', () => setColorPreset('default'));
presetNeonBtn.addEventListener('click', () => setColorPreset('neon'));
presetPastelBtn.addEventListener('click', () => setColorPreset('pastel'));
presetColorblindBtn.addEventListener('click', () => setColorPreset('colorblind'));

gradientToggle.addEventListener('change', (e) => { settings.useGradient = e.target.checked; saveSettings(); });
dateLinesToggle.addEventListener('change', (e) => { settings.showDateLines = e.target.checked; saveSettings(); });
timeLinesToggle.addEventListener('change', (e) => { settings.showTimeLines = e.target.checked; saveSettings(); });

// --- CLOCK MANAGEMENT ---
function updateCreationButtons() {
    const isAtLimit = clocks.length >= MAX_CLOCKS;
    addClockBtn.disabled = isAtLimit;
    document.getElementById('startTimer').disabled = isAtLimit;
    document.getElementById('startStopwatch').disabled = isAtLimit;
    alarmToggle.disabled = isAtLimit;
}

function createClock(type) {
    if (clocks.length >= MAX_CLOCKS) {
        alert(`You have reached the maximum limit of ${MAX_CLOCKS} clocks.`);
        return;
    }
    const now = new Date();
    const newClock = {
        id: Date.now(),
        type: type,
        createdAt: now,
        name: '',
        state: {}
    };

    if (type === 'timer') {
        newClock.name = document.getElementById('timerName').value || `Timer ${clocks.length + 1}`;
        const totalSeconds = (parseInt(timerHoursInput.value) || 0) * 3600 +
                             (parseInt(timerMinutesInput.value) || 0) * 60 +
                             (parseInt(timerSecondsInput.value) || 0);
        if (totalSeconds <= 0) return; // Don't create a timer with no duration

        newClock.state = {
            totalSeconds: totalSeconds,
            remainingSeconds: totalSeconds,
            isPaused: false,
            isIntervalMode: intervalToggle.checked
        };
    } else if (type === 'stopwatch') {
        newClock.name = document.getElementById('stopwatchName').value || `Stopwatch ${clocks.length + 1}`;
        newClock.state = {
            startTime: Date.now(),
            elapsedTime: 0,
            isRunning: true,
            laps: []
        };
    } else if (type === 'clock') {
        newClock.name = `Clock ${clocks.length + 1}`;
        newClock.state = {
             // Basic clock might have timezone settings in the future
        };
    } else if (type === 'alarm') {
        newClock.name = `Alarm ${clocks.length + 1}`;
        const hour = parseInt(alarmHoursInput.value) || 0;
        const minute = parseInt(alarmMinutesInput.value) || 0;
        const ampm = settings.alarmAmPm || (document.getElementById('amButton').classList.contains('active') ? 'AM' : 'PM');

        newClock.state = {
            hour: hour,
            minute: minute,
            ampm: ampm,
            triggered: false
        };
    }

    clocks.push(newClock);
    updateCreationButtons();
}

document.getElementById('startTimer').addEventListener('click', () => createClock('timer'));
document.getElementById('startStopwatch').addEventListener('click', () => createClock('stopwatch'));
addClockBtn.addEventListener('click', () => createClock('clock'));

// --- Multi-Clock State Updater ---
function updateClockStates(deltaTime) {
    const now = new Date();
    checkAlarms(now);

    clocks.forEach(clock => {
        if (clock.type === 'timer' && !clock.state.isPaused) {
            clock.state.remainingSeconds -= deltaTime / 1000;
            if (clock.state.remainingSeconds <= 0) {
                if (!isToneStarted) { Tone.start(); isToneStarted = true; }
                alarmSynth.triggerAttackRelease("C5", "8n");
                if (clock.state.isIntervalMode) {
                    clock.state.remainingSeconds = clock.state.totalSeconds; // Reset for interval
                } else {
                    // Stop the timer, could also be removed
                    clock.state.remainingSeconds = 0;
                    clock.state.isPaused = true;
                }
            }
        } else if (clock.type === 'stopwatch' && clock.state.isRunning) {
            clock.state.elapsedTime = Date.now() - clock.state.startTime;
        }
    });
}

clocksGrid.addEventListener('click', (e) => {
    if (e.target.classList.contains('control-btn')) {
        const action = e.target.dataset.action;
        const clockDiv = e.target.closest('.clock-instance');
        const clockId = parseInt(clockDiv.id.split('-')[1]);
        const clock = clocks.find(c => c.id === clockId);

        if (clock) {
            if (action === 'close') {
                clocks = clocks.filter(c => c.id !== clockId);
                updateCreationButtons();
            } else if (action === 'pause') {
                if (clock.type === 'timer') {
                    clock.state.isPaused = !clock.state.isPaused;
                    e.target.textContent = clock.state.isPaused ? 'Resume' : 'Pause';
                } else if (clock.type === 'stopwatch') {
                    clock.state.isRunning = !clock.state.isRunning;
                    if (clock.state.isRunning) {
                        // Adjust start time to account for the pause duration
                        clock.state.startTime = Date.now() - clock.state.elapsedTime;
                    }
                    e.target.textContent = clock.state.isRunning ? 'Pause' : 'Resume';
                }
            } else if (action === 'lap' && clock.type === 'stopwatch') {
                clock.state.laps.push(clock.state.elapsedTime);
                const lapsDisplay = clockDiv.querySelector('.laps-display');
                if (lapsDisplay) {
                    const lapTime = new Date(clock.state.elapsedTime);
                    const minutes = lapTime.getUTCMinutes().toString().padStart(2, '0');
                    const seconds = lapTime.getUTCSeconds().toString().padStart(2, '0');
                    const milliseconds = lapTime.getUTCMilliseconds().toString().padStart(3, '0');
                    lapsDisplay.innerHTML += `<div>Lap ${clock.state.laps.length}: ${minutes}:${seconds}.${milliseconds}</div>`;
                }
            }
        }
    }
});

// --- SETTINGS PERSISTENCE ---
function saveSettings() {
    localStorage.setItem('polarClockSettings', JSON.stringify(settings));
}

function loadSettings() {
    const savedSettings = localStorage.getItem('polarClockSettings');
    const defaultSettings = {
        is24HourFormat: false, labelDisplayMode: 'standard',
        showDateLines: true, showTimeLines: true, useGradient: true, colorPreset: 'default'
    };
    settings = savedSettings ? { ...defaultSettings, ...JSON.parse(savedSettings) } : defaultSettings;
    
    // Apply loaded settings to the UI
    setDisplayMode(settings.labelDisplayMode);
    if (settings.is24HourFormat) format24Button.click(); else format12Button.click();
    setColorPreset(settings.colorPreset || 'default');
    gradientToggle.checked = settings.useGradient;
    dateLinesToggle.checked = settings.showDateLines;
    timeLinesToggle.checked = settings.showTimeLines;
}

// --- NEW ADVANCED ALARM LOGIC ---
function convertTo24Hour(hour, ampm) {
    hour = parseInt(hour);
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    return hour;
}

function checkAlarms(now) {
    const currentMinute = now.getMinutes();
    if (currentMinute === lastMinuteChecked) {
        return; // Already checked this minute
    }
    lastMinuteChecked = currentMinute;

    const currentHour = now.getHours();

    clocks.forEach(clock => {
        if (clock.type === 'alarm' && !clock.state.triggered) {
            const alarmHour24 = convertTo24Hour(clock.state.hour, clock.state.ampm);
            const alarmMinute = clock.state.minute;

            if (alarmHour24 === currentHour && alarmMinute === currentMinute) {
                if (!isToneStarted) { Tone.start(); isToneStarted = true; }
                alarmSynth.triggerAttackRelease("C5", "8n");
                clock.state.triggered = true;
            }
        }
    });
}

// --- INITIALIZATION ---
loadSettings();
createClock('clock'); // Create a default clock on startup
requestAnimationFrame(animate); // Start the clock safely
