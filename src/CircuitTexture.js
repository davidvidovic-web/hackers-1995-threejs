import * as THREE from 'three';

export function createCircuitTexture() {
    const canvas = document.createElement('canvas');
    const width = 1024;
    const height = 1024;
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // 1. Background (Black)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Grid config
    const gridSize = 32; 
    
    // We maintain the channel logic for flow animation:
    // Red = Horizontal segments
    // Green = Vertical segments
    // Blue = Pads/Junctions

    ctx.lineCap = 'butt'; 

    const numCables = 60; // Fewer but thicker clusters

    function drawBus(x, y, isHorizontal, length, lanes) {
        const spacing = 8; // Wider spacing for distinct lines
        const totalWidth = lanes * spacing;
        
        // Draw lanes
        for(let l=0; l<lanes; l++) {
            const offset = (l - lanes/2) * spacing;
            ctx.lineWidth = 4; // Bold lines
             
            if (isHorizontal) {
                // Red Channel
                ctx.strokeStyle = `rgba(255, 0, 0, 1.0)`;
                ctx.beginPath();
                ctx.moveTo(x, y + offset);
                ctx.lineTo(x + length, y + offset);
                ctx.stroke();
                
                // Endpads
                ctx.fillStyle = '#0000ff';
                ctx.fillRect(x-4, y+offset-4, 8, 8);
                ctx.fillRect(x+length-4, y+offset-4, 8, 8);
            } else {
                // Green Channel
                ctx.strokeStyle = `rgba(0, 255, 0, 1.0)`;
                ctx.beginPath();
                ctx.moveTo(x + offset, y);
                ctx.lineTo(x + offset, y + length);
                ctx.stroke();

                // Endpads
                ctx.fillStyle = '#0000ff';
                ctx.fillRect(x+offset-4, y-4, 8, 8);
                ctx.fillRect(x+offset-4, y+length-4, 8, 8);
            }
        }
    }

    for(let i=0; i<numCables; i++) {
        // Start point snapped to grid
        let x = Math.floor(Math.random() * (width/gridSize)) * gridSize + gridSize/2;
        let y = Math.floor(Math.random() * (height/gridSize)) * gridSize + gridSize/2;
        
        // Randomly choose a "bus" size (number of parallel lines)
        let lanes = Math.floor(Math.random() * 3) + 2; // 2 to 4 lanes
        
        let segments = Math.floor(Math.random() * 3) + 1; 
        
        for(let s=0; s<segments; s++) {
            const isHorizontal = Math.random() > 0.5;
            const len = (Math.floor(Math.random() * 6) + 3) * gridSize; 
            
            // Draw segment based on direction
            if (isHorizontal) {
                const dir = Math.random() > 0.5 ? 1 : -1;
                const endX = x + len * dir;
                
                // Normalize for drawing function (always left to right for simplicity math)
                const dX = Math.min(x, endX);
                drawBus(dX, y, true, Math.abs(endX - x), lanes);
                
                x = endX;
            } else {
                const dir = Math.random() > 0.5 ? 1 : -1;
                const endY = y + len * dir;

                const dY = Math.min(y, endY);
                drawBus(x, dY, false, Math.abs(endY - y), lanes);

                y = endY;
            }
        }
    }

    // Add some noise/tech detailing (small pads)
    ctx.fillStyle = '#0000ff';
    for(let i=0; i<200; i++) {
        let x = Math.floor(Math.random() * (width/16)) * 16;
        let y = Math.floor(Math.random() * (height/16)) * 16;
        if(Math.random()>0.8) ctx.fillRect(x, y, 4, 4);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    
    return texture;
}

export const FloorShader = {
    vertexShader: `
        varying vec2 vUv;
        varying vec3 vPosition;
        
        void main() {
            vUv = uv;
            vPosition = position; // World position (if model matrix is identity) or local
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uTime;
        uniform vec3 uColor;
        
        // Grid params for masking
        uniform vec2 uFloorSize;
        uniform float uSpacing;
        uniform float uBoxWidth;

        varying vec2 vUv;
        varying vec3 vPosition; // Use this to determine world position on plane

        // Random helper
        float rand(vec2 co){
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
        }

        void main() {
            // 1. Calculate World Position from UV
            // Plan is centered at 0,0. UV (0,0) is top-left or bottom-left corner.
            // UV range 0..1 maps to -Size/2 .. +Size/2
            vec2 worldPos = (vUv - 0.5) * uFloorSize;

            // 2. Building Mask
            // Buildings are on a grid with 'uSpacing'. Size is 'uBoxWidth'.
            // Center of a cell is implicitly at multiples of uSpacing (assuming grid is centered)
            
            // mod(x + offset, spacing) - halfSpacing
            // Buildings are placed at -8, +8... (half-spacing offsets) if grid is even
            // Correct alignment for 80x40 grid centered at 0
            vec2 cellPos = mod(worldPos, uSpacing) - 0.5 * uSpacing;
            
            // Check if we are inside the building footprint
            // A bit of padding for the glow
            float halfBox = uBoxWidth * 0.5 + 0.2; 
            
            float inBuildingX = step(abs(cellPos.x), halfBox);
            float inBuildingZ = step(abs(cellPos.y), halfBox);
            float isUnderBuilding = inBuildingX * inBuildingZ;

            // Invert mask: We want 1.0 where there is NO building
            float floorMask = 1.0 - isUnderBuilding;

            // 3. Traffic Animation
            // Tile the texture
            vec2 tiledUv = vUv * 12.0;

            // Sample Static Layout (No UV shifting)
            vec4 tex = texture2D(uTexture, tiledUv);
            
            // 4. Create "Car" Pulses (Data Packets)
            // Use the static Red/Green channels as masks, and animate a wave calculation
            
            // Horizontal Packets (Red channel)
            // Wave equation: sin(position - speed * time)
            float flowH = smoothstep(0.5, 1.0, sin(tiledUv.x * 2.0 - uTime * 8.0));
            // Add randomness so not all lines pulse in sync (use y coordinate for phase shift)
            flowH *= smoothstep(0.0, 1.0, sin(tiledUv.y * 10.0 + tiledUv.x)); 
            float packetH = tex.r * flowH;
            
            // Vertical Packets (Green channel)
            float flowV = smoothstep(0.5, 1.0, sin(tiledUv.y * 2.0 + uTime * 8.0 + 3.14));
            flowV *= smoothstep(0.0, 1.0, sin(tiledUv.x * 10.0 + tiledUv.y));
            float packetV = tex.g * flowV;

            // 5. Static Lines (Permanently Visible)
            // We want clear, defined lines like the reference
            float redLine = smoothstep(0.2, 0.5, tex.r);
            float greenLine = smoothstep(0.2, 0.5, tex.g);
            float anyLine = max(redLine, greenLine);

            // Base brightness for inactive lines (dim but solid)
            float staticGlow = anyLine * 0.4;

            // Packet brightness (VERY bright when active)
            float packetIntensity = (packetH + packetV) * 2.0;

            // Define Static Pads (Blue channel)
            float staticPads = tex.b * 0.4;

            // Combine
            // Result: Dim lines + Bright Blasts + Static Pads
            float totalIntensity = (staticGlow + packetIntensity + staticPads) * floorMask;
            
            // Add a white core to very bright parts to simulate "hot" light
            vec3 color = uColor * totalIntensity;
            color += vec3(1.0) * smoothstep(1.5, 3.0, packetIntensity); // White hot core

            gl_FragColor = vec4(color, 1.0);
        }
    `
};
