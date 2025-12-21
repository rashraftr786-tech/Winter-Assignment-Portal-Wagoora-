let state = {
    currentUser: null,
    // Pre-defined global subjects per Super Admin requirements
    globalSubjects: [
        { name: "English", cat: "Foundational" },
        { name: "Maths", cat: "Foundational" },
        { name: "EVS", cat: "Primary" },
        { name: "Science", cat: "Middle" }
    ],
    // Database simulations
    schools: [],
    teachers: [], // Objects: { username, password, subject, schoolName }
    quizzes: []   // Objects: { question, options, correct, subject, creator }
};

function handleLogin() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('user-field').value;
    const pass = document.getElementById('pass-field').value;

    // --- SECURITY LAYER: Role-Specific Verification ---
    if (role === 'superadmin') {
        if (user === 'admin' && pass === 'super123') {
            initPortal('superadmin', 'System Master');
        } else { alert("Invalid Super Admin Credentials"); }
        return;
    }

    if (role === 'hoi') {
        // In a real app, check against state.schools
        if (pass === 'welcome@123') {
            initPortal('hoi', user);
        } else { alert("Invalid HOI Password"); }
        return;
    }

    if (role === 'teacher') {
        const foundTeacher = state.teachers.find(t => t.username === user && t.password === pass);
        if (foundTeacher) {
            initPortal('teacher', user, foundTeacher.subject);
        } else { alert("Teacher not found or incorrect password"); }
        return;
    }

    if (role === 'student') {
        initPortal('student', user);
        return;
    }
}

function initPortal(role, name, subject = null) {
    state.currentUser = { role, name, subject };
    
    // UI Transitions
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('hidden');
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('display-role').innerText = role;
    
    // --- SECURITY LAYER: Only show the panel matching the role ---
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('panel-' + role).classList.remove('hidden');

    if (role === 'teacher') {
        document.getElementById('active-subject-display').innerText = subject;
    }
    
    if (role === 'hoi') {
        populateHOISubjectDropdown();
    }
}

function populateHOISubjectDropdown() {
    const select = document.getElementById('t-subject-select');
    select.innerHTML = state.globalSubjects.map(s => `<option value="${s.name}">${s.name} (${s.cat})</option>`).join('');
}

function registerTeacher() {
    const user = document.getElementById('t-user').value;
    const sub = document.getElementById('t-subject-select').value;
    if (user) {
        state.teachers.push({ 
            username: user, 
            password: 'staff@wagoora', 
            subject: sub 
        });
        alert(`Teacher ${user} added for ${sub}`);
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

    state.quizzes.push({
        question,
        options,
        correct: parseInt(correct),
        subject: state.currentUser.subject, // Automatically linked to teacher's subject
        creator: state.currentUser.name
    });

    alert(`Quiz for ${state.currentUser.subject} Published!`);
    // Clear form
    document.getElementById('q-text').value = "";
}

function logout() { location.reload(); }
