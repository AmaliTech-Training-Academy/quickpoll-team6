# Build stage
FROM node:22-alpine AS build

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
RUN npm install

# Copy source and build
COPY . .
RUN npm run build

# Runtime stage
FROM nginx:1.25-alpine

# Copy built files (handle both /dist/frontend and /dist/frontend/browser)
COPY --from=build /app/dist/frontend /tmp/frontend
RUN rm -rf /usr/share/nginx/html/* && \
    if [ -d /tmp/frontend/browser ]; then \
      cp -r /tmp/frontend/browser/* /usr/share/nginx/html/; \
    else \
      cp -r /tmp/frontend/* /usr/share/nginx/html/; \
    fi

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Set proper permissions for existing nginx user
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Switch to non-root user
USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
