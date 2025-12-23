// 1. FIREBASE CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyBcRfUj9N_9LaVuEuIT7d0ueJ88heyP9hI",
    authDomain: "wagoora-edu-portal.firebaseapp.com",
    projectId: "wagoora-edu-portal",
    storageBucket: "wagoora-edu-portal.firebasestorage.app",
    messagingSenderId: "476444772096",
    appId: "1:476444772096:web:6fd360cc0a774f94a1d5e5"
};

// Initialize Firebase safely
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
        console.log("Firebase Initialized");
    }
} catch (e) {
    console.error("Firebase Init Error:", e);
}

const db = firebase.firestore();
const auth = firebase.auth();
let currentUser = null;

// 2. AUTHENTICATION (Fixed Sign In)
async function handleLogin() {
    console.log("Login button clicked");
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value;

    if(!email || !pass) {
        alert("Please enter both email and password.");
        return;
    }

    try {
        // Authenticate user
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        console.log("Auth Success:", cred.user.uid);

        // Fetch profile
        const doc = await db.collection("users").doc(cred.user.uid).get();
        
        if (!doc.exists) {
            alert("No user profile found in database.");
            return;
        }

        currentUser = doc.data();

        // Admin Check
        if (currentUser.role === 'admin') {
            window.location.href = "admin.html";
            return;
        }

        // Approval Check
        if (!currentUser.approved) {
            alert("Access Denied: Your account is awaiting HOI approval.");
            auth.signOut();
            return;
        }

        // UI Switch
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-dashboard').classList.remove('hidden');
        
        setupUserDashboard(currentUser);

    } catch (e) {
        console.error("Login Error:", e.code);
        alert("Login Error: " + e.message);
    }
}

// 3. SIGNUP LOGIC
async function handleSignup() {
    const role = document.getElementById('reg-role').value;
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value.trim();
    const name = document.getElementById('reg-name').value.trim();
    const school = document.getElementById('reg-school').value.trim();
    const grade = document.getElementById('reg-grade').value;

    if(!email || !pass || !name) return alert("All fields are required.");

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        let data = { 
            fullName: name, 
            role: role, 
            email: email, 
            approved: false, 
            uid: cred.user.uid, 
            school: school,
            coins: 0 
        };
        if (role === 'student') data.grade = grade;
        
        await db.collection("users").doc(cred.user.uid).set(data);
        alert("Registration Successful! Please wait for HOI approval.");
        location.reload();
    } catch (e) { alert(e.message); }
}

// 4. DASHBOARD GENERATOR
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

// 5. SUBJECT MODAL LOGIC
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

async function saveQuestion() {
    const target = document.getElementById('target-grade').value;
    const qText = document.getElementById('q-text').value.trim();
    const correct = document.getElementById('correct-opt').value;
    const subject = document.getElementById('mcq-modal').dataset.currentSubject;

    if(!target || !qText || !correct) return alert("Fill all fields");

    try {
        await db.collection("questions").add({
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
        });
        alert("Question Saved!");
        document.getElementById('q-text').value = '';
        closeModal();
    } catch (e) { alert(e.message); }
}

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
            qDisplay.innerText = "No questions found for this class yet.";
            return;
        }

        const qData = snapshot.docs[0].data();
        qDisplay.innerText = qData.question;

        ['A', 'B', 'C', 'D'].forEach(letter => {
            if (qData.options[letter]) {
                const btn = document.createElement('button');
                btn.className = "w-full p-4 bg-white border-2 border-slate-100 rounded-2xl text-left font-bold text-slate-600 mb-2";
                btn.innerHTML = `<span>${letter}. ${qData.options[letter]}</span>`;
                btn.onclick = () => checkAnswer(letter, qData.answer);
                optGrid.appendChild(btn);
            }
        });
    } catch (e) { qDisplay.innerText = "Error: " + e.message; }
}

async function checkAnswer(selected, correct) {
    if (selected === correct) {
        alert("🎉 Correct! +5 Coins");
        const newCoins = (currentUser.coins || 0) + 5;
        await db.collection("users").doc(auth.currentUser.uid).update({ coins: newCoins });
        currentUser.coins = newCoins;
        document.getElementById('user-coins').innerText = newCoins;
        closeModal();
    } else {
        alert("❌ Incorrect. Try again!");
    }
}

function closeModal() { document.getElementById('mcq-modal').classList.add('hidden'); }
function toggleView() { 
    document.getElementById('login-box').classList.toggle('hidden'); 
    document.getElementById('signup-box').classList.toggle('hidden'); 
}
function updateFormFields() { 
    document.getElementById('student-extra-fields').classList.toggle('hidden', document.getElementById('reg-role').value === 'teacher'); 
}
function logout() { auth.signOut().then(() => location.reload()); }
