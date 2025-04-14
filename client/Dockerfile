# Frontend Dockerfile
FROM node:16-alpine AS build

# Set working directory
WORKDIR /client

# Copy package.json and package-lock.json
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Build the React app
ENV NODE_OPTIONS="--max-old-space-size=4096"

RUN npm run build

# Serve the app using a lightweight web server
FROM nginx:alpine

# Copy the build output to the Nginx HTML directory
COPY --from=build /app/build /usr/share/nginx/html

# Expose port 80
EXPOSE 3000

# Start Nginx server
CMD ["nginx", "-g", "daemon off;"]