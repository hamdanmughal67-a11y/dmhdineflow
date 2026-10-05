# 🚀 DMH DineFlow — Real-World Production Cloud Deployment Guide

This guide walks you through deploying **DMH DineFlow** to live production hosting with SSL certificates, automated database backups, custom domains, and zero-downtime reverse proxying.

---

## 🏗️ Deployment Architecture

```
[ Internet / Customers / Staff ]
             │
      ( HTTPS / Port 443 )
             ▼
      [ NGINX Reverse Proxy + SSL ]
             │
      ┌──────┴──────────────────────────┐
      ▼                                 ▼
[ React Client (Port 80) ]     [ Node.js API & WebSockets (Port 3001) ]
                                        │
                               [ Persistent Data Volume ]
                               ├── /data/db.json (DB Store)
                               ├── /data/backups/ (Snapshots)
                               └── /uploads/ (Images & Logos)
```

---

## Option 1: 🐳 1-Click Docker Deployment (Recommended)

Any Linux VPS (Ubuntu 22.04 / 24.04 on DigitalOcean, AWS EC2, Hetzner, Contabo, Linode, or Vultr).

### Step 1: Clone or Copy Project Files to Your Server
```bash
# Upload or clone dmh-dineflow folder to your VPS
cd /var/www/dmh-dineflow
```

### Step 2: Launch with Docker Compose
```bash
# Start backend, frontend, and persistent volumes in background
docker compose up -d --build
```
Your platform will be live on `http://YOUR-SERVER-IP`!

### Step 3: Connect Domain & Free SSL (Let's Encrypt)
Install Certbot on your host:
```bash
sudo apt update && sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## Option 2: ⚙️ Traditional VPS Deployment (Ubuntu + PM2 + NGINX)

### Step 1: Install Node.js & PM2 on Server
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs nginx git
sudo npm install -g pm2
```

### Step 2: Setup the Backend Service
```bash
cd /var/www/dmh-dineflow/server
npm install
pm2 start "npx tsx src/index.ts" --name "dineflow-api"
pm2 save
pm2 startup
```

### Step 3: Build the Frontend Static Assets
```bash
cd /var/www/dmh-dineflow/client
npm install
npm run build
```
*(The build output will be in `/var/www/dmh-dineflow/client/dist`)*

### Step 4: Configure NGINX Site
Create `/etc/nginx/sites-available/dineflow`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    root /var/www/dmh-dineflow/client/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:3001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads/ {
        proxy_pass http://localhost:3001/uploads/;
        proxy_set_header Host $host;
    }

    location /socket.io/ {
        proxy_pass http://localhost:3001/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host $host;
    }
}
```

Enable site & reload NGINX:
```bash
sudo ln -s /etc/nginx/sites-available/dineflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com
```

---

## Option 3: ☁️ Cloud PaaS (Railway / Render / Coolify)

### Railway / Render:
1. Connect your GitHub repository.
2. Add Service 1: **Backend** (Root directory: `/server`, Start Command: `npx tsx src/index.ts`, Port: `3001`).
3. Add a **Persistent Disk** mounted at `/app/data` and `/app/uploads`.
4. Add Service 2: **Frontend** (Root directory: `/client`, Build: `npm run build`, Output: `dist`).

---

## 🔒 Strict Security & Multi-Tenant Privacy Isolation

The platform enforces zero-trust permission barriers:
- **Kitchen Staff**: Can **ONLY** view the order board and mark preparation statuses. Any attempt to access owner settings, menus, billing, or reports is blocked by server middleware with `403 Forbidden`.
- **Restaurant Owners**: Strictly isolated to their own `restaurant_id`. They can never access or modify data from other restaurants.
- **Customers**: No account needed; their session is bound solely to their active table QR scan token.
- **Super Admin**: Only platform admins can create tenants, suspend accounts, and view platform-wide billing.

---

## 📦 Automated Backups & Disaster Recovery

- **Scheduled Daemon**: Automatically generates a compressed `.zip` archive of all database records and uploaded images every 12 hours.
- **Rolling Retention**: Keeps the 15 latest snapshots automatically to preserve disk space.
- **Super Admin Panel**: Navigate to **Super Admin ➔ Backups & Recovery** to:
  - Create manual on-demand backup snapshots with 1-click.
  - Download backup ZIP files to your local drive.
  - Restore the entire database and assets by uploading any backup ZIP.
