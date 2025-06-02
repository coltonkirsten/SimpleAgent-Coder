# main 
# purpose: interface for frontend to interact with code agent

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import os
import asyncio
import json
from fastapi.responses import StreamingResponse
from code_agent import prompt_agent, reset_conversation
from project_manager import create_project, list_projects, delete_project
import datetime

print("< starting backend... >")
app = FastAPI()

# Project environment path
PROJECT_ENV_PATH = "/Users/coltonkirsten/Desktop/SeniorThesis/SimpleAgent-coder/backend/project_env"

# WebSocket connection manager for notifications
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def send_notification(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                # Remove disconnected connections
                self.active_connections.remove(connection)

manager = ConnectionManager()

# Allow CORS for frontend
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

class ProjectContent(BaseModel):
    full_project_name: str

class SetActiveProject(BaseModel):
    full_project_name: str

class NotificationData(BaseModel):
    type: str
    file_path: str = None
    message: str
    active_project_name: str = None
    timestamp: str = None

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

@app.post("/prompt_agent_stream")
async def send_message_stream(payload: Prompt):
    async def generate():
        # Use generator from LitellmInterface
        for chunk in prompt_agent(payload.prompt, image=payload.image):
            yield chunk
        
        # Get current active project for notification
        settings_path = "settings.json"
        active_project_name = None
        try:
            with open(settings_path, 'r', encoding='utf-8') as f:
                settings = json.load(f)
            active_project_path = settings.get("active_project_path", "")
            if active_project_path:
                active_project_name = os.path.basename(active_project_path)
        except:
            pass  # Fail silently if can't read settings
        
        # Send notification when streaming is complete with project info
        await manager.send_notification({
            "type": "agent_complete",
            "message": "Agent response completed",
            "active_project_name": active_project_name,
            "timestamp": datetime.datetime.now().isoformat()
        })
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

@app.get("/reset_conversation")
async def reset_conversation_endpoint():
    current = reset_conversation()
    print(current)
    return {"message": "Conversation reset", "status": "success"}

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

@app.post("/get_project_content")
async def get_project_content_endpoint(payload: ProjectContent):
    """Get the HTML content of a project for direct injection"""
    project_path = os.path.join(PROJECT_ENV_PATH, payload.full_project_name)
    
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Look for index.html file
    index_file = os.path.join(project_path, "index.html")
    
    if not os.path.exists(index_file):
        raise HTTPException(status_code=404, detail="index.html not found in project")
    
    try:
        with open(index_file, 'r', encoding='utf-8') as f:
            html_content = f.read()
        
        # Mount the project for static assets (CSS, JS, images)
        mount_path = f"/projects/{payload.full_project_name}"
        try:
            app.unmount(mount_path)
        except:
            pass  # Ignore if mount doesn't exist
        
        app.mount(mount_path, StaticFiles(directory=project_path, html=True), name=f"project_{payload.full_project_name}")
        
        return {
            "status": "success",
            "html_content": html_content,
            "assets_base_url": f"http://localhost:8000{mount_path}/",
            "message": f"Project {payload.full_project_name} content retrieved"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading project content: {str(e)}")

@app.post("/set_active_project")
async def set_active_project_endpoint(payload: SetActiveProject):
    """Set the active project path in settings.json"""
    project_path = os.path.join(PROJECT_ENV_PATH, payload.full_project_name)
    
    if not os.path.exists(project_path):
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Read current settings
    settings_path = "settings.json"
    try:
        with open(settings_path, 'r', encoding='utf-8') as f:
            settings = json.load(f)
    except FileNotFoundError:
        # If settings file doesn't exist, create default structure
        settings = {
            "logging": {
                "print_system_logs": True,
                "print_debug_logs": False,
                "print_error_logs": True,
                "print_llm_logs": True,
                "print_tool_logs": True,
                "write_to_file": False
            },
            "active_project_path": ""
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading settings: {str(e)}")
    
    # Update the active project path
    settings["active_project_path"] = project_path
    
    # Write updated settings back to file
    try:
        with open(settings_path, 'w', encoding='utf-8') as f:
            json.dump(settings, f, indent=2)
        
        return {
            "status": "success",
            "message": f"Active project set to {payload.full_project_name}",
            "active_project_path": project_path
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating settings: {str(e)}")

@app.get("/get_active_project")
async def get_active_project_endpoint():
    """Get the current active project from settings.json"""
    settings_path = "settings.json"
    try:
        with open(settings_path, 'r', encoding='utf-8') as f:
            settings = json.load(f)
        
        active_project_path = settings.get("active_project_path", "")
        
        if not active_project_path:
            return {
                "status": "success",
                "active_project_path": None,
                "active_project_name": None,
                "message": "No active project set"
            }
        
        # Extract project name from path
        active_project_name = os.path.basename(active_project_path)
        
        return {
            "status": "success",
            "active_project_path": active_project_path,
            "active_project_name": active_project_name,
            "message": f"Active project: {active_project_name}"
        }
    except FileNotFoundError:
        return {
            "status": "success",
            "active_project_path": None,
            "active_project_name": None,
            "message": "Settings file not found, no active project"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error reading settings: {str(e)}")

@app.post("/notify_file_change")
async def notify_file_change(notification: NotificationData):
    """Endpoint to receive file change notifications and broadcast to WebSocket clients"""
    await manager.send_notification(notification.dict())
    return {"status": "notification_sent"}

if __name__ == "__main__":
    print("< backend starting ... >")
    uvicorn.run(app, host="0.0.0.0", port=8000)
