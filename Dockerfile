# syntax=docker/dockerfile:1

# ---- build ----
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Vite bakes VITE_* vars into the static bundle at build time, so they must
# be passed as build args (docker-compose.yml wires these to root .env).
ARG VITE_API_BASE_URL
ARG VITE_GPS_API_BASE_URL
ARG VITE_GPS_API_USERNAME
ARG VITE_GOOGLE_MAPS_API_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_GPS_API_BASE_URL=$VITE_GPS_API_BASE_URL \
    VITE_GPS_API_USERNAME=$VITE_GPS_API_USERNAME \
    VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

COPY . .
RUN npm run build

# ---- runtime: serve the static build with nginx ----
FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
