/**
 * WAGOORA V3.0 - MOBILE OPTIMIZED
 */

const firebaseConfig = {
  apiKey: "AIzaSyBcRfUj9N_9LaVuEuIT7d0ueJ88heyP9hI",
  authDomain: "wagoora-edu-portal.firebaseapp.com",
  projectId: "wagoora-edu-portal",
  storageBucket: "wagoora-edu-portal.firebasestorage.app",
  messagingSenderId: "476444772096",
  appId: "1:476444772096:web:6fd360cc0a774f94a1d5e5"
};

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let state = {
    currentUser: null,
    localSubjects: [
        { name: "English", cat: "Foundational" },
        { name: "Mathematics", cat: "Foundational" },
        { name: "Urdu", cat: "Foundational" },
        { name: "Kashmiri", cat: "Foundational" },
        { name: "EVS", cat: "Primary" },
        { name: "Science", cat: "Middle" },
        { name: "Social Studies", cat: "Middle" }
    ],
    cloudSubjects: [], 
    globalSubjects: [], 
    schools: [], hois: [], teachers: []
};

// --- AUTHENTICATION (FIXED) ---
async function handleLogin() {
    try {
        const role = document.getElementById('role-select').value;
        const user = document.getElementById('user-field').value.trim();
        const pass = document.getElementById('pass-field').value.trim();

        if (!user || !pass) return alert("Please fill all fields");

        if (role === 'superadmin') {
            if (user === 'admin' && pass === 'super123') {
                initPortal('superadmin', 'System Master');
            } else {
                alert("Invalid Admin Credentials");
            }
            return;
        }

        if (role === 'hoi') {
            const query = await db.collection("hois").where("username", "==", user).get();
            if (!query.empty) {
                const data = query.docs[0].data();
                if (pass === (data.password || "welcome@123")) {
                    initPortal('hoi', data.schoolName); 
                } else {
                    alert("Invalid Password");
                }
            } else {
                alert("HOI Username not found");
            }
            return;
        }
        
        initPortal(role, user);
    } catch (err) {
        alert("Login Error: " + err.message);
    }
}

function initPortal(role, name) {
    state.currentUser = { role: role, name: name };
    
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('hidden');
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('display-role').innerText = role;

    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    const activePanel = document.getElementById('panel-' + role);
    if (activePanel) activePanel.classList.remove('hidden');

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
        state.cloudSubjects = s.docs.map(d => d.data());
        state.globalSubjects = [...state.localSubjects, ...state.cloudSubjects];
        updateHOISubjectDropdown(); 
    });

    db.collection("hois").onSnapshot(s => {
        state.hois = s.docs.map(d => d.data());
        renderHOIList();
    });

    if (state.currentUser && state.currentUser.role === 'hoi') {
        db.collection("teachers")
            .where("schoolContext", "==", state.currentUser.name)
            .onSnapshot(s => {
                state.teachers = s.docs.map(d => ({id: d.id, ...d.data()}));
                renderTeacherList();
            });
    }
}

// --- DROPDOWN FILTER (FIXED FOR PRIMARY SCHOOL) ---
function updateHOISubjectDropdown() {
    const select = document.getElementById('t-subject');
    if (!select || !state.currentUser) return;

    const schoolName = state.currentUser.name.toLowerCase();
    
    const filtered = state.globalSubjects.filter(sub => {
        const cat = sub.cat;
        
        if (schoolName.includes("higher secondary") || schoolName.includes("hss")) {
            return sub.name === "English" || cat === "Higher Secondary"; 
        } 
        if (schoolName.includes("secondary") || schoolName.includes("hs")) {
            return ["Secondary", "Middle", "Primary", "Foundational"].includes(cat);
        }
        if (schoolName.includes("middle") || schoolName.includes("ms")) {
            return ["Middle", "Primary", "Foundational"].includes(cat);
        }
        if (schoolName.includes("primary") || schoolName.includes("ps")) {
            return ["Primary", "Foundational"].includes(cat);
        }
        return cat === "Foundational";
    });

    select.innerHTML = '<option value="">Select Subject</option>' + 
        filtered.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

// --- DATA WRITE FUNCTIONS ---
async function addGlobalSubject() {
    const name = document.getElementById('sub-name').value.trim();
    const cat = document.getElementById('sub-cat').value;
    if (name) {
        await db.collection("subjects").add({ name, cat });
        document.getElementById('sub-name').value = '';
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
        alert("Teacher Added!");
    }
}

async function registerNewSchool() {
    const name = document.getElementById('school-name').value.trim();
    const loc = document.getElementById('school-location').value.trim();
    if (name && loc) {
        await db.collection("schools").add({ name, location: loc });
        document.getElementById('school-name').value = '';
        document.getElementById('school-location').value = '';
    }
}

async function appointHOI() {
    const user = document.getElementById('hoi-username').value.trim();
    const school = document.getElementById('hoi-school-select').value;
    if (user && school) {
        await db.collection("hois").add({
            username: user, password: "welcome@123", schoolName: school
        });
        document.getElementById('hoi-username').value = '';
    }
}

// --- UI RENDERING ---
function renderTeacherList() {
    const list = document.getElementById('teacher-list');
    if (list) list.innerHTML = state.teachers.map(t => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5">
            <div><p class="font-bold text-sm">${t.name}</p><p class="text-[10px] text-indigo-400 uppercase">${t.subject}</p></div>
            <button onclick="removeTeacher('${t.id}')" class="text-red-400 p-2"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join('') || '<p class="text-xs opacity-20 py-4">No staff registered.</p>';
}

function renderSchoolList() {
    const list = document.getElementById('school-list');
    const dropdown = document.getElementById('hoi-school-select');
    if (list) list.innerHTML = state.schools.map(s => `<div class="glass p-4 rounded-xl text-sm">${s.name}</div>`).join('');
    if (dropdown) dropdown.innerHTML = '<option value="">Select School</option>' + state.schools.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

function renderHOIList() {
    const list = document.getElementById('hoi-list');
    if (list) list.innerHTML = state.hois.map(h => `<div class="glass p-4 rounded-xl text-xs"><p class="font-bold">${h.username}</p><p class="opacity-50 uppercase">${h.schoolName}</p></div>`).join('');
}

function renderSidebar(role) {
    const sidebar = document.getElementById('sidebar-menu');
    if (sidebar) sidebar.innerHTML = `<div class="p-4 glass rounded-2xl font-bold text-xs uppercase border-l-4 border-indigo-500">${role} Dashboard</div>`;
}

async function removeTeacher(id) { if(confirm("Remove?")) await db.collection("teachers").doc(id).delete(); }
function logout() { location.reload(); }



