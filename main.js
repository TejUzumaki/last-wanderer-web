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

// --- UI Asset Loader ---
const uiAssets = {};
const assetList = ['joystick_base', 'joystick_knob', 'btn_break', 'btn_jump', 'btn_craft', 'btn_inventory', 'hotbar_slot', 'ui_window'];
assetList.forEach(name => {
    uiAssets[name] = new Image();
    uiAssets[name].src = `assets/ui/${name}.png`;
});

function drawUIImage(imgName, x, y, size) {
    if (uiAssets[imgName] && uiAssets[imgName].complete) {
        ctx.drawImage(uiAssets[imgName], x - size/2, y - size/2, size, size);
    }
}

// --- Game State ---
const game = {
    mapW: 20, mapH: 20, map: [], obstacles: [], entities: [], grassTufts: [], lights: [],
    player: { tx: 10, ty: 10, x: 10.5, z: 10.5, y: 0, jumpY: 0, path: [], state: 'idle', angle: 0, targetAngle: 0 },
    frameCount: 0, destinationMarker: null, pendingInteraction: null,
    inventory: { Wood: 0, Stone: 0, Metal: 0, Fiber: 0, Axe: 0, Pickaxe: 0, Campfire: 0, Torch: 0 },
    feedbackTexts: [], state: 'menu',
    recipes: [
        { name: 'Stone Axe', cost: { Wood: 3, Stone: 2 }, result: 'Axe', color: 'rgb(150,100,50)' },
        { name: 'Stone Pickaxe', cost: { Wood: 2, Stone: 3 }, result: 'Pickaxe', color: 'rgb(100,100,100)' },
        { name: 'Torch', cost: { Wood: 1, Fiber: 1 }, result: 'Torch', color: 'rgb(255,200,0)' },
        { name: 'Campfire', cost: { Wood: 5, Stone: 3 }, result: 'Campfire', color: 'rgb(200,100,30)' }
    ],
    craftSlots: [], timeOfDay: 0.4, ambientLight: 1.0, skyColor: { r: 135, g: 206, b: 235 },
    joy: { active: false, x: 0, y: 0, dx: 0, dy: 0 },
    hotbar: ['Hands', 'Axe', 'Pickaxe', 'Torch', 'Campfire'],
    selectedSlot: 0
};

function getHeight(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= game.mapW || ty >= game.mapH) return 0;
    let tt = game.map[ty * game.mapW + tx];
    if (tt === 2) return -0.3; 
    let h = Math.sin(tx * 0.5) + Math.cos(ty * 0.5);
    return Math.round(h) * 0.2; 
}

for (let y = 0; y < game.mapH; y++) {
    for (let x = 0; x < game.mapW; x++) {
        if (x >= 12 && x <= 14 && y >= 14 && y <= 16) game.map.push(2);
        else if (x >= 5 && x <= 8 && y >= 5 && y <= 8) game.map.push(1);
        else {
            game.map.push(0);
            if (Math.random() < 0.15) game.grassTufts.push({ x: x + 0.3 + Math.random()*0.4, z: y + 0.3 + Math.random()*0.4 });
        }
    }
}

const propTypes = ['tree', 'tree', 'tree', 'rock', 'bush', 'metal', 'ruin_wall', 'vehicle', 'house'];
for (let i = 0; i < 20; i++) {
    while (true) {
        let tx = Math.floor(Math.random() * 18) + 1;
        let ty = Math.floor(Math.random() * 18) + 1;
        if (game.map[ty*game.mapW+tx] === 0 && !game.obstacles.includes(`${tx},${ty}`)) {
            game.entities.push({ type: propTypes[Math.floor(Math.random()*propTypes.length)], tx, ty, swayPhase: Math.random() });
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

const p = game.player;
const camInit = [p.x - 10, 12, p.z - 10];
let dx = p.x - camInit[0], dz = p.z - camInit[2], dy = 0 - camInit[1];
const GAME_YAW = Math.atan2(dx, dz);
const distXZ = Math.hypot(dx, dz);
const GAME_PITCH = Math.atan2(dy, distXZ);
const FOV = 900;

const SIN_YAW = Math.sin(-GAME_YAW), COS_YAW = Math.cos(-GAME_YAW);
const SIN_PITCH = Math.sin(GAME_PITCH), COS_PITCH = Math.cos(GAME_PITCH);

const W_VEC = [Math.sin(GAME_YAW), Math.cos(GAME_YAW)];
const S_VEC = [-Math.sin(GAME_YAW), -Math.cos(GAME_YAW)];
const D_VEC = [Math.cos(GAME_YAW), -Math.sin(GAME_YAW)];
const A_VEC = [-Math.cos(GAME_YAW), Math.sin(GAME_YAW)];

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
    return Math.min(0.8, light);
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
    faces.push({ verts: [rv[0], rv[3], rv[7], rv[4]], color: shade(color, 0.5, cx-0.5, cy, cz) });
    faces.push({ verts: [rv[2], rv[1], rv[5], rv[6]], color: shade(color, 0.5, cx+0.5, cy, cz) });
}

function addDiamondGrass(faces, px, pz, sway) {
    let c = [80, 200, 95];
    faces.push({ verts: [[px-0.05, 0, pz], [px+0.05, 0, pz], [px+sway, 0.4, pz], [px+sway-0.1, 0.4, pz]], color: shade(c, 1.0, px, 0.2, pz) });
    faces.push({ verts: [[px-0.05, 0, pz], [px+0.05, 0, pz], [px-0.3+sway, 0.35, pz+0.2], [px-0.4+sway, 0.35, pz+0.2]], color: shade(c, 0.8, px, 0.2, pz) });
    faces.push({ verts: [[px-0.05, 0, pz], [px+0.05, 0, pz], [px+0.3+sway, 0.35, pz-0.2], [px+0.4+sway, 0.35, pz-0.2]], color: shade(c, 0.8, px, 0.2, pz) });
}

function addShadow(faces, px, pz, r, op=70) {
    let nf = game.ambientLight;
    faces.push({ verts: [[px-r, 0.01, pz-r], [px+r, 0.01, pz-r], [px+r, 0.01, pz+r], [px-r, 0.01, pz+r]], color: `rgba(20,20,20,${(op/255)*nf})` });
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
    if (closestTx !== -1 && minDist < 80) {
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

function getButtons() {
    let btnSize = 90;
    let bx = GAME_W - 60;
    return {
        break: { x: bx, y: GAME_H - 120, r: btnSize / 2 },
        jump: { x: bx - 100, y: GAME_H - 150, r: (btnSize - 20) / 2 },
        craft: { x: bx, y: GAME_H - 220, r: btnSize / 2 },
        inv: { x: bx, y: GAME_H - 320, r: btnSize / 2 }
    };
}

canvas.addEventListener('pointerdown', e => {
    e.preventDefault();
    let x = e.clientX, y = e.clientY;
    if (game.state === 'menu') { game.state = 'playing'; return; }
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
    if (game.state !== 'playing') return;

    let hbSize = 60;
    let totalW = 5 * hbSize;
    let hbStartX = (GAME_W / 2) - (totalW / 2);
    let hbY = GAME_H - 70;
    if (y > hbY && y < hbY + hbSize) {
        for (let i = 0; i < 5; i++) {
            if (x > hbStartX + i*hbSize && x < hbStartX + i*hbSize + hbSize) {
                game.selectedSlot = i;
                return;
            }
        }
    }

    let btns = getButtons();
    if (x > GAME_W - 200) {
        if (Math.hypot(x - btns.break.x, y - btns.break.y) < btns.break.r) { handleBreak(); return; }
        if (Math.hypot(x - btns.jump.x, y - btns.jump.y) < btns.jump.r) { if (game.player.jumpY === 0) game.player.jumpY = 0.6; return; }
        if (Math.hypot(x - btns.craft.x, y - btns.craft.y) < btns.craft.r) { game.state = 'crafting'; return; }
        if (Math.hypot(x - btns.inv.x, y - btns.inv.y) < btns.inv.r) { game.state = 'inventory'; return; }
    }

    let selectedItem = game.hotbar[game.selectedSlot];
    let isPlacing = (selectedItem === 'Torch' || selectedItem === 'Campfire') && game.inventory[selectedItem] > 0;

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
        if (dist > 50) { dx = (dx / dist) * 50; dy = (dy / dist) * 50; }
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

function saveGame() { localStorage.setItem('save', JSON.stringify({ player: game.player, inventory: game.inventory, timeOfDay: game.timeOfDay, entities: game.entities, lights: game.lights, obstacles: game.obstacles })); }
function loadGame() {
    let data = localStorage.getItem('save');
    if (data) {
        let p = JSON.parse(data);
        Object.assign(game.player, p.player);
        Object.assign(game.inventory, p.inventory);
        game.timeOfDay = p.timeOfDay;
        game.entities = p.entities;
        game.lights = p.lights || [];
        game.obstacles = p.obstacles || [];
        if (game.obstacles.length === 0) {
            game.entities.forEach(e => game.obstacles.push(`${e.tx},${e.ty}`));
            game.map.forEach((t, i) => { if (t === 2) game.obstacles.push(`${i % game.mapW},${Math.floor(i / game.mapW)}`); });
        }
    }
}
loadGame();

let lastTime = performance.now();
function update(dt) {
    game.frameCount++;
    if (game.state !== 'playing') return;
    
    game.timeOfDay = (game.timeOfDay + dt * 0.01) % 1.0;
    let lv = Math.sin(game.timeOfDay * Math.PI * 2 - Math.PI / 2);
    game.ambientLight = 0.3 + (lv + 1) / 2 * 0.7;

    let p = game.player;
    if (p.jumpY > 0) { p.jumpY -= dt * 1.5; if (p.jumpY < 0) p.jumpY = 0; }

    let ad = p.targetAngle - p.angle;
    while (ad > Math.PI) ad -= 2 * Math.PI;
    while (ad < -Math.PI) ad += 2 * Math.PI;
    p.angle += ad * Math.min(1.0, dt * 10.0);

    let isMovingJoy = game.joy.active && (Math.abs(game.joy.dx) > 5 || Math.abs(game.joy.dy) > 5);
    if (isMovingJoy) {
        p.path = []; game.pendingInteraction = null; game.destinationMarker = null;
        let inputX = game.joy.dx / 50;
        let inputY = -game.joy.dy / 50;
        let moveX = inputX * D_VEC[0] + inputY * W_VEC[0];
        let moveZ = inputX * D_VEC[1] + inputY * W_VEC[1];
        let mag = Math.hypot(moveX, moveZ);
        if (mag > 0) {
            moveX /= mag; moveZ /= mag;
            let speed = 5.0 * dt;
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
        let speed = 5.0 * dt;
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
            if (!p.gatherTimer) p.gatherTimer = 1.2;
            p.gatherTimer -= dt;
            if (p.gatherTimer <= 0) {
                if (e.type === 'tree') { game.inventory.Wood++; game.feedbackTexts.push({text:'+1 Wood', x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                else if (e.type === 'rock') { game.inventory.Stone++; game.feedbackTexts.push({text:'+1 Stone', x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                else if (['metal','vehicle'].includes(e.type)) { game.inventory.Metal++; game.feedbackTexts.push({text:'+1 Metal', x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                else if (e.type === 'bush') { game.inventory.Fiber++; game.feedbackTexts.push({text:'+1 Fiber', x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
                else if (['ruin_wall','house'].includes(e.type)) { game.inventory.Stone+=2; game.feedbackTexts.push({text:'+2 Stone', x:GAME_W/2, y:GAME_H/2, timer:2.0}); }
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

    game.lights.forEach(l => { l.intensity = (l.baseIntensity || 1) + Math.sin(game.frameCount * 0.5 + l.x) * 0.1; });
    game.feedbackTexts.forEach(ft => { ft.y -= 20 * dt; ft.timer -= dt; });
    game.feedbackTexts = game.feedbackTexts.filter(ft => ft.timer > 0);
}

function render() {
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, GAME_W, GAME_H);

    if (game.state === 'menu') {
        ctx.fillStyle = 'white';
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('THE LAST WANDERER', GAME_W/2, GAME_H/2 - 40);
        ctx.font = '32px Arial';
        ctx.fillStyle = 'rgb(200,200,200)';
        ctx.fillText('Click to Wander', GAME_W/2, GAME_H/2 + 30);
        return;
    }

    let p = game.player;
    let cam = [p.x - 10, 12, p.z - 10];
    let faces = [];

    for (let ty = 0; ty < game.mapH; ty++) {
        for (let tx = 0; tx < game.mapW; tx++) {
            let tt = game.map[ty*game.mapW+tx];
            let c = tt === 0 ? [60,180,75] : tt === 1 ? [128,102,51] : [51,102,179];
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

    game.grassTufts.forEach(t => { let s = Math.sin(game.frameCount * 0.05 + t.x) * 0.1; addDiamondGrass(faces, t.x, t.z, s); });

    if (game.destinationMarker) {
        let tx = game.destinationMarker.tx, ty = game.destinationMarker.ty;
        let c = game.map[ty*game.mapW+tx] === 0 ? [60,180,75] : [128,102,51];
        let lc = [Math.min(255, c[0]+64), Math.min(255, c[1]+64), Math.min(255, c[2]+64)];
        let h = getHeight(tx, ty) + 0.02;
        faces.push({ verts: [[tx+0.1,h,ty+0.1], [tx+0.9,h,ty+0.1], [tx+0.9,h,ty+0.9], [tx+0.1,h,ty+0.9]], color: `rgba(${lc[0]},${lc[1]},${lc[2]},0.6)` });
    }

    game.entities.forEach(e => {
        let h = getHeight(e.tx, e.ty);
        if (e.type === 'tree') addShadow(faces, e.tx+0.5, e.ty+0.5, 0.8);
        else if (['rock','ruin_wall'].includes(e.type)) addShadow(faces, e.tx+0.5, e.ty+0.5, 0.6);
        else if (['vehicle','house'].includes(e.type)) addShadow(faces, e.tx+0.5, e.ty+0.5, 1.0);
        else if (e.type !== 'torch' && e.type !== 'campfire') addShadow(faces, e.tx+0.5, e.ty+0.5, 0.4);
        if (e.type === 'tree') { let s = Math.sin(game.frameCount * 0.03 + e.swayPhase) * 0.1; addCube(faces, e.tx+0.5+s, h+1.5, e.ty+0.5, 1.2, 1.2, 1.2, [26,128,51]); addCube(faces, e.tx+0.5, h+0.5, e.ty+0.5, 0.3, 1.0, 0.3, [102,51,26]); }
        else if (e.type === 'rock') addCube(faces, e.tx+0.5, h+0.3, e.ty+0.5, 0.8, 0.6, 0.8, [128,128,128]);
        else if (e.type === 'metal') addCube(faces, e.tx+0.5, h+0.2, e.ty+0.5, 0.9, 0.4, 0.9, [153,77,26]);
        else if (e.type === 'bush') { let s = Math.sin(game.frameCount * 0.05 + e.swayPhase) * 0.05; addCube(faces, e.tx+0.5+s, h+0.3, e.ty+0.5, 0.8, 0.6, 0.8, [40,100,40]); }
        else if (e.type === 'ruin_wall') addCube(faces, e.tx+0.5, h+0.5, e.ty+0.5, 0.8, 1.0, 0.3, [110,100,90]);
        else if (e.type === 'vehicle') { addCube(faces, e.tx+0.5, h+0.3, e.ty+0.5, 1.5, 0.4, 0.8, [130,70,30]); addCube(faces, e.tx+0.5, h+0.8, e.ty+0.5, 0.8, 0.4, 0.8, [140,80,30]); }
        else if (e.type === 'house') { addCube(faces, e.tx+0.5, h+0.6, e.ty+0.5, 1.8, 1.2, 1.8, [100,90,80]); addCube(faces, e.tx+0.5, h+1.3, e.ty+0.5, 2.0, 0.2, 2.0, [80,50,40]); }
        else if (e.type === 'torch') { addCube(faces, e.tx+0.5, h+0.5, e.ty+0.5, 0.1, 1.0, 0.1, [100,60,30]); addCube(faces, e.tx+0.5, h+1.0, e.ty+0.5, 0.25, 0.25, 0.25, [255, 200, 0]); }
        else if (e.type === 'campfire') { addCube(faces, e.tx+0.2, h+0.1, e.ty+0.5, 0.3, 0.2, 0.3, [128,128,128]); addCube(faces, e.tx+0.8, h+0.1, e.ty+0.5, 0.3, 0.2, 0.3, [128,128,128]); addCube(faces, e.tx+0.5, h+0.1, e.ty+0.2, 0.3, 0.2, 0.3, [128,128,128]); addCube(faces, e.tx+0.5, h+0.1, e.ty+0.8, 0.3, 0.2, 0.3, [128,128,128]); addCube(faces, e.tx+0.5, h+0.4, e.ty+0.5, 0.6, 0.2, 0.2, [150, 80, 30]); addCube(faces, e.tx+0.5, h+0.6, e.ty+0.5, 0.4, 0.3, 0.4, [255, 150, 0]); }
    });

    let playerY = p.y;
    addShadow(faces, p.x, p.z, 0.4, 70 * (1 - Math.min(1, p.jumpY / 0.6)));
    let speedMul = 0.5;
    let breathe = 0, ls = 0, asr = 0, asl = 0;
    if (p.state === 'walk') { ls = Math.sin(game.frameCount * 0.4 * speedMul) * 0.5; asr = -ls; asl = ls; breathe = Math.abs(Math.sin(game.frameCount * 0.4 * speedMul)) * 0.05; }
    else if (p.state === 'gather') { asr = Math.sin(game.frameCount * 0.8 * speedMul) * 1.2; breathe = Math.sin(game.frameCount * 0.5 * speedMul) * 0.05; }
    else { breathe = Math.sin(game.frameCount * 0.05 * speedMul) * 0.05; }
    let hipY = playerY + 0.5, torsoY = playerY + 0.8 + breathe, shoulderY = playerY + 1.1 + breathe, headY = playerY + 1.4 + breathe;
    let ro = rotateY(0.15,0,0,p.angle); addCube(faces, p.x+ro[0], hipY, p.z+ro[2], 0.2, 0.5, 0.2, [50,50,50], -ls, p.angle, 0, -0.25, 0);
    let lo = rotateY(-0.15,0,0,p.angle); addCube(faces, p.x+lo[0], hipY, p.z+lo[2], 0.2, 0.5, 0.2, [50,50,50], ls, p.angle, 0, -0.25, 0);
    addCube(faces, p.x, torsoY, p.z, 0.5, 0.6, 0.3, [51,102,204], 0, p.angle);
    let rao = rotateY(0.35,0,0,p.angle); addCube(faces, p.x+rao[0], shoulderY, p.z+rao[2], 0.2, 0.5, 0.2, [40,80,160], -asr, p.angle, 0, -0.25, 0);
    let lao = rotateY(-0.35,0,0,p.angle); addCube(faces, p.x+lao[0], shoulderY, p.z+lao[2], 0.2, 0.5, 0.2, [40,80,160], -asl, p.angle, 0, -0.25, 0);
    addCube(faces, p.x, headY, p.z, 0.3, 0.3, 0.3, [230,179,128], 0, p.angle);

    let renderables = [];
    faces.forEach(f => {
        let pv = []; let valid = true;
        for (let v of f.verts) { let proj = project(v[0], v[1], v[2], cam); if (!proj) { valid = false; break; } pv.push(proj); }
        if (valid) { let avgZ = pv.reduce((s,p)=>s+p[2],0) / pv.length; renderables.push({ verts: pv, color: f.color, z: avgZ }); }
    });
    renderables.sort((a,b) => b.z - a.z);
    renderables.forEach(r => { ctx.beginPath(); ctx.moveTo(r.verts[0][0], r.verts[0][1]); for (let i = 1; i < r.verts.length; i++) ctx.lineTo(r.verts[i][0], r.verts[i][1]); ctx.closePath(); ctx.fillStyle = r.color; ctx.fill(); });

    ctx.textAlign = 'left'; ctx.font = '22px Arial'; ctx.fillStyle = 'white';
    let invY = 20;
    Object.keys(game.inventory).forEach(item => { if (game.inventory[item] > 0 || ['Wood','Stone','Metal','Fiber'].includes(item)) { ctx.fillText(`${item}: ${game.inventory[item]}`, 20, invY); invY += 30; } });
    let tStr = game.ambientLight < 0.5 ? "Night" : "Day";
    ctx.textAlign = 'right'; ctx.fillText(`Time: ${tStr}`, GAME_W - 20, 40);
    ctx.textAlign = 'center';
    game.feedbackTexts.forEach(ft => { ctx.globalAlpha = Math.max(0, ft.timer / 2.0); ctx.fillStyle = 'yellow'; ctx.fillText(ft.text, ft.x, ft.y); });
    ctx.globalAlpha = 1.0;

    let hbSize = 60;
    let totalW = 5 * hbSize;
    let hbStartX = (GAME_W / 2) - (totalW / 2);
    let hbY = GAME_H - 70;
    for (let i = 0; i < 5; i++) {
        let hx = hbStartX + i * hbSize;
        if (uiAssets['hotbar_slot'].complete) {
            ctx.drawImage(uiAssets['hotbar_slot'], hx, hbY, hbSize, hbSize);
        }
        if (game.selectedSlot === i) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.lineWidth = 3;
            ctx.strokeRect(hx, hbY, hbSize, hbSize);
        }
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(game.hotbar[i], hx + hbSize/2, hbY + hbSize - 5);
        let count = game.inventory[game.hotbar[i]];
        if (count !== undefined && count > 0) {
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(count, hx + hbSize - 5, hbY + 18);
        }
    }

    if (game.state === 'playing') {
        let btns = getButtons();
        if (game.joy.active) {
            drawUIImage('joystick_base', game.joy.x, game.joy.y, 160);
            drawUIImage('joystick_knob', game.joy.x + game.joy.dx, game.joy.y + game.joy.dy, 80);
        }
        drawUIImage('btn_break', btns.break.x, btns.break.y, 90);
        drawUIImage('btn_jump', btns.jump.x, btns.jump.y, 70);
        drawUIImage('btn_craft', btns.craft.x, btns.craft.y, 90);
        drawUIImage('btn_inventory', btns.inv.x, btns.inv.y, 90);
    }

    if (game.state === 'crafting' || game.state === 'inventory') {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0,0,GAME_W,GAME_H);
        
        let winW = 600;
        let winH = 600;
        if (winW > GAME_W * 0.9) { winW = GAME_W * 0.9; winH = winW; }
        let winX = (GAME_W / 2) - (winW / 2);
        let winY = (GAME_H / 2) - (winH / 2);
        
        if (uiAssets['ui_window'].complete) {
            ctx.drawImage(uiAssets['ui_window'], winX, winY, winW, winH);
        } else {
            ctx.fillStyle = 'rgba(50,50,50,0.95)';
            ctx.fillRect(winX, winY, winW, winH);
        }

        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(winX + 40, winY + 40, winW - 80, winH - 80);
        
        ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = 'bold 28px Arial';
        ctx.fillText(game.state.toUpperCase(), GAME_W/2, winY + 80);

        if (game.state === 'inventory') {
            let items = Object.keys(game.inventory);
            let cols = 4;
            let boxW = 80, boxH = 80;
            let startX = GAME_W/2 - (cols * boxW) / 2;
            let startY = winY + 120;
            for(let i=0; i<items.length; i++) {
                let col = i % cols;
                let row = Math.floor(i / cols);
                let ix = startX + col * boxW;
                let iy = startY + row * boxH;
                ctx.fillStyle = 'rgba(100,100,100,0.5)';
                ctx.fillRect(ix, iy, boxW-10, boxH-10);
                ctx.strokeStyle = 'gray';
                ctx.strokeRect(ix, iy, boxW-10, boxH-10);
                if(game.inventory[items[i]] > 0 || ['Wood','Stone','Metal','Fiber'].includes(items[i])) {
                    ctx.fillStyle = 'white';
                    ctx.font = '12px Arial';
                    ctx.textAlign = 'center';
                    ctx.fillText(items[i], ix + (boxW-10)/2, iy + 15);
                    ctx.font = 'bold 24px Arial';
                    ctx.fillText(game.inventory[items[i]], ix + (boxW-10)/2, iy + (boxH-10)/2 + 10);
                }
            }
            ctx.fillStyle = 'rgb(150,150,150)'; ctx.font = '18px Arial';
            ctx.fillText("Tap outside to close", GAME_W/2, winY + winH - 40);
        }

        if (game.state === 'crafting') {
            game.craftSlots = [];
            let rx = GAME_W/2, ry = winY + 120;
            ctx.font = '20px Arial';
            ctx.fillText('Recipes (Tap to Craft)', rx, ry - 20);
            game.recipes.forEach((rec, i) => {
                let sx = rx - 150, sy = ry + i * 55;
                ctx.fillStyle = 'rgba(70,70,70,0.8)';
                ctx.fillRect(sx, sy, 300, 45);
                ctx.fillStyle = 'rgba(55,55,55,0.9)';
                ctx.fillRect(sx+3, sy+3, 294, 39);
                ctx.fillStyle = rec.color;
                ctx.fillRect(sx+8, sy+8, 24, 24);
                ctx.textAlign = 'left'; ctx.fillStyle = 'white';
                ctx.fillText(rec.name, sx+45, sy+18);
                let costStr = Object.keys(rec.cost).map(r => `${r}:${rec.cost[r]}`).join(' | ');
                ctx.fillStyle = 'rgb(180,180,180)';
                ctx.fillText(`Cost: ${costStr}`, sx+45, sy+35);
                game.craftSlots.push({ recipe: rec, x: sx, y: sy, w: 300, h: 45 });
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
