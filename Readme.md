# Circular Commerce Returns Smart Routing System (SecondLife)

An intelligent, full-stack circular commerce platform designed to prevent return waste and maximize the lifecycle value of returned inventory. By combining AI-powered vision grading (VLM) with a deterministic grading engine and a real-time expected-value routing algorithm, the system dynamically routes returned products to their highest-utility channel: **Certified Resell**, **Local Lateral Redirect**, **Bulk Liquidation**, or **Gated NGO Donation**.

---

## 🚀 Key Features

### 1. Return Prevention Guard (Buyer-Facing)
- Dynamic sizing advice card (the yellow warning guard) shown to buyers before completing a purchase.
- Analyzes size cohort behavior, purchase history, and return risk.
- Lets buyers toggle specific specifications (e.g., shoe sizes) to view live risk analysis.

### 2. Robust 3-Tier Fallback AI Grading Pipeline
If an item is returned, the inspection team uploads a photo. The system processes the grade using three robust layers:
- **Tier 1 — Gemini VLM (`gemini-2.5-flash`)**: Profile-driven vision analysis. Chooses severity levels for profile-defined cosmetic features (like screen cracks, scratches, denting) and merges them with questionnaire input (e.g., powers on, battery health).
- **Tier 2 — Groq Llama Scout VLM (`llama-3.2-11b-vision-preview` / `llama-3.2-90b-vision-preview`)**: Automatically acts as a failover if the Gemini model hits rate limits or goes offline.
- **Tier 3 — Safe Offline Default**: If all VLM APIs fail or are offline, the system gracefully falls back to a default "Good" grade, flags it for manual inspection, and prevents application crashes.

### 3. Dynamic Expected-Value Scoreboard (Seller-Facing)
- A real-time scorecard displaying the exact payout value for each routing path based on regional partners.
- **Certified Resell / Refurbish**: Computes potential market resell value or refurbishing payout (integrated with local wants databases for partners like **Cashify** and **ReBoxed**).
- **Bulk Liquidation**: The wholesale liquidation baseline value.
- **Local Lateral Redirect**: Direct peer-to-peer (P2P) order redirection, bypassing warehouses to save shipping costs and carbon footprint.
- **Gated NGO Donation**: Safe donation routing to partners like **Goonj NGO** if resale value is too low.

---

## 🛠️ Technology Stack

- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons, TanStack Query (React Query)
- **Backend**: Node.js, Express, AWS SDK (S3 & DynamoDB local or cloud)
- **AI Models**: Google Generative AI (Gemini Flash), Groq Cloud (Llama 3.2 Vision)

---

## 📂 Project Architecture & Directory Structure

```
├── backend/
│   ├── config/              # Server and AI API configurations
│   ├── src/
│   │   ├── controllers/     # Route controller actions (grading, items)
│   │   ├── routes/          # Express API route endpoints
│   │   ├── services/
│   │   │   ├── profiles/    # Profile schemas and category configs (phone, furniture, generic)
│   │   │   ├── s3.service.js           # AWS S3 image storage uploads
│   │   │   ├── dynamo.service.js       # AWS DynamoDB return item storage
│   │   │   ├── profileGrader.service.js # Deterministic 5-rank (A/B/C/D/E) grading pipeline
│   │   │   ├── groqVision.service.js    # Groq VLM fallback handler
│   │   │   └── signals.js               # Mocked partner and demand lookup databases
│   │   └── server.js        # Express app entry point
│   ├── .env.example
│   └── test-profile-grader.js # Backend pipeline test script
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Common UI components (GradeBadge, Stepper, StatusPill)
│   │   ├── features/
│   │   │   ├── buyer/       # Buyer marketplace and ReturnPreventionGuard
│   │   │   └── seller/      # Seller/Warehouse return center and GradingResult
│   │   ├── services/        # Frontend API client wrappers
│   │   └── main.jsx         # React Vite mount point
│
└── Model/                   # Original Python prototypes (for local FastAPI experimentation)
```

---

## ⚙️ Configuration & Environment Setup

### 1. Backend Configuration
Navigate to `/backend` and create a `.env` file:
```env
PORT=3000
BACKEND_URL=http://localhost:3000

# AWS Configuration (Localstack or Real AWS)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=mock-key
AWS_SECRET_ACCESS_KEY=mock-secret
DYNAMODB_ENDPOINT=http://localhost:8000
S3_ENDPOINT=http://localhost:4566
S3_BUCKET_NAME=circular-returns-photos

# AI Vision Models
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

GROQ_API_KEY=your_groq_api_key_here
GROQ_MODEL=llama-3.2-11b-vision-preview
```

### 2. Frontend Configuration
Navigate to `/frontend` and verify or create `.env` if necessary:
```env
VITE_API_BASE_URL=http://localhost:3000
```

---

## 🚀 Running the Project Locally

### Prerequisites
- **Node.js** (v18+)
- **pnpm** (recommended) or **npm**
- **LocalStack / Dynalite** running locally for S3 & DynamoDB endpoints (or standard AWS cloud services configured in the `.env`).

### Step 1: Install Dependencies
Install all package dependencies in both project directories:

```bash
# Install backend packages
cd backend
pnpm install

# Install frontend packages
cd ../frontend
pnpm install
```

### Step 2: Run Backend Dev Server
From the `backend` directory, run the Express server:
```bash
pnpm dev
```
The backend server will spin up on `http://localhost:3000`.

### Step 3: Run Frontend Dev Server
From the `frontend` directory, run the Vite development server:
```bash
pnpm dev
```
Open your browser and navigate to `http://localhost:5173`.

---

## 🧪 Testing the AI Pipeline

You can run a standalone verification script in the backend to ensure your Gemini API key and profile-grading logic are working correctly without spinning up the frontend:

```bash
cd backend
node test-profile-grader.js
```

---

## 👥 Deterministic Grading Scale (A-E)

Every item category profile defines specific defect severity levels and how they cap the final grade:

| Grade Letter | Legacy Grade Label | Description | Example (Phone Profile) |
|--------------|--------------------|-------------|-------------------------|
| **A**        | Like New           | Perfect condition, mint status | Screen crack: none, Battery: $\ge 90\%$ |
| **B**        | Very Good          | Light cosmetic wear only | Screen scratch: visible |
| **C**        | Good               | Normal used wear, fully functional | Battery: $80\% - 89\%$ |
| **D**        | Acceptable         | Moderate wear, functional | Screen crack: hairline |
| **E**        | Damaged            | Severe damage or functional failure | Screen crack: shattered, Powers on: false |