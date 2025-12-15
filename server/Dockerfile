FROM mcr.microsoft.com/playwright:v1.57.0-jammy

WORKDIR /server

# Copy package files
COPY package*.json ./

# Install dependencies (Playwright + browsers are already in the base image)
RUN npm ci --only=production

# Copy source code
COPY . .

# Copy environment file
COPY .env .env

EXPOSE 9000

CMD ["npm","start"]
