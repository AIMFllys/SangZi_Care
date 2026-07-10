import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.v1 import router as api_v1_router
from core.config import settings

logger = logging.getLogger(__name__)

app = FastAPI(
    title="桑梓智护 API",
    version="0.1.0",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
)

# CORS middleware — origins controlled via ALLOWED_ORIGINS env var
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """全局异常处理 — 显式添加 CORS 头，防止浏览器拦截错误响应。"""
    logger.error("Unhandled exception on %s %s: %s", request.method, request.url, exc)

    # 仅在调试模式下返回详细错误信息
    content = {"detail": "Internal server error"}
    if settings.DEBUG:
        content["message"] = str(exc)

    # 从请求中读取 Origin，仅在白名单内才回显
    origin = request.headers.get("origin", "")
    allowed_origin = origin if origin in settings.cors_origins else ""

    headers = {
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }
    if allowed_origin:
        headers["Access-Control-Allow-Origin"] = allowed_origin

    return JSONResponse(status_code=500, content=content, headers=headers)


@app.get("/health")
async def health_check():
    return {"status": "ok"}


app.include_router(api_v1_router)
