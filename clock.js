// clock.js

/**
 * clock.js: A dedicated module for rendering the Polar Clock.
 * This module encapsulates all canvas drawing, resizing, and animation logic
 * to ensure the clock is a stable, self-contained visual component.
 */
document.addEventListener('DOMContentLoaded', function() {
    // --- DOM & CANVAS SETUP ---
    const canvas = document.getElementById('polarClockCanvas');
    if (!canvas) {
        console.error("Fatal Error: Canvas element not found.");
        return;
    }
    const ctx = canvas.getContext('2d');
    
    // --- MODULE STATE ---
    let settings = {}; // Will be populated by the main script
    let state = {
        mode: 'clock', // 'clock', 'timer', 'stopwatch'
        timer: { totalSeconds: 0, remainingSeconds: 0 },
        stopwatch: { elapsedTime: 0 },
        trackedAlarm: { nextAlarmTime: null }
    };

    let lastTimestamp = 0;
    let dimensions = {
        centerX: 0, centerY: 0, clockRadius: 0,
        secondsRadius: 0, minutesRadius: 0, hoursRadius: 0,
        dayRadius: 0, monthRadius: 0, timerRadius: 0, trackedAlarmRadius: 0
    };
    const baseStartAngle = -Math.PI / 2;
    const animationState = {
        month: { isChasing: false, chaseProgress: 0 },
        day: { isChasing: false, chaseProgress: 0 },
        hours: { isChasing: false, chaseProgress: 0 },
        minutes: { isChasing: false, chaseProgress: 0 },
        seconds: { isChasing: false, chaseProgress: 0 }
    };
    let lastNow = new Date();

    // --- CORE DRAWING FUNCTIONS ---

    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

    const drawArc = (x, y, radius, startAngle, endAngle, colorLight, colorDark, lineWidth) => {
        // Defensive check: Don't draw if the arc is invalid or radius is too small
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

    // --- RENDER LOGIC PER MODE ---

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

        const monthEndAngle = baseStartAngle + ((month + date / daysInMonth) / 12) * Math.PI * 2;
        const dayEndAngle = baseStartAngle + ((date - 1 + (hours + minutes / 60) / 24) / daysInMonth) * Math.PI * 2;
        const hoursEndAngle = baseStartAngle + (((hours % 12) + minutes / 60) / 12) * Math.PI * 2;
        const minutesEndAngle = baseStartAngle + ((minutes + seconds / 60) / 60) * Math.PI * 2;
        const secondsEndAngle = baseStartAngle + ((seconds + now.getMilliseconds() / 1000) / 60) * Math.PI * 2;
        
        const animationDuration = 500;
        ['seconds', 'minutes', 'hours', 'day', 'month'].forEach(unit => {
            const state = animationState[unit];
            if (now.getSeconds() < lastNow.getSeconds() && unit === 'seconds') { state.isChasing = true; state.chaseProgress = 0; }
            if (state.isChasing) {
                state.chaseProgress += deltaTime;
                if (state.chaseProgress >= animationDuration) state.isChasing = false;
            }
        });
        
        const arcs = [
            { key: 'month', radius: dimensions.monthRadius, colors: settings.currentColors.month, lineWidth: 20, endAngle: monthEndAngle },
            { key: 'day', radius: dimensions.dayRadius, colors: settings.currentColors.day, lineWidth: 30, endAngle: dayEndAngle },
            { key: 'hours', radius: dimensions.hoursRadius, colors: settings.currentColors.hours, lineWidth: 45, endAngle: hoursEndAngle },
            { key: 'minutes', radius: dimensions.minutesRadius, colors: settings.currentColors.minutes, lineWidth: 30, endAngle: minutesEndAngle },
            { key: 'seconds', radius: dimensions.secondsRadius, colors: settings.currentColors.seconds, lineWidth: 30, endAngle: secondsEndAngle }
        ];

        // Draw Tracked Alarm, Timer, and Clock Arcs
        drawTrackedAlarmTimer(now);
        if (state.timer.totalSeconds > 0 && dimensions.timerRadius > 0) {
            const timerProgress = state.timer.remainingSeconds / state.timer.totalSeconds;
            const timerStartAngle = baseStartAngle + (1 - timerProgress) * Math.PI * 2;
            drawArc(dimensions.centerX, dimensions.centerY, dimensions.timerRadius, timerStartAngle, baseStartAngle + Math.PI * 2, '#FF8A80', '#D50000', 30);
        }
        arcs.forEach(arc => {
            if (arc.radius > 0) {
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
            if (arc.radius > 0) {
                drawArc(dimensions.centerX, dimensions.centerY, arc.radius, baseStartAngle, arc.endAngle, arc.colors.light, arc.colors.dark, arc.lineWidth);
                drawLabel(arc);
            }
        });
    };

    function drawTrackedAlarmTimer(now) {
        if (!state.trackedAlarm.nextAlarmTime || dimensions.trackedAlarmRadius <= 0) return;

        const nextAlarmTime = state.trackedAlarm.nextAlarmTime;
        if (now > nextAlarmTime) return; // Don't draw if the alarm time has passed

        const totalSecondsToAlarm = (nextAlarmTime - now) / 1000;
        const totalDuration = 24 * 3600; // Always use a 24-hour cycle for the ring
        const progress = Math.max(0, (totalDuration - totalSecondsToAlarm) / totalDuration);

        const timerStartAngle = baseStartAngle;
        const timerEndAngle = baseStartAngle + progress * Math.PI * 2;
        drawArc(dimensions.centerX, dimensions.centerY, dimensions.trackedAlarmRadius, timerStartAngle, timerEndAngle, '#80DEEA', '#006064', 30);
        
        const hoursLeft = Math.floor(totalSecondsToAlarm / 3600);
        const minutesLeft = Math.floor((totalSecondsToAlarm % 3600) / 60);
        drawLabel({ radius: dimensions.trackedAlarmRadius, lineWidth: 30, key: 'tracked', text: `${hoursLeft}h ${minutesLeft}m` });
    }

    // --- ANIMATION LOOP ---
    const animate = (timestamp) => {
        if (!lastTimestamp) lastTimestamp = timestamp;
        const deltaTime = timestamp - lastTimestamp;
        lastTimestamp = timestamp;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (state.mode === 'stopwatch') {
            drawStopwatch();
        } else {
            drawClock(deltaTime);
        }
        
        requestAnimationFrame(animate);
    };

    // --- PUBLIC API & INITIALIZATION ---
    const ClockModule = {
        /**
         * Initializes the clock module. Must be called after the DOM is ready.
         */
        init() {
            this.resize();
            window.addEventListener('resize', () => this.resize());
            
            // Defensive Start: Only start animation if canvas has a valid size.
            if (canvas.width > 0 && canvas.height > 0) {
                animate(0);
            } else {
                console.warn("Canvas has no size on init. Retrying animation start.");
                requestAnimationFrame(() => this.init());
            }
        },

        /**
         * Resizes the canvas and recalculates all dimensions.
         */
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

        /**
         * Updates the clock's internal state from the main application.
         * @param {object} newSettings - The latest settings object.
         * @param {object} newState - The latest state object for timers, etc.
         */
        update(newSettings, newState) {
            settings = newSettings;
            state = { ...state, ...newState };
        }
    };

    // Expose the module to the global window object so main.js can interact with it.
    window.ClockModule = ClockModule;
});
```javascript