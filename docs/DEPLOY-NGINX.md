# Deploy with Nginx

Assumes you completed [DEPLOY-DEBIAN.md](./DEPLOY-DEBIAN.md) and the API runs on
`127.0.0.1:4100`.

## 1. Install Nginx + Certbot

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

## 2. Frontend server block — `paycrivo.com`

The frontend is a **TanStack Start SSR app** running as the `paycrivo-web` Node
server on `127.0.0.1:3005`. Nginx reverse-proxies to it.

`/etc/nginx/sites-available/paycrivo.com`:

```nginx
server {
    listen 80;
    server_name paycrivo.com www.paycrivo.com;

    location / {
        proxy_pass http://127.0.0.1:3005;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    gzip on;
    gzip_types text/css application/javascript application/json image/svg+xml;
}
```

## 3. API server block — `api.paycrivo.com`

`/etc/nginx/sites-available/api.paycrivo.com`:

```nginx
server {
    listen 80;
    server_name api.paycrivo.com;

    location / {
        proxy_pass http://127.0.0.1:4100;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 4. Enable + SSL

```bash
sudo ln -s /etc/nginx/sites-available/paycrivo.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.paycrivo.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d paycrivo.com -d www.paycrivo.com -d api.paycrivo.com
```

Certbot installs and auto-renews Let's Encrypt certificates and rewrites the
blocks to listen on 443.

## 5. Reload after updates

```bash
sudo systemctl reload nginx
```