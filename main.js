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

// --- UI Asset Preloader ---
const uiAssets = {};
const assetList = [
    'joystick_base', 'joystick_knob', 'btn_break', 'btn_jump', 'btn_craft', 'btn_inventory',
    'ui_window', 'ui_main_menu_frame', 'recipe_row', 'inventory_slot', 'hotbar_slot', 'hotbar_selector',
    'menu_button_start',
    'item_wood', 'item_stone', 'item_metal', 'item_fiber', 'item_axe', 'item_pickaxe', 'item_torch', 'item_campfire',
    'feedback_banner'
];

function loadAssets() {
    let promises = [];
    assetList.forEach(name => {
        uiAssets[name] = new Image();
        // Using allSettled logic: if one fails, we still start the game
        let p = new Promise((resolve) => {
            uiAssets[name].onload = () => resolve();
            uiAssets[name].onerror = () => { console.warn(`Missing asset: ${name}`); resolve(); };
        });
        uiAssets[name].src = `assets/ui/${name}.svg`;
        promises.push(p);
    });
    return Promise.all(promises);
}

function drawUIImage(imgName, cx, cy, size) {
    if (uiAssets[imgName] && uiAssets[imgName].complete && uiAssets[imgName].naturalWidth !== 0) {
        ctx.drawImage(uiAssets[imgName], cx - size/2, cy - size/2, size, size);
    }
}

function drawUIRect(imgName, x, y, w, h) {
    if (uiAssets[imgName] && uiAssets[imgName].complete && uiAssets[imgName].naturalWidth !== 0) {
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
    selectedSlot: 0,
    dialogue: null
};

function getHeight(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= game.mapW || ty >= game.mapH) return 0;
    let tt = game.map[ty * game.mapW + tx];
    if (tt === 2) return -0.3; 
    let h = Math.sin(tx * 0.4) + Math.cos(ty * 0.4);
    return Math.round(h) * 0.25; 
}

// Handcrafted Map Zones
for (let y = 0; y < game.mapH; y++) {
    for (let x = 0; x < game.mapW; x++) {
        if (x >= 15 && x <= 18 && y >= 15 && y <= 18) {
            game.map.push(2); // Lake
        } else if (x >= 4 && x <= 7 && y >= 4 && y <= 7) {
            game.map.push(1); // Dirt Patch
        } else {
            game.map.push(0); // Grass
            if (Math.random() < 0.2) game.grassTufts.push({ x: x + 0.2 + Math.random()*0.6, z: y + 0.2 + Math.random()*0.6 });
        }
    }
}

// Place Handcrafted Entities
game.entities.push({ type: 'spirit', tx: 13, ty: 11, swayPhase: 0, talked: false });
game.obstacles.push("13,11");

for(let i=0; i<15; i++) {
    let tx = Math.floor(Math.random() * 8) + 1;
    let ty = Math.floor(Math.random() * 8) + 1;
    if (game.map[ty*game.mapW+tx] === 0 && !game.obstacles.includes(`${tx},${ty}`)) {
        game.entities.push({ type: 'tree', tx, ty, swayPhase: Math.random() * 6 });
        game.obstacles.push(`${tx},${ty}`);
    }
}

const ruinTypes = ['ruin_wall', 'ruin_wall', 'metal', 'bush'];
for(let i=0; i<12; i++) {
    let tx = Math.floor(Math.random() * 8) + 14;
    let ty = Math.floor(Math.random() * 8) + 1;
    if (game.map[ty*game.mapW+tx] === 0 && !game.obstacles.includes(`${tx},${ty}`)) {
        game.entities.push({ type: ruinTypes[Math.floor(Math.random()*ruinTypes.length)], tx, ty, swayPhase: Math.random() * 6 });
        game.obstacles.push(`${tx},${ty}`);
    }
}

for(let i=0; i<6; i++) {
    let tx = Math.floor(Math.random() * 8) + 1;
    let ty = Math.floor(Math.random() * 8) + 14;
    if (game.map[ty*game.mapW+tx] === 0 && !game.obstacles.includes(`${tx},${ty}`)) {
        game.entities.push({ type: 'rock', tx, ty, swayPhase: 0 });
        game.obstacles.push(`${tx},${ty}`);
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

function checkToolRequirement(entity) {
    let selectedItem = game.hotbar[game.selectedSlot];
    if ((entity.type === 'rock' || entity.type === 'ruin_wall') && selectedItem !== 'Pickaxe') {
        game.feedbackTexts.push({ text: 'Faster with Pickaxe!', x: GAME_W/2, y: GAME_H/2, timer: 2.0 });
        return false;
    }
    return true;
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
        if (e.type === 'torch' || e.type === 'campfire' || e.type === 'spirit') return;
        let d = Math.hypot(p.x - (e.tx+0.5), p.z - (e.ty+0.5));
        if (d < minD) { minD = d; closest = e; }
    });
    if (closest) {
        if (!checkToolRequirement(closest)) return; 
        
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

canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    let x = e.clientX, y = e.clientY;
    if (game.state === 'menu') { game.state = 'playing'; return; }
    if (game.state === 'dialogue') { game.state = 'playing'; return; }

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
        game.state = 'playing'; return;
    }

    let btns = getButtons();
    let hbSize = Math.floor(58 * btns.scale);
    let totalW = 5 * hbSize;
    let hbStartX = (GAME_W / 2) - (totalW / 2);
    let hbY = GAME_H - hbSize - (16 * btns.scale);

    if (y > hbY && y < hbY + hbSize) {
        for (let i = 0; i < 5; i++) {
            if (x > hbStartX + i*hbSize && x < hbStartX + i*hbSize + hbSize) {
                game.selectedSlot = i; return;
            }
        }
    }

    if (x > GAME_W - 260 * btns.scale) {
        if (Math.hypot(x - btns.break.x, y - btns.break.y) < btns.break.r) { handleBreak(); return; }
        if (Math.hypot(x - btns.jump.x, y - btns.jump.y) < btns.jump.r) { if (game.player.jumpY === 0) game.player.jumpY = 0.6; return; }
        if (Math.hypot(x - btns.craft.x, y - btns.craft.y) < btns.craft.r) { game.state = 'crafting'; return; }
        if (Math.hypot(x - btns.inv.x, y - btns.inv.y) < btns.inv.r) { game.state = 'inventory'; return; }
    }

    let selectedItem = game.hotbar[game.selectedSlot];
    let isPlacing = (selectedItem === 'Torch' || selectedItem === 'Campfire') && game.inventory[selectedItem] > 0;

    if (!isPlacing && x < GAME_W / 2) {
        game.joy.active = true; game.joy.x = x; game.joy.y = y; game.joy.dx = 0; game.joy.dy = 0;
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
    game.joy.active = false; game.joy.dx = 0; game.joy.dy = 0;
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

    let spirit = game.entities.find(e => e.type === 'spirit');
    if (spirit && !spirit.talked) {
        let distToSpirit = Math.hypot(p.x - (spirit.tx+0.5), p.z - (spirit.ty+0.5));
        if (distToSpirit < 2.5) {
            game.state = 'dialogue';
            game.dialogue = { speaker: "Spirit of Nature", text: "Welcome, Wanderer. The Earth has healed, but the remnants of the past remain. Seek the Ruins to the East, and gather the lost materials." };
            spirit.talked = true;
        }
    }

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
            
            let gatherTime = 1.0;
            let yieldAmount = 1;
            let selectedItem = game.hotbar[game.selectedSlot];
            
            if (e.type === 'tree' && selectedItem === 'Axe') gatherTime = 0.5;
            if (e.type === 'rock' && selectedItem === 'Pickaxe') { gatherTime = 0.5; yieldAmount = 2; }
            if (e.type === 'ruin_wall' && selectedItem === 'Pickaxe') { gatherTime = 0.5; yieldAmount = 2; }
            
            if (!p.gatherTimer) p.gatherTimer = gatherTime;
            p.gatherTimer -= dt;
            if (p.gatherTimer <= 0) {
                if (e.type === 'tree') {
                    if (selectedItem === 'Axe') yieldAmount = 2;
                    game.inventory.Wood += yieldAmount; 
                    game.feedbackTexts.push({text:`+${yieldAmount} Wood`, x:GAME_W/2, y:GAME_H/2, timer:2.0});
                }
                else if (e.type === 'rock') { game.inventory.Stone += yieldAmount; game.feedbackTexts.push({text:`+${yieldAmount} Stone`, x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                else if (e.type === 'metal') { game.inventory.Metal += yieldAmount; game.feedbackTexts.push({text:`+${yieldAmount} Metal`, x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                else if (e.type === 'bush') { game.inventory.Fiber += yieldAmount; game.feedbackTexts.push({text:`+${yieldAmount} Fiber`, x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                else if (e.type === 'ruin_wall') { game.inventory.Stone += yieldAmount; game.feedbackTexts.push({text:`+${yieldAmount} Stone`, x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
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

    if (game.state === 'menu') {
        let frameW = Math.min(GAME_W * 0.95, 640);
        let frameH = frameW * (120 / 160);
        let frameX = (GAME_W - frameW) / 2;
        let frameY = (GAME_H - frameH) / 2;
        drawUIRect('ui_main_menu_frame', frameX, frameY, frameW, frameH);
        
        let titleBoxY = frameY + frameH * (14 / 120);
        let titleBoxH = frameH * (18 / 120);
        let titleCenterY = titleBoxY + titleBoxH * 0.5;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${Math.floor(frameW * 0.08)}px "Courier New", monospace`;
        ctx.fillText('THE LAST WANDERER', GAME_W/2, titleCenterY);
        
        let btnW = frameW * 0.5;
        let btnH = btnW * (40 / 120);
        let btnX = (GAME_W - btnW) / 2;
        let btnY = frameY + frameH * 0.52;
        drawUIRect('menu_button_start', btnX, btnY, btnW, btnH);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `900 ${Math.floor(btnH * 0.4)}px "Courier New", monospace`;
        ctx.fillText("TAP TO START", GAME_W/2, btnY + btnH * 0.5);
        ctx.textBaseline = 'alphabetic';
        return;
    }

    let p = game.player;
    let cam = [p.x - 10, 12, p.z - 10];
    let faces = [];

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

    game.entities.forEach(e => {
        let h = getHeight(e.tx, e.ty);
        if (e.type === 'tree') addShadow(faces, e.tx+0.5, e.ty+0.5, 0.7);
        else if (['rock','ruin_wall'].includes(e.type)) addShadow(faces, e.tx+0.5, e.ty+0.5, 0.6);
        else if (e.type === 'spirit') addShadow(faces, e.tx+0.5, e.ty+0.5, 0.4);
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
        else if (e.type === 'spirit') {
            let baseY = h;
            addCube(faces, e.tx+0.35, baseY+0.25, e.ty+0.5, 0.2, 0.5, 0.2, [34, 43, 20]);
            addCube(faces, e.tx+0.65, baseY+0.25, e.ty+0.5, 0.2, 0.5, 0.2, [34, 43, 20]);
            addCube(faces, e.tx+0.5, baseY+0.8, e.ty+0.5, 0.5, 0.6, 0.3, [74, 93, 35]);
            addCube(faces, e.tx+0.5, baseY+1.4, e.ty+0.5, 0.3, 0.3, 0.3, [210, 160, 110]);
            addCube(faces, e.tx+0.5, baseY+1.5, e.ty+0.5, 0.35, 0.1, 0.35, [34, 43, 20]);
            addCube(faces, e.tx+0.5, baseY+1.6, e.ty+0.5, 0.1, 0.1, 0.1, [255, 255, 255]);
        }
    });

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

    let equippedTool = game.hotbar[game.selectedSlot];
    if (equippedTool === 'Axe') {
        let hx = p.x+rao[0], hy = shoulderY, hz = p.z+rao[2];
        addCube(faces, hx, hy, hz, 0.08, 0.4, 0.08, [100, 70, 40], -asr, p.angle, 0, -0.2, 0);
        addCube(faces, hx, hy, hz, 0.25, 0.1, 0.15, [130, 130, 130], -asr, p.angle, 0.15, 0.1, 0);
    } else if (equippedTool === 'Pickaxe') {
        let hx = p.x+rao[0], hy = shoulderY, hz = p.z+rao[2];
        addCube(faces, hx, hy, hz, 0.08, 0.4, 0.08, [100, 70, 40], -asr, p.angle, 0, -0.2, 0);
        addCube(faces, hx, hy, hz, 0.2, 0.08, 0.1, [130, 130, 130], -asr, p.angle, 0.15, 0.1, 0);
        addCube(faces, hx, hy, hz, 0.2, 0.08, 0.1, [130, 130, 130], -asr, p.angle, -0.15, 0.1, 0);
    } else if (equippedTool === 'Torch') {
        let hx = p.x+rao[0], hy = shoulderY, hz = p.z+rao[2];
        addCube(faces, hx, hy, hz, 0.08, 0.3, 0.08, [100, 70, 40], -asr, p.angle, 0, -0.15, 0);
        addCube(faces, hx, hy, hz, 0.15, 0.15, 0.15, [255, 200, 0], -asr, p.angle, 0, -0.35, 0);
    }

    let renderables = [];
    faces.forEach(f => {
        let pv = []; let valid = true;
        for (let v of f.verts) { let proj = project(v[0], v[1], v[2], cam); if (!proj) { valid = false; break; } pv.push(proj); }
        if (valid) { let avgZ = pv.reduce((s,p)=>s+p[2],0) / pv.length; renderables.push({ verts: pv, color: f.color, z: avgZ }); }
    });
    renderables.sort((a,b) => b.z - a.z);
    renderables.forEach(r => { ctx.beginPath(); ctx.moveTo(r.verts[0][0], r.verts[0][1]); for (let i = 1; i < r.verts.length; i++) ctx.lineTo(r.verts[i][0], r.verts[i][1]); ctx.closePath(); ctx.fillStyle = r.color; ctx.fill(); });

    game.feedbackTexts.forEach(ft => {
        ctx.globalAlpha = Math.max(0, ft.timer / 2.0);
        let bw = 130 * btns.scale, bh = 30 * btns.scale;
        drawUIRect('feedback_banner', ft.x - bw/2, ft.y - bh/2, bw, bh);
        ctx.fillStyle = '#A2D15B';
        ctx.font = `bold ${Math.floor(13 * btns.scale)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(ft.text, ft.x, ft.y);
    });
    ctx.globalAlpha = 1.0;
    ctx.textBaseline = 'alphabetic';

    let hbSize = Math.floor(58 * btns.scale);
    let totalW = 5 * hbSize;
    let hbStartX = (GAME_W / 2) - (totalW / 2);
    let hbY = GAME_H - hbSize - (16 * btns.scale);
    for (let i = 0; i < 5; i++) {
        let hx = hbStartX + i * hbSize;
        let slotCx = hx + hbSize/2;
        let slotCy = hbY + hbSize/2;
        
        drawUIImage('hotbar_slot', slotCx, slotCy, hbSize);
        
        if (game.selectedSlot === i) {
            drawUIImage('hotbar_selector', slotCx, slotCy, hbSize);
        }
        
        let itemName = game.hotbar[i];
        if (itemName !== 'Hands' && game.inventory[itemName] > 0) {
            drawUIImage('item_' + itemName.toLowerCase(), slotCx, slotCy, hbSize * 0.65);
        }
        
        let count = game.inventory[itemName];
        if (count !== undefined && count > 0) {
            ctx.fillStyle = '#A2D15B';
            ctx.font = `bold ${Math.floor(11 * btns.scale)}px Arial`; 
            ctx.textAlign = 'right';
            ctx.fillText(count, hx + hbSize - 6, hbY + 15);
        }
    }

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

    if (game.state === 'crafting' || game.state === 'inventory') {
        ctx.fillStyle = 'rgba(18,24,9,0.75)';
        ctx.fillRect(0,0,GAME_W,GAME_H);
        
        let winW = Math.min(GAME_W * 0.95, 580);
        let winH = winW * (100 / 120);
        let winX = (GAME_W / 2) - (winW / 2);
        let winY = (GAME_H / 2) - (winH / 2);
        
        drawUIRect('ui_window', winX, winY, winW, winH);
        
        let titleBoxY = winY + winH * (10 / 100);
        let titleBoxH = winH * (14 / 100);
        let titleCenterY = titleBoxY + titleBoxH * 0.5;

        ctx.fillStyle = '#FFFFFF'; 
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle';
        ctx.font = `900 ${Math.floor(winW * 0.045)}px "Courier New", monospace`;
        ctx.fillText(game.state.toUpperCase(), GAME_W/2, titleCenterY);

        if (game.state === 'inventory') {
            let items = Object.keys(game.inventory);
            let cols = 4;
            let gridW = winW * 0.8;
            let boxW = gridW / cols;
            let startX = GAME_W/2 - gridW/2;
            let startY = winY + winH * 0.30;
            
            for(let i=0; i<items.length; i++) {
                let col = i % cols;
                let row = Math.floor(i / cols);
                let ix = startX + col * boxW;
                let iy = startY + row * boxW;
                let cx = ix + boxW/2;
                let cy = iy + boxW/2;
                
                drawUIImage('inventory_slot', cx, cy, boxW * 0.9);
                
                let itemName = items[i];
                if(game.inventory[itemName] > 0 || ['Wood','Stone','Metal','Fiber'].includes(itemName)) {
                    drawUIImage('item_' + itemName.toLowerCase(), cx, cy, boxW * 0.65);
                    
                    ctx.fillStyle = '#A2D15B';
                    ctx.font = `bold ${Math.floor(winW * 0.03)}px Arial`; 
                    ctx.textAlign = 'right';
                    ctx.fillText(game.inventory[itemName], ix + boxW - 8, iy + 15);
                }
            }
        }

        if (game.state === 'crafting') {
            game.craftSlots = [];
            let listW = winW * 0.85;
            let rowH = winH * 0.12; 
            let gap = winH * 0.03;
            let startY = winY + winH * 0.30; 
            
            game.recipes.forEach((rec, i) => {
                let sx = GAME_W/2 - listW/2;
                let sy = startY + i * (rowH + gap);
                
                drawUIRect('recipe_row', sx, sy, listW, rowH);
                drawUIImage('item_' + rec.result.toLowerCase(), sx + rowH * 0.5, sy + rowH * 0.5, rowH * 0.8);
                
                ctx.textAlign = 'left'; 
                ctx.textBaseline = 'middle';
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `900 ${Math.floor(winW * 0.035)}px "Courier New", monospace`;
                ctx.fillText(rec.name, sx + rowH * 1.2, sy + rowH * 0.35);
                
                let costStr = Object.keys(rec.cost).map(r => `${r}:${rec.cost[r]}`).join(' ');
                ctx.fillStyle = '#88B04B';
                ctx.font = `900 ${Math.floor(winW * 0.025)}px "Courier New", monospace`;
                ctx.fillText(costStr, sx + rowH * 1.2, sy + rowH * 0.7);
                
                game.craftSlots.push({ recipe: rec, x: sx, y: sy, w: listW, h: rowH });
            });
        }
        ctx.textBaseline = 'alphabetic'; 
    }

    if (game.state === 'dialogue' && game.dialogue) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0,0,GAME_W,GAME_H);
        
        let boxW = Math.min(GAME_W * 0.9, 600);
        let boxH = 150;
        let boxX = (GAME_W - boxW) / 2;
        let boxY = GAME_H - boxH - 50;
        
        drawUIRect('ui_window', boxX, boxY, boxW, boxH);
        
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.font = `bold ${Math.floor(18 * btns.scale)}px Arial`;
        ctx.fillText(game.dialogue.speaker + ":", boxX + 30, boxY + 30);
        
        ctx.fillStyle = '#A2D15B';
        ctx.font = `${Math.floor(16 * btns.scale)}px Arial`;
        let words = game.dialogue.text.split(' ');
        let line = '';
        let y = boxY + 60;
        for(let i=0; i<words.length; i++) {
            let testLine = line + words[i] + ' ';
            if (ctx.measureText(testLine).width > boxW - 60 && i > 0) {
                ctx.fillText(line, boxX + 30, y);
                line = words[i] + ' ';
                y += 25;
            } else {
                line = testLine;
            }
        }
        ctx.fillText(line, boxX + 30, y);
        
        ctx.textAlign = 'center';
        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${Math.floor(12 * btns.scale)}px Arial`;
        ctx.fillText("[ Tap to Continue ]", GAME_W/2, boxY + boxH - 25);
        ctx.textBaseline = 'alphabetic';
    }
}

// --- Isometric Loading Screen ---
const tips = [
    "Tip: Craft a Pickaxe to mine stone faster!",
    "Tip: Place Campfires to light up the night.",
    "Tip: The Spirit of Nature guides you.",
    "Tip: Trees yield more wood with an Axe.",
    "Tip: Explore the ruins to find metal scrap."
];
let currentTip = tips[Math.floor(Math.random() * tips.length)];
let particles = [];
for(let i=0; i<50; i++) {
    particles.push({
        x: Math.random() * GAME_W,
        y: Math.random() * GAME_H,
        vy: -0.5 - Math.random() * 1,
        size: 1 + Math.random() * 2,
        alpha: Math.random() * 0.5
    });
}

function renderLoadingScreen(frameCount) {
    ctx.fillStyle = '#121809';
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    // Particles
    particles.forEach(p => {
        p.y += p.vy;
        if (p.y < 0) { p.y = GAME_H; p.x = Math.random() * GAME_W; }
        ctx.fillStyle = `rgba(162, 209, 91, ${p.alpha})`;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });

    // Isometric 4 Squares
    let cx = GAME_W / 2;
    let cy = GAME_H / 2 - 40;
    let w = 80, h = 40;
    let activeTile = Math.floor(frameCount / 30) % 4;
    
    const tiles = [
        { gx: 0, gy: 0, color: '#4A5D23', name: 'Meadow' },
        { gx: 1, gy: 0, color: '#3A5A1E', name: 'Forest' },
        { gx: 1, gy: 1, color: '#5A5550', name: 'Ruins' },
        { gx: 0, gy: 1, color: '#2D506E', name: 'Lake' }
    ];

    tiles.forEach((tile, i) => {
        let isoX = cx + (tile.gx - tile.gy) * (w / 2);
        let isoY = cy + (tile.gx + tile.gy) * (h / 2);
        
        ctx.beginPath();
        ctx.moveTo(isoX, isoY);
        ctx.lineTo(isoX + w/2, isoY + h/2);
        ctx.lineTo(isoX, isoY + h);
        ctx.lineTo(isoX - w/2, isoY + h/2);
        ctx.closePath();
        
        ctx.fillStyle = tile.color;
        ctx.fill();
        
        if (i === activeTile) {
            ctx.strokeStyle = '#A2D15B';
            ctx.lineWidth = 3;
            ctx.stroke();
            
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(tile.name, isoX, isoY - 10);
        }
    });

    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 24px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('LOADING...', GAME_W / 2, cy + h * 2 + 30);

    ctx.fillStyle = '#88B04B';
    ctx.font = '16px Arial';
    ctx.fillText(currentTip, GAME_W / 2, GAME_H - 50);
}

function loop(now) {
    let dt = (now - lastTime) / 1000;
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
}

// --- Initialization ---
let loadingFrame = 0;
function loadingLoop() {
    loadingFrame++;
    renderLoadingScreen(loadingFrame);
    requestAnimationFrame(loadingLoop);
}
loadingLoop();

loadAssets().then(() => {
    // Stop loading loop, start game loop
    lastTime = performance.now();
    requestAnimationFrame(loop);
});
