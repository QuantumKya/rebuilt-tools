const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.lineWidth = 2;

const w = 200;
const h = 150;
canvas.width = w*4;
canvas.height = h*4;

let assetsLoaded = 0;
let SHIFTING = false;
let CTRLING = false;
let ALTING = false;

const inputState = {
    delta: NaN,
    v0: NaN,
    theta: NaN,
    h: NaN,
};

/*================================= Input Fields =================================*/

const inputStats = {
    delta: { unit: 'ft', conversionFactor: 12, defaultVal: 4 },
    v0: { unit: 'ft/s', conversionFactor: 12, defaultVal: 20 },
    theta: { unit: '°', conversionFactor: Math.PI / 180, defaultVal: 45 },
    h: { unit: 'in', conversionFactor: 1, defaultVal: 20 }
};

const inputs = document.querySelectorAll('input');
inputs.forEach(inp => {
    const id = inp.id;
    const thisInput = inputStats[id];

    inp.value = thisInput.defaultVal;
    inputState[id] = Number(inp.value) * thisInput.conversionFactor;

    const label = inp.parentElement.querySelector('label');
    label.textContent += `: ${inp.value}`;
    
    inp.oninput = e => {
        const tsInput = inputStats[e.target.id];
        let val = Number(e.target.value);

        e.target.value = val;
        label.textContent = label.textContent.split(': ')[0] + `: ${val}`;

        const which = e.target.id;
        inputState[which] = val * tsInput.conversionFactor;
        draw(inputState);
    };
});

const selector = document.querySelector('select');
selector.value = '';
selector.onchange = e => {
    const selected = e.target.value;

    document.querySelectorAll('.parameter-div').forEach(
        div => div.classList.toggle('hidden-input', (selected === div.querySelector('input').id) || !selected)
    );
}
const unknown = () => selector.value;

const changeSteps = (step) => {
    inputs.forEach(inp => inp.step = step);
}

window.addEventListener('keydown', e => { if (e.key === 'Shift') changeSteps(0.1); if (e.key === 'Control') changeSteps(0.01); if (e.key === 'Alt') changeSteps(0.001); });
window.addEventListener('keyup', e => { if (e.key === 'Shift') changeSteps(1); if (e.key === 'Control') changeSteps(1); if (e.key === 'Alt') changeSteps(1); });

document.querySelector('button').onclick = () => {
    const searchee = unknown();
    searchee ? findRange(searchee) : checkInstance(inputState, milliPerFrame);
};

/*================================= Constants =================================*/

const dozerImage = new Image();
dozerImage.src = './dozer.png';
dozerImage.onload = e => assetsLoaded++;
dozerImage.onerror = e => window.location.reload();
const dozerSize = 20;

const hubWidth = 47;
const hubHeight = 48;
const hopperWidth = 41.7;
const hopperHeight = 72;

const hubLeft = w - hubWidth;
const hubMid = w - hubWidth/2;
const hubTop = hubHeight;

const hopperLeft = w - hopperWidth;
const hopperMid = w - hopperWidth/2;
const hopperTop = hopperHeight;

const WORLD_SCALE = 4; // 1 inch = 4 pixels


/*================================= Algorithm =================================*/

const precision = 2;

const g = 386.0885827; // inches per second per second

const milliPerFrame = 20;
function checkInstance(stats, msPer) {
    // Constants
    const startDelta = stats.delta;
    const startHeight = stats.h;
    const launchAngle = stats.theta;
    const launchVel = stats.v0;

    const vx = launchVel * Math.cos(launchAngle);
    const vy = launchVel * Math.sin(launchAngle);

    // Trajectory function
    const y = (t) => (-g/2)*t*t + (vy)*t + (startHeight);
    
    let above = (startHeight > 72);
    let t = 0;
    let yt = startHeight;
    const interval = Math.pow(10, -precision);
    
    const cx = (tm) => (hubLeft - startDelta) + vx*tm;

    // Drawing and calculation loop
    const yStorage = [startHeight];
    const drawStep = () => {
        if (yt < 0) return;
        if (above && yt <= 72) return;
        if (!above && yt > 72) above = true;
        
        
        draw(stats);

        // MOVE AND SCALE
        ctx.save();
        ctx.setTransform(WORLD_SCALE, 0, 0, -WORLD_SCALE, 0, canvas.height);
        
        ctx.strokeStyle = 'red';
        ctx.beginPath();
        ctx.moveTo(cx(0), yStorage[0]);
        for (let i = 1; i < yStorage.length; i++) {
            ctx.lineTo(cx(i * interval), yStorage[i]);
        }
        ctx.stroke();
        
        drawBall(stats, cx(t), yt);
        ctx.restore();
        
        t += interval;
        yt = y(t);
        yStorage.push(yt);

        setTimeout(drawStep, msPer);
    };

    drawStep();

    const checkValue = t*vx - startDelta;
    return (checkValue > 0 && checkValue < hopperWidth / 4);
}

function findRange(unknown) {
    if (unknown === '') return;

    const inputRange = document.querySelector(`input#${unknown}`);
    const inputMin = inputRange.min;
    const inputMax = inputRange.max;

    const prec = 2;
    const interval = Math.pow(10, -prec);

    let outMin = inputMin;
    let outMax = inputMax;
    
    for (let test = inputMin; test <= inputMax; test += interval) {
        const state = Object.entries(inputState).map(([ key, value ]) => [ key, key === unknown ? test : value ]);
        const résultat = checkInstance(state);

        if (!résultat) {
            outMin = Math.min(outMin, test);
            outMax = Math.max(outMax, test);
        }
    }

    console.log(outMin, outMax);
}

/*================================= Drawing =================================*/

const drawBall = (stats, x, y) => {
    if (assetsLoaded < 1) return;

    // REPLACE WITH IMAGE DRAWING LATER
    ctx.fillStyle = '#f4f42d';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, 2*Math.PI);
    ctx.fill();
}

const draw = (stats) => {
    if (assetsLoaded < 1) return;
    ctx.save();

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    
    
    // MOVE AND SCALE
    ctx.setTransform(WORLD_SCALE, 0, 0, -WORLD_SCALE, 0, canvas.height);
    console.log(stats);
    const sH = stats.h;

    // Draw the hub and hopper =========================================================
    const dozerLeft = hubLeft - stats.delta - dozerSize/2;
    ctx.fillStyle = 'gray';
    ctx.beginPath();
    ctx.moveTo(dozerLeft, 0);
    ctx.lineTo(dozerLeft, sH - dozerSize);
    ctx.lineTo(dozerLeft + dozerSize, sH - dozerSize);
    ctx.lineTo(dozerLeft + dozerSize, 0);
    ctx.lineTo(dozerLeft, 0);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w, 0);
    ctx.lineTo(w, hubTop);
    ctx.lineTo(hubLeft, hubTop);
    ctx.lineTo(hubLeft, 0);
    ctx.fill();
    
    ctx.strokeStyle = '#dedede';
    ctx.beginPath();
    ctx.moveTo(hubMid, hubTop);
    ctx.lineTo(hubMid - hopperWidth/4, hubTop);
    ctx.lineTo(hubMid - hopperWidth/2, hopperTop);
    ctx.lineTo(hubMid + hopperWidth/2, hopperTop);
    ctx.lineTo(hubMid + hopperWidth/4, hubTop);
    ctx.lineTo(hubMid, hubTop);
    ctx.stroke();

    // Draw the angle and the velocity vector =========================================================

    const velocityLength = stats.v0 * (5 / document.querySelector('input#v0').max);

    ctx.strokeStyle = '#ffffff99';
    ctx.beginPath();
    ctx.moveTo(dozerLeft + dozerSize/2, sH);
    for (let i = 0; i < velocityLength*Math.cos(stats.theta)/2; i++) {
        const x = dozerLeft + dozerSize/2 + i*2;
        const y = sH;
        i % 2 === 0 ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();

    ctx.strokeStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(dozerLeft + dozerSize/2, sH);
    ctx.lineTo(
        dozerLeft + dozerSize/2 + (velocityLength-0.25) * Math.cos(stats.theta),
        sH + (velocityLength-0.25) * Math.sin(stats.theta)
    );
    const arrowHeadSize = 7.5;
    ctx.lineTo(
        dozerLeft + dozerSize/2 + velocityLength * Math.cos(stats.theta) + arrowHeadSize*Math.cos(stats.theta - Math.PI*3/4),
        sH + velocityLength * Math.sin(stats.theta) + arrowHeadSize*Math.sin(stats.theta - Math.PI*3/4)
    );
    ctx.moveTo(
        dozerLeft + dozerSize/2 + velocityLength * Math.cos(stats.theta),
        sH + velocityLength * Math.sin(stats.theta)
    );
    ctx.lineTo(
        dozerLeft + dozerSize/2 + velocityLength * Math.cos(stats.theta) + arrowHeadSize*Math.cos(stats.theta + Math.PI*3/4),
        sH + velocityLength * Math.sin(stats.theta) + arrowHeadSize*Math.sin(stats.theta + Math.PI*3/4)
    )
    ctx.stroke();

    ctx.restore();

    // Draw the dozer image upright in pixel coordinates (avoid transform flip)
    const px = dozerLeft * WORLD_SCALE;
    const psize = dozerSize * WORLD_SCALE;
    const pyTop = canvas.height - (sH * WORLD_SCALE); // top-left y for image so bottom sits at sH
    ctx.drawImage(dozerImage, px, pyTop, psize, psize);
}


ctx.fillStyle = 'black';
ctx.fillRect(0, 0, canvas.width, canvas.height);

setTimeout(() => draw(inputState), 2000);