// ----- midi stuff -----
// https://webmidijs.org/
// Enable WEBMIDI.js and trigger the onEnabled() function when ready
WebMidi
    .enable()
    .then(onEnabled)
    .catch(err => alert(err));

// Function triggered when WEBMIDI.js is ready
function onEnabled() {
    // Display available MIDI output devices
    // and add to html dropdown
    let dropdownElem = document.getElementById("outputs");
    console.log("availiable outputs");
    if (WebMidi.outputs.length < 1) {
        console.log("No device detected.");
    } else {
        WebMidi.outputs.forEach((device, index) => {
            console.log(`${index}: ${device.name}`);
            let option = document.createElement("option");
            option.text = `${index}: ${device.name}`;
            option.value = index;
            dropdownElem.appendChild(option);
        });
    }


}

function getDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

// Calculate the note on the scale at (x,y) 
// centered around (cx,cy) in the circle with radius
// These are all arguments so we can change radial note params on the fly
const scaleCmaj7 = [60, 62, 64, 65, 67, 69, 71, 72];
function getRadialNote(x, y, cx, cy, radius, scale) {
    let noteX = x - cx;
    let noteY = y - cy;
    let radians = Math.atan2(noteY, noteX);
    let distance = getDistance(0, 0, noteX, noteY);

    if (distance > radius) return 0;

    // 30% of the radius in center is a safe area
    if (distance > radius * 0.3) {
        let radialPercent = (radians + Math.PI) / (2 * Math.PI);
        let note = scale[(Math.floor(radialPercent * 9)) % 8];
        return note;
    } else {
        return 0;
    }
}

// https://stackoverflow.com/a/19832744
let prevTimestamp = null;
let prevX;
let prevY;
function getPointVelocity(currX, currY) {
    let info = { vx: 0, vy: 0, distanceTraveled: 0 };
    if (prevTimestamp == null) {
        prevTimestamp = Date.now();
        prevX = currX;
        prevY = currY;
    }

    let dt = Date.now() - prevTimestamp;
    let dx = currX - prevX;
    let dy = currY - prevY;

    info.vx = Math.round(dx / dt * 100);
    info.vy = Math.round(dy / dt * 100);
    info.distanceTraveled = getDistance(currX, currY, prevX, prevY);

    prevTimestamp = Date.now();
    prevX = currX;
    prevY = currY;

    return info;
}

// the "slider" is defined between (startX,startY) and a radius around it
// (posX,posY) is compared for closeness to the start, with a cutoff at radius
function getCCValueRadial(posX, posY, startX, startY, radius) {
    let value = 0; // value is between 0-127

    let distance = getDistance(posX, posY, startX, startY);

    // Only send a value if we are within radius
    if (distance < radius) {
        // the more close to start point, the higher the value
        // on startpoint, closeness = 1
        // at radius edge, closeness = 0
        let closeness = 1 - distance / radius;
        value = closeness * 127;

    }

    return Math.round(value);
}

// width = max x, height = max y
function getCCValueXYAxisMode(posX, posY, width, height, axis) {
    let position = 0;
    if (axis === "x") {
        position = posX / width;
    }
    else {
        position = posY / height;
    }
    return Math.min(Math.max(Math.round(position * 127), 0), 127);
}


// this function relies on being periodically called
// GestureStart = finger has not moved for 1 second and gesture was inactive
// GestureEnd = finger has not moved for 1 second and gesture was active
let gestureActive = false;
let gestureStartTime = null;
let gestureEndTime = null;
let stillnessTolerance = 15;
let gestureStartX;
let gestureStartY;
let gestureStartThreshold = 1000;
let gestureEndThreshold = 1000;
let elapsedTimeSinceCheck = 0;
let checkTimeStart = null;
let checkX;
let checkY;
function checkForGestureStartOrEnd(x, y) {
    if (gestureActive) { // check for gesture end
        if (checkTimeStart == null) {
            checkTimeStart = Date.now();
            checkX = x;
            checkY = y;
        }

        if (getDistance(x, y, checkX, checkY) < stillnessTolerance) {
            elapsedTimeSinceCheck = Date.now() - checkTimeStart;
            if (elapsedTimeSinceCheck > gestureEndThreshold) {
                // if xy position is about the same 
                console.log("GESTURE END: finger didnt move for 1s");
                gestureActive = false;
                checkTimeStart = null;
            }
        }
        // finger moved, reset 
        else {
            console.log("END CHECK: finger moved, reset");
            checkTimeStart = null;
        }

    }
    else { // check for gesture start
        // if (checkTimeStart == null) {
        //     checkTimeStart = Date.now();
        //     checkX = x;
        //     checkY = y;
        // }

        // if (getDistance(x, y, checkX, checkY) < stillnessTolerance) {
        //     elapsedTimeSinceCheck = Date.now() - checkTimeStart;
        //     if (elapsedTimeSinceCheck > gestureStartThreshold) {
        //         // if xy position is about the same 
        //         console.log("GESTURE START: finger didnt move for 1s");
        //         gestureActive = true;
        //         gestureStartTime = Date.now();
        //         gestureStartX = x;
        //         gestureStartY = y;
        //         checkTimeStart = null;
        //     }
        // }
        // // finger moved, reset 
        // else {
        //     console.log("START CHECK: finger moved, reset");
        //     checkTimeStart = null;
        // }
    }

}

function isGestureActive() {
    return gestureActive;
}

function getElapsedTime() {
    return elapsedTimeSinceCheck;
}
function getGestureStartThreshold() {
    return gestureStartThreshold;
}
function getGestureEndThreshold() {
    return gestureEndThreshold;
}
function getGestureCheckPos() {
    return { x: checkX, y: checkY };
}
function getGestureStartPos() {
    return { x: gestureStartX, y: gestureStartY };
}
function endGesture() {
    gestureActive = false;
}
function startGesture() {
    gestureActive = true;
}

let detectedGestureId = null;
let activeGestureId = null;
let gestureCCs = [101,102,103,104,105];
let gestureValues = [0,0,0,0,0];

function updateGestureCC(gestureId, cc){
    gestureCCs[gestureId] = Number(cc);
}

function doSliderGestureIfActive(x, y, midiout, gestureId) {
    if (isGestureActive()) {
        // let ccx = getCCValueXYAxisMode(x, y, 1280, 720, "x");
        let ccx = getCCValueXYAxisMode(x, y, 1280, 720, "y");

        activeGestureId = gestureId;
        cc = gestureCCs[gestureId];
        gestureValues[activeGestureId] = ccx;

        midiout.channels[1].sendControlChange(cc, ccx);
    }
    else {
        activeGestureId = null;
        detectedGestureId = gestureId;
    }
    // updateOutputStatus();
}

function drawGestureDetectionStatus(canvasCtx, canvasElement) {
    if (isGestureActive()) {
        // draw a progress circle until gesture end
        let checkPos = getGestureCheckPos();
        let proportionUntilGestureEnd = getElapsedTime() / getGestureEndThreshold();
        canvasCtx.beginPath();
        canvasCtx.strokeStyle = 'orange';
        canvasCtx.lineWidth = 5;
        canvasCtx.arc(checkPos.x, checkPos.y, 15, 0, proportionUntilGestureEnd * 2 * Math.PI, false);
        canvasCtx.stroke();

    }
    else {
        // draw a progress circle until gesture start
        // let checkPos = getGestureCheckPos();
        // let proportionUntilGestureStart = getElapsedTime() / getGestureStartThreshold();
        // canvasCtx.beginPath();
        // canvasCtx.strokeStyle = '#00ff00';
        // canvasCtx.lineWidth = 5;
        // canvasCtx.arc(checkPos.x, checkPos.y, 15, 0, proportionUntilGestureStart * 2 * Math.PI, false);
        // canvasCtx.stroke();
    }
}

function drawGestureActiveStatus(canvasCtx, canvasElement) {
    if (isGestureActive()) {
        canvasCtx.strokeStyle = '#00ff00';
    }
    else {
        canvasCtx.strokeStyle = '#ff0000';
    }

    canvasCtx.lineWidth = 20;
    canvasCtx.beginPath();
    canvasCtx.moveTo(0, 0);
    canvasCtx.lineTo(canvasElement.width, 0);
    canvasCtx.stroke();

    canvasCtx.beginPath();
    canvasCtx.moveTo(0, canvasElement.height);
    canvasCtx.lineTo(canvasElement.width, canvasElement.height);
    canvasCtx.stroke();
}

function drawOutputStatus(){
    let outputSection = document.getElementById("out");
    if(outputSection.children.length == 0){
        // populate with elements if there are none
        gestureCCs.forEach((cc, index) => {
            let d = document.createElement("div");
            d.innerText = `G${index+1} | CC: ${cc} | VAL: 0`;
            outputSection.appendChild(d);
        });
    }
    else {
        // update existing elements if they exist
        gestureCCs.forEach((cc, index) => {
            let current = outputSection.children[index];
            current.innerText = `G${index+1} | CC: ${cc} | VAL: ${gestureValues[index]}`;

            if(index == activeGestureId){
                current.classList.add("active");
            }
            else if(index == detectedGestureId){
                current.classList.add("detected");
            }
            else {
                current.classList.remove("active");
                current.classList.remove("detected");
            }
        });
    }
}