FROM --platform=linux/amd64 node:22-alpine AS builder

WORKDIR /app
COPY marketing_intelli/web/package*.json ./marketing_intelli/web/
WORKDIR /app/marketing_intelli/web
RUN npm install --force
COPY marketing_intelli/web/ .
RUN npm run build

# Production image
FROM --platform=linux/amd64 node:22-alpine
WORKDIR /app/marketing_intelli/web
COPY --from=builder /app/marketing_intelli/web/.next ./.next
COPY --from=builder /app/marketing_intelli/web/node_modules ./node_modules
COPY --from=builder /app/marketing_intelli/web/package.json ./
COPY --from=builder /app/marketing_intelli/web/public ./public

EXPOSE 3000

CMD ["npm", "start"]
