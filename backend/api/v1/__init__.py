from fastapi import APIRouter

from api.v1 import auth, users, family, messages, medicine, health, ai_chat, ai_voice, emergency, radio

router = APIRouter(prefix="/api/v1")

router.include_router(auth.router)
router.include_router(users.router)
router.include_router(family.router)
router.include_router(messages.router)
router.include_router(medicine.router)
router.include_router(health.router)
router.include_router(ai_chat.router)
router.include_router(ai_voice.router)
router.include_router(emergency.router)
router.include_router(radio.router)
