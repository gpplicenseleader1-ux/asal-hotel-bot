from supabase import create_client, Client
import config

_client: Client | None = None
_service_client: Client | None = None


def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(config.SUPABASE_URL, config.SUPABASE_ANON_KEY)
    return _client


def get_service_client() -> Client:
    """Service role client — bypasses RLS. Use only on server-side."""
    global _service_client
    if _service_client is None:
        _service_client = create_client(config.SUPABASE_URL, config.SUPABASE_SERVICE_KEY)
    return _service_client
