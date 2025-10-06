# syntax=docker/dockerfile:1
FROM nginx:1.27-alpine

# Statische Dateien ins Webroot kopieren
COPY index.html /usr/share/nginx/html/index.html
COPY app.js     /usr/share/nginx/html/app.js
COPY styles.css /usr/share/nginx/html/styles.css

# Nginx-Template: wird beim Start per envsubst zu /etc/nginx/conf.d/default.conf gerendert
COPY nginx.conf /etc/nginx/templates/default.conf.template

# (Optional) lokal testen auf 8080; Render überschreibt das mit $PORT
EXPOSE 8080

# Kein eigenes CMD nötig – der Nginx-Entrypoint rendert Templates automatisch
# und startet: nginx -g 'daemon off;'
