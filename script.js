/**
 * WAGOORA V3.0 - CORE LOGIC
 * Features: Role-based Security, 5-Tier School System, 3-Attempt Logic
 */

// 1. GLOBAL STATE (The "Database")
let state = {
    currentUser: null,
    // Global Subject Catalog (As defined by Super Admin)
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
    teachers: [], // Created by HOI
    quizzes: [],   // Created by Teachers
    studentProgress: {
        coins: parseInt(localStorage.getItem('wagoora_coins')) || 0,
        currentQuizIndex: 0,
        attempts: 0
    }
};

// 2. AUTHENTICATION & SECURITY
function handleLogin() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('user-field').value.trim();
    const pass = document.getElementById('pass-field').value.trim();

    if (!user || !pass) return alert("Please fill all fields");

    // Clear any previous session UI
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));

    // ROLE-BASED ACCESS CONTROL (RBAC)
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
        // Simple entry for students - in production, link to school database
        initPortal('student', user, "General Science"); // Default subject for demo
    }
}

function initPortal(role, name, subject = null) {
    state.currentUser = { role, name, subject };
    
    // UI Setup
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('hidden');
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('display-role').innerText = role;
    
    // Activate specific panel
    const panel = document.getElementById('panel-' + role);
    if (panel) panel.classList.remove('hidden');

    // Contextual Loads
    if (role === 'teacher') {
        document.getElementById('active-subject-display').innerText = subject;
    }
    if (role === 'hoi') {
        populateHOISubjects();
    }
    if (role === 'student') {
        updateCoinDisplay();
        loadStudentQuiz();
    }
}

// 3. HOI & SUPER ADMIN FUNCTIONS
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
        alert(`Teacher ${user} registered successfully for ${sub}`);
        document.getElementById('t-user').value = '';
    }
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

// 4. TEACHER & QUIZ CREATION
function uploadQuiz() {
    const question = document.getElementById('q-text').value;
    const options = [
        document.getElementById('opt-0').value,
        document.getElementById('opt-1').value,
        document.getElementById('opt-2').value,
        document.getElementById('opt-3').value
    ];
    const correct = document.getElementById('correct-opt').value;

    if (!question || options.some(o => !o)) return alert("Fill all quiz fields");

    state.quizzes.push({
        question,
        options,
        correct: parseInt(correct),
        subject: state.currentUser.subject
    });

    alert("Quiz Published Successfully!");
    document.getElementById('q-text').value = '';
}

// 5. STUDENT ENGINE (3-ATTEMPT LOGIC)
function loadStudentQuiz() {
    const quizArea = document.getElementById('quiz-area');
    const filteredQuizzes = state.quizzes.filter(q => q.subject === state.currentUser.subject);

    if (filteredQuizzes.length === 0) {
        quizArea.innerHTML = `<p class="text-center opacity-40 py-10">No quizzes available for ${state.currentUser.subject}.</p>`;
        return;
    }

    if (state.studentProgress.currentQuizIndex >= filteredQuizzes.length) {
        quizArea.innerHTML = `<div class="text-center py-10">
            <h2 class="text-2xl font-bold text-green-400">Assignment Complete!</h2>
            <p>You've answered all available questions.</p>
        </div>`;
        return;
    }

    const q = filteredQuizzes[state.studentProgress.currentQuizIndex];
    
    quizArea.innerHTML = `
        <div class="animate-fadeIn">
            <div class="flex justify-between mb-4">
                <span class="text-xs text-indigo-400 font-bold uppercase">Attempt ${state.studentProgress.attempts + 1}/3</span>
            </div>
            <p class="text-lg mb-6">${q.question}</p>
            <div class="grid grid-cols-1 gap-3">
                ${q.options.map((opt, i) => `
                    <button onclick="submitAnswer(${i})" class="quiz-option-btn glass hover:bg-white/10 transition text-left p-4 rounded-xl border border-white/5">
                        <span class="font-bold text-indigo-400 mr-2">${String.fromCharCode(65+i)}</span> ${opt}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function submitAnswer(idx) {
    const filteredQuizzes = state.quizzes.filter(q => q.subject === state.currentUser.subject);
    const correct = filteredQuizzes[state.studentProgress.currentQuizIndex].correct;

    if (idx === correct) {
        let gain = (state.studentProgress.attempts === 0) ? 5 : 2;
        state.studentProgress.coins += gain;
        alert(`CORRECT! You earned ${gain} coins.`);
        saveAndNext();
    } else {
        state.studentProgress.attempts++;
        if (state.studentProgress.attempts >= 3) {
            alert("Maximum attempts used. Skipping to next question.");
            saveAndNext();
        } else {
            alert(`Wrong! Attempts used: ${state.studentProgress.attempts}/3. Try again!`);
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
    if(confirm("Are you sure you want to logout?")) location.reload();
}

