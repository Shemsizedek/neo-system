"""GEM-123 provider readiness report. Does not expose or use API credentials."""
import os
from neo_provider_runtime import available
def report():
    configured=available()
    return {
      "schema":"neo.ai.provider.health.v1",
      "providers":{
        "gemini":{"configured":configured["gemini"],"verified_live":False},
        "openai":{"configured":configured["openai"],"verified_live":False},
        "neo-oracle":{"configured":False,"verified_live":False}
      },
      "note":"Configuration does not establish a successful external API call."
    }
