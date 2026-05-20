# 💊 MediTrack — Never Miss a Dose

[![Live Demo](https://img.shields.io/badge/Live%20Demo-View%20App-d946ef?style=for-the-badge&logo=netlify&logoColor=white)](YOUR-LIVE-LINK-HERE)
[![HTML](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Version](https://img.shields.io/badge/Version-2.0-a855f7?style=for-the-badge)](https://github.com/HuntressShivolo)

---

## 🌐 Live Demo

👉 **[Open MediTrack Here](YOUR-LIVE-LINK-HERE)**

> No installation. No account. No internet required after first load. Just open and use.

---

## 📖 About MediTrack

MediTrack is a **medication adherence web application** built entirely from scratch using HTML, CSS, and vanilla JavaScript — no frameworks, no backend, no database. It was built to solve a real and dangerous problem: people forgetting whether they have taken their medication.

For patients managing chronic conditions such as diabetes, hypertension, or HIV — a missed or double dose is not a small mistake. MediTrack provides a clear, reliable, and accessible solution that works on any device with a browser.

Everything is stored locally in the browser using **localStorage** — meaning your private health data never leaves your device.

---

## ✨ Features — Version 2.0

### 🔔 Smart Reminders
- Full-screen alarm overlay that takes over the screen at dose time — impossible to ignore
- Alarm sound generated using the **Web Audio API** — no sound files needed
- Native browser notifications that work even when the tab is in the background
- Snooze for 10 minutes or mark as taken directly from the alarm screen

### 💊 Medication Management
- Add unlimited medications with name, dosage, time, colour tag, and frequency
- **Multiple daily dose times** per medication — unlimited reminder times
- **Edit any medication** at any time — modal pre-fills with existing data
- **Undo deletion** — a 5-second window to restore accidentally deleted medications
- **Photo attachments** — upload a pill bottle photo for quick visual identification
- **"Take with food" reminder** — shows in alarm and on medication card
- **Doctor & pharmacy info** — store prescriber contact and prescription number

### 📦 Inventory Tracking
- Optional pill count tracking per medication
- Automatic countdown when a dose is logged
- Customisable low stock alert threshold
- Out of stock warnings and refill reminders

### ⏭️ Flexible Dose Logging
- **Skip / Postpone** — skip a dose with a recorded reason, or postpone by 30 minutes or 1 hour
- Skipped doses are tracked honestly in history without breaking your streak if documented
- **Side effects tracker** — log how you feel after taking each medication

### ⚠️ Medication Interaction Warnings
- Built-in interactions database checks for conflicts when adding medications
- Common interactions covered: Warfarin + Aspirin, Statins + Grapefruit, Antibiotics + Dairy, and more
- Confirmation required before proceeding with a flagged combination

### 📊 Data & Reporting
- **Export as JSON** — full data backup
- **Generate PDF report** — medication table, adherence stats, last 30 doses, streak info
- Shareable with doctors at appointments
- Automatic filename includes the current date

### 📈 Adherence Tracking
- **Daily adherence ring** — live percentage showing today's progress
- **14-day streak calendar** — colour-coded: green (perfect), yellow (partial), red (missed)
- **Day detail modal** — tap any calendar day to see exactly what was taken or missed
- **Streak counter** with motivational messages and 🔥 flame indicator
- **Next dose countdown** showing name and time of upcoming medication

### 🌓 Themes & Accessibility
- **Dark / Light theme toggle** — smooth transition, preference saved to localStorage
- Separate `theme-light.css` file for clean separation of concerns
- Sun / moon icon indicator in header
- Touch-optimised for mobile and Android emulators (LD Player)
- Minimum 44px touch targets on all interactive elements

---

## 🛠️ Built With

| Technology | Purpose |
|---|---|
| HTML5 | Application structure |
| CSS3 | Styling, animations, dark/light themes |
| Vanilla JavaScript | All application logic |
| Web Audio API | Alarm sound generation (no files) |
| Notifications API | Background browser notifications |
| localStorage | All data storage — stays on your device |
| Google Fonts | Syne · DM Mono · Plus Jakarta Sans |

---

## 📁 File Structure

```
MediTrack/
├── index.html          # Main HTML structure
├── app.js              # Complete application logic (15 features)
├── style.css           # Dark theme styles + animations
├── theme-light.css     # Light theme styles
└── README.md           # This file
```

---

## 🚀 How to Run Locally

1. Clone or download this repository
2. Open the folder in **VS Code**
3. Install the **Live Server** extension
4. Right-click `index.html` → **Open with Live Server**
5. The app opens at `localhost:5500`

> No npm install. No build step. No dependencies to manage.

---

## 📱 How to Use MediTrack

### First Time Setup
1. Click **Enable reminders** in the header to allow browser notifications
2. Click **+ Add Medication** and fill in your details
3. Set multiple dose times if needed using **+ Add another time**
4. Enable inventory tracking to monitor your pill count
5. Add doctor and pharmacy info for quick refill reference

### Daily Use
1. Check **Today's Schedule** for your upcoming doses
2. Click **Take** when you take a medication — the dose is logged instantly
3. Use **Skip** or **Postpone** if needed — your reason is recorded
4. Watch your **streak** grow and monitor your **adherence ring**

### Doctor Visits
1. Click **📊 Export** in the header
2. Generate a **PDF report** with your full medication list and adherence history
3. Share it directly with your doctor or pharmacist

---

## 🔬 Technical Highlights

```javascript
// Medication data structure
{
  id: timestamp,
  name: string,
  dosage: string,
  times: [array of times],        // multiple daily doses
  notes: string,
  withFood: boolean,
  trackInventory: boolean,
  pillsRemaining: number,
  lowStockThreshold: number,
  doctorInfo: string,
  prescriptionNumber: string,
  photo: base64 string,           // stored locally
  color: hex color,
  frequency: string,
  createdAt: ISO date
}
```

**Key JavaScript APIs used:**
- `Web Audio API` — alarm sound generation
- `Notifications API` — background reminders
- `localStorage` — persistent data storage
- `setInterval` — 30-second clock checks for reminders
- `IntersectionObserver` — scroll-based animations
- `FileReader API` — photo upload and base64 conversion

---

## 🌍 Browser Compatibility

| Browser | Support |
|---|---|
| Chrome / Edge | ✅ Full support |
| Firefox | ✅ Full support |
| Safari (iOS 14+) | ✅ Full support |
| LD Player (Android) | ✅ Optimised |

---

## 🔮 Future Enhancement Ideas

- Cloud sync across devices
- SMS reminders via Twilio API
- Barcode scanning for medication identification
- Family member / caregiver profiles
- Integration with pharmacy APIs
- Appointment reminders
- Medication cost and insurance tracking

---

## 👩🏾‍💻 About the Developer

**Laina Shivolo** — Final-year BSc Computer Science student at NUST, Namibia, majoring in Cybersecurity. MediTrack was built as a full-stack web project to demonstrate real-world problem solving using core web technologies.

- 🌐 Portfolio: [YOUR-PORTFOLIO-LINK-HERE]
- 💼 LinkedIn: [linkedin.com/in/laina-shivolo-52664b355](https://www.linkedin.com/in/laina-shivolo-52664b355)
- 🐙 GitHub: [github.com/HuntressShivolo](https://github.com/HuntressShivolo)
- 📧 Email: shivololaina17@gmail.com
- 📍 Location: Windhoek, Namibia

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">
  Built with 💜 by <strong>Laina Shivolo</strong> · Windhoek, Namibia · Version 2.0
</p>
