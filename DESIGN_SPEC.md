# SherLock – Smart Campus Lost and Found Management System
## Design, Validation, and Verification Specification

### 1. Form Field Format & Validation (Mandatory)

The following strict validation rules are enforced across both Frontend (Client-side) and Backend (Server-side) to ensure data integrity and security.

| Field Name | Type | Required | Validation Rules | Error Message |
| :--- | :--- | :--- | :--- | :--- |
| **Report Type** | Selection | Yes | Must be either "lost" or "found". | "Please select a valid report type." |
| **Date** | Date | Yes | Cannot be empty. Cannot be in the future. | "Date cannot be in the future." |
| **Student Name** | Text | Yes | Alphabets and spaces only (`/^[a-zA-Z\s]+$/`). | "Name must contain alphabets only." |
| **Roll Number** | Text | Yes | Alphanumeric only, no special chars (`/^[a-zA-Z0-9]+$/`). | "Roll number must be alphanumeric." |
| **Branch/Dept** | Text | Yes | Alphabets only (`/^[a-zA-Z]+$/`). | "Branch must contain alphabets only." |
| **Student Email** | Email | Yes | Valid institutional format (contains `@`). | "Please enter a valid institutional email." |
| **Item Title** | Text | Yes | Minimum 3 characters. | "Title must be at least 3 characters." |
| **Category** | Selection | Yes | Must be one of: Electronics, Clothing, Documents, Accessories, Other. | "Invalid category selected." |
| **Color** | Text | Yes | Alphabets only (`/^[a-zA-Z]+$/`). | "Color must contain alphabets only." |
| **Location** | Text | Yes | Minimum 3 characters. | "Location must be at least 3 characters." |
| **Description** | Text | Yes | Minimum 10 characters. | "Description must be at least 10 characters." |
| **Contact Info** | Text | Yes | Exactly 10 digits (`/^\d{10}$/`). | "Contact info must be exactly 10 digits." |
| **Item Image** | File | Yes | JPG or PNG only. Max size 5MB. | "Please upload a valid image (JPG/PNG)." |

### 2. Private Verification Question System

To prevent false claims and ensure items are returned to their rightful owners, a **Private Verification System** is implemented.

#### Concept
- **Reporter (Owner/Finder)** sets hidden questions about the item that only the true owner would know.
- **Claimant** must answer these questions to prove ownership.
- **Server** validates answers securely without exposing them to the frontend.

#### Lost vs. Found Item Logic
- **Lost Item**: The owner (reporter) sets questions about hidden attributes they know (e.g., "What is the wallpaper?").
- **Found Item**: The finder sets questions about observable but withheld details (e.g., "What is the brand of the charger inside the bag?").

#### Security Mechanism
1.  **Immutability**: Once submitted, questions and answers are **locked** in the database.
2.  **Visibility**: Questions are visible to claimants, but **answers are never sent to the client**.
3.  **Validation**:
    - Claimant submits answers.
    - Server retrieves the stored private answers (using `.select('+verificationAnswers')`).
    - Server performs a case-insensitive comparison.
    - A match score is calculated.
    - If score == 100%, status is set to `verified`.

### 3. Reporting Forms Design

#### Lost Item Form
- **User**: Student who lost the item.
- **Private Questions**: "What is the wallpaper?", "Is there a dent?", "Serial number last 3 digits?".
- **Goal**: Establish proof of ownership *before* the item is found.

#### Found Item Form
- **User**: Student who found an item.
- **Private Questions**: Finder asks questions based on details they *don't* show in the picture.
- **Goal**: Verify the claimant without giving away the item to a random person.

### 4. Claim & Verification Logic
- **Claimant Action**: Opens an item, sees the "Verification Questions", types answers.
- **Backend Action**:
    - Receives `{ itemId, answers: [...] }`.
    - Fetches item with hidden answers.
    - Compares `answer[i].toLowerCase().trim() === storedAnswer[i].toLowerCase().trim()`.
    - If all match -> **Auto-Verify** -> Notify Admin.
    - If fail -> **Reject** -> Notify Claimant.

### 5. Admin Dashboard & Security
- **Role-Based Access Control (RBAC)**: Only users with `role: 'admin'` can access the dashboard.
- **JWT Authentication**: Secured routes using Bearer tokens.
- **Workflow**:
    1.  Items reported (Status: `pending`).
    2.  Claim made & System Verified (Status: `verified`).
    3.  Admin reviews verified claims.
    4.  Admin hands over item & marks as `resolved`.
- **Zero-Trust**: Admin does not blindly trust claims; they rely on the system's strict verification score.

### 6. Viva-Defensible Explanations
- **Why Private Questions?** "To implement a Zero-Knowledge Proof style mechanism where the claimant proves knowledge without the system revealing the secrets."
- **Why Server-Side Validation?** "To prevent 'Client-Side Tampering' where a malicious user could inspect network traffic to find the correct answers."
- **Why Immutable Answers?** "To ensure 'Non-Repudiation' and data integrity, preventing post-report manipulation."
