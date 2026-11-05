FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install build dependencies for C-extensions (PyMuPDF / FAISS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p uploads && chmod 777 uploads

EXPOSE 7860 5000

CMD ["sh", "-c", "gunicorn app:app --bind 0.0.0.0:${PORT:-7860} --timeout 120 --workers 1 --threads 4"]

