const firebaseConfig = { /* Your Config Here */ };
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUserData = null;

// --- AUTH LOGIC ---
function toggleAuth() {
    document.getElementById('login-form').classList.toggle('hidden');
    document.getElementById('signup-form').classList.toggle('hidden');
}

async function handleSignup() {
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    const profile = {
        fullName: document.getElementById('reg-name').value,
        role: document.getElementById('reg-role').value,
        school: document.getElementById('reg-school').value,
        grade: document.getElementById('reg-class').value,
        coins: 0,
        approved: false // Admin must approve
    };

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection("users").doc(cred.user.uid).set(profile);
        alert("Registration Request Sent! Wait for Admin Approval.");
        auth.signOut();
        location.reload();
    } catch (e) { alert(e.message); }
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-pass').value;
    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        const doc = await db.collection("users").doc(cred.user.uid).get();
        currentUserData = doc.data();

        if (!currentUserData.approved) {
            alert("Your account is pending Admin approval.");
            auth.signOut();
            return;
        }
        loadDashboard();
    } catch (e) { alert("Login Failed: " + e.message); }
}

// --- DASHBOARD LOGIC ---
function loadDashboard() {
    document.getElementById('auth-screen').classList.add('hidden');
    document.getElementById('app-dashboard').classList.remove('hidden');
    
    document.getElementById('user-name').innerText = currentUserData.fullName;
    document.getElementById('user-subtext').innerText = `${currentUserData.grade} | ${currentUserData.school}`;
    document.getElementById('pfp').innerText = currentUserData.fullName[0];
    
    updateDisplayStats();
    renderRoleUI();
}

function updateDisplayStats() {
    const coins = currentUserData.coins || 0;
    document.getElementById('coin-count').innerText = `🪙 ${coins} Coins`;
    
    let trophy = "No Trophy";
    if (coins >= 7500) trophy = "🥇 Gold Trophy";
    else if (coins >= 5000) trophy = "🥈 Silver Trophy";
    else if (coins >= 2500) trophy = "🥉 Bronze Trophy";
    document.getElementById('trophy-display').innerText = trophy;
}

// --- SUBJECT & ROLE ENGINE ---
function renderRoleUI() {
    const grid = document.getElementById('role-view');
    grid.innerHTML = ''; 

    if (currentUserData.role === 'student') {
        const subjects = getSubjectsForGrade(currentUserData.grade);
        subjects.forEach(sub => {
            grid.innerHTML += `
                <div class="app-card" onclick="startQuiz('${sub}')">
                    <div class="icon-box bg-blue-100 text-blue-600"><i class="fas fa-book-open"></i></div>
                    <span class="text-xs font-bold text-slate-700">${sub}</span>
                </div>`;
        });
    } else if (currentUserData.role === 'teacher') {
        grid.innerHTML = `<div class="app-card col-span-2" onclick="showPostQuiz()">
            <div class="icon-box bg-purple-100 text-purple-600"><i class="fas fa-plus"></i></div>
            <span class="font-bold">Post New MCQ</span>
        </div>`;
    }
}

function getSubjectsForGrade(grade) {
    if (grade === 'Foundational') return ["English", "Mathematics", "Urdu", "Kashmiri"];
    if (grade === 'Primary') return ["English", "Mathematics", "Urdu", "Kashmiri", "EVS"];
    if (grade === 'Middle') return ["English", "Mathematics", "Urdu", "Kashmiri", "Science", "Social Studies"];
    return [];
}

// --- COIN SYSTEM LOGIC ---
let attempts = 0;
async function submitAnswer(isCorrect) {
    attempts++;
    if (isCorrect) {
        let earned = (attempts === 1) ? 5 : 2;
        currentUserData.coins += earned;
        await db.collection("users").doc(auth.currentUser.uid).update({ coins: currentUserData.coins });
        alert(`Correct! Earned ${earned} coins.`);
        attempts = 0;
        updateDisplayStats();
    } else {
        if (attempts >= 3) {
            alert("Failed. Check correct response.");
            attempts = 0;
        } else {
            alert("Wrong attempt. Try again for 2 coins.");
        }
    }
}

function logout() { auth.signOut(); location.reload(); }

