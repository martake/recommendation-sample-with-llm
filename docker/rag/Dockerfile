FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY rag/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy scripts (including tests)
COPY rag/*.py ./

CMD ["python", "preprocess.py"]
