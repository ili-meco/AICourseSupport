@echo off
REM Startup script for the FastAPI server

REM Install dependencies
pip install -r requirements.txt

REM Start the server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
