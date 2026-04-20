// ========================================== //
// 3. CHEMICAL: Donut 3D 與元素週期表 (donut-3d.js)
// ========================================== //

function initChemicalDonut() {
    const canvas = document.getElementById('canvas-donut');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    const width = 1000;
    const height = 566;
    
    const R1 = 1, R2 = 2.5, K2 = 5;
    
    const columns = 50, rows = 50; 
    
    const donutRenderSize = 500; 
    const cellW = donutRenderSize / columns; 
    const cellH = donutRenderSize / rows;
    const K1 = columns * K2 * 3 / (9 * (R1 + R2));

    const elementMap = [ "H", "He", "Li", "C", "N", "O", "F", "Si", "P", "S", "Fe", "Au" ];
    const colorMap = [ "255, 102, 102", "204, 153, 255", "255, 153, 204", "102, 255, 204", "153, 204, 255", "153, 255, 153", "102, 204, 255", "204, 255, 153", "255, 204, 102", "255, 255, 102", "204, 204, 204", "255, 215, 0" ];

    function renderDonut() {
        ctx.clearRect(0, 0, width, height);
        
        let zbuffer = new Array(columns * rows).fill(0);
        let output = new Array(columns * rows).fill('');
        let lumBuffer = new Array(columns * rows).fill(0);
        let colorIndexBuffer = new Array(columns * rows).fill(0);

        let cA = Math.cos(donutA), sA = Math.sin(donutA);
        let cB = Math.cos(donutB), sB = Math.sin(donutB);

        for (let theta = 0; theta < 6.28; theta += 0.07) {
            let ct = Math.cos(theta), st = Math.sin(theta);
            for (let phi = 0; phi < 6.28; phi += 0.02) {
                let cp = Math.cos(phi), sp = Math.sin(phi);
                let circlex = R2 + R1 * ct;
                let circley = R1 * st;
                let x = circlex * (cB * cp + sA * sB * sp) - circley * cA * sB;
                let y = circlex * (sB * cp - sA * cB * sp) + circley * cA * cB;
                let z = K2 + cA * circlex * sp + circley * sA;
                let ooz = 1 / z;
                
                let xp = Math.floor(columns / 2 + K1 * ooz * x);
                let yp = Math.floor(rows / 2 - K1 * ooz * y); 
                let L = cp * ct * sB - cA * ct * sp - sA * st + cB * (cA * st - ct * sA * sp);

                if (L > 0) {
                    if (xp >= 0 && xp < columns && yp >= 0 && yp < rows) {
                        let idx = xp + yp * columns;
                        if (ooz > zbuffer[idx]) {
                            zbuffer[idx] = ooz;
                            let lumIndex = Math.floor(L * 8);
                            let mappedIdx = Math.min(Math.max(lumIndex, 0), 11);
                            lumBuffer[idx] = lumIndex;
                            output[idx] = elementMap[mappedIdx]; 
                            colorIndexBuffer[idx] = mappedIdx; 
                        }
                    }
                }
            }
        }

        ctx.font = 'bold 15px Courier New'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const offsetX = (width - donutRenderSize) / 2;
        const offsetY = ((height - donutRenderSize) / 2) - 40; 

// 搵呢個 for loop
    for (let i = 0; i < columns * rows; i++) {
        if (output[i] !== '') {
            let xp = offsetX + (i % columns) * cellW + cellW / 2;
            let yp = offsetY + Math.floor(i / columns) * cellH + cellH / 2;
            let alpha = Math.min(1, (lumBuffer[i] / 8) + 0.1);
            
            // 💡 檢查呢個字母是否已經解鎖
            let sym = output[i];
            let dbItem = elementDatabase.find(e => e.sym === sym);
            let isUnlocked = dbItem ? dbItem.unlocked : false;
            
            // 如果未解鎖，用型格嘅 Bunker 廢土灰；如果解鎖咗，就用原本身嘅彩色！
            let renderColor = isUnlocked ? colorMap[colorIndexBuffer[i]] : "60, 75, 70"; 
            
            ctx.fillStyle = `rgba(${renderColor}, ${alpha})`; 
            ctx.fillText(output[i], xp, yp);
        }
    }

        donutA += 0.002; 
        donutB += 0.001; 
        
        donutInterval = requestAnimationFrame(renderDonut);
    }

    if (donutInterval) cancelAnimationFrame(donutInterval);
    renderDonut();
}

// 喺 js/donut-3d.js 入面搵返呢段並替換：

function renderPeriodicTable() {
    const grid = document.getElementById('grid-chemical');
    if (!grid) return;
    grid.innerHTML = '';

    for (let r = 1; r <= 10; r++) {
        for (let c = 1; c <= 18; c++) {
            const item = document.createElement('div');
            let data = elementDatabase.find(e => e.pos.r === r && e.pos.c === c);

            if (data) {
                item.className = `element-cell ${data.cat}`;
                
                // 🔒 未解鎖狀態
                if (!data.unlocked) {
                    item.classList.add('locked');
                }
                
                // 🌟 關鍵修正：啱啱抽中嗰陣，觸發爆光閃爍特效！
                if (data.justUnlocked) {
                    item.classList.add('shine-flare');
                }

                // (下面生成文字嘅部分保持不變)
                const numNode = document.createElement('span');
                numNode.className = 'el-num';
                numNode.innerText = data.z;

                const symNode = document.createElement('span');
                symNode.className = 'el-sym';
                symNode.innerText = data.sym;

                const nameNode = document.createElement('span');
                nameNode.className = 'el-name';
                nameNode.innerText = data.name;

                item.appendChild(numNode);
                item.appendChild(symNode);
                item.appendChild(nameNode);
                
                // Hover 效果 (保持不變)
                if (hoverTooltip) {
                    // ... 
                }
            } else {
                // 空位
                item.className = 'element-empty';
            }
            grid.appendChild(item);
        }
    }
}