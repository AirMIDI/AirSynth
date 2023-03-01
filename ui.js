let showVideo = true;
document.querySelector('#videotoggle').addEventListener('change', () => {
    // hide or unhide video element
    document.getElementById('webcam').toggleAttribute('hidden');
});

let main = document.querySelector('.main');
let maxWidth = 1310;
let maxHeight = 720;
applyScale();

function applyScale(){
    if(window.innerHeight > maxHeight && window.innerWidth > maxWidth) {
        main.style.scale = 1;
        return;
    }

    let scaleX = Math.max(Math.min(window.innerWidth / maxWidth, 1.0), 0.1); 
    let scaleY = Math.max(Math.min(window.innerHeight / maxHeight, 1.0), 0.1);
    let scale = Math.min(scaleX-0.1, scaleY-0.1);
    main.style.scale = scale;
}
addEventListener("resize", (event) => {
    applyScale();
});




