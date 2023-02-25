let showVideo = true;
document.querySelector('#videotoggle').addEventListener('change', () => {
    // hide or unhide video element
    document.getElementById('webcam').toggleAttribute('hidden');
});