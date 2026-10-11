# 🧠 Writer-Adaptive ML Microservice

> **Deep Learning Inference & Continuous Adaptation Engine for Medical OPD Cards**

This microservice provides the ML intelligence for the Writer-Adaptive EHR system. It solves the high cost and latency of third-party cloud vision APIs by running a self-hosted vision model with doctor-personalized **LoRA (Low-Rank Adaptation)** fine-tuning.

---

## 🔄 The 2-Tier Adaptive Learning Loop

```
[OPD Card Image] ──> [FastAPI /api/extract] ──> Uses Doctor LoRA Adapter if available
                               │
                      [Initial Extraction]
                               │
                  [Human Verifier Review]
                               │
            Inconsistency Found & Corrected by User
                               │
                    [POST /api/feedback]
                               │
          ┌────────────────────┴────────────────────┐
          ▼                                         ▼
   [Tier 1: Instant Memory]                [Tier 2: Deep LoRA Retraining]
- Updates doctor abbreviation dict.       - Saves pairwise (image, verified_json)
- Updates frequent medicines list.        - Batch / Nightly fine-tunes attention
- Immediately available for next card.      projections (q_proj, v_proj) for this doctor.
                                          - Saves new weights to /adapters/doctor_{id}/
```

---

## 🚀 Running Locally

### 1. Set up Virtual Environment
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 2. Start the Server
```bash
python app.py
# Server runs on http://localhost:8000
```

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Health check & device info (CUDA/MPS/CPU) |
| `POST` | `/api/extract` | Run handwriting extraction with doctor adapter |
| `POST` | `/api/feedback` | Ingest human corrections to continuous training dataset |
| `POST` | `/api/train/doctor/{id}` | Trigger LoRA fine-tuning for a specific doctor |
| `GET` | `/api/adapters` | List all active doctor-specific adapters |

---

## ☁️ Cloud GPU Deployment (Modal / RunPod)

### Run with Docker:
```bash
docker build -t writer-adaptive-ml .
docker run --gpus all -p 8000:8000 writer-adaptive-ml
```

Set `ML_SERVICE_URL="https://your-gpu-service.com"` in your Next.js application's `.env.local` to direct card extraction and training requests to this service.
