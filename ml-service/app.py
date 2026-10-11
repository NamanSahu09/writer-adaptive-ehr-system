import os
import json
import time
import shutil
from typing import Optional, Dict, Any, List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import io

from model_pipeline import model_pipeline
from train_lora import train_doctor_lora

app = FastAPI(
    title="Writer-Adaptive Medical ML Inference & Training Service",
    version="1.0.0",
    description="Dedicated microservice for OPD card handwriting recognition with continuous doctor adaptation via LoRA",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = os.getenv("DATA_DIR", "./data/corrections")
ADAPTERS_DIR = os.getenv("ADAPTERS_DIR", "./adapters")
os.makedirs(DATA_DIR, exist_ok=True)
os.makedirs(ADAPTERS_DIR, exist_ok=True)

class FeedbackPayload(BaseModel):
    cardId: int
    doctorId: Optional[int] = None
    originalData: Dict[str, Any]
    verifiedData: Dict[str, Any]
    corrections: List[Dict[str, Any]]
    imagePath: Optional[str] = None

class ExtractionRequest(BaseModel):
    cardId: int
    doctorId: Optional[int] = None
    styleProfile: Optional[Dict[str, Any]] = None

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "device": model_pipeline.device,
        "service": "Writer-Adaptive Medical ML",
        "timestamp": time.time(),
    }

@app.post("/api/extract")
async def extract_opd_card(
    file: UploadFile = File(...),
    doctor_id: Optional[int] = Form(None),
    style_profile_json: Optional[str] = Form(None),
):
    """
    Extracts structured medical fields from an uploaded handwritten OPD card image.
    Uses doctor-specific LoRA adapters and style profiles if available.
    """
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image format: {e}")

    style_profile = None
    if style_profile_json:
        try:
            style_profile = json.loads(style_profile_json)
        except Exception:
            pass

    prediction = model_pipeline.predict(
        image=image,
        doctor_id=doctor_id,
        style_profile=style_profile,
    )

    return {
        "success": True,
        "prediction": prediction,
        "doctorId": doctor_id,
        "hasPersonalizedAdapter": prediction.get("hasDoctorAdapter", False),
    }

@app.post("/api/feedback")
def receive_feedback(payload: FeedbackPayload, background_tasks: BackgroundTasks):
    """
    Ingests human verification & corrections for an OPD card.
    1. Saves pairwise training dataset (card image + ground truth) for continual training.
    2. If sufficient new samples exist, can trigger an asynchronous LoRA fine-tuning task.
    """
    doctor_id = payload.doctorId or 0
    doctor_dir = os.path.join(DATA_DIR, f"doctor_{doctor_id}")
    os.makedirs(doctor_dir, exist_ok=True)

    sample_id = f"card_{payload.cardId}_{int(time.time())}"
    sample_file = os.path.join(doctor_dir, f"{sample_id}.json")

    sample_record = {
        "cardId": payload.cardId,
        "doctorId": payload.doctorId,
        "originalData": payload.originalData,
        "verifiedData": payload.verifiedData,
        "corrections": payload.corrections,
        "timestamp": time.time(),
    }

    with open(sample_file, "w", encoding="utf-8") as f:
        json.dump(sample_record, f, indent=2)

    return {
        "success": True,
        "message": f"Correction logged for Doctor {doctor_id}. Ready for continuous adaptation.",
        "sampleId": sample_id,
        "totalDoctorSamples": len(os.listdir(doctor_dir)),
    }

@app.post("/api/train/doctor/{doctor_id}")
def trigger_doctor_training(doctor_id: int, background_tasks: BackgroundTasks):
    """
    Triggers a LoRA fine-tuning session for a specific doctor.
    """
    background_tasks.add_task(train_doctor_lora, doctor_id)
    return {
        "success": True,
        "message": f"LoRA training job started in background for Doctor {doctor_id}",
        "doctorId": doctor_id,
    }

@app.get("/api/adapters")
def list_adapters():
    """
    Lists all active doctor-specific adapters and their metadata.
    """
    adapters = []
    if os.path.exists(ADAPTERS_DIR):
        for entry in os.listdir(ADAPTERS_DIR):
            entry_path = os.path.join(ADAPTERS_DIR, entry)
            meta_path = os.path.join(entry_path, "adapter_metadata.json")
            if os.path.isdir(entry_path) and os.path.exists(meta_path):
                try:
                    with open(meta_path, "r", encoding="utf-8") as f:
                        adapters.append(json.load(f))
                except Exception:
                    pass
    return {"adapters": adapters, "count": len(adapters)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
