/**
 * VeritasEdu - Asosiy boshqaruvchi (Main Controller)
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Holatlar
    let isCameraActive = false;
    let isSessionActive = false;
    let sessionStartTime = null;
    let sessionTimerInterval = null;
    let sessionDurationSec = 0;
    let isDemoMode = false;

    // Modullar
    const audioAnalyzer = new AudioAnalyzer();
    const lieDetector = new LieDetector();
    const speechTranscriber = new SpeechTranscriber();
    const reportGenerator = new ReportGenerator();
    let polygraphVisualizer = null;

    // Emotsiya to'plami
    const emotionSum = {
        neutral: 0,
        happy: 0,
        fear: 0,
        surprised: 0,
        sad: 0,
        angry: 0,
        disgusted: 0
    };
    let emotionSampleCount = 0;
    let truthScoreSum = 0;
    let truthSampleCount = 0;

    // DOM Elementlari
    const video = document.getElementById('webcam');
    const overlayCanvas = document.getElementById('overlayCanvas');
    const overlayCtx = overlayCanvas.getContext('2d');

    const btnStartCamera = document.getElementById('btnStartCamera');
    const btnStartSession = document.getElementById('btnStartSession');
    const btnStopSession = document.getElementById('btnStopSession');
    const btnDemoMode = document.getElementById('btnDemoMode');

    const badgeAiStatus = document.getElementById('badgeAiStatus');
    const badgeCamStatus = document.getElementById('badgeCamStatus');
    const badgeMicStatus = document.getElementById('badgeMicStatus');

    const truthScoreVal = document.getElementById('truthScoreVal');
    const truthStatusBadge = document.getElementById('truthStatusBadge');
    const truthGaugeCircle = document.getElementById('truthGaugeCircle');

    const gazeStatusBadge = document.getElementById('gazeStatusBadge');
    const blinkRateVal = document.getElementById('blinkRateVal');
    const voiceStressVal = document.getElementById('voiceStressVal');
    const headStabilityVal = document.getElementById('headStabilityVal');

    const dominantEmotionEmoji = document.getElementById('dominantEmotionEmoji');
    const dominantEmotionName = document.getElementById('dominantEmotionName');
    const dominantEmotionScore = document.getElementById('dominantEmotionScore');

    const sessionTimerEl = document.getElementById('sessionTimer');
    const liveTranscriptEl = document.getElementById('liveTranscript');
    const matchedKeywordsEl = document.getElementById('matchedKeywords');

    // Poligraf vizualizatorini ishga tushirish
    polygraphVisualizer = new PolygraphVisualizer('polygraphCanvas');

    // Emotsiyalar tarjimasi va emodjilari
    const emotionMeta = {
        neutral:   { name: "Xotirjam (Neytral)", emoji: "😐", color: "#64748B" },
        happy:     { name: "Quvonch / Ishonch", emoji: "😊", color: "#10B981" },
        fear:      { name: "Xavotir / Hayajon", emoji: "😰", color: "#F59E0B" },
        surprised: { name: "Hayrat", emoji: "😲", color: "#3B82F6" },
        sad:       { name: "Qayg'u", emoji: "😢", color: "#6366F1" },
        angry:     { name: "Asabiylik / G'azab", emoji: "😠", color: "#EF4444" },
        disgusted: { name: "Noqulaylik / Norozilik", emoji: "😒", color: "#8B5CF6" }
    };

    // 1. AI Modellarini yuklash
    async function loadModels() {
        badgeAiStatus.innerText = "Modellar yuklanmoqda...";
        badgeAiStatus.className = "status-pill warning";

        try {
            // Avval lokal './models', agar bo'lmasa CDN orqali
            const modelPath = './models';
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
                faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
                faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
            ]);
            badgeAiStatus.innerText = "AI Modellar tayyor";
            badgeAiStatus.className = "status-pill success";
            return true;
        } catch (e) {
            console.warn("Lokal modeldan yuklashda xatolik, CDN orqali urinib ko'rilmoqda...", e);
            try {
                const cdnPath = 'https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@master/weights';
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(cdnPath),
                    faceapi.nets.faceLandmark68Net.loadFromUri(cdnPath),
                    faceapi.nets.faceExpressionNet.loadFromUri(cdnPath)
                ]);
                badgeAiStatus.innerText = "AI Modellar tayyor (CDN)";
                badgeAiStatus.className = "status-pill success";
                return true;
            } catch (cdnErr) {
                console.error("Modellarni yuklab bo'lmadi:", cdnErr);
                badgeAiStatus.innerText = "AI xatosi (Demo rejimi mavjud)";
                badgeAiStatus.className = "status-pill danger";
                return false;
            }
        }
    }

    // 2. Kamera va Mikrofonni yoqish
    async function startCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
                audio: true
            });
            video.srcObject = stream;
            await video.play();

            // Overlay canvas o'lchamini videoga tenglashtirish
            overlayCanvas.width = video.videoWidth || 640;
            overlayCanvas.height = video.videoHeight || 480;

            // Audio analizatorni ulash
            await audioAnalyzer.init(stream);

            isCameraActive = true;
            badgeCamStatus.innerText = "Kamera faol";
            badgeCamStatus.className = "status-pill success";
            badgeMicStatus.innerText = "Mikrofon faol";
            badgeMicStatus.className = "status-pill success";
            btnStartCamera.innerHTML = `<span>📹</span> Kamerani o'chirish`;

            btnStartSession.disabled = false;
        } catch (err) {
            console.error("Kamera/Mikrofonni yoqishda xatolik:", err);
            alert("Kameraga yoki mikrofonga ruxsat berilmadi! Iltimos, brauzer ruxsatini tekshiring yoki Demo rejimidan foydalaning.");
            badgeCamStatus.innerText = "Kamera xatosi";
            badgeCamStatus.className = "status-pill danger";
        }
    }

    function stopCamera() {
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(track => track.stop());
            video.srcObject = null;
        }
        audioAnalyzer.stop();
        isCameraActive = false;
        badgeCamStatus.innerText = "Kamera nofaol";
        badgeCamStatus.className = "status-pill inactive";
        badgeMicStatus.innerText = "Mikrofon nofaol";
        badgeMicStatus.className = "status-pill inactive";
        btnStartCamera.innerHTML = `<span>📹</span> Kamerani yoqish`;
        btnStartSession.disabled = true;
    }

    // 3. Nutq transkripsiyasi yangilanishi
    speechTranscriber.onTranscriptUpdate = (data) => {
        liveTranscriptEl.innerText = data.full + (data.interim ? ` [${data.interim}]` : '');

        // Mos kelgan kalit so'zlar
        if (data.matchedKeywords.length > 0) {
            matchedKeywordsEl.innerHTML = data.matchedKeywords
                .map(kw => `<span class="badge-tag">✓ ${kw}</span>`)
                .join(' ');
        }
    };

    // 4. Imtihon/Nutqni Boshlash
    btnStartSession.addEventListener('click', () => {
        if (!isCameraActive && !isDemoMode) {
            alert("Iltimos, avval kamerani yoqing yoki Demo rejimini bosing!");
            return;
        }

        const studentName = document.getElementById('inputStudentName').value.trim();
        const topic = document.getElementById('inputTopic').value.trim();
        const keywords = document.getElementById('inputKeywords').value.trim();

        if (!studentName) {
            alert("Iltimos, o'quvchi ism-familiyasini kiriting!");
            document.getElementById('inputStudentName').focus();
            return;
        }

        // Qayta sozlash
        lieDetector.reset();
        audioAnalyzer.reset();
        speechTranscriber.reset();
        speechTranscriber.setKeywords(keywords);
        speechTranscriber.start();

        Object.keys(emotionSum).forEach(k => emotionSum[k] = 0);
        emotionSampleCount = 0;
        truthScoreSum = 0;
        truthSampleCount = 0;

        isSessionActive = true;
        sessionStartTime = Date.now();
        sessionDurationSec = 0;

        btnStartSession.classList.add('hidden');
        btnStopSession.classList.remove('hidden');

        // Taymer
        clearInterval(sessionTimerInterval);
        sessionTimerInterval = setInterval(() => {
            sessionDurationSec = (Date.now() - sessionStartTime) / 1000;
            const m = Math.floor(sessionDurationSec / 60).toString().padStart(2, '0');
            const s = Math.floor(sessionDurationSec % 60).toString().padStart(2, '0');
            sessionTimerEl.innerText = `${m}:${s}`;
        }, 1000);
    });

    // 5. Nutqni Yakunlash va Hisobot Ko'rsatish
    btnStopSession.addEventListener('click', () => {
        isSessionActive = false;
        clearInterval(sessionTimerInterval);
        speechTranscriber.stop();

        btnStopSession.classList.add('hidden');
        btnStartSession.classList.remove('hidden');

        // Yakuniy statistikani hisoblash
        const truthAvg = truthSampleCount > 0 ? Math.round(truthScoreSum / truthSampleCount) : lieDetector.truthScore;
        const emotionAvgs = {};
        Object.keys(emotionSum).forEach(k => {
            emotionAvgs[k] = emotionSampleCount > 0 ? Math.round((emotionSum[k] / emotionSampleCount) * 100) : 0;
        });

        // Yetakchi emotsiya
        let dominantEmo = "Neytral";
        let maxVal = -1;
        Object.entries(emotionAvgs).forEach(([emo, val]) => {
            if (val > maxVal) { maxVal = val; dominantEmo = emo; }
        });
        const domMeta = emotionMeta[dominantEmo] || emotionMeta.neutral;

        // Bahoni aniqlash
        let gradeLetter = "A+";
        if (truthAvg < 50) gradeLetter = "F";
        else if (truthAvg < 70) gradeLetter = "C";
        else if (truthAvg < 85) gradeLetter = "B";

        const sessionData = {
            id: 'sess_' + Date.now(),
            studentName: document.getElementById('inputStudentName').value.trim(),
            studentClass: document.getElementById('inputStudentClass').value.trim(),
            topic: document.getElementById('inputTopic').value.trim(),
            durationSec: sessionDurationSec,
            truthScoreAvg: truthAvg,
            grade: gradeLetter,
            dominantEmotion: `${domMeta.emoji} ${domMeta.name}`,
            emotionAverages: emotionAvgs,
            suspiciousEvents: [...lieDetector.suspiciousEvents],
            speechData: {
                full: speechTranscriber.fullTranscript,
                wordCount: speechTranscriber.wordCount,
                wpm: speechTranscriber.wpm
            },
            lieDetectorData: lieDetector.getSnapshot(),
            history: { ...lieDetector.history },
            createdAt: new Date().toLocaleString('uz-UZ')
        };

        // O'qituvchi jurnaliga avtomatik saqlash
        saveToGradebook(sessionData);

        // Hisobotni ochish
        reportGenerator.generate(sessionData);
    });

    // 6. Asosiy AI Aniqlash Sikli (Real-Time Render Loop)
    async function processFrame() {
        if (isCameraActive && video.readyState === 4) {
            overlayCanvas.width = video.videoWidth;
            overlayCanvas.height = video.videoHeight;
            overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);

            // Audio ma'lumotlarini olish
            const audioData = audioAnalyzer.update();

            // Yuz va Emotsiyalarni aniqlash
            let detection = null;
            try {
                detection = await faceapi
                    .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceExpressions();
            } catch (err) {}

            if (detection) {
                // 1. Overlayda yuz to'ri va ramkani chizish
                drawFaceOverlay(detection);

                // 2. Emotsiyalarni yangilash
                updateEmotionUI(detection.expressions);

                // 3. Yolg'on/Rost tahlili
                const lieData = lieDetector.analyze(detection, audioData, sessionDurationSec);
                updateLieDetectorUI(lieData, audioData);

                // Sessiya bo'yicha to'plash
                if (isSessionActive) {
                    truthScoreSum += lieData.truthScore;
                    truthSampleCount++;

                    Object.keys(detection.expressions).forEach(emo => {
                        if (emotionSum[emo] !== undefined) {
                            emotionSum[emo] += detection.expressions[emo];
                        }
                    });
                    emotionSampleCount++;
                }

                // Poligraf to'lqinini yangilash
                polygraphVisualizer.updateData(
                    lieData.stressLevel,
                    lieData.status === 'deception',
                    audioData.isSpeaking
                );
            } else {
                // Yuz aniqlanmadi
                const lieData = lieDetector.analyze(null, audioData, sessionDurationSec);
                updateLieDetectorUI(lieData, audioData);
            }
        } else if (isDemoMode) {
            // Demo rejim simulyatsiyasi
            runDemoSimulation();
        }

        // Har kadrda poligraf to'lqinini chizish
        polygraphVisualizer.draw();

        requestAnimationFrame(processFrame);
    }

    // Yuz konturi, nuqtalar va mimika vizualizatsiyasi
    function drawFaceOverlay(detection) {
        const { x, y, width, height } = detection.detection.box;
        const expressions = detection.expressions;

        // Yetakchi emotsiya
        let maxEmo = 'neutral';
        let maxVal = 0;
        Object.entries(expressions).forEach(([k, v]) => {
            if (v > maxVal) { maxVal = v; maxEmo = k; }
        });
        const meta = emotionMeta[maxEmo] || emotionMeta.neutral;

        // 1. Cyberpunk burchakli ramka
        overlayCtx.save();
        overlayCtx.strokeStyle = meta.color;
        overlayCtx.lineWidth = 2.5;
        overlayCtx.shadowColor = meta.color;
        overlayCtx.shadowBlur = 8;

        const cornerLen = 22;
        // Top-Left
        overlayCtx.beginPath();
        overlayCtx.moveTo(x, y + cornerLen); overlayCtx.lineTo(x, y); overlayCtx.lineTo(x + cornerLen, y);
        overlayCtx.stroke();
        // Top-Right
        overlayCtx.beginPath();
        overlayCtx.moveTo(x + width - cornerLen, y); overlayCtx.lineTo(x + width, y); overlayCtx.lineTo(x + width, y + cornerLen);
        overlayCtx.stroke();
        // Bottom-Left
        overlayCtx.beginPath();
        overlayCtx.moveTo(x, y + height - cornerLen); overlayCtx.lineTo(x, y + height); overlayCtx.lineTo(x + cornerLen, y + height);
        overlayCtx.stroke();
        // Bottom-Right
        overlayCtx.beginPath();
        overlayCtx.moveTo(x + width - cornerLen, y + height); overlayCtx.lineTo(x + width, y + height); overlayCtx.lineTo(x + width, y + height - cornerLen);
        overlayCtx.stroke();

        // 2. Yuz ustidagi emotsiya tegi
        const tagText = `${meta.emoji} ${meta.name} (${Math.round(maxVal * 100)}%)`;
        overlayCtx.font = "bold 14px Inter, sans-serif";
        const textWidth = overlayCtx.measureText(tagText).width;

        overlayCtx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        overlayCtx.beginPath();
        overlayCtx.roundRect(x, y - 32, textWidth + 18, 26, 6);
        overlayCtx.fill();

        overlayCtx.fillStyle = meta.color;
        overlayCtx.fillText(tagText, x + 9, y - 14);

        // 3. Ko'zlar va Burun nuqtalari
        const landmarks = detection.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();

        overlayCtx.fillStyle = '#38BDF8';
        [...leftEye, ...rightEye].forEach(pt => {
            overlayCtx.beginPath();
            overlayCtx.arc(pt.x, pt.y, 2, 0, Math.PI * 2);
            overlayCtx.fill();
        });

        overlayCtx.restore();
    }

    // Emotsiyalar UI panelini yangilash
    function updateEmotionUI(expressions) {
        let maxEmo = 'neutral';
        let maxVal = 0;

        Object.entries(expressions).forEach(([emo, val]) => {
            if (val > maxVal) {
                maxVal = val;
                maxEmo = emo;
            }
            const bar = document.getElementById(`bar-${emo}`);
            const pct = document.getElementById(`pct-${emo}`);
            if (bar && pct) {
                const percent = Math.round(val * 100);
                bar.style.width = `${percent}%`;
                pct.innerText = `${percent}%`;
            }
        });

        const meta = emotionMeta[maxEmo] || emotionMeta.neutral;
        dominantEmotionEmoji.innerText = meta.emoji;
        dominantEmotionName.innerText = meta.name;
        dominantEmotionScore.innerText = `${Math.round(maxVal * 100)}%`;
        dominantEmotionScore.style.color = meta.color;
    }

    // Yolg'on/Rostlik UI panelini yangilash
    function updateLieDetectorUI(lieData, audioData) {
        // 1. Spidometr / Aylanma hisoblagich (StrokeDashoffset: 283)
        const score = lieData.truthScore;
        truthScoreVal.innerText = `${score}%`;
        const offset = 283 - (283 * score) / 100;
        truthGaugeCircle.style.strokeDashoffset = offset;
        truthGaugeCircle.style.stroke = lieData.color;

        // Holat tegi
        truthStatusBadge.innerText = lieData.labelUz;
        truthStatusBadge.style.backgroundColor = `${lieData.color}22`;
        truthStatusBadge.style.color = lieData.color;
        truthStatusBadge.style.borderColor = lieData.color;

        // 2. Ko'z holati
        if (lieData.isLookingAtCheatSheet) {
            gazeStatusBadge.innerText = "🚨 Pastga qaradi (Shpargalka!)";
            gazeStatusBadge.className = "badge danger";
        } else if (lieData.gazeStatus === 'left' || lieData.gazeStatus === 'right') {
            gazeStatusBadge.innerText = "⚠️ Chetga qaradi (Ikkilanish)";
            gazeStatusBadge.className = "badge warning";
        } else if (lieData.gazeStatus === 'away') {
            gazeStatusBadge.innerText = "❌ Yuz ko'rinmayapti";
            gazeStatusBadge.className = "badge danger";
        } else {
            gazeStatusBadge.innerText = "✓ Markazda (Kamerada)";
            gazeStatusBadge.className = "badge success";
        }

        // 3. Miltillash tezligi
        blinkRateVal.innerText = `${lieData.blinksPerMinute} / daq`;
        if (lieData.blinksPerMinute > 38) {
            blinkRateVal.style.color = '#EF4444';
        } else {
            blinkRateVal.style.color = '#10B981';
        }

        // 4. Ovoz zo'riqishi
        const voiceStress = audioData ? audioData.stressLevel : 0;
        voiceStressVal.innerText = `${voiceStress}%`;
        voiceStressVal.style.color = voiceStress > 60 ? '#EF4444' : (voiceStress > 35 ? '#F59E0B' : '#10B981');

        // 5. Bosh barqarorligi
        const headScore = lieData.headMovementScore || 0;
        headStabilityVal.innerText = headScore > 40 ? "Harakatchan (Hayajon)" : "Barqaror";
        headStabilityVal.style.color = headScore > 40 ? '#F59E0B' : '#10B981';
    }

    // Demo / Sinov Rejimi (Kamerasiz test qilish uchun)
    btnDemoMode.addEventListener('click', () => {
        isDemoMode = !isDemoMode;
        if (isDemoMode) {
            btnDemoMode.innerText = "Demo rejimini to'xtatish";
            btnDemoMode.classList.add('active');
            btnStartSession.disabled = false;
            badgeCamStatus.innerText = "Demo simulyator";
            badgeCamStatus.className = "status-pill warning";
            badgeMicStatus.innerText = "Audio simulyator";
            badgeMicStatus.className = "status-pill warning";
        } else {
            btnDemoMode.innerText = "🎭 Demo rejimda sinash";
            btnDemoMode.classList.remove('active');
            btnStartSession.disabled = !isCameraActive;
            badgeCamStatus.innerText = "Kamera nofaol";
            badgeCamStatus.className = "status-pill inactive";
            badgeMicStatus.innerText = "Mikrofon nofaol";
            badgeMicStatus.className = "status-pill inactive";
        }
    });

    let demoAngle = 0;
    function runDemoSimulation() {
        demoAngle += 0.03;
        // Sun'iy ravishda to'lqinlanuvchi emotsiyalar va rostlik qiymatlari
        const simulatedHappy = Math.max(0, 0.4 + Math.sin(demoAngle) * 0.4);
        const simulatedNeutral = Math.max(0, 0.5 - Math.sin(demoAngle) * 0.2);
        const simulatedFear = Math.max(0, 0.15 + Math.cos(demoAngle * 1.5) * 0.2);

        const expressions = {
            neutral: simulatedNeutral,
            happy: simulatedHappy,
            fear: simulatedFear,
            surprised: 0.05,
            sad: 0.03,
            angry: 0.02,
            disgusted: 0.01
        };

        const simulatedTruth = Math.round(75 + Math.sin(demoAngle * 0.7) * 20);
        const isCheat = Math.sin(demoAngle * 1.2) > 0.85;

        const lieData = {
            truthScore: simulatedTruth,
            stressLevel: 100 - simulatedTruth,
            status: simulatedTruth > 75 ? 'truth' : (simulatedTruth > 50 ? 'hesitation' : 'deception'),
            labelUz: simulatedTruth > 75 ? "ROST VA ISHONCHLI" : (simulatedTruth > 50 ? "IKKILANISH / HAYAJON" : "YOLG'ON / SHUBHALI"),
            color: simulatedTruth > 75 ? "#10B981" : (simulatedTruth > 50 ? "#F59E0B" : "#EF4444"),
            blinksPerMinute: Math.round(18 + Math.sin(demoAngle) * 8),
            gazeStatus: isCheat ? 'down' : 'center',
            isLookingAtCheatSheet: isCheat,
            headMovementScore: Math.round(15 + Math.cos(demoAngle) * 10)
        };

        updateEmotionUI(expressions);
        updateLieDetectorUI(lieData, { stressLevel: 100 - simulatedTruth, isSpeaking: true });
        polygraphVisualizer.updateData(lieData.stressLevel, isCheat, true);

        // Demo vaqtida canvasga chiroyli animatsiya chizish
        overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        overlayCtx.save();
        overlayCtx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        overlayCtx.font = '16px Inter, sans-serif';
        overlayCtx.fillText('🎭 Demo rejim simulyatsiyasi faol', 20, 35);
        overlayCtx.restore();

        if (isSessionActive) {
            truthScoreSum += simulatedTruth;
            truthSampleCount++;
            Object.keys(expressions).forEach(k => emotionSum[k] += expressions[k]);
            emotionSampleCount++;
        }
    }

    // Kamera tugmasi hodisasi
    btnStartCamera.addEventListener('click', () => {
        if (isCameraActive) {
            stopCamera();
        } else {
            startCamera();
        }
    });

    // Modalni yopish
    document.getElementById('btnCloseReport').addEventListener('click', () => {
        document.getElementById('reportModal').classList.remove('active');
    });

    // Chop etish / PDF
    document.getElementById('btnPrintReport').addEventListener('click', () => {
        window.print();
    });

    // JSON eksport
    document.getElementById('btnExportJson').addEventListener('click', () => {
        const studentName = document.getElementById('repStudentName').innerText;
        const data = {
            student: studentName,
            topic: document.getElementById('repTopic').innerText,
            date: document.getElementById('repDate').innerText,
            truthScore: document.getElementById('repTruthScore').innerText,
            grade: document.getElementById('repGrade').innerText,
            transcript: document.getElementById('repTranscript').innerText
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VeritasEdu_${studentName.replace(/\s+/g, '_')}_Hisobot.json`;
        a.click();
        URL.revokeObjectURL(url);
    });

    // Mavzuni tezkor tanlash (Presets)
    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('inputTopic').value = btn.dataset.topic;
            document.getElementById('inputKeywords').value = btn.dataset.keywords;
        });
    });

    // =========================================================================
    // O'QITUVCHI JURNALI (GRADEBOOK) BOSHQARUVI
    // =========================================================================
    const btnOpenGradebook = document.getElementById('btnOpenGradebook');
    const btnCloseGradebook = document.getElementById('btnCloseGradebook');
    const btnCloseGradebookFooter = document.getElementById('btnCloseGradebookFooter');
    const gradebookModal = document.getElementById('gradebookModal');
    const gradebookTableBody = document.getElementById('gradebookTableBody');
    const gradebookCountEl = document.getElementById('gradebookCount');
    const inputGradeSearch = document.getElementById('inputGradeSearch');
    const btnExportExcel = document.getElementById('btnExportExcel');
    const btnClearGradebook = document.getElementById('btnClearGradebook');

    function getGradebook() {
        try {
            return JSON.parse(localStorage.getItem('veritas_gradebook')) || [];
        } catch (e) {
            return [];
        }
    }

    function saveToGradebook(session) {
        const list = getGradebook();
        list.unshift(session); // Yangi natijani boshiga qo'shish
        localStorage.setItem('veritas_gradebook', JSON.stringify(list));
        updateGradebookCount();
    }

    function updateGradebookCount() {
        const list = getGradebook();
        if (gradebookCountEl) gradebookCountEl.innerText = list.length;
    }

    function renderGradebook(filterText = '') {
        const list = getGradebook();
        gradebookTableBody.innerHTML = '';

        const query = filterText.toLowerCase();
        const filtered = list.filter(item => 
            (item.studentName && item.studentName.toLowerCase().includes(query)) ||
            (item.studentClass && item.studentClass.toLowerCase().includes(query)) ||
            (item.topic && item.topic.toLowerCase().includes(query))
        );

        if (filtered.length === 0) {
            gradebookTableBody.innerHTML = `
                <tr>
                    <td colspan="10" style="text-align:center; padding: 28px; color: var(--text-muted);">
                        ${list.length === 0 ? "Jurnal hozircha bo'sh. O'quvchilar nutqi yakunlangach, natijalar shu yerda ko'rinadi." : "Qidiruv bo'yicha hech qanday natija topilmadi."}
                    </td>
                </tr>
            `;
            return;
        }

        filtered.forEach((item, idx) => {
            const tr = document.createElement('tr');
            const gradeClass = item.grade ? item.grade.charAt(0) : 'A';
            const cheatCount = item.suspiciousEvents ? item.suspiciousEvents.length : 0;
            const cheatBadge = cheatCount > 0 
                ? `<span style="color: var(--color-red); font-weight: 600;">⚠️ ${cheatCount} ta</span>`
                : `<span style="color: var(--color-green);">✓ Yo'q</span>`;

            tr.innerHTML = `
                <td style="color: var(--text-muted);">${idx + 1}</td>
                <td><strong>${item.studentName || "Noma'lum"}</strong></td>
                <td><span class="badge-tag">${item.studentClass || "-"}</span></td>
                <td style="max-width: 180px; overflow: hidden; text-overflow: ellipsis;">${item.topic || "-"}</td>
                <td style="color: var(--text-muted); font-size: 11px;">${item.createdAt || "-"}</td>
                <td><strong style="color: ${item.truthScoreAvg >= 75 ? 'var(--color-green)' : (item.truthScoreAvg >= 50 ? 'var(--color-yellow)' : 'var(--color-red)')};">${item.truthScoreAvg}%</strong></td>
                <td><span class="grade-pill ${gradeClass}">${item.grade}</span></td>
                <td>${item.dominantEmotion || "-"}</td>
                <td>${cheatBadge}</td>
                <td style="text-align: center;">
                    <button class="action-btn-sm btn-view-report" data-id="${item.id}">👁️ Ko'rish</button>
                    <button class="action-btn-sm delete btn-del-report" data-id="${item.id}" style="margin-left: 4px;">🗑️</button>
                </td>
            `;
            gradebookTableBody.appendChild(tr);
        });

        // Ko'rish tugmalari
        document.querySelectorAll('.btn-view-report').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.id;
                const found = getGradebook().find(i => i.id === id);
                if (found) {
                    gradebookModal.classList.remove('active');
                    reportGenerator.generate(found);
                }
            });
        });

        // O'chirish tugmalari
        document.querySelectorAll('.btn-del-report').forEach(btn => {
            btn.addEventListener('click', () => {
                if (confirm("Haqiqatan ham bu o'quvchi natijasini o'chirmoqchimisiz?")) {
                    const id = btn.dataset.id;
                    const updated = getGradebook().filter(i => i.id !== id);
                    localStorage.setItem('veritas_gradebook', JSON.stringify(updated));
                    updateGradebookCount();
                    renderGradebook(inputGradeSearch.value);
                }
            });
        });
    }

    // Modalni ochish / yopish
    btnOpenGradebook.addEventListener('click', () => {
        renderGradebook(inputGradeSearch.value);
        gradebookModal.classList.add('active');
    });

    btnCloseGradebook.addEventListener('click', () => {
        gradebookModal.classList.remove('active');
    });

    btnCloseGradebookFooter.addEventListener('click', () => {
        gradebookModal.classList.remove('active');
    });

    inputGradeSearch.addEventListener('input', (e) => {
        renderGradebook(e.target.value);
    });

    btnClearGradebook.addEventListener('click', () => {
        if (confirm("Butun o'qituvchi jurnalini tozalashni xohlaysizmi? Barcha o'quvchilar natijalari o'chib ketadi.")) {
            localStorage.removeItem('veritas_gradebook');
            updateGradebookCount();
            renderGradebook();
        }
    });

    // Excel (CSV) ga eksport qilish
    btnExportExcel.addEventListener('click', () => {
        const list = getGradebook();
        if (list.length === 0) {
            alert("Jurnalda saqlangan ma'lumotlar yo'q!");
            return;
        }

        // CSV sarlavhalari (O'zbek tilidagi harflar to'g'ri chiqishi uchun UTF-8 BOM qo'shiladi)
        let csvContent = "\uFEFF";
        csvContent += "№,O'quvchi Ism-Familiyasi,Sinf/Guruh,Mavzu,Sana va Vaqt,Samimiylik (%),Baho,Yetakchi Emotsiya,Shpargalka Qaydlar Soni,Davomiyligi (soniya)\n";

        list.forEach((item, idx) => {
            const clean = (str) => `"${(str || '').toString().replace(/"/g, '""')}"`;
            const row = [
                idx + 1,
                clean(item.studentName),
                clean(item.studentClass),
                clean(item.topic),
                clean(item.createdAt),
                item.truthScoreAvg,
                clean(item.grade),
                clean(item.dominantEmotion),
                item.suspiciousEvents ? item.suspiciousEvents.length : 0,
                Math.round(item.durationSec || 0)
            ];
            csvContent += row.join(",") + "\n";
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().slice(0, 10);
        a.download = `Oqituvchi_Jurnali_${dateStr}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    });

    updateGradebookCount();

    // Ishga tushirish
    await loadModels();
    requestAnimationFrame(processFrame);
});
