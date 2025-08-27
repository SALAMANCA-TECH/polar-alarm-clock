// --- CONSOLIDATED DOM ELEMENTS ---
const canvas = document.getElementById('polarClockCanvas');
const ctx = canvas.getContext('2d');
const digitalTime = document.getElementById('digitalTime');
const digitalDate = document.getElementById('digitalDate');
// Views
const mainView = document.getElementById('mainView');
const settingsView = document.getElementById('settingsView');
const customizeView = document.getElementById('customizeView');
const toolsView = document.getElementById('toolsView');
// Main Navigation
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
// Stopwatch
const startStopwatchBtn = document.getElementById('startStopwatch');
const stopStopwatchBtn = document.getElementById('stopStopwatch');
const lapStopwatchBtn = document.getElementById('lapStopwatch');
const resetStopwatchBtn = document.getElementById('resetStopwatch');
const lapTimesContainer = document.getElementById('lapTimes');
const stopwatchIntervalToggle = document.getElementById('stopwatchIntervalToggle');
const stopwatchIntervalInputs = document.getElementById('stopwatchIntervalInputs');
const stopwatchIntervalMinutesInput = document.getElementById('stopwatchIntervalMinutes');
const stopwatchIntervalSecondsInput = document.getElementById('stopwatchIntervalSeconds');
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
let currentMode = 'clock'; // 'clock', 'stopwatch'
let centerX, centerY, clockRadius;
let secondsRadius, minutesRadius, hoursRadius, dayRadius, monthRadius, timerRadius, trackedAlarmRadius;
const baseStartAngle = -Math.PI / 2;
let lastTimestamp = 0;
let settings = {};

// Animation State
const animationState = {
    month: { isChasing: false, chaseProgress: 0 },
    day: { isChasing: false, chaseProgress: 0 },
    hours: { isChasing: false, chaseProgress: 0 },
    minutes: { isChasing: false, chaseProgress: 0 },
    seconds: { isChasing: false, chaseProgress: 0 }
};
let lastNow = new Date();

// Timer State
let timerInterval = null;
let timerTotalSeconds = 0;
let timerRemainingSeconds = 0;
let isTimerPaused = false;
let isIntervalMode = false;

// --- NEW ADVANCED ALARM STATE ---
let advancedAlarms = [];
let trackedAlarmId = null;
let lastMinuteChecked = -1; // To prevent multiple triggers in the same minute

// Stopwatch State
let stopwatchStartTime = 0;
let stopwatchElapsedTime = 0;
let isStopwatchRunning = false;
let lapTimes = [];
let isStopwatchIntervalEnabled = false;
let stopwatchIntervalTime = 0; // in ms
let nextStopwatchInterval = 0;

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
const resizeCanvas = () => {
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
    clockRadius = Math.min(centerX, centerY) * 0.9;

    const monthLineWidth = 20;
    const otherLineWidth = 30;
    const hourLineWidth = 45;
    const gap = 20;

    secondsRadius = clockRadius - (otherLineWidth / 2);
    minutesRadius = secondsRadius - (otherLineWidth / 2) - gap - (otherLineWidth / 2);
    hoursRadius = minutesRadius - (otherLineWidth / 2) - gap - (hourLineWidth / 2);
    dayRadius = hoursRadius - (hourLineWidth / 2) - gap - (otherLineWidth / 2);
    monthRadius = dayRadius - (otherLineWidth / 2) - gap - (monthLineWidth / 2);
    timerRadius = monthRadius - (monthLineWidth / 2) - gap - (otherLineWidth / 2);
    trackedAlarmRadius = timerRadius - (otherLineWidth / 2) - gap - (otherLineWidth / 2);
};

const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

const drawArc = (x, y, radius, startAngle, endAngle, colorLight, colorDark, lineWidth) => {
    if (startAngle >= endAngle - 0.01 || radius <= 0) return;
    
    ctx.strokeStyle = settings.useGradient ? ctx.createConicGradient(baseStartAngle, x, y, 0, colorLight, 1, colorDark) : colorLight;
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
    const textX = centerX;
    const textY = centerY + arc.radius;
    
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

const animate = (timestamp) => {
    if (!lastTimestamp) lastTimestamp = timestamp;
    const deltaTime = timestamp - lastTimestamp;
    lastTimestamp = timestamp;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentMode === 'stopwatch') {
        drawStopwatch();
    } else {
        drawClock(deltaTime);
    }
    
    requestAnimationFrame(animate);
};

// --- CLOCK MODE ---
function getLabelText(unit, now) {
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
}

const drawClock = (deltaTime) => {
    const now = new Date();
    const year = now.getFullYear(), month = now.getMonth(), date = now.getDate(), hours = now.getHours(), minutes = now.getMinutes(), seconds = now.getSeconds();
    const daysInMonth = getDaysInMonth(year, month);

    // --- NEW: Advanced Alarm Check ---
    checkAdvancedAlarms(now);

    // Calculate angles
    const monthEndAngle = baseStartAngle + ((month + date / daysInMonth) / 12) * Math.PI * 2;
    const dayEndAngle = baseStartAngle + ((date - 1 + (hours + minutes / 60) / 24) / daysInMonth) * Math.PI * 2;
    const hoursEndAngle = baseStartAngle + (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;
    const minutesEndAngle = baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
    const secondsEndAngle = baseStartAngle + ((seconds + now.getMilliseconds() / 1000) / 60) * Math.PI * 2;
    
    // Handle chasing animation on wrap-around
    const animationDuration = 500;
    const timeUnits = [
        { key: 'seconds', wrap: now.getSeconds() < lastNow.getSeconds() }, 
        { key: 'minutes', wrap: now.getMinutes() < lastNow.getMinutes() },
        { key: 'hours', wrap: (now.getHours() % 12) < (lastNow.getHours() % 12) }, 
        { key: 'day', wrap: now.getDate() !== lastNow.getDate() }, 
        { key: 'month', wrap: now.getMonth() < lastNow.getMonth() }
    ];
    timeUnits.forEach(unit => {
        const state = animationState[unit.key];
        if (unit.wrap) { state.isChasing = true; state.chaseProgress = 0; }
        if (state.isChasing) {
            state.chaseProgress += deltaTime;
            if (state.chaseProgress >= animationDuration) state.isChasing = false;
        }
    });
    
    const arcs = [
        { key: 'month', radius: monthRadius, colors: settings.currentColors.month, lineWidth: 20, endAngle: monthEndAngle },
        { key: 'day', radius: dayRadius, colors: settings.currentColors.day, lineWidth: 30, endAngle: dayEndAngle },
        { key: 'hours', radius: hoursRadius, colors: settings.currentColors.hours, lineWidth: 45, endAngle: hoursEndAngle },
        { key: 'minutes', radius: minutesRadius, colors: settings.currentColors.minutes, lineWidth: 30, endAngle: minutesEndAngle },
        { key: 'seconds', radius: secondsRadius, colors: settings.currentColors.seconds, lineWidth: 30, endAngle: secondsEndAngle }
    ];

    // --- NEW: Draw Tracked Alarm Timer ---
    drawTrackedAlarmTimer(now);

    if (timerTotalSeconds > 0 && timerRadius > 0) {
        const timerProgress = timerRemainingSeconds / timerTotalSeconds;
        const timerStartAngle = baseStartAngle + (1 - timerProgress) * Math.PI * 2;
        drawArc(centerX, centerY, timerRadius, timerStartAngle, baseStartAngle + Math.PI * 2, '#FF8A80', '#D50000', 30);
    }

    arcs.forEach(arc => {
        if (arc.radius > 0) {
            const state = animationState[arc.key];
            drawArc(centerX, centerY, arc.radius, baseStartAngle, arc.endAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
            if (state.isChasing) {
                const progressRatio = state.chaseProgress / animationDuration;
                const chaseStartAngle = baseStartAngle + (progressRatio * Math.PI * 2);
                drawArc(centerX, centerY, arc.radius, chaseStartAngle, baseStartAngle + Math.PI * 2, arc.colors.light, arc.colors.dark, arc.lineWidth);
            }
            arc.text = getLabelText(arc.key, now);
            drawLabel(arc);
        }
    });
    
    if (timerTotalSeconds > 0 && timerRadius > 0) {
        const timerProgress = Math.ceil((timerRemainingSeconds / timerTotalSeconds) * 100);
        drawLabel({ radius: timerRadius, lineWidth: 30, key: 'timer', text: `${timerProgress}%` });
    }

    // Draw separator lines
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.strokeStyle = 'white';
    ctx.beginPath();
    if (settings.showTimeLines && hoursRadius > 0) {
        ctx.lineWidth = 4;
        for (let i = 1; i <= 12; i++) {
            if (i === 6) continue;
            const angle = baseStartAngle + (i / 12) * Math.PI * 2;
            ctx.moveTo(centerX + Math.cos(angle) * (hoursRadius - 22.5), centerY + Math.sin(angle) * (hoursRadius - 22.5));
            ctx.lineTo(centerX + Math.cos(angle) * (secondsRadius + 15), centerY + Math.sin(angle) * (secondsRadius + 15));
        }
    }
    if (settings.showDateLines && monthRadius > 0) {
        ctx.lineWidth = 2;
        for (let i = 1; i <= 12; i++) {
            if (i === 6) continue;
            const angle = baseStartAngle + (i / 12) * Math.PI * 2;
            ctx.moveTo(centerX + Math.cos(angle) * (monthRadius - 10), centerY + Math.sin(angle) * (monthRadius - 10));
            ctx.lineTo(centerX + Math.cos(angle) * (monthRadius + 10), centerY + Math.sin(angle) * (monthRadius + 10));
        }
        const lineStartDay = dayRadius - 15, lineEndDay = dayRadius + 15;
        for (let i = 1; i <= daysInMonth; i++) {
            const angle = baseStartAngle + (i / daysInMonth) * Math.PI * 2;
            if (Math.abs(angle - (Math.PI / 2)) < 0.01) continue;
             ctx.moveTo(centerX + Math.cos(angle) * lineStartDay, centerY + Math.sin(angle) * lineStartDay);
            ctx.lineTo(centerX + Math.cos(angle) * lineEndDay, centerY + Math.sin(angle) * lineEndDay);
        }
    }
    ctx.stroke();
    ctx.restore();
    
    // Update digital display
    digitalTime.textContent = now.toLocaleTimeString([], { hour12: !settings.is24HourFormat, hour: 'numeric', minute: '2-digit' });
    digitalDate.textContent = `${now.getFullYear()}/${(now.getMonth() + 1).toString().padStart(2, '0')}/${now.getDate().toString().padStart(2, '0')}`;
    lastNow = now;
};

// --- STOPWATCH MODE ---
const drawStopwatch = () => {
    if (isStopwatchRunning) {
        stopwatchElapsedTime = Date.now() - stopwatchStartTime;

        if (isStopwatchIntervalEnabled && stopwatchIntervalTime > 0 && stopwatchElapsedTime >= nextStopwatchInterval) {
            if (!isToneStarted) { Tone.start(); isToneStarted = true; }
            alarmSynth.triggerAttackRelease("C5", "8n");
            nextStopwatchInterval += stopwatchIntervalTime;
        }
    }

    const time = new Date(stopwatchElapsedTime);
    const milliseconds = time.getUTCMilliseconds();
    const seconds = time.getUTCSeconds();
    const minutes = time.getUTCMinutes();
    const hours = time.getUTCHours();

    const secondsEndAngle = baseStartAngle + ((seconds + milliseconds / 1000) / 60) * Math.PI * 2;
    const minutesEndAngle = baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
    const hoursEndAngle = baseStartAngle + (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;

    const arcs = [
        { key: 'hours', radius: hoursRadius, colors: settings.currentColors.hours, lineWidth: 45, endAngle: hoursEndAngle, text: hours.toString().padStart(2, '0') },
        { key: 'minutes', radius: minutesRadius, colors: settings.currentColors.minutes, lineWidth: 30, endAngle: minutesEndAngle, text: minutes.toString().padStart(2, '0') },
        { key: 'seconds', radius: secondsRadius, colors: settings.currentColors.seconds, lineWidth: 30, endAngle: secondsEndAngle, text: seconds.toString().padStart(2, '0') }
    ];

    arcs.forEach(arc => {
        if (arc.radius > 0) {
            drawArc(centerX, centerY, arc.radius, baseStartAngle, arc.endAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
            drawLabel(arc);
        }
    });
    
    digitalTime.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    digitalDate.textContent = `.${milliseconds.toString().padStart(3, '0')}`;
};

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
amButton.addEventListener('click', () => { settings.alarmAmPm = 'am'; handleActiveButton(amButton, [amButton, pmButton]); setAlarm(); });
pmButton.addEventListener('click', () => { settings.alarmAmPm = 'pm'; handleActiveButton(pmButton, [amButton, pmButton]); setAlarm(); });

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

// Timer Logic
intervalToggle.addEventListener('change', (e) => isIntervalMode = e.target.checked);
function startTimer() {
    if (timerInterval) return;
    if (!isToneStarted) { Tone.start(); isToneStarted = true; }
    if (!isTimerPaused) {
        timerTotalSeconds = (parseInt(timerHoursInput.value) || 0) * 3600 + (parseInt(timerMinutesInput.value) || 0) * 60 + (parseInt(timerSecondsInput.value) || 0);
        timerRemainingSeconds = timerTotalSeconds;
    }
    if (timerRemainingSeconds <= 0) { resetTimer(); return; };
    isTimerPaused = false;
    timerInterval = setInterval(tick, 1000);
}
function pauseTimer() { clearInterval(timerInterval); timerInterval = null; isTimerPaused = true; }
function resetTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    timerTotalSeconds = 0;
    timerRemainingSeconds = 0;
    isTimerPaused = false;
    intervalToggle.checked = false;
    isIntervalMode = false;
    timerHoursInput.value = "0"; timerMinutesInput.value = "0"; timerSecondsInput.value = "0";
}
function tick() {
    timerRemainingSeconds--;
    const h = Math.floor(timerRemainingSeconds / 3600), m = Math.floor((timerRemainingSeconds % 3600) / 60), s = timerRemainingSeconds % 60;
    timerHoursInput.value = h.toString().padStart(2, '0');
    timerMinutesInput.value = m.toString().padStart(2, '0');
    timerSecondsInput.value = s.toString().padStart(2, '0');
    if (timerRemainingSeconds <= 0) {
        alarmSynth.triggerAttackRelease("C5", "8n");
        if (isIntervalMode) { timerRemainingSeconds = timerTotalSeconds; } 
        else { resetTimer(); }
    }
}
document.getElementById('startTimer').addEventListener('click', startTimer);
document.getElementById('pauseTimer').addEventListener('click', pauseTimer);
document.getElementById('resetTimer').addEventListener('click', resetTimer);

// Alarm Logic (Legacy)
function setAlarm() {
    // This function is now mostly for the simple UI, the core logic is in checkAdvancedAlarms
}
alarmToggle.addEventListener('change', setAlarm);
alarmHoursInput.addEventListener('input', setAlarm);
alarmMinutesInput.addEventListener('input', setAlarm);

// Stopwatch Logic
function startStopwatch() {
    if (isStopwatchRunning) return;
    isStopwatchRunning = true;
    stopwatchStartTime = Date.now() - stopwatchElapsedTime;
    if (isStopwatchIntervalEnabled && stopwatchIntervalTime > 0) {
        const intervalsPassed = Math.floor(stopwatchElapsedTime / stopwatchIntervalTime);
        nextStopwatchInterval = (intervalsPassed + 1) * stopwatchIntervalTime;
    }
}
function stopStopwatch() {
    isStopwatchRunning = false;
}
function resetStopwatch() {
    isStopwatchRunning = false;
    stopwatchElapsedTime = 0;
    lapTimes = [];
    updateLapDisplay();
    nextStopwatchInterval = stopwatchIntervalTime;
}
function lapStopwatch() {
    if (!isStopwatchRunning) return;
    lapTimes.push(stopwatchElapsedTime);
    updateLapDisplay();
}
function formatTime(ms) {
    const time = new Date(ms);
    const minutes = time.getUTCMinutes().toString().padStart(2, '0');
    const seconds = time.getUTCSeconds().toString().padStart(2, '0');
    const milliseconds = time.getUTCMilliseconds().toString().padStart(3, '0');
    return `${minutes}:${seconds}.${milliseconds}`;
}
function updateLapDisplay() {
    lapTimesContainer.innerHTML = '';
    lapTimes.forEach((lap, index) => {
        const lapElement = document.createElement('div');
        lapElement.classList.add('lap-item');
        lapElement.innerHTML = `<span class="lap-number">Lap ${index + 1}</span><span>${formatTime(lap)}</span>`;
        lapTimesContainer.prepend(lapElement);
    });
}
startStopwatchBtn.addEventListener('click', startStopwatch);
stopStopwatchBtn.addEventListener('click', stopStopwatch);
resetStopwatchBtn.addEventListener('click', resetStopwatch);
lapStopwatchBtn.addEventListener('click', lapStopwatch);

// Stopwatch Interval Logic
stopwatchIntervalToggle.addEventListener('change', (e) => {
    isStopwatchIntervalEnabled = e.target.checked;
    stopwatchIntervalInputs.style.display = isStopwatchIntervalEnabled ? 'flex' : 'none';
    if (isStopwatchIntervalEnabled) {
        setStopwatchInterval();
    }
});

function setStopwatchInterval() {
    const minutes = parseInt(stopwatchIntervalMinutesInput.value) || 0;
    const seconds = parseInt(stopwatchIntervalSecondsInput.value) || 0;
    stopwatchIntervalTime = (minutes * 60 + seconds) * 1000;
    if (isStopwatchRunning) {
        const intervalsPassed = Math.floor(stopwatchElapsedTime / stopwatchIntervalTime);
        nextStopwatchInterval = (intervalsPassed + 1) * stopwatchIntervalTime;
    } else {
         nextStopwatchInterval = stopwatchIntervalTime;
    }
}
stopwatchIntervalMinutesInput.addEventListener('input', setStopwatchInterval);
stopwatchIntervalSecondsInput.addEventListener('input', setStopwatchInterval);

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

function loadAdvancedAlarms() {
    const storedAlarms = localStorage.getItem('polarAlarms');
    const storedTrackedId = localStorage.getItem('polarTrackedAlarm');
    if (storedAlarms) {
        advancedAlarms = JSON.parse(storedAlarms);
    }
    if (storedTrackedId) {
        trackedAlarmId = JSON.parse(storedTrackedId);
    }
}

function checkAdvancedAlarms(now) {
    const currentMinute = now.getMinutes();
    if (currentMinute === lastMinuteChecked) {
        return; // Already checked this minute
    }
    lastMinuteChecked = currentMinute;

    const currentDay = now.getDay(); // 0 for Sunday, 1 for Monday, etc.
    const currentHour = now.getHours();

    advancedAlarms.forEach(alarm => {
        if (!alarm.enabled) return;

        const alarmHour24 = convertTo24Hour(alarm.hour, alarm.ampm);
        const alarmMinute = parseInt(alarm.minute);

        const isToday = alarm.days.length === 0 || alarm.days.includes(currentDay);

        if (isToday && alarmHour24 === currentHour && alarmMinute === currentMinute) {
            if (!isToneStarted) { Tone.start(); isToneStarted = true; }
            alarmSynth.triggerAttackRelease("C5", "8n");
            
            if (alarm.isTemporary) {
                alarm.enabled = false;
                // Save the updated alarms state back to localStorage
                localStorage.setItem('polarAlarms', JSON.stringify(advancedAlarms));
            }
        }
    });
}

function drawTrackedAlarmTimer(now) {
    if (!trackedAlarmId || trackedAlarmRadius <= 0) return;

    const trackedAlarm = advancedAlarms.find(a => a.id === trackedAlarmId);
    if (!trackedAlarm || !trackedAlarm.enabled) return;

    const alarmHour24 = convertTo24Hour(trackedAlarm.hour, trackedAlarm.ampm);
    const alarmMinute = parseInt(trackedAlarm.minute);

    let nextAlarmTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), alarmHour24, alarmMinute, 0, 0);
    
    if (trackedAlarm.days.length > 0) {
        let currentDay = now.getDay();
        let daysUntilNext = Infinity;
        
        // Sort days to handle week wrap-around correctly, starting from today
        const sortedDays = trackedAlarm.days.sort((a, b) => a - b);

        for (const day of sortedDays) {
            let diff = day - currentDay;
            if (diff < 0 || (diff === 0 && nextAlarmTime < now)) {
                diff += 7;
            }
            if (diff < daysUntilNext) {
                daysUntilNext = diff;
            }
        }
        
        if (daysUntilNext !== Infinity) {
            nextAlarmTime.setDate(now.getDate() + daysUntilNext);
        }
       
    } else { // One-time alarm logic
        if (nextAlarmTime < now) {
            nextAlarmTime.setDate(nextAlarmTime.getDate() + 1);
        }
    }

    const totalSecondsToAlarm = (nextAlarmTime - now) / 1000;
    
    // Use a 24-hour cycle (86400 seconds) as the total duration for the visual ring
    // Or, if the alarm is further than 24h away, use the actual total duration
    const totalDuration = Math.max(24 * 3600, (nextAlarmTime - new Date(nextAlarmTime).setHours(nextAlarmTime.getHours() - 24, nextAlarmTime.getMinutes(), 0, 0)) / 1000);
    const progress = Math.max(0, (totalDuration - totalSecondsToAlarm) / totalDuration);

    const timerStartAngle = baseStartAngle;
    const timerEndAngle = baseStartAngle + progress * Math.PI * 2;
    drawArc(centerX, centerY, trackedAlarmRadius, timerStartAngle, timerEndAngle, '#80DEEA', '#006064', 30);
    
    const hoursLeft = Math.floor(totalSecondsToAlarm / 3600);
    const minutesLeft = Math.floor((totalSecondsToAlarm % 3600) / 60);
    drawLabel({ radius: trackedAlarmRadius, lineWidth: 30, key: 'tracked', text: `${hoursLeft}h ${minutesLeft}m` });
}


function startClock() {
    resizeCanvas();
    // Failsafe: only start the animation if the canvas has a measurable size.
    if (canvas.width > 0 && canvas.height > 0) {
        animate(0);
    } else {
        // If the canvas is still size 0, wait for the next frame and try again.
        requestAnimationFrame(startClock);
    }
}

// --- INITIALIZATION ---
window.addEventListener('resize', resizeCanvas);
loadSettings();
loadAdvancedAlarms(); // --- NEW: Load advanced alarms on start ---
requestAnimationFrame(startClock); // Start the clock safely
