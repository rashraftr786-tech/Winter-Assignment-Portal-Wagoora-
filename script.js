/**
 * WAGOORA V3.0 - ANDROID STABLE VERSION
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
    // YOUR HARDCODED SUBJECT LIST
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

// --- AUTHENTICATION (FORCE-DISPLAY FIX) ---
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
            // Android-optimized database fetch
            const snap = await db.collection("hois").where("username", "==", user).get();
            if (!snap.empty) {
                const data = snap.docs[0].data();
                if (pass === (data.password || "welcome@123")) {
                    showPortal('hoi', data.schoolName);
                } else { alert("Wrong Password"); }
            } else { alert("HOI not found"); }
        }
    } catch (e) { alert("Mobile Sync Error: " + e.message); }
}

function showPortal(role, schoolName) {
    state.currentUser = { role: role, name: schoolName };

    // FORCE HIDE LOGIN & SHOW DASHBOARD
    const loginScreen = document.getElementById('login-screen');
    const dashboard = document.getElementById('main-dashboard');
    const navInfo = document.getElementById('nav-info');

    loginScreen.style.setProperty("display", "none", "important");
    dashboard.classList.remove('hidden');
    dashboard.style.setProperty("display", "block", "important");
    
    navInfo.classList.remove('hidden');
    navInfo.style.setProperty("display", "flex", "important");
    document.getElementById('display-role').innerText = role + " | " + schoolName;

    // Show correct panel
    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
    const target = document.getElementById('panel-' + role);
    if (target) {
        target.classList.remove('hidden');
        target.style.setProperty("display", "block", "important");
    }

    startCloudListeners();
}

// --- CLOUD ENGINE ---
function startCloudListeners() {
    // Schools
    db.collection("schools").onSnapshot(s => {
        state.schools = s.docs.map(d => d.data());
        renderSchools();
    });

    // Subjects (Sync and Merge)
    db.collection("subjects").onSnapshot(s => {
        state.cloudSubjects = s.docs.map(d => d.data());
        state.globalSubjects = [...state.localSubjects, ...state.cloudSubjects];
        renderSubjectDropdown();
    });

    // Teachers for HOI
    if (state.currentUser.role === 'hoi') {
        db.collection("teachers")
            .where("schoolContext", "==", state.currentUser.name)
            .onSnapshot(s => {
                state.teachers = s.docs.map(d => ({id: d.id, ...d.data()}));
                renderTeachers();
            });
    }
}

// --- DROPDOWN FILTER (PRIMARY SCHOOL FIX) ---
function renderSubjectDropdown() {
    const select = document.getElementById('t-subject');
    if (!select || !state.currentUser) return;

    const school = state.currentUser.name.toLowerCase();
    
    const filtered = state.globalSubjects.filter(sub => {
        const cat = sub.cat;
        // Higher Secondary: Only English + Cloud HS subjects
        if (school.includes("higher secondary") || school.includes("hss")) {
            return sub.name === "English" || cat === "Higher Secondary";
        }
        // Secondary: HS + Middle + Primary + Foundational
        if (school.includes("secondary") || school.includes("hs")) {
            return ["Secondary", "Middle", "Primary", "Foundational"].includes(cat);
        }
        // Middle: Middle + Primary + Foundational
        if (school.includes("middle") || school.includes("ms")) {
            return ["Middle", "Primary", "Foundational"].includes(cat);
        }
        // Primary: Primary + Foundational
        if (school.includes("primary") || school.includes("ps")) {
            return ["Primary", "Foundational"].includes(cat);
        }
        return cat === "Foundational";
    });

    select.innerHTML = '<option value="">Select Subject</option>' + 
        filtered.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

// --- UI RENDERING ---
function renderTeachers() {
    const list = document.getElementById('teacher-list');
    if (list) list.innerHTML = state.teachers.map(t => `
        <div class="glass p-3 rounded-xl mb-2 flex justify-between items-center">
            <span>${t.name} (${t.subject})</span>
            <button onclick="deleteTeacher('${t.id}')" class="text-red-400 font-bold p-2">X</button>
        </div>
    `).join('') || "No staff registered.";
}

function renderSchools() {
    const drop = document.getElementById('hoi-school-select');
    if (drop) drop.innerHTML = '<option value="">Select School</option>' + 
        state.schools.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

async function addTeacher() {
    const name = document.getElementById('t-name').value.trim();
    const sub = document.getElementById('t-subject').value;
    if (name && sub) {
        await db.collection("teachers").add({
            name: name, subject: sub, schoolContext: state.currentUser.name
        });
        document.getElementById('t-name').value = '';
        alert("Teacher Added!");
    }
}

async function deleteTeacher(id) { if(confirm("Delete?")) await db.collection("teachers").doc(id).delete(); }
function logout() { location.reload(); }
