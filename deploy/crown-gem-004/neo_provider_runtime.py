"""GEM-120: authenticated provider runtime selection; fail closed on unavailable providers."""
import os
def available():
    return {"gemini":bool(os.getenv("GEMINI_API_KEY")),
            "openai":bool(os.getenv("NEO_OPENAI_API_KEY") and os.getenv("NEO_OPENAI_MODEL")),"neo-oracle":False}
def execute(provider,prompt):
    if provider not in available() or not available()[provider]:raise ValueError("provider not connected")
    if provider=="gemini":
        from gemini_runtime import run
        return run(prompt)
    if provider=="openai":
        from neo_openai_adapter import run
        return run(prompt)
    raise ValueError("provider not connected")
