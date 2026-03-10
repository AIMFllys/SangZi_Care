import ssl

import httpx
from postgrest import SyncPostgrestClient

from core.config import settings

# Use PostgREST client directly since the full supabase package
# has build issues with storage3/pyiceberg on Windows without C++ build tools.
# For this project we primarily need database access via PostgREST.

# Create a custom SSL context that is tolerant of proxy/VPN environments
_ssl_ctx = ssl.create_default_context()
_ssl_ctx.check_hostname = False
_ssl_ctx.verify_mode = ssl.CERT_NONE

postgrest: SyncPostgrestClient = SyncPostgrestClient(
    base_url=f"{settings.SUPABASE_URL}/rest/v1",
    headers={
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    },
    schema="public",
)

# Patch the underlying httpx session to disable SSL verification
# This fixes "SSL: UNEXPECTED_EOF_WHILE_READING" behind VPN/proxy
postgrest.session = httpx.Client(
    base_url=f"{settings.SUPABASE_URL}/rest/v1",
    headers={
        "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
    },
    verify=False,
    timeout=httpx.Timeout(30.0, connect=10.0),
)
