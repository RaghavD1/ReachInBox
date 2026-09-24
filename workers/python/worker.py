import asyncio
import requests
from bullmq import Worker

# Configuration
REDIS_HOST = 'localhost'
REDIS_PORT = 6379
WEBHOOK_URL = 'http://localhost:3000/tasks/webhook'

async def process_job(job, job_token):
    task_id = job.data.get('id')
    task_type = job.data.get('taskType')
    payload = job.data.get('payload', {})
    
    print(f"[{task_type}] Python Worker processing task {task_id}")
    
    # Simulate heavy processing in Python
    await asyncio.sleep(2)
    
    if task_type == 'PROCESS_DATA':
        print(f"[PROCESS_DATA] Crunching numbers for payload: {payload}")
        # Insert your ML model or data pipeline logic here!
        await asyncio.sleep(3)
        print(f"[PROCESS_DATA] Data crunching complete.")
    else:
        print(f"[{task_type}] Generic processing complete.")
    
    # Notify Node.js API that task is complete
    try:
        response = requests.post(f"{WEBHOOK_URL}/{task_id}", json={"status": "completed"})
        if response.status_code == 200:
            print(f"[Webhook] Successfully notified Node.js API of completion.")
        else:
            print(f"[Webhook] Failed to notify API. Status: {response.status_code}")
    except Exception as e:
        print(f"[Webhook Error] {e}")
        
    return "Done"

async def main():
    print("🚀 Python Worker starting... Listening to 'pythonQueue'")
    
    worker = Worker(
        "pythonQueue",
        process_job,
        {"connection": f"redis://{REDIS_HOST}:{REDIS_PORT}"}
    )
    
    try:
        # Keep worker running
        while True:
            await asyncio.sleep(1)
    except KeyboardInterrupt:
        print("Stopping Python worker...")
        await worker.close()

if __name__ == "__main__":
    asyncio.run(main())
