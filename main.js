const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let GAME_W = 1280, GAME_H = 720;

function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
    GAME_W = window.innerWidth;
    GAME_H = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// --- Pixel-Art SVG Assets ---
const rawSVGs = {
  joystick_base: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><path d="M 20,4 H 44 V 8 H 52 V 12 H 56 V 20 H 60 V 44 H 56 V 52 H 52 V 56 H 44 V 60 H 20 V 56 H 12 V 52 H 8 V 44 H 4 V 20 H 8 V 12 H 12 V 8 H 20 Z" fill="#FFFFFF" /><path d="M 20,8 H 44 V 12 H 52 V 20 H 56 V 44 H 52 V 52 H 44 V 56 H 20 V 52 H 12 V 44 H 8 V 20 H 12 V 12 H 20 Z" fill="#222B14" /><rect x="12" y="12" width="40" height="40" fill="#4A5D23" /><rect x="30" y="16" width="4" height="32" fill="#222B14" /><rect x="16" y="30" width="32" height="4" fill="#222B14" /><rect x="30" y="18" width="4" height="28" fill="#88B04B" opacity="0.6" /><rect x="18" y="30" width="28" height="4" fill="#88B04B" opacity="0.6" /></svg>`,
  joystick_knob: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><path d="M 24,12 H 40 V 16 H 48 V 24 H 52 V 40 H 48 V 48 H 40 V 52 H 24 V 48 H 16 V 40 H 12 V 24 H 16 V 16 H 24 Z" fill="#FFFFFF" /><path d="M 24,16 H 40 V 20 H 44 V 24 H 48 V 40 H 44 V 44 H 40 V 48 H 24 V 44 H 20 V 40 H 16 V 24 H 20 V 20 H 24 Z" fill="#222B14" /><rect x="20" y="20" width="24" height="24" fill="#88B04B" /><rect x="24" y="24" width="16" height="16" fill="#A2D15B" /><rect x="26" y="26" width="6" height="6" fill="#FFFFFF" /></svg>`,
  btn_break: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><path d="M 20,4 H 44 V 8 H 52 V 12 H 56 V 20 H 60 V 44 H 56 V 52 H 52 V 56 H 44 V 60 H 20 V 56 H 12 V 52 H 8 V 44 H 4 V 20 H 8 V 12 H 12 V 8 H 20 Z" fill="#FFFFFF" /><path d="M 20,8 H 44 V 12 H 52 V 20 H 56 V 44 H 52 V 52 H 44 V 56 H 20 V 52 H 12 V 44 H 8 V 20 H 12 V 12 H 20 Z" fill="#222B14" /><rect x="12" y="12" width="40" height="40" fill="#4A5D23" /><rect x="18" y="18" width="28" height="28" fill="#A0A0A0" /><rect x="20" y="20" width="24" height="24" fill="#C0C0C0" /><rect x="30" y="20" width="4" height="6" fill="#222B14" /><rect x="26" y="26" width="6" height="4" fill="#222B14" /><rect x="30" y="30" width="4" height="8" fill="#222B14" /><rect x="34" y="34" width="8" height="4" fill="#222B14" /><rect x="22" y="32" width="6" height="4" fill="#222B14" /><rect x="16" y="24" width="3" height="3" fill="#88B04B" /><rect x="44" y="22" width="3" height="3" fill="#88B04B" /><rect x="42" y="40" width="3" height="3" fill="#88B04B" /></svg>`,
  btn_jump: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><path d="M 20,4 H 44 V 8 H 52 V 12 H 56 V 20 H 60 V 44 H 56 V 52 H 52 V 56 H 44 V 60 H 20 V 56 H 12 V 52 H 8 V 44 H 4 V 20 H 8 V 12 H 12 V 8 H 20 Z" fill="#FFFFFF" /><path d="M 20,8 H 44 V 12 H 52 V 20 H 56 V 44 H 52 V 52 H 44 V 56 H 20 V 52 H 12 V 44 H 8 V 20 H 12 V 12 H 20 Z" fill="#222B14" /><rect x="12" y="12" width="40" height="40" fill="#4A5D23" /><path d="M 32,16 L 46,30 H 38 V 46 H 26 V 30 H 18 Z" fill="#FFFFFF" /><path d="M 32,20 L 42,30 H 36 V 42 H 28 V 30 H 22 Z" fill="#88B04B" /></svg>`,
  btn_craft: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><path d="M 20,4 H 44 V 8 H 52 V 12 H 56 V 20 H 60 V 44 H 56 V 52 H 52 V 56 H 44 V 60 H 20 V 56 H 12 V 52 H 8 V 44 H 4 V 20 H 8 V 12 H 12 V 8 H 20 Z" fill="#FFFFFF" /><path d="M 20,8 H 44 V 12 H 52 V 20 H 56 V 44 H 52 V 52 H 44 V 56 H 20 V 52 H 12 V 44 H 8 V 20 H 12 V 12 H 20 Z" fill="#222B14" /><rect x="12" y="12" width="40" height="40" fill="#4A5D23" /><rect x="18" y="18" width="12" height="12" fill="#FFFFFF" /><rect x="20" y="20" width="8" height="8" fill="#121809" /><rect x="34" y="18" width="12" height="12" fill="#FFFFFF" /><rect x="36" y="20" width="8" height="8" fill="#121809" /><rect x="18" y="34" width="12" height="12" fill="#FFFFFF" /><rect x="20" y="36" width="8" height="8" fill="#121809" /><rect x="34" y="34" width="12" height="12" fill="#FFFFFF" /><rect x="36" y="36" width="8" height="8" fill="#88B04B" /></svg>`,
  btn_inventory: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><path d="M 20,4 H 44 V 8 H 52 V 12 H 56 V 20 H 60 V 44 H 56 V 52 H 52 V 56 H 44 V 60 H 20 V 56 H 12 V 52 H 8 V 44 H 4 V 20 H 8 V 12 H 12 V 8 H 20 Z" fill="#FFFFFF" /><path d="M 20,8 H 44 V 12 H 52 V 20 H 56 V 44 H 52 V 52 H 44 V 56 H 20 V 52 H 12 V 44 H 8 V 20 H 12 V 12 H 20 Z" fill="#222B14" /><rect x="12" y="12" width="40" height="40" fill="#4A5D23" /><rect x="18" y="18" width="28" height="10" fill="#FFFFFF" /><rect x="20" y="20" width="24" height="6" fill="#88B04B" /><rect x="22" y="20" width="4" height="22" fill="#222B14" /><rect x="38" y="20" width="4" height="22" fill="#222B14" /><rect x="22" y="28" width="4" height="4" fill="#FFD700" /><rect x="38" y="28" width="4" height="4" fill="#FFD700" /><rect x="18" y="28" width="28" height="18" fill="#FFFFFF" /><rect x="20" y="30" width="24" height="14" fill="#A2D15B" /></svg>`,
  
  // Frame Windows & Interface
  ui_window: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80" width="100%" height="100%" shape-rendering="crispEdges" preserveAspectRatio="none"><path d="M 8,0 H 112 V 4 H 116 V 8 H 120 V 72 H 116 V 76 H 112 V 80 H 8 V 76 H 4 V 72 H 0 V 8 H 4 V 4 H 8 Z" fill="#FFFFFF" /><path d="M 8,4 H 112 V 8 H 116 V 72 H 112 V 76 H 8 V 72 H 4 V 8 H 8 Z" fill="#222B14" /><rect x="6" y="6" width="108" height="68" fill="#4A5D23" /><rect x="30" y="10" width="60" height="14" fill="#FFFFFF" /><rect x="32" y="12" width="56" height="10" fill="#121809" /><rect x="14" y="28" width="92" height="40" fill="#121809" /><path d="M 14,28 H 106 V 31 H 17 V 68 H 14 Z" fill="#0A0D06" /></svg>`,
  ui_main_menu_frame: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 120" width="100%" height="100%" shape-rendering="crispEdges"><path d="M 8,0 H 152 V 4 H 156 V 8 H 160 V 112 H 156 V 116 H 152 V 120 H 8 V 116 H 4 V 112 H 0 V 8 H 4 V 4 H 8 Z" fill="#FFFFFF" /><path d="M 8,4 H 152 V 8 H 156 V 112 H 152 V 116 H 8 V 112 H 4 V 8 H 8 Z" fill="#222B14" /><rect x="6" y="6" width="148" height="108" fill="#4A5D23" /><rect x="10" y="10" width="8" height="8" fill="#88B04B" /><rect x="142" y="10" width="8" height="8" fill="#88B04B" /><rect x="10" y="102" width="8" height="8" fill="#88B04B" /><rect x="142" y="102" width="8" height="8" fill="#88B04B" /><rect x="35" y="14" width="90" height="18" fill="#FFFFFF" /><rect x="37" y="16" width="86" height="14" fill="#121809" /><rect x="18" y="38" width="124" height="68" fill="#121809" /><path d="M 18,38 H 142 V 41 H 21 V 106 H 18 Z" fill="#0A0D06" /></svg>`,
  recipe_row: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 32" width="100%" height="100%" shape-rendering="crispEdges"><path d="M 4,0 H 156 V 2 H 158 V 4 H 160 V 28 H 158 V 30 H 156 V 32 H 4 V 30 H 2 V 28 H 0 V 4 H 2 V 2 H 4 Z" fill="#FFFFFF" /><path d="M 4,2 H 156 V 4 H 158 V 28 H 156 V 30 H 4 V 28 H 2 V 4 H 4 Z" fill="#222B14" /><rect x="4" y="4" width="152" height="24" fill="#4A5D23" /><rect x="8" y="6" width="20" height="20" fill="#FFFFFF" /><rect x="10" y="8" width="16" height="16" fill="#121809" /><rect x="32" y="6" width="120" height="20" fill="#121809" /></svg>`,
  inventory_slot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><path d="M 8,0 H 56 V 4 H 60 V 8 H 64 V 56 H 60 V 60 H 56 V 64 H 8 V 60 H 4 V 56 H 0 V 8 H 4 V 4 H 8 Z" fill="#FFFFFF" /><path d="M 8,4 H 56 V 8 H 60 V 56 H 56 V 60 H 8 V 56 H 4 V 8 H 8 Z" fill="#222B14" /><rect x="8" y="8" width="48" height="48" fill="#4A5D23" /><rect x="12" y="12" width="40" height="40" fill="#121809" /><path d="M 12,12 H 52 V 16 H 16 V 52 H 12 Z" fill="#0A0D06" /></svg>`,
  hotbar_slot: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><path d="M 8,0 H 56 V 4 H 60 V 8 H 64 V 56 H 60 V 60 H 56 V 64 H 8 V 60 H 4 V 56 H 0 V 8 H 4 V 4 H 8 Z" fill="#FFFFFF" /><path d="M 8,4 H 56 V 8 H 60 V 56 H 56 V 60 H 8 V 56 H 4 V 8 H 8 Z" fill="#222B14" /><rect x="8" y="8" width="48" height="48" fill="#4A5D23" /><rect x="12" y="12" width="40" height="40" fill="#121809" /><path d="M 12,12 H 52 V 16 H 16 V 52 H 12 Z" fill="#0A0D06" /></svg>`,
  hotbar_selector: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><path d="M 8,0 H 56 V 4 H 60 V 8 H 64 V 56 H 60 V 60 H 56 V 64 H 8 V 60 H 4 V 56 H 0 V 8 H 4 V 4 H 8 Z" fill="#FFFFFF" /><path d="M 8,4 H 56 V 8 H 60 V 56 H 56 V 60 H 8 V 56 H 4 V 8 H 8 Z" fill="#A2D15B" /><rect x="10" y="10" width="44" height="44" fill="none" stroke="#222B14" stroke-width="2" /><rect x="12" y="12" width="40" height="40" fill="none" stroke="#88B04B" stroke-width="2" /></svg>`,
  
  // Menu Buttons
  menu_button_start: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 40" width="100%" height="100%" shape-rendering="crispEdges"><path d="M 4,0 H 116 V 2 H 118 V 4 H 120 V 36 H 118 V 38 H 116 V 40 H 4 V 38 H 2 V 36 H 0 V 4 H 2 V 2 H 4 Z" fill="#FFFFFF" /><path d="M 4,2 H 116 V 4 H 118 V 36 H 116 V 38 H 4 V 36 H 2 V 4 H 4 Z" fill="#222B14" /><rect x="4" y="4" width="112" height="32" fill="#4A5D23" /><rect x="6" y="6" width="108" height="4" fill="#6B8532" /></svg>`,
  
  // Items
  item_wood: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><rect x="22" y="22" width="28" height="24" fill="#5C4033" /><rect x="22" y="42" width="28" height="4" fill="#3B2A1A" /><rect x="28" y="26" width="4" height="16" fill="#4A3429" /><rect x="38" y="24" width="4" height="18" fill="#4A3429" /><path d="M 14,22 H 22 V 42 H 14 Z" fill="#8B6914" /><path d="M 16,24 H 20 V 40 H 16 Z" fill="#C49A45" /><rect x="18" y="28" width="2" height="8" fill="#8B6914" /></svg>`,
  item_stone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><path d="M 32,14 L 52,24 L 32,34 L 12,24 Z" fill="#B0B0B0" /><path d="M 12,24 L 32,34 V 50 L 12,40 Z" fill="#808080" /><path d="M 32,34 L 52,24 V 40 L 32,50 Z" fill="#505050" /><path d="M 32,16 L 48,24 L 32,32 L 16,24 Z" fill="#C8C8C8" /><rect x="20" y="30" width="4" height="4" fill="#606060" /></svg>`,
  item_metal: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><rect x="28" y="12" width="8" height="40" fill="#707070" /><rect x="12" y="28" width="40" height="8" fill="#707070" /><rect x="18" y="18" width="28" height="28" fill="#808080" /><rect x="20" y="20" width="24" height="24" fill="#A0A0A0" /><rect x="32" y="22" width="6" height="6" fill="#B85C37" /><rect x="20" y="32" width="6" height="6" fill="#B85C37" /><rect x="26" y="26" width="12" height="12" fill="#222B14" /></svg>`,
  item_fiber: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><path d="M 32,12 C 48,16 52,36 36,48 L 16,52 L 20,32 C 24,16 28,12 32,12 Z" fill="#557A2B" /><path d="M 32,14 C 44,18 48,34 34,44 L 20,48 L 22,32 C 26,18 28,14 32,14 Z" fill="#88B04B" /><path d="M 14,54 L 32,24" stroke="#3B2F1F" stroke-width="3" /><path d="M 26,34 L 34,30" stroke="#A2D15B" stroke-width="2" /><path d="M 22,40 L 30,38" stroke="#A2D15B" stroke-width="2" /></svg>`,
  item_axe: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><rect x="16" y="44" width="4" height="4" fill="#5C4033" /><rect x="20" y="40" width="4" height="4" fill="#5C4033" /><rect x="24" y="36" width="4" height="4" fill="#7A5230" /><rect x="28" y="32" width="4" height="4" fill="#7A5230" /><rect x="32" y="28" width="4" height="4" fill="#99663D" /><rect x="36" y="24" width="4" height="4" fill="#99663D" /><rect x="36" y="16" width="12" height="12" fill="#808080" /><rect x="44" y="12" width="8" height="12" fill="#A0A0A0" /><rect x="48" y="12" width="4" height="4" fill="#FFFFFF" /><rect x="36" y="24" width="6" height="6" fill="#C49A45" /></svg>`,
  item_pickaxe: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><rect x="16" y="44" width="4" height="4" fill="#5C4033" /><rect x="20" y="40" width="4" height="4" fill="#5C4033" /><rect x="24" y="36" width="4" height="4" fill="#7A5230" /><rect x="28" y="32" width="4" height="4" fill="#7A5230" /><rect x="32" y="28" width="4" height="4" fill="#99663D" /><rect x="36" y="24" width="4" height="4" fill="#99663D" /><rect x="34" y="12" width="4" height="6" fill="#808080" /><rect x="38" y="14" width="12" height="8" fill="#A0A0A0" /><rect x="46" y="22" width="8" height="4" fill="#808080" /><rect x="42" y="14" width="4" height="4" fill="#FFFFFF" /></svg>`,
  item_torch: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><rect x="28" y="28" width="8" height="24" fill="#5C4033" /><rect x="30" y="30" width="4" height="22" fill="#7A5230" /><rect x="24" y="16" width="16" height="14" fill="#FF4500" /><rect x="26" y="12" width="12" height="14" fill="#FF8C00" /><rect x="28" y="10" width="8" height="12" fill="#FFD700" /><rect x="30" y="14" width="4" height="4" fill="#FFFFFF" /></svg>`,
  item_campfire: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="128" height="128" shape-rendering="crispEdges"><ellipse cx="32" cy="46" rx="22" ry="10" fill="#505050" /><ellipse cx="32" cy="44" rx="18" ry="8" fill="#222B14" /><rect x="18" y="42" width="28" height="4" transform="rotate(15 32 44)" fill="#5C4033" /><rect x="18" y="42" width="28" height="4" transform="rotate(-15 32 44)" fill="#4A3429" /><path d="M 24,38 C 24,24 32,16 32,16 C 32,16 40,24 40,38 Z" fill="#FF4500" /><path d="M 27,38 C 27,28 32,20 32,20 C 32,20 37,28 37,38 Z" fill="#FF8C00" /><rect x="30" y="30" width="4" height="8" fill="#FFD700" /></svg>`,
  
  // Floating Banners
  feedback_banner: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 140 32" width="100%" height="100%" shape-rendering="crispEdges"><rect x="0" y="0" width="140" height="32" rx="4" fill="#121809" opacity="0.85" /><rect x="2" y="2" width="136" height="28" rx="2" fill="#222B14" opacity="0.9" stroke="#88B04B" stroke-width="2" /></svg>`
};

// --- Asset Preloader ---
const uiAssets = {};
for (const name in rawSVGs) {
    uiAssets[name] = new Image();
    uiAssets[name].src = 'data:image/svg+xml;charset=utf8,' + encodeURIComponent(rawSVGs[name]);
}

function drawUIImage(imgName, cx, cy, size) {
    if (uiAssets[imgName] && uiAssets[imgName].complete) {
        ctx.drawImage(uiAssets[imgName], cx - size/2, cy - size/2, size, size);
    }
}

function drawUIRect(imgName, x, y, w, h) {
    if (uiAssets[imgName] && uiAssets[imgName].complete) {
        ctx.drawImage(uiAssets[imgName], x, y, w, h);
    }
}

// --- Game Engine Setup ---
const game = {
    mapW: 22, mapH: 22, map: [], obstacles: [], entities: [], grassTufts: [], lights: [],
    player: { tx: 11, ty: 11, x: 11.5, z: 11.5, y: 0, jumpY: 0, path: [], state: 'idle', angle: 0, targetAngle: 0 },
    frameCount: 0, destinationMarker: null, pendingInteraction: null,
    inventory: { Wood: 2, Stone: 2, Metal: 0, Fiber: 1, Axe: 0, Pickaxe: 0, Campfire: 0, Torch: 0 },
    feedbackTexts: [], state: 'menu',
    recipes: [
        { name: 'Stone Axe', cost: { Wood: 3, Stone: 2 }, result: 'Axe' },
        { name: 'Stone Pickaxe', cost: { Wood: 2, Stone: 3 }, result: 'Pickaxe' },
        { name: 'Torch', cost: { Wood: 1, Fiber: 1 }, result: 'Torch' },
        { name: 'Campfire', cost: { Wood: 5, Stone: 3 }, result: 'Campfire' }
    ],
    craftSlots: [], timeOfDay: 0.35, ambientLight: 1.0,
    joy: { active: false, x: 0, y: 0, dx: 0, dy: 0 },
    hotbar: ['Hands', 'Axe', 'Pickaxe', 'Torch', 'Campfire'],
    selectedSlot: 0
};

function getHeight(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= game.mapW || ty >= game.mapH) return 0;
    let tt = game.map[ty * game.mapW + tx];
    if (tt === 2) return -0.3; 
    let h = Math.sin(tx * 0.4) + Math.cos(ty * 0.4);
    return Math.round(h) * 0.25; 
}

// Map Initialization
for (let y = 0; y < game.mapH; y++) {
    for (let x = 0; x < game.mapW; x++) {
        if (x >= 14 && x <= 16 && y >= 14 && y <= 16) game.map.push(2);
        else if (x >= 4 && x <= 7 && y >= 4 && y <= 7) game.map.push(1);
        else {
            game.map.push(0);
            if (Math.random() < 0.2) game.grassTufts.push({ x: x + 0.2 + Math.random()*0.6, z: y + 0.2 + Math.random()*0.6 });
        }
    }
}

const propTypes = ['tree', 'tree', 'tree', 'rock', 'bush', 'metal', 'ruin_wall'];
for (let i = 0; i < 24; i++) {
    while (true) {
        let tx = Math.floor(Math.random() * 20) + 1;
        let ty = Math.floor(Math.random() * 20) + 1;
        if (game.map[ty*game.mapW+tx] === 0 && !game.obstacles.includes(`${tx},${ty}`)) {
            game.entities.push({ type: propTypes[Math.floor(Math.random()*propTypes.length)], tx, ty, swayPhase: Math.random() * 6 });
            game.obstacles.push(`${tx},${ty}`);
            break;
        }
    }
}

function isWalkable(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= game.mapW || ty >= game.mapH) return false;
    return !game.obstacles.includes(`${tx},${ty}`);
}

function findPath(start, end) {
    if (!isWalkable(end[0], end[1])) return [];
    let open = [{ tx: start[0], ty: start[1], g: 0, h: 0, f: 0, parent: null }];
    let closed = [];
    const dirs = [[0,-1,1],[0,1,1],[-1,0,1],[1,0,1],[-1,-1,1.4],[1,-1,1.4],[-1,1,1.4],[1,1,1.4]];
    while (open.length > 0) {
        open.sort((a, b) => a.f - b.f);
        let curr = open.shift();
        if (curr.tx === end[0] && curr.ty === end[1]) {
            let path = []; let temp = curr;
            while (temp) { path.push([temp.tx, temp.ty]); temp = temp.parent; }
            return path.reverse();
        }
        closed.push(`${curr.tx},${curr.ty}`);
        for (let d of dirs) {
            let ntx = curr.tx + d[0], nty = curr.ty + d[1];
            if (!isWalkable(ntx, nty) || closed.includes(`${ntx},${nty}`)) continue;
            if (d[0] !== 0 && d[1] !== 0) {
                if (!isWalkable(curr.tx + d[0], curr.ty) || !isWalkable(curr.tx, curr.ty + d[1])) continue;
            }
            let g = curr.g + d[2];
            let h = Math.hypot(ntx - end[0], nty - end[1]);
            let f = g + h;
            let exist = open.find(n => n.tx === ntx && n.ty === nty);
            if (exist && exist.g <= g) continue;
            open.push({ tx: ntx, ty: nty, g, h, f, parent: curr });
        }
    }
    return [];
}

// Projections & Camera Vectors
const p = game.player;
const camInit = [p.x - 10, 12, p.z - 10];
let dx = p.x - camInit[0], dz = p.z - camInit[2], dy = 0 - camInit[1];
const GAME_YAW = Math.atan2(dx, dz);
const distXZ = Math.hypot(dx, dz);
const GAME_PITCH = Math.atan2(dy, distXZ);
const FOV = 950;

const SIN_YAW = Math.sin(-GAME_YAW), COS_YAW = Math.cos(-GAME_YAW);
const SIN_PITCH = Math.sin(GAME_PITCH), COS_PITCH = Math.cos(GAME_PITCH);

const W_VEC = [Math.sin(GAME_YAW), Math.cos(GAME_YAW)];
const D_VEC = [Math.cos(GAME_YAW), -Math.sin(GAME_YAW)];

function project(x, y, z, cam) {
    x -= cam[0]; y -= cam[1]; z -= cam[2];
    let x2 = x * COS_YAW + z * SIN_YAW;
    let z2 = -x * SIN_YAW + z * COS_YAW;
    let y3 = y * COS_PITCH - z2 * SIN_PITCH;
    let z3 = y * SIN_PITCH + z2 * COS_PITCH;
    if (z3 <= 0.1) return null;
    return [(x2 / z3) * FOV + GAME_W / 2, (-y3 / z3) * FOV + GAME_H / 2, z3];
}

function getLightAt(x, y, z) {
    let light = 0;
    let pD = Math.hypot(x - p.x, y - (p.y + 1), z - p.z);
    if (pD < 4) light += (1 - pD / 4) * 0.4;
    for (let l of game.lights) {
        let d = Math.hypot(x - l.x, y - l.y, z - l.z);
        if (d < l.r) light += (1 - d / l.r) * l.intensity;
    }
    return Math.min(0.85, light);
}

function shade(color, factor, x, y, z) {
    let base = factor * game.ambientLight;
    let extra = getLightAt(x, y, z) * factor;
    let total = base + extra;
    return `rgba(${Math.max(0, Math.min(255, color[0]*total))}, ${Math.max(0, Math.min(255, color[1]*total))}, ${Math.max(0, Math.min(255, color[2]*total))}, 1)`;
}

function rotateY(x, y, z, a) { let c=Math.cos(a), s=Math.sin(a); return [x*c+z*s, y, -x*s+z*c]; }
function rotateX(x, y, z, a) { let c=Math.cos(a), s=Math.sin(a); return [x, y*c-z*s, y*s+z*c]; }

function addCube(faces, px, py, pz, w, h, d, color, rx=0, ry=0, ox=0, oy=0, oz=0) {
    const v = [[-w/2,-h/2,-d/2],[w/2,-h/2,-d/2],[w/2,-h/2,d/2],[-w/2,-h/2,d/2],[-w/2,h/2,-d/2],[w/2,h/2,-d/2],[w/2,h/2,d/2],[-w/2,h/2,d/2]];
    let rv = v.map(vert => {
        let cx = vert[0]+ox, cy = vert[1]+oy, cz = vert[2]+oz;
        let r = rotateX(cx, cy, cz, rx);
        r = rotateY(r[0], r[1], r[2], ry);
        return [px+r[0], py+r[1], pz+r[2]];
    });
    let cx = px+ox, cy = py+oy, cz = pz+oz;
    faces.push({ verts: [rv[4], rv[5], rv[6], rv[7]], color: shade(color, 1.0, cx, cy+0.5, cz) });
    faces.push({ verts: [rv[3], rv[2], rv[6], rv[7]], color: shade(color, 0.8, cx, cy, cz+0.5) });
    faces.push({ verts: [rv[1], rv[0], rv[4], rv[5]], color: shade(color, 0.65, cx, cy, cz-0.5) });
    faces.push({ verts: [rv[0], rv[3], rv[7], rv[4]], color: shade(color, 0.55, cx-0.5, cy, cz) });
    faces.push({ verts: [rv[2], rv[1], rv[5], rv[6]], color: shade(color, 0.55, cx+0.5, cy, cz) });
}

function addDiamondGrass(faces, px, pz, sway) {
    let c = [74, 93, 35];
    faces.push({ verts: [[px-0.05, 0, pz], [px+0.05, 0, pz], [px+sway, 0.4, pz], [px+sway-0.1, 0.4, pz]], color: shade(c, 1.0, px, 0.2, pz) });
    faces.push({ verts: [[px-0.05, 0, pz], [px+0.05, 0, pz], [px-0.3+sway, 0.35, pz+0.2], [px-0.4+sway, 0.35, pz+0.2]], color: shade(c, 0.8, px, 0.2, pz) });
}

function addShadow(faces, px, pz, r, op=80) {
    let nf = game.ambientLight;
    faces.push({ verts: [[px-r, 0.01, pz-r], [px+r, 0.01, pz-r], [px+r, 0.01, pz+r], [px-r, 0.01, pz+r]], color: `rgba(18,24,9,${(op/255)*nf})` });
}

function handleMoveClick(mx, my) {
    let closestTx = -1, closestTy = -1, minDist = 1000.0;
    let p = game.player, cam = [p.x - 10, 12, p.z - 10];
    for (let ty = 0; ty < game.mapH; ty++) {
        for (let tx = 0; tx < game.mapW; tx++) {
            let proj = project(tx+0.5, 0, ty+0.5, cam);
            if (proj) {
                let dist = Math.hypot(mx - proj[0], my - proj[1]);
                if (dist < minDist) { minDist = dist; closestTx = tx; closestTy = ty; }
            }
        }
    }
    if (closestTx !== -1 && minDist < 90) {
        let selectedItem = game.hotbar[game.selectedSlot];
        if ((selectedItem === 'Torch' || selectedItem === 'Campfire') && game.inventory[selectedItem] > 0) {
            if (isWalkable(closestTx, closestTy)) {
                game.inventory[selectedItem]--;
                let h = getHeight(closestTx, closestTy);
                if (selectedItem === 'Torch') {
                    game.entities.push({ type: 'torch', tx: closestTx, ty: closestTy, swayPhase: 0 });
                    game.lights.push({ x: closestTx+0.5, y: h+1.0, z: closestTy+0.5, r: 6, intensity: 1.0 });
                } else {
                    game.entities.push({ type: 'campfire', tx: closestTx, ty: closestTy, swayPhase: 0 });
                    game.lights.push({ x: closestTx+0.5, y: h+0.8, z: closestTy+0.5, r: 10, intensity: 1.5 });
                }
                game.obstacles.push(`${closestTx},${closestTy}`);
                game.feedbackTexts.push({ text: `Placed ${selectedItem}!`, x: GAME_W/2, y: GAME_H/2, timer: 2.0 });
            }
        } else {
            let path = findPath([p.tx, p.ty], [closestTx, closestTy]);
            if (path.length > 0) {
                p.path = path.slice(1); game.pendingInteraction = null; game.destinationMarker = { tx: closestTx, ty: closestTy };
            }
        }
    }
}

function handleBreak() {
    let p = game.player;
    let closest = null, minD = 2.5;
    game.entities.forEach(e => {
        if (e.type === 'torch' || e.type === 'campfire') return;
        let d = Math.hypot(p.x - (e.tx+0.5), p.z - (e.ty+0.5));
        if (d < minD) { minD = d; closest = e; }
    });
    if (closest) {
        let bestAdj = null, minAdjD = 999;
        for(let dx=-1; dx<=1; dx++) {
            for(let dy=-1; dy<=1; dy++) {
                if(dx===0 && dy===0) continue;
                let atx = closest.tx+dx, aty = closest.ty+dy;
                if(isWalkable(atx, aty)) {
                    let d = Math.hypot(atx-p.tx, aty-p.ty);
                    if(d < minAdjD) { minAdjD = d; bestAdj = [atx, aty]; }
                }
            }
        }
        if(bestAdj) {
            let path = findPath([p.tx, p.ty], bestAdj);
            if(path.length > 0) {
                p.path = path.slice(1); game.pendingInteraction = closest; game.destinationMarker = { tx: bestAdj[0], ty: bestAdj[1] };
            }
        }
    }
}

// Ergonomic Mobile Controls Placement
function getButtons() {
    let scale = Math.min(GAME_W / 1280, GAME_H / 720);
    scale = Math.max(0.75, Math.min(scale, 1.3));

    let btnBreakSize = 84 * scale;
    let btnSmallSize = 68 * scale;
    let padding = 24 * scale;

    let baseRight = GAME_W - padding - btnBreakSize/2;
    let baseBottom = GAME_H - padding - btnBreakSize/2;

    return {
        break: { x: baseRight, y: baseBottom, r: btnBreakSize / 2 },
        jump: { x: baseRight - (95 * scale), y: baseBottom - (20 * scale), r: btnSmallSize / 2 },
        craft: { x: baseRight - (15 * scale), y: baseBottom - (95 * scale), r: btnSmallSize / 2 },
        inv: { x: baseRight - (85 * scale), y: baseBottom - (105 * scale), r: btnSmallSize / 2 },
        scale: scale
    };
}

// Touch & Pointer Controls
canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    let x = e.clientX, y = e.clientY;
    
    if (game.state === 'menu') { 
        game.state = 'playing'; 
        return; 
    }

    if (game.state === 'crafting' || game.state === 'inventory') {
        if (game.state === 'crafting') {
            for (let btn of game.craftSlots) {
                if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
                    let rec = btn.recipe;
                    let canCraft = Object.keys(rec.cost).every(res => game.inventory[res] >= rec.cost[res]);
                    if (canCraft) {
                        Object.keys(rec.cost).forEach(res => game.inventory[res] -= rec.cost[res]);
                        game.inventory[rec.result]++;
                        game.feedbackTexts.push({ text: `Crafted ${rec.name}!`, x: GAME_W/2, y: GAME_H/2, timer: 2.0 });
                    }
                    return;
                }
            }
        }
        game.state = 'playing'; 
        return;
    }

    // Hotbar Selection
    let btns = getButtons();
    let hbSize = Math.floor(58 * btns.scale);
    let totalW = 5 * hbSize;
    let hbStartX = (GAME_W / 2) - (totalW / 2);
    let hbY = GAME_H - hbSize - (16 * btns.scale);

    if (y > hbY && y < hbY + hbSize) {
        for (let i = 0; i < 5; i++) {
            if (x > hbStartX + i*hbSize && x < hbStartX + i*hbSize + hbSize) {
                game.selectedSlot = i;
                return;
            }
        }
    }

    // Action Buttons
    if (x > GAME_W - 260 * btns.scale) {
        if (Math.hypot(x - btns.break.x, y - btns.break.y) < btns.break.r) { handleBreak(); return; }
        if (Math.hypot(x - btns.jump.x, y - btns.jump.y) < btns.jump.r) { if (game.player.jumpY === 0) game.player.jumpY = 0.6; return; }
        if (Math.hypot(x - btns.craft.x, y - btns.craft.y) < btns.craft.r) { game.state = 'crafting'; return; }
        if (Math.hypot(x - btns.inv.x, y - btns.inv.y) < btns.inv.r) { game.state = 'inventory'; return; }
    }

    let selectedItem = game.hotbar[game.selectedSlot];
    let isPlacing = (selectedItem === 'Torch' || selectedItem === 'Campfire') && game.inventory[selectedItem] > 0;

    // Dynamic Touch Joystick
    if (!isPlacing && x < GAME_W / 2) {
        game.joy.active = true;
        game.joy.x = x; game.joy.y = y;
        game.joy.dx = 0; game.joy.dy = 0;
    } else {
        handleMoveClick(x, y);
    }
});

canvas.addEventListener('pointermove', e => {
    e.preventDefault();
    if (game.joy.active) {
        let dx = e.clientX - game.joy.x;
        let dy = e.clientY - game.joy.y;
        let dist = Math.hypot(dx, dy);
        let maxDist = 50 * (getButtons().scale);
        if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
        game.joy.dx = dx; game.joy.dy = dy;
    }
});

canvas.addEventListener('pointerup', e => {
    e.preventDefault();
    game.joy.active = false;
    game.joy.dx = 0; game.joy.dy = 0;
});

window.addEventListener('keydown', e => {
    let k = e.key.toLowerCase();
    if (k === 'c') { if (game.state === 'playing') game.state = 'crafting'; else if (game.state === 'crafting') game.state = 'playing'; }
    else if (k === 'e') { if (game.state === 'playing') game.state = 'inventory'; else if (game.state === 'inventory') game.state = 'playing'; }
    else if (k === 'escape') { if (game.state !== 'menu') game.state = 'playing'; }
    else if (['1','2','3','4','5'].includes(k)) game.selectedSlot = parseInt(k) - 1;
});
canvas.addEventListener('contextmenu', e => e.preventDefault());

let lastTime = performance.now();
function update(dt) {
    game.frameCount++;
    if (game.state !== 'playing') return;
    
    game.timeOfDay = (game.timeOfDay + dt * 0.008) % 1.0;
    let lv = Math.sin(game.timeOfDay * Math.PI * 2 - Math.PI / 2);
    game.ambientLight = 0.35 + (lv + 1) / 2 * 0.65;

    let p = game.player;
    if (p.jumpY > 0) { p.jumpY -= dt * 1.5; if (p.jumpY < 0) p.jumpY = 0; }

    let ad = p.targetAngle - p.angle;
    while (ad > Math.PI) ad -= 2 * Math.PI;
    while (ad < -Math.PI) ad += 2 * Math.PI;
    p.angle += ad * Math.min(1.0, dt * 10.0);

    let isMovingJoy = game.joy.active && (Math.abs(game.joy.dx) > 4 || Math.abs(game.joy.dy) > 4);
    if (isMovingJoy) {
        p.path = []; game.pendingInteraction = null; game.destinationMarker = null;
        let joyScale = 50 * getButtons().scale;
        let inputX = game.joy.dx / joyScale;
        let inputY = -game.joy.dy / joyScale;
        let moveX = inputX * D_VEC[0] + inputY * W_VEC[0];
        let moveZ = inputX * D_VEC[1] + inputY * W_VEC[1];
        let mag = Math.hypot(moveX, moveZ);
        if (mag > 0) {
            moveX /= mag; moveZ /= mag;
            let speed = 4.8 * dt;
            let nx = p.x + moveX * speed, nz = p.z + moveZ * speed;
            let targetTx = Math.floor(nx), targetTy = Math.floor(nz);
            let currentH = getHeight(p.tx, p.ty);
            let targetH = getHeight(targetTx, targetTy);
            if (Math.abs(targetH - currentH) < 0.35 || p.jumpY > 0) {
                if (isWalkable(targetTx, Math.floor(p.z))) p.x = nx;
                if (isWalkable(Math.floor(p.x), targetTy)) p.z = nz;
            }
            p.tx = Math.floor(p.x); p.ty = Math.floor(p.z);
            p.targetAngle = Math.atan2(moveX, moveZ);
            p.state = 'walk';
        } else p.state = 'idle';
    } else if (p.path.length > 0) {
        p.state = 'walk';
        let target = p.path[0];
        let tx = target[0] + 0.5, tz = target[1] + 0.5;
        let ddx = tx - p.x, ddz = tz - p.z, dist = Math.hypot(ddx, ddz);
        if (dist > 0.01) p.targetAngle = Math.atan2(ddx, ddz);
        let speed = 4.8 * dt;
        if (dist <= speed) {
            p.x = tx; p.z = tz; p.tx = target[0]; p.ty = target[1]; p.path.shift();
            if (p.path.length === 0 && !game.pendingInteraction) { p.state = 'idle'; game.destinationMarker = null; }
        } else { p.x += (ddx/dist)*speed; p.z += (ddz/dist)*speed; }
    } else if (game.pendingInteraction) {
        let e = game.pendingInteraction;
        if (Math.hypot(p.x - (e.tx+0.5), p.z - (e.ty+0.5)) < 1.5) {
            p.state = 'gather';
            let ddx = (e.tx+0.5) - p.x, ddz = (e.ty+0.5) - p.z;
            p.targetAngle = Math.atan2(ddx, ddz);
            if (!p.gatherTimer) p.gatherTimer = 1.0;
            p.gatherTimer -= dt;
            if (p.gatherTimer <= 0) {
                if (e.type === 'tree') { game.inventory.Wood++; game.feedbackTexts.push({text:'+1 Wood', x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                else if (e.type === 'rock') { game.inventory.Stone++; game.feedbackTexts.push({text:'+1 Stone', x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                else if (e.type === 'metal') { game.inventory.Metal++; game.feedbackTexts.push({text:'+1 Metal', x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                else if (e.type === 'bush') { game.inventory.Fiber++; game.feedbackTexts.push({text:'+1 Fiber', x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                else if (e.type === 'ruin_wall') { game.inventory.Stone+=2; game.feedbackTexts.push({text:'+2 Stone', x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                game.entities.splice(game.entities.indexOf(e), 1);
                game.obstacles.splice(game.obstacles.indexOf(`${e.tx},${e.ty}`), 1);
                game.pendingInteraction = null; p.state = 'idle'; game.destinationMarker = null;
                delete p.gatherTimer;
            }
        } else p.state = 'idle';
    } else p.state = 'idle';

    let terrainY = getHeight(p.tx, p.ty);
    let targetY = terrainY + p.jumpY;
    p.y += (targetY - p.y) * Math.min(1, dt * 15);

    game.lights.forEach(l => { l.intensity = (l.baseIntensity || 1) + Math.sin(game.frameCount * 0.4 + l.x) * 0.08; });
    game.feedbackTexts.forEach(ft => { ft.y -= 22 * dt; ft.timer -= dt; });
    game.feedbackTexts = game.feedbackTexts.filter(ft => ft.timer > 0);
}

function render() {
    ctx.fillStyle = '#121809';
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    let btns = getButtons();

    // Start Screen Menu
    if (game.state === 'menu') {
        let frameW = Math.min(GAME_W * 0.85, 480);
        let frameH = frameW * (120 / 160);
        let frameX = (GAME_W - frameW) / 2;
        let frameY = (GAME_H - frameH) / 2;
        drawUIRect('ui_main_menu_frame', frameX, frameY, frameW, frameH);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 24px "Courier New", monospace';
        ctx.textAlign = 'center';
        ctx.fillText('THE LAST WANDERER', GAME_W/2, frameY + frameH * 0.28);
        
        let btnW = frameW * 0.6;
        let btnH = btnW * (40 / 120);
        let btnX = (GAME_W - btnW) / 2;
        let btnY = frameY + frameH * 0.52;
        drawUIRect('menu_button_start', btnX, btnY, btnW, btnH);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '900 16px "Courier New", monospace';
        ctx.fillText("TAP TO START", GAME_W/2, btnY + btnH * 0.62);
        return;
    }

    let p = game.player;
    let cam = [p.x - 10, 12, p.z - 10];
    let faces = [];

    // Terrain Rendering
    for (let ty = 0; ty < game.mapH; ty++) {
        for (let tx = 0; tx < game.mapW; tx++) {
            let tt = game.map[ty*game.mapW+tx];
            let c = tt === 0 ? [74, 93, 35] : tt === 1 ? [110, 90, 50] : [45, 80, 110];
            let h = getHeight(tx, ty);
            faces.push({ verts: [[tx, h, ty], [tx+1, h, ty], [tx+1, h, ty+1], [tx, h, ty+1]], color: shade(c, 1.0, tx+0.5, h, ty+0.5) });
            let hL = getHeight(tx-1, ty);
            if (h < hL) faces.push({ verts: [[tx, h, ty], [tx, hL, ty], [tx, hL, ty+1], [tx, h, ty+1]], color: shade(c, 0.6, tx, (h+hL)/2, ty+0.5) });
            let hR = getHeight(tx+1, ty);
            if (h < hR) faces.push({ verts: [[tx+1, h, ty], [tx+1, hR, ty], [tx+1, hR, ty+1], [tx+1, h, ty+1]], color: shade(c, 0.6, tx+1, (h+hR)/2, ty+0.5) });
            let hF = getHeight(tx, ty-1);
            if (h < hF) faces.push({ verts: [[tx, h, ty], [tx+1, h, ty], [tx+1, hF, ty], [tx, hF, ty]], color: shade(c, 0.5, tx+0.5, (h+hF)/2, ty) });
            let hB = getHeight(tx, ty+1);
            if (h < hB) faces.push({ verts: [[tx, h, ty+1], [tx+1, h, ty+1], [tx+1, hB, ty+1], [tx, hB, ty+1]], color: shade(c, 0.5, tx+0.5, (h+hB)/2, ty+1) });
        }
    }

    game.grassTufts.forEach(t => { let s = Math.sin(game.frameCount * 0.04 + t.x) * 0.08; addDiamondGrass(faces, t.x, t.z, s); });

    if (game.destinationMarker) {
        let tx = game.destinationMarker.tx, ty = game.destinationMarker.ty;
        let h = getHeight(tx, ty) + 0.02;
        faces.push({ verts: [[tx+0.1,h,ty+0.1], [tx+0.9,h,ty+0.1], [tx+0.9,h,ty+0.9], [tx+0.1,h,ty+0.9]], color: `rgba(162,209,91,0.6)` });
    }

    // Entity Rendering
    game.entities.forEach(e => {
        let h = getHeight(e.tx, e.ty);
        if (e.type === 'tree') addShadow(faces, e.tx+0.5, e.ty+0.5, 0.7);
        else if (['rock','ruin_wall'].includes(e.type)) addShadow(faces, e.tx+0.5, e.ty+0.5, 0.6);
        else if (e.type !== 'torch' && e.type !== 'campfire') addShadow(faces, e.tx+0.5, e.ty+0.5, 0.4);
        
        if (e.type === 'tree') { 
            let s = Math.sin(game.frameCount * 0.03 + e.swayPhase) * 0.08; 
            addCube(faces, e.tx+0.5+s, h+1.5, e.ty+0.5, 1.2, 1.2, 1.2, [58, 85, 30]); 
            addCube(faces, e.tx+0.5, h+0.5, e.ty+0.5, 0.3, 1.0, 0.3, [92, 64, 51]); 
        }
        else if (e.type === 'rock') addCube(faces, e.tx+0.5, h+0.3, e.ty+0.5, 0.8, 0.6, 0.8, [128, 128, 128]);
        else if (e.type === 'metal') addCube(faces, e.tx+0.5, h+0.2, e.ty+0.5, 0.9, 0.4, 0.9, [112, 112, 112]);
        else if (e.type === 'bush') { let s = Math.sin(game.frameCount * 0.04 + e.swayPhase) * 0.04; addCube(faces, e.tx+0.5+s, h+0.3, e.ty+0.5, 0.8, 0.6, 0.8, [85, 122, 43]); }
        else if (e.type === 'ruin_wall') addCube(faces, e.tx+0.5, h+0.5, e.ty+0.5, 0.8, 1.0, 0.3, [90, 85, 80]);
        else if (e.type === 'torch') { addCube(faces, e.tx+0.5, h+0.5, e.ty+0.5, 0.1, 1.0, 0.1, [92, 64, 51]); addCube(faces, e.tx+0.5, h+1.0, e.ty+0.5, 0.25, 0.25, 0.25, [255, 200, 0]); }
        else if (e.type === 'campfire') { addCube(faces, e.tx+0.5, h+0.1, e.ty+0.5, 0.7, 0.15, 0.7, [80, 80, 80]); addCube(faces, e.tx+0.5, h+0.3, e.ty+0.5, 0.4, 0.3, 0.4, [255, 140, 0]); }
    });

    // Character Model
    let playerY = p.y;
    addShadow(faces, p.x, p.z, 0.4, 80 * (1 - Math.min(1, p.jumpY / 0.6)));
    let breathe = 0, ls = 0, asr = 0, asl = 0;
    if (p.state === 'walk') { ls = Math.sin(game.frameCount * 0.35) * 0.45; asr = -ls; asl = ls; breathe = Math.abs(Math.sin(game.frameCount * 0.35)) * 0.04; }
    else if (p.state === 'gather') { asr = Math.sin(game.frameCount * 0.7) * 1.1; breathe = Math.sin(game.frameCount * 0.4) * 0.04; }
    else { breathe = Math.sin(game.frameCount * 0.05) * 0.04; }
    
    let hipY = playerY + 0.5, torsoY = playerY + 0.8 + breathe, shoulderY = playerY + 1.1 + breathe, headY = playerY + 1.4 + breathe;
    let ro = rotateY(0.15,0,0,p.angle); addCube(faces, p.x+ro[0], hipY, p.z+ro[2], 0.2, 0.5, 0.2, [34,43,20], -ls, p.angle, 0, -0.25, 0);
    let lo = rotateY(-0.15,0,0,p.angle); addCube(faces, p.x+lo[0], hipY, p.z+lo[2], 0.2, 0.5, 0.2, [34,43,20], ls, p.angle, 0, -0.25, 0);
    addCube(faces, p.x, torsoY, p.z, 0.5, 0.6, 0.3, [74,93,35], 0, p.angle);
    let rao = rotateY(0.35,0,0,p.angle); addCube(faces, p.x+rao[0], shoulderY, p.z+rao[2], 0.2, 0.5, 0.2, [136,176,75], -asr, p.angle, 0, -0.25, 0);
    let lao = rotateY(-0.35,0,0,p.angle); addCube(faces, p.x+lao[0], shoulderY, p.z+lao[2], 0.2, 0.5, 0.2, [136,176,75], -asl, p.angle, 0, -0.25, 0);
    addCube(faces, p.x, headY, p.z, 0.3, 0.3, 0.3, [210,160,110], 0, p.angle);

    // Rasterize Sorted Faces
    let renderables = [];
    faces.forEach(f => {
        let pv = []; let valid = true;
        for (let v of f.verts) { let proj = project(v[0], v[1], v[2], cam); if (!proj) { valid = false; break; } pv.push(proj); }
        if (valid) { let avgZ = pv.reduce((s,p)=>s+p[2],0) / pv.length; renderables.push({ verts: pv, color: f.color, z: avgZ }); }
    });
    renderables.sort((a,b) => b.z - a.z);
    renderables.forEach(r => { ctx.beginPath(); ctx.moveTo(r.verts[0][0], r.verts[0][1]); for (let i = 1; i < r.verts.length; i++) ctx.lineTo(r.verts[i][0], r.verts[i][1]); ctx.closePath(); ctx.fillStyle = r.color; ctx.fill(); });

    // Floating Pickup Text Banners
    game.feedbackTexts.forEach(ft => {
        ctx.globalAlpha = Math.max(0, ft.timer / 2.0);
        let bw = 130 * btns.scale, bh = 30 * btns.scale;
        drawUIRect('feedback_banner', ft.x - bw/2, ft.y - bh/2, bw, bh);
        ctx.fillStyle = '#A2D15B';
        ctx.font = `900 ${Math.floor(13 * btns.scale)}px "Courier New", monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y + 5);
    });
    ctx.globalAlpha = 1.0;

    // Centered Hotbar
    let hbSize = Math.floor(58 * btns.scale);
    let totalW = 5 * hbSize;
    let hbStartX = (GAME_W / 2) - (totalW / 2);
    let hbY = GAME_H - hbSize - (16 * btns.scale);
    for (let i = 0; i < 5; i++) {
        let hx = hbStartX + i * hbSize;
        drawUIImage('hotbar_slot', hx + hbSize/2, hbY + hbSize/2, hbSize);
        
        let itemName = game.hotbar[i];
        if (itemName !== 'Hands' && game.inventory[itemName] > 0) {
            drawUIImage('item_' + itemName.toLowerCase(), hx + hbSize/2, hbY + hbSize/2, hbSize * 0.75);
        }
        
        if (game.selectedSlot === i) {
            drawUIImage('hotbar_selector', hx + hbSize/2, hbY + hbSize/2, hbSize);
        }
        
        let count = game.inventory[itemName];
        if (count !== undefined && count > 0) {
            ctx.fillStyle = '#FFFFFF'; 
            ctx.font = `900 ${Math.floor(11 * btns.scale)}px "Courier New", monospace`; 
            ctx.textAlign = 'right';
            ctx.fillText(count, hx + hbSize - 6, hbY + 16);
        }
    }

    // Touch Action Buttons
    if (game.state === 'playing') {
        let jx = game.joy.active ? game.joy.x : 100 * btns.scale;
        let jy = game.joy.active ? game.joy.y : GAME_H - (110 * btns.scale);
        ctx.globalAlpha = game.joy.active ? 0.95 : 0.45;
        drawUIImage('joystick_base', jx, jy, 110 * btns.scale);
        if (game.joy.active) {
            drawUIImage('joystick_knob', jx + game.joy.dx, jy + game.joy.dy, 48 * btns.scale);
        }
        ctx.globalAlpha = 1.0;

        drawUIImage('btn_break', btns.break.x, btns.break.y, btns.break.r * 2);
        drawUIImage('btn_jump', btns.jump.x, btns.jump.y, btns.jump.r * 2);
        drawUIImage('btn_craft', btns.craft.x, btns.craft.y, btns.craft.r * 2);
        drawUIImage('btn_inventory', btns.inv.x, btns.inv.y, btns.inv.r * 2);
    }

    // Modal Overlays
    if (game.state === 'crafting' || game.state === 'inventory') {
        ctx.fillStyle = 'rgba(18,24,9,0.75)';
        ctx.fillRect(0,0,GAME_W,GAME_H);
        
        let winW = Math.min(GAME_W * 0.85, 460);
        let winH = winW * (80 / 120);
        let winX = (GAME_W / 2) - (winW / 2);
        let winY = (GAME_H / 2) - (winH / 2);
        
        drawUIRect('ui_window', winX, winY, winW, winH);
        
        ctx.fillStyle = '#FFFFFF'; 
        ctx.textAlign = 'center'; 
        ctx.font = '900 16px "Courier New", monospace';
        ctx.fillText(game.state.toUpperCase(), GAME_W/2, winY + 22);

        // Inventory Popup Grid
        if (game.state === 'inventory') {
            let items = Object.keys(game.inventory);
            let cols = 4;
            let boxW = winW / 5.2;
            let startX = GAME_W/2 - (cols * boxW) / 2;
            let startY = winY + 45;
            for(let i=0; i<items.length; i++) {
                let col = i % cols;
                let row = Math.floor(i / cols);
                let ix = startX + col * boxW;
                let iy = startY + row * boxW;
                
                drawUIImage('inventory_slot', ix + boxW/2, iy + boxW/2, boxW * 0.9);
                
                let itemName = items[i];
                if(game.inventory[itemName] > 0 || ['Wood','Stone','Metal','Fiber'].includes(itemName)) {
                    drawUIImage('item_' + itemName.toLowerCase(), ix + boxW/2, iy + boxW/2, boxW * 0.7);
                    
                    ctx.fillStyle = '#FFFFFF'; 
                    ctx.font = '900 11px "Courier New", monospace'; 
                    ctx.textAlign = 'right';
                    ctx.fillText(game.inventory[itemName], ix + boxW - 8, iy + boxW - 8);
                }
            }
        }

        // Crafting Menu List
        if (game.state === 'crafting') {
            game.craftSlots = [];
            let rx = GAME_W/2, ry = winY + 42;
            let rowW = winW * 0.82, rowH = 26;
            
            game.recipes.forEach((rec, i) => {
                let sx = rx - rowW/2, sy = ry + i * (rowH + 6);
                
                drawUIRect('recipe_row', sx, sy, rowW, rowH);
                drawUIImage('item_' + rec.result.toLowerCase(), sx + 14, sy + rowH/2, 20);
                
                ctx.textAlign = 'left'; 
                ctx.fillStyle = '#FFFFFF';
                ctx.font = '900 11px "Courier New", monospace';
                ctx.fillText(rec.name, sx + 32, sy + 13);
                
                let costStr = Object.keys(rec.cost).map(r => `${r}:${rec.cost[r]}`).join(' ');
                ctx.fillStyle = '#88B04B';
                ctx.font = '900 9px "Courier New", monospace';
                ctx.fillText(costStr, sx + 32, sy + 22);
                
                game.craftSlots.push({ recipe: rec, x: sx, y: sy, w: rowW, h: rowH });
            });
        }
    }
}

function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
