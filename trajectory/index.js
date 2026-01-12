const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
canvas.width = 600;
canvas.height = 600;
ctx.imageSmoothingEnabled = false;

const w = canvas.width;
const h = canvas.height;

let assetsLoaded = 0;
let SHIFTING = false;
let CTRLING = false;

const inputState = {
    delta: NaN,
    v0: NaN,
    theta: NaN,
    h: NaN,
};

/*================================= Input Fields =================================*/

document.querySelectorAll('input').forEach((inp, i) => {
    inp.parentElement.classList.add('hidden-input');

    inp.value = [36, 50, 45, 25].at(i);
    inputState[inp.id] = inp.value * (inp.id === 'theta' ? 1 : 4);

    const label = inp.parentElement.querySelector('label');
    label.textContent += `: ${inp.value}`;
    
    inp.oninput = e => {
        let val = Number(e.target.value);
        
        if (CTRLING) val = Math.floor(val / 10) * 10;
        else if (SHIFTING) val = Math.floor(val / 5) * 5;

        e.target.value = val;
        label.textContent = label.textContent.split(': ')[0] + `: ${val}`;

        const which = e.target.id;
        inputState[which] = e.target.value * (which === 'theta' ? 1 : 4);
        draw(inputState);
    };
});

const selector = document.querySelector('select');
selector.value = '';
selector.onchange = e => {
    const selected = e.target.value;
    if (selected === '') return;

    document.querySelectorAll('.parameter-div').forEach(
        div => div.classList.toggle('hidden-input', selected === div.querySelector('input').id)
    );
}

window.addEventListener('keydown', e => { if (e.key === 'Shift') SHIFTING = true; if (e.key === 'Control') CTRLING = true; });
window.addEventListener('keyup', e => { if (e.key === 'Shift') SHIFTING = false; if (e.key === 'Control') CTRLING = false; });

document.querySelector('button').onclick = () => checkInstance(inputState);

/*================================= Constants =================================*/

const dozerImage = new Image();
dozerImage.src = './dozer.png';
dozerImage.onload = e => assetsLoaded++;
dozerImage.onerror = e => window.location.reload();
const dozerSize = 64;

const hubWidth = 47 * 4;
const hubHeight = 48 * 4;
const hopperWidth = 41.7 * 4;
const hopperHeight = 72 * 4;

const hubLeft = canvas.width - hubWidth;
const hubMid = canvas.width - hubWidth/2;
const hubTop = canvas.height - hubHeight;

const hopperLeft = canvas.width - hopperWidth;
const hopperMid = canvas.width - hopperWidth/2;
const hopperTop = canvas.height - hopperHeight;


/*================================= Algorithm =================================*/

const unknown = () => document.querySelector('select').value;
const precision = 2;

const g = 386.0885827; // inches per second per second

function checkInstance(stats) {
    // Constants
    const startDelta = stats.delta;
    const startHeight = stats.h;
    const launchAngle = stats.theta;
    const launchVel = stats.v0;

    const vx = launchVel * Math.cos(launchAngle);
    const vy = launchVel * Math.sin(launchAngle);

    // Trajectory function
    const y = (t) => (-g)*t*t + (vy)*t + (startHeight);
    
    let above = (startHeight > 72);
    let t = 0;
    const interval = Math.pow(10, -precision);
    let yt = startHeight;
    
    // Drawing and calculation loop
    const yStorage = [startHeight];
    while (!(above && yt <= 72)) {
        if (!above && yt > 72) above = true;
        
        const cx = (t) => (hubLeft - startDelta) + vx*t * 4;

        draw(stats);
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo((hubLeft - startDelta), h - yStorage[0])
        for (let i = 0; i < yStorage.length; i++) {
            ctx.lineTo(cx(i*interval), h - yStorage[i] * 4);
        }
        ctx.stroke();
        drawBall(stats, cx(t), yt * 4);
        
        t++;
        yt = y(t*interval);
        yStorage.push(yt);
    }

    const checkValue = t*vx - startDelta;
    return (checkValue > 0 && checkValue < hubWidth);
}

function findRange(unknown) {
    if (unknown === '') return;

    const inputRange = document.querySelector(`input#${unknown}`);
    const inputMin = inputRange.min;
    const inputMax = inputRange.max;

    const precision = 2;
    const interval = Math.pow(10, -precision);

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
    ctx.arc(x, y, 15, 0, 2*Math.PI);
    ctx.fill();
}

const draw = (stats) => {
    if (assetsLoaded < 1) return;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, w, h);

    console.log(stats);

    const dozerLeft = hubLeft - stats.delta - dozerSize/2;

    ctx.drawImage(dozerImage, dozerLeft, h - stats.h, 64, 64);

    ctx.fillStyle = 'gray';
    ctx.beginPath();
    ctx.moveTo(dozerLeft, h);
    ctx.lineTo(dozerLeft, h - stats.h + dozerSize);
    ctx.lineTo(dozerLeft + dozerSize, h - stats.h + dozerSize);
    ctx.lineTo(dozerLeft + dozerSize, h);
    ctx.lineTo(dozerLeft, h);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(w, h);
    ctx.lineTo(w, hubTop);
    ctx.lineTo(hubLeft, hubTop);
    ctx.lineTo(hubLeft, h);
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
}


ctx.fillStyle = 'black';
ctx.fillRect(0, 0, canvas.width, canvas.height);

setTimeout(() => draw({ delta: 40 * 4, h: 20 * 4 }), 2000);