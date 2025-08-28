    document.addEventListener('DOMContentLoaded', function() {
        // --- DOM ELEMENTS ---
        const toggleTimerBtn = document.getElementById('toggleTimerBtn');
        const resetTimerBtn = document.getElementById('resetTimer');
        const timerHoursInput = document.getElementById('timerHours');
        const timerMinutesInput = document.getElementById('timerMinutes');
        const timerSecondsInput = document.getElementById('timerSeconds');
        const intervalToggle = document.getElementById('intervalToggle');
        
        const toggleStopwatchBtn = document.getElementById('toggleStopwatchBtn');
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
                this.updateLapDisplay(); // Initial render of saved laps
                this.updateButtonStates(); // Set initial button text
            },
    
            // --- DYNAMIC BUTTONS ---
            updateButtonStates() {
                toggleTimerBtn.textContent = this.state.timer.isRunning ? 'Pause' : 'Start';
                toggleStopwatchBtn.textContent = this.state.stopwatch.isRunning ? 'Pause' : 'Start';
            },
    
            // --- TIMER LOGIC ---
            toggleTimer() {
                if (this.state.timer.isRunning) {
                    this.pauseTimer();
                } else {
                    this.startTimer();
                }
            },
            startTimer() {
                if (this.state.timer.remainingSeconds <= 0) {
                    this.state.timer.totalSeconds = (parseInt(timerHoursInput.value) || 0) * 3600 + (parseInt(timerMinutesInput.value) || 0) * 60 + (parseInt(timerSecondsInput.value) || 0);
                    this.state.timer.remainingSeconds = this.state.timer.totalSeconds;
                }
                if (this.state.timer.remainingSeconds > 0) {
                    this.state.timer.isRunning = true;
                }
                this.updateButtonStates();
            },
            pauseTimer() { 
                this.state.timer.isRunning = false; 
                this.updateButtonStates();
            },
            resetTimer() {
                this.state.timer.isRunning = false;
                this.state.timer.totalSeconds = 0;
                this.state.timer.remainingSeconds = 0;
                timerHoursInput.value = "0";
                timerMinutesInput.value = "0";
                timerSecondsInput.value = "0";
                this.updateButtonStates();
            },
    
            // --- STOPWATCH LOGIC ---
            toggleStopwatch() {
                if (this.state.stopwatch.isRunning) {
                    this.pauseStopwatch();
                } else {
                    this.startStopwatch();
                }
            },
            startStopwatch() {
                this.state.stopwatch.isRunning = true;
                this.state.stopwatch.startTime = Date.now() - this.state.stopwatch.elapsedTime;
                this.updateButtonStates();
            },
            pauseStopwatch() { 
                this.state.stopwatch.isRunning = false;
                this.updateButtonStates();
            },
            resetStopwatch() {
                this.state.stopwatch.isRunning = false;
                this.state.stopwatch.elapsedTime = 0;
                this.state.stopwatch.laps = [];
                this.updateLapDisplay();
                catchUpMinutesInput.value = '';
                catchUpSecondsInput.value = '';
                this.updateButtonStates();
                document.dispatchEvent(new CustomEvent('statechange'));
            },
            lapStopwatch() {
                if (!this.state.stopwatch.isRunning && this.state.stopwatch.elapsedTime === 0) return; // Prevent lap on reset
                this.state.stopwatch.laps.push({ time: this.state.stopwatch.elapsedTime, label: '' });
                this.updateLapDisplay();
                document.dispatchEvent(new CustomEvent('statechange'));
            },
            updateLapDisplay() {
                lapTimesContainer.innerHTML = '';
                this.state.stopwatch.laps.forEach((lap, index) => {
                    const lapElement = document.createElement('li');
                    lapElement.classList.add('lap-item');
                    lapElement.innerHTML = `
                        <span class="lap-number">Lap ${index + 1}</span>
                        <span class="lap-time">${this.formatTime(lap.time)}</span>
                        <input type="text" class="lap-label-input" value="${lap.label}" data-index="${index}" placeholder="Add label...">
                    `;
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
                    document.dispatchEvent(new CustomEvent('statechange'));
                }
            },
            setupEventListeners() {
                toggleTimerBtn.addEventListener('click', () => this.toggleTimer());
                resetTimerBtn.addEventListener('click', () => this.resetTimer());
                intervalToggle.addEventListener('change', (e) => this.state.timer.isInterval = e.target.checked);
                
                toggleStopwatchBtn.addEventListener('click', () => this.toggleStopwatch());
                resetStopwatchBtn.addEventListener('click', () => this.resetStopwatch());
                lapStopwatchBtn.addEventListener('click', () => this.lapStopwatch());
                
                addCatchUpTimeBtn.addEventListener('click', () => this.addManualCatchUpTime());
    
                lapTimesContainer.addEventListener('input', (e) => {
                    if (e.target.classList.contains('lap-label-input')) {
                        const index = parseInt(e.target.dataset.index);
                        const arrayIndex = this.state.stopwatch.laps.length - 1 - index;
                        this.state.stopwatch.laps[arrayIndex].label = e.target.value;
                        document.dispatchEvent(new CustomEvent('statechange'));
                    }
                });
            }
        };
        window.ToolsModule = ToolsModule;
    });
    