# 🌐 Step-by-Step Guide: Deploying DMH DineFlow on Netlify

This guide shows you the exact steps to deploy **DMH DineFlow** to **Netlify** with free global CDN hosting, custom domains, and automatic SSL certificates.

---

## 💡 How DMH DineFlow Runs in the Cloud

**DMH DineFlow** has two parts:
1. **Frontend (React + Vite + Tailwind CSS)**: Hosted on **Netlify** (lightning-fast global edge network).
2. **Backend (Node.js Express + Socket.IO WebSockets + Database)**: Hosted on **Render**, **Railway**, **Koyeb**, or any **VPS** (Free tier available).

```
┌──────────────────────────────────────────────┐
│  📱 Customers & Staff Browsers               │
└──────────────────────┬───────────────────────┘
                       │
       ┌───────────────┴───────────────┐
       ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────────────────────┐
│  🚀 Netlify CDN           │   │  ⚙️ Cloud Backend (Render / Railway / VPS) │
│  Frontend React App       │   │  Node.js API + WebSockets + DB Storage     │
│  https://dineflow.netlify.app │   │  https://dineflow-api.onrender.com        │
└───────────────────────────┘   └───────────────────────────────────────────┘
```

---

## ⚡ Method 1: 30-Second Instant Drag & Drop Deploy (Easiest)

You can deploy the built frontend directly to Netlify without installing any tools:

### Step 1: Open Netlify in Your Browser
1. Go to **[https://app.netlify.com](https://app.netlify.com)** and log in (or sign up for free).
2. Click on the **Sites** tab in your Netlify dashboard.

### Step 2: Drag & Drop the `dist` Folder
1. On your laptop, open File Explorer and go to:
   ```
   C:\Users\HAMDAN\.gemini\antigravity\scratch\dmh-dineflow\client\dist
   ```
2. Drag the entire **`dist`** folder and drop it into the Netlify **"Drag and drop your site output folder here"** area.

### Step 3: Done! 🎉
Netlify will deploy your site in **5 seconds** and give you a live URL like `https://dmh-dineflow.netlify.app`.

---

## 🔄 Method 2: Automated GitHub Deploy (Continuous Deployment)

If your code is pushed to a GitHub repository:

### Step 1: Connect GitHub to Netlify
1. Go to **[https://app.netlify.com](https://app.netlify.com)** ➔ click **Add new site** ➔ **Import an existing project**.
2. Select **GitHub** and authorize Netlify to access your repository.
3. Select your `dmh-dineflow` repository.

### Step 2: Configure Build Settings
Netlify will ask for your build configuration. Enter:
- **Base directory**: `client`
- **Build command**: `npm run build`
- **Publish directory**: `client/dist`

*(The pre-configured `netlify.toml` in your project will fill these automatically).*

### Step 3: Click "Deploy Site"
Netlify will build your application and deploy it live with automatic updates whenever you push code to GitHub!

---

## ⚙️ Step 3: Deploying the Backend & Connecting to Netlify

To enable live database storage and real-time Socket.IO orders:

### Option A: Free 1-Click Deploy on Render (Recommended)
1. Go to **[https://render.com](https://render.com)** and create a free account.
2. Click **New +** ➔ **Web Service** ➔ connect your GitHub repo.
3. Set the following settings:
   - **Root Directory**: `server`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npx tsx src/index.ts`
4. Add Environment Variables:
   - `PORT` = `3001`
   - `JWT_SECRET` = `your_secure_secret_key_2026`
   - `DB_PATH` = `/app/data/db.json`
5. Click **Create Web Service**. Render will give you a backend URL like `https://dineflow-api.onrender.com`.

### Option B: Free Deploy on Railway
1. Go to **[https://railway.app](https://railway.app)**.
2. Click **New Project** ➔ **Deploy from GitHub repo** ➔ select `server` folder.
3. Railway will give you a live URL like `https://dineflow-api.up.railway.app`.

---

## 🔗 Step 4: Link Your Netlify Frontend to Your Live Backend

Once your backend is deployed:

1. In your **Netlify Dashboard**, go to **Site configuration** ➔ **Environment variables**.
2. Click **Add a variable**:
   - **Key**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.onrender.com` *(your live backend URL)*
3. Go to **Deploys** tab ➔ click **Trigger deploy** ➔ **Clear cache and deploy site**.

Your Netlify frontend is now fully connected to your cloud backend with live database storage, QR ordering, and real-time kitchen audio notifications!

---

## 🛠️ Files Configured for Netlify in Your Codebase

Your project already includes all necessary Netlify files:
- **`client/public/_redirects`**: Configured with `/*  /index.html  200` to prevent 404 errors on browser page reloads and deep URLs (e.g. `/owner/orders`, `/m/:token`).
- **`client/netlify.toml`**: Contains security headers and build optimization settings.
- **`client/src/lib/api.ts`**: Automatically detects `VITE_API_URL` on Netlify.
- **`client/src/context/SocketContext.tsx`**: Automatically connects real-time WebSockets to your cloud backend.
