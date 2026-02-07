import * as THREE from "three";

export function createGarbageTexture() {
  const canvas = document.createElement("canvas");
  // Aspect ratio roughly 6:15 for the building face
  const width = 1024;
  const height = 2048;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  // Background - Transparent for now, or black?
  // The shader will likely handle transparency or addition.
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  // Config
  const fontSize = 48; // Adjusted for resolution
  const lineHeight = 70;
  const fontFamily = '"Courier New", monospace';
  ctx.font = `bold ${fontSize}px ${fontFamily}`;

  // Colors
  // Using high values for bloom effect
  const colorCyan = "#5cf5f5";
  const colorPurple = "#ab49e3";
  const colorWhite = "#ffffff";

  // ---- LEFT COLUMN (Menu) ----
  const menuItems = [
    "COMPANY STATUS",
    "COMPOSITE PLANTS",
    "EXPLOR. DVLT.",
    "EXPLOR. RESEARCH",
    "GEOLOGIC RESEARCH",
    "GARBAGE",
    "GEOLOGIC BUDGETS",
    "MINING CONSULTANTS",
    "BALLAST REPORTS",
    "MINE DEVELOPMENT",
    "BLAST FRNC. STATUS",
    "NUCLEAR RESEARCH",
    "RECRUITMENT",
    "AIRFREIGHT STATUS",
  ];

  let currentY = 200; // Start with some top padding
  const leftX = 50;
  const arrowOffset = 550; // Where the triangle arrows go

  menuItems.forEach((item) => {
    // Draw Text
    if (item === "GARBAGE") {
      ctx.fillStyle = colorPurple;
      // Draw Glowy box or something? Or just text. Image has purple text.
      // Also has a scanline effect but we can do that in shader or later.
    } else {
      ctx.fillStyle = colorCyan;
    }

    ctx.fillText(item, leftX, currentY);

    // Draw Arrow ►
    ctx.fillText("►", leftX + arrowOffset, currentY);

    currentY += lineHeight;
  });

  // ---- RIGHT COLUMN (Submenu) ----
  // Positioned relative to GARBAGE
  // "GARBAGE" is at index 5. 200 + 5 * 70 = 550.

  const rightX = 650;
  let rightY = 400; // Start roughly around EXPLOR. RESEARCH

  // Header: CONFIDENTIAL FILES
  ctx.fillStyle = colorPurple;
  ctx.fillText("CONFIDENTIAL", rightX, rightY);
  rightY += lineHeight;
  ctx.fillText("FILES", rightX + 80, rightY);
  rightY += lineHeight * 0.5;

  // Warning Text
  ctx.fillStyle = colorPurple;
  ctx.font = `bold ${fontSize * 0.4}px ${fontFamily}`;
  ctx.fillText("DO NOT DELETE", rightX, rightY + 30);
  ctx.fillText("BEFORE FINAL", rightX, rightY + 50);
  ctx.fillText("BACK-UP IS COMPLETED", rightX, rightY + 70);

  rightY += 120; // Space after warning

  // File Blocks
  const fileItems = ["FILE 1", "FILE 2", "FILE 3", "FILE 4"];
  ctx.font = `bold ${fontSize}px ${fontFamily}`;
  ctx.lineWidth = 4;

  fileItems.forEach((file) => {
    const boxX = rightX;
    const boxY = rightY - fontSize + 15; // align box
    const boxW = 250;
    const boxH = fontSize + 20;

    // Draw Box
    ctx.strokeStyle = colorPurple;
    ctx.strokeRect(boxX, boxY, boxW, boxH);

    // Text inside box
    ctx.fillStyle = colorPurple;
    const textWidth = ctx.measureText(file).width;
    // Center text in box
    ctx.fillText(file, boxX + (boxW - textWidth) / 2, rightY + 5);

    // Subtext "WAITING FOR BACK-UP"
    rightY += lineHeight * 0.6;
    ctx.fillStyle = colorPurple;
    ctx.font = `bold ${fontSize * 0.35}px ${fontFamily}`;
    ctx.fillText("WAITING FOR BACK-UP", boxX + 20, rightY + 5);

    // Reset Font and move down
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    rightY += lineHeight * 1.2;
  });

  // ---- DECORATION ----
  // Maybe some random hex or grid lines in background to make it look technical
  ctx.strokeStyle = "#111133";
  ctx.lineWidth = 1;
  for (let i = 0; i < height; i += 40) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(width, i);
    ctx.stroke();
  }

  // Create Texture
  const texture = new THREE.CanvasTexture(canvas);
  // texture.wrapS = THREE.RepeatWrapping;
  // texture.wrapT = THREE.RepeatWrapping;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;

  return texture;
}

export const GarbageShader = {
  vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        
        void main() {
            vUv = uv;
            vNormal = normal;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
  fragmentShader: `
        uniform sampler2D uTexture;
        uniform float uTime;
        
        varying vec2 vUv;
        varying vec3 vNormal;

        // Scanline function
        float scanline(vec2 uv) {
            return sin(uv.y * 800.0) * 0.1 + 0.9;
        }

        void main() {
            vec2 uv = vUv;
            
            // Adjust UV to fit texture aspect ratio if needed, or assume texture matches face.
            // Since we generated a tall texture (1:2), and faces are tall (6:15 -> 1:2.5), it fits decent.
            
            // Texture sample
            vec4 texColor = texture2D(uTexture, uv);
            
            // Scanlines
            float s = scanline(uv);
            
            // Subtle flicker global
            float flicker = 0.95 + 0.05 * sin(uTime * 20.0);
            
            // Identify Purple (Garbage Text & Files) vs Cyan (Normal List)
            // Purple: #ab49e3 (High R, Low G, High B)
            // Cyan:   #95f6f4 (High G, High B)
            bool isPurple = (texColor.g < 0.5 && texColor.r > 0.4);
            
            float blink = 1.0;
            if (isPurple) {
                // Blink Effect: 2Hz
                // Use square wave or sharp sine for digital feel
                float blinkPhase = sin(uTime * 8.0);
                if (blinkPhase > 0.0) {
                    blink = 1.8; // Bright
                } else {
                    blink = 0.5; // Dim
                }
            }

            // Boost brightness for Bloom
            vec3 color = texColor.rgb * 1.5 * s * flicker * blink;

            // Mask out black background for transparency (optional)
            float alpha = texColor.a;
            if (texColor.r < 0.1 && texColor.g < 0.1 && texColor.b < 0.1) {
                // Keep background slightly visible (dark glass effect)
                color = vec3(0.05, 0.0, 0.1); // Deep purple tint
                alpha = 0.8;
            } else {
                alpha = 0.9;
            }

            gl_FragColor = vec4(color, alpha);
        }
    `,
};
