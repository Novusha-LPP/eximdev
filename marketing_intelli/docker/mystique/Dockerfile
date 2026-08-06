FROM --platform=linux/amd64 python:3.12-slim

WORKDIR /app

# Copy Python dependencies
COPY marketing_intelli/services/mystique/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY marketing_intelli/services/mystique/ ./marketing_intelli/services/mystique/

WORKDIR /app/marketing_intelli/services/mystique

EXPOSE 8100

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8100"]
