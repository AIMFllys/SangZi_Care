from postgrest import SyncPostgrestClient

from core.config import settings

# Use PostgREST client directly since the full supabase package
# has build issues with storage3/pyiceberg on Windows without C++ build tools.
# For this project we primarily need database access via PostgREST.
postgrest: SyncPostgrestClient = SyncPostgrestClient(
    base_url=f"{settings.SUPABASE_URL}/rest/v1",
    headers={
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    },
)
