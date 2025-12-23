// 1. Config
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
const auth = firebase.auth();

let currentUser = null;

// 2. Auth Logic
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value;

    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        const doc = await db.collection("users").doc(cred.user.uid).get();
        currentUser = doc.data();

        if (currentUser.role === 'admin') { window.location.href = "admin.html"; return; }
        if (!currentUser.approved) { alert("Awaiting HOI Approval"); auth.signOut(); return; }

        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-dashboard').classList.remove('hidden');
        setupUserDashboard(currentUser);
    } catch (e) { alert(e.message); }
}

async function handleSignup() {
    const role = document.getElementById('reg-role').value;
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value.trim();
    const name = document.getElementById('reg-name').value.trim();

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        let data = { fullName: name, role: role, email: email, approved: false, uid: cred.user.uid, school: document.getElementById('reg-school').value };
        
        if (role === 'student') {
            data.grade = document.getElementById('reg-grade').value;
            data.coins = 0;
        }
        await db.collection("users").doc(cred.user.uid).set(data);
        alert("Registered! Contact HOI for approval.");
        location.reload();
    } catch (e) { alert(e.message); }
}

// 3. Dashboard Logic
function setupUserDashboard(user) {
    document.getElementById('user-name').innerText = user.fullName;
    document.getElementById('user-subtext').innerText = `${user.grade || 'Staff'} | ${user.school}`;
    document.getElementById('user-coins').innerText = user.coins || 0;
    
    const grid = document.getElementById('role-view');
    grid.innerHTML = '';

    let subs = ["English", "Mathematics", "Urdu", "Kashmiri"];
    if (user.role === 'teacher') {
        subs = ["English", "Mathematics", "Urdu", "Kashmiri", "EVS", "Science", "S.St"];
    } else {
        if (user.grade === 'Primary') subs.push("EVS");
        if (user.grade === 'Middle') subs.push("EVS", "Science", "S.St");
    }

    subs.forEach(s => {
        const div = document.createElement('div');
        div.className = "bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-all";
        div.onclick = () => openSubject(s);
        div.innerHTML = `<div class="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-2"><i class="fas fa-book-open"></i></div>
                         <span class="font-bold text-xs text-slate-700">${s}</span>`;
        grid.appendChild(div);
    });
}

// 4. MCQ System
function openSubject(name) {
    const modal = document.getElementById('mcq-modal');
    document.getElementById('modal-title').innerText = name;
    modal.dataset.current = name;
    modal.classList.remove('hidden');

    if (currentUser.role === 'teacher') {
        document.getElementById('uploader-form').classList.remove('hidden');
        document.getElementById('modal-subtitle').innerText = "Question Uploader";
    } else {
        document.getElementById('uploader-form').classList.add('hidden');
        document.getElementById('modal-subtitle').innerText = "Student Assignment";
        // studentQuizLogic(name); // Placeholder for student quiz
    }
}

async function saveQuestion() {
    const data = {
        subject: document.getElementById('mcq-modal').dataset.current,
        question: document.getElementById('q-text').value,
        options: { A: document.getElementById('opt-a').value, B: document.getElementById('opt-b').value, C: document.getElementById('opt-c').value, D: document.getElementById('opt-d').value },
        answer: document.getElementById('correct-opt').value
    };

    if (!data.question || !data.answer) return alert("Fill all fields");

    try {
        await db.collection("questions").add(data);
        alert("Question Saved!");
        document.getElementById('q-text').value = '';
        closeModal();
    } catch (e) { alert(e.message); }
}

function closeModal() { document.getElementById('mcq-modal').classList.add('hidden'); }
function toggleView() { document.getElementById('login-box').classList.toggle('hidden'); document.getElementById('signup-box').classList.toggle('hidden'); }
function updateFormFields() { document.getElementById('student-extra-fields').classList.toggle('hidden', document.getElementById('reg-role').value === 'teacher'); }
function logout() { auth.signOut().then(() => location.reload()); }
