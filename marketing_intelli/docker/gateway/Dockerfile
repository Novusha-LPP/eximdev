FROM --platform=linux/amd64 node:22-alpine

WORKDIR /app

# Copy shared types/config (if any)
# COPY shared/ ./shared/

# Copy gateway service
COPY marketing_intelli/services/gateway/package*.json ./marketing_intelli/services/gateway/
WORKDIR /app/marketing_intelli/services/gateway
RUN npm install --force

# Copy the rest of the gateway source
COPY marketing_intelli/services/gateway/ .

# Build TypeScript
RUN npm run build

EXPOSE 3005

CMD ["npm", "start"]
