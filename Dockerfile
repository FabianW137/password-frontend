# syntax=docker/dockerfile:1

# Leichtgewichtiger Webserver für statische SPAs
FROM nginx:1.27-alpine

# Deine App-Dateien ins Webroot kopieren
# (Passe die COPY-Zeilen an, falls deine Ordnerstruktur anders ist)
COPY index.html /usr/share/nginx/html/index.html
COPY scripts/   /usr/share/nginx/html/scripts/
COPY styles/    /usr/share/nginx/html/styles/

# Optional: README/render.yaml/etc. wenn du sie ausliefern willst
# COPY render.yaml /usr/share/nginx/html/

# Kleine Healthcheck-Datei
RUN echo "ok" > /usr/share/nginx/html/health

# Standard-Nginx-Config entfernen und unsere eigene hinzufügen
RUN rm -f /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Render erwartet, dass der Container auf Port 10000 lauscht
EXPOSE 10000

# Nginx im Vordergrund starten
CMD ["nginx", "-g", "daemon off;"]
