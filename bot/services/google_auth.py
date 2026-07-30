import json

from google.oauth2.service_account import Credentials

import config


def get_credentials(scopes: list[str]) -> Credentials:
    """Build service-account Credentials.

    Prod path: GOOGLE_SA_JSON holds the entire service-account JSON key as one
    env-var string (no file needed on Railway's ephemeral filesystem).
    Local-dev fallback: GOOGLE_CREDENTIALS_PATH points at a credentials.json
    file on disk when GOOGLE_SA_JSON isn't set.
    """
    if config.GOOGLE_SA_JSON:
        info = json.loads(config.GOOGLE_SA_JSON)
        return Credentials.from_service_account_info(info, scopes=scopes)
    return Credentials.from_service_account_file(config.GOOGLE_CREDENTIALS_PATH, scopes=scopes)
