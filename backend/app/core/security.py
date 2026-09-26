import time
import threading
from typing import Dict, List, Tuple
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse, Response


class InboundRateLimiter:
    """
    In-memory sliding-window rate limiter.
    - General API endpoints: 120 req / 60 seconds per IP.
    - AI Intelligence endpoints (/api/v1/ai/*): 20 req / 60 seconds per IP.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._general_limit = 120
        self._ai_limit = 20
        self._window_seconds = 60.0
        # Storage: { (ip, bucket): [timestamp1, timestamp2, ...] }
        self._requests: Dict[Tuple[str, str], List[float]] = {}

    def _get_bucket_and_limit(self, path: str) -> Tuple[str, int]:
        clean_path = path.lower()
        if "/api/v1/ai" in clean_path or clean_path.startswith("/ai"):
            return "ai", self._ai_limit
        return "general", self._general_limit

    def check(self, ip: str, path: str) -> Tuple[bool, int, int]:
        """
        Check rate limit for given IP and path.
        Returns: (allowed: bool, remaining: int, retry_after: int)
        """
        now = time.time()
        bucket, limit = self._get_bucket_and_limit(path)
        key = (ip, bucket)

        with self._lock:
            history = self._requests.get(key, [])
            cutoff = now - self._window_seconds
            # Filter timestamps within sliding window
            history = [t for t in history if t > cutoff]

            if len(history) >= limit:
                self._requests[key] = history
                # Estimate retry after from oldest timestamp in window
                oldest = history[0] if history else now
                retry_after = max(1, int(self._window_seconds - (now - oldest)))
                return False, 0, retry_after

            history.append(now)
            self._requests[key] = history
            remaining = max(0, limit - len(history))
            return True, remaining, 0

    def reset(self):
        """Reset state cleanly (useful for test isolation)."""
        with self._lock:
            self._requests.clear()


# Global rate limiter instance
inbound_rate_limiter = InboundRateLimiter()


def reset_inbound_rate_limiter():
    """Helper function to reset inbound rate limiter state between tests."""
    inbound_rate_limiter.reset()


class SecurityAndRateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware applying:
    1. Inbound IP sliding-window rate limiting (429 response when exceeded).
    2. Strict OWASP / Institutional security response headers:
       - X-Content-Type-Options: nosniff
       - X-Frame-Options: DENY
       - X-XSS-Protection: 1; mode=block
       - Referrer-Policy: strict-origin-when-cross-origin
       - X-RateLimit-Remaining: <count>
    """

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # Determine client IP address
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
        elif request.client and request.client.host:
            client_ip = request.client.host
        else:
            client_ip = "127.0.0.1"

        path = request.url.path

        # Check rate limit
        allowed, remaining, retry_after = inbound_rate_limiter.check(client_ip, path)

        if not allowed:
            headers = {
                "Retry-After": str(retry_after or 60),
                "X-RateLimit-Remaining": "0",
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
                "X-XSS-Protection": "1; mode=block",
                "Referrer-Policy": "strict-origin-when-cross-origin",
            }
            return JSONResponse(
                status_code=429,
                content={"detail": "Rate limit exceeded. Please wait before retrying."},
                headers=headers,
            )

        response = await call_next(request)

        # Inject institutional security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["X-RateLimit-Remaining"] = str(remaining)

        return response
