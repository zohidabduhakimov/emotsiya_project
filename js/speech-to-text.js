/**
 * SpeechTranscriber - Nutqni matnga aylantirish va mavzuga moslikni tekshirish moduli.
 * Web Speech API orqali ishlaydi (uz-UZ, ru-RU, en-US).
 */
class SpeechTranscriber {
    constructor() {
        this.recognition = null;
        this.isSupported = ('webkitSpeechRecognition' in window) || ('SpeechRecognition' in window);
        this.isListening = false;
        this.language = 'uz-UZ';

        this.fullTranscript = '';
        this.interimTranscript = '';
        this.wordCount = 0;
        this.startTime = null;
        this.wpm = 0; // Words per minute

        this.topicKeywords = [];
        this.matchedKeywords = new Set();

        this.onTranscriptUpdate = null; // Callback
        this.init();
    }

    init() {
        if (!this.isSupported) {
            console.warn("Brauzerda Web Speech API qo'llab-quvvatlanmaydi.");
            return;
        }

        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRec();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        this.recognition.lang = this.language;

        this.recognition.onresult = (event) => {
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    this.fullTranscript += transcript + ' ';
                    this.checkKeywords(transcript);
                } else {
                    interim += transcript;
                }
            }
            this.interimTranscript = interim;

            // So'zlar soni va WPM
            const words = this.fullTranscript.trim().split(/\s+/).filter(w => w.length > 0);
            this.wordCount = words.length;

            if (this.startTime) {
                const minutes = (Date.now() - this.startTime) / 60000;
                this.wpm = minutes > 0 ? Math.round(this.wordCount / minutes) : 0;
            }

            if (typeof this.onTranscriptUpdate === 'function') {
                this.onTranscriptUpdate({
                    full: this.fullTranscript,
                    interim: this.interimTranscript,
                    wordCount: this.wordCount,
                    wpm: this.wpm,
                    matchedKeywords: Array.from(this.matchedKeywords)
                });
            }
        };

        this.recognition.onerror = (event) => {
            console.warn("Nutq aniqlash xatosi:", event.error);
        };

        this.recognition.onend = () => {
            if (this.isListening) {
                // Avtomatik qayta ulanish
                try {
                    this.recognition.start();
                } catch (e) {}
            }
        };
    }

    setLanguage(lang) {
        this.language = lang;
        if (this.recognition) {
            this.recognition.lang = lang;
        }
    }

    setKeywords(keywordsString) {
        if (!keywordsString) {
            this.topicKeywords = [];
            return;
        }
        this.topicKeywords = keywordsString
            .toLowerCase()
            .split(/[,;\n]+/)
            .map(k => k.trim())
            .filter(k => k.length > 1);
    }

    checkKeywords(text) {
        const lower = text.toLowerCase();
        for (const kw of this.topicKeywords) {
            if (lower.includes(kw)) {
                this.matchedKeywords.add(kw);
            }
        }
    }

    start() {
        if (!this.recognition) return;
        this.fullTranscript = '';
        this.interimTranscript = '';
        this.matchedKeywords.clear();
        this.startTime = Date.now();
        this.isListening = true;
        try {
            this.recognition.start();
        } catch (e) {}
    }

    stop() {
        this.isListening = false;
        if (this.recognition) {
            try {
                this.recognition.stop();
            } catch (e) {}
        }
    }

    reset() {
        this.stop();
        this.fullTranscript = '';
        this.interimTranscript = '';
        this.wordCount = 0;
        this.wpm = 0;
        this.matchedKeywords.clear();
    }
}

window.SpeechTranscriber = SpeechTranscriber;
