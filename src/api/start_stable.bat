@echo off
REM Startup script for the FastAPI server - Stable version without reload

REM Activate virtual environment if it exists
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

REM Start the server without reload to avoid file watching issues
echo Starting FastAPI server without auto-reload...
uvicorn main:app --host 0.0.0.0 --port 8000 --no-reload
