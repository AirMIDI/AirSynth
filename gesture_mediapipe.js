import vision from "https://cdn.skypack.dev/@mediapipe/tasks-vision@latest";
const { GestureRecognizer, FilesetResolver } = vision;

const demosSection = document.getElementById("demos");
let gestureRecognizer;
let runningMode = "IMAGE";
const videoHeight = "720px";
const videoWidth = "960px";

const video = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext("2d");

let showVideo = true;
document.querySelector('#videotoggle').addEventListener('change', () => {
    showVideo = !showVideo;
});

let gestureId = 1;

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
  const webcamElement = document.getElementsByClassName('input_video')[0];
  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await gestureRecognizer.setOptions({ runningMode: runningMode });
  }
  let nowInMs = Date.now();
  const results = await gestureRecognizer.recognizeForVideo(video, nowInMs);

  webcamElement.style.height = videoHeight;
  webcamElement.style.width = videoWidth;

  if(showVideo){
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      canvasElement.style.height = videoHeight;
      canvasElement.style.width = videoWidth;
      if (results.landmarks) {
        for (const landmarks of results.landmarks) {
          drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
            color: "#00FF00",
            lineWidth: 5
          });
          drawLandmarks(canvasCtx, landmarks, { color: "#FF0000", lineWidth: 2 });
        }
      }
      canvasCtx.restore();
  }

  if (results.gestures.length > 0) {
    switch(results.gestures[0][0].categoryName){
        case 'Closed_Fist':
            gestureId = 1;
            break;
        case 'Open_Palm':
            gestureId = 2;
            break;
        case 'Pointing_Up':
            gestureId = 3;
            break;
        case 'Thumb_Down':
            gestureId = 4;
            break;
        case 'Thumb_Up':
            gestureId = 5;
            break;
        case 'Victory':
            gestureId = 6;
            break;
        case 'ILoveYou':
            gestureId = 7;
            break;
        default:
            gestureId = 0;
    }
  } else {
    gestureId = 0;
  }
  // Call this function again to keep predicting when the browser is ready.
  window.requestAnimationFrame(predictWebcam);
}