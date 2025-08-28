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
            const modalHour = modalInstance.querySelector('#modalHour');
            const modalMinute = modalInstance.querySelector('#modalMinute');
            const modalAmPm = modalInstance.querySelector('#modalAmPm');
            const daySelector = modalInstance.querySelector('#daySelector');
            const alarmLabel = modalInstance.querySelector('#alarmLabel');
            const alarmGroupSelect = modalInstance.querySelector('#alarmGroupSelect');
            const alarmDescription = modalInstance.querySelector('#alarmDescription');
            const colorSelector = modalInstance.querySelector('#colorSelector');
            const soundSelector = modalInstance.querySelector('#soundSelector');
            const labelCharCount = modalInstance.querySelector('#labelCharCount');
            const descriptionCharCount = modalInstance.querySelector('#descriptionCharCount');

            populateColorPicker(colorSelector);
            
            if (mode === 'add' || mode === 'batch') {
                modalInstance.querySelector('#modalTitle').textContent = mode === 'batch' ? 'Batch Editing' : 'Add Alarm';
                modalInstance.querySelector('#deleteAlarmBtn').classList.add('hidden');
                populateGroupDropdown(alarmGroupSelect);
            } else { // edit mode
                editingAlarmId = alarm.id;
                modalInstance.querySelector('#modalTitle').textContent = 'Edit Alarm';
                modalInstance.querySelector('#deleteAlarmBtn').classList.remove('hidden');
                
                const is24h = settings.timeFormat === '24h';
                if (is24h) {
                    modalHour.value = convertTo24Hour(alarm.hour, alarm.ampm).toString().padStart(2, '0');
                } else {
                    modalHour.value = alarm.hour;
                }
                modalMinute.value = alarm.minute.toString().padStart(2, '0');
                modalAmPm.value = alarm.ampm;
                alarmLabel.value = alarm.label;
                alarmDescription.value = alarm.description || '';
                soundSelector.value = alarm.sound || 'bell01.mp3';
                if(alarm.days) alarm.days.forEach(day => daySelector.querySelector(`[data-day="${day}"]`).classList.add('active'));
                const currentSwatch = colorSelector.querySelector(`[data-color="${alarm.color}"]`);
                if (currentSwatch) currentSwatch.classList.add('selected');
                populateGroupDropdown(alarmGroupSelect, alarm.group);
            }
            updateCharCount(alarmLabel, labelCharCount);
            updateCharCount(alarmDescription, descriptionCharCount);
        }
    
        function setupAlarmModalEventListeners(modalInstance) {
            const daySelector = modalInstance.querySelector('#daySelector');
            const colorSelector = modalInstance.querySelector('#colorSelector');
            const alarmGroupSelect = modalInstance.querySelector('#alarmGroupSelect');
            const newGroupContainer = modalInstance.querySelector('#newGroupContainer');
            const newGroupInput = modalInstance.querySelector('#newGroupInput');
            const confirmNewGroupBtn = modalInstance.querySelector('#confirmNewGroupBtn');
            const cancelNewGroupBtn = modalInstance.querySelector('#cancelNewGroupBtn');
            const alarmLabel = modalInstance.querySelector('#alarmLabel');
            const alarmDescription = modalInstance.querySelector('#alarmDescription');
            const soundSelector = modalInstance.querySelector('#soundSelector');
            const previewSoundBtn = modalInstance.querySelector('#previewAlarmSound');

            modalInstance.querySelector('#cancelBtn').addEventListener('click', () => hideModal(elements.modals.alarm));
            modalInstance.querySelector('#saveBtn').addEventListener('click', handleSaveAttempt);
            modalInstance.querySelector('#deleteAlarmBtn').addEventListener('click', deleteAlarm);
            
            previewSoundBtn.addEventListener('click', () => playSound(soundSelector.value, 1.0));
            daySelector.addEventListener('click', (e) => { if (e.target.classList.contains('day-btn')) e.target.classList.toggle('active'); });
            
            colorSelector.addEventListener('click', (e) => {
                const swatch = e.target.closest('.color-swatch');
                if (swatch) {
                    if (swatch.classList.contains('selected')) {
                        swatch.classList.remove('selected');
                    } else {
                        colorSelector.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('selected'));
                        swatch.classList.add('selected');
                    }
                }
            });

            alarmGroupSelect.addEventListener('change', () => {
                newGroupContainer.classList.toggle('hidden', alarmGroupSelect.value !== 'new_group');
                if (alarmGroupSelect.value === 'new_group') newGroupInput.focus();
                const selectedGroup = groups.find(g => g.name === alarmGroupSelect.value);
                if (selectedGroup && selectedGroup.defaults && Object.keys(selectedGroup.defaults).length > 0) {
                    showModal(elements.modals.applyGroupDefaults);
                }
            });

            confirmNewGroupBtn.addEventListener('click', () => confirmNewGroup(alarmGroupSelect, newGroupContainer, newGroupInput));
            cancelNewGroupBtn.addEventListener('click', () => {
                newGroupContainer.classList.add('hidden');
                newGroupInput.value = '';
                alarmGroupSelect.value = '';
            });
            newGroupInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') confirmNewGroup(alarmGroupSelect, newGroupContainer, newGroupInput);
            });

            alarmLabel.addEventListener('input', () => updateCharCount(alarmLabel, modalInstance.querySelector('#labelCharCount')));
            alarmDescription.addEventListener('input', () => updateCharCount(alarmDescription, modalInstance.querySelector('#descriptionCharCount')));
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
            const newGroupName = inputEl.value.trim();
            const lowerCaseGroups = groups.map(g => g.name.toLowerCase());
            
            if (newGroupName) {
                const existingIndex = lowerCaseGroups.indexOf(newGroupName.toLowerCase());
                if (existingIndex === -1) {
                    groups.push({ id: Date.now(), name: newGroupName, defaults: {} });
                    groups.sort((a,b) => a.name.localeCompare(b.name));
                    saveStateToStorage();
                    populateGroupDropdown(selectEl, newGroupName);
                } else {
                    populateGroupDropdown(selectEl, groups[existingIndex].name);
                }
            }
            containerEl.classList.add('hidden');
            inputEl.value = '';
        }
        
        // --- 7. BATCH EDIT & GROUP FUNCTIONS ---
        function toggleBatchEditMode(active) {
            isBatchEditMode = active;
            elements.header.actions.classList.toggle('hidden', active);
            elements.batch.actions.classList.toggle('hidden', !active);
            elements.alarmList.classList.toggle('batch-select-active', active);
            if (!active) {
                selectedAlarmIds = [];
                renderAlarms();
            }
            updateSelectionCount();
        }
    
        function updateSelectionCount() {
            elements.batch.selectionCount.textContent = `${selectedAlarmIds.length} selected`;
        }
    
        function showBatchConfirmModal(modalInstance) {
            batchChanges = {};
            if (modalInstance.querySelector('#modalHour').value !== (settings.timeFormat === '24h' ? '07' : '7') || modalInstance.querySelector('#modalMinute').value !== '30') batchChanges.time = true;
            if (modalInstance.querySelector('#daySelector .active')) batchChanges.days = true;
            if (modalInstance.querySelector('#alarmLabel').value) batchChanges.label = modalInstance.querySelector('#alarmLabel').value;
            if (modalInstance.querySelector('#alarmGroupSelect').value) batchChanges.group = modalInstance.querySelector('#alarmGroupSelect').value === 'new_group' ? modalInstance.querySelector('#newGroupInput').value : modalInstance.querySelector('#alarmGroupSelect').value;
            if (modalInstance.querySelector('#alarmDescription').value) batchChanges.description = modalInstance.querySelector('#alarmDescription').value;
            if (modalInstance.querySelector('#colorSelector .selected')) batchChanges.color = true;
            if (modalInstance.querySelector('#soundSelector').value !== 'bell01.mp3') batchChanges.sound = modalInstance.querySelector('#soundSelector').value;

            elements.batchConfirm.list.innerHTML = Object.keys(batchChanges).map(key => `<li>Changing: <span class="font-semibold capitalize">${key}</span></li>`).join('');
            elements.batchConfirm.confirmBtn.textContent = `Confirm changes to ${selectedAlarmIds.length} alarms`;

            hideModal(elements.modals.alarm);
            showModal(elements.modals.batchConfirm);
            elements.mainContent.classList.add('backdrop-blur-sm');
        }
        
        function applyBatchChanges() {
            const modalInstance = elements.modals.alarm;
            alarms.forEach(alarm => {
                if (selectedAlarmIds.includes(alarm.id)) {
                    if (batchChanges.time) {
                        let hour = modalInstance.querySelector('#modalHour').value;
                        let ampm = modalInstance.querySelector('#modalAmPm').value;
                        if (settings.timeFormat === '24h') {
                            const h24 = parseInt(hour);
                            ampm = h24 >= 12 ? 'PM' : 'AM';
                            hour = h24 % 12;
                            if (hour === 0) hour = 12;
                        }
                        alarm.hour = hour.toString();
                        alarm.minute = modalInstance.querySelector('#modalMinute').value;
                        alarm.ampm = ampm;
                    }
                    if (batchChanges.days) alarm.days = Array.from(modalInstance.querySelector('#daySelector').querySelectorAll('.active')).map(btn => parseInt(btn.dataset.day));
                    if (batchChanges.label) alarm.label = batchChanges.label;
                    if (batchChanges.group) alarm.group = batchChanges.group;
                    if (batchChanges.description) alarm.description = batchChanges.description;
                    if (batchChanges.color) alarm.color = modalInstance.querySelector('#colorSelector .selected')?.dataset.color || null;
                    if (batchChanges.sound) alarm.sound = batchChanges.sound;
                }
            });
            
            saveStateToStorage();
            toggleBatchEditMode(false);
            hideModal(elements.modals.batchConfirm);
            elements.mainContent.classList.remove('backdrop-blur-sm');
            renderAlarms();
        }
        
        function showBatchDeleteModal() {
            if (selectedAlarmIds.length === 0) return;
            elements.batchDelete.text.textContent = `Are you sure you want to delete these ${selectedAlarmIds.length} alarms? This action cannot be undone.`;
            showModal(elements.modals.batchDeleteConfirm);
            elements.mainContent.classList.add('backdrop-blur-sm');
        }
        
        function applyBatchDelete() {
            alarms = alarms.filter(alarm => !selectedAlarmIds.includes(alarm.id));
            saveStateToStorage();
            toggleBatchEditMode(false);
            hideModal(elements.modals.batchDeleteConfirm);
            elements.mainContent.classList.remove('backdrop-blur-sm');
            renderAlarms();
        }
        
        function renderGroupsList() {
            elements.groups.list.innerHTML = '';
            if (groups.length === 0) {
                elements.groups.list.innerHTML = `<p class="text-muted text-center p-4">No groups created yet.</p>`;
                return;
            }
            groups.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'flex items-center justify-between p-3 bg-slate-700 rounded-lg';
                
                const defaults = group.defaults || {};
                const timeStr = defaults.hour ? formatTime(defaults.hour, defaults.minute, defaults.ampm).time : '';
                const daysStr = defaults.days ? getDaysString(defaults.days) : '';
                const colorDot = defaults.color ? `<div class="w-3 h-3 rounded-full ${defaults.color}"></div>` : '';

                groupDiv.innerHTML = `
                    <div class="flex items-center gap-2">
                         <button data-action="rename-group" data-id="${group.id}" class="p-2 hover:bg-slate-600 rounded-full"><i class="ph-pencil-simple"></i></button>
                         <span class="font-medium">${group.name}</span>
                    </div>
                    <div class="flex items-center gap-4 text-sm text-muted">
                        <span>${timeStr}</span>
                        <span>${daysStr}</span>
                        ${colorDot}
                        <button data-action="edit-group" data-id="${group.id}" class="bg-slate-600 hover:bg-slate-500 text-white font-bold py-1 px-3 rounded-lg">Edit</button>
                    </div>
                `;
                elements.groups.list.appendChild(groupDiv);
            });
        }
        
        function showGroupEditView(groupId = null) {
            editingGroupId = groupId;
            elements.groups.container.classList.add('hidden');
            elements.groups.editContainer.classList.remove('hidden');
            
            const group = groupId ? groups.find(g => g.id === groupId) : null;
            const groupName = group ? group.name : '';
            
            elements.groups.editContainer.innerHTML = `
                <h3 class="text-2xl font-semibold mb-6 text-center">${group ? `Edit "${group.name}" Template` : 'Create Group'}</h3>
                <div class="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar p-2">
                    <div>
                        <label for="groupNameInput" class="block text-slate-400 mb-1">Group Name</label>
                        <input type="text" id="groupNameInput" value="${groupName}" maxlength="10" class="w-full bg-slate-700 rounded-lg p-3 outline-none focus:ring-2 focus:ring-indigo-500">
                    </div>
                    ${ALARM_MODAL_TEMPLATE}
                </div>
            `;

            const form = elements.groups.editContainer;
            form.querySelector('#modalTitle').remove();
            form.querySelector('#alarmGroupSelect').parentElement.remove();
            form.querySelector('#saveBtn').textContent = 'Save Template';
            form.querySelector('#deleteAlarmBtn').id = 'deleteGroupBtn';
            form.querySelector('#deleteGroupBtn').textContent = 'Delete Group';
            if (!group) form.querySelector('#deleteGroupBtn').classList.add('hidden');

            const defaults = group ? group.defaults : {};
            
            form.querySelector('#alarmLabel').value = defaults.label || '';
            form.querySelector('#alarmDescription').value = defaults.description || '';
            
            const is24h = settings.timeFormat === '24h';
            form.querySelector('#modalAmPmContainer').style.display = is24h ? 'none' : 'block';
            form.querySelector('#modalHour').max = is24h ? '23' : '12';
            form.querySelector('#modalHour').min = is24h ? '0' : '1';

            if (defaults.hour) {
                 if (is24h) {
                    form.querySelector('#modalHour').value = convertTo24Hour(defaults.hour, defaults.ampm).toString().padStart(2, '0');
                } else {
                    form.querySelector('#modalHour').value = defaults.hour;
                }
                form.querySelector('#modalMinute').value = defaults.minute.toString().padStart(2, '0');
                form.querySelector('#modalAmPm').value = defaults.ampm;
            }
            
            const groupDaySelector = form.querySelector('#daySelector');
            if (defaults.days) {
                defaults.days.forEach(day => groupDaySelector.querySelector(`[data-day="${day}"]`).classList.add('active'));
            }

            const groupColorSelector = form.querySelector('#colorSelector');
            populateColorPicker(groupColorSelector);
            if (defaults.color) {
                const currentSwatch = groupColorSelector.querySelector(`[data-color="${defaults.color}"]`);
                if (currentSwatch) currentSwatch.classList.add('selected');
            }
            
            form.querySelector('#soundSelector').value = defaults.sound || 'bell01.mp3';

            form.querySelector('#saveBtn').addEventListener('click', saveGroup);
            form.querySelector('#deleteGroupBtn').addEventListener('click', () => deleteGroup(editingGroupId));
            form.querySelector('#cancelBtn').addEventListener('click', () => {
                elements.groups.container.classList.remove('hidden');
                elements.groups.editContainer.classList.add('hidden');
            });
            groupDaySelector.addEventListener('click', (e) => { if (e.target.classList.contains('day-btn')) e.target.classList.toggle('active'); });
            groupColorSelector.addEventListener('click', (e) => {
                const swatch = e.target.closest('.color-swatch');
                if (swatch) {
                    if (swatch.classList.contains('selected')) {
                        swatch.classList.remove('selected');
                    } else {
                       groupColorSelector.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('selected'));
                       swatch.classList.add('selected');
                    }
                }
            });
        }
        
        function saveGroup() {
            const form = elements.groups.editContainer;
            const group = editingGroupId ? groups.find(g => g.id === editingGroupId) : { id: Date.now(), name: '', defaults: {} };

            const newName = form.querySelector('#groupNameInput').value.trim();
            if (!newName) return;
            
            const oldName = group.name;
            group.name = newName;
            
            if (editingGroupId && oldName !== newName) {
                alarms.forEach(alarm => {
                    if (alarm.group === oldName) {
                        alarm.group = newName;
                    }
                });
            }
            
            const selectedDays = Array.from(form.querySelector('#daySelector').querySelectorAll('.active')).map(btn => parseInt(btn.dataset.day));
            const selectedColor = form.querySelector('#colorSelector .selected')?.dataset.color || null;
            
            group.defaults = {
                hour: form.querySelector('#modalHour').value,
                minute: form.querySelector('#modalMinute').value,
                ampm: form.querySelector('#modalAmPm').value,
                days: selectedDays,
                label: form.querySelector('#alarmLabel').value,
                description: form.querySelector('#alarmDescription').value,
                color: selectedColor,
                sound: form.querySelector('#soundSelector').value,
            };

            if (!editingGroupId) {
                groups.push(group);
            }
            groups.sort((a,b) => a.name.localeCompare(b.name));
            saveStateToStorage();
            renderGroupsList();
            renderAlarms();
            elements.groups.container.classList.remove('hidden');
            elements.groups.editContainer.classList.add('hidden');
        }
        
        function deleteGroup(groupId) {
            if (!confirm('Are you sure you want to delete this group? This cannot be undone.')) return;
            const groupToDelete = groups.find(g => g.id === groupId);
            groups = groups.filter(g => g.id !== groupId);
            alarms.forEach(alarm => {
                if (alarm.group === groupToDelete.name) {
                    alarm.group = '';
                }
            });
            saveStateToStorage();
            renderGroupsList();
            renderAlarms();
            elements.groups.container.classList.remove('hidden');
            elements.groups.editContainer.classList.add('hidden');
        }
    
        // --- 8. EVENT LISTENER SETUP ---
        function setupHeaderEventListeners() {
            elements.header.addAlarmBtn.addEventListener('click', () => showAlarmModal('add'));
            elements.header.manageGroupsBtn.addEventListener('click', () => {
                elements.groups.container.classList.remove('hidden');
                elements.groups.editContainer.classList.add('hidden');
                renderGroupsList();
                showModal(elements.modals.manageGroups);
            });
            elements.header.batchEditBtn.addEventListener('click', () => toggleBatchEditMode(true));
            elements.batch.cancelBtn.addEventListener('click', () => toggleBatchEditMode(false));
            elements.batch.confirmBtn.addEventListener('click', () => {
                if (selectedAlarmIds.length > 0) {
                    showAlarmModal('batch');
                } else {
                    toggleBatchEditMode(false);
                }
            });
            elements.batch.deleteBtn.addEventListener('click', showBatchDeleteModal);
        }
        function setupSettingsBarEventListeners() {
            elements.settingsBar.timeFormatToggle.addEventListener('change', (e) => {
                settings.timeFormat = e.target.checked ? '24h' : '12h';
                saveStateToStorage();
                applySettings();
            });
            elements.settingsBar.frequencyToggle.addEventListener('change', (e) => {
                settings.frequencyDisplay = e.target.checked ? 'except' : 'standard';
                saveStateToStorage();
                applySettings();
            });
            elements.settingsBar.unorganizedToggle.addEventListener('change', (e) => {
                settings.showOnlyUnorganized = e.target.checked;
                saveStateToStorage();
                applySettings();
            });
            elements.settingsBar.paletteSelector.addEventListener('change', (e) => {
                const oldPalette = palettes[settings.alarmPalette];
                const newPalette = palettes[e.target.value];
                alarms.forEach(alarm => {
                    if (alarm.color) {
                        const colorIndex = oldPalette.indexOf(alarm.color);
                        if (colorIndex !== -1) {
                            alarm.color = newPalette[colorIndex];
                        }
                    }
                });
                settings.alarmPalette = e.target.value;
                saveStateToStorage();
                applySettings();
            });
            elements.settingsBar.searchBar.addEventListener('input', (e) => {
                settings.searchQuery = e.target.value;
                renderAlarms();
            });
            elements.settingsBar.sortAlarms.addEventListener('change', (e) => {
                settings.sortOrder = e.target.value;
                saveStateToStorage();
                renderAlarms();
            });
        }
        function setupAlarmListEventListeners() {
            elements.alarmList.addEventListener('click', (e) => {
                const alarmElement = e.target.closest('[data-id]');
                if (!alarmElement) return;

                const alarmId = parseInt(alarmElement.dataset.id);
                if (isBatchEditMode) {
                    const index = selectedAlarmIds.indexOf(alarmId);
                    if (index > -1) {
                        selectedAlarmIds.splice(index, 1);
                    } else {
                        selectedAlarmIds.push(alarmId);
                    }
                    alarmElement.classList.toggle('batch-selected');
                    updateSelectionCount();
                    return;
                }

                const alarm = alarms.find(a => a.id === alarmId);
                const actionTarget = e.target.closest('[data-action]');
                const action = actionTarget ? actionTarget.dataset.action : null;

                switch(action) {
                    case 'toggle':
                        alarm.enabled = !alarm.enabled;
                        if (!alarm.enabled) alarm.isTracked = false;
                        break;
                    case 'track':
                        const isCurrentlyTracked = alarm.isTracked;
                        alarms.forEach(a => a.isTracked = false);
                        alarm.isTracked = !isCurrentlyTracked;
                        break;
                    case 'edit':
                        showAlarmModal('edit', alarm);
                        return;
                }
                saveStateToStorage();
                renderAlarms();
            });
        }
        function setupModalEventListeners() {
            elements.tempConfirm.oneTimeBtn.addEventListener('click', () => finalizeSave(true));
            elements.tempConfirm.keepFinishedBtn.addEventListener('click', () => finalizeSave(false));
            elements.tempConfirm.goBackBtn.addEventListener('click', () => {
                hideModal(elements.modals.temporaryConfirm);
                elements.mainContent.classList.remove('backdrop-blur-sm');
                showModal(elements.modals.alarm);
            });

            elements.batchDelete.cancelBtn.addEventListener('click', () => {
                hideModal(elements.modals.batchDeleteConfirm);
                elements.mainContent.classList.remove('backdrop-blur-sm');
            });
            elements.batchDelete.confirmBtn.addEventListener('click', applyBatchDelete);
            
            elements.batchConfirm.returnBtn.addEventListener('click', () => {
                hideModal(elements.modals.batchConfirm);
                showModal(elements.modals.alarm);
            });
            elements.batchConfirm.confirmBtn.addEventListener('click', applyBatchChanges);

            elements.groups.closeBtn.addEventListener('click', () => hideModal(elements.modals.manageGroups));
            elements.groups.showCreateBtn.addEventListener('click', () => showGroupEditView());
            elements.groups.list.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (!target) return;
                const action = target.dataset.action;
                const id = parseInt(target.dataset.id);
                if (action === 'edit-group') {
                    showGroupEditView(id);
                } else if (action === 'rename-group') {
                    const group = groups.find(g => g.id === id);
                    const newName = prompt('Enter new name for group:', group.name);
                    if (newName && newName.trim()) {
                        group.name = newName.trim();
                        saveStateToStorage();
                        renderGroupsList();
                    }
                }
            });

            elements.applyDefaults.applyBtn.addEventListener('click', () => {
                const alarmModalInstance = elements.modals.alarm;
                const groupName = alarmModalInstance.querySelector('#alarmGroupSelect').value;
                const group = groups.find(g => g.name === groupName);
                if (!group || !group.defaults) return;
                
                const defaults = group.defaults;
                const is24h = settings.timeFormat === '24h';

                if (defaults.hour) {
                    if (is24h) {
                        alarmModalInstance.querySelector('#modalHour').value = convertTo24Hour(defaults.hour, defaults.ampm).toString().padStart(2, '0');
                    } else {
                        alarmModalInstance.querySelector('#modalHour').value = defaults.hour;
                    }
                    alarmModalInstance.querySelector('#modalMinute').value = defaults.minute;
                    alarmModalInstance.querySelector('#modalAmPm').value = defaults.ampm;
                }
                
                alarmModalInstance.querySelector('#alarmLabel').value = defaults.label || '';
                alarmModalInstance.querySelector('#alarmDescription').value = defaults.description || '';
                
                const daySelector = alarmModalInstance.querySelector('#daySelector');
                daySelector.querySelectorAll('.day-btn').forEach(btn => btn.classList.remove('active'));
                if(defaults.days) defaults.days.forEach(day => daySelector.querySelector(`[data-day="${day}"]`).classList.add('active'));
                
                const colorSelector = alarmModalInstance.querySelector('#colorSelector');
                colorSelector.querySelectorAll('.color-swatch').forEach(sw => sw.classList.remove('selected'));
                if (defaults.color) {
                    const swatch = colorSelector.querySelector(`[data-color="${defaults.color}"]`);
                    if (swatch) swatch.classList.add('selected');
                }
                
                alarmModalInstance.querySelector('#soundSelector').value = defaults.sound || 'bell01.mp3';
                
                hideModal(elements.modals.applyGroupDefaults);
            });
            elements.applyDefaults.dontApplyBtn.addEventListener('click', () => hideModal(elements.modals.applyGroupDefaults));
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
    