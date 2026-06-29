# Deploy with Apache

Assumes you completed [DEPLOY-DEBIAN.md](./DEPLOY-DEBIAN.md) and the API runs on
`127.0.0.1:4000`.

## 1. Install Apache + modules

```bash
sudo apt install -y apache2 certbot python3-certbot-apache
sudo a2enmod proxy proxy_http rewrite headers ssl
sudo systemctl restart apache2
```

## 2. Frontend VirtualHost — `paycrivo.com`

`/etc/apache2/sites-available/paycrivo.com.conf`:

```apache
<VirtualHost *:80>
    ServerName paycrivo.com
    ServerAlias www.paycrivo.com
    DocumentRoot /var/www/paycrivo.com/dist

    <Directory /var/www/paycrivo.com/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted

        # SPA fallback — every route serves index.html
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>

    # Cache wallet connector scripts and hashed assets
    <LocationMatch "^/assets/">
        Header set Cache-Control "public, max-age=2592000, immutable"
    </LocationMatch>
</VirtualHost>
```

## 3. API VirtualHost — `api.paycrivo.com`

`/etc/apache2/sites-available/api.paycrivo.com.conf`:

```apache
<VirtualHost *:80>
    ServerName api.paycrivo.com
    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:4000/
    ProxyPassReverse / http://127.0.0.1:4000/
    RequestHeader set X-Forwarded-Proto "http"
</VirtualHost>
```

## 4. Enable + SSL

```bash
sudo a2ensite paycrivo.com api.paycrivo.com
sudo apache2ctl configtest
sudo systemctl reload apache2

sudo certbot --apache -d paycrivo.com -d www.paycrivo.com -d api.paycrivo.com
```

## 5. Reload after updates

```bash
sudo systemctl reload apache2
```