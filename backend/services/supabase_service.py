from typing import Dict, Union

from httpx import Timeout
from postgrest import SyncPostgrestClient
from postgrest.constants import DEFAULT_POSTGREST_CLIENT_TIMEOUT
from supabase import Client
from supabase._sync.client import SyncClient as SupabaseSyncClient
from supabase.lib.client_options import ClientOptions

from app.config import Config


_client: Client | None = None


class Http1PostgrestClient(SyncPostgrestClient):
    def create_session(
        self,
        base_url: str,
        headers: Dict[str, str],
        timeout: Union[int, float, Timeout],
        verify: bool = True,
    ):
        from postgrest.utils import SyncClient as PostgrestSyncClient

        return PostgrestSyncClient(
            base_url=base_url,
            headers=headers,
            timeout=timeout,
            verify=verify,
            follow_redirects=True,
            http2=False,
        )


class Http1SupabaseClient(SupabaseSyncClient):
    @staticmethod
    def _init_postgrest_client(
        rest_url: str,
        headers: Dict[str, str],
        schema: str,
        timeout: Union[int, float, Timeout] = DEFAULT_POSTGREST_CLIENT_TIMEOUT,
    ) -> SyncPostgrestClient:
        return Http1PostgrestClient(
            rest_url,
            headers=headers,
            schema=schema,
            timeout=timeout,
        )


def _build_client() -> Client:
    options = ClientOptions()
    options.postgrest_client_timeout = 20
    return Http1SupabaseClient.create(
        Config.SUPABASE_URL,
        Config.SUPABASE_SERVICE_ROLE_KEY,
        options=options,
    )


def get_supabase() -> Client:
    global _client
    if _client is None:
        _client = _build_client()
    return _client


def reset_supabase() -> Client:
    global _client
    _client = _build_client()
    return _client
