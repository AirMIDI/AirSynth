// ----- midi stuff -----
// https://webmidijs.org/
// Enable WEBMIDI.js and trigger the onEnabled() function when ready
WebMidi
    .enable()
    .then(onEnabled)
    .catch(err => alert(err));

// Function triggered when WEBMIDI.js is ready
function onEnabled() {
    // Display available MIDI input devices
    // if (WebMidi.inputs.length < 1) {
    // console.log("No device detected.");
    // } else {
    // WebMidi.inputs.forEach((device, index) => {
    //     console.log(`${index}: ${device.name}`);
    // });
    // }

    // Display available MIDI output devices
    console.log("availiable outputs")
    if (WebMidi.outputs.length < 1) {
        console.log("No device detected.");
    } else {
        WebMidi.outputs.forEach((device, index) => {
            console.log(`${index}: ${device.name}`);
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
    let velocity = { vx: 0, vy: 0 };
    if (prevTimestamp == null) {
        prevTimestamp = Date.now();
        prevX = currX;
        prevY = currY;
    }

    let dt = Date.now() - prevTimestamp;
    let dx = currX - prevX;
    let dy = currY - prevY;

    velocity.vx = Math.round(dx / dt * 100);
    velocity.vy = Math.round(dy / dt * 100);

    prevTimestamp = Date.now();
    prevX = currX;
    prevY = currY;

    return velocity;
}