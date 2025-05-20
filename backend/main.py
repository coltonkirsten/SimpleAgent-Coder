# main 
# purpose: interface for frontend to interact with code agent

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn
from fastapi.responses import StreamingResponse
from code_agent import prompt_agent

print("< starting backend... >")
app = FastAPI()

# Allow CORS for frontend
# TODO: do I need this?
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

current_text = "hello world"

class Prompt(BaseModel):
    prompt: str
    image: str = None  # Optional base64 image

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

if __name__ == "__main__":
    print("< backend starting ... >")
    uvicorn.run(app, host="0.0.0.0", port=8000)
