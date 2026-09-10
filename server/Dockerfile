# Use official Node.js image
FROM --platform=linux/amd64 node:24-alpine

# Set working directory
WORKDIR /server

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --force

# Copy application source code
COPY . .

# Copy environment variables file (optional – can also mount during run)
COPY .env .env

# Set production environment
ENV NODE_ENV=production

# Expose the application port
EXPOSE 9006

# Start the application directly (no nodemon in production)
CMD ["node", "app.mjs"]
