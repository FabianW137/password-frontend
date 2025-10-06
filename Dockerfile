FROM nginx:1.27-alpine

# Template: envsubst wandelt das zur Laufzeit in /etc/nginx/conf.d/default.conf um
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# Statische Dateien
COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY app.js     /usr/share/nginx/html/app.js

EXPOSE 8080


# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy static files
COPY index.html /usr/share/nginx/html/index.html
COPY styles.css /usr/share/nginx/html/styles.css
COPY app.js /usr/share/nginx/html/app.js

HEALTHCHECK CMD wget -qO- http://localhost:$PORT/ || exit 1
