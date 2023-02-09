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
    if (axis === "x") {
        let position = posX / width;
        return Math.round(position * 127);
    }
    else {
        let position = posY / height;
        return Math.round(position * 127);
    }
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
    if (gestureActive) {
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
    else { // gesture NOT active
        if (checkTimeStart == null) {
            checkTimeStart = Date.now();
            checkX = x;
            checkY = y;
        }

        if (getDistance(x, y, checkX, checkY) < stillnessTolerance) {
            elapsedTimeSinceCheck = Date.now() - checkTimeStart;
            if (elapsedTimeSinceCheck > gestureStartThreshold) {
                // if xy position is about the same 
                console.log("GESTURE START: finger didnt move for 1s");
                gestureActive = true;
                gestureStartTime = Date.now();
                gestureStartX = x;
                gestureStartY = y;
                checkTimeStart = null;
            }
        }
        // finger moved, reset 
        else {
            console.log("START CHECK: finger moved, reset");
            checkTimeStart = null;
        }
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

let activeGestureId = null;
let gestureCCs = [0,0,0,0,0];
let gestureValues = [0,0,0,0,0];
function doSliderGestureIfActive(x, y, midiout, cc, gestureId) {
    if (isGestureActive()) {
        // // console.log("doin the gesture");
        // // let cc = getCCValueRadial(x, y, gestureStartX, gestureStartY, 300);
        let ccx = getCCValueXYAxisMode(x, y, 1280, 720, "x");
        // let ccy = getCCValueXYAxisMode(x, y, 1280, 720, "y");
        // // if(cc > 0) {
        // //     midiout.channels[1].sendControlChange(controller, cc);
        // //     document.getElementById('console').innerHTML = `<div>CC: ${controller} | VALUE: ${cc}</div>`;
        // // }
        // midiout.channels[1].sendControlChange(102, ccx);
        // document.getElementById('console').innerHTML = `<div>CC: 102 | VALUE: ${ccx}</div>`;

        // midiout.channels[1].sendControlChange(103, ccy);
        // document.getElementById('console').innerHTML += `<div>CC: 103 | VALUE: ${ccy}</div>`;

        activeGestureId = gestureId;
        gestureCCs[activeGestureId] = cc;
        gestureValues[activeGestureId] = ccx;

        midiout.channels[1].sendControlChange(cc, ccx);
    }
    else {
        activeGestureId = null;
    }
    updateOutputStatus();
}

function drawGestureStatus(canvasCtx, canvasElement) {
    if (isGestureActive()) {
        // draw a progress circle until gesture end
        let checkPos = getGestureCheckPos();
        let proportionUntilGestureEnd = getElapsedTime() / getGestureEndThreshold();
        canvasCtx.beginPath();
        canvasCtx.strokeStyle = 'orange';
        canvasCtx.lineWidth = 5;
        canvasCtx.arc(checkPos.x, checkPos.y, 15, 0, proportionUntilGestureEnd * 2 * Math.PI, false);
        canvasCtx.stroke();

        // draw spot where the gesture started
        // let startPos = getGestureStartPos();
        // canvasCtx.beginPath();
        // canvasCtx.strokeStyle = '#00ff00';
        // canvasCtx.lineWidth = 5;
        // canvasCtx.arc(startPos.x, startPos.y, 15, 0, 2 * Math.PI, false);
        // canvasCtx.stroke();

    }
    else {
        // draw a progress circle until gesture start
        let checkPos = getGestureCheckPos();
        let proportionUntilGestureStart = getElapsedTime() / getGestureStartThreshold();
        canvasCtx.beginPath();
        canvasCtx.strokeStyle = '#00ff00';
        canvasCtx.lineWidth = 5;
        canvasCtx.arc(checkPos.x, checkPos.y, 15, 0, proportionUntilGestureStart * 2 * Math.PI, false);
        canvasCtx.stroke();
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

function updateOutputStatus() {
    let i = activeGestureId;
    if(i != null) {
        let elem = document.getElementById(`G${i}-OUT`);
        elem.innerHTML = `CC: ${gestureCCs[i]} | VALUE: ${gestureValues[i]}`;
        elem.classList.add("active");
    }
    else {
        gestureCCs.forEach((cc, index) => {
            let elem = document.getElementById(`G${index}-OUT`);
            elem.classList.remove("active");
        });
    }

}