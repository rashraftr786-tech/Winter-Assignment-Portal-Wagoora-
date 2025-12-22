/** WAGOORA v3.0 CORE */
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
        { name: "Urdu", cat: "Foundational" }
    ],
    cloudSubjects: [], globalSubjects: [], schools: [], teachers: []
};

async function handleLogin() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('user-field').value.trim();
    const pass = document.getElementById('pass-field').value.trim();

    if (!user || !pass) return alert("Fill all fields");

    if (role === 'superadmin' && user === 'admin' && pass === 'super123') {
        return showPortal('superadmin', 'System Master', 'All Systems');
    }

    const colMap = { 'hoi': 'hois', 'teacher': 'teachers', 'student': 'students' };
    const snap = await db.collection(colMap[role]).where("username", "==", user).get();

    if (!snap.empty) {
        const data = snap.docs[0].data();
        if (pass === (data.password || "12345")) {
            showPortal(role, user, data.schoolName || data.schoolContext || "General");
        } else { alert("Wrong Password"); }
    } else { alert("User Not Found"); }
}

function showPortal(role, displayName, schoolName) {
    state.currentUser = { role, name: displayName, school: schoolName };
    document.getElementById('login-screen').style.setProperty("display", "none", "important");
    document.getElementById('main-dashboard').style.setProperty("display", "block", "important");
    document.getElementById('nav-info').style.setProperty("display", "flex", "important");
    document.getElementById('display-role').innerText = role + " | " + schoolName;

    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    const activePanel = document.getElementById('panel-' + role);
    activePanel.classList.remove('hidden');

    if (role === 'student') document.getElementById('student-school-display').innerText = schoolName;
    startCloudListeners();
}

function startCloudListeners() {
    db.collection("schools").onSnapshot(s => {
        state.schools = s.docs.map(d => d.data());
        const drop = document.getElementById('hoi-school-select');
        if (drop) drop.innerHTML = '<option value="">Select School</option>' + 
            state.schools.map(sc => `<option value="${sc.name}">${sc.name}</option>`).join('');
    });

    db.collection("subjects").onSnapshot(s => {
        state.cloudSubjects = s.docs.map(d => d.data());
        state.globalSubjects = [...state.localSubjects, ...state.cloudSubjects];
        renderSubjectDropdown();
    });

    if (state.currentUser.role === 'hoi') {
        db.collection("teachers").where("schoolContext", "==", state.currentUser.school).onSnapshot(s => {
            state.teachers = s.docs.map(d => ({id: d.id, ...d.data()}));
            document.getElementById('teacher-list').innerHTML = state.teachers.map(t => `
                <div class="glass p-4 flex justify-between items-center mb-2">
                    <span>${t.username} (${t.subject})</span>
                    <button onclick="deleteTeacher('${t.id}')" class="bg-red-500/20 text-red-400 p-2 rounded-lg">X</button>
                </div>`).join('');
        });
    }

    if (state.currentUser.role === 'student') {
        db.collection("quizzes").where("school", "==", state.currentUser.school).onSnapshot(s => {
            document.getElementById('quiz-feed').innerHTML = s.docs.map(d => {
                const q = d.data();
                return `<div class="glass p-6">
                    <p class="text-[10px] text-indigo-400 font-bold mb-1">${q.teacher}</p>
                    <h4 class="font-bold mb-2">${q.title}</h4>
                    <p class="text-sm opacity-80 mb-4">${q.question}</p>
                    <div class="grid grid-cols-2 gap-2">
                        <button class="bg-white/5 p-3 rounded-xl text-left text-xs">${q.options.A}</button>
                        <button class="bg-white/5 p-3 rounded-xl text-left text-xs">${q.options.B}</button>
                    </div>
                </div>`;
            }).join('') || "No active quizzes.";
        });
    }
}

async function registerNewSchool() {
    const name = document.getElementById('school-name').value.trim();
    const loc = document.getElementById('school-location').value.trim();
    if (name && loc) {
        await db.collection("schools").add({name, location: loc});
        alert("School Registered!");
        document.getElementById('school-name').value = '';
        document.getElementById('school-location').value = '';
    }
}

async function appointHOI() {
    const username = document.getElementById('hoi-username').value.trim();
    const schoolName = document.getElementById('hoi-school-select').value;
    if (username && schoolName) {
        await db.collection("hois").add({username, schoolName, password: "welcome@123"});
        alert("HOI Appointed!");
    }
}

async function postQuiz() {
    const title = document.getElementById('quiz-title').value;
    const question = document.getElementById('quiz-question').value;
    const options = { A: document.getElementById('opt-a').value, B: document.getElementById('opt-b').value, C: document.getElementById('opt-c').value, D: document.getElementById('opt-d').value };
    if (title && question && options.A) {
        await db.collection("quizzes").add({ title, question, options, teacher: state.currentUser.name, school: state.currentUser.school });
        alert("Quiz Posted!");
    }
}

function renderSubjectDropdown() {
    const sel = document.getElementById('t-subject');
    if (sel) sel.innerHTML = '<option value="">Select Subject</option>' + 
        state.globalSubjects.map(s => `<option value="${s.name}">${s.name}</option>`).join('');
}

async function addTeacher() {
    const username = document.getElementById('t-name').value.trim();
    const subject = document.getElementById('t-subject').value;
    if (username && subject) {
        await db.collection("teachers").add({username, subject, password: "12345", schoolContext: state.currentUser.school});
        alert("Teacher Added!");
    }
}

async function addGlobalSubject() {
    const name = document.getElementById('sub-name').value.trim();
    const cat = document.getElementById('sub-cat').value;
    if (name) { await db.collection("subjects").add({name, cat}); alert("Subject Added!"); }
}

async function deleteTeacher(id) { if(confirm("Remove?")) await db.collection("teachers").doc(id).delete(); }
function logout() { location.reload(); }
