"""
API Rate Limiting Middleware for FastAPI
"""

import time
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    Middleware for rate limiting API requests.
    Implements a simple in-memory token bucket algorithm.
    """
    
    def __init__(
        self, 
        app: ASGIApp, 
        requests_per_minute: int = 60,
    ):
        super().__init__(app)
        self.requests_per_minute = requests_per_minute
        self.tokens = {}  # IP address -> (tokens, last_refill_time)
        self.refill_rate = requests_per_minute / 60.0  # tokens per second
    
    async def dispatch(self, request: Request, call_next):
        # Get client IP (in production, consider using X-Forwarded-For with proper validation)
        client_ip = request.client.host
        
        # Skip rate limiting for health check endpoint
        if request.url.path == "/health":
            return await call_next(request)
        
        # Initialize bucket for new client
        if client_ip not in self.tokens:
            self.tokens[client_ip] = (self.requests_per_minute, time.time())
        
        # Refill tokens based on time passed
        tokens, last_refill = self.tokens[client_ip]
        now = time.time()
        time_passed = now - last_refill
        new_tokens = min(
            self.requests_per_minute, 
            tokens + time_passed * self.refill_rate
        )
        
        # Check if request can proceed
        if new_tokens < 1:
            # Return 429 Too Many Requests
            return Response(
                content={"error": "Rate limit exceeded. Please try again later."},
                status_code=429,
                headers={"Retry-After": "60"}
            )
        
        # Update token bucket and proceed with request
        self.tokens[client_ip] = (new_tokens - 1, now)
        
        # Process the request
        response = await call_next(request)
        return response
