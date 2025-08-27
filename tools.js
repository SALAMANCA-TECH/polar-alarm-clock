// ui.js

document.addEventListener('DOMContentLoaded', function() {
    // --- DOM ELEMENT SELECTIONS ---
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
        alarm: document.getElementById('alarmTab'),
        stopwatch: document.getElementById('stopwatchTab'),
    };

    const toolPanels = {
        timer: document.getElementById('timerPanel'),
        alarm: document.getElementById('alarmPanel'),
        stopwatch: document.getElementById('stopwatchPanel'),
    };

    // --- VIEW & PANEL SWITCHING LOGIC ---

    /**
     * Hides all main views and shows the specified one.
     * @param {HTMLElement} viewToShow - The view element to display.
     */
    function showView(viewToShow) {
        Object.values(views).forEach(v => v.style.display = 'none');
        viewToShow.style.display = 'flex';
    }

    /**
     * Handles the visual state of a group of buttons, making one active.
     * @param {HTMLElement} clickedButton - The button that was clicked.
     * @param {HTMLElement[]} buttonGroup - An array of all buttons in the group.
     */
    function handleActiveButton(clickedButton, buttonGroup) {
        buttonGroup.forEach(button => button.classList.remove('active'));
        clickedButton.classList.add('active');
    }

    /**
     * Hides all tool panels and shows the specified one.
     * @param {HTMLElement} panelToShow - The panel element to display.
     * @param {HTMLElement} tabToActivate - The corresponding tab to make active.
     */
    function showToolsPanel(panelToShow, tabToActivate) {
        Object.values(toolPanels).forEach(p => p.style.display = 'none');
        panelToShow.style.display = 'flex';
        handleActiveButton(tabToActivate, Object.values(toolTabs));
        
        // Notify the main script about the mode change
        const event = new CustomEvent('modechange', { 
            detail: { 
                mode: panelToShow.id.replace('Panel', '').toLowerCase() 
            } 
        });
        document.dispatchEvent(event);
    }

    // --- EVENT LISTENERS ---
    
    navButtons.goToSettings.addEventListener('click', () => showView(views.settings));
    navButtons.goToCustomize.addEventListener('click', () => showView(views.customize));
    navButtons.goToTools.addEventListener('click', () => showView(views.tools));
    
    navButtons.backFromSettings.addEventListener('click', () => showView(views.main));
    navButtons.backFromCustomize.addEventListener('click', () => showView(views.main));
    navButtons.backFromTools.addEventListener('click', () => showView(views.main));

    navButtons.goToAlarms.addEventListener('click', () => { window.location.href = 'alarms.html'; });

    toolTabs.timer.addEventListener('click', () => showToolsPanel(toolPanels.timer, toolTabs.timer));
    toolTabs.alarm.addEventListener('click', () => showToolsPanel(toolPanels.alarm, toolTabs.alarm));
    toolTabs.stopwatch.addEventListener('click', () => showToolsPanel(toolPanels.stopwatch, toolTabs.stopwatch));

    // Expose the handleActiveButton function so other modules can use it
    window.handleActiveButton = handleActiveButton;
});
```javascript