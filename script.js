/**
 * WAGOORA V3.0 - CORE LOGIC
 * Fixes: Active Schools Module, Register Functionality, Sidebar Navigation
 */

let state = {
    currentUser: null,
    globalSubjects: [
        { name: "English", cat: "Foundational" },
        { name: "Maths", cat: "Foundational" },
        { name: "Urdu", cat: "Foundational" },
        { name: "Kashmiri", cat: "Foundational" },
        { name: "EVS", cat: "Primary" },
        { name: "Science", cat: "Middle" },
        { name: "Social Science", cat: "Middle" }
    ],
    schools: [], 
    teachers: [], 
    quizzes: [],   
    studentProgress: {
        coins: parseInt(localStorage.getItem('wagoora_coins')) || 0,
        currentQuizIndex: 0,
        attempts: 0
    }
};

// --- AUTHENTICATION ---
function handleLogin() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('user-field').value.trim();
    const pass = document.getElementById('pass-field').value.trim();

    if (!user || !pass) return alert("Please fill all fields");

    if (role === 'superadmin') {
        if (user === 'admin' && pass === 'super123') {
            initPortal('superadmin', 'System Master');
        } else { alert("Invalid Admin Credentials"); }
    } 
    else if (role === 'hoi') {
        if (pass === 'welcome@123') {
            initPortal('hoi', user);
        } else { alert("Invalid HOI Password"); }
    } 
    else if (role === 'teacher') {
        const teacher = state.teachers.find(t => t.username === user && t.password === pass);
        if (teacher) {
            initPortal('teacher', user, teacher.subject);
        } else { alert("Teacher account not found."); }
    } 
    else if (role === 'student') {
        initPortal('student', user, "English"); 
    }
}

function initPortal(role, name, subject = null) {
    state.currentUser = { role, name, subject };
    
    document.getElementById('login-screen').classList.add('hidden');
    const mainDash = document.getElementById('main-dashboard');
    mainDash.classList.remove('hidden');
    mainDash.style.display = 'grid'; 
    
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('display-role').innerText = role;
    
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    const activePanel = document.getElementById('panel-' + role);
    if (activePanel) activePanel.classList.remove('hidden');

    renderSidebar(role);
    
    // Logic for Super Admin to load both lists immediately
    if (role === 'superadmin') {
        renderSubjectList();
        renderSchoolList();
    }
    
    if (role === 'teacher') document.getElementById('active-subject-display').innerText = subject;
    if (role === 'hoi') populateHOISubjects();
    if (role === 'student') {
        updateCoinDisplay();
        loadStudentQuiz();
    }
}

// --- UI RENDERERS ---
function renderSidebar(role) {
    const sidebar = document.getElementById('sidebar-menu');
    let menuHTML = '';

    if (role === 'superadmin') {
        // Removed the alert and added a scrolling click action
        menuHTML = `
            <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" class="w-full text-left p-4 glass rounded-2xl mb-2 text-indigo-400 font-bold border-l-4 border-indigo-500">
                <i class="fas fa-layer-group mr-2"></i> Subjects
            </button>
            <button onclick="document.getElementById('school-name').scrollIntoView({behavior: 'smooth'})" class="w-full text-left p-4 glass rounded-2xl text-white font-bold hover:bg-white/10 transition">
                <i class="fas fa-school mr-2 text-indigo-400"></i> Schools Registry
            </button>`;
    } else if (role === 'student') {
        menuHTML = `
            <div class="glass p-4 rounded-2xl border-b-4 border-yellow-500/50">
                <p class="text-[10px] uppercase font-bold text-gray-400">Current Session</p>
                <p class="font-bold text-sm">${state.currentUser.subject}</p>
            </div>`;
    }
    sidebar.innerHTML = menuHTML;
}

// --- SCHOOLS MODULE LOGIC ---
function registerNewSchool() {
    const nameInput = document.getElementById('school-name');
    const locInput = document.getElementById('school-location');
    
    const name = nameInput.value.trim();
    const loc = locInput.value.trim();

    if (name && loc) {
        state.schools.push({ name, location: loc, id: Date.now() });
        renderSchoolList(); // Refresh list immediately
        
        // Reset Inputs
        nameInput.value = '';
        locInput.value = '';
        alert(`${name} registered successfully!`);
    } else {
        alert("Please provide both Name and Location.");
    }
}

function renderSchoolList() {
    const list = document.getElementById('school-list');
    if (!list) return;

    if (state.schools.length === 0) {
        list.innerHTML = `<div class="col-span-full py-8 text-center opacity-40">No schools in the network yet.</div>`;
        return;
    }

    list.innerHTML = state.schools.map(s => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5 hover:border-indigo-500/30 transition animate-fadeIn">
            <div>
                <p class="font-bold text-sm text-white">${s.name}</p>
                <p class="text-[10px] text-indigo-300 uppercase tracking-widest">${s.location}</p>
            </div>
            <i class="fas fa-university text-indigo-500/50"></i>
        </div>
    `).join('');
}

// --- SUBJECTS MODULE LOGIC ---
function renderSubjectList() {
    const list = document.getElementById('subject-list');
    if (!list) return;
    list.innerHTML = state.globalSubjects.map(s => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5 hover:border-indigo-500/30 transition">
            <div>
                <p class="font-bold text-sm text-white">${s.name}</p>
                <p class="text-[10px] text-gray-500 uppercase">${s.cat}</p>
            </div>
            <i class="fas fa-check-circle text-indigo-500"></i>
        </div>
    `).join('');
}

function addGlobalSubject() {
    const name = document.getElementById('sub-name').value;
    const cat = document.getElementById('sub-cat').value;
    if (name) {
        state.globalSubjects.push({ name, cat });
        renderSubjectList();
        document.getElementById('sub-name').value = '';
    }
}

// --- HOI & TEACHER LOGIC ---
function populateHOISubjects() {
    const select = document.getElementById('t-subject-select');
    if (select) {
        select.innerHTML = state.globalSubjects.map(s => 
            `<option value="${s.name}">${s.name} (${s.cat})</option>`
        ).join('');
    }
}

function registerTeacher() {
    const user = document.getElementById('t-user').value;
    const sub = document.getElementById('t-subject-select').value;
    if (user) {
        state.teachers.push({ username: user, password: 'staff@wagoora', subject: sub });
        alert(`Teacher ${user} registered for ${sub}. Pass: staff@wagoora`);
        document.getElementById('t-user').value = '';
    }
}

function uploadQuiz() {
    const question = document.getElementById('q-text').value;
    const options = [
        document.getElementById('opt-0').value,
        document.getElementById('opt-1').value,
        document.getElementById('opt-2').value,
        document.getElementById('opt-3').value
    ];
    const correct = document.getElementById('correct-opt').value;

    if (!question || options.some(o => !o)) return alert("Please fill all quiz fields");

    state.quizzes.push({
        question,
        options,
        correct: parseInt(correct),
        subject: state.currentUser.subject
    });

    alert("Assignment successfully published!");
    document.getElementById('q-text').value = '';
}

// --- STUDENT QUIZ ENGINE ---
function loadStudentQuiz() {
    const quizArea = document.getElementById('quiz-area');
    const filteredQuizzes = state.quizzes.filter(q => q.subject === state.currentUser.subject);

    if (filteredQuizzes.length === 0) {
        quizArea.innerHTML = `<p class="text-center opacity-40 py-10">No questions available for ${state.currentUser.subject}.</p>`;
        return;
    }

    if (state.studentProgress.currentQuizIndex >= filteredQuizzes.length) {
        quizArea.innerHTML = `<div class="text-center py-10"><h2 class="text-2xl font-bold text-green-400">All Done!</h2></div>`;
        return;
    }

    const q = filteredQuizzes[state.studentProgress.currentQuizIndex];
    quizArea.innerHTML = `
        <div class="animate-fadeIn">
            <span class="text-[10px] text-indigo-400 font-bold uppercase mb-4 block">Attempt ${state.studentProgress.attempts + 1}/3</span>
            <p class="text-lg mb-6">${q.question}</p>
            <div class="grid grid-cols-1 gap-3">
                ${q.options.map((opt, i) => `
                    <button onclick="submitAnswer(${i})" class="w-full text-left p-4 glass rounded-xl hover:bg-white/10 transition border border-white/5">
                        <span class="font-bold text-indigo-400 mr-2">${String.fromCharCode(65+i)}</span> ${opt}
                    </button>
                `).join('')}
            </div>
        </div>`;
}

function submitAnswer(idx) {
    const filteredQuizzes = state.quizzes.filter(q => q.subject === state.currentUser.subject);
    const correct = filteredQuizzes[state.studentProgress.currentQuizIndex].correct;

    if (idx === correct) {
        let gain = (state.studentProgress.attempts === 0) ? 5 : 2;
        state.studentProgress.coins += gain;
        alert(`Correct! Earned ${gain} coins.`);
        saveAndNext();
    } else {
        state.studentProgress.attempts++;
        if (state.studentProgress.attempts >= 3) {
            alert("Skipping question.");
            saveAndNext();
        } else {
            alert(`Incorrect. ${3 - state.studentProgress.attempts} attempts left.`);
            loadStudentQuiz();
        }
    }
}

function saveAndNext() {
    state.studentProgress.attempts = 0;
    state.studentProgress.currentQuizIndex++;
    localStorage.setItem('wagoora_coins', state.studentProgress.coins);
    updateCoinDisplay();
    loadStudentQuiz();
}

function updateCoinDisplay() {
    const el = document.getElementById('student-coins');
    if (el) el.innerText = state.studentProgress.coins;
}

function logout() {
    if(confirm("Logout from V3.0?")) location.reload();
}
