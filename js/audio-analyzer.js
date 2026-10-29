/**
 * AudioAnalyzer - O'quvchining ovoz zo'riqishi, balandligi va mikrotitroqlarini tahlil qiluvchi modul.
 * Web Audio API orqali mikrofon signalini real-time FFT (Fast Fourier Transform) bilan tahlil qiladi.
 */
class AudioAnalyzer {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.dataArray = null;
        this.isListening = false;

        // Ovoz parametrlari
        this.volume = 0;           // 0..100
        this.pitchJitter = 0;      // 0..100 (titroq/hayajon)
        this.stressLevel = 0;      // 0..100
        this.isSpeaking = false;
        this.speechSilenceTimer = 0;
        this.pauseCount = 0;
        this.lastVolumeHistory = [];
        this.historyLength = 30;
    }

    async init(stream) {
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.audioContext = new AudioCtx();

            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }

            this.source = this.audioContext.createMediaStreamSource(stream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 1024;
            this.analyser.smoothingTimeConstant = 0.8;

            this.source.connect(this.analyser);
            this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
            this.isListening = true;
            return true;
        } catch (err) {
            console.warn("AudioAnalyzer ishga tushirishda xatolik:", err);
            this.isListening = false;
            return false;
        }
    }

    update() {
        if (!this.isListening || !this.analyser) {
            return {
                volume: 0,
                stressLevel: 0,
                pitchJitter: 0,
                isSpeaking: false,
                pauseCount: this.pauseCount
            };
        }

        this.analyser.getByteFrequencyData(this.dataArray);

        // 1. RMS Ovoz balandligini hisoblash
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i] * this.dataArray[i];
        }
        const rms = Math.sqrt(sum / this.dataArray.length);
        this.volume = Math.min(100, Math.round((rms / 128) * 100));

        // 2. Gapiryaptimi yoki jim turibdimi? (Threshold: 8)
        if (this.volume > 10) {
            this.isSpeaking = true;
            this.speechSilenceTimer = 0;
        } else {
            this.isSpeaking = false;
            this.speechSilenceTimer++;
            // Agar 3 soniyadan ortiq (taxminan 90 kadr) jim tursa - pauza
            if (this.speechSilenceTimer === 90) {
                this.pauseCount++;
            }
        }

        // 3. Ovoz tebranishi (Jitter / Micro-tremors)
        this.lastVolumeHistory.push(this.volume);
        if (this.lastVolumeHistory.length > this.historyLength) {
            this.lastVolumeHistory.shift();
        }

        if (this.lastVolumeHistory.length > 5 && this.isSpeaking) {
            let diffSum = 0;
            for (let i = 1; i < this.lastVolumeHistory.length; i++) {
                diffSum += Math.abs(this.lastVolumeHistory[i] - this.lastVolumeHistory[i - 1]);
            }
            const avgDiff = diffSum / (this.lastVolumeHistory.length - 1);
            this.pitchJitter = Math.min(100, Math.round(avgDiff * 4));

            // Yuqori chastotalar nisbati (Stressda ovoz siqilib yuqori garmonikalar ortadi: 2kHz - 5kHz)
            let highFreqSum = 0;
            let lowFreqSum = 0;
            const midIndex = Math.floor(this.dataArray.length / 4);
            for (let i = 0; i < midIndex; i++) lowFreqSum += this.dataArray[i];
            for (let i = midIndex; i < this.dataArray.length; i++) highFreqSum += this.dataArray[i];

            const ratio = lowFreqSum > 0 ? (highFreqSum / lowFreqSum) : 0;
            const highFreqStress = Math.min(100, ratio * 70);

            // Birlashtirilgan ovoz stressi
            this.stressLevel = Math.round((this.pitchJitter * 0.6) + (highFreqStress * 0.4));
        } else {
            this.pitchJitter = Math.max(0, this.pitchJitter - 2);
            this.stressLevel = Math.max(0, this.stressLevel - 2);
        }

        return {
            volume: this.volume,
            stressLevel: this.stressLevel,
            pitchJitter: this.pitchJitter,
            isSpeaking: this.isSpeaking,
            pauseCount: this.pauseCount
        };
    }

    reset() {
        this.pauseCount = 0;
        this.speechSilenceTimer = 0;
        this.lastVolumeHistory = [];
        this.volume = 0;
        this.stressLevel = 0;
        this.pitchJitter = 0;
    }

    stop() {
        this.isListening = false;
        if (this.audioContext && this.audioContext.state !== 'closed') {
            try { this.audioContext.close(); } catch (e) {}
        }
    }
}

window.AudioAnalyzer = AudioAnalyzer;
