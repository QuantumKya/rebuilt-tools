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
    theta: { unit: '°', conversionFactor: Math.PI / 180, defaultVal: 45 },
    h: { unit: 'in', conversionFactor: 1, defaultVal: 20 },
    spin: { unit: 'rpm', conversionFactor: 100*2*Math.PI/60, defaultVal: 0 },
};

const valInputs = [...document.querySelectorAll('.parameter-div')].map(div => div.querySelector('input'));
valInputs.forEach(inp => {
    const id = inp.id;
    const thisInput = inputStats[id];

    inp.value = thisInput.defaultVal;
    inputState[id] = Number(inp.value) * thisInput.conversionFactor;

    const label = inp.parentElement.querySelector('label');
    label.textContent += `: ${inp.value}`;
    
    inp.oninput = e => {
        const which = e.target.id;
        const tsInput = inputStats[which];
        let val = Number(e.target.value);

        e.target.value = val;
        label.textContent = label.textContent.split(': ')[0] + `: ${val}`;

        inputState[which] = val * tsInput.conversionFactor;
        draw(inputState);
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
    valInputs.forEach(inp => inp.step = step);
}

window.addEventListener('keydown', e => { if (e.key === 'Shift') changeSteps(0.1); else if (e.key === 'Control') changeSteps(0.01); else if (e.key === 'Alt') changeSteps(0.001); else return; e.preventDefault(); });
window.addEventListener('keyup', e => { if (e.key === 'Shift') changeSteps(1); else if (e.key === 'Control') changeSteps(1); else if (e.key === 'Alt') changeSteps(1); else return; e.preventDefault(); });

simColors = ['#ff0000', '#00ff00', '#0000ff'];
document.querySelectorAll('button').forEach((btn, i) => btn.onclick = async () => {
    const searchee = unknown();
    console.log(optionValues.stepTime);
    if (searchee === '') checkInstance(inputState, optionValues.stepTime, i);
    else await findRange(searchee, i);
});

/*================================= Constants =================================*/

const images = {
    dozer: new Image(),
};
const imgPaths = {
    dozer: 'bozer.svg',
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

const WORLD_SCALE = 4; // 1 inch = 4 pixels


const fuelMass = 0.474; // 0.448-0.500 lbs
const fuelDiameter = 5.91;
const fuelRadius = fuelDiameter / 2;


/*================================= Algorithm =================================*/

const g = 386.0885827; // inches per second per second

const add = (vec1, vec2) => ({ x: vec1.x + vec2.x, y: vec1.y + vec2.y });
const mult = (vec, scalar) => ({ x: vec.x * scalar, y: vec.y * scalar });

const sims = simColors.map(a=>null);
class SimulationData {
    constructor(delta, h, theta, v0, spin, color) {
        this.delta = delta;
        this.h = h;
        this.theta = theta;
        this.v0 = v0;
        this.spin = spin;
        this.stats = { delta: this.delta, h: this.h, theta: this.theta, v0: this.v0, spin: this.spin };
        
        this.acceleration = { x: 0, y: 0 };
        this.velocity = { x: 0, y: 0 };
        this.position = { x: 0, y: 0 };
        
        this.pStorage = [];
        this.t = 0;
        this.dt = 0;
        this._msPer = -1;

        this.color = color;
        this.above = h > hopperHeight;
        this.running = false;
        this.success = false;

        this.dozerLeft = hubLeft - this.delta;
    }

    set drawingSpeed(msPer) {
        this._msPer = msPer;
    }

    init() {
        const vx = this.v0 * Math.cos(this.theta);
        const vy = this.v0 * Math.sin(this.theta);

        this.position = { x: 0, y: this.h };
        this.velocity = { x: vx, y: vy };
        this.acceleration = { x: 0, y: -g };
        this.dt = optionValues.calculationPrecision;
        
        this.pStorage = [{ t: 0, position: { x: 0, y: this.h }, kjForce: { x: 0, y: 0 }, dragForce: { x: 0, y: 0 } }];

        this.running = true;
    }

    integrateStep() {
        const omega = this.spin; // rad/s
        const fluidDensity = 0.0000434;
        const peopleScreamingAtTheBall = 100;
        const freeStreamVel = 3.93701 + 0.0000000001*peopleScreamingAtTheBall; // 0.1 m/s in in/s
        const kjForce = (2/3 * Math.PI) * fluidDensity * freeStreamVel * omega * Math.pow(fuelRadius, 3);

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

        this.pStorage.push({ t: this.t, position: { x: this.position.x, y: this.position.y }, kjForce: kjVector, dragForce: dragVector });
    }

    drawParabola() {
        // MOVE AND SCALE
        ctx.save();
        ctx.setTransform(WORLD_SCALE, 0, 0, -WORLD_SCALE, (hubLeft - this.delta)*WORLD_SCALE, canvas.height);
        
        const firstPos = this.pStorage[0].position;

        ctx.strokeStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(firstPos.x, firstPos.y);
        for (let i = 1; i < this.pStorage.length; i++) {
            const curr = this.pStorage[i].position;
            ctx.lineTo(curr.x, curr.y);
        }
        ctx.stroke();
        ctx.restore();
    };

    drawStep(resolve) {
        if ((this.position.y < 0) || (!this.above && (this.position.x + (hubLeft-this.delta) > hopperLeft))) {
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

        if (this._msPer >= 0) draw(this.stats, this.position, this.velocity, this.acceleration);
        
        this.integrateStep();

        if (this._msPer >= 0) setTimeout(() => this.drawStep(resolve), this._msPer);
        else requestAnimationFrame(() => this.drawStep(resolve));
    };

    endProcess(resolve) {
        if (this._msPer >= 0) this.printResults();
        this.running = false;

        draw(this.stats, this.position, this.velocity, this.acceleration);
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
        resultDiv.replaceChildren();

        const addTextLine = (text, value = '', suffix = '') => {
            const p = document.createElement('p');
            if (typeof value === "boolean") value = (value ? 'Yes' : 'No');
            else if (typeof value === "number") value = value.toFixed(optionValues.displayPrecision);

            if (value === '') p.innerHTML = text;
            else p.innerHTML = `${text}: <b>${value}${suffix}</b>`;
            resultDiv.appendChild(p);
        }

        addTextLine('Ball Made It?', this.success);

        const timetaken = this.t;
        addTextLine(`Travel Time`, timetaken);
        const distanceX = this.position.x;
        const distanceY = this.position.y;
        addTextLine('Distance Traveled (X)', distanceX);
        addTextLine('Distance Traveled (Y)', distanceY);
        addTextLine('Maximum Height', Math.max(...this.pStorage.map(a=>a.position.y)));

        const fromLeftHopper = this.position.x - this.delta - (hubWidth-hopperWidth)/2;
        if (this.success) addTextLine('Prob. of Bounceback (maybe)',
            Math.abs(fromLeftHopper - hopperWidth/2) / (hopperWidth) * 100,
        '%');
    };
}

function checkInstance(stats, msPer, simId) {
    return new Promise((resolve) => {
        const simRunner = new SimulationData(stats.delta, stats.h, stats.theta, stats.v0, stats.spin, simColors[simId]);
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
        const buffer = ([5, 1].at(prec % 2)) * Math.pow(10, -Math.floor(prec/2)+2);
        console.log(`Interval: ${interval}, Buffer: ${buffer}`);
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
            for (let test = outMin - buffer; test <= outMin + buffer; test += interval) await checkFunc(test);
            for (let test = outMax - buffer; test <= outMax + buffer; test += interval) await checkFunc(test);
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

const drawBall = (stats, x, y) => {
    // REPLACE WITH IMAGE DRAWING LATER
    ctx.fillStyle = '#f4f42d';
    ctx.beginPath();
    ctx.arc(x, y, fuelRadius, 0, 2*Math.PI);
    ctx.fill();
}

const drawArrow = (x, y, angle, length, color) => {
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

const draw = (stats) => {
    ctx.save();

    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    
    
    // MOVE AND SCALE
    ctx.setTransform(WORLD_SCALE, 0, 0, -WORLD_SCALE, 0, canvas.height);
    const sH = stats.h;

    // Draw the hub and hopper =========================================================
    const dozerLeft = hubLeft - stats.delta - dozerSize/2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

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

    const velInput = document.querySelector('input#v0');
    const velocityLength = stats.v0 * (5 / velInput.max);

    ctx.strokeStyle = '#ffffff99';
    ctx.beginPath();
    ctx.moveTo(dozerLeft + dozerSize/2, sH);
    for (let i = 0; i < velocityLength*Math.cos(stats.theta)/2; i++) {
        const x = dozerLeft + dozerSize/2 + i*2;
        const y = sH;
        i % 2 === 0 ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();

    drawArrow(
        dozerLeft + dozerSize/2, sH,
        stats.theta,
        velocityLength,
        '#00ffff'
    );

    const vectorSclFactor = 0.33;

    sims.forEach(sim => {
        if (!sim) return;
        sim.drawParabola();
        drawBall(sim.stats, sim.position.x + sim.dozerLeft, sim.position.y);

        if (!sim.running) return;

        const pos = sim.position;
        const vel = sim.velocity;
        if (optionValues['showVelocity'] && Math.hypot(vel.x, vel.y) > 0) drawArrow(
            pos.x + sim.dozerLeft, pos.y,
            Math.atan2(vel.y, vel.x),
            Math.hypot(vel.x, vel.y) * vectorSclFactor,
            '#00aa00'
        );
        
        const kjForce = sim.pStorage.at(-1).kjForce;
        const dragForce = sim.pStorage.at(-1).dragForce;
        const kjDirection = Math.atan2(kjForce.y, kjForce.x) + (sim.spin >= 0 ? Math.PI : 0);
        const kjMag = Math.hypot(kjForce.x, kjForce.y);
        const dragDirection = Math.atan2(dragForce.y, dragForce.x);
        const dragMag = Math.hypot(dragForce.x, dragForce.y);
        if (optionValues['showKJForce'] && kjMag !== 0) drawArrow(
            pos.x + sim.dozerLeft, pos.y,
            kjDirection,
            kjMag * vectorSclFactor * 3,
            '#00ffff'
        );
        if (optionValues['showDragForce'] && dragMag !== 0) drawArrow(
            pos.x + sim.dozerLeft, pos.y,
            dragDirection,
            dragMag * vectorSclFactor * 3,
            '#ff0000'
        );
    });

    ctx.restore();

    // Draw the dozer image upright in pixel coordinates (avoid transform flip)
    const px = dozerLeft * WORLD_SCALE;
    const psize = dozerSize * WORLD_SCALE;
    const pyTop = canvas.height - (sH * WORLD_SCALE); // top-left y for image so bottom sits at sH
    ctx.drawImage(images.dozer, px, pyTop, psize*2, psize);
}


ctx.fillStyle = 'black';
ctx.fillRect(0, 0, canvas.width, canvas.height);

Promise.all(
    Object.entries(images).map(([ key, img ]) => new Promise((res, rej) => {
        img.src = imgPaths[key];
        img.onload = res;
        img.onerror = rej;
    }))
).then(() => draw(inputState));