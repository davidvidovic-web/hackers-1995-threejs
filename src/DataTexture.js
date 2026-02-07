import * as THREE from 'three';

export function createDataTexture() {
    const canvas = document.createElement('canvas');
    const width = 2048; // Increased resolution for crisp text
    const height = 4096; // Taller texture for more variety before repeating
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Base Font settings
    const fontSize = 50; // Increased from 34
    const lineHeight = fontSize * 1.2; // Tighter line height
    ctx.font = `bold ${fontSize}px "Courier New", monospace`;
    ctx.fillStyle = '#ffffff';

    // Layout configuration
    const numColumns = 2; // Decreased from 3 to allow larger text fit
    const columnWidth = width / numColumns;
    const paddingX = 40; // Reduced padding
    const charWidth = fontSize * 0.6;
    const charsPerCol = Math.floor((columnWidth - paddingX * 2) / charWidth);

    const vocabulary = [
        "void", "int", "return", "if", "else", "while", "for", "include", "pragma",
        "MOV", "JMP", "PUSH", "POP", "EAX", "ECX", "EDX", "EBX", "ESP", "EBP", "ESI", "EDI",
        "0x00", "0xFF", "0xA1", "0xC0", "0x0F", "0x80", "0x7F", "0xB0", "0x1A", "0x2F",
        "std::cout", "buffer", "stack", "heap", "segment", "fault", "null", "ptr", "alloc", "free",
        "class", "struct", "public", "private", "virtual", "static", "override", "const", "volatile",
        "CONNECT", "TRACE", "PING", "ENCRYPT", "DECRYPT", "AUTH", "TOKEN", "SESSION", "HANDSHAKE",
        "ROOT", "ADMIN", "SUDO", "CHMOD", "GREP", "SSH", "FTP", "TELNET", "SMTP", "HTTP", "DNS",
        "MATRIX", "CYBER", "NET", "WEB", "DATA", "BASE", "QUERY", "inject", "payload", "backdoor",
        "SELECT", "FROM", "WHERE", "UPDATE", "DELETE", "INSERT", "INTO", "VALUES", "JOIN", "UNION",
        "kernel", "boot", "mount", "dev", "sys", "proc", "tmp", "var", "opt", "bin", "user",
        "PID", "TTY", "TIME", "CMD", "CPU", "MEM", "SWAP", "DISK", "IO", "NET", "IPC",
        "rsa", "sha256", "md5", "aes", "cipher", "hash", "salt", "iv", "key", "cert", "pem",
        "brute", "force", "scan", "crack", "hack", "bypass", "exploit", "vuln", "patch", "zero",
        "ACCESS", "DENIED", "GRANTED", "LOCKED", "OPEN", "SECURE", "UNSAFE", "WARNING", "ERROR",
        "SYSTEM", "FAIL", "CRASH", "REBOOT", "HALT", "PANIC", "CORE", "DUMP", "LOG", "AUDIT"
    ];

    const uppercase = vocabulary.filter(w => w === w.toUpperCase());
    const symbols = ["{", "}", ";", "(", ")", "[", "]", "<", ">", "=", "+", "-", "*", "/", "%", "&", "|", "^", "!", "?", ":", ".", ",", "#", "_", "@", "$", "\\", "\"", "'"];


    // Color Masks for the shader to map to different neon colors
    const C_PRIMARY = '#FF0000';   // Red Channel -> Maps to uColor (Building Base)
    const C_SECONDARY = '#00FF00'; // Green Channel -> Maps to uColor2
    const C_TERTIARY = '#0000FF';  // Blue Channel -> Maps to uColor3

    // Default to Primary
    ctx.fillStyle = C_PRIMARY;

    // --- HELPER FUNCTIONS ---

    // 1. C-Style Function
    function drawFunction(startX, startY) {
        let lines = [];
        lines.push(`void ${vocabulary[Math.floor(Math.random() * vocabulary.length)]}_${Math.floor(Math.random()*99)}() {`);
        const bodyLines = Math.floor(Math.random() * 6) + 4;
        for(let i=0; i<bodyLines; i++) {
            let indent = "  ";
            if(Math.random() > 0.5) indent += "  ";
            let content = "";
            while(content.length < 20) {
                content += vocabulary[Math.floor(Math.random() * vocabulary.length)] + "(";
                content += Math.floor(Math.random() * 999) + "); ";
            }
            lines.push(indent + content);
        }
        lines.push("}");
        
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 2. Bordered List
    function drawBorderedList(startX, startY) {
        const w = charsPerCol - 4;
        let lines = [];
        const border = "+" + "-".repeat(w-2) + "+";
        lines.push(border);
        const title = " " + uppercase[Math.floor(Math.random() * uppercase.length)] + " STATUS ";
        lines.push("|" + title + " ".repeat(w - 2 - title.length) + "|");
        lines.push(border);
        
        const count = Math.floor(Math.random() * 6) + 4;
        for(let i=0; i<count; i++) {
            const item = uppercase[Math.floor(Math.random() * uppercase.length)];
            const val = Math.random() > 0.5 ? "OK" : "ERR";
            const row = ` ${item}: ${val}`;
            lines.push("|" + row + " ".repeat(w - 2 - row.length) + "|");
        }
        lines.push(border);

        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 3. Hex Dump
    function drawHexDump(startX, startY) {
        let lines = [];
        const count = Math.floor(Math.random() * 8) + 4;
        for(let i=0; i<count; i++) {
            let l = "0x" + Math.floor(Math.random()*65535).toString(16).toUpperCase().padStart(4, '0') + ": ";
            for(let j=0; j<8; j++) {
                l += Math.floor(Math.random()*255).toString(16).toUpperCase().padStart(2, '0') + " ";
            }
            lines.push(l);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 4. Big Alert Block
    function drawAlert(startX, startY) {
        ctx.save();
        ctx.font = `bold ${fontSize + 10}px "Courier New", monospace`;
        const word = uppercase[Math.floor(Math.random() * uppercase.length)];
        const l1 = `>> ${word} <<`;
        const l2 = `DETECTED...`;
        const l3 = `[ ${Math.floor(Math.random()*100)}% ]`;
        
        ctx.fillText(l1, startX, startY);
        ctx.fillText(l2, startX, startY + lineHeight * 1.2);
        ctx.fillText(l3, startX, startY + lineHeight * 2.4);
        ctx.restore();
        return 4;
    }

    // 5. Network Connections Table
    function drawConnectionTable(startX, startY) {
        let lines = [];
        lines.push("NET_active_connections:");
        lines.push("PROTO  LOCAL_ADDR      STATE");
        
        const count = Math.floor(Math.random() * 5) + 3;
        for(let i=0; i<count; i++) {
            const proto = Math.random() > 0.3 ? "TCP" : "UDP";
            const ip = `192.168.0.${Math.floor(Math.random()*255)}`;
            const port = Math.floor(Math.random() * 9000) + 1000;
            const state = Math.random() > 0.5 ? "ESTAB" : "LISTEN";
            lines.push(`${proto}    ${ip}:${port}   ${state}`);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 6. Simple Progress Bar (Animated)
    function drawProgressBar(startX, startY) {
        let currentLine = 0;
        
        // Header
        ctx.fillStyle = C_PRIMARY;
        ctx.fillText("MEMORY_HEAP:", startX, startY);
        currentLine++;

        const count = Math.floor(Math.random() * 4) + 3;
        for(let i=0; i<count; i++) {
            const y = startY + currentLine * lineHeight;
            
            // Draw Brackets
            ctx.fillStyle = C_PRIMARY;
            ctx.fillText("[", startX, y);
            
            // Bar Calculation
            // 20 chars wide approx
            const barStartX = startX + charWidth * 1.5; 
            const barWidth = charWidth * 20; 
            const barHeight = fontSize * 0.6; 
            const barY = y - fontSize * 0.7; // Adjust from baseline

            // Draw Bar Gradient (Maps Position sets Red=1, Blue=1, Green=0->1)
            // Color: #FF00FF (Magenta) -> #FFFFFF 
            // So Green channel goes 00 -> FF. Red/Blue stay FF.
            const grad = ctx.createLinearGradient(barStartX, 0, barStartX + barWidth, 0);
            grad.addColorStop(0, '#FF00FF'); 
            grad.addColorStop(1, '#FFFFFF');
            
            ctx.fillStyle = grad;
            ctx.fillRect(barStartX, barY, barWidth, barHeight);

            // Closing Bracket & Label
            ctx.fillStyle = C_PRIMARY;
            const endX = barStartX + barWidth + charWidth * 0.5;
            ctx.fillText("] " + Math.floor(Math.random()*100) + "%", endX, y);

            currentLine++;
        }
        return currentLine;
    }

    // 7. SQL Query Log
    function drawSqlLog(startX, startY) {
        let lines = [];
        const tables = ["users", "logs", "transactions", "auth_keys", "system_config"];
        const actions = ["SELECT * FROM", "UPDATE", "DELETE FROM", "INSERT INTO"];
        
        const count = Math.floor(Math.random() * 4) + 3;
        for(let i=0; i<count; i++) {
            const action = actions[Math.floor(Math.random() * actions.length)];
            const table = tables[Math.floor(Math.random() * tables.length)];
            const time = Math.floor(Math.random() * 50);
            lines.push(`> ${action} ${table}`);
            lines.push(`  Query took ${time}ms... OK`);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 8. Directory Listing
    function drawDirList(startX, startY) {
        let lines = [];
        lines.push("root@sys:/var/log# ls -la");
        const count = Math.floor(Math.random() * 5) + 3;
        for(let i=0; i<count; i++) {
            const perm = "-rwxr-xr-x";
            const owner = "root";
            const size = Math.floor(Math.random() * 9999);
            const name = vocabulary[Math.floor(Math.random() * vocabulary.length)] + ".log";
            lines.push(`${perm} ${owner} ${size} ${name}`);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 9. Process Table
    function drawProcessTable(startX, startY) {
        let lines = [];
        const cols = ["PID","PR","NI","VIRT","RES","SHR","S","%CPU","%MEM","TIME+","COMMAND"];
        lines.push(cols.join("  "));
        const count = Math.floor(Math.random() * 8) + 5; // Denser list
        for(let i=0; i<count; i++) {
            const pid = Math.floor(Math.random() * 99999).toString().padEnd(5);
            const pr = "20";
            const ni = "0";
            const virt = (Math.floor(Math.random()*200000)).toString();
            const res = (Math.floor(Math.random()*20000)).toString();
            const shr = (Math.floor(Math.random()*5000)).toString();
            const s = Math.random() > 0.1 ? "S" : "R";
            const cpu = (Math.random() * 90).toFixed(1).padStart(4);
            const mem = (Math.random() * 20).toFixed(1).padStart(4);
            const time = `${Math.floor(Math.random()*99)}:${Math.floor(Math.random()*59)}.00`;
            const cmd = vocabulary[Math.floor(Math.random() * vocabulary.length)].toLowerCase();
            
            // Format loosely but densely
            lines.push(`${pid} ${pr} ${ni} ${virt} ${res} ${shr} ${s} ${cpu} ${mem} ${time} ${cmd}`);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 10. Crypto Keys
    function drawCryptoBlock(startX, startY) {
        let lines = [];
        lines.push("-----BEGIN RSA PRIVATE KEY-----");
        const count = Math.floor(Math.random() * 8) + 6; // Denser block
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
        const w = charsPerCol + 5; // Utilize full width
        for(let i=0; i<count; i++) {
            let line = "";
            for(let j=0; j<w; j++) {
                line += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            lines.push(line);
        }
        lines.push("-----END RSA PRIVATE KEY-----");
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 11. Boot Sequence
    function drawBootSeq(startX, startY) {
        let lines = [];
        lines.push("INIT: version 2.88 booting");
        const steps = ["Mounting local filesystems", "Activating swapfile swap", "Cleaning /tmp /var/run", "Setting up networking", "Starting system message bus", "Starting OpenBSD Secure Shell server", "Starting Apache httpd web server"];
        
        const count = Math.floor(Math.random() * 5) + 3;
        for(let i=0; i<count; i++) {
            const step = steps[Math.floor(Math.random() * steps.length)];
            lines.push(`[ OK ] ${step}`);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 12. JSON Object
    function drawJson(startX, startY) {
        let lines = [];
        lines.push("{");
        const count = Math.floor(Math.random() * 8) + 4; // Denser
        for(let i=0; i<count; i++) {
            const key = vocabulary[Math.floor(Math.random() * vocabulary.length)];
            let val;
            const r = Math.random();
            if(r < 0.3) val = Math.floor(Math.random() * 9999);
            else if(r < 0.6) val = `"${vocabulary[Math.floor(Math.random()*vocabulary.length)]}"`;
            else if(r < 0.8) val = "true";
            else val = "null";
            
            const comma = (i < count - 1) ? "," : "";
            lines.push(`  "${key}": ${val}${comma}`);
        }
        lines.push("}");
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 13. SQL Query
    function drawSQL(startX, startY) {
        let lines = [];
        const table = uppercase[Math.floor(Math.random()*uppercase.length)];
        lines.push(`SELECT * FROM ${table}`);
        lines.push(`WHERE status = 'ACTIVE'`);
        lines.push(`AND last_login > NOW()`);
        lines.push(`ORDER BY id DESC LIMIT 100;`);
        lines.push(`-- 100 rows affected`);
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 14. Matrix Rain Chars
    function drawMatrixRain(startX, startY) {
        let lines = [];
        // Dense block of japanese katakana or random chars
        const count = 4;
        const widthChars = 10;
        const katakana = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ";
        for(let i=0; i<count; i++) {
             let l = "";
             for(let j=0; j<widthChars; j++) {
                 if(Math.random() > 0.5) {
                    l += katakana.charAt(Math.floor(Math.random() * katakana.length)) + " ";
                 } else {
                    l += Math.floor(Math.random()*9) + " ";
                 }
             }
             lines.push(l);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }


    // 13. System Diagnostics
    function drawDiagnostics(startX, startY) {
        let lines = [];
        lines.push("Running diagnostics...");
        const systems = ["Core 0", "Core 1", "Core 2", "GPU", "RAM", "Cooling", "Network"];
        const count = Math.floor(Math.random() * 5) + 3;
        for(let i=0; i<count; i++) {
            const sys = systems[Math.floor(Math.random() * systems.length)];
            const temp = Math.floor(Math.random() * 40) + 40;
            const status = temp > 75 ? "WARN" : "OK";
            lines.push(`${sys}: ${temp}C [${status}]`);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 14. Binary Stream
    function drawBinary(startX, startY) {
        let lines = [];
        const count = Math.floor(Math.random() * 6) + 3;
        for(let i=0; i<count; i++) {
            let line = "";
            for(let j=0; j<24; j++) {
                line += Math.random() > 0.5 ? "1" : "0";
                if(j % 8 === 7) line += " ";
            }
            lines.push(line);
        }
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // 15. Coordinates
    function drawCoordinates(startX, startY) {
        let lines = [];
        lines.push("TRACKING TARGET:");
        lines.push(`LAT: ${ (Math.random() * 180 - 90).toFixed(4) } N`);
        lines.push(`LON: ${ (Math.random() * 360 - 180).toFixed(4) } E`);
        lines.push(`ALT: ${ Math.floor(Math.random() * 30000) } FT`);
        lines.push(`VEL: ${ Math.floor(Math.random() * 500) } KTS`);
        
        lines.forEach((l, i) => ctx.fillText(l, startX, startY + i * lineHeight));
        return lines.length;
    }

    // Generate columns
    for (let c = 0; c < numColumns; c++) {
        let currentY = fontSize * 2;
        const startX = c * columnWidth + paddingX;

        while (currentY < height) {
            const blockType = Math.random();
            let linesAdded = 0;

            // Randomize Color Channel for this block
            // 60% Primary (Building Color), 25% Secondary, 15% Tertiary
            const colorRand = Math.random();
            if (colorRand < 0.60) ctx.fillStyle = C_PRIMARY;
            else if (colorRand < 0.85) ctx.fillStyle = C_SECONDARY;
            else ctx.fillStyle = C_TERTIARY;

            // Type Selection
            if (blockType < 0.10) linesAdded = drawFunction(startX, currentY);
            else if (blockType < 0.18) linesAdded = drawHexDump(startX, currentY);
            else if (blockType < 0.26) linesAdded = drawBorderedList(startX, currentY);
            else if (blockType < 0.32) linesAdded = drawConnectionTable(startX, currentY);
            else if (blockType < 0.38) linesAdded = drawProgressBar(startX, currentY);
            else if (blockType < 0.44) linesAdded = drawSqlLog(startX, currentY);
            else if (blockType < 0.50) linesAdded = drawDirList(startX, currentY);
            else if (blockType < 0.56) linesAdded = drawProcessTable(startX, currentY);
            else if (blockType < 0.62) linesAdded = drawCryptoBlock(startX, currentY);
            else if (blockType < 0.68) linesAdded = drawBootSeq(startX, currentY);
            else if (blockType < 0.74) linesAdded = drawJson(startX, currentY);
            else if (blockType < 0.80) linesAdded = drawDiagnostics(startX, currentY);
            else if (blockType < 0.86) linesAdded = drawBinary(startX, currentY);
            else if (blockType < 0.92) linesAdded = drawCoordinates(startX, currentY);
            else {
                 // Alerts are always Tertiary (Stand out)
                 ctx.fillStyle = C_TERTIARY;
                 linesAdded = drawAlert(startX, currentY);
            }

            // Move cursor
            currentY += linesAdded * lineHeight;
            
            // Random varied gap
            const gap = Math.floor(Math.random() * 8) + 4;
            currentY += gap * lineHeight;
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    // texture.magFilter = THREE.NearestFilter; // Pixelated, retro look
    // texture.minFilter = THREE.NearestFilter;
    
    return texture;
}

export const DataFlowShader = {
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vObjectPosition;
        varying vec3 vNormal;
        
        void main() {
            vUv = uv;
            vNormal = normal;
            // Extract the world position of the mesh origin (translation component of modelMatrix)
            // modelMatrix is constant for the entire mesh, so this value is stable across all faces
            vObjectPosition = vec3(modelMatrix[3][0], modelMatrix[3][1], modelMatrix[3][2]);
            
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `,
    fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uTime;
        uniform vec3 uColor;
        uniform vec3 uColor2; // Secondary Color
        uniform vec3 uColor3; // Tertiary Color
        uniform vec3 uBorderColor; 
        uniform float uSpeed;
        
        varying vec2 vUv;
        varying vec3 vObjectPosition;
        varying vec3 vNormal;

        float rand(vec2 co){
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }

        void main() {
            vec2 uv = vUv;
            float seed = rand(vObjectPosition.xz); 

            // Common Visual Elements
            float edgeW = 0.03; 
            float borderX = smoothstep(edgeW, 0.0, uv.x) + smoothstep(1.0 - edgeW, 1.0, uv.x);
            float borderY = smoothstep(edgeW, 0.0, uv.y) + smoothstep(1.0 - edgeW, 1.0, uv.y);
            float border = clamp(borderX + borderY, 0.0, 1.0);
            float baseGlow = smoothstep(0.2, 0.0, uv.y) * 1.5;

            // Texture Sampling State
            vec4 texColor = vec4(0.0);
            vec3 activeTextColor = uColor; 
            float activeBrightness = 1.0;
            float selectionBox = 0.0; 

            // --------------------------------------------------------
            // LOGIC MODES
            // --------------------------------------------------------
            
            vec2 uvToUse = uv; // Store final UV for color sampling
            
            if (seed < 0.20) {
                // MODE 1: STATIC PULSATING
                uvToUse.y += seed * 100.0;
                texColor = texture2D(uTexture, uvToUse);
                
                float pulse = 0.5 + 0.5 * sin(uTime * 3.0 + seed * 10.0);
                activeBrightness = 0.5 + pulse; 

            } else if (seed < 0.45) {
                // MODE 2: STATIC WITH BLINKING BLOCKS
                uvToUse.y += seed * 100.0;
                texColor = texture2D(uTexture, uvToUse);
                
                // Identify "Rows"
                float rowCount = 40.0;
                float rowIndex = floor(uvToUse.y * rowCount);
                
                float faceHash = dot(vNormal, vec3(12.9898, 78.233, 45.164)); 
                float rowRand = rand(vec2(rowIndex + faceHash, seed)); 
                
                if (rowRand > 0.90) {
                    float blinkSpeed = 4.0 + (rowRand * 8.0);
                    float colType = fract(rowRand * 10.0);
                    float xStart = (colType > 0.5) ? 0.55 : 0.05;
                    float xEnd = (colType > 0.5) ? 0.95 : 0.45;

                    if (uv.x > xStart && uv.x < xEnd) {
                        float blinkPhase = uTime * blinkSpeed;
                        if (sin(blinkPhase) > 0.0) {
                            selectionBox = 0.8; 
                            activeTextColor = vec3(1.0); // White inside selection
                        }
                    }
                }

            } else {
                // MODE 3 & 4: SCROLLING
                vec2 uv1 = uv;
                float speedMod = (seed < 0.65) ? (5.0 + seed*5.0) : (0.8 + seed*0.4);
                float offsetMod = seed * 100.0; 
                uv1.y -= (uTime * uSpeed * speedMod) + offsetMod;
                uvToUse = uv1;
                
                texColor = texture2D(uTexture, uvToUse);
                activeBrightness = (seed < 0.65) ? 1.3 : 1.2;
            }

            // --------------------------------------------------------
            // COLOR MIXING from CHANNELS
            // --------------------------------------------------------
            
            float m1 = texColor.r;
            float m2 = texColor.g;
            float m3 = texColor.b;
            
            // Check for Loading Bar Signature (Red high, Blue high)
            // Normal Colors: (1,0,0), (0,1,0), (0,0,1).
            // Loading Bar: Red=1, Blue=1. Green varies 0..1.
            float isBar = step(0.8, m1) * step(0.8, m3);
            
            // If it is a bar, override the channel signals for normal text mixing
            float normalTextMask = 1.0 - isBar;
            m1 *= normalTextMask;
            // m2 is used for bar progress, so mask it out of color mixing if bar
            float m2_text = m2 * normalTextMask; 
            m3 *= normalTextMask;
            
            float totalMask = max(m1, max(m2_text, m3)); 

            // Loading Bar Logic
            if (isBar > 0.5) {
                // Calculate unique hash for this specific bar line to vary speed
                // uvToUse.y varies 0..1. Multiplier 200.0 separates lines closely packed
                float barRowId = floor(uvToUse.y * 200.0);
                float barRand = rand(vec2(barRowId, seed));
                
                // Varied Speed: Some slow (0.2), some fast (1.5)
                float individualSpeed = 0.2 + barRand * 1.3;
                
                // Calculate progress
                float barProgress = fract(uTime * individualSpeed + barRand * 100.0);
                
                // m2 contains the linear gradient 0..1 from left to right of the bar
                float barFill = step(m2, barProgress);
                
                // If filled, show usage color (Secondary or Tertiary)
                // If empty, show dim background or nothing
                if (barFill > 0.5) {
                    activeTextColor = uColor2; // Filled part is Green (or whatever secondary is)
                    totalMask = 1.0;
                    activeBrightness = 1.5;
                } else {
                    activeTextColor = uColor * 0.2; // Empty part is dim primary
                    totalMask = 1.0;
                    activeBrightness = 0.5;
                }
            } else {
                 // Standard Text Mixing
                if (activeTextColor != vec3(1.0)) {
                    vec3 mixed = (uColor * m1 + uColor2 * m2_text + uColor3 * m3) / max(0.001, m1+m2_text+m3);
                    activeTextColor = mixed;
                }
            }

            // --------------------------------------------------------
            // COMPOSITING
            // --------------------------------------------------------

            float textMask = smoothstep(0.45, 0.55, totalMask);
            
            // 1. Selection Box Logic
            vec3 boxColor = uBorderColor * selectionBox;
            
            // 2. Text Logic
            vec3 finalTextColor = activeTextColor * textMask * activeBrightness;
            
            // 3. Borders & Base
            vec3 finalBorder = uColor * border * 4.0; // Borders use primary color
            vec3 finalBase = uColor * baseGlow;
            vec3 baseColor = uColor * 0.04; // Slightly darker background

            vec3 finalColor = baseColor + boxColor + finalTextColor + finalBorder + finalBase;
            float finalAlpha = 0.6 + (textMask * 0.4) + selectionBox + (border * 0.4) + (baseGlow * 0.2);

            gl_FragColor = vec4(finalColor, clamp(finalAlpha, 0.0, 1.0));
        }
    `
};
