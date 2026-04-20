// ========================================== //
// 4. UI 導航與系統初始化 (ui.js)
// ========================================== //

function openTab(tabId) {
    // 1. 隱藏所有分頁，並移除所有按鈕嘅 active 狀態
    const allContents = document.querySelectorAll('.tab-content');
    const allButtons = document.querySelectorAll('.tab-btn');
    
    allContents.forEach(content => content.style.display = 'none');
    allButtons.forEach(btn => btn.classList.remove('active'));
    
    // 🌟 絕對防禦：強制將 3 個 3D 畫布隱藏 (防止 Canvas 穿透/重疊)
    const cColour = document.getElementById('canvas-colour');
    const cDonut = document.getElementById('canvas-donut');
    const cCube = document.getElementById('canvas-cube');
    if (cColour) cColour.style.display = 'none';
    if (cDonut) cDonut.style.display = 'none';
    if (cCube) cCube.style.display = 'none';

    // 2. 顯示目標分頁
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        targetTab.style.display = 'flex';
        targetTab.style.flexDirection = 'column';
    }
    
    // 3. 幫對應粒掣加返 .active 狀態
    allButtons.forEach(btn => {
        if (btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabId)) {
            btn.classList.add('active');
        }
    });

    // 4. 啟動對應 3D 引擎，並「強制解鎖」對應嘅畫布！
    
    // --- COLOUR TAB ---
    if (tabId === 'tab-colour') {
        if (cColour) cColour.style.display = 'block'; // 解鎖 Colour 畫布
        if (typeof initColourDiorama === 'function') initColourDiorama();
        if (typeof renderCollectionGrid === 'function') renderCollectionGrid('grid-colour');
    }

    // --- CHEMICAL TAB ---
    if (tabId === 'tab-chemical') {
        if (cDonut) cDonut.style.display = 'block'; // 解鎖 Donut 畫布
        if (typeof initChemicalDonut === 'function') initChemicalDonut();
        if (typeof renderPeriodicTable === 'function') renderPeriodicTable();
    } else {
        if (typeof donutInterval !== 'undefined' && donutInterval) {
            clearInterval(donutInterval); // 停用慳資源
            donutInterval = null;
        }
    }

    // --- HK 3D TAB ---
    if (tabId === 'tab-hk') {
        if (cCube) cCube.style.display = 'block'; // 解鎖 Cube 畫布
        if (typeof initAsciiCube === 'function') initAsciiCube();
    } else {
        if (typeof cubeInterval !== 'undefined' && cubeInterval) {
            clearInterval(cubeInterval); // 停用慳資源
            cubeInterval = null;
        }
    }
}

// 🌟 系統總初始化 (window.onload 只可以有一個)
window.onload = () => {
    console.log("BLUE LIFE: System initializing...");
    
    // 1. 載入所有數據庫
    if (typeof generateColors === 'function') generateColors(); 
    if (typeof generateElements === 'function') generateElements();
    
    // 2. 預設打開第一個分頁
    openTab('tab-colour'); 
    
    console.log("BLUE LIFE: Archive Loaded.");
};