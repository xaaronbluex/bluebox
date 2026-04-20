// ========================================== //
// GACHA: 抽蛋系統與飛行動畫 (gacha.js)
// ========================================== //

function drawGacha(machineType) {
    let roll = Math.random() * 100;
    let targetRarity = 'N';
    
    if (roll < 1) targetRarity = 'EXR';        
    else if (roll < 5) targetRarity = 'UR';    
    else if (roll < 20) targetRarity = 'SR';   
    else if (roll < 50) targetRarity = 'R';    
    else targetRarity = 'N';                   

    let db;
    if (machineType === 'colour') db = colorDatabase; 
    else if (machineType === 'chemical') db = elementDatabase;
    else if (machineType === 'plants') db = plantDatabase;
    else return;
    



    // 優先抽未解鎖嘅
    let pool = db.filter(c => c.rarity === targetRarity && !c.unlocked);
    if (pool.length === 0) pool = db.filter(c => c.rarity === targetRarity); 
    if (pool.length === 0) pool = db; 

    let drawnItem = pool[Math.floor(Math.random() * pool.length)];

    // 🌟 注意：呢度先唔好設做 unlocked = true，等飛到埋去先解鎖！
    showGachaPopup(drawnItem, machineType);
}

function showGachaPopup(item, type) {
    const oldPopup = document.getElementById('gacha-popup-window');
    if (oldPopup) oldPopup.remove();

    const popup = document.createElement('div');
    popup.id = 'gacha-popup-window';
    popup.className = `gacha-popup frame-${item.rarity.toLowerCase()}`;
    
    let contentHTML = '';
    let orbBg = '';
    let orbText = '';
    
    if (type === 'colour') {
        const displayColor = item.hexString === 'RAINBW' ? 'linear-gradient(45deg, red, orange, yellow, green, blue, purple)' : item.hexString;
        const fontColor = item.hexString === 'RAINBW' ? '#fff' : getContrastColor(item.hexString);
        contentHTML = `
            <div class="gacha-color-box" style="background: ${displayColor}; color: ${fontColor};">
                ${item.hexString.toUpperCase()}
            </div>
        `;
        orbBg = displayColor;
        orbText = item.hexString.toUpperCase();
    } else if (type === 'chemical') {
        contentHTML = `
            <div class="gacha-color-box element-cell ${item.cat}" style="display:flex; flex-direction:column; position:relative; background-color: #11221e;">
                <span style="position:absolute; top:5px; left:8px; font-size:12px; font-family:monospace; color:#888;">${item.z}</span>
                <span style="font-family:'Orbitron', sans-serif; font-size:42px; font-weight:bold; color:#00ffcc; line-height:1;">${item.sym}</span>
                <span style="font-family:monospace; font-size:10px; color:#aaa; margin-top:5px; text-transform:uppercase;">${item.name}</span>
            </div>
        `;
        orbBg = '#00ffcc'; // 元素飛過去嘅光芒色
        orbText = item.sym;
    }

    popup.innerHTML = `
        <div class="gacha-rarity-badge">${item.rarity}</div>
        ${contentHTML}
        <div class="gacha-status">NEW UNLOCK!</div>
    `;

    document.body.appendChild(popup);

    // 2秒後 Popup 消失，觸發「飛入解鎖」動畫
    setTimeout(() => {
        popup.classList.add('fade-out');
        
        // 獲取 Popup 當前位置作為起點
        const rect = popup.getBoundingClientRect();
        const startX = rect.left + rect.width / 2;
        const startY = rect.top + rect.height / 2;
        
        setTimeout(() => {
            popup.remove();
            flyToSlot(item, type, startX, startY, orbBg, orbText);
        }, 500);
    }, 2000);
}


function flyToSlot(item, type, startX, startY, bg, text) {
    let targetEl = null;
    
    if (type === 'colour') {
        const gridContainer = document.getElementById('grid-colour');
        let targetHex = item.hexString === 'RAINBW' ? null : item.hexString.toUpperCase();
        if (gridContainer && targetHex) {
            // 🌟 精準導航：根據 hex 搵出 DOM 格仔
            targetEl = gridContainer.querySelector(`.grid-item[data-hex="${targetHex}"]`);
        }
    } else {
        const gridContainer = document.getElementById('grid-chemical');
        if (gridContainer) {
            let gridIndex = (item.pos.r - 1) * 18 + (item.pos.c - 1);
            if (gridContainer.children[gridIndex]) {
                targetEl = gridContainer.children[gridIndex];
            }
        }
    }

    if (!targetEl) { 
        finalizeUnlock(item, type); 
        return; 
    }

    const tRect = targetEl.getBoundingClientRect();
    const eX = tRect.left + tRect.width / 2, eY = tRect.top + tRect.height / 2;
    const orb = document.createElement('div');
    orb.className = 'flying-orb';
    orb.style.cssText = `background:${bg}; color:#000; width:60px; height:40px; left:${startX-30}px; top:${startY-20}px; transform:scale(1.5);`;
    orb.innerText = text;
    document.body.appendChild(orb);

    requestAnimationFrame(() => {
        orb.style.left = `${eX-30}px`; orb.style.top = `${eY-20}px`;
        orb.style.transform = 'scale(0.2)'; orb.style.opacity = '0';
    });

    setTimeout(() => { orb.remove(); finalizeUnlock(item, type); }, 800);
}

function finalizeUnlock(item, type) {
    item.unlocked = true;
    item.justUnlocked = true; // 🌟 標記為剛剛解鎖，用嚟觸發閃光
    
    refreshDioramas();
    
    // 1.5 秒後移除標記，避免 refresh 時又閃過
    setTimeout(() => {
        item.justUnlocked = false; 
    }, 1500);
}

// 🌟 終極防 Crash 更新機制 (Try-Catch 保護)
function refreshDioramas() {
    // 1. 永遠優先更新下方兩個圖鑑 (保證一定會變色！)
    if (document.getElementById('grid-colour')) {
        renderCollectionGrid('grid-colour');
    }
    if (document.getElementById('grid-chemical') && typeof renderPeriodicTable === 'function') {
        renderPeriodicTable();
    }

    // 2. 更新 Phaser 3D 場景 (加入 Try-Catch 防止 Crash 拖死全家)
    try {
        if (typeof colourPhaser !== 'undefined' && colourPhaser !== null) {
            let scene = colourPhaser.scene.scenes[0];
            if (scene) {
                scene.children.removeAll(); 
                createHexGrid(scene);
            }
        }
    } catch (e) {
        console.warn("Phaser 場景更新被安全攔截，圖鑑不受影響:", e);
    }
}

// 🟢 [DEV] 一鍵全開 (ALL ON)
function unlockAllHack() {
    console.log("Dev Hack: Unlocking All...");
    colorDatabase.forEach(c => c.unlocked = true);
    elementDatabase.forEach(e => e.unlocked = true);
    refreshDioramas(); // 調用頭先寫落嘅 refresh function
}

// 🔴 [DEV] 一鍵重置 (RESET)
function resetAllHack() {
    console.log("Dev Hack: Resetting All...");
    colorDatabase.forEach(c => c.unlocked = false);
    elementDatabase.forEach(e => e.unlocked = false);
    refreshDioramas();
}

// 輔助 function
function refreshDioramas() {
    if (document.getElementById('grid-colour')) {
        renderCollectionGrid('grid-colour');
        if (colourPhaser) {
            let scene = colourPhaser.scene.keys.default;
            scene.children.removeAll(); 
            createHexGrid(scene);
        }
    }
    if (document.getElementById('grid-chemical')) {
        renderPeriodicTable();
    }
}
