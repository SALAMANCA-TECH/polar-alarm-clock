    /**
     * pomodoro.js: A module for the Pomodoro Timer feature.
     */
    document.addEventListener('DOMContentLoaded', function() {
        // --- DOM ELEMENTS ---
        const statusDisplay = document.getElementById('pomodoroStatus');
        const timerDisplay = document.getElementById('pomodoroTimerDisplay');
        const workDurationInput = document.getElementById('pomodoroWorkDuration');
        const shortBreakDurationInput = document.getElementById('pomodoroShortBreakDuration');
        const longBreakDurationInput = document.getElementById('pomodoroLongBreakDuration');
    
        // --- MODULE API ---
        const PomodoroModule = {
            state: null, // To be linked by main.js
            settings: null,
    
            init(appState, appSettings) {
                this.state = appState;
                this.settings = appSettings;
                this.setupEventListeners();
                this.updateDisplay(); // Initial display setup
            },
    
            start() {
                if (this.state.pomodoro.isRunning) return;
                this.state.pomodoro.isRunning = true;
                // If the timer is at zero when starting, begin the next phase immediately
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
                // Load duration from the input field on reset
                this.state.pomodoro.remainingSeconds = (parseInt(workDurationInput.value) || 25) * 60;
                this.updateDisplay();
                // Fire an event so other modules (like main.js) know to clear animations
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
                } // If the current phase is a break, the next phase is always 'work'
                
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
                // Fire a custom event that the main.js module will listen for
                const event = new CustomEvent('play-sound', { detail: { soundFile: this.settings.timerSound } });
                document.dispatchEvent(event);
            },
    
            setupEventListeners() {
                document.getElementById('startPomodoro').addEventListener('click', () => this.start());
                document.getElementById('pausePomodoro').addEventListener('click', () => this.pause());
                document.getElementById('resetPomodoro').addEventListener('click', () => this.reset());
            }
        };
    
        // Expose the module to the global window object so main.js can interact with it.
        window.PomodoroModule = PomodoroModule;
    });
    