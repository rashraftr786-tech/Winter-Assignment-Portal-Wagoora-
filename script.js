// 1. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBcRfUj9N_9LaVuEuIT7d0ueJ88heyP9hI",
    authDomain: "wagoora-edu-portal.firebaseapp.com",
    projectId: "wagoora-edu-portal",
    storageBucket: "wagoora-edu-portal.firebasestorage.app",
    messagingSenderId: "476444772096",
    appId: "1:476444772096:web:6fd360cc0a774f94a1d5e5"
};

if (!firebase.apps.length) { 
    firebase.initializeApp(firebaseConfig); 
}
const db = firebase.firestore();
const auth = firebase.auth();

// 2. UI View Controls
function toggleView() {
    document.getElementById('login-box').classList.toggle('hidden');
    document.getElementById('signup-box').classList.toggle('hidden');
}

function updateFormFields() {
    const role = document.getElementById('reg-role').value;
    const extraFields = document.getElementById('student-extra-fields');
    if (role === 'teacher') {
        extraFields.classList.add('hidden');
    } else {
        extraFields.classList.remove('hidden');
    }
}

// 3. LOGIN LOGIC
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const pass = document.getElementById('login-pass').value;
    const loginBtn = document.querySelector('button[onclick="handleLogin()"]');

    if (!email || !pass) return alert("Please enter email and password.");

    loginBtn.innerText = "Authenticating...";
    loginBtn.disabled = true;

    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        const doc = await db.collection("users").doc(cred.user.uid).get();
        const user = doc.data();

        if (!user) throw new Error("User profile not found.");

        if (user.role === 'admin') {
            window.location.href = "admin.html";
            return;
        }

        if (!user.approved) {
            alert("Access Denied: Your account is awaiting HOI approval.");
            auth.signOut();
            return;
        }

        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-dashboard').classList.remove('hidden');
        setupUserDashboard(user);

    } catch (e) {
        alert("Login Failed: " + e.message);
    } finally {
        loginBtn.innerText = "Sign In";
        loginBtn.disabled = false;
    }
}

// 4. SIGNUP LOGIC
async function handleSignup() {
    const role = document.getElementById('reg-role').value;
    const name = document.getElementById('reg-name').value.trim();
    const school = document.getElementById('reg-school').value.trim();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const pass = document.getElementById('reg-pass').value.trim();

    if (!name || !email || !pass) return alert("All basic fields are required.");

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        let userData = {
            fullName: name,
            role: role,
            school: school,
            email: email,
            approved: false,
            uid: cred.user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        if (role === 'student') {
            userData.parentage = document.getElementById('reg-parent').value.trim();
            userData.residence = document.getElementById('reg-residence').value.trim();
            userData.grade = document.getElementById('reg-grade').value;
            userData.coins = 0;
        }

        await db.collection("users").doc(cred.user.uid).set(userData);
        alert("Registration Successful! Please wait for HOI approval.");
        auth.signOut();
        location.reload();
    } catch (e) {
        alert("Signup Error: " + e.message);
    }
}

// 5. UPDATED DASHBOARD GENERATOR
function setupUserDashboard(user) {
    document.getElementById('user-name').innerText = user.fullName;
    document.getElementById('user-subtext').innerText = `${user.grade || 'Staff/Teacher'} | ${user.school}`;
    document.getElementById('user-coins').innerText = user.coins || 0;
    
    const grid = document.getElementById('role-view');
    grid.innerHTML = ''; 

    // Logic to decide subjects
    let subjects = ["English", "Mathematics", "Urdu", "Kashmiri"];

    // If teacher, show all. If student, show based on grade.
    if (user.role === 'teacher') {
        subjects = ["English", "Mathematics", "Urdu", "Kashmiri", "EVS", "Science", "Social Studies"];
    } else if (user.grade === 'Primary') {
        subjects.push("EVS");
    } else if (user.grade === 'Middle') {
        subjects.push("EVS", "Science", "Social Studies");
    }

    subjects.forEach(sub => {
        // Create element manually to ensure onclick works perfectly on mobile
        const card = document.createElement('div');
        card.className = "bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center cursor-pointer active:scale-95 transition-all";
        
        // This makes the tab functional!
        card.onclick = () => openSubject(sub);

        card.innerHTML = `
            <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xl mb-3">
                <i class="fas fa-book-open"></i>
            </div>
            <span class="font-bold text-slate-700 text-sm leading-tight">${sub}</span>
        `;
        grid.appendChild(card);
    });
}

// 6. ACTION FUNCTION FOR TABS
function openSubject(name) {
    alert("Opening " + name + "... Prepare for your Winter Assignment!");
    // Later we will replace this alert with a Question Modal
}

function logout() { 
    auth.signOut().then(() => location.reload()); 
}
