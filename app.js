// API & Data configuration
const API_URL = 'https://extendsclass.com/api/json-storage/bin/cbdfbdc';

// 4 Months Config for 2026 (JavaScript Date month index: 7 = August, 8 = Sept, 9 = Oct, 10 = Nov)
const MONTHS_CONFIG = [
    { month: 7, year: 2026, name: 'Août' },
    { month: 8, year: 2026, name: 'Septembre' },
    { month: 9, year: 2026, name: 'Octobre' },
    { month: 10, year: 2026, name: 'Novembre' }
];

// App State
let appData = { participants: [] };
let activeParticipantId = null;
let saveDebounceTimeout = null;

// DOM Elements
const syncStatusEl = document.getElementById('sync-status');
const activeUserWidgetEl = document.getElementById('active-user-widget');
const activeUserNameEl = document.getElementById('active-user-name');
const userAvatarEl = document.getElementById('user-avatar');
const changeProfileBtn = document.getElementById('change-profile-btn');
const clearMyDatesBtn = document.getElementById('clear-my-dates');
const loginModalEl = document.getElementById('login-modal');
const profileSelectEl = document.getElementById('profile-select');
const loginExistingBtn = document.getElementById('login-existing-btn');
const newProfileNameEl = document.getElementById('new-profile-name');
const loginNewBtn = document.getElementById('login-new-btn');
const viewOnlyBtn = document.getElementById('view-only-btn');
const participantsListEl = document.getElementById('participants-list');
const bestDatesContainerEl = document.getElementById('best-dates-container');
const monthsGridEl = document.getElementById('months-grid');
const floatingTooltipEl = document.getElementById('floating-tooltip');

// Initial Setup
document.addEventListener('DOMContentLoaded', async () => {
    setupEventListeners();
    await fetchInitialData();
    checkSavedSession();
});

// Setup DOM Event Listeners
function setupEventListeners() {
    // Login Modal Handlers
    profileSelectEl.addEventListener('change', () => {
        loginExistingBtn.disabled = !profileSelectEl.value;
    });

    loginExistingBtn.addEventListener('click', () => {
        const id = profileSelectEl.value;
        if (id) {
            setActiveParticipant(id);
        }
    });

    newProfileNameEl.addEventListener('input', () => {
        const value = newProfileNameEl.value.trim();
        loginNewBtn.disabled = value.length < 2;
    });

    // Handle Enter key inside input
    newProfileNameEl.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && newProfileNameEl.value.trim().length >= 2) {
            handleCreateNewParticipant();
        }
    });

    loginNewBtn.addEventListener('click', handleCreateNewParticipant);

    viewOnlyBtn.addEventListener('click', () => {
        setActiveParticipant(null); // Read only
    });

    changeProfileBtn.addEventListener('click', () => {
        showLoginModal();
    });

    clearMyDatesBtn.addEventListener('click', handleClearMyDates);

    // Tooltip floating mouse movements
    document.addEventListener('mousemove', (e) => {
        if (!floatingTooltipEl.classList.contains('hidden')) {
            const tooltipWidth = floatingTooltipEl.offsetWidth;
            const tooltipHeight = floatingTooltipEl.offsetHeight;
            let x = e.pageX + 15;
            let y = e.pageY + 15;

            // Prevent tooltip from overflowing browser viewport
            if (x + tooltipWidth > window.innerWidth + window.scrollX) {
                x = e.pageX - tooltipWidth - 15;
            }
            if (y + tooltipHeight > window.innerHeight + window.scrollY) {
                y = e.pageY - tooltipHeight - 15;
            }

            floatingTooltipEl.style.left = `${x}px`;
            floatingTooltipEl.style.top = `${y}px`;
        }
    });
}

// Fetch data from ExtendsClass
async function fetchInitialData() {
    updateSyncStatus('loading', 'Chargement...');
    try {
        const response = await fetch(API_URL);
        if (!response.ok) throw new Error('Erreur de chargement');
        appData = await response.json();
        
        // Ensure participants structure exists
        if (!appData || !Array.isArray(appData.participants)) {
            appData = { participants: [] };
        }
        
        updateSyncStatus('saved', 'À jour');
    } catch (error) {
        console.error('Fetch Error:', error);
        updateSyncStatus('error', 'Erreur de synchro');
        // Fallback to local storage if API fails completely
        const localBackup = localStorage.getItem('cal30ans_backup_data');
        if (localBackup) {
            appData = JSON.parse(localBackup);
        }
    }
}

// Check if user has a stored session
function checkSavedSession() {
    const savedId = localStorage.getItem('cal30ans_participant_id');
    const exists = appData.participants.some(p => p.id === savedId);
    
    if (savedId && exists) {
        setActiveParticipant(savedId);
    } else {
        showLoginModal();
    }
}

// Show/Hide Login Modal
function showLoginModal() {
    // Populate existing profiles select
    profileSelectEl.innerHTML = '<option value="" disabled selected>-- Choisissez votre prénom --</option>';
    
    if (appData.participants.length > 0) {
        appData.participants.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            profileSelectEl.appendChild(opt);
        });
        document.getElementById('existing-profiles-group').classList.remove('hidden');
    } else {
        document.getElementById('existing-profiles-group').classList.add('hidden');
    }
    
    loginExistingBtn.disabled = true;
    newProfileNameEl.value = '';
    loginNewBtn.disabled = true;
    loginModalEl.classList.remove('hidden');
}

// Set active participant
function setActiveParticipant(id) {
    activeParticipantId = id;
    
    if (id) {
        const participant = appData.participants.find(p => p.id === id);
        localStorage.setItem('cal30ans_participant_id', id);
        
        activeUserNameEl.textContent = participant.name;
        userAvatarEl.textContent = participant.name.charAt(0);
        activeUserWidgetEl.classList.remove('hidden');
        clearMyDatesBtn.classList.remove('hidden');
    } else {
        // Read-only mode
        localStorage.removeItem('cal30ans_participant_id');
        activeUserNameEl.textContent = "Lecture seule";
        userAvatarEl.textContent = "L";
        activeUserWidgetEl.classList.remove('hidden');
        clearMyDatesBtn.classList.add('hidden');
    }
    
    loginModalEl.classList.add('hidden');
    
    // Render/refresh calendar and dashboards
    renderApp();
}

// Create new participant
async function handleCreateNewParticipant() {
    const name = newProfileNameEl.value.trim();
    if (!name) return;

    // Check if name already exists (case insensitive)
    const exists = appData.participants.some(p => p.name.toLowerCase() === name.toLowerCase());
    if (exists) {
        alert(`Le prénom "${name}" existe déjà. Veuillez choisir un autre prénom ou sélectionner le profil existant.`);
        return;
    }

    const newId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
    const newParticipant = {
        id: newId,
        name: name,
        availabilities: {}
    };

    appData.participants.push(newParticipant);
    setActiveParticipant(newId);
    
    // Trigger instant save for new user creation
    await triggerDataSave();
}

// Reset active user's dates
function handleClearMyDates() {
    if (!activeParticipantId) return;
    
    const participant = appData.participants.find(p => p.id === activeParticipantId);
    if (!participant) return;
    
    if (confirm("Voulez-vous vraiment réinitialiser toutes vos disponibilités ?")) {
        participant.availabilities = {};
        renderApp();
        queueDataSave();
    }
}

// Render everything
function renderApp() {
    renderParticipantsList();
    renderCalendars();
    renderBestDates();
}

// Render sidebar list of participants
function renderParticipantsList() {
    participantsListEl.innerHTML = '';
    
    if (appData.participants.length === 0) {
        participantsListEl.innerHTML = '<p class="empty-msg">Aucun participant inscrit.</p>';
        return;
    }

    appData.participants.forEach(p => {
        const item = document.createElement('div');
        item.className = 'participant-item';
        if (p.id === activeParticipantId) {
            item.classList.add('active');
        }

        // Count stats
        let availCount = 0;
        let maybeCount = 0;
        Object.values(p.availabilities).forEach(v => {
            if (v === 'available') availCount++;
            if (v === 'maybe') maybeCount++;
        });

        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span class="participant-badge" style="background-color: ${stringToColor(p.name)}">${p.name.charAt(0)}</span>
                <span style="font-weight: 500;">${p.name}</span>
            </div>
            <div class="participant-stats">
                <span class="stat-dot avail"><i class="fa-solid fa-circle"></i> ${availCount}</span>
                <span class="stat-dot maybe"><i class="fa-solid fa-circle"></i> ${maybeCount}</span>
            </div>
        `;
        
        // Clicking a participant item in sidebar allows switching to their profile (with verification)
        item.addEventListener('click', () => {
            if (p.id !== activeParticipantId) {
                if (confirm(`Voulez-vous passer sur le profil de ${p.name} pour le modifier ?`)) {
                    setActiveParticipant(p.id);
                }
            }
        });

        participantsListEl.appendChild(item);
    });
}

// Generate calendar cells dynamically
function renderCalendars() {
    monthsGridEl.innerHTML = '';

    MONTHS_CONFIG.forEach(cfg => {
        const monthContainer = document.createElement('div');
        monthContainer.className = 'month-container';

        // Title
        const title = document.createElement('div');
        title.className = 'month-title';
        title.textContent = `${cfg.name} ${cfg.year}`;
        monthContainer.appendChild(title);

        // Weekday headers
        const weekdaysGrid = document.createElement('div');
        weekdaysGrid.className = 'weekdays-grid';
        const daysOfWeek = ['Lu', 'Ma', 'Me', 'Je', 'Ve', 'Sa', 'Di'];
        daysOfWeek.forEach(d => {
            const label = document.createElement('div');
            label.className = 'weekday-label';
            label.textContent = d;
            weekdaysGrid.appendChild(label);
        });
        monthContainer.appendChild(weekdaysGrid);

        // Days Grid
        const daysGrid = document.createElement('div');
        daysGrid.className = 'days-grid';

        // Calculate offset for the 1st of the month
        // (JS Date getDay(): Sunday=0, Monday=1, ..., Saturday=6)
        // We want Monday=0, ..., Sunday=6
        let firstDay = new Date(cfg.year, cfg.month, 1).getDay();
        let offset = firstDay === 0 ? 6 : firstDay - 1;

        // Get total days in month
        const totalDays = new Date(cfg.year, cfg.month + 1, 0).getDate();

        // Render empty offset cells
        for (let i = 0; i < offset; i++) {
            const emptyCell = document.createElement('div');
            emptyCell.className = 'day-cell empty';
            daysGrid.appendChild(emptyCell);
        }

        // Render days
        for (let day = 1; day <= totalDays; day++) {
            const dayCell = document.createElement('div');
            dayCell.className = 'day-cell';
            
            // Format YYYY-MM-DD string
            const monthStr = String(cfg.month + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const dateKey = `${cfg.year}-${monthStr}-${dayStr}`;
            
            dayCell.setAttribute('data-date', dateKey);

            // Day label
            const numLabel = document.createElement('span');
            numLabel.className = 'day-number';
            numLabel.textContent = day;
            dayCell.appendChild(numLabel);

            // Highlight weekends
            const dayOfWeek = new Date(cfg.year, cfg.month, day).getDay();
            const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sun or Sat
            if (isWeekend) {
                dayCell.classList.add('weekend');
            }

            // Set state class for active user
            if (activeParticipantId) {
                dayCell.classList.add('active-user-editing');
                const activeParticipant = appData.participants.find(p => p.id === activeParticipantId);
                const status = activeParticipant ? activeParticipant.availabilities[dateKey] : null;
                
                if (status) {
                    dayCell.classList.add(`user-status-${status}`);
                }
            }

            // Render other participants indicators (dots)
            const indicatorsContainer = document.createElement('div');
            indicatorsContainer.className = 'heatmap-indicator';

            appData.participants.forEach(p => {
                const status = p.availabilities[dateKey];
                if (status && status !== 'none') {
                    const dot = document.createElement('span');
                    dot.className = `dot-participant dot-${status}`;
                    dot.style.backgroundColor = getStatusColor(status);
                    dot.setAttribute('title', `${p.name}: ${status === 'available' ? 'Dispo' : 'Peut-être'}`);
                    indicatorsContainer.appendChild(dot);
                }
            });
            dayCell.appendChild(indicatorsContainer);

            // Interactive handlers
            if (activeParticipantId) {
                dayCell.addEventListener('click', () => {
                    handleDayClick(dateKey);
                });
            }

            // Tooltip triggers
            dayCell.addEventListener('mouseenter', () => {
                showTooltip(dateKey, numLabel.textContent, cfg.name, cfg.year);
            });
            dayCell.addEventListener('mouseleave', hideTooltip);

            daysGrid.appendChild(dayCell);
        }

        monthContainer.appendChild(daysGrid);
        monthsGridEl.appendChild(monthContainer);
    });
}

// Cycle day status on click
function handleDayClick(dateKey) {
    const participant = appData.participants.find(p => p.id === activeParticipantId);
    if (!participant) return;

    const currentStatus = participant.availabilities[dateKey] || 'none';
    let nextStatus = 'none';

    if (currentStatus === 'none') {
        nextStatus = 'available';
    } else if (currentStatus === 'available') {
        nextStatus = 'maybe';
    } else if (currentStatus === 'maybe') {
        nextStatus = 'unavailable';
    } else if (currentStatus === 'unavailable') {
        nextStatus = 'none';
    }

    if (nextStatus === 'none') {
        delete participant.availabilities[dateKey];
    } else {
        participant.availabilities[dateKey] = nextStatus;
    }

    // Dynamic local DOM update for immediate response feeling
    const cell = document.querySelector(`.day-cell[data-date="${dateKey}"]`);
    if (cell) {
        // Clear old state classes
        cell.classList.remove('user-status-available', 'user-status-maybe', 'user-status-unavailable');
        if (nextStatus !== 'none') {
            cell.classList.add(`user-status-${nextStatus}`);
        }
        
        // Re-render dots inside this day cell
        const indicator = cell.querySelector('.heatmap-indicator');
        indicator.innerHTML = '';
        appData.participants.forEach(p => {
            const status = p.availabilities[dateKey];
            if (status && status !== 'none') {
                const dot = document.createElement('span');
                dot.className = `dot-participant dot-${status}`;
                dot.style.backgroundColor = getStatusColor(status);
                indicator.appendChild(dot);
            }
        });
    }

    // Refresh other elements (sidebar lists, best dates)
    renderParticipantsList();
    renderBestDates();

    // Trigger saving queue
    queueDataSave();
}

// Tooltip handler
function showTooltip(dateKey, dayNum, monthName, year) {
    const availableNames = [];
    const maybeNames = [];
    const unavailableNames = [];

    appData.participants.forEach(p => {
        const status = p.availabilities[dateKey];
        if (status === 'available') availableNames.push(p.name);
        else if (status === 'maybe') maybeNames.push(p.name);
        else if (status === 'unavailable') unavailableNames.push(p.name);
    });

    document.getElementById('tooltip-date').textContent = `${dayNum} ${monthName} ${year}`;
    
    const avCountEl = document.getElementById('tooltip-available-count');
    const avListEl = document.getElementById('tooltip-available-list');
    avCountEl.textContent = availableNames.length;
    avListEl.textContent = availableNames.length > 0 ? availableNames.join(', ') : 'Aucun';

    const myCountEl = document.getElementById('tooltip-maybe-count');
    const myListEl = document.getElementById('tooltip-maybe-list');
    myCountEl.textContent = maybeNames.length;
    myListEl.textContent = maybeNames.length > 0 ? maybeNames.join(', ') : 'Aucun';

    const unCountEl = document.getElementById('tooltip-unavailable-count');
    const unListEl = document.getElementById('tooltip-unavailable-list');
    unCountEl.textContent = unavailableNames.length;
    unListEl.textContent = unavailableNames.length > 0 ? unavailableNames.join(', ') : 'Aucun';

    floatingTooltipEl.classList.remove('hidden');
}

function hideTooltip() {
    floatingTooltipEl.classList.add('hidden');
}

// Render Best Dates Summary
function renderBestDates() {
    bestDatesContainerEl.innerHTML = '';

    if (appData.participants.length === 0) {
        bestDatesContainerEl.innerHTML = '<p class="empty-msg">En attente de participants...</p>';
        return;
    }

    // Count availability for all dates in our range
    const scores = {};

    MONTHS_CONFIG.forEach(cfg => {
        const totalDays = new Date(cfg.year, cfg.month + 1, 0).getDate();
        for (let day = 1; day <= totalDays; day++) {
            const monthStr = String(cfg.month + 1).padStart(2, '0');
            const dayStr = String(day).padStart(2, '0');
            const dateKey = `${cfg.year}-${monthStr}-${dayStr}`;

            let yesScore = 0;
            let maybeScore = 0;

            appData.participants.forEach(p => {
                const status = p.availabilities[dateKey];
                if (status === 'available') yesScore++;
                else if (status === 'maybe') maybeScore++;
            });

            // Score calculation: 1.0 point for Available, 0.5 points for Maybe
            const totalScore = yesScore + (maybeScore * 0.5);
            
            if (totalScore > 0) {
                scores[dateKey] = {
                    dateKey: dateKey,
                    day: day,
                    monthName: cfg.name,
                    year: cfg.year,
                    yesCount: yesScore,
                    maybeCount: maybeScore,
                    totalScore: totalScore
                };
            }
        }
    });

    // Sort dates by totalScore (descending), then yesCount (descending)
    const sortedDates = Object.values(scores).sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        return b.yesCount - a.yesCount;
    });

    // Take top 5 best dates
    const topDates = sortedDates.slice(0, 5);

    if (topDates.length === 0) {
        bestDatesContainerEl.innerHTML = '<p class="empty-msg">Aucune date n\'a été sélectionnée pour le moment.</p>';
        return;
    }

    topDates.forEach(d => {
        const dateObj = new Date(d.dateKey);
        // Day of week in French
        const dayOfWeekStr = dateObj.toLocaleDateString('fr-FR', { weekday: 'short' });
        const capitalize = s => s.charAt(0).toUpperCase() + s.slice(1);

        const item = document.createElement('div');
        item.className = 'best-date-item';
        
        // Highlight weekends in best dates
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;
        const weekendBadge = isWeekend ? ' <span style="color:#d97706; font-size:0.75rem; font-weight:600;">(W-E)</span>' : '';

        item.innerHTML = `
            <div class="best-date-info">
                <span class="best-date-name">${capitalize(dayOfWeekStr)} ${d.day} ${d.monthName}${weekendBadge}</span>
                <span class="best-date-count">
                    ${d.yesCount} dispo(s) ${d.maybeCount > 0 ? ` + ${d.maybeCount} peut-être` : ''}
                </span>
            </div>
            <div class="best-date-score">
                Score: ${d.totalScore}
            </div>
        `;

        // Interactive hover to highlight day in calendar
        item.addEventListener('mouseenter', () => {
            const cell = document.querySelector(`.day-cell[data-date="${d.dateKey}"]`);
            if (cell) {
                cell.style.transform = 'scale(1.15)';
                cell.style.boxShadow = '0 8px 24px rgba(79, 70, 229, 0.25)';
                cell.style.borderColor = 'var(--primary)';
                cell.style.zIndex = '100';
            }
        });
        item.addEventListener('mouseleave', () => {
            const cell = document.querySelector(`.day-cell[data-date="${d.dateKey}"]`);
            if (cell) {
                cell.style.transform = '';
                cell.style.boxShadow = '';
                cell.style.borderColor = '';
                cell.style.zIndex = '';
            }
        });

        bestDatesContainerEl.appendChild(item);
    });
}

// Queue save (debounce to avoid overloading the free API)
function queueDataSave() {
    updateSyncStatus('loading', 'Sauvegarde en cours...');
    
    // Backup locally in localStorage just in case
    localStorage.setItem('cal30ans_backup_data', JSON.stringify(appData));
    
    if (saveDebounceTimeout) {
        clearTimeout(saveDebounceTimeout);
    }
    
    saveDebounceTimeout = setTimeout(async () => {
        await triggerDataSave();
    }, 1000); // 1 second debounce
}

// Send data to server
async function triggerDataSave() {
    try {
        const response = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(appData)
        });

        if (!response.ok) throw new Error('Sauvegarde échouée');
        updateSyncStatus('saved', 'Modifications enregistrées !');
    } catch (error) {
        console.error('Save Error:', error);
        updateSyncStatus('error', 'Erreur d\'enregistrement (réessayez)');
    }
}

// Update Header status element
function updateSyncStatus(type, message) {
    syncStatusEl.className = 'sync-status';
    const icon = syncStatusEl.querySelector('i');
    const label = syncStatusEl.querySelector('span');
    
    label.textContent = message;
    
    if (type === 'loading') {
        icon.className = 'fa-solid fa-cloud-arrow-up loading-spinner';
        syncStatusEl.style.opacity = '1';
    } else if (type === 'saved') {
        icon.className = 'fa-solid fa-cloud-arrow-down';
        syncStatusEl.classList.add('saved');
        // Fade out slightly after some time
        setTimeout(() => {
            if (syncStatusEl.classList.contains('saved')) {
                syncStatusEl.style.opacity = '0.7';
            }
        }, 3000);
    } else if (type === 'error') {
        icon.className = 'fa-solid fa-triangle-exclamation';
        syncStatusEl.classList.add('error');
        syncStatusEl.style.opacity = '1';
    }
}

// Helper: Status to Color
function getStatusColor(status) {
    if (status === 'available') return 'var(--color-avail-solid)';
    if (status === 'maybe') return 'var(--color-maybe-solid)';
    if (status === 'unavailable') return 'var(--color-unavail-solid)';
    return 'transparent';
}

// Helper: Custom color for participant avatar based on name hash (nice harmonized palette)
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors = [
        '#4f46e5', // Indigo
        '#0284c7', // Sky Blue
        '#0891b2', // Cyan
        '#0d9488', // Teal
        '#16a34a', // Green
        '#ca8a04', // Yellow/Gold
        '#ea580c', // Orange
        '#db2777', // Pink
        '#9333ea'  // Purple
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index];
}
