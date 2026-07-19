FROM python:3.12-slim

WORKDIR /app
COPY pyproject.toml README.md ./
COPY app ./app
COPY data ./data

RUN pip install --no-cache-dir .
RUN python -m app.rag.ingest --corpus data/corpus --index data/index.json

EXPOSE 8080
CMD ["uvicorn", "app.api.server:app", "--host", "0.0.0.0", "--port", "8080"]
