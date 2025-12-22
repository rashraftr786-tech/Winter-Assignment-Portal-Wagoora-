/**
 * WAGOORA V3.0 - SECURE FULL CORE
 * Optimized for Android/Mobile
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

// --- SECURE AUTHENTICATION SYSTEM ---
async function handleLogin() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('user-field').value.trim();
    const pass = document.getElementById('pass-field').value.trim();

    if (!user || !pass) return alert("Please fill all fields");

    try {
        // 1. SuperAdmin remains hardcoded for safety
        if (role === 'superadmin') {
            if (user === 'admin' && pass === 'super123') {
                showPortal('superadmin', 'System Master', 'All Systems');
            } else { alert("Invalid Admin Password"); }
            return;
        }

        // 2. Map roles to their specific collections
        const colMap = { 'hoi': 'hois', 'teacher': 'teachers', 'student': 'students' };
        const snap = await db.collection(colMap[role]).where("username", "==", user).get();

        if (!snap.empty) {
            const data = snap.docs[0].data();
            // Default password is '12345' if not set in DB
            if (pass === (data.password || "12345")) {
                const schoolName = data.schoolName || data.schoolContext || "General";
                showPortal(role, user, schoolName);
            } else { alert("Incorrect Password"); }
        } else { 
            alert("No registered " + role + " found with that username"); 
        }
    } catch (e) { alert("Auth Error: " + e.message); }
}

function showPortal(role, displayName, schoolName) {
    state.currentUser = { role: role, name: displayName, school: schoolName };

    // FORCE DISPLAY FIX FOR ANDROID
    document.getElementById('login-screen').style.setProperty("display", "none", "important");
    document.getElementById('main-dashboard').style.setProperty("display", "block", "important");
    document.getElementById('nav-info').style.setProperty("display", "flex", "important");
    document.getElementById('display-role').innerText = role.toUpperCase() + " | " + schoolName;

    document.querySelectorAll('.panel').forEach(p => p.style.display = 'none');
    const target = document.getElementById('panel-' + role);
    if (target) {
        target.classList.remove('hidden');
        target.style.setProperty("display", "block", "important");
    }

    if (role === 'student' && document.getElementById('student-school-display')) {
        document.getElementById('student-school-display').innerText = schoolName;
    }

    startCloudListeners();
}

// --- CLOUD ENGINE & LISTENERS ---
function startCloudListeners() {
    // Sync Schools for Registry
    db.collection("schools").onSnapshot(s => {
        state.schools = s.docs.map(d => d.data());
        renderSchools();
    });

    // Sync Subjects for Dropdowns
    db.collection("subjects").onSnapshot(s => {
        state.cloudSubjects = s.docs.map(d => d.data());
        state.globalSubjects = [...state.localSubjects, ...state.cloudSubjects];
        renderSubjectDropdown();
    });

    // Teacher Management for HOI
    if (state.currentUser.role === 'hoi') {
        db.collection("teachers")
            .where("schoolContext", "==", state.currentUser.school)
            .onSnapshot(s => {
                state.teachers = s.docs.map(d => ({id: d.id, ...d.data()}));
                renderTeachers();
            });
    }

    // Quiz Feed for Students
    if (state.currentUser.role === 'student') {
        db.collection("quizzes")
            .where("school", "==", state.currentUser.school)
            .onSnapshot(s => {
                renderStudentQuizzes(s.docs.map(d => ({id: d.id, ...d.data()})));
            });
    }
}

// --- TEACHER QUIZ LOGIC ---
async function postQuiz() {
    const title = document.getElementById('quiz-title').value;
    const question = document.getElementById('quiz-question').value;
    const opts = {
        A: document.getElementById('opt-a').value,
        B: document.getElementById('opt-b').value,
        C: document.getElementById('opt-c').value,
        D: document.getElementById('opt-d').value
    };
    const correct = document.getElementById('quiz-correct').value;

    if (!title || !question || !opts.A) return alert("Please fill all fields");

    try {
        await db.collection("quizzes").add({
            title, question, options: opts, correct,
            teacher: state.currentUser.name,
            school: state.currentUser.school,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        alert("Quiz Posted Successfully!");
        document.getElementById('quiz-title').value = '';
        document.getElementById('quiz-question').value = '';
    } catch (e) { alert("Error: " + e.message); }
}

// --- UI RENDERING FUNCTIONS ---
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

function renderStudentQuizzes(quizzes) {
    const feed = document.getElementById('quiz-feed');
    if (!feed) return;
    feed.innerHTML = quizzes.map(q => `
        <div class="glass p-5 rounded-2xl border border-white/10 mb-4">
            <p class="text-[10px] text-indigo-400 font-bold uppercase mb-1">${q.teacher}</p>
            <h4 class="font-bold mb-2">${q.title}</h4>
            <p class="text-sm mb-4">${q.question}</p>
            <div class="grid grid-cols-1 gap-2">
                <button onclick="alert('Option A selected')" class="bg-white/5 p-3 rounded-xl text-left text-xs">${q.options.A}</button>
                <button onclick="alert('Option B selected')" class="bg-white/5 p-3 rounded-xl text-left text-xs">${q.options.B}</button>
            </div>
        </div>
    `).join('') || '<p class="text-center py-10 opacity-30 text-sm">No quizzes available.</p>';
}

function renderTeachers() {
    const list = document.getElementById('teacher-list');
    if (list) list.innerHTML = state.teachers.map(t => `
        <div class="glass p-3 rounded-xl mb-2 flex justify-between items-center">
            <span>${t.username} (${t.subject})</span>
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
    const user = document.getElementById('t-name').value.trim(); // Using as Username
    const sub = document.getElementById('t-subject').value;
    if (user && sub) {
        await db.collection("teachers").add({
            username: user, password: "12345", subject: sub, schoolContext: state.currentUser.school
        });
        document.getElementById('t-name').value = '';
        alert("Teacher Added! Password is: 12345");
    }
}

async function deleteTeacher(id) { if(confirm("Delete?")) await db.collection("teachers").doc(id).delete(); }
function logout() { location.reload(); }
