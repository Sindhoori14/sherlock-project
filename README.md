# SherLock – Smart Campus Lost and Found Management System

A secure, production-grade web system for managing campus lost and found workflows. The project addresses inefficiencies in manual reporting and matching by offering automated matching, verifiable status tracking, and authenticated notifications, suitable for academic evaluation and real deployment.

## 1. Project Title & Tagline
SherLock – Smart Campus Lost and Found Management System  
Digital platform that standardizes reporting, matching, and verification of lost and found items in academic institutions, minimizing manual overhead and ensuring trustworthy outcomes.

## 2. Abstract
Campus communities frequently experience item loss and recovery events without a standardized process. Paper-based or ad-hoc methods lack visibility, consistency, and auditability, leading to duplicated reports, missing evidence, and unresolved matches. A digital solution provides structured reporting, authenticated user access, image-backed evidence, duplicate detection, automated matching, and auditable verification by administrators. Automation improves accuracy and turnaround times, while security mechanisms such as JWT-based authentication and hashed credentials protect user identities and access. This system implements a verified, role-aware workflow backed by a database and email notifications for high-confidence matches.

## 3. Features Overview
- Lost Item Management Module: Students create detailed records with item metadata and photos.
- Found Item Management Module: Report discoveries with context to aid matching and resolution.
- Image Upload & Analysis: Client-side preview with server-side storage and validation via Multer (JPG/PNG).
- Matching & Confidence Scoring: Heuristic scoring on title, category, color, location, and date to rank potential matches.
- Duplicate Report Detection: Pre-submission checks to prevent redundant lost reports within scoped time and criteria.
- Verification & Admin Workflow: Admins validate reports, examine evidence, confirm matches, and mark resolutions.
- Status Tracking: Lifecycle transitions (Pending → Verified → Resolved/Rejected) ensure progress visibility.
- Email Notification System: Real Gmail SMTP delivery via Nodemailer; sends notification when an admin confirms a lost–found match.
- Role-Based Access Control: JWT-authenticated access; admin-only operations guarded by middleware.

## 4. Technology Stack
- Frontend: HTML5, CSS3, Vanilla JavaScript.
- Backend: Node.js, Express.js.
- Database: MongoDB (Mongoose ODM).
- Security: Bcrypt for password hashing, JWT for authentication, admin authorization middleware, and secure headers via Helmet; rate limiting for API protection.
- External Services: Nodemailer with Gmail SMTP App Password for email; Multer for server-side image handling.

## 5. System Architecture
The system follows a client–server model with a RESTful backend:
- Frontend → Backend: The browser invokes authenticated endpoints for reporting, listing, verification, and matching workflows.
- Backend → Database: Express controllers use Mongoose to persist users, items, and email logs.
- Authentication Flow (JWT):
  - Registration/Login returns a signed JWT.
  - Subsequent requests include `Authorization: Bearer <token>`.
  - Admin-only endpoints are enforced by role-check middleware.

## 6. Folder Structure
```
Sherlock/
├─ backend/
│  ├─ controllers/            # authController.js, itemController.js
│  ├─ middleware/             # authMiddleware.js, uploadMiddleware.js
│  ├─ models/                 # User.js, Item.js, EmailLog.js
│  ├─ routes/                 # authRoutes.js, itemRoutes.js
│  ├─ utils/                  # matchService.js, emailService.js
│  ├─ uploads/                # stored images (served statically)
│  ├─ server.js               # Express app entry
│  ├─ seed.js                 # Admin seeding script
│  ├─ test_e2e.js             # End-to-end test
│  ├─ test_full_system.js     # Full workflow test
│  └─ test_image_upload.js    # Image upload test
└─ frontend/
   ├─ html/                   # index.html, login.html, register.html,
   │                          # report-item.html, admin-dashboard.html, my-reports.html
   ├─ css/                    # style.css
   └─ js/                     # app.js (auth helpers, API wrapper)
```

## 7. Installation & Setup
### Prerequisites
- Node.js 18+ (native `fetch` support)
- MongoDB (local or Atlas)
- Gmail account with App Password (for SMTP)

### Clone and Install
```
git clone <repository_url>
cd Sherlock/backend
npm install
```

### Environment Variables
Create `backend/.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/sherlock
JWT_SECRET=<secure_random_string>
EMAIL_USER=<your_gmail_address>
EMAIL_PASS=<your_gmail_app_password>
FROM_NAME=SherLock Admin
FROM_EMAIL=<your_gmail_address>
```

### MongoDB Configuration
- Local: Ensure the MongoDB service is running and accessible at `MONGO_URI`.
- Atlas: Provide a valid connection string; whitelist your IP and set database/collection names as needed.

### Gmail App Password Configuration
- Enable 2‑Step Verification in your Google account.
- Generate an App Password and paste it into `EMAIL_PASS`.
- The server performs SMTP verification during startup and fails if invalid.

### Start the Server
```
cd Sherlock/backend
node server.js
```
API base URL: `http://localhost:5000/api`  
Static uploads: `http://localhost:5000/uploads/<filename>`

### Seed Admin User
```
cd Sherlock/backend
node seed.js
```
Default admin: username `admin`, password `Admin@123`.

## 8. Environment Variables
- `MONGO_URI`: MongoDB connection string used by the backend.
- `JWT_SECRET`: Secret key for signing JWTs; use a strong, random value.
- `EMAIL_USER`: Gmail address for SMTP authentication and sender identity.
- `EMAIL_PASS`: Gmail App Password used exclusively for SMTP; never use the login password.

## 9. Application Workflow
### Student Flow
- Register and authenticate.
- Report lost items with item details and image upload.
- Review personal submissions and status updates.

### Admin Flow
- Authenticate as admin.
- Review incoming lost/found reports, inspect images, and validate authenticity.
- Confirm lost–found matches, which triggers email notifications to the relevant student.
- Update statuses to resolved or rejected.

### Lost–Found Matching Process
- New items are evaluated using a heuristic scoring model (title, category, color, location, date).
- Candidates are ranked by score and presented for admin review.

### Email Notification Flow
- Real SMTP email is sent only upon admin-confirmed match.
- Delivery uses Nodemailer with Gmail App Password; message identifiers are logged server-side.

## 10. Security Implementation
- Password Hashing: Bcrypt is used to hash user credentials before storage.
- JWT Authentication: Tokens issued at login; required for protected endpoints.
- Role-Based Authorization: Middleware restricts admin operations to admin accounts.
- Protected Routes: Item and admin endpoints require valid JWT; admin routes require admin role.
- Email Credential Security: Credentials are stored in `.env`, loaded server-side via `dotenv`, and never exposed to the frontend.

## 11. Status Lifecycle
- Pending: Newly submitted item awaiting review.
- Verified: Admin has validated the report details and evidence.
- Resolved: Admin confirmed a match between lost and found items; the case is closed.
- Rejected: Admin invalidated the report due to insufficient evidence or inconsistency.

## 12. Testing
### Browser Testing
- Load `frontend/html/index.html` using a static server.
- Validate flows for login, report submission, and admin operations.

### API Testing (Postman or similar)
- Test `POST /api/auth/register` and `POST /api/auth/login`.
- Test `POST /api/items` with `multipart/form-data` (image field: `image`).
- Test `PUT /api/items/:id` for match confirmation; verify email delivery and status updates.

### Edge-Case Handling
- Duplicate report detection across type, category, location, and date ranges.
- Graceful error handling for invalid inputs and unauthorized access.
- Strict SMTP verification ensures startup fails without valid credentials.

## 13. Deployment
- Backend Deployment: Run Node.js under a process manager (e.g., PM2). Configure HTTPS and environment variables per environment.
- MongoDB Atlas Setup: Create a cluster, configure users, whitelist IPs, and use a secure connection string.
- Environment Security: Never commit `.env`; use platform secrets. Rotate keys regularly.
- Production Considerations: Enable CORS restrictions, HTTPS, rate limits, logging, and backup policies.

## 14. Screenshots Section
- Login Page
- Student Report Form
- Admin Dashboard
- Match Verification Modal
- Resolved Items List

## 15. Future Enhancements
- AI-based image matching to improve confidence scoring.
- Mobile application for improved accessibility.
- SMS notifications via a trusted provider.
- Analytics dashboard for trend analysis and operational metrics.

## 16. Conclusion
This system provides a standardized and secure approach to managing lost and found processes in academic environments. By combining authenticated workflows, evidence-backed reporting, automated matching, and verifiable notifications, it demonstrates practical utility and academic rigor, supporting reliable operations and evaluable outcomes.
