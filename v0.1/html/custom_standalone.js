const videoElement = document.getElementsByClassName('input_video')[0];
//const canvasElement = document.getElementsByClassName('output_canvas')[0];
//const canvasCtx = canvasElement.getContext('2d');
const textElement = document.getElementById('mytextarea')

async function updatePredictions() {
    // Get the predictions for the canvas data.
    Console.log(typeof videoElement);
    const input = new onnx.Tensor(new Float32Array(videoElement), "float32");

    const outputMap = await sess.run([input]);
    const outputTensor = outputMap.values().next().value;
    const predictions = outputTensor.data;
    const maxPrediction = Math.max(...predictions);

    for (let i = 0; i < predictions.length; i++) {
        if(predictions[i]==maxPrediction){
            textElement.innerHTML = i.toString();
        }
    }
}

function startup() {
    navigator.mediaDevices
        .getUserMedia({ video: true, audio: false })
        .then((stream) => {
          videoElement.srcObject = stream;
          videoElement.play();
        })
        .catch((err) => {
          console.error(`An error occurred: ${err}`);
        });

    while(true){
        await updatePredictions();
    }

}

window.addEventListener("load", startup, false);