"""GEM-120: authenticated provider runtime selection; fail closed on unavailable providers."""
import os
def available():
    return {"gemini":bool(os.getenv("GEMINI_API_KEY")),
            "openai":False,"neo-oracle":False}
def execute(provider,prompt):
    if provider!="gemini":raise ValueError("provider not connected")
    if not available()["gemini"]:raise RuntimeError("Gemini unavailable")
    from gemini_runtime import run
    return run(prompt)
