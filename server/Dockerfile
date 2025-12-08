FROM mcr.microsoft.com/playwright:v1.49.0-jammy

WORKDIR /server

# Copy package files
COPY package*.json ./

# Install dependencies (Playwright + browsers are already in the base image)
RUN npm install

# Copy source code
COPY . .

# Copy environment file
COPY .env .env

EXPOSE 9000

CMD ["npm","start"]
