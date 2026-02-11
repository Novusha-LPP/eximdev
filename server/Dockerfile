# Use official Node.js image
FROM node:24-alpine

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

# Expose the application port
EXPOSE 9000

# Start the application
CMD ["npm", "start"]
