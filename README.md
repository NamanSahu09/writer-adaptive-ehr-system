# 🏥 Writer-Adaptive EHR System

> **Intelligent OPD Card Digitization & Adaptive Electronic Health Records Platform**  
> Converts messy, handwritten outpatient department (OPD) prescription cards into validated, structured digital Electronic Health Records (EHRs) using writer-adaptive learning and human-in-the-loop verification.

[![Live Demo](https://img.shields.io/badge/Demo-Live%20on%20Vercel-success?style=for-the-badge&logo=vercel)](https://writer-adaptive-ehr-system.vercel.app)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20(Neon)-blue?style=for-the-badge&logo=postgresql)](https://neon.tech)
[![Drizzle ORM](https://img.shields.io/badge/ORM-Drizzle-C5F74F?style=for-the-badge)](https://orm.drizzle.team/)
[![Better Auth](https://img.shields.io/badge/Auth-Better--Auth-orange?style=for-the-badge)](https://www.better-auth.com/)

---

## 🌟 Key Highlights

- **🩺 Writer-Adaptive Intelligence**: Unlike generic OCR, this system adapts to individual doctors over time. It maintains profile dictionaries of each physician's common abbreviations, specialty vocabulary, and frequently prescribed medications to disambiguate sloppy handwriting.
- **🔍 Field-Level Confidence Scoring**: Every extracted field (Patient Name, Chief Complaint, Vitals, Diagnosis, Prescriptions, Follow-Up) is tagged with a fine-grained confidence score (0%–100%).
- **🛡️ Human-in-the-Loop Verification**: Low-confidence or flagged fields are routed to clinical verifiers who can inspect the original card image side-by-side with the digital form before approving.
- **🔄 Continuous Learning Feedback Loop**: Verifier corrections are logged to update doctor style profiles, creating a self-improving flywheel.
- **📜 Standardized EHR Records**: Finalized records are formatted with standard ICD/prescription structures and can be linked to patient histories.
- **🔒 Enterprise Security & Auditability**: Every access, edit, verification, and extraction is logged with actor ID, timestamp, and IP address for compliance.

---

## 🏗️ Architecture & Processing Workflow

```mermaid
flowchart TD
    A[📷 Handwritten OPD Card Upload] --> B[☁️ Secure Blob Storage]
    B --> C[🧠 Adaptive Extraction Engine]
    D[(Doctor Style Profiles & Past Corrections)] -.-> C
    C --> E[Structured Extraction & Confidence Scoring]
    E --> F{Confidence > Threshold?}
    F -- No --> G[👨‍⚕️ Verifier Review Queue]
    G --> H[Human Correction & Sign-off]
    H --> I[(Correction Logs)]
    I -. Updates .-> D
    F -- Yes --> J[Draft EHR Record]
    H --> J
    J --> K[📋 Finalized EHR System]
    K --> L[Audit Trail & Patient History]
```

---

## 💻 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router, Turbopack, Server Actions)
- **Language**: TypeScript 5.7
- **Styling**: Tailwind CSS v4, Lucide Icons, Radix UI Primitives, `sonner`
- **Database & ORM**: PostgreSQL ([Neon Serverless](https://neon.tech)) with [Drizzle ORM](https://orm.drizzle.team/)
- **Authentication**: [Better Auth](https://www.better-auth.com/) with role-based access control (`doctor`, `verifier`, `admin`)
- **Storage**: Vercel Blob (Cloud) & Local filesystem fallback
- **Validation**: Zod schema validation
- **Hosting**: [Vercel](https://vercel.com)

---

## 📊 Database Schema Overview

The database contains 13 relational tables configured via Drizzle:

| Table | Purpose |
|---|---|
| `user`, `session`, `account`, `verification` | Role-based authentication and sessions |
| `doctors` | Physician registry with medical licensing details |
| `patients` | Patient demographic and Medical Record Number (MRN) indexing |
| `doctor_style_profiles` | Physician-specific handwriting patterns, abbreviations, and common drugs |
| `opd_cards` | Raw prescription image uploads, metadata, and status pipeline |
| `extracted_data` | Structured OCR output, confidence scores, and raw transcription |
| `ehr_records` | Finalized clinical electronic health records |
| `verification_records` | Human verification status, flagged items, and reviewer notes |
| `correction_logs` | Diff log of original vs corrected values to feed back into adaptive profiles |
| `audit_logs` | Comprehensive action tracking for regulatory compliance |

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 20+
- **pnpm** (preferred) or npm
- **PostgreSQL** database (e.g. [Neon](https://neon.tech), Supabase, or local Postgres)

### 1. Clone the repository
```bash
git clone https://github.com/NamanSahu09/writer-adaptive-ehr-system.git
cd writer-adaptive-ehr-system
```

### 2. Install dependencies
```bash
pnpm install
# If using pnpm 11+, approve build scripts if prompted:
pnpm approve-builds --all
```

### 3. Environment Variables Setup
Create a `.env.local` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://username:password@your-neon-host/neondb?sslmode=require"

# Better Auth
BETTER_AUTH_SECRET="your-32-byte-secret"
BETTER_AUTH_URL="http://localhost:3000"

# AI Extraction Keys
GEMINI_API_KEY="your-gemini-api-key"
# or OPENAI_API_KEY="your-openai-api-key"

# Storage (Optional for local dev, uses local storage if not provided)
BLOB_READ_WRITE_TOKEN="your-vercel-blob-token"
```

### 4. Run the Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔮 Roadmap: Self-Hosted Handwriting ML Model

To eliminate per-scan token costs and satisfy strict clinical data privacy requirements (HIPAA/GDPR), the system is architected to support an on-premise open-weight ML pipeline:

- [ ] **Phase 1**: Python FastAPI microservice wrapping **TrOCR** (Transformer OCR) or **Qwen2.5-VL** for local zero-cost inference.
- [ ] **Phase 2**: LoRA fine-tuning pipeline utilizing accumulated `correction_logs` to train custom adapters for frequent hospital prescribers.
- [ ] **Phase 3**: Offline Edge deployment for rural clinic OPDs without internet access.

---

## 📄 License

This project is licensed under the MIT License.
