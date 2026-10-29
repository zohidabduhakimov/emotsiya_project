# ⚡ VeritasEdu - O'quvchilar Emotsiyasi va Haqiqiylik Tahlili Platformasi

Sun'iy intellekt (AI) yordamida o'quvchi va talabalarning dars yoki mavzuni gapirayotgandagi **emotsiyalarini**, **samimiyligini** hamda **yolg'on yoki rost gapirayotganini** real vaqtda aniqlaydigan zamonaviy platforma.

---

## 🎯 Asosiy Imkoniyatlar

### 1. 🎭 Yuz Emotsiyalarini Aniqlash (Facial Emotion Recognition)
Webcam orqali kadriga 60 marta (60 FPS) o'quvchining yuz mimikalari tahlil qilinadi:
- **Xotirjamlik (Neutral 😐)**
- **Quvonch va O'ziga ishonch (Happy 😊)**
- **Xavotir va Hayajon (Fear / Anxiety 😰)**
- **Hayrat (Surprised 😲)**
- **Qayg'u (Sad 😢)**
- **Asabiylik va G'azab (Angry 😠)**
- **Noqulaylik (Disgusted 😒)**

### 2. ⚡ Yolg'on va Rostlik Detektori (AI Polygraph & Stress Analysis)
Platforma ko'p faktorli ilmiy va psixologik ko'rsatkichlarni real vaqtda tahlil qiladi:
- **Ko'z pirpirashi (Eye Blink Rate / EAR):** O'quvchi qanchalik tez yoki sun'iy miltillayotgani (normal: 12-25/daq; kuchli hayajon yoki aldashda: > 38/daq).
- **Ko'z qochishi va Shpargalka tekshiruvi (Gaze Aversion & Cheat-sheet Detection):**
  - O'quvchi ko'zini chetga olib qochishi.
  - O'quvchi uzoq vaqt pastga qarab turishi (**stol yoki qo'lidagi shpargalkadan ko'chirish** alomati) darhol qizil ogohlantirish beradi!
- **Ovoz zo'riqishi va Titroq (Voice Stress & FFT Spectrum):** Web Audio API orqali mikrofondagi tovush chastotasi, balandlik sakrashlari va mikrotitroqlar tahlili.
- **Bosh barqarorligi:** Asabiy qimirlashlar va bosh tebranishi.
- **Jonli Poligraf Kardiogrammasi (Oscilloscope / EKG):** O'quvchining yurak urishi va stress to'lqinini vizual tarzda ko'rsatuvchi to'lqinli grafik.

### 3. 🎙️ Nutqni Matnga Aylantirish (Speech-to-Text & Mavzuga Moslik)
- O'quvchi gapirgan gaplar avtomatik ravishda ekranda matn bo'lib yozilib boradi.
- Mavzuga oid belgilangan kalit so'zlar yashil teglarda sanab boriladi.

### 4. 📊 Batafsil Yakuniy Tahliliy Hisobot (Diagnostic Report)
Nutq yakunlanganda:
- **Baholash darajasi (Grade):** `A+` (Mukammal va samimiy), `B` (Yaxshi), `C` (Hayajonlangan), `F` (Shubhali / Shpargalka).
- **Emotsiyalar taqsimoti doiraviy grafigi (Donut chart).**
- **Vaqt bo'yicha samimiylik va stress dinamikasi (Line chart).**
- **Shubhali lahzalar logi:** Qaysi sekundda ko'z pastga qaratildi yoki ovoz uzildi.
- **Chop etish / PDF:** Hisobotni o'qituvchi darhol printerdan chiqarishi yoki PDF qilib saqlashi mumkin.
- **JSON eksport:** Baholash tizimlariga integratsiya qilish imkoniyati.

---

## 🚀 Qanday Ishga Tushiriladi?

Hech qanday murakkab dastur o'rnatish shart emas!

1. Papkadagi **`start.bat`** fayliga sichqoncha bilan **2 marta bosing**.
2. Windows PowerShell serveri avtomatik ishga tushadi va tizim Microsoft Edge / Chrome brauzerida ochiladi:
   ```
   http://localhost:5500/
   ```
3. **Kamerani yoqish** tugmasini bosing (brauzer kamera va mikrofon so'raganda **"Ruxsat berish"** / **"Allow"** ni tanlang).
4. O'quvchi ismini va mavzuni kiriting.
5. **▶️ Nutqni / Imtihonni boshlash** tugmasini bosing.
6. O'quvchi gapirib bo'lgach, **⏹️ Yakunlash va Hisobotni ko'rish** tugmasini bosing!

> **Eslatma:** Agar sizda veb-kamera bo'lmasa yoki dasturni darhol sinab ko'rmoqchi bo'lsangiz, **"🎭 Demo rejimda sinash"** tugmasini bosib barcha AI funksiyalarining ishlashini ko'rishingiz mumkin!
