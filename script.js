// 1. FIREBASE CONFIG
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

// 2. AUTHENTICATION
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value;
    if(!email || !pass) return alert("Enter credentials");

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
        let data = { 
            fullName: name, 
            role: role, 
            email: email, 
            approved: false, 
            uid: cred.user.uid, 
            school: document.getElementById('reg-school').value,
            coins: 0 
        };
        if (role === 'student') { data.grade = document.getElementById('reg-grade').value; }
        
        await db.collection("users").doc(cred.user.uid).set(data);
        alert("Registration Successful! Please contact HOI.");
        location.reload();
    } catch (e) { alert(e.message); }
}

// 3. DASHBOARD GENERATOR
function setupUserDashboard(user) {
    document.getElementById('user-name').innerText = user.fullName;
    document.getElementById('user-subtext').innerText = `Class: ${user.grade || 'Staff'} | ${user.school}`;
    document.getElementById('user-coins').innerText = user.coins || 0;
    
    const grid = document.getElementById('role-view');
    grid.innerHTML = '';
    
    let subs = ["English", "Mathematics", "Urdu", "Kashmiri"];
    if (user.role === 'teacher') {
        subs = ["English", "Mathematics", "Urdu", "Kashmiri", "EVS", "Science", "S.St"];
    } else {
        const cls = user.grade;
        if (["3rd", "4th", "5th"].includes(cls)) subs.push("EVS");
        if (["6th", "7th", "8th"].includes(cls)) subs.push("EVS", "Science", "S.St");
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

// 4. SUBJECT MODAL LOGIC
function openSubject(name) {
    const modal = document.getElementById('mcq-modal');
    document.getElementById('modal-title').innerText = name;
    modal.dataset.currentSubject = name;
    modal.classList.remove('hidden');

    if (currentUser.role === 'teacher') {
        document.getElementById('uploader-form').classList.remove('hidden');
        document.getElementById('quiz-container').classList.add('hidden');
        document.getElementById('modal-subtitle').innerText = "Question Uploader";
    } else {
        document.getElementById('uploader-form').classList.add('hidden');
        document.getElementById('quiz-container').classList.remove('hidden');
        document.getElementById('modal-subtitle').innerText = "Class Assignment";
        loadQuiz(name, currentUser.grade);
    }
}

// 5. TEACHER: SAVE QUESTION
async function saveQuestion() {
    const target = document.getElementById('target-grade').value;
    const qText = document.getElementById('q-text').value.trim();
    const correct = document.getElementById('correct-opt').value;
    const subject = document.getElementById('mcq-modal').dataset.currentSubject;

    if(!target || !qText || !correct) return alert("Fill all fields");

    const data = {
        subject: subject,
        targetGrade: target,
        question: qText,
        options: {
            A: document.getElementById('opt-a').value,
            B: document.getElementById('opt-b').value,
            C: document.getElementById('opt-c').value,
            D: document.getElementById('opt-d').value
        },
        answer: correct,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await db.collection("questions").add(data);
        alert("Question Saved for Class " + target);
        document.getElementById('q-text').value = '';
        closeModal();
    } catch (e) { alert(e.message); }
}

// 6. STUDENT: LOAD & CHECK QUIZ
async function loadQuiz(subject, grade) {
    const qDisplay = document.getElementById('active-q-text');
    const optGrid = document.getElementById('options-grid');
    optGrid.innerHTML = '';
    qDisplay.innerText = "Finding questions...";

    try {
        const snapshot = await db.collection("questions")
            .where("subject", "==", subject)
            .where("targetGrade", "==", grade)
            .limit(1).get();

        if (snapshot.empty) {
            qDisplay.innerText = "No questions for Class " + grade + " in " + subject + " yet.";
            return;
        }

        const qData = snapshot.docs[0].data();
        qDisplay.innerText = qData.question;

        ['A', 'B', 'C', 'D'].forEach(letter => {
            if (qData.options[letter]) {
                const btn = document.createElement('button');
                btn.className = "quiz-option-btn";
                btn.innerHTML = `<span>${letter}. ${qData.options[letter]}</span><i class="fas fa-chevron-right opacity-20"></i>`;
                btn.onclick = () => checkAnswer(letter, qData.answer);
                optGrid.appendChild(btn);
            }
        });
    } catch (e) { qDisplay.innerText = "Error: " + e.message; }
}

async function checkAnswer(selected, correct) {
    if (selected === correct) {
        alert("🎉 Excellent! Correct Answer (+5 Coins)");
        // Update coins in Firestore
        const newCoins = (currentUser.coins || 0) + 5;
        await db.collection("users").doc(auth.currentUser.uid).update({ coins: newCoins });
        currentUser.coins = newCoins;
        document.getElementById('user-coins').innerText = newCoins;
        closeModal();
    } else {
        alert("❌ Wrong Answer. Please read carefully and try again!");
    }
}

// UI UTILITIES
function closeModal() { document.getElementById('mcq-modal').classList.add('hidden'); }
function toggleView() { document.getElementById('login-box').classList.toggle('hidden'); document.getElementById('signup-box').classList.toggle('hidden'); }
function updateFormFields() { document.getElementById('student-extra-fields').classList.toggle('hidden', document.getElementById('reg-role').value === 'teacher'); }
function logout() { auth.signOut().then(() => location.reload()); }
        alert("Question Saved for Class " + targetGrade + "!");
        document.getElementById('q-text').value = '';
        closeModal();
    } catch (e) { alert(e.message); }
}

function closeModal() { document.getElementById('mcq-modal').classList.add('hidden'); }
function toggleView() { document.getElementById('login-box').classList.toggle('hidden'); document.getElementById('signup-box').classList.toggle('hidden'); }
function updateFormFields() { document.getElementById('student-extra-fields').classList.toggle('hidden', document.getElementById('reg-role').value === 'teacher'); }
function logout() { auth.signOut().then(() => location.reload()); }
