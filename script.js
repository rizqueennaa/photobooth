// =========================
// STATE MANAGEMENT
// =========================

const state = {
    selectedFrame: null,
    currentSlot: 0,
    photos: [null, null, null],
    currentFilter: 'original',
    heartSticker: false,
    stream: null,
    tempPhoto: null,
    faceLandmarks: null,
    faceMesh: null,
    faceTracking: false
};

const filterStyles = {
    original: 'none',
    'soft-pink': 'sepia(0.2) saturate(1.2) hue-rotate(330deg) brightness(1.05)',
    dreamy: 'blur(0.5px) brightness(1.1) contrast(0.9) saturate(1.3)',
    vintage: 'sepia(0.5) contrast(1.1) brightness(0.9)',
    'vintage-brown': 'sepia(0.38) saturate(0.82) contrast(1.04) brightness(1.04)',
    'y2k-flash': 'saturate(1.22) contrast(1.12) brightness(1.08)',
    'earthy-green': 'sepia(0.12) saturate(0.82) hue-rotate(18deg) contrast(1.03)',
    bubblegum: 'hue-rotate(300deg) saturate(1.5) brightness(1.1)',
    bw: 'grayscale(100%) contrast(1.2)'
};


// =========================
// NAVIGATION
// =========================

function goToScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });

    document.getElementById(screenId).classList.remove('hidden');
}


// =========================
// FRAME SELECTION
// =========================

function selectFrame(element) {
    document.querySelectorAll('.frame-card').forEach(card => {
        card.classList.remove('selected');
    });

    element.classList.add('selected');

    state.selectedFrame = element.getAttribute('data-frame');

    document.getElementById('btn-continue-frame').disabled = false;
}


function startPhotoSession() {
    state.currentSlot = 0;
    state.photos = [null, null, null];
    state.tempPhoto = null;

    updatePhotoCounter();
    goToScreen('screen-source');
}


function updatePhotoCounter() {
    document.getElementById('photo-counter').innerText =
        `PHOTO ${state.currentSlot + 1} / 3`;
}


// =========================
// CAMERA
// =========================

async function openCamera() {

    goToScreen('screen-camera');

    const video = document.getElementById('camera-video');

    resetCameraUI();

    try {

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error('Camera API unavailable');
        }

        state.stream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'user',
                width: { ideal: 1280 },
                height: { ideal: 720 }
            },
            audio: false
        });

        video.srcObject = state.stream;

        await video.play();
        startFaceTracking(video);

    } catch (error) {

        console.error('Camera error:', error);

        alert(
            'Oops! Kamera tidak bisa dibuka. Pastikan izin kamera sudah Allow ya 🎀'
        );

        goToScreen('screen-source');
    }
}


function stopCamera() {

    if (state.stream) {

        state.stream.getTracks().forEach(track => {
            track.stop();
        });

        state.stream = null;
    }

    const video = document.getElementById('camera-video');

    state.faceTracking = false;
    state.faceLandmarks = null;
    if (video) {
        video.srcObject = null;
    }
}


// =========================
// FACE TRACKING FOR PINK LOVE
// Uses MediaPipe FaceMesh when the CDN is available.
// If it is unavailable, the sticker keeps a gentle fixed-position fallback.
// =========================

async function startFaceTracking(video) {
    state.faceTracking = true;
    if (typeof FaceMesh === 'undefined') {
        console.warn('FaceMesh unavailable; using fixed heart sticker position.');
        return;
    }
    try {
        if (!state.faceMesh) {
            state.faceMesh = new FaceMesh({ locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
            state.faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
            state.faceMesh.onResults(results => {
                const landmarks = results.multiFaceLandmarks && results.multiFaceLandmarks[0];
                state.faceLandmarks = landmarks || null;
                if (landmarks) positionHeartSticker(landmarks);
            });
        }
        const detect = async () => {
            if (!state.faceTracking || !state.stream || video.readyState < 2) return;
            try { await state.faceMesh.send({ image: video }); } catch (err) { console.warn('Face tracking frame skipped:', err); }
            if (state.faceTracking) requestAnimationFrame(detect);
        };
        detect();
    } catch (err) {
        console.warn('Face tracking could not start:', err);
    }
}

function positionHeartSticker(landmarks) {
    const overlay = document.getElementById('heart-sticker-overlay');
    const video = document.getElementById('camera-video');
    if (!overlay || !video || !landmarks) return;
    // FaceMesh point 10 is near the upper forehead; 234 and 454 estimate face width.
    const forehead = landmarks[10];
    const left = landmarks[234];
    const right = landmarks[454];
    const centerX = (1 - forehead.x) * video.clientWidth;
    const centerY = forehead.y * video.clientHeight;
    const faceWidth = Math.abs(right.x - left.x) * video.clientWidth;
    const scale = Math.max(0.72, Math.min(1.45, faceWidth / 150));
    const placements = [
        ['.heart-one', -0.34, -0.12, 0.55], ['.heart-two', -0.16, -0.34, 0.72],
        ['.heart-three', 0.08, -0.30, 0.82], ['.heart-four', -0.48, 0.02, 0.48],
        ['.heart-five', 0.39, -0.02, 0.58]
    ];
    placements.forEach(([selector, dx, dy, size]) => {
        const heart = overlay.querySelector(selector);
        if (!heart) return;
        heart.style.left = `${centerX + faceWidth * dx}px`;
        heart.style.top = `${centerY + faceWidth * dy}px`;
        heart.style.fontSize = `${Math.max(15, faceWidth * size * 0.22)}px`;
    });
}

// =========================
// FILTER
// =========================

function setFilter(filterName, button) {

    state.currentFilter = filterName;

    const video = document.getElementById('camera-video');

    video.style.filter = filterStyles[filterName];

    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    if (button) {
        button.classList.add('active');
    }
}


function toggleHeartSticker(button) {
    state.heartSticker = !state.heartSticker;
    document.getElementById('heart-sticker-overlay').classList.toggle('hidden', !state.heartSticker);
    button.classList.toggle('active', state.heartSticker);
}

// =========================
// CAMERA UI
// =========================

function resetCameraUI() {

    document
        .getElementById('btn-capture')
        .parentElement
        .classList
        .remove('hidden');

    document
        .getElementById('camera-preview-controls')
        .classList
        .add('hidden');

    document
        .querySelector('.filter-scroll')
        .classList
        .remove('hidden');

    const video = document.getElementById('camera-video');

    video.style.filter = filterStyles[state.currentFilter];
    const heartOverlay = document.getElementById('heart-sticker-overlay');
    if (heartOverlay) heartOverlay.classList.toggle('hidden', !state.heartSticker);
}


// =========================
// TAKE PHOTO
// =========================

function takePhoto() {

    const countdown = document.getElementById('countdown-display');

    countdown.classList.remove('hidden');

    let count = 3;

    countdown.innerText = count;

    const interval = setInterval(() => {

        count--;

        if (count > 0) {

            countdown.innerText = count;

        } else {

            clearInterval(interval);

            countdown.classList.add('hidden');

            triggerFlash();

            captureCanvas();
        }

    }, 1000);
}


// =========================
// FLASH
// =========================

function triggerFlash() {

    const flash = document.getElementById('flash-effect');

    flash.classList.remove('hidden');

    flash.classList.add('flash-anim');

    setTimeout(() => {

        flash.classList.remove('flash-anim');

        flash.classList.add('hidden');

    }, 500);
}


// =========================
// CAPTURE
// =========================

function captureCanvas() {

    const video = document.getElementById('camera-video');

    const canvas = document.getElementById('process-canvas');

    if (!video.videoWidth || !video.videoHeight) {

        alert('Kamera belum siap. Coba tunggu sebentar ya 📸');

        return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');

    // Mirror photo
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);

    // Apply filter
    ctx.filter = filterStyles[state.currentFilter];

    ctx.drawImage(
        video,
        0,
        0,
        canvas.width,
        canvas.height
    );

    if (state.heartSticker) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.filter = 'none';
        drawHeartCrown(ctx, canvas.width, canvas.height, state.faceLandmarks);
    }

    video.pause();

    state.tempPhoto = canvas.toDataURL(
        'image/jpeg',
        0.92
    );

    document
        .getElementById('btn-capture')
        .parentElement
        .classList
        .add('hidden');

    document
        .querySelector('.filter-scroll')
        .classList
        .add('hidden');

    document
        .getElementById('camera-preview-controls')
        .classList
        .remove('hidden');
}


function drawHeartCrown(ctx, w, h, landmarks) {
    let cx = w * 0.5, cy = h * 0.24, faceWidth = w * 0.42;
    if (landmarks && landmarks[10] && landmarks[234] && landmarks[454]) {
        const forehead = landmarks[10], left = landmarks[234], right = landmarks[454];
        cx = (1 - forehead.x) * w;
        cy = forehead.y * h - h * 0.045;
        faceWidth = Math.abs(right.x - left.x) * w;
    }
    const hearts = [
        [-0.34, -0.02, 0.16, '💗'], [-0.17, -0.20, 0.20, '💖'],
        [0.04, -0.24, 0.23, '💕'], [0.25, -0.12, 0.17, '💗'],
        [-0.46, 0.09, 0.13, '♡'], [0.42, 0.08, 0.13, '♡']
    ];
    ctx.save();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    hearts.forEach(([dx, dy, size, text]) => {
        ctx.font = `${Math.round(faceWidth * size)}px "Segoe UI Emoji", "Apple Color Emoji", sans-serif`;
        ctx.fillText(text, cx + faceWidth * dx, cy + faceWidth * dy);
    });
    ctx.restore();
}

// =========================
// RETAKE
// =========================

function retakePhoto() {

    const video = document.getElementById('camera-video');

    resetCameraUI();

    if (state.stream) {
        video.play();
    }
}


// =========================
// UPLOAD PHOTO
// =========================

function handleFileUpload(event) {

    const file = event.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = function(e) {

        state.tempPhoto = e.target.result;

        document.getElementById('upload-preview-img').src =
            state.tempPhoto;

        goToScreen('screen-upload');
    };

    reader.readAsDataURL(file);
}


// =========================
// CONFIRM PHOTO
// =========================

function confirmPhoto() {

    if (!state.tempPhoto) {
        alert('Belum ada foto yang dipilih 📸');
        return;
    }

    state.photos[state.currentSlot] =
        state.tempPhoto;

    stopCamera();

    state.currentSlot++;

    if (state.currentSlot < 3) {

        updatePhotoCounter();

        goToScreen('screen-source');

    } else {

        generateFinalResult();
    }
}


// =========================
// LOAD IMAGE
// =========================

function loadImage(src) {

    return new Promise((resolve, reject) => {

        const img = new Image();

        img.onload = () => resolve(img);

        img.onerror = reject;

        img.src = src;
    });
}


// =========================
// DRAW PHOTO
// =========================

function drawPhotoCover(ctx, img, x, y, w, h) {

    const imgRatio = img.width / img.height;

    const canvasRatio = w / h;

    let sx;
    let sy;
    let sw;
    let sh;

    if (imgRatio > canvasRatio) {

        sh = img.height;

        sw = img.height * canvasRatio;

        sx = (img.width - sw) / 2;

        sy = 0;

    } else {

        sw = img.width;

        sh = img.width / canvasRatio;

        sx = 0;

        sy = (img.height - sh) / 2;
    }

    ctx.save();

    ctx.beginPath();

    ctx.roundRect(
        x,
        y,
        w,
        h,
        30
    );

    ctx.clip();

    ctx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        x,
        y,
        w,
        h
    );

    ctx.restore();
}


// =========================
// FINAL RESULT
// =========================

async function generateFinalResult() {

    goToScreen('screen-result');

    const resultImg =
        document.getElementById('final-result-img');

    resultImg.src = '';

    const canvas =
        document.createElement('canvas');

    canvas.width = 1200;
    canvas.height = 3600;

    const ctx = canvas.getContext('2d');

    drawFrameBackground(
        ctx,
        canvas.width,
        canvas.height,
        state.selectedFrame
    );


    const slots = [

        {
            x: 150,
            y: 300,
            w: 900,
            h: 800
        },

        {
            x: 150,
            y: 1300,
            w: 900,
            h: 800
        },

        {
            x: 150,
            y: 2300,
            w: 900,
            h: 800
        }

    ];


    for (let i = 0; i < 3; i++) {

        const img =
            await loadImage(state.photos[i]);

        drawPhotoCover(
            ctx,
            img,
            slots[i].x,
            slots[i].y,
            slots[i].w,
            slots[i].h
        );

        drawSlotDecorations(
            ctx,
            slots[i],
            state.selectedFrame
        );
    }


    drawFrameOverlays(
        ctx,
        canvas.width,
        canvas.height,
        state.selectedFrame
    );


    resultImg.src =
        canvas.toDataURL(
            'image/jpeg',
            0.92
        );
}


// =========================
// BLUE BOW
// =========================

function drawBlueBow(ctx, x, y, scale) {

    ctx.save();

    ctx.translate(x, y);

    ctx.scale(scale, scale);

    ctx.fillStyle = '#a9d8ff';


    ctx.beginPath();

    ctx.moveTo(0, 0);

    ctx.bezierCurveTo(
        -75, -60,
        -115, -25,
        -75, 20
    );

    ctx.bezierCurveTo(
        -45, 45,
        -15, 15,
        0, 0
    );

    ctx.fill();


    ctx.beginPath();

    ctx.moveTo(0, 0);

    ctx.bezierCurveTo(
        75, -60,
        115, -25,
        75, 20
    );

    ctx.bezierCurveTo(
        45, 45,
        15, 15,
        0, 0
    );

    ctx.fill();


    ctx.fillStyle = '#6fa8d5';

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        18,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
}


// =========================
// PINK BOW
// =========================

function drawPinkBow(ctx, x, y, scale) {

    ctx.save();

    ctx.translate(x, y);

    ctx.scale(scale, scale);

    ctx.fillStyle = '#f4a6c1';


    ctx.beginPath();

    ctx.moveTo(0, 0);

    ctx.bezierCurveTo(
        -65, -55,
        -105, -20,
        -70, 25
    );

    ctx.bezierCurveTo(
        -40, 45,
        -15, 15,
        0, 0
    );

    ctx.fill();


    ctx.beginPath();

    ctx.moveTo(0, 0);

    ctx.bezierCurveTo(
        65, -55,
        105, -20,
        70, 25
    );

    ctx.bezierCurveTo(
        40, 45,
        15, 15,
        0, 0
    );

    ctx.fill();


    ctx.fillStyle = '#df789f';

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        16,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
}


// =========================
// FLOWER
// =========================

function drawFlower(
    ctx,
    x,
    y,
    scale,
    petalColor
) {

    ctx.save();

    ctx.translate(x, y);

    ctx.scale(scale, scale);


    // Shadow

    ctx.fillStyle =
        'rgba(100,60,80,0.18)';

    ctx.beginPath();

    ctx.arc(
        5,
        8,
        42,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Petals

    ctx.fillStyle = petalColor;

    for (let i = 0; i < 6; i++) {

        const angle =
            i * Math.PI / 3;

        ctx.save();

        ctx.rotate(angle);

        ctx.beginPath();

        ctx.ellipse(
            0,
            -32,
            22,
            38,
            0,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }


    // Center

    ctx.fillStyle = '#ffd978';

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        18,
        0,
        Math.PI * 2
    );

    ctx.fill();

    ctx.restore();
}


// =========================
// CAMERA STICKER
// =========================

function drawCameraSticker(
    ctx,
    x,
    y,
    scale
) {

    ctx.save();

    ctx.translate(x, y);

    ctx.scale(scale, scale);


    // Camera body

    ctx.fillStyle = '#f4f4f4';

    ctx.beginPath();

    ctx.roundRect(
        -75,
        -40,
        150,
        80,
        18
    );

    ctx.fill();


    // Camera top

    ctx.fillStyle = '#d7d7d7';

    ctx.fillRect(
        -35,
        -55,
        55,
        20
    );


    // Lens

    ctx.fillStyle = '#333333';

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        27,
        0,
        Math.PI * 2
    );

    ctx.fill();


    ctx.fillStyle = '#87bde8';

    ctx.beginPath();

    ctx.arc(
        0,
        0,
        16,
        0,
        Math.PI * 2
    );

    ctx.fill();


    // Flash

    ctx.fillStyle = '#ff9fc4';

    ctx.fillRect(
        45,
        -25,
        15,
        15
    );

    ctx.restore();
}


// =========================
// FRAME BACKGROUNDS
// =========================

function drawFrameBackground(
    ctx,
    w,
    h,
    frameType
) {


    // =========================
    // BLUE DENIM
    // =========================

    if (frameType === 'blue-denim') {

        ctx.fillStyle = '#6f9fc5';

        ctx.fillRect(
            0,
            0,
            w,
            h
        );


        // Denim texture

        ctx.strokeStyle =
            'rgba(255,255,255,0.12)';

        ctx.lineWidth = 2;


        for (
            let i = -h;
            i < w + h;
            i += 18
        ) {

            ctx.beginPath();

            ctx.moveTo(i, 0);

            ctx.lineTo(
                i + h,
                h
            );

            ctx.stroke();
        }


        ctx.strokeStyle =
            'rgba(30,70,110,0.12)';


        for (
            let i = 0;
            i < w + h;
            i += 18
        ) {

            ctx.beginPath();

            ctx.moveTo(i, 0);

            ctx.lineTo(
                i - h,
                h
            );

            ctx.stroke();
        }


        // Blue dots

        ctx.fillStyle =
            'rgba(220,240,255,0.35)';


        for (
            let x = 30;
            x < w;
            x += 70
        ) {

            for (
                let y = 30;
                y < h;
                y += 70
            ) {

                ctx.beginPath();

                ctx.arc(
                    x,
                    y,
                    4,
                    0,
                    Math.PI * 2
                );

                ctx.fill();
            }
        }


        // Decorations

        drawBlueBow(
            ctx,
            145,
            120,
            1.2
        );


        ctx.font = '70px Arial';

        ctx.fillStyle = '#d9efff';

        ctx.fillText(
            '♡',
            w - 130,
            150
        );


        ctx.font = '75px Arial';

        ctx.fillText(
            '🦋',
            w - 150,
            h - 90
        );
    }


    // =========================
    // FILM STRIP
    // =========================

    else if (frameType === 'film-strip') {

        ctx.fillStyle = '#111111';

        ctx.fillRect(
            0,
            0,
            w,
            h
        );


        // Film texture

        ctx.fillStyle =
            'rgba(255,255,255,0.035)';


        for (
            let y = 0;
            y < h;
            y += 25
        ) {

            ctx.fillRect(
                0,
                y,
                w,
                2
            );
        }


        // Film holes

        ctx.fillStyle = '#ffffff';


        for (
            let y = 35;
            y < h;
            y += 100
        ) {

            ctx.fillRect(
                35,
                y,
                45,
                55
            );

            ctx.fillRect(
                w - 80,
                y,
                45,
                55
            );
        }


        // Cameras

        drawCameraSticker(
            ctx,
            w / 2,
            115,
            1
        );

        drawCameraSticker(
            ctx,
            w / 2,
            h - 115,
            0.85
        );


        ctx.fillStyle = '#ffffff';

        ctx.font = '55px Arial';

        ctx.fillText(
            '✦',
            110,
            170
        );

        ctx.fillText(
            '♡',
            w - 120,
            170
        );

        ctx.fillText(
            '✦',
            105,
            h - 170
        );

        ctx.fillText(
            '♡',
            w - 120,
            h - 170
        );
    }


    // =========================
    // CUTE PINK
    // =========================

    else if (frameType === 'cute-pink') {

        const grad =
            ctx.createLinearGradient(
                0,
                0,
                0,
                h
            );

        grad.addColorStop(
            0,
            '#fff5f8'
        );

        grad.addColorStop(
            0.5,
            '#ffdce8'
        );

        grad.addColorStop(
            1,
            '#f7bfd2'
        );

        ctx.fillStyle = grad;

        ctx.fillRect(
            0,
            0,
            w,
            h
        );


        // Grid

        ctx.strokeStyle =
            'rgba(255,255,255,0.5)';

        ctx.lineWidth = 2;


        for (
            let x = 0;
            x < w;
            x += 55
        ) {

            ctx.beginPath();

            ctx.moveTo(x, 0);

            ctx.lineTo(x, h);

            ctx.stroke();
        }


        for (
            let y = 0;
            y < h;
            y += 55
        ) {

            ctx.beginPath();

            ctx.moveTo(0, y);

            ctx.lineTo(w, y);

            ctx.stroke();
        }


        drawPinkBow(
            ctx,
            w - 150,
            120,
            1
        );


        drawFlower(
            ctx,
            110,
            h - 120,
            1.3,
            '#f6a9c5'
        );

        drawFlower(
            ctx,
            185,
            h - 100,
            0.9,
            '#ffd0df'
        );


        ctx.font = '60px Arial';

        ctx.fillStyle = '#ef91b3';

        ctx.fillText(
            '♡',
            90,
            180
        );

        ctx.fillText(
            '♡',
            w - 110,
            h - 250
        );
    }


    // =========================
    // UNIVERSE
    // =========================

    else if (frameType === 'universe') {

        const grad =
            ctx.createLinearGradient(
                0,
                0,
                w,
                h
            );

        grad.addColorStop(
            0,
            '#16052d'
        );

        grad.addColorStop(
            0.5,
            '#3b1261'
        );

        grad.addColorStop(
            1,
            '#16052d'
        );

        ctx.fillStyle = grad;

        ctx.fillRect(
            0,
            0,
            w,
            h
        );


        // Stars

        ctx.fillStyle =
            'rgba(255,255,255,0.9)';


        for (
            let i = 0;
            i < 150;
            i++
        ) {

            const x =
                Math.random() * w;

            const y =
                Math.random() * h;

            const r =
                Math.random() * 2.5 + 0.5;


            ctx.beginPath();

            ctx.arc(
                x,
                y,
                r,
                0,
                Math.PI * 2
            );

            ctx.fill();
        }


        // Sparkles

        ctx.fillStyle = '#ffd6f6';


        const sparkles = [
            [70, 180],
            [1130, 520],
            [70, 1250],
            [1130, 1900],
            [70, 2700],
            [1130, 3200]
        ];


        sparkles.forEach(
            ([x, y]) => {

                ctx.beginPath();

                ctx.moveTo(
                    x,
                    y - 25
                );

                ctx.lineTo(
                    x + 7,
                    y - 7
                );

                ctx.lineTo(
                    x + 25,
                    y
                );

                ctx.lineTo(
                    x + 7,
                    y + 7
                );

                ctx.lineTo(
                    x,
                    y + 25
                );

                ctx.lineTo(
                    x - 7,
                    y + 7
                );

                ctx.lineTo(
                    x - 25,
                    y
                );

                ctx.lineTo(
                    x - 7,
                    y - 7
                );

                ctx.closePath();

                ctx.fill();
            }
        );


        // Moon

        ctx.fillStyle = '#fff1c9';

        ctx.beginPath();

        ctx.arc(
            105,
            90,
            42,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle = '#3b1261';

        ctx.beginPath();

        ctx.arc(
            125,
            75,
            42,
            0,
            Math.PI * 2
        );

        ctx.fill();


        // Planet

        ctx.fillStyle = '#ff9ed8';

        ctx.beginPath();

        ctx.arc(
            1090,
            100,
            38,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.strokeStyle = '#ffd6f6';

        ctx.lineWidth = 8;

        ctx.beginPath();

        ctx.ellipse(
            1090,
            100,
            65,
            18,
            -0.2,
            0,
            Math.PI * 2
        );

        ctx.stroke();
    }
    else if (frameType === 'earth-girl') {
        // Dark chocolate plaid base inspired by the user's lace-and-polka-dot reference.
        ctx.fillStyle = '#35211c'; ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#4a3028'; ctx.fillRect(0, 0, w * 0.88, h);
        ctx.strokeStyle = 'rgba(215,190,160,0.16)'; ctx.lineWidth = 8;
        for (let x = 0; x < w * 0.88; x += 48) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        for (let y = 0; y < h; y += 48) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w * 0.88, y); ctx.stroke(); }
        ctx.strokeStyle = 'rgba(25,12,10,0.32)'; ctx.lineWidth = 18;
        for (let x = 18; x < w * 0.88; x += 96) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
        // Cream polka dots on the right panel.
        ctx.fillStyle = '#f2e5d0';
        for (let y = 24; y < h; y += 118) for (let x = w * 0.91; x < w; x += 92) { ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill(); }
        // Lace trim along the left edge.
        ctx.fillStyle = '#f5eee1'; ctx.fillRect(0, 0, 42, h);
        ctx.strokeStyle = '#e6dac7'; ctx.lineWidth = 5;
        for (let y = 0; y < h; y += 32) { ctx.beginPath(); ctx.arc(20, y, 14, -Math.PI / 2, Math.PI / 2); ctx.stroke(); }
        drawFlower(ctx, 108, 145, 0.72, '#d7c4a6');
        drawFlower(ctx, w * 0.78, h - 140, 0.78, '#e9d8bd');
        ctx.fillStyle = '#f4eadb'; ctx.font = 'bold 52px Arial'; ctx.textAlign = 'center';
        ctx.fillText('♡', w * 0.48, 125);
    }

}


// =========================
// PHOTO DECORATIONS
// =========================

function drawSlotDecorations(
    ctx,
    slot,
    frameType
) {

    ctx.save();


    // BLUE DENIM

    if (frameType === 'blue-denim') {

        ctx.strokeStyle = '#ffffff';

        ctx.lineWidth = 25;

        ctx.strokeRect(
            slot.x - 12,
            slot.y - 12,
            slot.w + 24,
            slot.h + 24
        );


        // Blue tape

        ctx.fillStyle =
            'rgba(190,225,250,0.9)';

        ctx.save();

        ctx.translate(
            slot.x + 120,
            slot.y - 5
        );

        ctx.rotate(-0.08);

        ctx.fillRect(
            -90,
            -22,
            180,
            44
        );

        ctx.restore();


        // Bow

        drawBlueBow(
            ctx,
            slot.x + slot.w - 55,
            slot.y + slot.h - 30,
            0.65
        );


        // Hearts

        ctx.font = '55px Arial';

        ctx.fillStyle = '#d8efff';

        ctx.fillText(
            '♡',
            slot.x + 20,
            slot.y + 65
        );

        ctx.fillText(
            '♡',
            slot.x + slot.w - 30,
            slot.y + 70
        );
    }


    // FILM STRIP

    else if (frameType === 'film-strip') {

        ctx.fillStyle = '#ffffff';


        for (
            let y = slot.y;
            y < slot.y + slot.h;
            y += 80
        ) {

            ctx.fillRect(
                40,
                y,
                40,
                50
            );

            ctx.fillRect(
                1120,
                y,
                40,
                50
            );
        }


        // Camera at photo corner

        drawCameraSticker(
            ctx,
            slot.x + slot.w - 55,
            slot.y + slot.h - 45,
            0.45
        );


        ctx.fillStyle = '#ffffff';

        ctx.font = '45px Arial';

        ctx.fillText(
            '✦',
            slot.x + 20,
            slot.y + 50
        );

        ctx.fillText(
            '♡',
            slot.x + slot.w - 20,
            slot.y + 55
        );
    }


    // CUTE PINK

    else if (frameType === 'cute-pink') {

        ctx.strokeStyle = '#ffffff';

        ctx.lineWidth = 20;

        ctx.strokeRect(
            slot.x - 10,
            slot.y - 10,
            slot.w + 20,
            slot.h + 20
        );


        // Tape

        ctx.fillStyle =
            'rgba(255,205,220,0.9)';

        ctx.save();

        ctx.translate(
            slot.x + 100,
            slot.y - 5
        );

        ctx.rotate(-0.06);

        ctx.fillRect(
            -85,
            -20,
            170,
            40
        );

        ctx.restore();


        // Dimensional flowers

        drawFlower(
            ctx,
            slot.x + slot.w - 50,
            slot.y + slot.h - 45,
            0.85,
            '#f5a9c4'
        );

        drawFlower(
            ctx,
            slot.x + slot.w - 5,
            slot.y + slot.h - 10,
            0.55,
            '#ffd0df'
        );


        ctx.fillStyle = '#ef91b3';

        ctx.font = '50px Arial';

        ctx.fillText(
            '♡',
            slot.x + 25,
            slot.y + 55
        );

        ctx.fillText(
            '♡',
            slot.x + slot.w - 25,
            slot.y + 65
        );
    }


    // UNIVERSE

    else if (frameType === 'universe') {

        ctx.strokeStyle = '#ffffff';

        ctx.lineWidth = 24;

        ctx.strokeRect(
            slot.x - 12,
            slot.y - 12,
            slot.w + 24,
            slot.h + 24
        );


        ctx.strokeStyle = '#ffb6df';

        ctx.lineWidth = 8;

        ctx.strokeRect(
            slot.x - 25,
            slot.y - 25,
            slot.w + 50,
            slot.h + 50
        );


        // Tape

        ctx.fillStyle =
            'rgba(255,220,245,0.85)';

        ctx.save();

        ctx.translate(
            slot.x + 120,
            slot.y - 5
        );

        ctx.rotate(-0.08);

        ctx.fillRect(
            -90,
            -22,
            180,
            44
        );

        ctx.restore();


        // Heart

        ctx.fillStyle = '#ff8dcc';

        ctx.font = '55px Arial';

        ctx.fillText(
            '♥',
            slot.x + slot.w - 45,
            slot.y + 55
        );


        // Sparkle

        ctx.fillStyle = '#ffffff';

        ctx.font = '45px Arial';

        ctx.fillText(
            '✦',
            slot.x + 20,
            slot.y + slot.h - 15
        );
    }


    else if (frameType === 'earth-girl') {
        // Cream lace-like frame: double border + scalloped loops on all four sides.
        const x = slot.x - 34, y = slot.y - 34, w = slot.w + 68, h = slot.h + 68;
        // IMPORTANT: keep the photo area transparent here. The previous fillRect
        // painted cream over the photo that had just been drawn, making every slot blank.
        // Draw only the lace/border outside the photo area.
        ctx.strokeStyle = '#d8cbb8'; ctx.lineWidth = 5; ctx.strokeRect(x + 12, y + 12, w - 24, h - 24);
        ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 8;
        const step = 30;
        for (let px = x + 10; px < x + w - 8; px += step) {
            ctx.beginPath(); ctx.arc(px, y + 13, 12, Math.PI, 0); ctx.stroke();
            ctx.beginPath(); ctx.arc(px, y + h - 13, 12, 0, Math.PI); ctx.stroke();
        }
        for (let py = y + 10; py < y + h - 8; py += step) {
            ctx.beginPath(); ctx.arc(x + 13, py, 12, -Math.PI / 2, Math.PI / 2); ctx.stroke();
            ctx.beginPath(); ctx.arc(x + w - 13, py, 12, Math.PI / 2, -Math.PI / 2); ctx.stroke();
        }
        ctx.fillStyle = '#f0e3cf';
        [[x+18,y+18],[x+w-18,y+18],[x+18,y+h-18],[x+w-18,y+h-18]].forEach(([cx,cy]) => { ctx.beginPath(); ctx.arc(cx,cy,20,0,Math.PI*2); ctx.fill(); });
        ctx.fillStyle = '#f4e6d3'; ctx.font = '70px Arial';
        ctx.fillText('❀', x + w - 4, y + h * 0.48);
        ctx.fillText('❀', x + 8, y + h - 4);
    }

    ctx.restore();
}


// =========================
// FRAME TEXT
// =========================

function drawFrameOverlays(
    ctx,
    w,
    h,
    frameType
) {

    ctx.textAlign = 'center';


    // BLUE DENIM

    if (frameType === 'blue-denim') {

        ctx.font = 'bold 75px Arial';

        ctx.fillStyle = '#e8f5ff';

        ctx.fillText(
            'BLUE DAYS ♡',
            w / 2,
            145
        );


        ctx.font = '45px Arial';

        ctx.fillStyle = '#d8efff';

        ctx.fillText(
            'better things ahead ✦',
            w / 2,
            h - 80
        );
    }


    // FILM STRIP

    else if (frameType === 'film-strip') {

        ctx.font = 'bold 65px Arial';

        ctx.fillStyle = '#ffffff';

        ctx.fillText(
            'MEMORIES ♡',
            w / 2,
            165
        );


        ctx.font = '35px Arial';

        ctx.fillText(
            'GOOD DAY :)',
            w / 2,
            h - 190
        );

        ctx.fillText(
            'KEEP GOING ✦',
            w / 2,
            h - 80
        );
    }


    // CUTE PINK

    else if (frameType === 'cute-pink') {

        ctx.font = 'bold 65px Arial';

        ctx.fillStyle = '#d96f98';

        ctx.fillText(
            'MY FAVORITE PERSON ♡',
            w / 2,
            150
        );


        ctx.font = '38px Arial';

        ctx.fillStyle = '#df789f';

        ctx.fillText(
            'you make everything brighter',
            w / 2,
            h - 75
        );
    }


    // UNIVERSE

    else if (frameType === 'universe') {

        ctx.font = 'bold 70px Arial';

        ctx.fillStyle = '#ffd6f6';

        ctx.fillText(
            'LOVE YOU',
            w / 2,
            135
        );


        ctx.font = 'italic 55px Arial';

        ctx.fillStyle = '#ffffff';

        ctx.fillText(
            'in every universe',
            w / 2,
            h - 150
        );


        ctx.font = '55px Arial';

        ctx.fillStyle = '#ff9ed8';

        ctx.fillText(
            '♥',
            90,
            350
        );

        ctx.fillText(
            '♥',
            w - 110,
            1150
        );

        ctx.fillText(
            '♥',
            85,
            2150
        );

        ctx.fillText(
            '♥',
            w - 110,
            3150
        );


        ctx.fillStyle = '#ffffff';

        ctx.font = '45px Arial';

        ctx.fillText(
            '✦',
            1050,
            350
        );

        ctx.fillText(
            '✧',
            100,
            1100
        );

        ctx.fillText(
            '✦',
            1050,
            2200
        );

        ctx.fillText(
            '✧',
            100,
            3100
        );


        ctx.font = 'bold 28px Arial';

        ctx.fillStyle =
            'rgba(255,255,255,0.75)';

        ctx.fillText(
            '♡ FOREVER ♡',
            150,
            1180
        );

        ctx.fillText(
            'STARS ALIGN ✦',
            w - 190,
            2180
        );
    }
    else if (frameType === 'earth-girl') {
        ctx.font = 'bold 76px Arial'; ctx.fillStyle = '#596247';
        ctx.fillText('EARTH GIRL', w / 2, 145);
        ctx.font = '42px Arial'; ctx.fillStyle = '#6d7654';
        ctx.fillText('soft days, wild heart ❧', w / 2, h - 75);
    }

}


// =========================
// DOWNLOAD
// =========================

function downloadPhoto() {

    const imgData =
        document.getElementById(
            'final-result-img'
        ).src;

    const link =
        document.createElement('a');

    link.download =
        `MyCutePhotobooth_${Date.now()}.jpg`;

    link.href = imgData;

    link.click();
}


// =========================
// RESET
// =========================

function resetSession() {

    stopCamera();

    state.photos = [null, null, null];

    state.currentSlot = 0;

    state.tempPhoto = null;

    state.currentFilter = 'original';

    const video =
        document.getElementById('camera-video');

    if (video) {
        video.style.filter = 'none';
    }
}