/**
 * ReportGenerator - O'quvchining nutqi yakunlanganda to'liq tahliliy hisobotni
 * shakllantiruvchi va grafiklar (Chart.js) bilan aks ettiruvchi modul.
 */
class ReportGenerator {
    constructor() {
        this.emotionChart = null;
        this.timelineChart = null;
    }

    generate(sessionData) {
        const {
            studentName,
            studentClass,
            topic,
            durationSec,
            truthScoreAvg,
            emotionAverages,
            suspiciousEvents,
            speechData,
            lieDetectorData,
            history
        } = sessionData;

        // Baholash darajasi
        let gradeBadge = {
            grade: "A+",
            title: "A'LO - TO'LIQ ISHONCHLI VA SAMIMIY",
            class: "badge-success",
            desc: "O'quvchi mavzuni mustaqil va chuqur o'zlashtirgan. Nutq davomida kamera bilan barqaror vizual aloqa saqlab turildi. Hech qanday shpargalka yoki aldash alomatlari sezilmadi."
        };

        if (truthScoreAvg < 50) {
            gradeBadge = {
                grade: "F / D",
                title: "SHUBHALI - YOLG'ON YOKI KO'CHIRISH EHTIMOLI YUQORI",
                class: "badge-danger",
                desc: "O'quvchida doimiy ko'zni olib qochish, shpargalkaga qarash (nigohning uzoq vaqt pastda bo'lishi) va yuqori emotsional zo'riqish kuzatildi. Mavzuni mustaqil qayta topshirish tavsiya etiladi."
            };
        } else if (truthScoreAvg < 70) {
            gradeBadge = {
                grade: "C",
                title: "O'RTACHA - YUQORI HAYAJON VA IKKILANISH",
                class: "badge-warning",
                desc: "O'quvchida sezilarli darajada ikkilanish va asabiylik bor. Ba'zi o'rinlarda ko'z qochirildi, ammo bu yolg'ondan ko'ra ko'proq imtihon stressi bilan bog'liq bo'lishi mumkin."
            };
        } else if (truthScoreAvg < 85) {
            gradeBadge = {
                grade: "B",
                title: "YAXSHI - ASOSAN SAMIMIY",
                class: "badge-info",
                desc: "O'quvchi mavzuni yaxshi tushuntirdi. Nutq erkin, emotsiyalar me'yorida. Kichik hayajon lahzalari mavjud, umumiy ishonchlilik yuqori."
            };
        }

        // Daqiqa va soniya
        const mins = Math.floor(durationSec / 60);
        const secs = Math.floor(durationSec % 60);
        const durationFormatted = `${mins} daqiqa ${secs} soniya`;

        // Modaldagi elementlarni to'ldirish
        document.getElementById('repStudentName').innerText = studentName || "Ism ko'rsatilmadi";
        document.getElementById('repStudentClass').innerText = studentClass || "Guruh ko'rsatilmadi";
        document.getElementById('repTopic').innerText = topic || "Erkin mavzu";
        document.getElementById('repDuration').innerText = durationFormatted;
        document.getElementById('repDate').innerText = new Date().toLocaleString('uz-UZ');

        document.getElementById('repGrade').innerText = gradeBadge.grade;
        document.getElementById('repGradeTitle').innerText = gradeBadge.title;
        document.getElementById('repGradeDesc').innerText = gradeBadge.desc;
        document.getElementById('repGradeCard').className = `report-grade-card ${gradeBadge.class}`;

        document.getElementById('repTruthScore').innerText = `${truthScoreAvg}%`;
        document.getElementById('repBlinkRate').innerText = `${lieDetectorData.blinksPerMinute} / daq`;
        document.getElementById('repWordCount').innerText = `${speechData.wordCount} ta so'z`;
        document.getElementById('repWpm').innerText = `${speechData.wpm} so'z/daq`;

        // Shubhali voqealar ro'yxati
        const eventsContainer = document.getElementById('repEventsList');
        eventsContainer.innerHTML = '';
        if (suspiciousEvents.length === 0) {
            eventsContainer.innerHTML = `
                <div class="empty-state">
                    <span class="icon">✅</span>
                    <p>Nutq davomida birorta ham shubhali harakat yoki anomaliya qayd etilmadi!</p>
                </div>`;
        } else {
            suspiciousEvents.forEach(ev => {
                const item = document.createElement('div');
                item.className = `event-item severity-${ev.severity}`;
                item.innerHTML = `
                    <div class="event-time">${ev.time}</div>
                    <div class="event-desc">${ev.description}</div>
                    <div class="event-badge">${ev.severity.toUpperCase()}</div>
                `;
                eventsContainer.appendChild(item);
            });
        }

        // Nutq transkripti
        const transcriptEl = document.getElementById('repTranscript');
        transcriptEl.innerText = speechData.full.trim() || "(Nutq audio orqali yozilmadi yoki ovoz aniqlanmadi)";

        // Grafiklarni chizish
        this.renderCharts(emotionAverages, history);

        // Modalni ko'rsatish
        const modal = document.getElementById('reportModal');
        modal.classList.add('active');
    }

    renderCharts(emotionAverages, history) {
        if (typeof Chart === 'undefined') return;

        // 1. Emotsiyalar doiraviy grafigi (Donut Chart)
        const emotionCtx = document.getElementById('chartEmotions');
        if (emotionCtx) {
            if (this.emotionChart) this.emotionChart.destroy();

            const labels = ['Xotirjam (Neutral)', 'Quvonch (Happy)', 'Xavotir (Fear)', 'Hayrat (Surprise)', 'Qayg\'u (Sad)', 'Asabiy (Angry)'];
            const data = [
                emotionAverages.neutral || 0,
                emotionAverages.happy || 0,
                emotionAverages.fear || 0,
                emotionAverages.surprised || 0,
                emotionAverages.sad || 0,
                emotionAverages.angry || 0
            ];

            this.emotionChart = new Chart(emotionCtx, {
                type: 'doughnut',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#64748B', // Neutral
                            '#10B981', // Happy
                            '#F59E0B', // Fear
                            '#3B82F6', // Surprise
                            '#6366F1', // Sad
                            '#EF4444'  // Angry
                        ],
                        borderWidth: 2,
                        borderColor: '#1E293B'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: '#E2E8F0', font: { family: 'Inter', size: 12 } }
                        }
                    }
                }
            });
        }

        // 2. Samimiylik va Stress dinamikasi (Line Chart)
        const timelineCtx = document.getElementById('chartTimeline');
        if (timelineCtx) {
            if (this.timelineChart) this.timelineChart.destroy();

            const labels = (history.timestamps || []).map(t => `${Math.floor(t)}s`);
            const truthData = history.truthScores || [];
            const stressData = history.stressScores || [];

            this.timelineChart = new Chart(timelineCtx, {
                type: 'line',
                data: {
                    labels: labels.length ? labels : ['0s', '10s', '20s'],
                    datasets: [
                        {
                            label: "Samimiylik / Rostlik (%)",
                            data: truthData.length ? truthData : [90, 88, 92],
                            borderColor: '#10B981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            fill: true,
                            tension: 0.3
                        },
                        {
                            label: "Stress / Hayajon (%)",
                            data: stressData.length ? stressData : [10, 15, 12],
                            borderColor: '#EF4444',
                            backgroundColor: 'rgba(239, 68, 68, 0.05)',
                            fill: true,
                            tension: 0.3
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            min: 0,
                            max: 100,
                            grid: { color: 'rgba(255,255,255,0.06)' },
                            ticks: { color: '#94A3B8' }
                        },
                        x: {
                            grid: { color: 'rgba(255,255,255,0.06)' },
                            ticks: { color: '#94A3B8' }
                        }
                    },
                    plugins: {
                        legend: {
                            labels: { color: '#E2E8F0', font: { family: 'Inter', size: 12 } }
                        }
                    }
                }
            });
        }
    }
}

window.ReportGenerator = ReportGenerator;
