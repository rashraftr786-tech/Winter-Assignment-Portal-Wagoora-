/**
 * WAGOORA V3.0 - CLOUD CORE
 */

// 1. FIREBASE CONFIG
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
    teachers: []
};

// --- AUTHENTICATION ---
async function handleLogin() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('user-field').value.trim();
    const pass = document.getElementById('pass-field').value.trim();

    if (!user || !pass) return alert("Fill all fields");

    if (role === 'superadmin' && user === 'admin' && pass === 'super123') {
        initPortal('superadmin', 'System Master');
    } else if (role === 'hoi') {
        //
        const query = await db.collection("hois")
            .where("username", "==", user)
            .where("password", "==", pass)
            .get();

        if (!query.empty) {
            const data = query.docs[0].data();
            initPortal('hoi', data.schoolName); 
        } else {
            alert("Invalid HOI Login");
        }
    }
}

function initPortal(role, name) {
    state.currentUser = { role, name };
    document.getElementById('login-screen').classList.add('hidden');
    const mainDash = document.getElementById('main-dashboard');
    mainDash.classList.remove('hidden');
    mainDash.style.display = (window.innerWidth < 1024) ? 'block' : 'grid';
    
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('panel-' + role).classList.remove('hidden');

    renderSidebar(role);
    startCloudListeners(); //
}

// --- CLOUD ENGINE ---
function startCloudListeners() {
    db.collection("schools").onSnapshot(s => {
        state.schools = s.docs.map(d => d.data());
        renderSchoolList();
    });

    db.collection("subjects").onSnapshot(s => {
        state.globalSubjects = s.docs.map(d => d.data());
        updateHOISubjectDropdown(); // FIX: Fills the dropdown so 'subject' isn't empty
    });

    db.collection("teachers").orderBy("createdAt", "desc").onSnapshot(s => {
        state.teachers = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderTeacherList();
    });
}

// --- HOI TEACHER MANAGEMENT ---
async function addTeacher() {
    const nameEl = document.getElementById('t-name');
    const subEl = document.getElementById('t-subject');
    
    if (!nameEl || !subEl) return console.error("HTML IDs missing!");

    const name = nameEl.value.trim();
    const subject = subEl.value;

    if (name && subject) {
        try {
            await db.collection("teachers").add({
                name, 
                subject, 
                schoolContext: state.currentUser.name,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            nameEl.value = '';
            alert("Teacher Added!");
        } catch (e) { alert("Error adding to cloud"); }
    } else {
        alert("Please enter Name and select a Subject");
    }
}

async function removeTeacher(id) {
    if(confirm("Remove from Cloud?")) {
        await db.collection("teachers").doc(id).delete(); //
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
    `).join('') || '<p class="col-span-full opacity-30 italic py-10 text-center text-xs">Waiting for registry...</p>';

    if (dropdown) {
        dropdown.innerHTML = '<option value="">Select School</option>' + 
            state.schools.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }
}

function updateHOISubjectDropdown() {
    const select = document.getElementById('t-subject');
    if (select) {
        select.innerHTML = '<option value="">Select Subject</option>' + 
            state.globalSubjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
    }
}

function renderTeacherList() {
    const list = document.getElementById('teacher-list');
    if (!list) return;

    // Filter to only show teachers for THIS HOI's school
    const myTeachers = state.teachers.filter(t => t.schoolContext === state.currentUser.name);

    list.innerHTML = myTeachers.map(t => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5">
            <div><p class="font-bold text-sm">${t.name}</p><p class="text-[10px] text-indigo-400 uppercase">${t.subject}</p></div>
            <button onclick="removeTeacher('${t.id}')" class="text-red-400 p-2 hover:bg-red-500/10 rounded-lg">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
    `).join('') || '<p class="text-xs opacity-20 py-4">No staff registered for this school.</p>';
}

function renderSidebar(role) {
    const sidebar = document.getElementById('sidebar-menu');
    if (!sidebar) return;
    sidebar.innerHTML = `<div class="glass p-4 rounded-2xl text-xs uppercase opacity-50 font-bold border-l-4 border-indigo-500">
        ${role} DASHBOARD</div>`;
}

function updateCoinDisplay() {
    const el = document.getElementById('student-coins');
    if (el) el.innerText = state.studentProgress.coins;
}

function logout() {
    if(confirm("Exit Wagoora Cloud?")) location.reload();
}
