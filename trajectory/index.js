const canvas = document.querySelector('canvas');
const ctx = canvas.getContext('2d');
ctx.imageSmoothingEnabled = false;
ctx.lineWidth = 2;

const h = 150;
const w = 200;
const WORLD_SCALE = 10; // fill the screen

canvas.width = w*WORLD_SCALE;
canvas.height = h*WORLD_SCALE;

let assetsLoaded = 0;
let SHIFTING = false;
let CTRLING = false;
let ALTING = false;

const inputState = {
    delta: NaN,
    v0: NaN,
    flyrad: NaN,
    theta: NaN,
    h: NaN,
    spin: NaN,
};

const optionValues = {
    showVelocity: false,
    showKJForce: false,
    showDragForce: false,
    displayPrecision: 3,
    calculationPrecision: 0.01,
    stepTime: 15,
};

/*================================= Input Fields =================================*/

const inputStats = {
    delta: { unit: 'ft', conversionFactor: 12, defaultVal: 4 },
    v0: { unit: 'ft/s', conversionFactor: 12, defaultVal: 20 },
    flyrad: { unit: 'in', conversionFactor: 1, defaultVal: 2 },
    theta: { unit: '°', conversionFactor: Math.PI / 180, defaultVal: 45 },
    h: { unit: 'in', conversionFactor: 1, defaultVal: 20 },
    spin: { unit: 'rpm', conversionFactor: 1000 * 2*Math.PI/60, defaultVal: 0 },
};

const valInputs = [...document.querySelectorAll('.parameter-div')].map(div => div.querySelector('input'));
valInputs.forEach(inp => {
    const id = inp.id;
    const thisInput = inputStats[id];

    inp.value = thisInput.defaultVal;
    inputState[id] = Number(inp.value) * thisInput.conversionFactor;

    const label = inp.parentElement.querySelector('label');
    label.textContent += `: ${inp.value}`;
    const setter = inp.parentElement.querySelector('.param-set');
    
    inp.oninput = e => {
        const which = e.target.id;
        const tsInput = inputStats[which];
        let val = Math.max(Math.min(Number(e.target.value), e.target.max), e.target.min);

        e.target.value = val;
        setter.value = val;
        label.textContent = label.textContent.split(': ')[0] + `: ${val}`;

        inputState[which] = val * tsInput.conversionFactor;
        draw(inputState, ctx);
    };
});

const setInputs = [...document.querySelectorAll('.parameter-div')].map(div => div.querySelector('.param-set'));
setInputs.forEach(inp => {
    const id = inp.id.match(/\w+(?=-number)/g)[0];
    const thisInput = inputStats[id];

    inp.step = 'any';

    inp.value = thisInput.defaultVal;
    inputState[id] = Number(inp.value) * thisInput.conversionFactor;

    const label = inp.parentElement.querySelector('label');
    const slider = inp.parentElement.querySelector('input');

    inp.onchange = e => {
        const which = e.target.id.match(/\w+(?=-number)/g)[0];
        const tsInput = inputStats[which];
        let val = Math.max(Math.min(Number(e.target.value), e.target.max), e.target.min);

        e.target.value = val;
        slider.value = val;
        label.textContent = label.textContent.split(': ')[0] + `: ${val}`;

        inputState[which] = val * tsInput.conversionFactor;
        draw(inputState, ctx);
    };
});

const optInputs = [...document.querySelectorAll('div.optionset')].map(div => [...div.querySelectorAll('div')]).flat().map(div => div.querySelector('input'));
optInputs.forEach(inp => {
    const id = inp.id;
    const def = optionValues[id];
    if (typeof def === 'boolean') inp.checked = def;
    else if (typeof def === 'number') inp.value = def;

    inp.onchange = e => {
        const which = e.target.id;
        optionValues[which] = (typeof optionValues[which] === 'boolean') ? Boolean(e.target.checked) : Number(e.target.value);
    };
});

// const selector = document.querySelector('select');
// selector.value = '';
// selector.onchange = e => {
//     const selected = e.target.value;

//     document.querySelectorAll('.parameter-div').forEach(
//         div => div.classList.toggle('hidden-input', (selected === div.querySelector('input').id) && selected)
//     );
// }
// const unknown = () => selector.value;

const changeSteps = (step) => {
    valInputs.forEach(inp => inp.step = step);
}

window.addEventListener('keydown', e => { if (e.key === 'Shift') changeSteps(0.1); else if (e.key === 'Control') changeSteps(0.01); else if (e.key === 'Alt') changeSteps(0.001); else return; e.preventDefault(); });
window.addEventListener('keyup', e => { if (e.key === 'Shift') changeSteps(1); else if (e.key === 'Control') changeSteps(1); else if (e.key === 'Alt') changeSteps(1); else return; e.preventDefault(); });
document.addEventListener('mouseup', e => changeSteps(1));

simColors = ['#ff0000', '#00ff00', '#0000ff'];
const simbuttondivs = document.querySelector('#runbtncarrier').querySelectorAll('div');
simbuttondivs.forEach((div, i) => div.querySelector('button').onclick = async () => {
    checkInstance(inputState, optionValues.stepTime, i);
    // const searchee = unknown();
    // console.log(optionValues.stepTime);
    // if (searchee === '') checkInstance(inputState, optionValues.stepTime, i);
    // else await findRange(searchee, i);
});

simbuttondivs.forEach((div, i) => div.querySelectorAll('button').item(1).onclick = async () => sims[i].getGif(i));

/*================================= Input Types =================================*/

const disttype = document.getElementById('disttype');
const flytype = document.getElementById('flytype');
flytype.onchange = e => {
    const val = Number(e.target.value);
    if (val) {
        document.getElementById('vel').style.display = 'none';
        document.getElementById('flyrad').style.display = 'flex';
    }
    else {
        document.getElementById('flyrad').style.display = 'none';
        document.getElementById('vel').style.display = 'flex';
    }
}

/*================================= Constants =================================*/

const images = {
    dozer: new Image(),
    hub: new Image(),
};
const imgPaths = {
    dozer: 'bozer.svg',
    hub: 'hub.svg',
};
const dozerSize = 20;

const hubWidth = 47;
const hubHeight = 48;
const hopperWidth = 41.7;
const hopperHeight = 72;

const hubLeft = w - hubWidth;
const hubMid = w - hubWidth/2;
const hubTop = hubHeight;

const hopperLeft = hubMid - hopperWidth/2;
const hopperMid = hubMid;
const hopperTop = hopperHeight;

disttype.value = '0';
const anchorPoint = () => (Number(disttype.value)) ? hubMid : hubLeft;

flytype.value = '0';


const fuelMass = 0.474; // 0.448-0.500 lbs
const fuelDiameter = 5.91;
const fuelRadius = fuelDiameter / 2;


/*================================= Algorithm =================================*/

const g = 386.0885827; // inches per second per second

const add = (vec1, vec2) => ({ x: vec1.x + vec2.x, y: vec1.y + vec2.y });
const mult = (vec, scalar) => ({ x: vec.x * scalar, y: vec.y * scalar });

const sims = simColors.map(a=>null);
const simGifs = simColors.map(a=>[]);
class SimulationData {
    constructor(daStats, color) {
        this.delta = daStats.delta;
        this.h = daStats.h;
        this.theta = daStats.theta;
        this.v0 = daStats.v0;
        this.spin = daStats.spin;
        this.flyrad = daStats.flyrad;
        this.stats = { delta: this.delta, h: this.h, theta: this.theta, v0: this.v0, spin: this.spin, flyrad: this.flyrad };
        
        this.acceleration = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.position = { x: 0, y: 0 };
        
        this.pStorage = [];
        this.t = 0;
        this.dt = 0;
        this._msPer = -1;

        this.color = color;
        this.above = this.h > hopperHeight;
        this.running = false;
        this.success = false;

        this.dozerLeft = anchorPoint() - this.delta;
    }

    set drawingSpeed(msPer) {
        this._msPer = msPer;
    }

    init() {
        
        // Case-wise velocity calculation
        const fly = Number(flytype.value);
        
        if (fly > 0) {
            const surfVel = Math.abs(this.spin) * this.flyrad;
            this.v0 = surfVel * fly / 2;
            this.stats.v0 = this.v0;
            
            this.spin *= fuelRadius / this.flyrad;
            if (fly === 2) this.spin = 0;
            this.stats.spin = this.spin;
        }
        
        const vx = this.v0 * Math.cos(this.theta);
        const vy = this.v0 * Math.sin(this.theta);

        this.position = { x: 0, y: this.h };
        this.velocity = { x: vx, y: vy };
        this.acceleration = { x: 0, y: -g };
        this.dt = optionValues.calculationPrecision;
        
        this.pStorage.push({ t: 0, position: { x: 0, y: this.h }, velocity: { x: vx, y: vy }, kjForce: { x: 0, y: 0 }, dragForce: { x: 0, y: 0 } });
        this.running = true;
    }

    integrateStep() {
        const omega = this.spin; // rad/s
        const fluidDensity = 0.0000434; // lbs/in3
        const peopleScreamingAtTheBall = 100;
        const freeStreamVel = 3.93701 + 0.0000000000000000000000000000001*peopleScreamingAtTheBall;
        const kjForce = (8/3)*Math.PI * fluidDensity * freeStreamVel * omega * Math.pow(fuelRadius, 3);

        const dragCoefficient = 0.47; // Sphere drag coefficient ???????????????????????????????????????????????????????????????????????
        const crossSection = Math.pow(fuelRadius, 2) * Math.PI;
        const velocityMag = Math.hypot(this.velocity.x, this.velocity.y);
        const dragForce = (1/2) * fluidDensity * Math.pow(velocityMag, 2) * crossSection * dragCoefficient;

        const kjVector = mult(this.velNormal(), -kjForce / fuelMass);
        const dragVector = mult(this.velDirection(), -dragForce / fuelMass);

        this.acceleration = { x: 0, y: 0 };
        this.acceleration = add(this.acceleration, dragVector);
        this.acceleration = add(this.acceleration, kjVector);
        console.log(`Magnus Acceleration: (${this.acceleration.x.toFixed(2)}, ${this.acceleration.y.toFixed(2)})`);
        this.acceleration.y -= g;

        this.velocity.x += this.acceleration.x * this.dt;
        this.velocity.y += this.acceleration.y * this.dt;
        this.position.x += this.velocity.x * this.dt;
        this.position.y += this.velocity.y * this.dt;
        this.t += this.dt;

        console.log(`Position: (${this.position.x.toFixed(2)}, ${this.position.y.toFixed(2)}) Velocity: (${this.velocity.x.toFixed(2)}, ${this.velocity.y.toFixed(2)})`);

        this.pStorage.push({ t: this.t, position: { x: this.position.x, y: this.position.y }, velocity: { x: this.velocity.x, y: this.velocity.y }, kjForce: kjVector, dragForce: dragVector });
    }

    drawParabola(ctx, steps = this.pStorage.length) {
        // MOVE AND SCALE
        ctx.save();
        ctx.setTransform(WORLD_SCALE, 0, 0, -WORLD_SCALE, (anchorPoint() - this.delta)*WORLD_SCALE, canvas.height);
        
        const firstPos = this.pStorage[0].position;

        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(firstPos.x, firstPos.y);
        for (let i = 1; i < steps; i++) {
            const curr = this.pStorage[i].position;
            ctx.lineTo(curr.x, curr.y);
        }
        ctx.stroke();
        ctx.restore();
    }
    
    drawVectors(ctx, step = (this.pStorage.length-1)) {
        const pos = this.pStorage[step].position;
        const vel = this.pStorage[step].velocity;
        if (optionValues['showVelocity'] && Math.hypot(vel.x, vel.y) > 0) drawArrow(ctx,
            pos.x + this.dozerLeft, pos.y,
            Math.atan2(vel.y, vel.x),
            Math.hypot(vel.x, vel.y) / 3,
            '#00aa00'
        );
        
        const kjForce = this.pStorage.at(step).kjForce;
        const dragForce = this.pStorage.at(step).dragForce;
        const kjDirection = Math.atan2(kjForce.y, kjForce.x);
        const kjMag = Math.hypot(kjForce.x, kjForce.y);
        const dragDirection = Math.atan2(dragForce.y, dragForce.x);
        const dragMag = Math.hypot(dragForce.x, dragForce.y);
        if (optionValues['showKJForce'] && kjMag !== 0) drawArrow(ctx,
            pos.x + this.dozerLeft, pos.y,
            kjDirection,
            kjMag,
            '#00ffff'
        );
        if (optionValues['showDragForce'] && dragMag !== 0) drawArrow(ctx,
            pos.x + this.dozerLeft, pos.y,
            dragDirection,
            dragMag,
            '#ff5500'   
        );
    }

    drawStep(resolve) {
        if ((this.position.y < 0) || (!this.above && (this.position.x + this.dozerLeft > hopperLeft))) {
            this.success = false;
            this.endProcess(resolve);
            return;
        }
        if ((this.above && this.position.y <= 72)) {
            const checkValue = this.position.x - this.delta - (hubWidth-hopperWidth)/2;
            this.success = checkValue > 0 && checkValue < hopperWidth;
            this.endProcess(resolve);
            return;
        }
        if (!this.above && this.position.y > 72) this.above = true;

        if (this._msPer >= 0) draw(this.stats, ctx);
        
        this.integrateStep();

        if (this._msPer >= 0) setTimeout(() => this.drawStep(resolve), this._msPer);
        else requestAnimationFrame(() => this.drawStep(resolve));
    };

    endProcess(resolve) {
        if (this._msPer >= 0) this.printResults();
        this.running = false;

        draw(this.stats, ctx);
        resolve(this.success);
    }

    velAngle() { return Math.atan2(this.velocity.y, this.velocity.x); }
    velDirection() {
        const a = this.velAngle();
        return { x: Math.cos(a), y: Math.sin(a) };
    }
    velNormal() {
        const a = this.velAngle();
        return { x: -Math.sin(a), y: Math.cos(a) };
    }

    printResults() {
        const simId = sims.indexOf(this);
        if (simId === -1) return;
        
        const resultDiv = document.querySelectorAll('.resulttext').item(simId);
        const initialDiv = resultDiv.querySelector('div.res-conditions');
        const endDiv = resultDiv.querySelector('div.res-answers')
        initialDiv.replaceChildren();
        endDiv.replaceChildren();

        const addTextLine = (block, text, value = '', suffix = '') => {
            const p = document.createElement('p');
            if (typeof value === "boolean") value = (value ? 'Yes' : 'No');
            else if (typeof value === "number") value = value.toFixed(optionValues.displayPrecision);

            if (value === '') p.innerHTML = text;
            else p.innerHTML = `${text}: <b>${value}${suffix}</b>`;
            (block ? endDiv : initialDiv).appendChild(p);
        }

        // Initial Conditions Printing

        const initialhead = document.createElement('h3');
        initialhead.innerHTML = 'Initial Conditions';
        initialDiv.appendChild(initialhead);

        addTextLine(0, 'Distance', this.stats.delta/inputStats.delta.conversionFactor, ' <small>ft.</small>');
        addTextLine(0, 'Height', this.stats.h/inputStats.h.conversionFactor, ' <small>ft.</small>');
        addTextLine(0, 'Ball Velocity', this.stats.v0/inputStats.v0.conversionFactor, ' <small>ft./sec.</small>');
        addTextLine(0, 'Angle', this.stats.theta/inputStats.theta.conversionFactor, 'º');
        if (this.stats.spin !== 0) addTextLine(0, 'Spin', this.stats.spin/inputStats.spin.conversionFactor);

        // Results Printing

        const resulthead = document.createElement('h3');
        resulthead.innerHTML = 'Results';
        endDiv.appendChild(resulthead);

        addTextLine(1, 'Ball Made It?', this.success);

        const timetaken = this.t;
        addTextLine(1, `Travel Time`, timetaken, ' <small>sec.</small>');
        const distanceX = this.position.x;
        const distanceY = this.position.y;
        addTextLine(1, 'Distance Traveled (X)', distanceX, ' <small>in.</small>');
        addTextLine(1, 'Distance Traveled (Y)', distanceY, ' <small>in.</small>');
        addTextLine(1, 'Maximum Height', Math.max(...this.pStorage.map(a=>a.position.y)), ' <small>in.</small>');

        /*
        const fromLeftHopper = this.position.x - this.delta - (hubWidth-hopperWidth)/2;
        if (this.success) addTextLine('Prob. of Bounceback (maybe)',
            Math.abs(fromLeftHopper - hopperWidth/2) / (hopperWidth) * 100,
        '%');
        */
    };

    async getGif(simId) {
        const gifcanvas = document.createElement('canvas');
        const gifctx = gifcanvas.getContext('2d');

        gifcanvas.width = canvas.width;
        gifcanvas.height = canvas.height;
        gifctx.imageSmoothingEnabled = false;
        gifctx.lineWidth = 1;

        const gif = new GIF({
            repeat: 0,
            quality: 5,
            width: gifcanvas.width,
            height: gifcanvas.height,
        });

        const addGifFrame = async (step) => {
            draw(this.stats, gifctx, simId, step);
            gif.addFrame(gifctx, { delay: this._msPer + ((step === (this.pStorage.length-1)) ? 300 : 0), copy: true });
        };
        for (let i = 0; i < this.pStorage.length; i++) await addGifFrame(i);

        gif.on('finished', (blob) => {
            window.open(URL.createObjectURL(blob));
        });
        gif.render();
    }
}

function checkInstance(stats, msPer, simId) {
    return new Promise((resolve) => {
        const simRunner = new SimulationData(stats, simColors[simId]);
        simRunner.drawingSpeed = msPer;
        
        simRunner.init();
        simRunner.drawStep(resolve);

        sims[simId] = simRunner;
    });
}

async function findRange(unknown, simId) {
    if (unknown === '') return;

    const inputRange = document.querySelector(`input#${unknown}`);
    const inputMin = parseFloat(inputRange.min);
    const inputMax = parseFloat(inputRange.max);

    let outMin = inputMin;
    let outMax = inputMax;
    
    for (let prec = 0; prec < 40; prec++) {
        const interval = ([5, 1].at(prec % 2)) * Math.pow(10, -Math.floor(prec/2)+1);
        console.log(`Interval: ${interval}`);
        console.log(`Range: ${outMin} to ${outMax}`);
        
        // Stop if range is too small
        //if (outMax - outMin < interval) break;

        const successes = [], failures = [];
        
        const checkFunc = async (test) => {
            const state = Object.fromEntries(
                Object.entries(inputState).map(([ key, value ]) => [ key, key === unknown ? (test * inputStats[unknown].conversionFactor) : value ])
            );
            const résultat = await checkInstance(state, -1, simId);

            if (résultat) successes.push(test);
            else failures.push(test);
        };

        if (prec < 2) {
            for (let test = outMin; test <= outMax; test += interval) await checkFunc(test);
        }
        else {
            for (let test = outMin - interval; test <= outMin + interval; test += interval) await checkFunc(test);
            for (let test = outMax - interval; test <= outMax + interval; test += interval) await checkFunc(test);
        }

        if (successes.length === 0 || failures.length === 0) continue;

        const oldMax = outMax, oldMin = outMin;

        const minSuccess = Math.min(...successes);
        const maxSuccess = Math.max(...successes);

        const failuresBelowMin = failures.filter(f => f < minSuccess);
        if (failuresBelowMin.length > 0) {
            outMin = Math.max(outMin, Math.max(...failuresBelowMin));
        }

        const failuresAboveMax = failures.filter(f => f > maxSuccess);
        if (failuresAboveMax.length > 0) {
            outMax = Math.min(outMax, Math.min(...failuresAboveMax));
        }

        const improvement = Math.abs(oldMax - outMax) + Math.abs(oldMin - outMin);
        if (improvement < 0.15 && improvement) break;
    }

    console.log(`Final range: ${outMin} to ${outMax}`);
    return { min: outMin, max: outMax };
}

/*================================= Drawing =================================*/

const drawBall = (ctx, x, y) => {
    // REPLACE WITH IMAGE DRAWING LATER
    ctx.fillStyle = '#f4f42d';
    ctx.beginPath();
    ctx.arc(x, y, fuelRadius, 0, 2*Math.PI);
    ctx.fill();
}

const drawArrow = (ctx, x, y, angle, length, color) => {
    const tipX = x + length * Math.cos(angle);
    const tipY = y + length * Math.sin(angle);

    ctx.strokeStyle = color;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(tipX, tipY);

    const arrowHeadSize = 5;
    const arrowAngle = 25/32;
    ctx.lineTo(
        tipX + arrowHeadSize*Math.cos(angle - Math.PI*arrowAngle),
        tipY + arrowHeadSize*Math.sin(angle - Math.PI*arrowAngle)
    );
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(
        tipX + arrowHeadSize*Math.cos(angle + Math.PI*arrowAngle),
        tipY + arrowHeadSize*Math.sin(angle + Math.PI*arrowAngle)
    )
    ctx.stroke();
}

const drawBackground = (ctx, stats) => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.transform(WORLD_SCALE, 0, 0, WORLD_SCALE, 0, 0);
    ctx.drawImage(images.hub, w-hubWidth, h-hopperHeight, hubWidth, hopperHeight);
    ctx.restore();



    // Draw the hub and hopper =========================================================
    const dozerLeft = anchorPoint() - stats.delta - dozerSize/2;

    // Draw the dozer image upright in pixel coordinates (avoid transform flip)
    const px = dozerLeft * WORLD_SCALE;
    const psize = dozerSize * WORLD_SCALE;
    const pyTop = canvas.height - (stats.h * WORLD_SCALE); // top-left y for image so bottom sits at sH
    ctx.drawImage(images.dozer, px, pyTop, psize*2, psize);
}

const draw = (stats, ctx, simId = -1, step = -1) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    drawBackground(ctx, stats);
    
    // MOVE AND SCALE
    ctx.setTransform(WORLD_SCALE, 0, 0, -WORLD_SCALE, 0, canvas.height);

    // Draw the hub and hopper =========================================================
    const dozerLeft = anchorPoint() - stats.delta - dozerSize/2;

    // Draw the angle and the velocity vector =========================================================

    const velInput = document.querySelector('input#v0');
    const velocityLength = stats.v0 * (5 / velInput.max);

    ctx.strokeStyle = '#ffffff99';
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(dozerLeft + dozerSize/2, stats.h);
    for (let i = 0; i < velocityLength*Math.cos(stats.theta)/2; i++) {
        const x = dozerLeft + dozerSize/2 + i*2;
        const y = stats.h;
        i % 2 === 0 ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();

    drawArrow(ctx,
        dozerLeft + dozerSize/2, stats.h,
        stats.theta,
        velocityLength,
        '#00ffff'
    );

    sims.forEach((sim, i) => {
        if (simId !== -1) if (i !== simId) return;

        if (!sim) return;
        const st = step === -1 ? sim.pStorage.length-1 : step;

        sim.drawParabola(ctx, st+1);
        const recentPos = sim.pStorage[st].position;
        console.log('ballPos: ', recentPos);
        drawBall(ctx, recentPos.x + sim.dozerLeft, recentPos.y);

        if (!sim.running && simId === -1) return;
        sim.drawVectors(ctx, st);
    });

    ctx.restore();
}
disttype.onchange = e => draw(inputStats, ctx);


ctx.fillStyle = 'black';
ctx.fillRect(0, 0, canvas.width, canvas.height);

Promise.all(
    Object.entries(images).map(([ key, img ]) => new Promise((res, rej) => {
        img.src = imgPaths[key];
        img.onload = res;
        img.onerror = rej;
    }))
).then(() => draw(inputState, ctx));



function openResultsPanel() {
    document.getElementById('resultspanel').classList.toggle('open');
}