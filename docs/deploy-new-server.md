# mpro7.ru: root deployment on the new server

This setup keeps the existing `mpro7.ru/77` route on the current production
server and deploys the root site bundle to the new server at `130.193.44.178`.

## GitHub secrets

Add these repository secrets before enabling the workflow:

- `NEW_SERVER_HOST`: `130.193.44.178`
- `NEW_SERVER_USER`: `ubuntu`
- `NEW_SERVER_PORT`: `22`
- `NEW_SERVER_SSH_KEY`: private key for GitHub Actions

## Server layout

- Static releases: `/var/www/html/releases/<git-sha>`
- Active release symlink: `/var/www/html/current`
- Nginx config: `/etc/nginx/sites-available/mpro7-root`

## First-time bootstrap on the server

From the repository root:

```bash
sudo bash ops/server/bootstrap-mpro7-root.sh
```

After `mpro7.ru` is pointed to the new server, issue the certificate:

```bash
sudo certbot --nginx -d mpro7.ru -d www.mpro7.ru
```

## What the workflow deploys

The workflow uploads only the current static bundle:

- `index.html`
- `mpro.html`
- `build-manifest.json`
- `README.md`
- `site/`
- `mpro/`
- `vendor/`

## Important note about the domain

As of `2026-04-16`, `mpro7.ru` still resolves to `147.45.163.242`. The new
server can be verified by IP or `Host` header, but the domain cutover will only
happen after updating DNS and issuing a certificate for the new server.
