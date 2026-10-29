/**
 * LieDetector - Ko'z harakati, pirpirash, bosh holati, ovoz stressi va
 * emotsional nomutanosiblik orqali yolg'on/rostlikni tahlil qiluvchi ko'p faktorli detektor.
 */
class LieDetector {
    constructor() {
        this.reset();
    }

    reset() {
        this.truthScore = 95;           // 0..100% (Boshlang'ich samimiylik ko'rsatkichi)
        this.deceptionProbability = 5;  // 0..100%
        this.stressLevel = 10;          // 0..100%

        // Ko'z pirpirashi (Blink tracking)
        this.blinkCount = 0;
        this.isEyeClosed = false;
        this.blinkTimestamps = [];
        this.blinksPerMinute = 15;

        // Ko'z qochishi (Gaze aversion)
        this.gazeShiftCount = 0;
        this.consecutiveGazeAway = 0;
        this.gazeStatus = 'center';     // 'center', 'left', 'right', 'down' (shpargalka)
        this.isLookingAtCheatSheet = false;

        // Bosh turg'unligi (Head jitter)
        this.lastHeadPos = null;
        this.headMovementScore = 0;

        // Anomaliyalar / Shubhali holatlar tarixi
        this.suspiciousEvents = [];
        this.startTime = Date.now();
        this.lastEventTime = 0;

        // Vaqt bo'yicha tarix (Grafiklar uchun)
        this.history = {
            timestamps: [],
            truthScores: [],
            stressScores: [],
            emotions: []
        };
    }

    // 68 nuqtadan Eye Aspect Ratio (EAR) hisoblash
    calculateEAR(eyePoints) {
        // eyePoints: [p0, p1, p2, p3, p4, p5]
        const dist = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
        const vertical1 = dist(eyePoints[1], eyePoints[5]);
        const vertical2 = dist(eyePoints[2], eyePoints[4]);
        const horizontal = dist(eyePoints[0], eyePoints[3]);
        if (horizontal === 0) return 0.3;
        return (vertical1 + vertical2) / (2.0 * horizontal);
    }

    // Ko'z qorachig'i va yo'nalishini taxmin qilish
    estimateGaze(landmarks) {
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const nose = landmarks.getNose();

        // Burun uchi va ko'zlar markazi
        const noseTip = nose[3]; // Burun uchi
        const leftEyeCenter = leftEye[0];
        const rightEyeCenter = rightEye[3];
        const eyeMidX = (leftEyeCenter.x + rightEyeCenter.x) / 2;
        const eyeMidY = (leftEyeCenter.y + rightEyeCenter.y) / 2;

        // Gorizontal va vertikal siljish
        const dx = (noseTip.x - eyeMidX);
        const dy = (noseTip.y - eyeMidY);

        let direction = 'center';
        let lookingDown = false;

        // Agar bosh yoki nigoh pastga qaratilgan bo'lsa (Shpargalka o'qish)
        if (dy > 38) {
            direction = 'down';
            lookingDown = true;
        } else if (dx < -12) {
            direction = 'right';
        } else if (dx > 12) {
            direction = 'left';
        }

        return { direction, lookingDown, dx, dy };
    }

    /**
     * Har bir kadrda tahlil qilish
     * @param {Object} detection - face-api.js natijasi (landmarks, expressions)
     * @param {Object} audioData - AudioAnalyzer natijasi
     * @param {number} sessionDurationSec - imtihon boshlangandan buyon o'tgan soniya
     */
    analyze(detection, audioData, sessionDurationSec) {
        const now = Date.now();
        let instantPenalty = 0;

        if (!detection) {
            // Yuz topilmadi (kameraga qaramadi)
            this.gazeStatus = 'away';
            this.consecutiveGazeAway++;
            if (this.consecutiveGazeAway > 30) {
                instantPenalty += 40;
                this.recordEvent(sessionDurationSec, "O'quvchi yuzi kamerada ko'rinmayapti / chetga butunlay burildi", "high");
            }
            return this.getSnapshot();
        }

        const landmarks = detection.landmarks;
        const expressions = detection.expressions;

        // 1. Ko'z pirpirashi (EAR)
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const leftEAR = this.calculateEAR(leftEye);
        const rightEAR = this.calculateEAR(rightEye);
        const avgEAR = (leftEAR + rightEAR) / 2;

        // Qovoq yumilishi chegarasi: ~0.21
        if (avgEAR < 0.22) {
            if (!this.isEyeClosed) {
                this.isEyeClosed = true;
                this.blinkCount++;
                this.blinkTimestamps.push(now);
            }
        } else {
            this.isEyeClosed = false;
        }

        // Oxirgi 60 soniyadagi pirpirash tezligi
        this.blinkTimestamps = this.blinkTimestamps.filter(t => now - t <= 60000);
        const windowSec = Math.max(1, Math.min(60, (now - this.startTime) / 1000));
        this.blinksPerMinute = Math.round((this.blinkTimestamps.length / windowSec) * 60);

        // Pirpirash anomaliyasi jarimasi (Norma: 12..28 / daqiqada)
        if (this.blinksPerMinute > 38) {
            instantPenalty += 15; // Yuqori asabiylik
            if (now - this.lastEventTime > 8000) {
                this.recordEvent(sessionDurationSec, "Haddan tashqari tez ko'z pirpirashi (Yuqori hayajon yoki aldash harakati)", "medium");
            }
        } else if (this.blinksPerMinute < 6 && windowSec > 15) {
            instantPenalty += 10; // Qotib qolish (Sun'iy diqqat / to'qib chiqarish)
        }

        // 2. Ko'z qochishi va shpargalka tekshiruvi (Gaze)
        const gaze = this.estimateGaze(landmarks);
        this.gazeStatus = gaze.direction;

        if (gaze.lookingDown) {
            this.isLookingAtCheatSheet = true;
            this.consecutiveGazeAway++;
            instantPenalty += 30; // Katta jarima
            if (this.consecutiveGazeAway > 40 && now - this.lastEventTime > 6000) {
                this.recordEvent(sessionDurationSec, "Shpargalkaga qarash ehtimoli yuqori (Nigoh uzoq vaqt pastga qaratildi)", "high");
            }
        } else if (gaze.direction === 'left' || gaze.direction === 'right') {
            this.isLookingAtCheatSheet = false;
            this.consecutiveGazeAway++;
            this.gazeShiftCount++;
            instantPenalty += 12;
            if (this.consecutiveGazeAway > 45 && now - this.lastEventTime > 7000) {
                this.recordEvent(sessionDurationSec, "Ko'z chetga qaratildi (Kamera bilan vizual aloqa uzildi)", "medium");
            }
        } else {
            this.isLookingAtCheatSheet = false;
            this.consecutiveGazeAway = Math.max(0, this.consecutiveGazeAway - 2);
        }

        // 3. Boshning asabiy tebranishi (Head Stability)
        const noseTip = landmarks.getNose()[3];
        if (this.lastHeadPos) {
            const headDist = Math.hypot(noseTip.x - this.lastHeadPos.x, noseTip.y - this.lastHeadPos.y);
            this.headMovementScore = Math.min(100, Math.round(headDist * 5));
            if (this.headMovementScore > 45) {
                instantPenalty += 10;
            }
        }
        this.lastHeadPos = { x: noseTip.x, y: noseTip.y };

        // 4. Ovoz zo'riqishi (Audio Stress)
        if (audioData) {
            if (audioData.stressLevel > 60) {
                instantPenalty += 15;
                if (now - this.lastEventTime > 8000) {
                    this.recordEvent(sessionDurationSec, "Ovozda yuqori zo'riqish va mikrotitroqlar aniqlandi", "medium");
                }
            }
            if (audioData.pauseCount > 4 && now - this.lastEventTime > 10000) {
                instantPenalty += 8;
                this.recordEvent(sessionDurationSec, "Nutqda noodatiy uzoq to'xtalishlar (Mavzuni unutish yoki to'qish)", "low");
            }
        }

        // 5. Emotsional nomutanosiblik (Micro-expressions)
        // Qo'rquv (fear) yoki xavotir
        const fear = expressions.fear || 0;
        const disgust = expressions.disgusted || 0;
        const angry = expressions.angry || 0;
        const happy = expressions.happy || 0;

        const negativeStressEmotions = (fear * 0.5 + disgust * 0.3 + angry * 0.2);
        if (negativeStressEmotions > 0.4) {
            instantPenalty += Math.round(negativeStressEmotions * 25);
            if (fear > 0.5 && now - this.lastEventTime > 8000) {
                this.recordEvent(sessionDurationSec, "Yuzda qo'rquv/xavotir mikro-mimikasi paydo bo'ldi", "medium");
            }
        }

        // 6. Umumiy Samimiylik / Rostlik ballini hisoblash (Smoothing EMA)
        const instantTruth = Math.max(0, 100 - instantPenalty);
        // Exponential Moving Average (EMA)
        this.truthScore = Math.round(this.truthScore * 0.92 + instantTruth * 0.08);
        this.truthScore = Math.max(5, Math.min(99, this.truthScore));

        this.deceptionProbability = 100 - this.truthScore;
        this.stressLevel = Math.round((instantPenalty * 1.5) + (audioData ? audioData.stressLevel * 0.3 : 0));
        this.stressLevel = Math.max(5, Math.min(98, this.stressLevel));

        // Tarixga yozish
        if (sessionDurationSec > 0 && Math.floor(sessionDurationSec) % 2 === 0) {
            if (!this.history.timestamps.includes(sessionDurationSec)) {
                this.history.timestamps.push(sessionDurationSec);
                this.history.truthScores.push(this.truthScore);
                this.history.stressScores.push(this.stressLevel);
            }
        }

        return this.getSnapshot();
    }

    recordEvent(sessionSec, description, severity) {
        const now = Date.now();
        this.lastEventTime = now;
        const minutes = Math.floor(sessionSec / 60).toString().padStart(2, '0');
        const seconds = Math.floor(sessionSec % 60).toString().padStart(2, '0');
        const timeStr = `${minutes}:${seconds}`;

        this.suspiciousEvents.push({
            time: timeStr,
            description,
            severity, // 'low', 'medium', 'high'
            truthScore: this.truthScore
        });
    }

    getSnapshot() {
        // Holat tavsifi
        let status = 'truth';
        let labelUz = "ROST VA ISHONCHLI";
        let color = '#10B981'; // Green

        if (this.truthScore < 50) {
            status = 'deception';
            labelUz = "YOLG'ON / SHUBHALI";
            color = '#EF4444'; // Red
        } else if (this.truthScore < 75) {
            status = 'hesitation';
            labelUz = "IKKILANISH / HAYAJON";
            color = '#F59E0B'; // Yellow/Amber
        }

        return {
            truthScore: this.truthScore,
            deceptionProbability: this.deceptionProbability,
            stressLevel: this.stressLevel,
            status,
            labelUz,
            color,
            blinksPerMinute: this.blinksPerMinute,
            blinkCount: this.blinkCount,
            gazeStatus: this.gazeStatus,
            isLookingAtCheatSheet: this.isLookingAtCheatSheet,
            headMovementScore: this.headMovementScore,
            suspiciousEvents: this.suspiciousEvents
        };
    }
}

window.LieDetector = LieDetector;
