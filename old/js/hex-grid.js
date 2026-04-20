// ========================================== //
// 2. COLOUR: Phaser 互動色輪與顏色網格 (hex-grid.js)
// ========================================== //

function getContrastColor(hexcolor) {
    hexcolor = hexcolor.replace("#", "");
    let r = parseInt(hexcolor.substr(0,2), 16);
    let g = parseInt(hexcolor.substr(2,2), 16);
    let b = parseInt(hexcolor.substr(4,2), 16);
    let yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return (yiq >= 128) ? '#000000' : '#ffffff';
}

function initColourDiorama() {
    if (colourPhaser) return;
    colourPhaser = new Phaser.Game({
        type: Phaser.AUTO,
        parent: 'canvas-colour',
        transparent: true,
        input: { windowEvents: false, mouse: { preventDefaultWheel: false }, touch: { capture: false } },
        resolution: window.devicePixelRatio || 2,
        antialias: true, 
        scale: {
            mode: Phaser.Scale.NONE,
            autoCenter: Phaser.Scale.CENTER_BOTH,
            width: 1000,
            height: 650 
        },
        scene: { 
            create: function() { createHexGrid(this); },
            update: updateDiorama 
        }
    });
}

function createHexGrid(scene) {
    const canvasW = scene.cameras.main.width;
    const canvasH = scene.cameras.main.height;
    const size = 18; 
    const hexWidth = size * 1.5;
    const hexHeight = Math.sqrt(3) * size;
    const totalW = (manualColorMap.length - 1) * hexWidth;
    const centerY = (canvasH / 2);
    const startX = (canvasW / 2) - (totalW / 2);

    scene.rainbowTiles = [];

    manualColorMap.forEach((column, q) => {
        const colH = (column.length - 1) * hexHeight;
        const colStartY = centerY - (colH / 2);

        column.forEach((hex, r) => {
            const x = startX + (q * hexWidth);
            const y = colStartY + (r * hexHeight);

            const points = [];
            for (let i = 0; i < 6; i++) {
                const angle = (i * 60) * (Math.PI / 180);
                points.push(size * Math.cos(angle), size * Math.sin(angle));
            }

            const isRainbow = (hex === "RAINBW");
            const colorData = isRainbow ? {unlocked: true} : colorDatabase.find(c => c.hexString.toUpperCase() === hex.toUpperCase());
            const isUnlocked = colorData && colorData.unlocked;

            const fillColor = isUnlocked ? (isRainbow ? 0xffffff : colorData.hexCode) : 0x111b18;
            const poly = scene.add.polygon(x, y, points, fillColor).setStrokeStyle(1, isUnlocked ? fillColor : 0x1a322c);

            if (isRainbow) scene.rainbowTiles.push(poly);

            if (isUnlocked) {
                poly.setInteractive(new Phaser.Geom.Polygon(points), Phaser.Geom.Polygon.Contains);
                poly.on('pointerover', (pointer) => {
                    poly.setDepth(1);
                    poly.setStrokeStyle(2, 0xffffff); 
                    scene.tweens.add({ targets: poly, scale: 1.15, duration: 100 });

                    if(hoverTooltip) {
                        let displayHex = isRainbow ? "RAINBOW SSR" : colorData.hexString.toUpperCase();
                        hoverTooltip.innerHTML = `[ HEX: ${displayHex} ]`;
                        hoverTooltip.style.display = 'block';
                        hoverTooltip.style.borderColor = isRainbow ? '#ffffff' : colorData.hexString;
                    }
                });
                poly.on('pointermove', (pointer) => {
                    if(hoverTooltip) {
                        hoverTooltip.style.left = pointer.event.clientX + 'px';
                        hoverTooltip.style.top = pointer.event.clientY + 'px';
                    }
                });
                poly.on('pointerout', () => {
                    poly.setDepth(0);
                    poly.setStrokeStyle(1, isRainbow ? 0xffffff : colorData.hexCode);
                    scene.tweens.add({ targets: poly, scale: 1, duration: 100 });
                    if(hoverTooltip) hoverTooltip.style.display = 'none';
                });
            }
        });
    });
}

function updateDiorama() {
    if (this.rainbowTiles) {
        let hue = (Date.now() % 3000) / 3000;
        let c = Phaser.Display.Color.HSVToRGB(hue, 0.8, 1);
        let hexColor = Phaser.Display.Color.GetColor(c.r, c.g, c.b);
        this.rainbowTiles.forEach(t => {
            t.setFillStyle(hexColor);
            if (t.depth === 0) t.setStrokeStyle(1, hexColor);
        });
    }
}

// ========================================== //
// 🌟 獨立處理：下方圖鑑永遠維持 18x12 經典 6大區塊排版 (帶文字)
// ========================================== //
// ========================================== //
// 🌟 獨立處理：下方圖鑑永遠維持 18x12 經典排版 (帶文字 + 閃光修復)
// ========================================== //
function renderCollectionGrid(containerId) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = '';
    
    const R_vals = ['FF', 'CC', '99', '66', '33', '00']; 
    const G_vals = ['FF', 'CC', '99', '66', '33', '00']; 
    const B_vals = ['FF', 'CC', '99', '66', '33', '00']; 

    let classicHexOrder = [];
    
    for (let r = 0; r < 12; r++) {
        for (let c = 0; c < 18; c++) {
            let blockRow = Math.floor(r / 6); 
            let blockCol = Math.floor(c / 6); 
            let blockIndex = blockRow * 3 + blockCol; 
            
            let R = R_vals[blockIndex];
            let G = G_vals[r % 6];
            let B = B_vals[c % 6];
            classicHexOrder.push(`#${R}${G}${B}`);
        }
    }

    classicHexOrder.forEach(targetHex => {
        const item = document.createElement('div');
        item.className = 'grid-item';
        
        // 🌟 加入 data-hex 屬性，等光球唔會蕩失路！
        item.dataset.hex = targetHex.toUpperCase();
        
        let dbColor = colorDatabase.find(c => c.hexString.toUpperCase() === targetHex.toUpperCase());
        
        if (dbColor && dbColor.unlocked) {
            item.style.backgroundColor = dbColor.hexString;
            
            // 🌟 如果係啱啱抽中嘅，即刻加個高光閃爍特效！
            if (dbColor.justUnlocked) {
                item.classList.add('shine-flare');
            }
            
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
            item.style.backgroundColor = '#0d1b18'; 
        }
        grid.appendChild(item);
    });
}