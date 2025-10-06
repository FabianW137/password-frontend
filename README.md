# Password Vault – SPA (jQuery)

Modernes, benutzerfreundliches Frontend für dein Passwort-Manager‑Backend.

**Backend-URL:** `https://password-backend-fc0k.onrender.com`

## Features
- Login (E-Mail + Passwort) mit TOTP‑Schritt (tmpToken → endgültiger JWT)
- Registrieren
- Tresor: Suchen, Hinzufügen, Bearbeiten (Doppelklick), Löschen
- Passwort generieren, Anzeigen/Verbergen, in Zwischenablage kopieren
- Responsive, dunkles UI, Tastatur‑/Screenreader‑freundlich
- Robuste Fehlerbehandlung (Toasts), 401 → Logout

## Projektstruktur
```
index.html
styles.css
app.js
Dockerfile
nginx.conf
```

## Lokale Vorschau
Öffne `index.html` direkt im Browser oder starte einen einfachen Server:
```bash
python3 -m http.server 8080
```

## Deploy auf Render (Docker)
1. Repo mit diesen Dateien anlegen (oder dieses ZIP hochladen).
2. Render → New → **Web Service** → „Build Command“ leer lassen (Dockerfile steuert alles).
3. Nach dem Deploy ist die App unter der Render‑URL erreichbar.

> Der Container lauscht auf `PORT=10000`. Die `nginx.conf` nutzt den Wert automatisch.

## API‑Konvention (erwartet)
- `POST /api/auth/login` → `{ tmpToken }`
- `POST /api/auth/totp-verify` body: `{ tmpToken, code }` → `{ token }`
- `POST /api/auth/register` → 200
- `GET /api/vault` → `[{ id, title, username, password, url, notes }]`
- `POST /api/vault` body: `{ title, username, password, url, notes }` → Objekt
- `PUT /api/vault/{id}` body: wie oben → aktualisiertes Objekt
- `DELETE /api/vault/{id}` → 204

Wenn deine Endpunkte abweichen, passe die Pfade in `app.js` an.
