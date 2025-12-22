/**
 * WAGOORA V3.0 - STABLE MOBILE VERSION
 */

const firebaseConfig = {
  apiKey: "AIzaSyBcRfUj9N_9LaVuEuIT7d0ueJ88heyP9hI",
  authDomain: "wagoora-edu-portal.firebaseapp.com",
  projectId: "wagoora-edu-portal",
  storageBucket: "wagoora-edu-portal.firebasestorage.app",
  messagingSenderId: "476444772096",
  appId: "1:476444772096:web:6fd360cc0a774f94a1d5e5"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
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

// --- AUTHENTICATION ---
async function handleLogin() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('user-field').value.trim();
    const pass = document.getElementById('pass-field').value.trim();

    if (!user || !pass) return alert("Please fill all fields");

    try {
        if (role === 'superadmin') {
            if (user === 'admin' && pass === 'super123') {
                showPortal('superadmin', 'System Master');
            } else { alert("Wrong Admin Password"); }
            return;
        }

        if (role === 'hoi') {
            const snap = await db.collection("hois").where("username", "==", user).get();
            if (!snap.empty) {
                const data = snap.docs[0].data();
                if (pass === (data.password || "welcome@123")) {
                    showPortal('hoi', data.schoolName);
                } else { alert("Wrong Password"); }
            } else { alert("HOI not found"); }
        }
    } catch (e) { alert("Error: " + e.message); }
}

function showPortal(role, schoolName) {
    state.currentUser = { role: role, name: schoolName };

    // 1. Hide Login, Show Dashboard
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-dashboard').classList.remove('hidden');
    document.getElementById('main-dashboard').style.display = 'block';
    
    // 2. Setup Navbar
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('nav-info').style.display = 'flex';
    document.getElementById('display-role').innerText = role + " | " + schoolName;

    // 3. Force Show Correct Panel
    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
    const target = document.getElementById('panel-' + role);
    if (target) {
        target.classList.remove('hidden');
        target.style.display = 'block';
    }

    startCloudListeners();
}

// --- CLOUD ENGINE ---
function startCloudListeners() {
    // Sync Schools
    db.collection("schools").onSnapshot(s => {
        state.schools = s.docs.map(d => d.data());
        renderSchools();
    });

    // Sync Subjects
    db.collection("subjects").onSnapshot(s => {
        state.cloudSubjects = s.docs.map(d => d.data());
        state.globalSubjects = [...state.localSubjects, ...state.cloudSubjects];
        renderSubjectDropdown();
    });

    // Sync Teachers for HOI
    if (state.currentUser.role === 'hoi') {
        db.collection("teachers")
            .where("schoolContext", "==", state.currentUser.name)
            .onSnapshot(s => {
                state.teachers = s.docs.map(d => ({id: d.id, ...d.data()}));
                renderTeachers();
            });
    }
}

// --- UI RENDERING ---
function renderSubjectDropdown() {
    const select = document.getElementById('t-subject');
    if (!select || !state.currentUser) return;

    const school = state.currentUser.name.toLowerCase();
    
    const filtered = state.globalSubjects.filter(sub => {
        const cat = sub.cat;
        if (school.includes("higher secondary")) return sub.name === "English" || cat === "Higher Secondary";
        if (school.includes("secondary")) return ["Secondary", "Middle", "Primary", "Foundational"].includes(cat);
        if (school.includes("middle")) return ["Middle", "Primary", "Foundational"].includes(cat);
        if (school.includes("primary")) return ["Primary", "Foundational"].includes(cat);
        return cat === "Foundational";
    });

    select.innerHTML = '<option value="">Select Subject</option>' + 
        filtered.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

async function addTeacher() {
    const name = document.getElementById('t-name').value.trim();
    const sub = document.getElementById('t-subject').value;
    if (name && sub) {
        await db.collection("teachers").add({
            name: name, subject: sub, schoolContext: state.currentUser.name
        });
        document.getElementById('t-name').value = '';
        alert("Success!");
    }
}

function renderTeachers() {
    const list = document.getElementById('teacher-list');
    if (list) list.innerHTML = state.teachers.map(t => `
        <div class="glass p-3 rounded-xl mb-2 flex justify-between">
            <span>${t.name} (${t.subject})</span>
            <button onclick="deleteTeacher('${t.id}')" class="text-red-400">X</button>
        </div>
    `).join('') || "No staff registered.";
}

function renderSchools() {
    const drop = document.getElementById('hoi-school-select');
    if (drop) drop.innerHTML = '<option value="">Select School</option>' + 
        state.schools.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

async function deleteTeacher(id) { if(confirm("Delete?")) await db.collection("teachers").doc(id).delete(); }
function logout() { location.reload(); }
