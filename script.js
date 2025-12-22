// Grade-Subject Configuration
const gradeConfig = {
    foundational: ["English", "Mathematics", "Urdu", "Kashmiri"],
    primary: ["English", "Mathematics", "Urdu", "Kashmiri", "EVS"],
    middle: ["English", "Mathematics", "Urdu", "Kashmiri", "Science", "Social Studies"]
};

let userProfile = null;
let currentAttempts = 0;

async function handleLogin() {
    const email = document.getElementById('email-field').value;
    const pass = document.getElementById('pass-field').value;
    try {
        const cred = await auth.signInWithEmailAndPassword(email, pass);
        const doc = await db.collection("users").doc(cred.user.uid).get();
        userProfile = doc.data();
        
        if (!userProfile.approved) {
            alert("Waiting for Admin Approval.");
            auth.signOut();
            return;
        }
        startDashboard();
    } catch (e) { alert(e.message); }
}

// Coin System Logic
function checkAnswer(selected, correct) {
    currentAttempts++;
    if (selected === correct) {
        let reward = 0;
        if (currentAttempts === 1) reward = 5;
        else if (currentAttempts <= 3) reward = 2;
        
        updateCoins(reward);
        alert(`Correct! You earned ${reward} coins.`);
        currentAttempts = 0;
    } else {
        if (currentAttempts >= 3) {
            alert(`Incorrect. The correct answer was: ${correct}`);
            currentAttempts = 0;
        } else {
            alert("Wrong! Try again.");
        }
    }
}

async function updateCoins(amount) {
    const newTotal = (userProfile.coins || 0) + amount;
    await db.collection("users").doc(auth.currentUser.uid).update({ coins: newTotal });
    userProfile.coins = newTotal;
    renderTrophy(newTotal);
}

function renderTrophy(coins) {
    const slot = document.getElementById('trophy-slot');
    if (coins >= 7500) slot.innerHTML = '🥇'; // Gold
    else if (coins >= 5000) slot.innerHTML = '🥈'; // Silver
    else if (coins >= 2500) slot.innerHTML = '🥉'; // Bronze
}
