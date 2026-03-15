# SherLock – Smart Campus Lost and Found Management System
## 🎓 Viva Defense Guide & Documentation

This document is designed to help you demonstrate the project and answer questions during your Viva Voce.

---

### 🚀 1. Project Overview
**SherLock** is a web-based "Lost and Found" management system designed for campus environments. It automates the process of matching lost items with found items using a smart matching algorithm and notifies users via real-time email alerts.

### 🛠️ 2. Technology Stack (Why we chose this?)
*   **Frontend**: **HTML5, CSS3, Vanilla JavaScript**.
    *   *Reason*: Lightweight, fast loading, and ensures fundamental understanding of web standards without overhead of heavy frameworks like React/Angular for this scale.
*   **Backend**: **Node.js & Express.js**.
    *   *Reason*: Non-blocking I/O makes it perfect for handling concurrent requests (reporting items) and real-time operations (email triggers).
*   **Database**: **MongoDB**.
    *   *Reason*: Flexible schema allows storing diverse item details (electronics, books, etc.) without rigid table structures. JSON-like documents map directly to backend objects.
*   **Security**: **JWT (JSON Web Tokens) & Bcrypt**.
    *   *Reason*: Stateless authentication (JWT) scales well. Bcrypt ensures password security even if the database is compromised.
*   **Email**: **Nodemailer with Gmail SMTP**.
    *   *Reason*: Reliable delivery of notifications with support for HTML templates and attachments.

---

### ✨ 3. Key Features to Demo
1.  **Smart Matching Algorithm**: Automatically suggests matches based on Title, Category, Color, and Location.
2.  **Duplicate Report Detection**: Prevents users from submitting the same lost item twice by checking existing records before submission.
3.  **Role-Based Access Control (RBAC)**:
    *   **Students**: Can report items, view their own history.
    *   **Admins**: Can view all items, verify reports, confirm matches, and send manual emails.
4.  **Automated Email Notifications**:
    *   Sent when a report is verified.
    *   Sent when a match is found (includes image of the found item!).
5.  **Security**:
    *   Rate Limiting (prevents DDoS).
    *   Secure Headers (Helmet).
    *   Password Hashing.

---

### 🏗️ 4. System Architecture
*   **MVC Pattern**:
    *   **Model**: MongoDB Schemas (`User`, `Item`, `EmailLog`).
    *   **View**: HTML/CSS Frontend.
    *   **Controller**: Business logic (`itemController`, `authController`).
*   **REST API**: The backend exposes standard endpoints (GET, POST, PUT, DELETE) consumed by the frontend via `fetch()`.

---

### 📝 5. Demo Walkthrough Script
**Step 1: Setup**
*   Start Server: `node server.js` (in `backend/`)
*   Open Browser: `frontend/html/index.html`

**Step 2: Student Flow**
1.  **Register/Login** as a Student.
2.  **Report Lost Item**: Fill form (e.g., "Black Dell Laptop").
3.  **Duplicate Check**: Try reporting it again immediately. Show the warning!
4.  **Dashboard**: Show the item in "My Reports".

**Step 3: Found Item Flow (Admin or another Student)**
1.  **Report Found Item**: Report a matching item (e.g., "Black Dell Laptop" found in Library).
2.  **Smart Match**: The system automatically detects the similarity.

**Step 4: Admin Flow**
1.  **Login as Admin** (`admin@sherlock.edu` / `admin123`).
2.  **Dashboard**: View "Pending Verifications".
3.  **Verify**: Click "Verify" on the Lost Item.
    *   *Result*: Status changes, Email sent to student.
4.  **Match**: See the "Found" item next to the "Lost" item. Click **"Confirm Match"**.
    *   *Result*: Both items marked "Resolved". Email sent to student with the **Found Item's Image**.
5.  **Email Logs**: Check the server console or database to prove emails were sent/logged.

---

### ❓ 6. Common Viva Questions & Answers

**Q: How does the matching logic work?**
**A:** It uses a weighted scoring system.
*   Exact Title Match: +3 points
*   Partial Title Match: +2 points
*   Category Match: +2 points
*   Color/Location Match: +1 point
Items are sorted by score, so the most relevant matches appear first.

**Q: How do you handle images?**
**A:** We use `Multer` middleware to upload images to the server's disk storage (`uploads/` folder). The database stores the file path/URL.

**Q: Is the email system real?**
**A:** Yes! It uses `Nodemailer` with Gmail's SMTP server. It supports HTML templates and attachments. (Note: Ensure you have added the App Password in `.env` for the demo).

**Q: How is the system secure?**
**A:**
1.  **Passwords**: Hashed with bcrypt (never stored plain).
2.  **API**: Protected by JWT.
3.  **Network**: Rate Limiting prevents abuse; Helmet adds security headers.

---

### ⚙️ Setup for Real Emails (Crucial for Demo)
To make emails work during the presentation:
1.  Open `backend/.env`.
2.  Set `EMAIL_USER=your.email@gmail.com`.
3.  Set `EMAIL_PASS=your-16-digit-app-password`.
4.  Restart the server.

*Good Luck! You are ready to rock the Viva!* 🚀

---

### 🧠 7. AI-Assisted Image Matching (New Feature)
"The system enhances rule-based matching by incorporating AI-assisted image similarity. A pre-trained CNN extracts visual embeddings, and cosine similarity is used to compute confidence scores, resulting in accurate, explainable, and scalable item matching."

**Technical Details:**
*   **Model**: MobileNetV2 (Pre-trained on ImageNet).
*   **Architecture**: Python Microservice (Flask + PyTorch).
*   **Integration**: REST API (`/embed`, `/similarity`) called by Node.js backend.
*   **Algorithm**: 
    *   Images are converted to 1280-dimensional feature vectors.
    *   Cosine Similarity measures visual closeness (0.0 to 1.0).
    *   **Hybrid Scoring**: `FinalScore = (RuleScore * 0.6) + (ImageSimilarity * 0.4)`.

---

### 🔐 8. Ownership Verification Module
"The ownership verification module is fully implemented with locked, user-defined verification challenges enforced across frontend and backend."

**Feature Highlights:**
*   **Private Questions**: Users set 2-3 custom questions (e.g., "What is the wallpaper?") during reporting.
*   **Immutable Answers**: Answers are hashed/stored securely and cannot be changed.
*   **Claim Verification**: Claimants must answer these questions correctly to verify ownership.
*   **Privacy**: Answers are never exposed in API responses (`select: false` in Mongoose schema).
