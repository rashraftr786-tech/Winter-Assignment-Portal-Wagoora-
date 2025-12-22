const firebaseConfig = {
    apiKey: "AIzaSyBcRfUj9N_9LaVuEuIT7d0ueJ88heyP9hI",
    authDomain: "wagoora-edu-portal.firebaseapp.com",
    projectId: "wagoora-edu-portal",
    storageBucket: "wagoora-edu-portal.firebasestorage.app",
    messagingSenderId: "476444772096",
    appId: "1:476444772096:web:6fd360cc0a774f94a1d5e5"
};

// Initialize
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();
const auth = firebase.auth();

let userProfile = null;

// AUTHORIZE FUNCTION
async function handleLogin() {
    console.log("Authorize clicked");
    const email = document.getElementById('email-field').value.trim();
    const pass = document.getElementById('pass-field').value.trim();
    const role = document.getElementById('role-select').value;

    if (!email || !pass) {
        alert("Please enter both Email and Password.");
        return;
    }

    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        const doc = await db.collection("users").doc(cred.user.uid).get();

        if (doc.exists) {
            userProfile = doc.data();
            if (userProfile.role !== role) {
                await auth.signOut();
                alert("Unauthorized: This account is not registered as a " + role);
                return;
            }
            showDashboard();
        } else {
            alert("Profile not found in database.");
        }
    } catch (e) {
        alert("Authorization Failed: " + e.message);
    }
}

function showDashboard() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('main-dashboard').classList.remove('hidden');
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('nav-info').style.display = 'flex';

    document.getElementById('display-name').innerText = userProfile.fullName;
    document.getElementById('display-role').innerText = userProfile.role.toUpperCase() + " | " + userProfile.school;

    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    document.getElementById('panel-' + userProfile.role).classList.remove('hidden');

    if (userProfile.role === 'student') loadQuizzes();
}

async function createNewSecureUser() {
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const pass = document.getElementById('reg-pass').value;
    const role = document.getElementById('reg-role').value;
    const school = document.getElementById('reg-school').value;
    const className = document.getElementById('reg-class').value;

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        await db.collection("users").doc(cred.user.uid).set({
            fullName: name,
            email: email,
            role: role,
            school: school,
            className: className,
            uid: cred.user.uid
        });
        alert("Account Successfully Created for " + name);
    } catch (e) { alert("Error: " + e.message); }
}

async function postQuiz() {
    const title = document.getElementById('quiz-title').value;
    const question = document.getElementById('quiz-question').value;
    if (!title || !question) return alert("Fill all fields");

    await db.collection("quizzes").add({
        title, question,
        school: userProfile.school,
        author: userProfile.fullName,
        date: new Date().toLocaleDateString()
    });
    alert("Assignment Published!");
}

function loadQuizzes() {
    db.collection("quizzes").where("school", "==", userProfile.school).onSnapshot(s => {
        document.getElementById('quiz-feed').innerHTML = s.docs.map(d => `
            <div class="glass p-6">
                <p class="text-[10px] text-indigo-400 font-bold">${d.data().author} | ${d.data().date}</p>
                <h4 class="font-bold text-lg text-white mt-1">${d.data().title}</h4>
                <p class="text-sm text-slate-300 mt-3 leading-relaxed">${d.data().question}</p>
            </div>
        `).join('') || "<p class='text-center opacity-50'>No assignments found.</p>";
    });
}

function logout() { auth.signOut().then(() => location.reload()); }
