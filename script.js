/**
 * WAGOORA V3.0 - COMPREHENSIVE SECURE CORE
 * Optimized for Android / Chrome Mobile
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

// Initialize Firebase
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();

// 2. GLOBAL STATE
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

// --- AUTHENTICATION SYSTEM ---
async function handleLogin() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('user-field').value.trim();
    const pass = document.getElementById('pass-field').value.trim();

    if (!user || !pass) return alert("Please fill all fields");

    try {
        if (role === 'superadmin') {
            if (user === 'admin' && pass === 'super123') {
                showPortal('superadmin', 'System Master', 'All Systems');
            } else { alert("Invalid Admin Password"); }
            return;
        }

        const colMap = { 'hoi': 'hois', 'teacher': 'teachers', 'student': 'students' };
        const snap = await db.collection(colMap[role]).where("username", "==", user).get();

        if (!snap.empty) {
            const data = snap.docs[0].data();
            const dbPass = data.password || "12345";
            if (pass === dbPass) {
                const context = data.schoolName || data.schoolContext || "General";
                showPortal(role, user, context);
            } else { alert("Incorrect Password"); }
        } else { alert("User not registered in " + role + " portal"); }
    } catch (e) { alert("Auth Error: " + e.message); }
}

function showPortal(role, displayName, schoolName) {
    state.currentUser = { role: role, name: displayName, school: schoolName };

    // FORCE UI TRANSITION FOR ANDROID
    document.getElementById('login-screen').style.setProperty("display", "none", "important");
    const dash = document.getElementById('main-dashboard');
    dash.classList.remove('hidden');
    dash.style.setProperty("display", "block", "important");
    
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('nav-info').style.setProperty("display", "flex", "important");
    document.getElementById('display-role').innerText = role.toUpperCase() + " | " + schoolName;

    // Show correct panel
    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
    const target = document.getElementById('panel-' + role);
    if (target) {
        target.classList.remove('hidden');
        target.style.setProperty("display", "block", "important");
    }

    if (role === 'student') {
        document.getElementById('student-school-display').innerText = schoolName;
    }

    startCloudListeners();
}

// --- CLOUD LISTENERS ---
function startCloudListeners() {
    db.collection("schools").onSnapshot(s => {
        state.schools = s.docs.map(d => d.data());
        renderSchoolDropdowns();
    });

    db.collection("subjects").onSnapshot(s => {
        state.cloudSubjects = s.docs.map(d => d.data());
        state.globalSubjects = [...state.localSubjects, ...state.cloudSubjects];
        renderSubjectDropdown();
    });

    if (state.currentUser.role === 'hoi') {
        db.collection("teachers")
            .where("schoolContext", "==", state.currentUser.school)
            .onSnapshot(s => {
                state.teachers = s.docs.map(d => ({id: d.id, ...d.data()}));
                renderTeacherList();
            });
    }

    if (state.currentUser.role === 'student') {
        db.collection("quizzes")
            .where("school", "==", state.currentUser.school)
            .onSnapshot(s => {
                renderQuizFeed(s.docs.map(d => ({id: d.id, ...d.data()})));
            });
    }
}

// --- SUPER ADMIN FUNCTIONS ---
async function registerNewSchool() {
    const name = document.getElementById('school-name').value.trim();
    const loc = document.getElementById('school-location').value.trim();
    if (!name || !loc) return alert("Fill all school fields");

    try {
        await db.collection("schools").add({
            name: name, location: loc, createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        document.getElementById('school-name').value = '';
        document.getElementById('school-location').value = '';
        alert("School Added Successfully!");
    } catch (e) { alert("Error: " + e.message); }
}

async function appointHOI() {
    const user = document.getElementById('hoi-username').value.trim();
    const school = document.getElementById('hoi-school-select').value;
    if (!user || !school) return alert("Select school and user");

    await db.collection("hois").add({
        username: user, password: "welcome@123", schoolName: school
    });
    document.getElementById('hoi-username').value = '';
    alert("HOI Appointed!");
}

async function addGlobalSubject() {
    const name = document.getElementById('sub-name').value.trim();
    const cat = document.getElementById('sub-cat').value;
    if (name) {
        await db.collection("subjects").add({ name, cat });
        document.getElementById('sub-name').value = '';
        alert("Subject Added!");
    }
}

// --- HOI & TEACHER FUNCTIONS ---
async function addTeacher() {
    const user = document.getElementById('t-name').value.trim();
    const sub = document.getElementById('t-subject').value;
    if (user && sub) {
        await db.collection("teachers").add({
            username: user, password: "12345", subject: sub, schoolContext: state.currentUser.school
        });
        document.getElementById('t-name').value = '';
        alert("Teacher Registered! Pass: 12345");
    }
}

async function postQuiz() {
    const title = document.getElementById('quiz-title').value.trim();
    const question = document.getElementById('quiz-question').value.trim();
    const opts = {
        A: document.getElementById('opt-a').value, B: document.getElementById('opt-b').value,
        C: document.getElementById('opt-c').value, D: document.getElementById('opt-d').value
    };
    const correct = document.getElementById('quiz-correct').value;

    if (!title || !question || !opts.A) return alert("Fill all quiz fields");

    await db.collection("quizzes").add({
        title, question, options: opts, correct,
        teacher: state.currentUser.name,
        school: state.currentUser.school,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    alert("Quiz Published!");
    document.getElementById('quiz-title').value = '';
    document.getElementById('quiz-question').value = '';
}

// --- UI RENDERING ---
function renderSubjectDropdown() {
    const select = document.getElementById('t-subject');
    if (!select || !state.currentUser) return;
    const school = state.currentUser.school.toLowerCase();
    
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

function renderSchoolDropdowns() {
    const drop = document.getElementById('hoi-school-select');
    if (drop) drop.innerHTML = '<option value="">Select School</option>' + 
        state.schools.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

function renderTeacherList() {
    const list = document.getElementById('teacher-list');
    if (list) list.innerHTML = state.teachers.map(t => `
        <div class="glass p-3 rounded-xl mb-2 flex justify-between items-center">
            <span>${t.username} (${t.subject})</span>
            <button onclick="deleteTeacher('${t.id}')" class="text-red-400 font-bold p-2">X</button>
        </div>
    `).join('') || "No staff registered.";
}

function renderQuizFeed(quizzes) {
    const feed = document.getElementById('quiz-feed');
    if (feed) feed.innerHTML = quizzes.map(q => `
        <div class="glass p-5 rounded-2xl border border-white/10 mb-4">
            <p class="text-[10px] text-indigo-400 font-bold uppercase mb-1">${q.teacher}</p>
            <h4 class="font-bold mb-2">${q.title}</h4>
            <p class="text-sm mb-4">${q.question}</p>
            <div class="grid grid-cols-2 gap-2">
                <button onclick="alert('Option selected')" class="bg-white/5 p-2 rounded-lg text-xs">${q.options.A}</button>
                <button onclick="alert('Option selected')" class="bg-white/5 p-2 rounded-lg text-xs">${q.options.B}</button>
            </div>
        </div>
    `).join('') || "No quizzes for your school.";
}

async function deleteTeacher(id) { if(confirm("Remove?")) await db.collection("teachers").doc(id).delete(); }
function logout() { location.reload(); }

