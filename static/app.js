// Events Configuration Dictionary
const EVENTS = {
    "City Skylines": { type: "Real Estate Event", max: 2 },
    "CityCampaign - Marketing Event": { type: "Marketing Event", max: 4 },
    "City Verdict": { type: "Moot Court", max: 2 },
    "City Conquest": { type: "Corporate Hunt", max: 2 },
    "City Heritage": { type: "Hotel Management", max: 2 },
    "City Collapse": { type: "Economic Crisis", max: 2 },
    "City Benevo": { type: "Sustainable Solutions", max: 2 },
    "City Biz": { type: "BizQuiz", max: 3 },
    "City Bulls": { type: "Stock Exchange Event", max: 2 },
    "City Bid": { type: "Football Auction", max: 2 },
    "City Recruit": { type: "HRM Event", max: 2 }
};

// Application State
let state = {
    schoolSession: null,
    adminSession: false,
    selectedEvent: null,
    schools: [],
    registrations: [],
    myRegistrations: []
};

// Run when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", () => {
    initApp();
    setupEventListeners();
});

// INITIALIZE APP
async function initApp() {
    // 1. Render events dropdown list
    renderEventsDropdown();

    // 2. Fetch current session status from server
    try {
        const response = await fetch("/api/session");
        const sessionData = await response.json();
        
        state.schoolSession = sessionData.school;
        state.adminSession = sessionData.admin;
        
        // 3. Handle Routing based on session and URL path/hash
        handleRouting();
        updateHeaderUI();
    } catch (err) {
        console.error("Failed to load initial session:", err);
        showView("login-view");
    }
}

// ROUTING LOGIC
function handleRouting() {
    const hash = window.location.hash;
    const path = window.location.pathname;

    if (path === "/admin" || hash === "#admin") {
        showView("admin-view");
        if (state.adminSession) {
            document.getElementById("admin-gate").style.display = "none";
            loadAdminData();
        } else {
            document.getElementById("admin-gate").style.display = "flex";
        }
    } else {
        if (state.schoolSession) {
            showView("portal-view");
            loadPortalData();
        } else {
            showView("login-view");
        }
    }
}

// VIEW SWITCHER
function showView(viewId) {
    document.querySelectorAll(".view-section").forEach(sec => {
        sec.classList.remove("active");
        sec.style.display = "none";
    });
    const activeView = document.getElementById(viewId);
    if (activeView) {
        activeView.classList.add("active");
        activeView.style.display = "";
    }
    
    // Clear temporary alerts
    hideBanners();
}

function hideBanners() {
    document.getElementById("login-error").style.display = "none";
    document.getElementById("portal-success").style.display = "none";
    document.getElementById("portal-error").style.display = "none";
    document.getElementById("admin-gate-error").style.display = "none";
    document.getElementById("modal-school-error").style.display = "none";
}

// HEADER UI RENDERER
function updateHeaderUI() {
    const headerActions = document.getElementById("header-actions");
    headerActions.innerHTML = "";

    if (state.schoolSession) {
        headerActions.innerHTML = `
            <span style="font-size: 0.9rem; color: var(--color-gold-glow); font-weight: 500;">
                Logged in: <strong style="color: white;">${state.schoolSession}</strong>
            </span>
            <button class="btn btn-secondary" onclick="handleLogout()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                <span>Logout</span>
            </button>
        `;
    } else if (state.adminSession) {
        headerActions.innerHTML = `
            <span style="font-size: 0.9rem; color: var(--color-gold-glow); font-weight: 500;">
                Admin Mode
            </span>
            <button class="btn btn-secondary" onclick="handleAdminLogout()">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                <span>Exit Admin</span>
            </button>
        `;
    } else {
        headerActions.innerHTML = `
            <a href="#admin" class="btn btn-secondary" onclick="navigateToAdmin(event)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                <span>Admin Login</span>
            </a>
        `;
    }
}

// SETUP EVENT LISTENERS
function setupEventListeners() {
    // School Login Submit
    document.getElementById("login-form").addEventListener("submit", handleLoginSubmit);

    // Custom dropdown trigger
    const trigger = document.getElementById("event-select-trigger");
    const options = document.getElementById("event-select-options");
    
    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        options.classList.toggle("open");
    });

    document.addEventListener("click", () => {
        options.classList.remove("open");
    });

    // Registration Form Submit
    document.getElementById("registration-form").addEventListener("submit", handleRegistrationSubmit);

    // Admin Password Gate Submit
    document.getElementById("admin-gate-form").addEventListener("submit", handleAdminGateSubmit);

    // School Modal Form Submit
    document.getElementById("school-modal-form").addEventListener("submit", handleSchoolModalSubmit);

    // Listen to hash change for back/forward navigation
    window.addEventListener("hashchange", handleRouting);
}

// PAGE 1: SCHOOL LOGIN SUBMIT
async function handleLoginSubmit(e) {
    e.preventDefault();
    hideBanners();

    const school_name = document.getElementById("login-school-name").value.strip ? 
                        document.getElementById("login-school-name").value.trim() : 
                        document.getElementById("login-school-name").value;
    const password = document.getElementById("login-password").value;

    try {
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ school_name, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            state.schoolSession = data.school_name;
            updateHeaderUI();
            showView("portal-view");
            loadPortalData();
        } else {
            showLoginError(data.message || "Invalid credentials. Please contact the City Corpus organising team.");
        }
    } catch (err) {
        showLoginError("Connection error. Please try again later.");
    }
}

function showLoginError(msg) {
    const errorBanner = document.getElementById("login-error");
    const errorText = document.getElementById("login-error-text");
    errorText.textContent = msg;
    errorBanner.style.display = "flex";
}

// LOGOUT
async function handleLogout() {
    try {
        await fetch("/api/logout", { method: "POST" });
        state.schoolSession = null;
        updateHeaderUI();
        window.location.hash = "";
        showView("login-view");
        document.getElementById("login-form").reset();
    } catch (err) {
        console.error("Logout failed:", err);
    }
}

// PAGE 2: PORTAL DATA LOADING
function loadPortalData() {
    if (!state.schoolSession) return;
    
    // Set locked school name
    document.getElementById("portal-school-name").value = state.schoolSession;
    
    // Reset Event Selection
    resetEventSelection();
    
    // Load my registrations table
    fetchMyRegistrations();
}

async function fetchMyRegistrations() {
    try {
        const response = await fetch("/api/my-registrations");
        const data = await response.json();
        if (response.ok && data.success) {
            state.myRegistrations = data.registrations;
            renderMyRegistrationsTable();
        }
    } catch (err) {
        console.error("Failed to fetch registrations:", err);
    }
}

function renderMyRegistrationsTable() {
    const tbody = document.getElementById("my-registrations-list");
    tbody.innerHTML = "";

    if (state.myRegistrations.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    No registrations found. Register for an event above.
                </td>
            </tr>
        `;
        return;
    }

    state.myRegistrations.forEach(reg => {
        const pList = [];
        if (reg.participant_1) pList.push(reg.participant_1);
        if (reg.participant_2) pList.push(reg.participant_2);
        if (reg.participant_3) pList.push(reg.participant_3);

        const badges = pList.map(name => `<span class="participant-badge">${escapeHTML(name)}</span>`).join("");
        const dateStr = new Date(reg.timestamp).toLocaleString();

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight: 600; color: var(--color-gold-glow);">${escapeHTML(reg.event_name)}</td>
            <td>${badges}</td>
            <td style="color: var(--text-secondary); font-size: 0.85rem;">${dateStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

// EVENTS DROPDOWN RENDERING
function renderEventsDropdown() {
    const optionsContainer = document.getElementById("event-select-options");
    optionsContainer.innerHTML = "";

    Object.keys(EVENTS).forEach(eventName => {
        const info = EVENTS[eventName];
        const option = document.createElement("div");
        option.className = "custom-option";
        const label = eventName.toLowerCase().includes(info.type.toLowerCase())
            ? `${eventName} [${info.max} participant${info.max > 1 ? 's' : ''}]`
            : `${eventName} – ${info.type} [${info.max} participant${info.max > 1 ? 's' : ''}]`;
        option.textContent = label;
        option.dataset.value = eventName;
        
        option.addEventListener("click", () => {
            selectEvent(eventName);
        });
        
        optionsContainer.appendChild(option);
    });
}

function selectEvent(eventName) {
    state.selectedEvent = eventName;
    const info = EVENTS[eventName];
    
    // Update trigger UI
    document.getElementById("selected-event-label").textContent = `${eventName} – ${info.type}`;
    document.getElementById("selected-event-value").value = eventName;
    
    // Generate participant inputs
    generateParticipantInputs(info.max);
    
    // Show remaining steps
    document.getElementById("participant-step").style.display = "block";
    document.getElementById("submit-step").style.display = "block";
}

function resetEventSelection() {
    state.selectedEvent = null;
    document.getElementById("selected-event-label").textContent = "-- Choose an Event --";
    document.getElementById("selected-event-value").value = "";
    document.getElementById("participant-step").style.display = "none";
    document.getElementById("submit-step").style.display = "none";
    document.getElementById("participant-inputs").innerHTML = "";
    document.getElementById("registration-form").reset();
    document.getElementById("portal-school-name").value = state.schoolSession;
}

function generateParticipantInputs(maxParticipants) {
    const container = document.getElementById("participant-inputs");
    container.innerHTML = "";

    for (let i = 1; i <= maxParticipants; i++) {
        const group = document.createElement("div");
        group.className = "form-group";
        group.innerHTML = `
            <label for="participant-name-${i}">Participant ${i} Name</label>
            <input type="text" id="participant-name-${i}" class="form-control participant-input-field" placeholder="Enter full name" required>
        `;
        container.appendChild(group);
    }
}

// PAGE 2: REGISTRATION SUBMIT
async function handleRegistrationSubmit(e) {
    e.preventDefault();
    hideBanners();

    if (!state.selectedEvent) {
        showPortalError("Please select an event.");
        return;
    }

    const eventName = state.selectedEvent;
    const maxAllowed = EVENTS[eventName].max;

    // Retrieve input rows
    const inputFields = document.querySelectorAll(".participant-input-field");
    const participants = Array.from(inputFields).map(input => input.value.trim());

    // CRITICAL Spec Requirement Validation Check:
    // "Validation rule: If somehow the form receives more entries than the max allowed (e.g. via DOM manipulation or API call),
    // display a large red error message: 'Error: You have entered more participants than permitted for this event. Maximum allowed is [X]. Please review and resubmit.'"
    if (inputFields.length > maxAllowed || participants.length > maxAllowed) {
        showPortalError(`Error: You have entered more participants than permitted for this event. Maximum allowed is ${maxAllowed}. Please review and resubmit.`);
        return;
    }

    try {
        const response = await fetch("/api/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                event_name: eventName,
                participants: participants
            })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            showPortalSuccess(data.message);
            resetEventSelection();
            fetchMyRegistrations();
        } else {
            showPortalError(data.message || "Registration failed.");
        }
    } catch (err) {
        showPortalError("Network connection error. Please try again.");
    }
}

function showPortalSuccess(msg) {
    const banner = document.getElementById("portal-success");
    const text = document.getElementById("portal-success-text");
    text.textContent = msg;
    banner.style.display = "flex";
    
    // Auto scroll to banner
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showPortalError(msg) {
    const banner = document.getElementById("portal-error");
    const text = document.getElementById("portal-error-text");
    text.textContent = msg;
    banner.style.display = "flex";
    
    // Auto scroll to banner
    banner.scrollIntoView({ behavior: "smooth", block: "center" });
}


// ================= PAGE 3: ADMIN PANEL =================

function navigateToAdmin(e) {
    if (e) e.preventDefault();
    window.location.hash = "admin";
    handleRouting();
}

// ADMIN PASS GATE SUBMIT
async function handleAdminGateSubmit(e) {
    e.preventDefault();
    hideBanners();

    const password = document.getElementById("admin-master-password").value;

    try {
        const response = await fetch("/api/admin/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ password })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            state.adminSession = true;
            updateHeaderUI();
            document.getElementById("admin-gate").style.display = "none";
            document.getElementById("admin-gate-form").reset();
            loadAdminData();
        } else {
            document.getElementById("admin-gate-error-text").textContent = data.message || "Incorrect admin password.";
            document.getElementById("admin-gate-error").style.display = "flex";
        }
    } catch (err) {
        document.getElementById("admin-gate-error-text").textContent = "Connection error.";
        document.getElementById("admin-gate-error").style.display = "flex";
    }
}

// EXIT ADMIN
async function handleAdminLogout() {
    try {
        await fetch("/api/admin/logout", { method: "POST" });
        state.adminSession = false;
        updateHeaderUI();
        window.location.hash = "";
        showView("login-view");
    } catch (err) {
        console.error("Admin logout failed:", err);
    }
}

// LOAD ADMIN DATA
function loadAdminData() {
    fetchAdminSchools();
    fetchAdminRegistrations();
}

async function fetchAdminSchools() {
    try {
        const response = await fetch("/api/admin/schools");
        const data = await response.json();
        if (response.ok && data.success) {
            state.schools = data.schools;
            renderAdminSchoolsTable();
            populateSchoolFilter();
        }
    } catch (err) {
        console.error("Failed to fetch admin schools:", err);
    }
}

async function fetchAdminRegistrations() {
    try {
        const response = await fetch("/api/admin/registrations");
        const data = await response.json();
        if (response.ok && data.success) {
            state.registrations = data.registrations;
            renderAdminRegistrationsTable();
        }
    } catch (err) {
        console.error("Failed to fetch admin registrations:", err);
    }
}

// TAB SWITCHING IN ADMIN
function switchAdminTab(tab) {
    document.querySelectorAll(".admin-tab").forEach(t => t.classList.remove("active"));
    document.querySelectorAll(".admin-panel-section").forEach(s => s.classList.remove("active"));

    if (tab === 'schools') {
        document.getElementById("tab-btn-schools").classList.add("active");
        document.getElementById("admin-section-schools").classList.add("active");
    } else {
        document.getElementById("tab-btn-regs").classList.add("active");
        document.getElementById("admin-section-regs").classList.add("active");
    }
}

// RENDER ADMIN SCHOOLS
function renderAdminSchoolsTable() {
    const tbody = document.getElementById("admin-schools-list");
    tbody.innerHTML = "";

    if (state.schools.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    No schools registered yet. Click + Add School to create one.
                </td>
            </tr>
        `;
        return;
    }

    state.schools.forEach(school => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight: 600; color: white;">${escapeHTML(school.name)}</td>
            <td style="font-family: monospace; letter-spacing: 0.5px; color: var(--color-gold-glow); font-size: 0.95rem;">${escapeHTML(school.password)}</td>
            <td style="text-align: center;">
                <button class="btn btn-secondary" onclick="openEditSchoolModal('${escapeJSString(school.name)}', '${escapeJSString(school.password)}')" style="padding: 0.3rem 0.75rem; font-size: 0.8rem; margin-right: 0.5rem;">Edit</button>
                <button class="btn btn-danger" onclick="deleteSchool('${escapeJSString(school.name)}')" style="padding: 0.3rem 0.75rem; font-size: 0.8rem;">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// POPULATE SCHOOL FILTER DROPDOWN
function populateSchoolFilter() {
    const filter = document.getElementById("filter-school");
    const currentVal = filter.value;
    filter.innerHTML = '<option value="">All Schools</option>';
    
    state.schools.forEach(school => {
        const opt = document.createElement("option");
        opt.value = school.name;
        opt.textContent = school.name;
        filter.appendChild(opt);
    });
    
    filter.value = currentVal;
}

// RENDER ADMIN REGISTRATIONS
function renderAdminRegistrationsTable() {
    const tbody = document.getElementById("admin-registrations-list");
    tbody.innerHTML = "";

    const schoolFilter = document.getElementById("filter-school").value;
    const eventFilter = document.getElementById("filter-event").value;

    const filtered = state.registrations.filter(reg => {
        const matchSchool = !schoolFilter || reg.school_name === schoolFilter;
        const matchEvent = !eventFilter || reg.event_name === eventFilter;
        return matchSchool && matchEvent;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    No matching registrations found.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(reg => {
        const pList = [];
        if (reg.participant_1) pList.push(reg.participant_1);
        if (reg.participant_2) pList.push(reg.participant_2);
        if (reg.participant_3) pList.push(reg.participant_3);

        const badges = pList.map(name => `<span class="participant-badge">${escapeHTML(name)}</span>`).join("");
        const dateStr = new Date(reg.timestamp).toLocaleString();

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td style="font-weight: 600; color: white;">${escapeHTML(reg.school_name)}</td>
            <td style="color: var(--color-gold-glow); font-weight: 500;">${escapeHTML(reg.event_name)}</td>
            <td>${badges}</td>
            <td style="color: var(--text-secondary); font-size: 0.85rem;">${dateStr}</td>
        `;
        tbody.appendChild(tr);
    });
}

function applyAdminFilters() {
    renderAdminRegistrationsTable();
}

// EXPORT TO EXCEL
function exportToExcel() {
    // Triggers direct browser download via the authenticated session endpoint
    window.location.href = "/api/admin/export";
}

// SCHOOL MODAL ACTIONS
function openAddSchoolModal() {
    hideBanners();
    document.getElementById("modal-school-title").textContent = "Add New School";
    document.getElementById("modal-school-action").value = "add";
    document.getElementById("modal-school-name").value = "";
    document.getElementById("modal-school-name").disabled = false;
    document.getElementById("modal-school-password").value = "";
    document.getElementById("modal-school-submit").textContent = "Save School";
    
    document.getElementById("school-modal").classList.add("open");
}

function openEditSchoolModal(schoolName, password) {
    hideBanners();
    document.getElementById("modal-school-title").textContent = "Edit School Password";
    document.getElementById("modal-school-action").value = "edit";
    document.getElementById("modal-school-name").value = schoolName;
    document.getElementById("modal-school-name").disabled = true; // Lock school name
    document.getElementById("modal-school-password").value = password;
    document.getElementById("modal-school-submit").textContent = "Update Password";
    
    document.getElementById("school-modal").classList.add("open");
}

function closeSchoolModal() {
    document.getElementById("school-modal").classList.remove("open");
    document.getElementById("school-modal-form").reset();
}

// GENERATE 8-CHAR ALPHANUMERIC PASSWORD
function generateRandomPassword() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let pwd = '';
    for (let i = 0; i < 8; i++) {
        pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('modal-school-password').value = pwd;
}

// SUBMIT ADD/EDIT SCHOOL
async function handleSchoolModalSubmit(e) {
    e.preventDefault();
    hideBanners();

    const school_name = document.getElementById("modal-school-name").value.trim();
    const password = document.getElementById("modal-school-password").value.trim();
    const action = document.getElementById("modal-school-action").value;

    try {
        const response = await fetch("/api/admin/schools", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ school_name, password, action })
        });

        const data = await response.json();
        if (response.ok && data.success) {
            closeSchoolModal();
            fetchAdminSchools();
            fetchAdminRegistrations(); // refresh reg lists in case deletions or updates affected names
        } else {
            showModalError(data.message || "Failed to save school details.");
        }
    } catch (err) {
        showModalError("Server connection error.");
    }
}

function showModalError(msg) {
    const banner = document.getElementById("modal-school-error");
    const text = document.getElementById("modal-school-error-text");
    text.textContent = msg;
    banner.style.display = "flex";
}

// DELETE SCHOOL
async function deleteSchool(schoolName) {
    const confirmDelete = confirm(`Are you absolutely sure you want to delete "${schoolName}"?\n\nThis will revoke their login access and permanently delete all of their event registrations!`);
    if (!confirmDelete) return;

    try {
        const response = await fetch(`/api/admin/schools/${encodeURIComponent(schoolName)}`, {
            method: "DELETE"
        });

        const data = await response.json();
        if (response.ok && data.success) {
            fetchAdminSchools();
            fetchAdminRegistrations();
        } else {
            alert(data.message || "Failed to delete school.");
        }
    } catch (err) {
        alert("Server connection error.");
    }
}

// HELPERS FOR ESCAPING (XSS Prevention)
function escapeHTML(str) {
    if (!str) return "";
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function escapeJSString(str) {
    if (!str) return "";
    return str
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}
