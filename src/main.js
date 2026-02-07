import "./style.css";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { createDataTexture, DataFlowShader } from "./DataTexture.js";
import { createCircuitTexture, FloorShader } from "./CircuitTexture.js";
import { createGarbageTexture, GarbageShader } from "./GarbageTexture.js";
import { initMusicPlayer } from "./MusicPlayer.js";
import {
  initLeaderboard,
  submitScore,
  getTopScores,
  formatTime,
} from "./Leaderboard.js";

// --- Configuration ---
const CONFIG = {
  colors: {
    background: 0x050510,
    floorBase: 0x0a0a1a,
    floorHighlight: 0x1b4ac2, 
    pillarBase: 0x111122,
    pillarData: 0xbf00ff, 
  },
  bloom: {
    strength: 0.5, // Reduced from 2.0 to make text legible
    radius: 0.2, // Slightly softer to avoid harsh halo
    threshold: 0.2, // Only very bright things glow
  },
};

// --- Scene Setup ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.colors.background);
scene.fog = new THREE.FogExp2(CONFIG.colors.background, 0.002);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000,
);
camera.position.set(0, 60, 80);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ReinhardToneMapping;
document.querySelector("#app").appendChild(renderer.domElement);

// --- Controls ---
// Custom Flight/FPS Control State
const inputState = {
  isDragging: false,
  prevMouse: { x: 0, y: 0 },
  yaw: 0,
  pitch: 0,
};

// Mouse Events for Desktop Look
renderer.domElement.addEventListener("mousedown", (e) => {
  if (appState !== "RUNNING") return;
  inputState.isDragging = true;
  inputState.prevMouse.x = e.clientX;
  inputState.prevMouse.y = e.clientY;
});

window.addEventListener("mouseup", () => {
  inputState.isDragging = false;
});

window.addEventListener("mousemove", (e) => {
  if (appState !== "RUNNING" || !inputState.isDragging) return;

  const dx = e.clientX - inputState.prevMouse.x;
  const dy = e.clientY - inputState.prevMouse.y;

  // Update Rotation (Sensitivity 0.002)
  inputState.yaw -= dx * 0.002;
  inputState.pitch -= dy * 0.002;

  // Clamp Pitch
  inputState.pitch = Math.max(
    -Math.PI / 2 + 0.1,
    Math.min(Math.PI / 2 - 0.1, inputState.pitch),
  );

  inputState.prevMouse.x = e.clientX;
  inputState.prevMouse.y = e.clientY;
});

// Setup Rotation Order for FPS feel
camera.rotation.order = "YXZ";

// Touch Events for Mobile Look (Drag anywhere outside joystick)
let activeLookTouchId = null;

window.addEventListener(
  "touchstart",
  (e) => {
    if (appState !== "RUNNING") return;

    // Check if touch started on a UI control to avoid conflict
    if (
      e.target.closest(".virtual-stick-zone") ||
      e.target.closest("button") ||
      e.target.closest("#garbage-modal")
    )
      return;

    // Use the first available touch for looking
    if (activeLookTouchId === null) {
      const t = e.changedTouches[0];
      activeLookTouchId = t.identifier;
      inputState.prevMouse.x = t.clientX;
      inputState.prevMouse.y = t.clientY;
    }
  },
  { passive: false },
);

window.addEventListener("touchend", (e) => {
  for (let i = 0; i < e.changedTouches.length; i++) {
    if (e.changedTouches[i].identifier === activeLookTouchId) {
      activeLookTouchId = null;
      break;
    }
  }
});

window.addEventListener(
  "touchmove",
  (e) => {
    if (appState !== "RUNNING" || activeLookTouchId === null) return;

    // Find our active touch
    let t = null;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === activeLookTouchId) {
        t = e.changedTouches[i];
        break;
      }
    }

    if (!t) return;

    const dx = t.clientX - inputState.prevMouse.x;
    const dy = t.clientY - inputState.prevMouse.y;

    // Touch Sensitivity
    const touchSens = 0.004;
    inputState.yaw -= dx * touchSens;
    inputState.pitch -= dy * touchSens;

    inputState.pitch = Math.max(
      -Math.PI / 2 + 0.1,
      Math.min(Math.PI / 2 - 0.1, inputState.pitch),
    );

    inputState.prevMouse.x = t.clientX;
    inputState.prevMouse.y = t.clientY;
  },
  { passive: false },
);

// --- Lighting ---
const ambientLight = new THREE.AmbientLight(0x404040, 2); // Soft white light
scene.add(ambientLight);

const pointLight = new THREE.PointLight(0xff00ff, 2, 50);
pointLight.position.set(0, 10, 0);
scene.add(pointLight);

// --- Placeholders (To be replaced with detailed implementations) ---

const gridCols = 80;
const gridRows = 40;
const spacing = 16; // Increased from 10 to 16 to create wide alleys for cables
const boxWidth = 6;
const boxHeight = 15; // "Skyscrapers"

// 1. Motherboard Floor (Custom Shader)
// Sized exactly to city grid + small margin
const floorWidth = gridCols * spacing + 20; // ~1300
const floorDepth = gridRows * spacing + 20; // ~660
const floorGeometry = new THREE.PlaneGeometry(floorWidth, floorDepth, 100, 50);
const circuitTexture = createCircuitTexture();

const floorMaterial = new THREE.ShaderMaterial({
  vertexShader: FloorShader.vertexShader,
  fragmentShader: FloorShader.fragmentShader,
  uniforms: {
    uTexture: { value: circuitTexture },
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(CONFIG.colors.floorHighlight) },
    uFloorSize: { value: new THREE.Vector2(floorWidth, floorDepth) }, // Must match geometry size
    uSpacing: { value: spacing },
    uBoxWidth: { value: boxWidth },
  },
  transparent: false,
  side: THREE.DoubleSide,
});
const floor = new THREE.Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// 2. Pillars (Grid Layout)
const pillarGroup = new THREE.Group();
scene.add(pillarGroup);

const geometry = new THREE.BoxGeometry(boxWidth, boxHeight, boxWidth);

// Initialize Shader
const dataTexture = createDataTexture();

// --- Material Palette Generation ---
const neonColors = [
  0xc692ff, // Neon Lilac
  0x98fce8, // Neon Aqua
  0x4d8dff, // Neon Sky Blue (Darkened)
];

// Store materials in buckets by primary color index so we can pick variations
const materialsByColor = []; // [ [ {face, edge}, ... ], ... ]

// For each primary color, generate multiple variations with different secondary/tertiary accents
neonColors.forEach((colorHex, pIndex) => {
  materialsByColor[pIndex] = [];

  // Create 8 variations per primary color
  for (let i = 0; i < 8; i++) {
    const col = new THREE.Color(colorHex);

    // Randomly pick 2 OTHER colors from the palette for accents
    const otherIndices = neonColors
      .map((_, idx) => idx)
      .filter((idx) => idx !== pIndex);

    // Shuffle to pick random secondary/tertiary
    const idx2 = otherIndices.splice(
      Math.floor(Math.random() * otherIndices.length),
      1,
    )[0];
    const idx3 = otherIndices.splice(
      Math.floor(Math.random() * otherIndices.length),
      1,
    )[0];

    const col2 = new THREE.Color(neonColors[idx2]);
    const col3 = new THREE.Color(neonColors[idx3]);

    // Shader Material for Building Faces
    const mat = new THREE.ShaderMaterial({
      vertexShader: DataFlowShader.vertexShader,
      fragmentShader: DataFlowShader.fragmentShader,
      uniforms: {
        uTexture: { value: dataTexture },
        uTime: { value: 0 },
        uColor: { value: col },
        uColor2: { value: col2 },
        uColor3: { value: col3 },
        uBorderColor: { value: col },
        uSpeed: { value: 0.1 },
      },
      transparent: true,
      side: THREE.FrontSide,
    });

    // Line Material for Wireframe Edges
    const edgeMat = new THREE.LineBasicMaterial({
      color: col,
      transparent: true,
      opacity: 0.4,
    });

    materialsByColor[pIndex].push({ face: mat, edge: edgeMat });
  }
});

// --- Garbage Column Setup ---
const garbageTexture = createGarbageTexture();
const garbageMaterial = new THREE.ShaderMaterial({
  vertexShader: GarbageShader.vertexShader,
  fragmentShader: GarbageShader.fragmentShader,
  uniforms: {
    uTexture: { value: garbageTexture },
    uTime: { value: 0 },
  },
  transparent: true,
  side: THREE.FrontSide, // FrontSide to show correctly
});

const garbageEdgeMaterial = new THREE.LineBasicMaterial({
  color: 0xab49e3, // Purple match
  transparent: true,
  opacity: 0.8,
});

const garbageBaseMaterial = new THREE.MeshBasicMaterial({
  color: 0x020205,
  transparent: true,
  opacity: 0.8,
});

// Center the grid
const startX = -((gridCols - 1) * spacing) / 2;
const startZ = -((gridRows - 1) * spacing) / 2;

// Utility to match Shader's pseudo-random logic
function getShaderSeed(x, z) {
  const dot = x * 12.9898 + z * 78.233;
  const sinVal = Math.sin(dot);
  const prod = sinVal * 43758.5453;
  const fract = prod - Math.floor(prod);
  return fract;
}

// Pick random coordinates for Garbage Column
let garbageR, garbageC;
let garbageMesh = null; // Store reference for raycasting
let attempts = 0;
do {
  garbageR = Math.floor(Math.random() * gridRows);
  garbageC = Math.floor(Math.random() * gridCols);

  const testX = startX + garbageC * spacing;
  const testZ = startZ + garbageR * spacing;
  const seed = getShaderSeed(testX, testZ);

  // Needs to be:
  // 1. Not in void
  // 2. Static (seed < 0.45)
  const isVoid =
    (garbageR === 3 || garbageR === 4) && (garbageC === 7 || garbageC === 8);
  const isStatic = seed < 0.45;

  if (!isVoid && isStatic) {
    break;
  }
} while (attempts++ < 1000); // Safety break

// Shared edges geometry (optimization)
const edgesGeometry = new THREE.EdgesGeometry(geometry);

for (let r = 0; r < gridRows; r++) {
  for (let c = 0; c < gridCols; c++) {
    // Calculate Gradient Logic for current cell (Moved logic up)
    const noise = (Math.random() - 0.5) * 20.0;
    let gradientPos = (c + noise) / gridCols;
    gradientPos = Math.max(0.0, Math.min(0.999, gradientPos));
    const themeIndex = Math.floor(gradientPos * neonColors.length);

    // Pick standard material set for this location
    const variations = materialsByColor[themeIndex];
    const selectedSet =
      variations[Math.floor(Math.random() * variations.length)];
    const selectedMaterial = selectedSet.face;
    const selectedEdgeMaterial = selectedSet.edge;

    // Check for Garbage Column
    if (r === garbageR && c === garbageC) {
      // Random side for garbage texture (never top/bottom: 2,3)
      // 0:+x, 1:-x, 4:+z, 5:-z
      const validSides = [0, 1, 4, 5];
      const sideIndex =
        validSides[Math.floor(Math.random() * validSides.length)];

      // Use the LOCAL theme material for full camouflage!
      const baseMat = selectedMaterial;

      // Fill all sides with base code material first
      const garbageMaterials = Array(6).fill(baseMat);

      // Override ONE specific face with the Garbage Shader
      garbageMaterials[sideIndex] = garbageMaterial;

      // Note: For top/bottom (2,3), we might want a simple basic material or keep code
      // Let's stick with code for now, maybe use garbageBaseMaterial only for top?
      garbageMaterials[2] = garbageBaseMaterial; // Top
      garbageMaterials[3] = garbageBaseMaterial; // Bottom

      const mesh = new THREE.Mesh(geometry, garbageMaterials);
      mesh.position.set(
        startX + c * spacing,
        boxHeight / 2,
        startZ + r * spacing,
      );
      mesh.userData = { isGarbage: true }; // Tag for easy identification
      garbageMesh = mesh; // Store reference
      pillarGroup.add(mesh);

      // Add physical wireframe border
      // Use the LOCAL theme edge material for camouflage!
      const edges = new THREE.LineSegments(edgesGeometry, selectedEdgeMaterial);
      mesh.add(edges);
      continue;
    }

    // Skip center block to create the "System Command Shell" void from the reference
    if ((r === 3 || r === 4) && (c === 7 || c === 8)) continue;

    // Standard Building Creation (Re-using calculated materials)
    const mesh = new THREE.Mesh(geometry, selectedMaterial);
    mesh.position.set(
      startX + c * spacing,
      boxHeight / 2, // Sit on floor
      startZ + r * spacing,
    );
    pillarGroup.add(mesh);

    // Add physical wireframe border
    const edges = new THREE.LineSegments(edgesGeometry, selectedEdgeMaterial);
    mesh.add(edges);
  }
}

// --- Post Processing ---
const renderScene = new RenderPass(scene, camera);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  CONFIG.bloom.strength,
  CONFIG.bloom.radius,
  CONFIG.bloom.threshold,
);

const composer = new EffectComposer(renderer);
composer.addPass(renderScene);
composer.addPass(bloomPass);

// --- Resize Handler ---
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
});

// --- INPUT HANDLING (Keyboard & Touch) ---

// 1. Keyboard State
const keyState = {
  w: false,
  a: false,
  s: false,
  d: false,
  q: false, // Turn Left
  e: false, // Turn Right
  ArrowUp: false,
  ArrowLeft: false,
  ArrowDown: false,
  ArrowRight: false,
  Shift: false,
  Space: false,
};

window.addEventListener("keydown", (e) => {
  const k = e.key.toLowerCase();
  if (keyState.hasOwnProperty(k) || k === " " || e.shiftKey) {
    keyState[k] = true;
    if (k === " ") keyState.Space = true;
    if (e.shiftKey) keyState.Shift = true;
  }
});

window.addEventListener("keyup", (e) => {
  const k = e.key.toLowerCase();
  if (keyState.hasOwnProperty(k) || k === " " || !e.shiftKey) {
    keyState[k] = false;
    if (k === " ") keyState.Space = false;
    if (!e.shiftKey) keyState.Shift = false;
  }
});

// 2. Virtual Joysticks (Mobile)
const moveJoystick = { x: 0, y: 0, active: false };

// Inject Elements
function createStick(id, label) {
  const el = document.createElement("div");
  el.id = id;
  el.className = "virtual-stick-zone";
  el.innerHTML = `<div class="stick-label">${label}</div><div class="stick-base"><div class="stick-knob"></div></div>`;
  document.body.appendChild(el);
  return el;
}

const moveZone = createStick("stick-move", "MOVE");
const maxDist = 35; // Max drag radius

function handleJoystick(zone, dataObj) {
  const knob = zone.querySelector(".stick-knob");

  const update = (e) => {
    if (!dataObj.active) return;
    e.preventDefault();
    // find touch from this zone start?
    // For multi-touch, we need to track identifier, but simple approximation:
    // Use the touch that is closest to center of this zone
    const rect = zone.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Find correct touch
    let targetTouch = null;
    for (let i = 0; i < e.touches.length; i++) {
      const t = e.touches[i];
      const dist = Math.sqrt(
        Math.pow(t.clientX - centerX, 2) + Math.pow(t.clientY - centerY, 2),
      );
      if (dist < 150) {
        // Reasonable grab distance
        targetTouch = t;
        break;
      }
    }

    if (!targetTouch) return;

    let dx = targetTouch.clientX - centerX;
    let dy = targetTouch.clientY - centerY;

    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > maxDist) {
      dx = (dx / dist) * maxDist;
      dy = (dy / dist) * maxDist;
    }

    knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    dataObj.x = dx / maxDist;
    dataObj.y = dy / maxDist;
  };

  const reset = () => {
    dataObj.active = false;
    dataObj.x = 0;
    dataObj.y = 0;
    knob.style.transform = `translate(-50%, -50%)`;
  };

  zone.addEventListener(
    "touchstart",
    (e) => {
      dataObj.active = true;
      e.preventDefault();
    },
    { passive: false },
  );
  zone.addEventListener("touchmove", update, { passive: false });
  zone.addEventListener("touchend", reset);
  zone.addEventListener("touchcancel", reset);
}

handleJoystick(moveZone, moveJoystick);
// handleJoystick(lookZone, lookJoystick);

// --- APP STATE & INTRO UI ---
let appState = "LOADING"; // LOADING, MENU, INTRO, RUNNING
let musicControls = null;
let introStartTime = 0;
const introDuration = 5.0; // Seconds
let gameStartTime = 0; // Tracks when player starts controlling
let gameEndTime = 0;
let isGameCompleted = false;

// Initialize Leaderboard
initLeaderboard();

// Camera Fly-in Config relative to City Center
const camStartPos = new THREE.Vector3(0, 500, 1000); // High Front view
const camEndPos = new THREE.Vector3(128, 2, 0); // Land on main horizontal avenue
const targetStart = new THREE.Vector3(0, 0, 0);
const targetEnd = new THREE.Vector3(100, 2, 0); // Look closely just ahead (Dist=28 < MaxDist=200)

// UI DOM
const uiOverlay = document.getElementById("ui-overlay");

// --- Garbage Modal (Separate from Intro UI to avoid display:none issues) ---
const garbageModal = document.getElementById("garbage-modal");

// --- Garbage Animation Logic (Plasma Effect) ---
let garbageCtx = null;
let garbageTime = 0;
let garbageProgress = 0; // Added missing variable
let isGarbageAnimating = false;

// --- Leaderboard Helper Function ---
function openLeaderboard() {
  // Ensure the container is visible
  garbageModal.classList.remove("hidden");
  garbageModal.style.pointerEvents = "auto";
  isGarbageAnimating = false;

  // Hide garbage specific UI so it doesn't bleed through or flash
  document.getElementById("garbage-ui-container").classList.add("hidden");

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
  lbLoader.style.display = "block";
  lbLoadMore.style.display = "none";

  let currentOffset = 0;
  let isLoading = false;
  let hasMore = true;

  async function loadScores() {
    if (isLoading || !hasMore) return;

    isLoading = true;
    lbLoader.style.display = "block";

    const scores = await getTopScores(50, currentOffset);

    lbLoader.style.display = "none";
    isLoading = false;

    if (scores.length < 50) {
      hasMore = false;
      lbLoadMore.style.display = "none";
    } else {
      lbLoadMore.style.display = "block";
    }

    scores.forEach((s, idx) => {
      const i = currentOffset + idx;
      const tr = document.createElement("tr");

      const rank = (i + 1).toString().padStart(2, "0");

      tr.innerHTML = `
                <td class="lb-col-rank">${rank}</td>
                <td class="lb-col-alias">${s.alias}</td>
                <td class="lb-col-time">${formatTime(s.time_ms)}</td>
            `;
      tbody.appendChild(tr);
    });

    currentOffset += scores.length;
  }

  loadScores();

  const loadMoreBtn = lbLoadMore.querySelector("button");
  if (loadMoreBtn && !loadMoreBtn.hasAttribute("data-listener")) {
    loadMoreBtn.setAttribute("data-listener", "true");
    loadMoreBtn.addEventListener("click", loadScores);
  }

  if (!leaderboardDisplay.hasAttribute("data-scroll-listener")) {
    leaderboardDisplay.setAttribute("data-scroll-listener", "true");
    leaderboardDisplay.addEventListener("scroll", () => {
      const scrollTop = leaderboardDisplay.scrollTop;
      const scrollHeight = leaderboardDisplay.scrollHeight;
      const clientHeight = leaderboardDisplay.clientHeight;

      if (
        scrollTop + clientHeight >= scrollHeight - 100 &&
        hasMore &&
        !isLoading
      ) {
        loadScores();
      }
    });
  }
}

// Plasma Palette (Index 0-255)
const palette = [];
for (let i = 0; i < 256; i++) {
  // Simple colorful mapping
  // We want regions of Blue -> Red -> Yellow -> Green
  const r = Math.floor(128 + 128 * Math.sin((Math.PI * i) / 32));
  const g = Math.floor(128 + 128 * Math.sin((Math.PI * i) / 64));
  const b = Math.floor(128 + 128 * Math.sin((Math.PI * i) / 128));
  palette.push(`rgb(${r},${g},${b})`);
}

function initGarbageAnim() {
  const canvas = document.getElementById("garbage-canvas");
  // Low res for retro plasma effect
  canvas.width = 160;
  canvas.height = 100;
  garbageCtx = canvas.getContext("2d", { willReadFrequently: true });
}

function updateGarbageModal() {
  if (!isGarbageAnimating || !garbageCtx) return;

  garbageTime += 0.02;
  const w = garbageCtx.canvas.width;
  const h = garbageCtx.canvas.height;

  // Draw Plasma
  // Get image data to manipulate pixels directly?
  // JS loops are slow. Let's use larger blocks or just simplified math.
  // 160x100 is 16000 pixels. JS can handle this per frame easily.

  const imgData = garbageCtx.getImageData(0, 0, w, h);
  const data = imgData.data;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      // Plasma Math
      let v = Math.sin(x * 0.05 + garbageTime);
      v += Math.sin(y * 0.05 + garbageTime);
      v += Math.sin((x + y) * 0.05 + garbageTime);
      v += Math.sin(Math.sqrt(x * x + y * y) * 0.05 + garbageTime);
      // v is roughly -4 to 4. Map to 0-255?

      const colorIndex = Math.floor((v + 4) * 32) % 256;

      // Map Index to RGB
      // Optimization: Pre-calculate palette or calc on fly
      // Let's do a hot-colors look: Red, Blue, Yellow, Green
      // sin maps to -1..1

      const r = 128 + 127 * Math.sin(v * Math.PI);
      const g = 128 + 127 * Math.sin(v * Math.PI + (2 * Math.PI) / 3);
      const b = 128 + 127 * Math.sin(v * Math.PI + (4 * Math.PI) / 3);

      const index = (y * w + x) * 4;
      data[index] = r; // R
      data[index + 1] = g; // G
      data[index + 2] = b; // B
      data[index + 3] = 255; // Alpha
    }
  }

  garbageCtx.putImageData(imgData, 0, 0);

  // 3. Update Progress Bar
  if (garbageProgress < 100) {
    garbageProgress += 0.15 + Math.random() * 0.35; // Moderate copy speed
    if (garbageProgress > 100) garbageProgress = 100;

    // Update DOM
    document.getElementById("garbage-bar").style.width = garbageProgress + "%";
  } else {
    // Done
    if (!isGameCompleted) {
      document.getElementById("garbage-status").innerText = "COMPLETED";

      // End Timer
      gameEndTime = performance.now();
      isGameCompleted = true;

      // Show Form
      document.getElementById("leaderboard-form").classList.remove("hidden");
    }
  }

  requestAnimationFrame(updateGarbageModal);
}

// Handler for Submit Score
document
  .getElementById("btn-submit-score")
  .addEventListener("click", async () => {
    const aliasInput = document.getElementById("alias-input");
    const alias = aliasInput.value.trim() || "ANONYMOUS";
    const timeMs = Math.floor(gameEndTime - gameStartTime);

    // Disable UI
    document.getElementById("btn-submit-score").innerText = "UPLOADING...";
    document.getElementById("btn-submit-score").disabled = true;

    // Submit
    await submitScore(alias, timeMs);

    // Show Loader
    const tbody = document.getElementById("leaderboard-body");
    tbody.innerHTML = "";
    const lbLoader = document.getElementById("lb-loader");
    const lbLoadMore = document.getElementById("lb-load-more");
    lbLoader.style.display = "block";
    lbLoadMore.style.display = "none";

    // Switch Views Early
    document.getElementById("leaderboard-form").classList.add("hidden");
    document.getElementById("garbage-status").innerText = "UPLOAD VERIFIED";
    
    // Ensure parent modal is visible
    garbageModal.classList.remove("hidden");
    garbageModal.style.pointerEvents = "auto";
    isGarbageAnimating = false;
    
    // Hide garbage UI
    document.getElementById("garbage-ui-container").classList.add("hidden");

    const leaderboardDisplay = document.getElementById("leaderboard-display");
    leaderboardDisplay.classList.remove("hidden");
    leaderboardDisplay.style.display = "flex";
    leaderboardDisplay.style.flexDirection = "column";
    leaderboardDisplay.style.alignItems = "center";

    // Pagination state
    let currentOffset = 0;
    let isLoading = false;
    let hasMore = true;

    // Function to load scores
    async function loadScores(append = false) {
      if (isLoading || !hasMore) return;

      isLoading = true;
      lbLoader.style.display = "block";

      const scores = await getTopScores(50, currentOffset); // Fetch 50 at a time with offset

      lbLoader.style.display = "none";
      isLoading = false;

      if (scores.length < 50) {
        hasMore = false;
        lbLoadMore.style.display = "none";
      } else {
        lbLoadMore.style.display = "block";
      }

      // Render scores
      scores.forEach((s, idx) => {
        const i = currentOffset + idx;
        const tr = document.createElement("tr");
        const isMe = s.alias === alias && Math.abs(s.time_ms - timeMs) < 100;
        const color = isMe ? "#00ffff" : "#fff";
        const bg = isMe ? "rgba(0, 255, 255, 0.1)" : "transparent";

        const rank = (i + 1).toString().padStart(2, "0");

        tr.innerHTML = `
                <td class="lb-col-rank" style="color: #666; background: ${bg};">${rank}</td>
                <td class="lb-col-alias" style="color: ${color}; font-weight: ${isMe ? "bold" : "normal"}; background: ${bg}; text-transform: uppercase;">${s.alias}</td>
                <td class="lb-col-time" style="color: ${color}; background: ${bg};">${formatTime(s.time_ms)}</td>
            `;
        tbody.appendChild(tr);
      });

      currentOffset += scores.length;
    }

    // Load initial scores
    await loadScores();

    // Load more button
    document
      .getElementById("lb-load-more")
      .querySelector("button")
      .addEventListener("click", loadScores);

    // Infinite scroll - reuse leaderboardDisplay from above
    leaderboardDisplay.addEventListener("scroll", () => {
      const scrollTop = leaderboardDisplay.scrollTop;
      const scrollHeight = leaderboardDisplay.scrollHeight;
      const clientHeight = leaderboardDisplay.clientHeight;

      if (
        scrollTop + clientHeight >= scrollHeight - 100 &&
        hasMore &&
        !isLoading
      ) {
        loadScores();
      }
    });
  });

/* 
document.getElementById("btn-lb-close").addEventListener("click", () => {
     // Close everything
    garbageModal.classList.add("hidden");
    garbageModal.style.pointerEvents = "none";
    isGarbageAnimating = false;
    
    // Reset for potential replay? (Or just force reload)
    window.location.reload(); 
});
*/

// Logic
function updateLoader(pct) {
  document.getElementById("load-bar").style.width = pct + "%";
  document.getElementById("load-text").innerText =
    "LOADING MODULES... " + pct + "%";
  if (pct >= 100) {
    setTimeout(() => {
      appState = "MENU";
      document.getElementById("loading-screen").style.display = "none";
      document.getElementById("start-screen").style.display = "block";
    }, 500);
  }
}

// Simulated Load
let loadPct = 0;
const loadInterval = setInterval(() => {
  loadPct += Math.floor(Math.random() * 5) + 2;
  if (loadPct > 100) {
    loadPct = 100;
    clearInterval(loadInterval);
  }
  updateLoader(loadPct);
}, 100);

// Menu Handlers
let soundEnabled = false;

function showInstructions(enableSound) {
  soundEnabled = enableSound;
  document.getElementById("start-screen").style.display = "none";
  document.getElementById("instructions-screen").style.display = "block";
}

function startGame() {
  // 1. Handle Music
  if (musicControls) {
    if (soundEnabled) {
      musicControls.setVolume(50);
      musicControls.play();
    } else {
      musicControls.setVolume(0);
    }
    setTimeout(() => musicControls.show(), 500);
  }

  // 2. Start Intro
  document.getElementById("ui-overlay").classList.add("hidden");
  setTimeout(() => (uiOverlay.style.display = "none"), 1000);

  appState = "INTRO";
  introStartTime = clock.getElapsedTime();

  // Reset Camera
  camera.position.copy(camStartPos);
  camera.lookAt(targetStart);
}

document
  .getElementById("btn-sound-yes")
  .addEventListener("click", () => showInstructions(true));
document
  .getElementById("btn-sound-no")
  .addEventListener("click", () => showInstructions(false));
document.getElementById("btn-enter").addEventListener("click", startGame);

// Garbage Modal Handlers
// (garbageModal is already defined above)
document.getElementById("btn-garbage-close").addEventListener("click", (e) => {
  e.stopPropagation(); 
  garbageModal.classList.add("hidden");
  garbageModal.style.pointerEvents = "none";
  isGarbageAnimating = false; 
  window.location.reload();
});

document.getElementById("btn-lb-close").addEventListener("click", () => {
  // Close leaderboard
  document.getElementById("leaderboard-display").classList.add("hidden");

  // Hide the parent modal as well to ensure clean exit
  garbageModal.classList.add("hidden");
  garbageModal.style.pointerEvents = "none";

  // If we are in MENU or INTRO, stay there
  if (appState === "MENU" || appState === "INTRO") {
    document.getElementById("ui-overlay").style.display = "flex";
    document.getElementById("instructions-screen").style.display = "flex";
  } else if (appState === "RUNNING") {
    // Resume play - ensure main menu is hidden
  } else {
    // Completed game state or other
    window.location.reload();
  }
});

function triggerGarbageSequence() {
  // Show Modal
  garbageModal.classList.remove("hidden");
  garbageModal.style.pointerEvents = "auto";

  // Ensure Garbage UI is visible (might have been hidden by leaderboard)
  document.getElementById("garbage-ui-container").classList.remove("hidden");

  // Start Animation
  initGarbageAnim();
  garbageProgress = 0;
  isGarbageAnimating = true;
  document.getElementById("btn-garbage-close").classList.add("hidden");
  document.getElementById("garbage-status").innerText = "Copying";
  document.getElementById("garbage-status").style.color = "#000";
  document.getElementById("garbage-status").style.backgroundColor = ""; // Reset
  document.getElementById("garbage-bar").style.width = "0%";

  // Reset Form
  document.getElementById("leaderboard-form").classList.add("hidden");

  updateGarbageModal();
}

// Raycaster for interactions
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener("click", (event) => {
  // Check for Main Menu Leaderboard Button Click
  if (event.target.id === "btn-menu-leaderboard") {
    openLeaderboard();
    return;
  }

  // Only raycast if game is running and modal is closed
  if (appState !== "RUNNING" || !garbageModal.classList.contains("hidden"))
    return;

  // Calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);

  // Intersect objects
  // Since we enabled controls, raycast might be tricky if user dragged.
  // Ideally we check if it was a drag or a click, but simple click is ok for now.

  // Check intersection with pillarGroup children
  const intersects = raycaster.intersectObjects(pillarGroup.children);

  for (let i = 0; i < intersects.length; i++) {
    // Check if we hit the garbage mesh
    // We tagged it with userData.isGarbage
    if (intersects[i].object.userData.isGarbage) {
      triggerGarbageSequence();
      break;
    }
  }
});

// --- Animation Loop ---
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsedTime = clock.getElapsedTime();

  // --- GLOBAL VISUAL UPDATES ---
  // Keep city alive in all states
  materialsByColor.forEach((variations) => {
    variations.forEach((set) => {
      set.face.uniforms.uTime.value = elapsedTime;
    });
  });
  floorMaterial.uniforms.uTime.value = elapsedTime;
  if (garbageMaterial) garbageMaterial.uniforms.uTime.value = elapsedTime;

  // Blink Garbage Edges
  if (garbageEdgeMaterial) {
    garbageEdgeMaterial.opacity = 0.5 + 0.5 * Math.sin(elapsedTime * 8.0); // Sync with shader
  }

  // --- STATE 1: LOADING / MENU (Idle Rotation) ---
  if (appState === "LOADING" || appState === "MENU") {
    const angle = elapsedTime * 0.1;
    const radius = 600;
    camera.position.x = Math.sin(angle) * radius;
    camera.position.z = Math.cos(angle) * radius;
    camera.position.y = 300;
    camera.lookAt(0, 0, 0);

    composer.render();
    return;
  }

  // --- STATE 2: INTRO (Fly-in Animation) ---
  if (appState === "INTRO") {
    const timeSinceStart = elapsedTime - introStartTime;
    let progress = timeSinceStart / introDuration;

    if (progress >= 1.0) {
      // Transition to RUNNING state
      appState = "RUNNING";

      // 1. Force Camera to Final Position immediately to avoid frame-gap
      camera.position.copy(camEndPos);
      camera.lookAt(targetEnd);

      // 2. Handover to Manual Controls based on FINAL orientation
      // Sync rotation exactly to avoiding "popping" 
      camera.rotation.setFromQuaternion(camera.quaternion, "YXZ");
      inputState.pitch = camera.rotation.x;
      inputState.yaw = camera.rotation.y;

      // 3. (Optional) Explicitly set it back to ensure state consistency
      camera.rotation.set(inputState.pitch, inputState.yaw, 0, "YXZ");

      // 4. Start Timer & Render exact frame
      gameStartTime = performance.now();
      composer.render();
      return;
    }

    // Cubic Ease Out
    const t = 1 - Math.pow(1 - progress, 3);

    camera.position.lerpVectors(camStartPos, camEndPos, t);

    const currentLookAt = new THREE.Vector3().lerpVectors(
      targetStart,
      targetEnd,
      t,
    );
    camera.lookAt(currentLookAt);

    composer.render();
    return;
  }

  // --- STATE 3: RUNNING (Interactive) ---

  // MOVEMENT LOGIC

  // Adaptive Speed: Slightly slower when "inside" the city (Y < 20)
  const baseSpeed = 40.0;
  let currentSpeed = baseSpeed;

  if (camera.position.y < 20.0) {
    currentSpeed = baseSpeed * 0.5; // Reduced speed in "City Mode"
  }

  const moveSpeed = currentSpeed * delta; // Units per second
  const rotSpeed = 1.0 * delta; // Radians per second

  // 1. ROTATION (Yaw - Q/E or Joy or Mouse)
  let dYaw = 0;
  let dPitch = 0;

  // Q/E Keys
  if (keyState.q) dYaw += 1;
  if (keyState.e) dYaw -= 1;

  // Joystick Look (Removed)
  /*
  if (lookJoystick.active) {
      dYaw -= lookJoystick.x * 2.0; 
      dPitch -= lookJoystick.y * 2.0;
  }
  */

  // Apply rotation changes to state
  inputState.yaw += dYaw * rotSpeed;
  inputState.pitch += dPitch * rotSpeed;

  // Clamp Pitch
  inputState.pitch = Math.max(
    -Math.PI / 2 + 0.1,
    Math.min(Math.PI / 2 - 0.1, inputState.pitch),
  );

  // Apply to Camera
  camera.rotation.y = inputState.yaw;
  camera.rotation.x = inputState.pitch;

  // 2. POSITION (Move - W/A/S/D or Left Joystick)
  const dir = new THREE.Vector3();
  const forward = new THREE.Vector3(); // Forward relative to camera
  const right = new THREE.Vector3(); // Right relative to camera

  camera.getWorldDirection(forward);
  forward.normalize();

  right.crossVectors(forward, camera.up).normalize();

  let dx = 0;
  let dz = 0;

  if (keyState.w || keyState.ArrowUp) dz += 1;
  if (keyState.s || keyState.ArrowDown) dz -= 1;
  if (keyState.a || keyState.ArrowLeft) dx -= 1;
  if (keyState.d || keyState.ArrowRight) dx += 1;

  // Dual Joystick - Left Stick
  if (moveJoystick.active) {
    dx += moveJoystick.x;
    dz -= moveJoystick.y;
  }

  // Vertical Input (Fly)
  if (keyState.Space) camera.position.y += moveSpeed;
  if (keyState.Shift) camera.position.y -= moveSpeed;

  if (Math.abs(dx) > 0.01 || Math.abs(dz) > 0.01) {
    dir.addScaledVector(forward, dz);
    dir.addScaledVector(right, dx);
    dir.normalize();

    const moveVec = dir.multiplyScalar(moveSpeed);

    // Move Camera
    camera.position.add(moveVec);
  }

  // COLLISION DETECTION

  // 1. Floor Hard Constraint
  if (camera.position.y < 0.2) camera.position.y = 0.2;

  // 2. Building Collisions
  const collisionHeight = boxHeight + 2.0;
  if (camera.position.y < collisionHeight) {
    const gridX = Math.round((camera.position.x - startX) / spacing);
    const gridZ = Math.round((camera.position.z - startZ) / spacing);

    if (gridX >= 0 && gridX < gridCols && gridZ >= 0 && gridZ < gridRows) {
      if (!((gridZ === 3 || gridZ === 4) && (gridX === 7 || gridX === 8))) {
        const bX = startX + gridX * spacing;
        const bZ = startZ + gridZ * spacing;

        const dx = camera.position.x - bX;
        const dz = camera.position.z - bZ;
        const minDist = boxWidth / 2 + 1.5;

        if (Math.abs(dx) < minDist && Math.abs(dz) < minDist) {
          const penetrationX = minDist - Math.abs(dx);
          const penetrationZ = minDist - Math.abs(dz);

          if (penetrationX < penetrationZ) {
            camera.position.x = bX + (Math.sign(dx) || 1) * minDist;
          } else {
            camera.position.z = bZ + (Math.sign(dz) || 1) * minDist;
          }
        }
      }
    }
  }

  composer.render();
}

animate();

// --- Init Music Player ---
musicControls = initMusicPlayer();

// Re-enable sound if user clicks the player while muted
const playerContainer = document.getElementById('music-player-container');
if (playerContainer) {
  playerContainer.addEventListener('click', () => {
    if (!soundEnabled && musicControls) {
      if (confirm("Enable Audio?")) {
        soundEnabled = true;
        musicControls.setVolume(50);
        musicControls.play();
      }
    }
  });
}
