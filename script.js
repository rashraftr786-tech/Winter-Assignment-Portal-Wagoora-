/**
 * WAGOORA V3.0 - CLOUD CORE
 */

// 1. FIREBASE CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyBcRfUj9N_9LaVuEuIT7d0ueJ88heyP9hI",
  authDomain: "wagoora-edu-portal.firebaseapp.com",
  projectId: "wagoora-edu-portal",
  storageBucket: "wagoora-edu-portal.firebasestorage.app",
  messagingSenderId: "476444772096",
  appId: "1:476444772096:web:6fd360cc0a774f94a1d5e5"
};

// Initialize Firebase using the Compat SDK
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. APP STATE
let state = {
    currentUser: null,
    globalSubjects: [], 
    schools: [],        
    studentProgress: {
        coins: parseInt(localStorage.getItem('wagoora_coins')) || 0
    }
};

// --- AUTHENTICATION ---
function handleLogin() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('user-field').value.trim();
    const pass = document.getElementById('pass-field').value.trim();

    if (!user || !pass) return alert("Please fill all fields");

    // Super Admin Credentials
    if (role === 'superadmin') {
        if (user === 'admin' && pass === 'super123') {
            initPortal('superadmin', 'System Master');
        } else { alert("Invalid Admin Credentials"); }
    } 
    // HOI Credentials
    else if (role === 'hoi') {
        if (pass === 'welcome@123') {
            initPortal('hoi', user);
        } else { alert("Invalid HOI Password"); }
    } 
    // Teacher & Student Access
    else if (role === 'teacher') {
        initPortal('teacher', user, "General Science"); 
    } 
    else if (role === 'student') {
        initPortal('student', user, "Standard Curriculum"); 
    }
}

function initPortal(role, name, subject = null) {
    state.currentUser = { role, name, subject };
    
    // UI TRANSITION: Switch from Login to Dashboard
    document.getElementById('login-screen').classList.add('hidden');
    const mainDash = document.getElementById('main-dashboard');
    
    // FIX: Explicitly set display to 'grid' for Tailwind layouts
    mainDash.classList.remove('hidden');
    mainDash.style.display = (window.innerWidth < 1024) ? 'block' : 'grid';
    
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('nav-info').style.display = 'flex';
    document.getElementById('display-role').innerText = role;
    
    // Reset all panels before showing the active one
    document.querySelectorAll('.panel').forEach(p => {
        p.classList.add('hidden');
        p.style.display = 'none';
    });

    const activePanel = document.getElementById('panel-' + role);
    if (activePanel) {
        activePanel.classList.remove('hidden');
        activePanel.style.display = 'block';
    }

    // TRIGGER CORE FUNCTIONS
    renderSidebar(role);
    startCloudListeners(); // Connect to Firebase

    if (role === 'teacher') document.getElementById('active-subject-display').innerText = subject;
    if (role === 'student') updateCoinDisplay();
}

// --- CLOUD ENGINE (REAL-TIME) ---
function startCloudListeners() {
    // Sync Schools
    db.collection("schools").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        state.schools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSchoolList();
    }, (error) => {
        console.error("Firestore Schools Error:", error);
    });

    // Sync Subjects
    db.collection("subjects").orderBy("name").onSnapshot((snapshot) => {
        state.globalSubjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSubjectList();
    });
}

// --- CLOUD WRITE FUNCTIONS ---
async function registerNewSchool() {
    const nameInput = document.getElementById('school-name');
    const locInput = document.getElementById('school-location');
    const name = nameInput.value.trim();
    const loc = locInput.value.trim();

    if (name && loc) {
        try {
            await db.collection("schools").add({
                name,
                location: loc,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            nameInput.value = '';
            locInput.value = '';
            alert("School Registered to Cloud!");
        } catch (e) { 
            console.error(e);
            alert("Database Write Error. Check Rules."); 
        }
    }
}

async function addGlobalSubject() {
    const nameInput = document.getElementById('sub-name');
    const cat = document.getElementById('sub-cat').value;
    const name = nameInput.value.trim();

    if (name) {
        await db.collection("subjects").add({ name, cat });
        nameInput.value = '';
        alert("Subject Added!");
    }
}

// --- UI RENDERERS ---
function renderSchoolList() {
    const list = document.getElementById('school-list');
    const dropdown = document.getElementById('hoi-school-select'); // New reference
    if (!list) return;

    if (state.schools.length === 0) {
        list.innerHTML = `<p class="col-span-full opacity-30 italic py-10">Fetching cloud registry...</p>`;
        return;
    }

    // Update the visual list
    list.innerHTML = state.schools.map(s => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5 animate-fadeIn">
            <div class="text-left">
                <p class="font-bold text-sm text-white">${s.name}</p>
                <p class="text-[10px] text-indigo-300 uppercase tracking-widest">${s.location || 'Global'}</p>
            </div>
            <i class="fas fa-cloud text-indigo-500/30"></i>
        </div>
    `).join('');

    // Update the HOI dropdown
    if (dropdown) {
        dropdown.innerHTML = '<option value="">Select School</option>' + 
            state.schools.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }
}

function renderSubjectList() {
    const list = document.getElementById('subject-list');
    if (!list) return;

    list.innerHTML = state.globalSubjects.map(s => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5">
            <div class="text-left">
                <p class="font-bold text-sm text-white">${s.name}</p>
                <p class="text-[10px] text-gray-500 uppercase">${s.cat}</p>
            </div>
            <i class="fas fa-check-circle text-indigo-500"></i>
        </div>
    `).join('');
}

function renderSidebar(role) {
    const sidebar = document.getElementById('sidebar-menu');
    if (!sidebar) return;

    if (role === 'superadmin') {
        sidebar.innerHTML = `
            <button class="w-full text-left p-4 glass rounded-2xl mb-2 text-indigo-400 font-bold border-l-4 border-indigo-500">
                <i class="fas fa-layer-group mr-2"></i> Cloud Overview
            </button>
            <div class="p-4 text-[10px] text-gray-500 uppercase font-bold tracking-widest">Master Controls</div>
        `;
    } else {
        sidebar.innerHTML = `<div class="glass p-4 rounded-2xl text-xs uppercase opacity-50 font-bold">Standard User Access</div>`;
    }
}

function updateCoinDisplay() {
    const el = document.getElementById('student-coins');
    if (el) el.innerText = state.studentProgress.coins;
}

function logout() {
    if(confirm("Exit Wagoora Cloud?")) location.reload();
}
async function appointHOI() {
    const user = document.getElementById('hoi-username').value.trim();
    const school = document.getElementById('hoi-school-select').value;

    if (!user || !school) return alert("Please enter a username and select a school");

    try {
        await db.collection("hois").add({
            username: user,
            schoolName: school,
            role: 'hoi',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        document.getElementById('hoi-username').value = '';
        alert(`HOI ${user} appointed for ${school}!`);
    } catch (e) {
        console.error(e);
        alert("Error saving HOI to cloud.");
    }
}
