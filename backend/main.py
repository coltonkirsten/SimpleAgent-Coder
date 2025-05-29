# main 
# purpose: interface for frontend to interact with code agent

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
from fastapi.responses import StreamingResponse, FileResponse
from code_agent import prompt_agent, reset_conversation
from project_manager import create_project, list_projects, delete_project

print("< starting backend... >")
app = FastAPI()

# Project environment path
PROJECT_ENV_PATH = "/Users/coltonkirsten/Desktop/SeniorThesis/SimpleAgent-coder/backend/project_env"

# Allow CORS for frontend
# TODO: do I need this?
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Prompt(BaseModel):
    prompt: str
    image: str = None  # Optional base64 image

class ProjectCreate(BaseModel):
    project_name: str

class ProjectDelete(BaseModel):
    full_project_name: str

class ProjectServe(BaseModel):
    full_project_name: str

@app.post("/prompt_agent_stream")
async def send_message_stream(payload: Prompt):
    async def generate():
        # Use generator from LitellmInterface
        for chunk in prompt_agent(payload.prompt, image=payload.image):
            yield chunk
        # Stream closure will signal completion to the client
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

@app.get("/reset_conversation")
async def reset_conversation():
    current = reset_conversation()
    print(current)
    return {"message": "Conversation reset"}

@app.post("/create_project")
async def create_project_endpoint(payload: ProjectCreate):
    """Create a new project"""
    result = create_project(payload.project_name)
    
    if result.startswith("SUCCESS"):
        return {"status": "success", "message": result}
    else:
        raise HTTPException(status_code=400, detail=result)

@app.get("/list_projects")
async def list_projects_endpoint():
    """List all projects"""
    projects = list_projects()
    return {"projects": projects}

@app.delete("/delete_project")
async def delete_project_endpoint(payload: ProjectDelete):
    """Delete a project"""
    result = delete_project(payload.full_project_name)
    
    if result.startswith("SUCCESS"):
        return {"status": "success", "message": result}
    else:
        raise HTTPException(status_code=400, detail=result)

@app.post("/serve_project")
async def serve_project_endpoint(payload: ProjectServe):
    """Start serving a project and return the URL"""
    project_path = os.path.join(PROJECT_ENV_PATH, payload.full_project_name)
    
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Mount the project directory as static files
    # Remove any existing mount for this path first
    try:
        app.unmount(f"/projects/{payload.full_project_name}")
    except:
        pass  # Ignore if mount doesn't exist
    
    app.mount(f"/projects/{payload.full_project_name}", StaticFiles(directory=project_path, html=True), name=f"project_{payload.full_project_name}")
    
    # Return the URL where the project is served
    return {
        "status": "success", 
        "url": f"http://localhost:8000/projects/{payload.full_project_name}/",
        "message": f"Project {payload.full_project_name} is now being served"
    }

if __name__ == "__main__":
    print("< backend starting ... >")
    uvicorn.run(app, host="0.0.0.0", port=8000)
