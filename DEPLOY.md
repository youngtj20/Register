# Production deployment (single VPS)

Target: a fresh Ubuntu 22.04 VPS (DigitalOcean, Hetzner, Linode, etc., ~$6–12/mo)
running MySQL, the Node API (via PM2), and Nginx serving the built frontend.

## 0. Before you start

- Provision the VPS and note its public IP.
- Point a domain (or subdomain) at that IP with an A record. HTTPS via
  Let's Encrypt requires a real domain — it won't issue certs for bare IPs.
- You'll need root or sudo SSH access.

## 1. Install dependencies on the server

```bash
ssh root@your-server-ip

apt update && apt upgrade -y
apt install -y curl git nginx mysql-server

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

npm install -g pm2

# HTTPS certificates
apt install -y certbot python3-certbot-nginx
```

## 2. Secure MySQL and create a dedicated app user

Do **not** use `root`/blank-password in production.

```bash
mysql_secure_installation   # set a root password, remove test DB, etc.

mysql -u root -p
```
```sql
CREATE DATABASE checkin_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'checkin_app'@'localhost' IDENTIFIED BY 'REPLACE_WITH_A_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON checkin_db.* TO 'checkin_app'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 3. Deploy the app

```bash
mkdir -p /var/www/checkin
cd /var/www/checkin
git clone <your-repo-url> .        # or `scp -r` the project up if you have no git remote
npm ci
```

Create `.env` from the template and fill in real production values:

```bash
cp .env.example .env
nano .env
```

- `DB_USER` / `DB_PASSWORD` → the `checkin_app` credentials from step 2 (not `root`).
- `JWT_SECRET` → generate a fresh one, don't reuse your dev secret:
  `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`
- `HOST=127.0.0.1` → keeps the API off the public internet; only Nginx talks to it.

Run the database migration and build the frontend:

```bash
npm run db:migrate
npm run build          # outputs to dist/
```

Start the API under PM2 so it survives reboots/crashes:

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup            # follow the printed instructions (enables PM2 on boot)
```

## 4. Configure Nginx + HTTPS

**If you manage Nginx yourself** (plain Ubuntu, no control panel):

```bash
cp deploy/nginx.conf.example /etc/nginx/sites-available/checkin
nano /etc/nginx/sites-available/checkin   # replace your-domain.com and confirm the root path
ln -s /etc/nginx/sites-available/checkin /etc/nginx/sites-enabled/checkin
nginx -t && systemctl reload nginx

certbot --nginx -d your-domain.com    # issues a cert and adds the HTTP->HTTPS redirect
```

**If you're on aaPanel/BT Panel** (this deployment is): create the site through
the panel first (Website → Add site → PHP project is fine, it's just used to
generate the vhost + point `root` at `dist/`), issue the SSL cert through the
panel's SSL tab, then run `deploy/aapanel-setup.sh` on the server to wire up
the `/api` reverse proxy and the SPA fallback — aaPanel's PHP-oriented default
template doesn't include either, which is why login/refresh break out of the
box:

```bash
chmod +x deploy/aapanel-setup.sh
DOMAIN=your-domain.com deploy/aapanel-setup.sh
```

It only writes into aaPanel's own include directories
(`vhost/nginx/proxy/<domain>/` and `vhost/rewrite/<domain>.conf`), so it
survives changes you make later through the panel UI. Re-run it any time
if the panel regenerates the vhost and the API/routing breaks again.

## 5. Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'   # 80 + 443
ufw enable
```
MySQL (3306) and the Node API (8787) should **not** be exposed — they're
only reachable from `localhost`, which is already the case if you followed
steps 2–3 as written (MySQL defaults to localhost-only, and `HOST=127.0.0.1`
keeps Node off the public interface).

## 6. Create your first admin account

The signup UI is intentionally removed from the app (admins add staff from
the dashboard). Bootstrap the first admin directly via the API — the first
account created this way is automatically made an active admin:

```bash
curl -X POST https://your-domain.com/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"a-strong-password","full_name":"Your Name"}'
```

Then sign in at `https://your-domain.com/login` and add the rest of the
team from the Staff access tab.

## 7. Ongoing maintenance

- **Deploy updates**: `git pull && npm ci && npm run build && pm2 restart checkin-api`
- **Logs**: `pm2 logs checkin-api`
- **DB backups** — set up a daily cron job:
  ```bash
  mysqldump -u checkin_app -p checkin_db | gzip > /var/backups/checkin-$(date +%F).sql.gz
  ```
- **Cert renewal**: certbot installs a systemd timer automatically; verify with
  `certbot renew --dry-run`.
