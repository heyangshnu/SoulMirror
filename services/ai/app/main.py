from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import bazi, bot, mbti, palm, tarot

app = FastAPI(title="SoulMirror AI", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(mbti.router, prefix="/mbti", tags=["mbti"])
app.include_router(bazi.router, prefix="/bazi", tags=["bazi"])
app.include_router(tarot.router, prefix="/tarot", tags=["tarot"])
app.include_router(palm.router, prefix="/palm", tags=["palm"])
app.include_router(bot.router, prefix="/bot", tags=["bot"])


@app.get("/health")
def health():
    return {"status": "ok"}
