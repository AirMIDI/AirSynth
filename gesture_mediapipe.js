"use strict"
import vision from "https://cdn.skypack.dev/@mediapipe/tasks-vision@latest";
import { processData, notifyOffScreen } from "./midi.js";
const { GestureRecognizer, FilesetResolver } = vision;

// const demosSection = document.getElementById("demos");
let gestureRecognizer;
let runningMode = "IMAGE";
const videoHeight = "720px";
const videoWidth = "960px";

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
// const gestureOutput = document.getElementById("gesture_output");

async function runGesture() {
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );
    gestureRecognizer = await GestureRecognizer.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath:
                "https://storage.googleapis.com/mediapipe-tasks/gesture_recognizer/gesture_recognizer.task"
        },
        runningMode: runningMode,
        num_hands: 1
    });
}
await runGesture();

if (!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
    const constraints = {
        video: true
    };
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    });
} else {
    console.warn("getUserMedia() is not supported by your browser");
}

async function predictWebcam() {
    const webcamElement = document.getElementById("webcam");
    // Now let's start detecting the stream.
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await gestureRecognizer.setOptions({ runningMode: runningMode });
    }
    let nowInMs = Date.now();
    const results = await gestureRecognizer.recognizeForVideo(video, nowInMs);

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    canvasElement.style.height = videoHeight;
    webcamElement.style.height = videoHeight;
    canvasElement.style.width = videoWidth;
    webcamElement.style.width = videoWidth;
    if (results.landmarks.length > 0) {
        let middlePos = results.landmarks[0][9];
        let x = middlePos.x * canvasElement.width;
        let y = middlePos.y * canvasElement.height;
        let z = Math.abs(middlePos.z * 1000);
        // let gestureId = -1;
        let gestureName = 'None';
        if (results.gestures.length > 0) {
            gestureName = results.gestures[0][0].categoryName; 
        }

        // Pass all information down to midi.js for turning into outputs
        processData(x, y, z, gestureName, canvasCtx, canvasElement);

        // draw hand
        for (const landmarks of results.landmarks) {
            drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
                color: "#00FF0067",
                lineWidth: 2
            });
            drawLandmarks(canvasCtx, landmarks, { color: "#00FF0037", lineWidth: 1 });
        }
        canvasCtx.beginPath();
        // canvasCtx.strokeStyle = '#ff00ff';
        canvasCtx.fillStyle = '#ff00ff';
        canvasCtx.lineWidth = 5;
        canvasCtx.arc(x, y, 10, 0, 2 * Math.PI, false);
        canvasCtx.fill();
        // canvasCtx.stroke();
    }
    else {
        notifyOffScreen();
    }
    canvasCtx.restore();


    // Call this function again to keep predicting when the browser is ready.
    window.requestAnimationFrame(predictWebcam);
}
