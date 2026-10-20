# --- build ---------------------------------------------------------------
FROM node:20-alpine AS build

WORKDIR /app
COPY package*.json ./
# the lockfile carries a known @angular/animations <-> @angular/core peer
# conflict, so the install runs the same way it does locally
RUN npm ci --legacy-peer-deps
COPY . .
RUN npx ng build

# --- runtime -------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

# the Angular build lands in dist/<project>/browser
COPY --from=build /app/dist/code-link-sw/browser /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://127.0.0.1/ >/dev/null || exit 1
