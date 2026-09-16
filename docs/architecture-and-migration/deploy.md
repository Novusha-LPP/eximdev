# Full Deployment Guide: Docker Build, Push, EC2 Pull & Run

This document is the **single all-in-one guide** for building the AlVision Exim backend Docker image, pushing it to a Docker registry, pulling it onto the AWS EC2 instance, and running/updating the production container.

---

## 📋 Quick Cheat Sheet (TL;DR)

### 💻 On Local Development Machine (Build & Push)
```bash
# 1. Navigate to the backend directory
cd server

# 2. Build the Docker image (with AMD64 architecture for EC2 Linux compatibility)
docker build --platform linux/amd64 -t <your-dockerhub-username>/exim-server:latest -t <your-dockerhub-username>/exim-server:$(date +%Y%m%d) .

# 3. Authenticate with Docker Hub (if not logged in)
docker login

# 4. Push the image to Docker Hub
docker push <your-dockerhub-username>/exim-server:latest
docker push <your-dockerhub-username>/exim-server:$(date +%Y%m%d)
```

---

### ☁️ On AWS EC2 Server (Pull & Run)
```bash
# 1. SSH into EC2 instance
ssh -i /path/to/your-key.pem ubuntu@<ec2-ip-or-dns>

# 2. Stop and remove the existing container (if running)
docker stop exim-server || true
docker rm exim-server || true

# 3. Pull the latest Docker image
docker pull <your-dockerhub-username>/exim-server:latest

# 4. Run the updated container (Port 9006, auto-restart, background daemon)
docker run -d \
  --name exim-server \
  --restart unless-stopped \
  -p 9006:9006 \
  -e NODE_ENV=production \
  --env-file /home/ubuntu/server/.env \
  <your-dockerhub-username>/exim-server:latest

# 5. Verify container logs
docker logs -f --tail 100 exim-server
```

---

## 🛠️ Step-by-Step Detailed Guide

### Phase 1: Local Pre-Build Checks

1. **Verify Environment Variables**:
   - Ensure `server/.env` contains production database URIs (`PROD_MONGODB_URI`), JWT secrets, and AWS credentials.
   - Ensure `client/.env` points to the production backend API URL (not `localhost`).

2. **Verify Frontend Build (if deploying frontend)**:
   ```bash
   cd client
   npm run build
   # Upload build artifacts to S3 / CloudFront
   aws s3 sync build/ s3://eximdev --delete
   aws cloudfront create-invalidation --distribution-id <DISTRIBUTION_ID> --paths "/*"
   ```

---

### Phase 2: Build & Push Docker Image

1. **Navigate to the server folder**:
   ```bash
   cd /Users/udayzope/Documents/GitHub/eximdev/server
   ```

2. **Build Docker Image**:
   > **Important for Mac Users (Apple Silicon M1/M2/M3)**: Always pass `--platform linux/amd64` so the image runs correctly on x86_64 EC2 Linux instances.

   ```bash
   # Set your image repository name
   IMAGE_NAME="<your-dockerhub-username>/exim-server"
   TAG="latest"

   # Build image
   docker build --platform linux/amd64 -t $IMAGE_NAME:$TAG -t $IMAGE_NAME:$(date +%Y%m%d) .
   ```

3. **Log in to Docker Registry**:
   ```bash
   docker login
   ```

4. **Push Docker Image**:
   ```bash
   docker push $IMAGE_NAME:$TAG
   docker push $IMAGE_NAME:$(date +%Y%m%d)
   ```

---

### Phase 3: Deploy on AWS EC2

1. **Connect to EC2 Instance**:
   ```bash
   ssh -i ~/.ssh/your-ec2-key.pem ubuntu@<your-ec2-public-ip>
   ```

2. **One-Liner Update Command on EC2**:
   You can copy and run this one-liner directly on the EC2 terminal:
   ```bash
   docker pull <your-dockerhub-username>/exim-server:latest && \
   docker stop exim-server || true && \
   docker rm exim-server || true && \
   docker run -d \
     --name exim-server \
     --restart unless-stopped \
     -p 9006:9006 \
     -e NODE_ENV=production \
     --env-file /home/ubuntu/server/.env \
     <your-dockerhub-username>/exim-server:latest && \
   docker logs -f --tail 50 exim-server
   ```

---

### Phase 4: Verification & Troubleshooting

1. **Check Container Status**:
   ```bash
   docker ps
   ```
   *Verify that `exim-server` status is `Up` and port `0.0.0.0:9006->9006/tcp` is active.*

2. **Inspect Live Logs**:
   ```bash
   docker logs -f --tail 100 exim-server
   ```

3. **Test API Health**:
   ```bash
   curl http://localhost:9006/api/health || curl http://localhost:9006/
   ```

4. **Clean Up Dangling Images (Disk Space Management)**:
   ```bash
   # Remove unused/old Docker images to free disk space on EC2
   docker image prune -af
   ```

---

## 🔧 Docker Container Configuration Details

| Parameter | Value | Purpose |
|---|---|---|
| **Container Name** | `exim-server` | Unique identifier for container commands |
| **Port Mapping** | `-p 9006:9006` | Maps host port 9006 to internal container port 9006 |
| **Restart Policy** | `--restart unless-stopped` | Automatically restarts container if server reboots or crashes |
| **Environment** | `-e NODE_ENV=production` | Runs app in production mode with production DB |
| **Env File** | `--env-file /path/to/.env` | Securely mounts secret keys without baking them into image |
| **Platform** | `linux/amd64` | Target CPU architecture for AWS EC2 instances |

---

## 🚨 Rollback Procedure (If something goes wrong)

If a deployment encounters issues, immediately roll back to a previously dated tag:

```bash
# On EC2:
docker stop exim-server && docker rm exim-server

# Run previous stable tag (e.g. 20260905)
docker run -d \
  --name exim-server \
  --restart unless-stopped \
  -p 9006:9006 \
  -e NODE_ENV=production \
  --env-file /home/ubuntu/server/.env \
  <your-dockerhub-username>/exim-server:<PREVIOUS_TAG>

docker logs -f exim-server
```