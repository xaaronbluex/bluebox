// ========================================== //
// 1. 全域變數與數據庫生成 (database.js)
// ========================================== //
let colorDatabase = [];
let colourPhaser = null;
let donutInterval = null;
let donutA = 0, donutB = 0;

// 全域抓取 Tooltip DOM
const hoverTooltip = document.getElementById('hover-tooltip');

// --- COLOUR 數據 ---
const manualColorMap = [
    ["#99ff00", "#66ff00", "#33ff00", "#66ff33", "#33cc00", "#00cc33", "#33ff66", "#00ff33", "#00ff66"],
    ["#ccff00", "#99ff33", "#99ff66", "#66cc33", "#339900", "#009933", "#33cc66", "#66ff99", "#33ff99", "#00ff99"],
    ["#ccff33", "#ccff66", "#66cc00", "#00ff00", "#00cc00", "#009900", "#006600", "#003300", "#00cc66", "#66ffcc", "#00ffcc"],
    ["#99cc00", "#99cc33", "#333300", "#336600", "#33ff33", "#33cc33", "#339933", "#336633", "#006633", "#00ffff", "#33cc99", "#33ffcc"],
    ["#cc9900", "#669900", "#666600", "#666633", "#669933", "#66ff66", "#66cc66", "#669966", "#339966", "#33ffff", "#00cccc", "#009966", "#00cc99"],
    ["#ffcc33", "#996600", "#999900", "#999933", "#999966", "#99cc66", "#99ff99", "#99cc99", "#66cc99", "#66ffff", "#33cccc", "#009999", "#006699", "#0099cc"],
    ["#ffcc00", "#cc9933", "#cccc00", "#cccc33", "#cccc66", "#cccc99", "#ccff99", "#ccffcc", "#99ffcc", "#99ffff", "#66cccc", "#339999", "#006666", "#3399cc", "#33ccff"],
    ["#ff9900", "#ffcc66", "#ffff00", "#ffff33", "#ffff66", "#ffff99", "#ffffcc", "#999999", "#666666", "#ccffff", "#99cccc", "#669999", "#336666", "#003333", "#66ccff", "#00ccff"],
    ["#ff6600", "#ff9933", "#cc6600", "#663300", "#996633", "#cc9966", "#ffcc99", "#cccccc", "RAINBW", "#333333", "#99ccff", "#6699cc", "#336699", "#003366", "#0066cc", "#3399ff", "#0099ff"],
    ["#ff3300", "#ff9966", "#330000", "#663333", "#996666", "#cc9999", "#ffcccc", "#ffffff", "#000000", "#ccccff", "#9999ff", "#6666ff", "#3333ff", "#0000ff", "#6699ff", "#0066ff"],
    ["#ff6633", "#cc6633", "#660000", "#993333", "#cc6666", "#ff9999", "#ff99cc", "#ffccff", "#cc99ff", "#9999cc", "#6666cc", "#3333cc", "#0000cc", "#3366cc", "#0033ff"],
    ["#cc3300", "#993300", "#990000", "#cc3333", "#ff6666", "#cc6699", "#cc99cc", "#ff99ff", "#9966cc", "#666699", "#333399", "#000099", "#003399", "#3366ff"],
    ["#cc0033", "#990033", "#cc0000", "#ff3333", "#993366", "#996699", "#cc66cc", "#ff66ff", "#663399", "#333366", "#000066", "#330099", "#0033cc"],
    ["#ff3366", "#cc3366", "#ff0000", "#660033", "#663366", "#993399", "#cc33cc", "#ff33ff", "#330066", "#000033", "#6633cc", "#3300cc"],
    ["#ff0033", "#ff6699", "#cc0066", "#330033", "#660066", "#990099", "#cc00cc", "#ff00ff", "#6600cc", "#9966ff", "#6633ff"],
    ["#ff0066", "#ff3399", "#ff66cc", "#cc3399", "#990066", "#660099", "#9933cc", "#cc66ff", "#9933ff", "#3300ff"],
    ["#ff0099", "#ff00cc", "#ff33cc", "#cc0099", "#9900cc", "#cc33ff", "#cc00ff", "#9900ff", "#6600ff"]
];



// 判定顏色稀有度邏輯
function getRarity(hexStr) {
    if (hexStr === 'RAINBW') return 'EXR';
    
    let upperHex = hexStr.toUpperCase();
    if (upperHex === '#000000' || upperHex === '#FFFFFF') return 'UR';
    
    // 檢查係咪 6 個字母完全一樣 (例如 #CCCCCC, #333333)
    if (/^#(.)\1{5}$/i.test(hexStr)) return 'SR'; 
    
    // 計算亮度區分 Rare (淺色) 同 Common (深色)
    let r = parseInt(hexStr.substr(1,2), 16);
    let g = parseInt(hexStr.substr(3,2), 16);
    let b = parseInt(hexStr.substr(5,2), 16);
    let lum = (r * 299 + g * 587 + b * 114) / 1000;
    
    return lum > 128 ? 'R' : 'N'; // 亮度 > 128 為 Rare (淺), 否則 Common (深)
}

function generateColors() {
    colorDatabase = [];
    let idCounter = 0;
    
    // 直接使用 manualColorMap 生成數據庫，確保 100% 準確
    manualColorMap.forEach(row => {
        row.forEach(hex => {
            let isRainbw = (hex === 'RAINBW');
            colorDatabase.push({
                id: idCounter++,
                hexString: hex,
                hexCode: isRainbw ? 0xffffff : parseInt(hex.replace('#', '0x')),
                rarity: getRarity(hex),
                unlocked: false // 🔒 預設全部鎖上，等抽！
            });
        });
    });
}



// --- CHEMICAL 數據 ---
const elementsDataRaw = [
    "H,Hydrogen,1.008", "He,Helium,4.0026", "Li,Lithium,6.94", "Be,Beryllium,9.0122", "B,Boron,10.81", "C,Carbon,12.011", "N,Nitrogen,14.007", "O,Oxygen,15.999", "F,Fluorine,18.998", "Ne,Neon,20.180",
    "Na,Sodium,22.990", "Mg,Magnesium,24.305", "Al,Aluminum,26.982", "Si,Silicon,28.085", "P,Phosphorus,30.974", "S,Sulfur,32.06", "Cl,Chlorine,35.45", "Ar,Argon,39.95",
    "K,Potassium,39.098", "Ca,Calcium,40.078", "Sc,Scandium,44.956", "Ti,Titanium,47.867", "V,Vanadium,50.942", "Cr,Chromium,51.996", "Mn,Manganese,54.938", "Fe,Iron,55.845", "Co,Cobalt,58.933", "Ni,Nickel,58.693", "Cu,Copper,63.546", "Zn,Zinc,65.38", "Ga,Gallium,69.723", "Ge,Germanium,72.630", "As,Arsenic,74.922", "Se,Selenium,78.971", "Br,Bromine,79.904", "Kr,Krypton,83.798",
    "Rb,Rubidium,85.468", "Sr,Strontium,87.62", "Y,Yttrium,88.906", "Zr,Zirconium,91.224", "Nb,Niobium,92.906", "Mo,Molybdenum,95.95", "Tc,Technetium,[98]", "Ru,Ruthenium,101.07", "Rh,Rhodium,102.91", "Pd,Palladium,106.42", "Ag,Silver,107.87", "Cd,Cadmium,112.41", "In,Indium,114.82", "Sn,Tin,118.71", "Sb,Antimony,121.76", "Te,Tellurium,127.60", "I,Iodine,126.90", "Xe,Xenon,131.29",
    "Cs,Cesium,132.91", "Ba,Barium,137.33", "La,Lanthanum,138.91", "Ce,Cerium,140.12", "Pr,Praseodymium,140.91", "Nd,Neodymium,144.24", "Pm,Promethium,[145]", "Sm,Samarium,150.36", "Eu,Europium,151.96", "Gd,Gadolinium,157.25", "Tb,Terbium,158.93", "Dy,Dysprosium,162.50", "Ho,Holmium,164.93", "Er,Erbium,167.26", "Tm,Thulium,168.93", "Yb,Ytterbium,173.05", "Lu,Lutetium,174.97", "Hf,Hafnium,178.49", "Ta,Tantalum,180.95", "W,Tungsten,183.84", "Re,Rhenium,186.21", "Os,Osmium,190.23", "Ir,Iridium,192.22", "Pt,Platinum,195.08", "Au,Gold,196.97", "Hg,Mercury,200.59", "Tl,Thallium,204.38", "Pb,Lead,207.2", "Bi,Bismuth,208.98", "Po,Polonium,[209]", "At,Astatine,[210]", "Rn,Radon,[222]",
    "Fr,Francium,[223]", "Ra,Radium,[226]", "Ac,Actinium,[227]", "Th,Thorium,232.04", "Pa,Protactinium,231.04", "U,Uranium,238.03", "Np,Neptunium,[237]", "Pu,Plutonium,[244]", "Am,Americium,[243]", "Cm,Curium,[247]", "Bk,Berkelium,[247]", "Cf,Californium,[251]", "Es,Einsteinium,[252]", "Fm,Fermium,[257]", "Md,Mendelevium,[258]", "No,Nobelium,[259]", "Lr,Lawrencium,[266]", "Rf,Rutherfordium,[267]", "Db,Dubnium,[268]", "Sg,Seaborgium,[269]", "Bh,Bohrium,[270]", "Hs,Hassium,[269]", "Mt,Meitnerium,[278]", "Ds,Darmstadtium,[281]", "Rg,Roentgenium,[282]", "Cn,Copernicium,[285]", "Nh,Nihonium,[286]", "Fl,Flerovium,[289]", "Mc,Moscovium,[290]", "Lv,Livermorium,[293]", "Ts,Tennessine,[294]", "Og,Oganesson,[294]"
];

// ========================================== //
// CHEMICAL: 元素數據庫與稀有度設定
// ========================================== //
let elementDatabase = [];

function getElementCategory(z) {
    if ([1, 6, 7, 8, 15, 16, 34].includes(z)) return 'cat-nonmetal';
    if ([9, 17, 35, 53, 85, 117].includes(z)) return 'cat-halogen';
    if ([2, 10, 18, 36, 54, 86, 118].includes(z)) return 'cat-noble';
    if ([5, 14, 32, 33, 51, 52].includes(z)) return 'cat-metalloid';
    if ([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116].includes(z)) return 'cat-post-transition';
    if (z >= 57 && z <= 71) return 'cat-lanthanide';
    if (z >= 89 && z <= 103) return 'cat-actinide';
    if ([3, 11, 19, 37, 55, 87].includes(z)) return 'cat-alkali';
    if ([4, 12, 20, 38, 56, 88].includes(z)) return 'cat-alkaline';
    return 'cat-transition';
}

function getElementGridPosition(z) {
    if (z === 1) return {c: 1, r: 1};
    if (z === 2) return {c: 18, r: 1};
    if (z >= 3 && z <= 4) return {c: z - 2, r: 2};
    if (z >= 5 && z <= 10) return {c: z + 8, r: 2};
    if (z >= 11 && z <= 12) return {c: z - 10, r: 3};
    if (z >= 13 && z <= 18) return {c: z + 0, r: 3};
    if (z >= 19 && z <= 36) return {c: z - 18, r: 4};
    if (z >= 37 && z <= 54) return {c: z - 36, r: 5};
    if (z >= 55 && z <= 56) return {c: z - 54, r: 6};
    if (z >= 72 && z <= 86) return {c: z - 68, r: 6};
    if (z >= 87 && z <= 88) return {c: z - 86, r: 7};
    if (z >= 104 && z <= 118) return {c: z - 100, r: 7};
    if (z >= 57 && z <= 71) return {c: z - 53, r: 9}; 
    if (z >= 89 && z <= 103) return {c: z - 85, r: 10}; 
    return {c: 1, r: 1};
}

// 判定元素稀有度 (基於化學特性)
function getElementRarity(z) {
    if ([2, 10, 18, 36, 54, 86, 118, 79, 47, 78].includes(z)) return 'EXR'; // 貴族氣體 + 貴金屬(金銀鉑)
    if (z >= 89 && z <= 103) return 'UR'; // 錒系元素 (極度放射性)
    if (z >= 57 && z <= 71) return 'SR';  // 鑭系元素 (稀土)
    if ([9, 17, 35, 53, 85, 117].includes(z)) return 'R'; // 鹵素
    if (z >= 21 && z <= 30) return 'R'; // 常見過渡金屬
    return 'N'; // 鹼金屬、非金屬等基礎生命元素為 Common
}

function generateElements() {
    elementDatabase = elementsDataRaw.map((dataString, index) => {
        let parts = dataString.split(',');
        let z = index + 1;
        return {
            z: z,
            sym: parts[0],
            name: parts[1],
            mass: parts[2],
            cat: getElementCategory(z),
            pos: getElementGridPosition(z),
            rarity: getElementRarity(z),
            unlocked: false // 🔒 預設全鎖
        };
    });
}

// ========================================== //
// 🌟 獨立處理：下方圖鑑永遠維持 18x12 經典排版
// ========================================== //
function renderCollectionGrid(containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    
    // 定義 18x12 完美還原嘅顏色順序
    const stepsAsc = ['00', '33', '66', '99', 'CC', 'FF'];
    const stepsDesc = ['FF', 'CC', '99', '66', '33', '00'];
    const rTop = ['CC', '66', '00']; 
    const rBot = ['FF', '99', '33']; 

    let classicHexOrder = [];
    
    for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 18; c++) {
            let blockCol = Math.floor(c / 6);
            let R = r < 6 ? rTop[blockCol] : rBot[blockCol];
            let G = (blockCol === 1) ? stepsAsc[c % 6] : stepsDesc[c % 6];
            let B = stepsAsc[r % 6];
            classicHexOrder.push(`#${R}${G}${B}`);
        }
    }

    // 根據經典順序嚟生成 DOM，取代原本 colorDatabase 嘅 ID 順序
    classicHexOrder.forEach(targetHex => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        
        // 喺資料庫搵返對應嘅顏色 (檢查解鎖狀態)
        let dbColor = colorDatabase.find(c => c.hexString.toUpperCase() === targetHex.toUpperCase());
        
        if (dbColor && dbColor.unlocked) {
            item.style.backgroundColor = dbColor.hexString;
            const textNode = document.createElement('span');
            textNode.className = 'grid-item-text';
            textNode.innerText = dbColor.hexString.toUpperCase();
            textNode.style.color = getContrastColor(dbColor.hexString); 
            item.appendChild(textNode);

            if(hoverTooltip) {
                item.addEventListener('mouseenter', (e) => {
                    hoverTooltip.innerHTML = `[ HEX: ${dbColor.hexString.toUpperCase()} ]`;
                    hoverTooltip.style.display = 'block'; 
                    hoverTooltip.style.borderColor = dbColor.hexString; 
                });
                item.addEventListener('mousemove', (e) => {
                    hoverTooltip.style.left = e.clientX + 'px'; 
                    hoverTooltip.style.top = e.clientY + 'px';  
                });
                item.addEventListener('mouseleave', () => {
                    hoverTooltip.style.display = 'none'; 
                });
            }
        } else {
            item.style.backgroundColor = '#0d1b18'; // 🔒 未解鎖狀態
        }
        grid.appendChild(item);
    });

    // ========================================== //
// 🌟 獨立處理：下方圖鑑永遠維持 18x12 經典 6大區塊排版
// ========================================== //
function renderCollectionGrid(containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    
    // 💡 經典 216 色方塊陣列演算法 (6 大區塊，每塊 6x6)
    // 完美還原標準圖譜：左上角 #FFFFFF，右下角 #000000
    const R_vals = ['FF', 'CC', '99', '66', '33', '00']; // 6 個大區塊嘅 Red 值
    const G_vals = ['FF', 'CC', '99', '66', '33', '00']; // 每個區塊內嘅 Y 軸 (Green 遞減)
    const B_vals = ['FF', 'CC', '99', '66', '33', '00']; // 每個區塊內嘅 X 軸 (Blue 遞減)

    let classicHexOrder = [];
    
    for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 18; c++) {
            let blockRow = Math.floor(r / 6); // 0 (上排), 1 (下排)
            let blockCol = Math.floor(c / 6); // 0 (左), 1 (中), 2 (右)
            let blockIndex = blockRow * 3 + blockCol; // 區塊 Index: 0 到 5
            
            let R = R_vals[blockIndex];
            let G = G_vals[r % 6];
            let B = B_vals[c % 6];
            classicHexOrder.push(`#${R}${G}${B}`);
        }
    }

    // 根據經典順序嚟生成 DOM
    classicHexOrder.forEach(targetHex => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        
        // 喺資料庫搵返對應嘅顏色 (檢查解鎖狀態)
        let dbColor = colorDatabase.find(c => c.hexString.toUpperCase() === targetHex.toUpperCase());
        
        if (dbColor && dbColor.unlocked) {
            item.style.backgroundColor = dbColor.hexString;
            const textNode = document.createElement('span');
            textNode.className = 'grid-item-text';
            textNode.innerText = dbColor.hexString.toUpperCase();
            textNode.style.color = getContrastColor(dbColor.hexString); 
            item.appendChild(textNode);

            if(hoverTooltip) {
                item.addEventListener('mouseenter', (e) => {
                    hoverTooltip.innerHTML = `[ HEX: ${dbColor.hexString.toUpperCase()} ]`;
                    hoverTooltip.style.display = 'block'; 
                    hoverTooltip.style.borderColor = dbColor.hexString; 
                });
                item.addEventListener('mousemove', (e) => {
                    hoverTooltip.style.left = e.clientX + 'px'; 
                    hoverTooltip.style.top = e.clientY + 'px';  
                });
                item.addEventListener('mouseleave', () => {
                    hoverTooltip.style.display = 'none'; 
                });
            }
        } else {
            item.style.backgroundColor = '#0d1b18'; // 🔒 未解鎖狀態
        }
        grid.appendChild(item);
    });

    // 🚫 已經按照要求將 RAINBW 從 Inventory Table 徹底移除！
    // 抽中 RAINBW 時，佢只會喺上面嘅 3D 放射色輪度出現。
    }
}