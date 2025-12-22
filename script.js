// 1. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBcRfUj9N_9LaVuEuIT7d0ueJ88heyP9hI",
    authDomain: "wagoora-edu-portal.firebaseapp.com",
    projectId: "wagoora-edu-portal",
    storageBucket: "wagoora-edu-portal.firebasestorage.app",
    messagingSenderId: "476444772096",
    appId: "1:476444772096:web:6fd360cc0a774f94a1d5e5"
};

// Initialize Firebase
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.firestore();
const auth = firebase.auth();

// 2. UI View Toggles
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

// 3. SECURE LOGIN LOGIC
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    
    if (!email || !pass) return alert("Enter credentials");

    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        const doc = await db.collection("users").doc(cred.user.uid).get();
        const user = doc.data();

        if (!user) throw new Error("User profile not found in database.");

        // ROLE ROUTING
        if (user.role === 'admin') {
            // Redirect to admin.html (Ensure this file exists in your folder)
            window.location.href = "admin.html";
            return;
        }

        if (!user.approved) {
            alert("Approval Pending. Please contact HOI.");
            auth.signOut();
            return;
        }

        // Show Student/Teacher Dashboard
        document.getElementById('auth-screen').classList.add('hidden');
        document.getElementById('app-dashboard').classList.remove('hidden');
        setupUserDashboard(user);

    } catch (e) {
        alert("Login Error: " + e.message);
    }
}

// 4. SIGNUP LOGIC
async function handleSignup() {
    const role = document.getElementById('reg-role').value;
    const name = document.getElementById('reg-name').value.trim();
    const school = document.getElementById('reg-school').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();

    if (!name || !email || !pass) return alert("Please fill all fields.");

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        
        let userData = {
            fullName: name,
            role: role,
            school: school,
            email: email,
            approved: false, // Default to false for security
            uid: cred.user.uid
        };

        if (role === 'student') {
            userData.parentage = document.getElementById('reg-parent').value.trim();
            userData.residence = document.getElementById('reg-residence').value.trim();
            userData.grade = document.getElementById('reg-grade').value;
            userData.coins = 0;
        }

        await db.collection("users").doc(cred.user.uid).set(userData);
        alert("Account Created! Waiting for Admin/HOI Approval.");
        auth.signOut();
        location.reload();
    } catch (e) {
        alert("Signup failed: " + e.message);
    }
}

// 5. DASHBOARD GENERATOR (Student View)
function setupUserDashboard(user) {
    document.getElementById('user-name').innerText = user.fullName;
    document.getElementById('user-subtext').innerText = `${user.grade || user.role.toUpperCase()} | ${user.school}`;
    
    const grid = document.getElementById('role-view');
    grid.innerHTML = ''; 

    let subjects = [];
    if (user.grade === 'Foundational') subjects = ["English", "Mathematics", "Urdu", "Kashmiri"];
    else if (user.grade === 'Primary') subjects = ["English", "Mathematics", "Urdu", "Kashmiri", "EVS"];
    else if (user.grade === 'Middle') subjects = ["English", "Mathematics", "Urdu", "Kashmiri", "Science", "Social Studies"];

    subjects.forEach(sub => {
        grid.innerHTML += `
            <div class="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-100 flex flex-col items-center cursor-pointer active:scale-95 transition-all">
                <div class="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-xl mb-3">
                    <i class="fas fa-book-open"></i>
                </div>
                <span class="font-bold text-slate-700 text-sm">${sub}</span>
            </div>
        `;
    });
}

function logout() { auth.signOut().then(() => location.reload()); }

