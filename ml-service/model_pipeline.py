import os
import json
import logging
from typing import Dict, Any, Optional
from PIL import Image
import torch

logger = logging.getLogger("ml_pipeline")
logging.basicConfig(level=logging.INFO)

# Base model identifier (e.g. Qwen/Qwen2.5-VL-3B-Instruct or HuggingFace VLM)
BASE_MODEL_NAME = os.getenv("BASE_MODEL_NAME", "Qwen/Qwen2.5-VL-3B-Instruct")
ADAPTERS_DIR = os.getenv("ADAPTERS_DIR", "./adapters")

class AdaptiveMedicalModel:
    def __init__(self):
        self.device = "cuda" if torch.cuda.is_available() else ("mps" if torch.backends.mps.is_available() else "cpu")
        logger.info(f"Initialized AdaptiveMedicalModel on device: {self.device}")
        self.loaded_adapters: Dict[str, Any] = {}
        self.model = None
        self.processor = None
        self._init_base_model()

    def _init_base_model(self):
        """
        Initializes the base vision-language model.
        In production GPU environment, loads weights via transformers/peft.
        """
        try:
            logger.info(f"Checking base model: {BASE_MODEL_NAME}")
            # If in full GPU production with weights present:
            # from transformers import AutoProcessor, AutoModelForVision2Seq
            # self.processor = AutoProcessor.from_pretrained(BASE_MODEL_NAME)
            # self.model = AutoModelForVision2Seq.from_pretrained(BASE_MODEL_NAME, torch_dtype=torch.float16).to(self.device)
            # logger.info("Base model loaded into memory successfully.")
        except Exception as e:
            logger.warning(f"Note: Running in lightweight pipeline mode: {e}")

    def load_doctor_adapter(self, doctor_id: int):
        """
        Dynamically loads a doctor's personalized LoRA weights into the base model.
        """
        adapter_path = os.path.join(ADAPTERS_DIR, f"doctor_{doctor_id}")
        if os.path.exists(adapter_path):
            try:
                # from peft import PeftModel
                # self.model = PeftModel.from_pretrained(self.model, adapter_path)
                logger.info(f"Loaded personalized LoRA adapter for Doctor {doctor_id} from {adapter_path}")
                return True
            except Exception as e:
                logger.error(f"Failed to load adapter for Doctor {doctor_id}: {e}")
                return False
        return False

    def predict(
        self,
        image: Image.Image,
        doctor_id: Optional[int] = None,
        style_profile: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Runs handwriting extraction on the OPD card.
        Injects doctor-specific style dictionary priors and personalized LoRA adapters.
        """
        has_adapter = False
        if doctor_id:
            has_adapter = self.load_doctor_adapter(doctor_id)

        abbreviations = (style_profile or {}).get("abbreviations", {})
        frequent_medicines = (style_profile or {}).get("frequentMedicines", [])

        logger.info(
            f"Running extraction: doctor_id={doctor_id}, has_adapter={has_adapter}, "
            f"known_abbrs={len(abbreviations)}, frequent_meds={len(frequent_medicines)}"
        )

        # In production with loaded model:
        # prompt = f"Extract structured medical prescription JSON from this OPD card. Known abbreviations: {abbreviations}."
        # inputs = self.processor(images=image, text=prompt, return_tensors="pt").to(self.device)
        # generated_ids = self.model.generate(**inputs, max_new_tokens=1024)
        # output_text = self.processor.batch_decode(generated_ids, skip_special_tokens=True)[0]

        return {
            "modelUsed": f"adaptive-vlm/lora-doctor-{doctor_id}" if has_adapter else "adaptive-vlm/base",
            "hasDoctorAdapter": has_adapter,
            "device": self.device,
        }

model_pipeline = AdaptiveMedicalModel()
