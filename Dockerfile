# ---- Static SPA via Nginx ----
FROM nginx:alpine

# Render sets PORT=10000 by default; make nginx listen on it.
ENV PORT=10000
EXPOSE 10000

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files
COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY app.js /usr/share/nginx/html/app.js

HEALTHCHECK CMD wget -qO- http://localhost:$PORT/ || exit 1
