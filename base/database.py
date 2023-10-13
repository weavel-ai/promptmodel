"""Supabase Database Client."""

import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

deployment_stage: str = os.environ.get('DEPLOYMENT_STAGE')
if deployment_stage == 'local':
    url: str = os.environ.get("PROMPTMODEL_SUPABASE_URL")
    key: str = os.environ.get("PROMPTMODEL_SUPABASE_KEY")
else:
    url: str = os.environ.get("SUPABASE_URL")
    key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)