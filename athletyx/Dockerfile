# Build from repo root:
#   docker build -f athletyx/Dockerfile -t athletyx-api .
FROM python:3.12-slim

WORKDIR /app

COPY athletyx/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY athletyx/backend ./backend
COPY athletyx.mcp ./athletyx.mcp

ENV PYTHONPATH=/app
EXPOSE 8000

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
