// =========================
// STATE MANAGEMENT
// =========================

const state = {
    selectedFrame: null,
    currentSlot: 0,
    photos: [null, null, null],
    currentFilter: 'original',
    stream: null,
    tempPhoto: null
};

const filterStyles = {
    original: 'none',
    'soft-pink': 'sepia(0.2) saturate(1.2) hue-rotate(330deg) brightness(1.05)',
    dreamy: 'blur(0.5px) brightness(1.1) contrast(0.9) saturate(1.3)',
    vintage: 'sepia(0.5) contrast(1.1) brightness(0.9)',
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

    if (video) {
        video.srcObject = null;
    }
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