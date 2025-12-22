// Firebase Configuration - Ensure this is your actual config
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

// UI Toggles
function updateFormFields() {
    const role = document.getElementById('reg-role').value;
    const extraFields = document.getElementById('student-extra-fields');
    if (role === 'teacher') {
        extraFields.classList.add('hidden');
    } else {
        extraFields.classList.remove('hidden');
    }
}

function toggleView() {
    document.getElementById('login-box').classList.toggle('hidden');
    document.getElementById('signup-box').classList.toggle('hidden');
}

// Fixed Signup Logic
async function handleSignup() {
    const regBtn = document.getElementById('reg-btn');
    regBtn.disabled = true;
    regBtn.innerText = "Processing...";

    const role = document.getElementById('reg-role').value;
    const name = document.getElementById('reg-name').value.trim();
    const school = document.getElementById('reg-school').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();

    if (!name || !email || !pass) {
        alert("Name, Email, and Password are required.");
        regBtn.disabled = false;
        regBtn.innerText = "Create Account";
        return;
    }

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        
        let userData = {
            fullName: name,
            role: role,
            school: school,
            email: email,
            approved: false, // Security Gate
            uid: cred.user.uid,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Only add student data if role is student
        if (role === 'student') {
            userData.parentage = document.getElementById('reg-parent').value.trim();
            userData.residence = document.getElementById('reg-residence').value.trim();
            userData.grade = document.getElementById('reg-grade').value;
            userData.coins = 0;
        }

        await db.collection("users").doc(cred.user.uid).set(userData);
        
        alert("Account Created! Please wait for Admin/HOI approval.");
        auth.signOut();
        location.reload();
    } catch (e) {
        alert("Registration failed: " + e.message);
        regBtn.disabled = false;
        regBtn.innerText = "Create Account";
    }
}

// Login Logic
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        const doc = await db.collection("users").doc(cred.user.uid).get();
        const user = doc.data();

        if (user && !user.approved) {
            alert("Approval Pending. Please contact your administrator.");
            auth.signOut();
            return;
        }
        alert("Logged in as " + user.fullName);
    } catch (e) { alert(e.message); }
}

