const students = [
    { name: "Alice", score: 950 },
    { name: "Bob", score: 820 },
    { name: "Charlie", score: 750 }
];

function updateLeaderboard() {
    const list = document.getElementById('leaderboard-list');
    
    students.sort((a, b) => b.score - a.score).forEach((s, index) => {
        let trophy = "";
        if (index === 0) trophy = "🥇 Gold";
        else if (index === 1) trophy = "🥈 Silver";
        else if (index === 2) trophy = "🥉 Bronze";
        
        list.innerHTML += `<li>${s.name}: ${s.score} pts ${trophy}</li>`;
    });
}
