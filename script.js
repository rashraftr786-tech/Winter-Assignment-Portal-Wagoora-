/**
 * WAGOORA V3.0 - CLOUD CORE (COMPLETE UPDATE)
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

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. APP STATE
let state = {
    currentUser: null,
    globalSubjects: [], 
    schools: [],        
    hois: [],
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

    if (role === 'superadmin' && user === 'admin' && pass === 'super123') {
        initPortal('superadmin', 'System Master');
    } else if (role === 'hoi' && pass === 'welcome@123') {
        initPortal('hoi', user);
    } else if (role === 'teacher') {
        initPortal('teacher', user, "General Science"); 
    } else if (role === 'student') {
        initPortal('student', user, "Standard Curriculum"); 
    } else {
        alert("Access Denied");
    }
}

function initPortal(role, name, subject = null) {
    state.currentUser = { role, name, subject };
    
    document.getElementById('login-screen').classList.add('hidden');
    const mainDash = document.getElementById('main-dashboard');
    
    // UI Layout Fix
    mainDash.classList.remove('hidden');
    mainDash.style.display = (window.innerWidth < 1024) ? 'block' : 'grid';
    
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('nav-info').style.display = 'flex';
    document.getElementById('display-role').innerText = role;
    
    document.querySelectorAll('.panel').forEach(p => {
        p.classList.add('hidden');
        p.style.display = 'none';
    });

    const activePanel = document.getElementById('panel-' + role);
    if (activePanel) {
        activePanel.classList.remove('hidden');
        activePanel.style.display = 'block';
    }

    renderSidebar(role);
    startCloudListeners(); // Start real-time sync

    if (role === 'teacher') document.getElementById('active-subject-display').innerText = subject;
    if (role === 'student') updateCoinDisplay();
}

// --- CLOUD ENGINE (REAL-TIME) ---
function startCloudListeners() {
    // A. Watch Schools
    db.collection("schools").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        state.schools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSchoolList(); // This also updates the HOI Dropdown
    });

    // B. Watch Subjects
    db.collection("subjects").orderBy("name").onSnapshot((snapshot) => {
        state.globalSubjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSubjectList();
    });

    // C. Watch HOI Appointments
    db.collection("hois").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        state.hois = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderHOIList();
    });
}

// --- CLOUD WRITE FUNCTIONS ---
async function registerNewSchool() {
    const name = document.getElementById('school-name').value.trim();
    const loc = document.getElementById('school-location').value.trim();
    if (name && loc) {
        await db.collection("schools").add({
            name, location: loc, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('school-name').value = '';
        document.getElementById('school-location').value = '';
    }
}

async function addGlobalSubject() {
    const name = document.getElementById('sub-name').value.trim();
    const cat = document.getElementById('sub-cat').value;
    if (name) {
        await db.collection("subjects").add({ name, cat });
        document.getElementById('sub-name').value = '';
    }
}

async function appointHOI() {
    const user = document.getElementById('hoi-username').value.trim();
    const school = document.getElementById('hoi-school-select').value;
    if (user && school) {
        await db.collection("hois").add({
            username: user, schoolName: school, role: 'hoi',
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('hoi-username').value = '';
        alert("HOI Appointed!");
    } else {
        alert("Please fill all HOI fields");
    }
}

// --- RENDERING ---
function renderSchoolList() {
    const list = document.getElementById('school-list');
    const dropdown = document.getElementById('hoi-school-select');
    if (!list) return;

    list.innerHTML = state.schools.map(s => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5 animate-fadeIn">
            <div class="text-left"><p class="font-bold text-sm">${s.name}</p><p class="text-[10px] text-indigo-300 uppercase">${s.location}</p></div>
            <i class="fas fa-cloud text-indigo-500/30"></i>
        </div>
    `).join('') || '<p class="col-span-full opacity-30 italic py-10">No schools found.</p>';

    // Update the HOI selection dropdown
    if (dropdown) {
        dropdown.innerHTML = '<option value="">Select School</option>' + 
            state.schools.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }
}

function renderHOIList() {
    const list = document.getElementById('hoi-list');
    if (!list) return;
    list.innerHTML = state.hois.map(h => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5 animate-fadeIn">
            <div><p class="font-bold text-sm text-white">${h.username}</p><p class="text-[10px] text-indigo-400 uppercase font-black">${h.schoolName}</p></div>
            <i class="fas fa-user-check text-green-500/40"></i>
        </div>
    `).join('') || '<p class="col-span-full opacity-20 text-xs italic">No HOIs appointed yet.</p>';
}

function renderSubjectList() {
    const list = document.getElementById('subject-list');
    if (!list) return;
    list.innerHTML = state.globalSubjects.map(s => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5">
            <div class="text-left"><p class="font-bold text-sm">${s.name}</p><p class="text-[10px] text-gray-500 uppercase">${s.cat}</p></div>
            <i class="fas fa-check-circle text-indigo-500"></i>
        </div>
    `).join('');
}

function renderSidebar(role) {
    const sidebar = document.getElementById('sidebar-menu');
    if (role === 'superadmin') {
        sidebar.innerHTML = `<button class="w-full text-left p-4 glass rounded-2xl mb-2 text-indigo-400 font-bold border-l-4 border-indigo-500">
            <i class="fas fa-layer-group mr-2"></i> Cloud Overview</button>`;
    } else {
        sidebar.innerHTML = `<div class="glass p-4 rounded-2xl text-xs uppercase opacity-50 font-bold">Standard Access</div>`;
    }
}

function updateCoinDisplay() {
    const el = document.getElementById('student-coins');
    if (el) el.innerText = state.studentProgress.coins;
}

function logout() {
    if(confirm("Logout?")) location.reload();
}
