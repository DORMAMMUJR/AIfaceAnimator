from fastapi import FastAPI, File, UploadFile, HTTPException
from celery import Celery
import uuid
import os

app = FastAPI(title="AI Facial Animation API")

# Configure Celery to use Redis as broker and backend
celery_app = Celery(
    "tasks",
    broker=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/0"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/0")
)

@app.post("/api/v1/animate", status_code=202)
async def animate_face(image: UploadFile = File(...)):
    if not image.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")
    
    # 1. Save image temporarily or upload to S3/R2
    file_path = f"/tmp/{uuid.uuid4()}_{image.filename}"
    with open(file_path, "wb") as buffer:
        buffer.write(await image.read())
        
    # 2. Fast validation (OpenCV/MediaPipe) to confirm face exists
    # (Implementation omitted for brevity)
    
    # 3. Enqueue task in Celery
    task = celery_app.send_task("worker.process_animation", args=[file_path])
    
    return {"job_id": task.id, "status": "Accepted"}

@app.get("/api/v1/status/{job_id}")
async def get_status(job_id: str):
    task = celery_app.AsyncResult(job_id)
    
    if task.state == 'PENDING':
        return {"status": "En cola"}
    elif task.state == 'STARTED':
        return {"status": "Procesando", "progress": task.info.get('progress', 0)}
    elif task.state == 'SUCCESS':
        return {"status": "Completado", "url": task.result.get('url')}
    elif task.state == 'FAILURE':
        return {"status": "Error", "error": str(task.info)}
    
    return {"status": task.state}
