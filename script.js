/**
 * WAGOORA V3.0 - CLOUD CORE (STABLE HYBRID)
 */

const firebaseConfig = {
  apiKey: "AIzaSyBcRfUj9N_9LaVuEuIT7d0ueJ88heyP9hI",
  authDomain: "wagoora-edu-portal.firebaseapp.com",
  projectId: "wagoora-edu-portal",
  storageBucket: "wagoora-edu-portal.firebasestorage.app",
  messagingSenderId: "476444772096",
  appId: "1:476444772096:web:6fd360cc0a774f94a1d5e5"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. APP STATE WITH HARDCODED REGISTRY
let state = {
    currentUser: null,
    // THE MASTER LIST (Hardcoded as requested)
    localSubjects: [
        // Foundational
        { name: "English", cat: "Foundational" },
        { name: "Mathematics", cat: "Foundational" },
        { name: "Urdu", cat: "Foundational" },
        { name: "Kashmiri", cat: "Foundational" },
        // Primary
        { name: "EVS", cat: "Primary" },
        // Middle
        { name: "Science", cat: "Middle" },
        { name: "Social Studies", cat: "Middle" }
    ],
    cloudSubjects: [], 
    globalSubjects: [], 
    schools: [], hois: [], teachers: []
};

// --- AUTHENTICATION ---
async function handleLogin() {
    try {
        const role = document.getElementById('role-select').value;
        const user = document.getElementById('user-field').value.trim();
        const pass = document.getElementById('pass-field').value.trim();
        if (!user || !pass) return alert("Fill all fields");

        if (role === 'superadmin' && user === 'admin' && pass === 'super123') {
            return initPortal('superadmin', 'System Master');
        }

        if (role === 'hoi') {
            const query = await db.collection("hois").where("username", "==", user).get();
            if (!query.empty) {
                const data = query.docs[0].data();
                if (pass === (data.password || "welcome@123")) {
                    initPortal('hoi', data.schoolName); 
                } else alert("Invalid Password");
            } else alert("HOI not found");
            return;
        }
        initPortal(role, user);
    } catch (err) { console.error(err); }
}

function initPortal(role, name) {
    state.currentUser = { role, name };
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('hidden');
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('display-role').innerText = role;

    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    const activePanel = document.getElementById('panel-' + role);
    if (activePanel) activePanel.classList.remove('hidden');

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
        // Merge Hardcoded + Cloud added subjects
        state.globalSubjects = [...state.localSubjects, ...state.cloudSubjects];
        updateHOISubjectDropdown(); 
    });

    db.collection("hois").onSnapshot(s => {
        state.hois = s.docs.map(d => d.data());
        renderHOIList();
    });

    if (state.currentUser?.role === 'hoi') {
        db.collection("teachers")
            .where("schoolContext", "==", state.currentUser.name)
            .onSnapshot(s => {
                state.teachers = s.docs.map(d => ({id: d.id, ...d.data()}));
                renderTeacherList();
            });
    }
}

// --- RENDER & HIERARCHY FILTER ---
function updateHOISubjectDropdown() {
    const select = document.getElementById('t-subject');
    if (!select || !state.currentUser) return;

    const schoolName = state.currentUser.name.toLowerCase();
    
    // LOGIC: High levels see their own + all levels below them
    const filtered = state.globalSubjects.filter(sub => {
        const isFoundational = sub.cat === "Foundational";
        const isPrimary = sub.cat === "Primary";
        const isMiddle = sub.cat === "Middle";
        const isSecondary = sub.cat === "Secondary";
        const isHigherSec = sub.cat === "Higher Secondary";

        // Higher Secondary Level
        if (schoolName.includes("higher secondary") || schoolName.includes("hss")) {
            return sub.name === "English" || isHigherSec; 
        } 
        // Secondary Level
        if (schoolName.includes("secondary") || schoolName.includes("hs")) {
            return isFoundational || isPrimary || isMiddle || isSecondary;
        }
        // Middle Level
        if (schoolName.includes("middle") || schoolName.includes("ms")) {
            return isFoundational || isPrimary || isMiddle;
        }
        // Primary Level
        if (schoolName.includes("primary") || schoolName.includes("ps")) {
            return isFoundational || isPrimary;
        }
        // Default (Foundational/Preschool)
        return isFoundational;
    });

    if (filtered.length === 0) {
        select.innerHTML = '<option value="">No subjects match school level</option>';
        return;
    }

    select.innerHTML = '<option value="">Select Subject</option>' + 
        filtered.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

// --- WRITE FUNCTIONS ---
async function addGlobalSubject() {
    const name = document.getElementById('sub-name').value.trim();
    const cat = document.getElementById('sub-cat').value;
    if (name) {
        await db.collection("subjects").add({ name, cat });
        document.getElementById('sub-name').value = '';
    }
}

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

function renderTeacherList() {
    const list = document.getElementById('teacher-list');
    if (list) list.innerHTML = state.teachers.map(t => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5">
            <div><p class="font-bold text-sm">${t.name}</p><p class="text-[10px] text-indigo-400 uppercase">${t.subject}</p></div>
            <button onclick="removeTeacher('${t.id}')" class="text-red-400"><i class="fas fa-trash-alt"></i></button>
        </div>
    `).join('') || '<p class="text-xs opacity-20 py-4">No staff registered.</p>';
}

function renderSchoolList() {
    const list = document.getElementById('school-list');
    const dropdown = document.getElementById('hoi-school-select');
    if (list) list.innerHTML = state.schools.map(s => `<div class="glass p-4 rounded-xl"><p class="font-bold">${s.name}</p></div>`).join('');
    if (dropdown) dropdown.innerHTML = '<option value="">Select School</option>' + state.schools.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

function renderHOIList() {
    const list = document.getElementById('hoi-list');
    if (list) list.innerHTML = state.hois.map(h => `<div class="glass p-4 rounded-xl"><p class="text-sm font-bold">${h.username}</p><p class="text-[9px] uppercase">${h.schoolName}</p></div>`).join('');
}

async function removeTeacher(id) { if(confirm("Remove?")) await db.collection("teachers").doc(id).delete(); }
function logout() { location.reload(); }





