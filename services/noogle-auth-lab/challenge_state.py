"""NSEC-016 preproduction challenge-state laboratory. NOT a WebAuthn verifier."""
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
import secrets

@dataclass
class Challenge:
    value: str
    user_id: str
    purpose: str
    created: datetime
    consumed: bool = False

class ChallengeStore:
    """Volatile single-use challenges. Production requires durable atomic transactions."""
    def __init__(self, ttl_seconds=120):
        if not 1 <= ttl_seconds <= 300:
            raise ValueError("TTL outside allowed range")
        self.ttl = timedelta(seconds=ttl_seconds)
        self._items = {}

    def issue(self, user_id, purpose, now=None):
        if not user_id or purpose not in {"registration", "authentication"}:
            raise ValueError("invalid challenge scope")
        now = now or datetime.now(timezone.utc)
        token = secrets.token_urlsafe(32)
        self._items[token] = Challenge(token, user_id, purpose, now)
        return token

    def consume(self, token, user_id, purpose, now=None):
        """State check only: DOES NOT verify signatures or attestations."""
        now = now or datetime.now(timezone.utc)
        challenge = self._items.get(token)
        if challenge is None or challenge.consumed:
            return False
        if challenge.user_id != user_id or challenge.purpose != purpose:
            return False
        if now < challenge.created or now >= challenge.created + self.ttl:
            return False
        challenge.consumed = True
        return True

class TerminalPolicy:
    """Explicit hard deny until a separately reviewed terminal agent exists."""
    @staticmethod
    def request(*args, **kwargs):
        raise PermissionError("Remote terminal disabled: NSEC-016 preproduction gate")
