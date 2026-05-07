import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.config import Config


def verify_supabase_token(token: str):
    if not Config.SUPABASE_URL or not Config.SUPABASE_ANON_KEY:
        return None

    request = Request(
        f"{Config.SUPABASE_URL}/auth/v1/user",
        headers={
            "Authorization": f"Bearer {token}",
            "apikey": Config.SUPABASE_ANON_KEY,
        },
    )

    try:
        with urlopen(request, timeout=10) as response:
            payload = response.read().decode("utf-8")
            return json.loads(payload)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return None
