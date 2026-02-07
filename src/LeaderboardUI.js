
// --- Leaderboard Helper Function ---
function openLeaderboard() {
    // Hide the garbage modal completely
    garbageModal.classList.add("hidden");
    garbageModal.style.pointerEvents = "none";
    isGarbageAnimating = false;
    
    // Show leaderboard directly
    const leaderboardDisplay = document.getElementById("leaderboard-display");
    leaderboardDisplay.classList.remove("hidden");
    leaderboardDisplay.style.display = "flex";
    leaderboardDisplay.style.flexDirection = "column";
    leaderboardDisplay.style.alignItems = "center";
    
    // Load leaderboard data
    const tbody = document.getElementById("leaderboard-body");
    tbody.innerHTML = "";
    const lbLoader = document.getElementById("lb-loader");
    const lbLoadMore = document.getElementById("lb-load-more");
    lbLoader.classList.remove("hidden");
    lbLoadMore.classList.add("hidden");
    
    let currentOffset = 0;
    let isLoading = false;
    let hasMore = true;
    
    async function loadScores() {
        if (isLoading || !hasMore) return;
        
        isLoading = true;
        lbLoader.classList.remove("hidden");
        
        const scores = await getTopScores(50, currentOffset);
        
        lbLoader.classList.add("hidden");
        isLoading = false;
        
        if (scores.length < 50) {
            hasMore = false;
            lbLoadMore.classList.add("hidden");
        } else {
            lbLoadMore.classList.remove("hidden");
        }
        
        scores.forEach((s, idx) => {
            const i = currentOffset + idx;
            const tr = document.createElement("tr");
            const color = "#fff";
            const bg = "transparent";
            
            const rank = (i + 1).toString().padStart(2, '0');
            
            tr.innerHTML = `
                <td style="padding: 10px; color: #666; background: ${bg};">${rank}</td>
                <td style="padding: 10px; color: ${color}; background: ${bg}; text-transform: uppercase;">${s.alias}</td>
                <td style="padding: 10px; text-align: right; color: ${color}; background: ${bg};">${formatTime(s.time_ms)}</td>
            `;
            tbody.appendChild(tr);
        });
        
        currentOffset += scores.length;
    }
    
    loadScores();
    
    const loadMoreBtn = lbLoadMore.querySelector("button");
    if (loadMoreBtn && !loadMoreBtn.hasAttribute('data-listener')) {
        loadMoreBtn.setAttribute('data-listener', 'true');
        loadMoreBtn.addEventListener("click", loadScores);
    }
    
    if (!leaderboardDisplay.hasAttribute('data-scroll-listener')) {
        leaderboardDisplay.setAttribute('data-scroll-listener', 'true');
        leaderboardDisplay.addEventListener("scroll", () => {
            const scrollTop = leaderboardDisplay.scrollTop;
            const scrollHeight = leaderboardDisplay.scrollHeight;
            const clientHeight = leaderboardDisplay.clientHeight;
            
            if (scrollTop + clientHeight >= scrollHeight - 100 && hasMore && !isLoading) {
                loadScores();
            }
        });
    }
}

// In-Game HUD for Leaderboard
const gameHud = document.createElement("div");
gameHud.id = "game-hud";
gameHud.className = "hidden";
Object.assign(gameHud.style, {
    position: 'fixed',
    top: '20px',
    right: '20px',
    zIndex: '5000'
});
gameHud.innerHTML = `<button id="btn-ingame-leaderboard" class="cyber-btn" style="font-size: 12px; padding: 8px 12px; background: rgba(0,0,0,0.7); border: 1px solid #00ffff; color: #00ffff; box-shadow: 0 0 5px #00ffff;">LEADERBOARD</button>`;
document.body.appendChild(gameHud);
