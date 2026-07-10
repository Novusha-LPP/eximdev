# Deployment Checklist

## Backend Configuration

1. Update the **nodemon** configuration:

   * Replace the server configuration with the **production** configuration.

2. Update the **ecosystem** configuration:

   * Keep the application name as **server**.
   * Set:

     ```
     NODE_ENV=production
     ```

3. Verify the **frontend (.env)** file:

   * Comment out all **localhost** URLs.
   * Uncomment and use the **production backend** URLs.

4. Update the application version:

   * Use the current deployment date.
   * Increment the iteration/build number.

---

## Frontend Build

5. Navigate to the **client** directory and generate the production build:

   ```bash
   npm run build
   ```

---

## Backend Docker Deployment

6. Navigate to the **server** directory and build the Docker image:

   ```bash
   docker build -t <image-name>:<tag> .
   ```

7. Push the Docker image to the container registry:

   ```bash
   docker push <image-name>:<tag>
   ```

---

## EC2 Deployment

8. SSH into the EC2 instance.

9. Pull the latest Docker image:

   ```bash
   docker pull <image-name>:<tag>
   ```

10. Run (or restart) the backend container with the latest image.

11. Verify that the backend has started successfully:

```bash
docker logs <container-name>
```

Check for startup errors before proceeding.

---

## Frontend Deployment

12. Upload the contents of the **client/build** folder to the **eximdev** S3 bucket.

13. Invalidate the CloudFront cache for the production distribution to ensure the latest frontend files are served.

---

## Verification

14. Open the production application URL.

15. Verify:

* Backend APIs are working correctly.
* Frontend loads without errors.
* Latest changes are visible.
* Browser console shows no errors.
* Critical application flows are functioning as expected.