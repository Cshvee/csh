# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# Install system dependencies (if needed for python-docx or others)
# RUN apt-get update && apt-get install -y lib...

# Copy the requirements file into the container at /app
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the current directory contents into the container at /app
COPY . .

# Default data path points to baked-in initial dataset.
ENV DATA_DIR=/app/events_kg/input/就业市场数据(2)

# Ensure writable runtime directories exist.
RUN mkdir -p /app/uploads/training-plans /app/data/graphs

# Make port 8000 available to the world outside this container
EXPOSE 8000

# Run main.py when the container launches
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
