/**
 * PolygraphVisualizer - Jonli kardiogramma / poligraf to'lqinlarini chizuvchi modul.
 * Haqiqiy detektorlar kabi puls, nafas va galvanik teri to'lqinlarini simulyatsiya qiladi.
 */
class PolygraphVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.points = [];
        this.maxPoints = 250;
        this.x = 0;
        this.step = 2.5;

        this.stress = 20;
        this.phase = 0;
        this.isDeceptive = false;

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio || 600;
        this.canvas.height = rect.height * window.devicePixelRatio || 120;
        this.maxPoints = Math.floor(this.canvas.width / this.step);
    }

    updateData(stressLevel, isDeceptive, isSpeaking) {
        this.stress = stressLevel;
        this.isDeceptive = isDeceptive;
        this.isSpeaking = isSpeaking;
    }

    draw() {
        if (!this.canvas || !this.ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const midY = h / 2;

        // Yangi nuqta hisoblash
        this.phase += (0.08 + (this.stress / 100) * 0.12);

        // Kardiogramma / EKG to'lqini
        let val = Math.sin(this.phase) * 10;

        // Har 1-2 soniyada puls cho'qqisi (QRS complex)
        const pulseCycle = (this.phase % (Math.PI * 2));
        if (pulseCycle > 0 && pulseCycle < 0.35) {
            val += Math.sin(pulseCycle * 9) * (20 + (this.stress * 0.5));
        }

        // Agar hayajon yuqori bo'lsa yoki yolg'on/gapirayotgan bo'lsa mikrotitroqlar
        if (this.stress > 50 || this.isSpeaking) {
            val += (Math.random() - 0.5) * (this.stress * 0.4);
        }

        const y = midY - val;
        this.points.push(y);
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }

        // Tozalash
        this.ctx.clearRect(0, 0, w, h);

        // Grid (Poligraf to'ri)
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        const gridSize = 20;
        for (let x = 0; x < w; x += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, h);
            this.ctx.stroke();
        }
        for (let yG = 0; yG < h; yG += gridSize) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, yG);
            this.ctx.lineTo(w, yG);
            this.ctx.stroke();
        }

        // To'lqin rangi (Stress va rostlikka qarab)
        let strokeColor = '#10B981'; // Yashil
        let shadowColor = 'rgba(16, 185, 129, 0.4)';

        if (this.isDeceptive || this.stress > 70) {
            strokeColor = '#EF4444'; // Qizil
            shadowColor = 'rgba(239, 68, 68, 0.6)';
        } else if (this.stress > 40) {
            strokeColor = '#F59E0B'; // Sariq
            shadowColor = 'rgba(245, 158, 11, 0.5)';
        }

        this.ctx.save();
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = 2.5;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.shadowColor = shadowColor;
        this.ctx.shadowBlur = 10;

        this.ctx.beginPath();
        for (let i = 0; i < this.points.length; i++) {
            const px = i * this.step;
            const py = this.points[i];
            if (i === 0) {
                this.ctx.moveTo(px, py);
            } else {
                this.ctx.lineTo(px, py);
            }
        }
        this.ctx.stroke();

        // Chiziq oxiridagi yonuvchi nuqta (Pulsing scan point)
        if (this.points.length > 0) {
            const lastX = (this.points.length - 1) * this.step;
            const lastY = this.points[this.points.length - 1];
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.beginPath();
            this.ctx.arc(lastX, lastY, 3.5, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.restore();
    }
}

window.PolygraphVisualizer = PolygraphVisualizer;
