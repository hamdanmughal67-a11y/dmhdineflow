# 🍽️ DMH DineFlow — Multi-Restaurant SaaS & Real-Time QR Table Ordering System

> **Smarter Dining, Faster Service**  
> A complete, production-grade, modern multi-tenant SaaS platform for restaurant operations, contactless QR table ordering, interactive Kitchen Display System (KDS), and Super Admin subscription control.

---

## 🌟 Key Panels & Features

### 1. 🛡️ Super Admin Control Center (`/admin`)
- **Platform Analytics**: Global metrics for Total Restaurants, Active vs Suspended, Today's Orders & Today's Platform Revenue.
- **Tenant Provisioning**: Add restaurants with automatic owner account creation, subscription dates, and operational hours.
- **Access Control & Gating**: One-click software suspension (instantly locks owner portal & blocks customer ordering) and reactivation.
- **Subscription Management**: Track paid/pending statuses and plan tiers.
- **System Audit Trail**: Immutable log of administrative actions and security events.

### 2. 🏪 Restaurant Owner Operations Portal (`/owner`)
- **Live Daily Operations**: Dynamic KPI cards for Today's Orders, Kitchen Prep Queue, Ready to Serve, and Confirmed Revenue.
- **Menu Management**:
  - **Categories**: Create, edit, sort order, and enable/disable.
  - **Dishes & Items**: Rich descriptions, base prices, portion variants (*Half/Full*, *Small/Medium/Large*), and instant **Availability ON/OFF toggles**.
- **Table & Secure QR System**:
  - Single table creation & **Bulk Table Generator** (e.g. create 10 tables in 1 second).
  - Unique unguessable secure QR tokens (`/m/:secureToken`).
  - View individual QR codes, Download PNG, and **Bulk Download All QRs as a ZIP archive** or printable multi-table sheet.
  - Active table session monitoring with **Close Table Session** button.
- **Orders & History**: Filter by Today, Yesterday, 7 Days, Month, or Status with detailed modal breakdown.
- **Reports & Analytics**: Charts for Revenue & Order Volume timelines, top-selling dishes, and average order values.
- **Settings**: Business hours, emergency "Accept Orders ON/OFF" toggle, tax %, service charge %, and currency configuration.

### 3. 👨‍🍳 Kitchen Display System — Live KDS (`/kitchen`)
- **Touch-Optimized Kanban**: 5 columns (`NEW`, `ACCEPTED`, `COOKING`, `READY`, `COMPLETED`).
- **Real-Time Audio Alerts**: Dual-tone chime alerts kitchen staff upon new order arrival (powered by Web Audio API).
- **One-Click Progression**: `Accept Order` ➔ `Start Cooking` ➔ `Mark Ready` ➔ `Completed`.

### 4. 📱 Mobile Customer QR Experience (`/m/:qrToken`)
- **Zero Registration Needed**: Scan QR placed on table ➔ view restaurant menu ➔ add to cart ➔ place order.
- **Multi-Guest Shared Session**: Multiple people seated at Table 3 can order independently; orders aggregate into the active table session.
- **Live Real-Time Stepper**: Tracks preparation progress (`Received` ➔ `Accepted` ➔ `Cooking` ➔ `Ready` ➔ `Completed`) with zero page refreshes.
- **Server-Side Validation**: Strict backend price calculation and availability verification.

---

## 🚀 How to Run Locally on Your Laptop

### Prerequisites
- Node.js (v18+ or v20+ or v24+)
- npm

### Step 1: Start the Backend Server
Open a terminal in `scratch/dmh-dineflow/server`:
```powershell
cd C:\Users\HAMDAN\.gemini\antigravity\scratch\dmh-dineflow\server
npm run dev
```
*Backend runs on `http://localhost:3001`*

### Step 2: Start the Frontend Client
Open a second terminal in `scratch/dmh-dineflow/client`:
```powershell
cd C:\Users\HAMDAN\.gemini\antigravity\scratch\dmh-dineflow\client
npm run dev
```
*Frontend runs on `http://localhost:5173`*

*(Or simply double-click `start-dev.bat` in `scratch/dmh-dineflow`)*

---

## 🔑 Demo Login Credentials

| Role | Email | Password | Direct Link |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@dineflow.com` | `admin123` | `http://localhost:5173/admin` |
| **Restaurant Owner (Royal Karahi)** | `owner@royalkarahi.com` | `owner123` | `http://localhost:5173/owner` |
| **Kitchen Staff (Royal Karahi)** | `kitchen@royalkarahi.com` | `kitchen123` | `http://localhost:5173/kitchen` |
| **Restaurant Owner (Artisan Pizza)** | `owner@artisan.com` | `owner123` | `http://localhost:5173/owner` |

---

## 📱 How to Test QR Ordering on Your Mobile Phone

1. Ensure your laptop and smartphone are connected to the **same Wi-Fi network**.
2. Find your laptop's local IP address (e.g. `192.168.1.15` by running `ipconfig` in cmd).
3. Open `http://localhost:5173/owner/tables` on your laptop and click **View QR** on Table 3.
4. Scan the QR code with your phone camera, or open on your phone:
   `http://<YOUR-LAPTOP-IP>:5173/m/<QR-TOKEN>`
5. Place an order on your phone and watch it instantly appear on the laptop's Kitchen KDS screen with audio alert!
