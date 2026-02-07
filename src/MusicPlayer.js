export function initMusicPlayer() {
    // --- 1. CONFIGURATION ---
    const PLAYLIST_ID = 'PLXVLM6MKLnoxrtWvRZo3Nb2igL6jli_FL'; // Merged OST Playlist

    // --- 3. GET DOM ELEMENTS ---
    const container = document.getElementById('music-player-container');
    
    // --- 4. YOUTUBE API LOGIC ---
    let player;
    let isPlaying = false;

    // Load API Script
    if (!window.YT) {
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    // Define global callback
    window.onYouTubeIframeAPIReady = function() {
        player = new YT.Player('yt-placeholder', {
            height: '0',
            width: '0',
            playerVars: {
                'listType': 'playlist',
                'list': PLAYLIST_ID,
                'autoplay': 0,
                'controls': 0,
                'disablekb': 1,
                'fs': 0
                // 'loop': 1 // Controlled via setLoop(true) in onReady
            },
            events: {
                'onReady': onPlayerReady,
                'onStateChange': onPlayerStateChange,
                'onError': onPlayerError
            }
        });
    };

    function onPlayerReady(event) {
        document.getElementById('song-info').innerText = "[ SYSTEM READY - PLAY ]";
        player.setVolume(50);
        player.setLoop(true); // Ensures playlist loops back to start after last track
    }

    function onPlayerError(event) {
         document.getElementById('song-info').innerText = "[ CONNECTION ERROR ]";
    }

    function onPlayerStateChange(event) {
        const songInfo = document.getElementById('song-info');
        
        if (event.data === YT.PlayerState.PLAYING) {
            isPlaying = true;
            const data = player.getVideoData();
            if(data && data.title) {
                const title = data.title;
                songInfo.innerHTML = `<span class="track-content">${title}</span>`;
                
                // Add scroll if needed
                const span = songInfo.querySelector('.track-content');
                if (span.offsetWidth > songInfo.clientWidth) {
                    span.classList.add('scroll');
                }
            } else {
                songInfo.innerText = "STREAMING...";
            }
            songInfo.style.color = "#00ffff";
        } else if (event.data === YT.PlayerState.PAUSED) {
            isPlaying = false;
            songInfo.innerText = "[ PAUSED ]";
            songInfo.style.color = "#ffff00"; 
        } else if (event.data === YT.PlayerState.BUFFERING) {
            songInfo.innerText = "[ BUFFERING... ]";
        }
    }

    // Connect Buttons
    document.getElementById('song-info').addEventListener('click', togglePlay);

    function togglePlay() {
        if (!player) return;
        if (isPlaying) {
            player.pauseVideo();
        } else {
            player.playVideo();
        }
    }

    document.getElementById('btn-prev').addEventListener('click', () => {
        if (player) player.previousVideo();
    });

    document.getElementById('btn-next').addEventListener('click', () => {
        if (player) player.nextVideo();
    });

    // Return controls
    return {
        show: () => container.classList.add('visible'),
        play: () => {
             if(player && player.playVideo) player.playVideo();
        },
        setVolume: (vol) => {
            if(player && player.setVolume) player.setVolume(vol);
        }
    };
}
