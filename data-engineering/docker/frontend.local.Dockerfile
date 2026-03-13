ARG API_BASE_URL=http://localhost:8080/api

FROM node:22-alpine AS build

ARG API_BASE_URL
ARG NPM_FETCH_RETRIES=5
ARG NPM_FETCH_RETRY_MINTIMEOUT=20000
ARG NPM_FETCH_RETRY_MAXTIMEOUT=120000
ARG NPM_FETCH_TIMEOUT=300000

WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm config set fetch-retries "$NPM_FETCH_RETRIES" && \
    npm config set fetch-retry-mintimeout "$NPM_FETCH_RETRY_MINTIMEOUT" && \
    npm config set fetch-retry-maxtimeout "$NPM_FETCH_RETRY_MAXTIMEOUT" && \
    npm config set fetch-timeout "$NPM_FETCH_TIMEOUT" && \
    npm ci --no-audit --prefer-offline

COPY frontend ./
COPY data-engineering/docker/patch_frontend_templates.mjs /tmp/patch_frontend_templates.mjs
RUN printf "export const API_BASE_URL = '%s';\n" "$API_BASE_URL" \
    > src/app/constants.ts
RUN node /tmp/patch_frontend_templates.mjs /app/frontend
RUN npm run build

FROM nginx:1.25-alpine

COPY --from=build /app/frontend/dist/frontend /tmp/frontend
RUN rm -rf /usr/share/nginx/html/* && \
    if [ -d /tmp/frontend/browser ]; then \
      cp -r /tmp/frontend/browser/* /usr/share/nginx/html/; \
    else \
      cp -r /tmp/frontend/* /usr/share/nginx/html/; \
    fi

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

USER nginx

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
