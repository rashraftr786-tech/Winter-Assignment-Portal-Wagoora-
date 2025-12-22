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

// 1. DYNAMIC FORM LOGIC
function updateFormFields() {
    const role = document.getElementById('reg-role').value;
    const extraFields = document.getElementById('student-extra-fields');
    
    if (role === 'teacher') {
        extraFields.classList.add('hidden'); // This hides Parentage, Residence, Grade
    } else {
        extraFields.classList.remove('hidden'); // This shows them for students
    }
}

function toggleView() {
    document.getElementById('login-box').classList.toggle('hidden');
    document.getElementById('signup-box').classList.toggle('hidden');
}

// 2. SIGNUP LOGIC
async function handleSignup() {
    const role = document.getElementById('reg-role').value;
    const name = document.getElementById('reg-name').value.trim();
    const school = document.getElementById('reg-school').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const pass = document.getElementById('reg-pass').value.trim();

    if (!name || !email || !pass) return alert("Please fill required fields.");

    try {
        const cred = await auth.createUserWithEmailAndPassword(email, pass);
        
        // Prepare base data
        let userData = {
            fullName: name,
            role: role,
            school: school,
            email: email,
            approved: false,
            uid: cred.user.uid
        };

        // Add extra data ONLY if student
        if (role === 'student') {
            userData.parentage = document.getElementById('reg-parent').value.trim();
            userData.residence = document.getElementById('reg-residence').value.trim();
            userData.grade = document.getElementById('reg-grade').value;
            userData.coins = 0;
        }

        await db.collection("users").doc(cred.user.uid).set(userData);
        alert("Registration successful! Access is pending Admin approval.");
        auth.signOut();
        location.reload();
    } catch (e) {
        alert("Error: " + e.message);
    }
}

// 3. LOGIN LOGIC
async function handleLogin() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-pass').value.trim();
    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        const doc = await db.collection("users").doc(cred.user.uid).get();
        const user = doc.data();

        if (user && !user.approved) {
            alert("Account pending approval.");
            auth.signOut();
            return;
        }
        alert("Welcome, " + user.fullName);
    } catch (e) { alert(e.message); }
}



