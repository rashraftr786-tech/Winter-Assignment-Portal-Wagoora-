// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBcRfUj9N_9LaVuEuIT7d0ueJ88heyP9hI",
  authDomain: "wagoora-edu-portal.firebaseapp.com",
  projectId: "wagoora-edu-portal",
  storageBucket: "wagoora-edu-portal.firebasestorage.app",
  messagingSenderId: "476444772096",
  appId: "1:476444772096:web:6fd360cc0a774f94a1d5e5",
  measurementId: "G-PPQEPJD3YN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
/**
 * WAGOORA V3.0 - CLOUD CORE
 * Features: Firebase Firestore Sync, Cross-Device Logic, Real-time Updates
 */

// 1. FIREBASE CONFIGURATION
// Replace these values with your actual Firebase Project keys
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123456789:web:abcdef"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// 2. APP STATE
let state = {
    currentUser: null,
    globalSubjects: [], // Will load from Cloud
    schools: [],        // Will load from Cloud
    teachers: [], 
    quizzes: [],   
    studentProgress: {
        coins: parseInt(localStorage.getItem('wagoora_coins')) || 0,
        currentQuizIndex: 0,
        attempts: 0
    }
};

// --- AUTHENTICATION ---
function handleLogin() {
    const role = document.getElementById('role-select').value;
    const user = document.getElementById('user-field').value.trim();
    const pass = document.getElementById('pass-field').value.trim();

    if (!user || !pass) return alert("Please fill all fields");

    if (role === 'superadmin') {
        if (user === 'admin' && pass === 'super123') {
            initPortal('superadmin', 'System Master');
        } else { alert("Invalid Admin Credentials"); }
    } 
    else if (role === 'hoi') {
        if (pass === 'welcome@123') {
            initPortal('hoi', user);
        } else { alert("Invalid HOI Password"); }
    } 
    else if (role === 'teacher') {
        // In Cloud version, we check the 'teachers' collection in Firestore
        initPortal('teacher', user, "Science"); 
    } 
    else if (role === 'student') {
        initPortal('student', user, "English"); 
    }
}

function initPortal(role, name, subject = null) {
    state.currentUser = { role, name, subject };
    
    document.getElementById('login-screen').classList.add('hidden');
    const mainDash = document.getElementById('main-dashboard');
    mainDash.classList.remove('hidden');
    
    // Cross-Device Display Logic
    mainDash.style.display = (window.innerWidth < 1024) ? 'block' : 'grid';
    
    document.getElementById('nav-info').classList.remove('hidden');
    document.getElementById('display-role').innerText = role;
    
    document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
    const activePanel = document.getElementById('panel-' + role);
    if (activePanel) activePanel.classList.remove('hidden');

    renderSidebar(role);
    
    // START CLOUD SYNC
    startCloudListeners();

    if (role === 'teacher') document.getElementById('active-subject-display').innerText = subject;
    if (role === 'student') {
        updateCoinDisplay();
        loadStudentQuiz();
    }
}

// --- CLOUD REAL-TIME ENGINE ---
function startCloudListeners() {
    // 1. Sync Schools (Real-time)
    db.collection("schools").orderBy("createdAt", "desc").onSnapshot((snapshot) => {
        state.schools = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSchoolList();
    });

    // 2. Sync Subjects (Real-time)
    db.collection("subjects").orderBy("name").onSnapshot((snapshot) => {
        state.globalSubjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderSubjectList();
        if (state.currentUser && state.currentUser.role === 'hoi') populateHOISubjects();
    });
}

// --- UI RENDERERS ---
function renderSidebar(role) {
    const sidebar = document.getElementById('sidebar-menu');
    let menuHTML = '';

    if (role === 'superadmin') {
        menuHTML = `
            <button onclick="window.scrollTo({top: 0, behavior: 'smooth'})" class="w-full text-left p-4 glass rounded-2xl mb-2 text-indigo-400 font-bold border-l-4 border-indigo-500">
                <i class="fas fa-layer-group mr-2"></i> Subjects
            </button>
            <button onclick="document.getElementById('school-name').scrollIntoView({behavior: 'smooth'})" class="w-full text-left p-4 glass rounded-2xl text-white font-bold hover:bg-white/10 transition">
                <i class="fas fa-school mr-2 text-indigo-400"></i> Schools Registry
            </button>`;
    } else if (role === 'student') {
        menuHTML = `<div class="glass p-4 rounded-2xl border-b-4 border-yellow-500/50">
            <p class="text-[10px] uppercase font-bold text-gray-400">Current Session</p>
            <p class="font-bold text-sm">${state.currentUser.subject}</p>
        </div>`;
    }
    sidebar.innerHTML = menuHTML;
}

// --- CLOUD WRITE FUNCTIONS ---
async function registerNewSchool() {
    const nameInput = document.getElementById('school-name');
    const locInput = document.getElementById('school-location');
    const name = nameInput.value.trim();
    const loc = locInput.value.trim();

    if (name && loc) {
        try {
            await db.collection("schools").add({
                name,
                location: loc,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            nameInput.value = '';
            locInput.value = '';
            alert("School Added to Cloud Registry!");
        } catch (e) { alert("Error: Check your internet connection"); }
    }
}

async function addGlobalSubject() {
    const nameInput = document.getElementById('sub-name');
    const cat = document.getElementById('sub-cat').value;
    const name = nameInput.value.trim();

    if (name) {
        await db.collection("subjects").add({ name, cat });
        nameInput.value = '';
    }
}

// --- LIST RENDERERS ---
function renderSchoolList() {
    const list = document.getElementById('school-list');
    if (!list) return;
    if (state.schools.length === 0) {
        list.innerHTML = `<p class="col-span-full opacity-30 italic py-10">Waiting for cloud data...</p>`;
        return;
    }
    list.innerHTML = state.schools.map(s => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5 animate-fadeIn">
            <div class="text-left">
                <p class="font-bold text-sm text-white">${s.name}</p>
                <p class="text-[10px] text-indigo-300 uppercase tracking-widest">${s.location}</p>
            </div>
            <i class="fas fa-cloud text-indigo-500/30"></i>
        </div>
    `).join('');
}

function renderSubjectList() {
    const list = document.getElementById('subject-list');
    if (!list) return;
    list.innerHTML = state.globalSubjects.map(s => `
        <div class="glass p-4 rounded-xl flex justify-between items-center border border-white/5">
            <div class="text-left">
                <p class="font-bold text-sm text-white">${s.name}</p>
                <p class="text-[10px] text-gray-500 uppercase">${s.cat}</p>
            </div>
            <i class="fas fa-check-circle text-indigo-500"></i>
        </div>
    `).join('');
}

// --- REMAINING LOGIC (HOI, Teacher, Student) ---
// ... (Your existing functions for populateHOISubjects, uploadQuiz, loadStudentQuiz remain the same) ...

function logout() {
    if(confirm("Logout from V3.0 Cloud?")) location.reload();
}

