FROM python:3.12-slim
WORKDIR /app
COPY workers/event_crawler/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt
RUN playwright install chromium
COPY workers/event_crawler ./workers/event_crawler
COPY services/discovery_engine ./services/discovery_engine
CMD ["python", "workers/event_crawler/worker.py"]
