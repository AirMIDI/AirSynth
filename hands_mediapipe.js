const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');

let previousNote = 0;

let showVideo = true;

let gestureId = 1;

function onResults(results) {
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    // mirror the video output
    canvasCtx.translate(canvasElement.width, 0);
    canvasCtx.scale(-1, 1);

    let selectedPort = document.getElementById("outputs").value;
    let midiout = WebMidi.outputs[selectedPort];

    if(showVideo){
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    }

    if (results.multiHandLandmarks.length > 0) {
        let indexTipPos = results.multiHandLandmarks[0][8];
        let posX = indexTipPos.x * canvasElement.width;
        let posY = indexTipPos.y * canvasElement.height;

        let info = getPointVelocity(posX, posY);
        if(info.vx < -150 && info.distanceTraveled > 150){
            console.log("swiped right");
            startGesture();
        }
        if(info.vx > 150 && info.distanceTraveled > 150){
            console.log("swiped left");
            if(gestureId < 4){
                gestureId += 1;
            }
            else {
                gestureId = 0;
            }
        }



        checkForGestureStartOrEnd(posX, posY);
        drawGestureDetectionStatus(canvasCtx, canvasElement);



        doSliderGestureIfActive(posX, posY, midiout, gestureId);
        drawOutputStatus();

        drawGestureActiveStatus(canvasCtx, canvasElement);

        for (const landmarks of results.multiHandLandmarks) {
            drawLandmarks(canvasCtx, landmarks, {
                color: '#FF0000',
                lineWidth: 2
            });
        }
    }
    canvasCtx.restore();
}

const hands = new Hands({
    locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
    }
});
hands.setOptions({ maxNumHands: 1, modelComplexity: 1, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
hands.onResults(onResults);

const camera = new Camera(videoElement, {
    onFrame: async () => {
        await hands.send({ image: videoElement });
    },
    width: 1280,
    height: 720
});
camera.start();

document.querySelector('#videotoggle').addEventListener('change', () => {
    showVideo = !showVideo;
});

for(let i=0;i<5;i++){
    document.getElementById(`b${i+1}`).addEventListener('click', () => {
        gestureId = i;
    });
}