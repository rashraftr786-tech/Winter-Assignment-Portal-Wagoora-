// Global System State
let state = {
    currentUser: null,
    globalSubjects: [
        { name: "English", cat: "Foundational" },
        { name: "Maths", cat: "Foundational" }
    ],
    teachers: [], // Created by HOI
    quizzes: []   // Created by Teachers
};

function handleLogin() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('user-field').value;
    const pass = document.getElementById('pass-field').value;

    // Super Admin Default: admin / super123
    if (role === 'superadmin' && user === 'admin' && pass === 'super123') {
        initPortal('superadmin', 'System Master');
    } else if (role === 'hoi') {
        initPortal('hoi', user);
    } else if (role === 'teacher') {
        initPortal('teacher', user);
    } else {
        initPortal('student', user);
    }
}

function initPortal(role, name) {
    state.currentUser = { role, name };
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-dashboard').style.display = 'grid';
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('display-role').innerText = role;
    
    showPanel(role);
}

function showPanel(id) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
    const activePanel = document.getElementById('panel-' + id);
    if(activePanel) activePanel.classList.add('active');
}

// HOI Logic: Register Teacher
function registerTeacher() {
    const user = document.getElementById('t-user').value;
    const sub = document.getElementById('t-subject-select').value;
    if(user) {
        state.teachers.push({ username: user, subject: sub, password: 'staff@wagoora' });
        alert(`Teacher ${user} registered for ${sub}. Default pass: staff@wagoora`);
    }
}

// Teacher Logic: Upload Quiz
function uploadQuiz() {
    const question = document.getElementById('q-text').value;
    const options = [
        document.getElementById('opt-0').value,
        document.getElementById('opt-1').value,
        document.getElementById('opt-2').value,
        document.getElementById('opt-3').value
    ];
    const correct = document.getElementById('correct-opt').value;

    state.quizzes.push({ question, options, correct: parseInt(correct) });
    alert("Quiz Published to your class!");
}

function logout() { location.reload(); }

