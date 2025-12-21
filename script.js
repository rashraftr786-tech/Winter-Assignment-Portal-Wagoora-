/**
 * WAGOORA V3.0 - CLOUD CORE (STABLE FIX)
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

// Initialize Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
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
    try {
        const role = document.getElementById('role-select').value;
        const user = document.getElementById('user-field').value.trim();
        const pass = document.getElementById('pass-field').value.trim();

        if (!user || !pass) return alert("Please fill all fields");

        // Super Admin
        if (role === 'superadmin' && user === 'admin' && pass === 'super123') {
            return initPortal('superadmin', 'System Master');
        }

        // HOI Cloud Auth
        if (role === 'hoi') {
            const query = await db.collection("hois").where("username", "==", user).get();
            if (!query.empty) {
                const data = query.docs[0].data();
                const validPass = data.password || "welcome@123"; 
                if (pass === validPass) {
                    initPortal('hoi', data.schoolName); 
                } else {
                    alert("Invalid Password");
                }
            } else {
                alert("HOI Username not found");
            }
            return;
        }
        
        // Teacher/Student Simple Auth
        if (role === 'teacher' || role === 'student') {
            initPortal(role, user);
        }
    } catch (err) {
        console.error(err);
        alert("Login System Error. Check Console.");
    }
}

function initPortal(role, name) {
    state.currentUser = { role, name };
    document.getElementById('login-screen').classList.add('hidden');
    const mainDash = document.getElementById('main-dashboard');
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
    startCloudListeners(); 
}

// --- CLOUD ENGINE ---
function startCloudListeners() {
    db.collection("schools").onSnapshot(s => {
        state.schools = s.docs.map(d => d.data());
        renderSchoolList(); 
    });

    db.collection("subjects").onSnapshot(s => {
        state.globalSubjects = s.docs.map(d => d.data());
        updateHOISubjectDropdown(); 
    });

    db.collection("hois").onSnapshot(s => {
        state.hois = s.docs.map(d => d.data());
        renderHOIList();
    });

    db.collection("teachers").orderBy("createdAt", "desc").onSnapshot(s => {
        state.teachers = s.docs.map(d => ({id: d.id, ...d.data()}));
        renderTeacherList();
    });
}

// --- WRITE FUNCTIONS ---
async function registerNewSchool() {
    const name = document.getElementById('school-name').value.trim();
    const loc = document.getElementById('school-location').value.trim();
    if (name && loc) {
        await db.collection("schools").add({
            name, location: loc, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('school-name').value = '';
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
            username: user,
            password: "welcome@123",
            schoolName: school,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('hoi-username').value = '';
        alert("HOI Appointed!");
    }
}

async function addTeacher() {
    const name = document.getElementById('t-name').value.trim();
    const subject = document.getElementById('t-subject').value;
    if (name && subject) {
        await db.collection("teachers").add({
            name, subject, 
            schoolContext: state.currentUser.name,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('t-name').value = '';
    }
}

async function removeTeacher(id) {
    if(confirm("Remove?")) await db.collection("teachers").doc(id).delete();
}

// --- RENDER FUNCTIONS ---
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
    const myTeachers = state.teachers.filter(t => t.schoolContext === state.currentUser.name);
    list.innerHTML = myTeachers.map(t => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5">
            <div><p class="font-bold text-sm">${t.name}</p><p class="text-[10px] text-indigo-400 uppercase">${t.subject}</p></div>
            <button onclick="removeTeacher('${t.id}')" class="text-red-400"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join('') || '<p class="text-xs opacity-20 py-4">No staff registered.</p>';
}

function renderSchoolList() {
    const list = document.getElementById('school-list');
    const dropdown = document.getElementById('hoi-school-select');
    if (list) list.innerHTML = state.schools.map(s => `<div class="glass p-4 rounded-xl"><p class="font-bold text-sm">${s.name}</p></div>`).join('');
    if (dropdown) dropdown.innerHTML = '<option value="">Select School</option>' + state.schools.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

function renderHOIList() {
    const list = document.getElementById('hoi-list');
    if (list) list.innerHTML = state.hois.map(h => `<div class="glass p-4 rounded-xl text-left"><p class="text-white text-sm font-bold">${h.username}</p><p class="text-[9px] text-indigo-400 uppercase">${h.schoolName}</p></div>`).join('');
}

function renderSidebar(role) {
    const sidebar = document.getElementById('sidebar-menu');
    if (sidebar) sidebar.innerHTML = `<div class="p-4 glass rounded-2xl font-bold text-xs uppercase border-l-4 border-indigo-500">${role} Dashboard</div>`;
}

function logout() { location.reload(); }
