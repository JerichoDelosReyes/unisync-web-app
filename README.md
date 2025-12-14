<div align="center">
  <img src="public/assets/images/logo.png" alt="UNISYNC Logo" width="120" height="120">
  
  # UNISYNC - CvSU Imus Campus Portal
  
  [![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
  [![Status](https://img.shields.io/badge/Status-In%20Development-yellow?style=for-the-badge)]()
  
  **A unified campus management system for Cavite State University - Imus Campus**
</div>

---

## 📖 About

**UNISYNC** is a comprehensive web application designed to streamline campus operations at CvSU Imus Campus. It provides a unified platform for students, faculty, guards, and administrators to manage announcements, room scheduling, organization activities, and campus facilities.

### 🎯 Problem Statement

Campus communities often struggle with:
- Fragmented communication channels
- Inefficient room scheduling and access management
- Lack of real-time facility status updates
- Disconnected organization management

UNISYNC addresses these challenges by providing a single, integrated platform for all campus stakeholders.

---

## ✨ Features

### 🔐 Role-Based Authentication
Institutional email validation (`@cvsu.edu.ph`) with automatic role detection for Students, Faculty, Guards, and Admin/MIS. Features specific dashboard routing based on user role and guard-specific email authentication (`imus.guard@cvsu.edu.ph`).

### 📢 Announcement System
Campus-wide and section-specific announcements with role-based posting privileges. Includes priority levels, audience targeting, and rich text formatting support.

### 🚪 Room Scheduling & Access
Real-time room status indicators (Vacant/Occupied/Maintenance) with **Best-Fit Algorithm** for instant room booking. Includes room unlock requests for scheduled classes, Class Representative "Mark as Vacant" feature, and guard dispatch system for access requests.

### 🏢 Building Directory
Floor-by-floor mapping of all campus buildings with searchable room and facility database. Includes detailed amenity information (AC, capacity, equipment) for 7 major buildings: New Building, Old Building, Gymnasium, Canteen, HM Lab, Covered Court, and Administration.

### 👥 Organization Management
All 13 campus organizations with tiered visibility (Campus-wide vs Members-only). Features officer privileges for announcements and membership management.

### 🤖 AI Assistant (Chatbot)
Facility locator with natural language queries, schedule assistance, organization information, and campus navigation help.

### 📊 Role-Specific Dashboards

| Role | Features |
|------|----------|
| **Student** | Schedule view, announcements feed, room status, organization updates |
| **Faculty** | Teaching load, instant booking, ad-hoc room requests, unlock interface |
| **Guard** | Dispatch dashboard, request verification, room unlock management |
| **Admin** | System health, moderation logs, user management, override controls |

### 🔧 Additional Features
Report Issue module for equipment, schedule errors, and offensive content. Emergency directory with campus contacts, mobile-responsive design, and real-time notifications.

---

## 🚀 Installation

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/JerichoDelosReyes/unisync-web-app.git
   cd unisync-web-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open in browser**
   ```
   http://localhost:3000
   ```

---

## 💻 Usage

### Demo Accounts

For testing purposes, use these demo credentials:

| Role | Email | Password |
|------|-------|----------|
| Student | `student@cvsu.edu.ph` | `password123` |
| Faculty | `faculty@cvsu.edu.ph` | `password123` |
| Guard | `imus.guard@cvsu.edu.ph` | `password123` |
| Admin | `admin@cvsu.edu.ph` | `password123` |

### Available Scripts

```bash
# Development server
npm start

# Production build
npm run build

# Run tests
npm test

# Eject configuration (irreversible)
npm run eject
```

---

## 📁 Project Structure

```
unisync-web-app/
├── public/
│   ├── assets/images/          # Static images and logos
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── common/             # Reusable UI components
│   │   │   ├── Alert.js
│   │   │   ├── Badge.js
│   │   │   ├── Button.js
│   │   │   ├── Card.js
│   │   │   ├── FloatingChatbot.js
│   │   │   ├── Input.js
│   │   │   ├── Loader.js
│   │   │   ├── Modal.js
│   │   │   └── Select.js
│   │   └── layout/             # Layout components
│   │       ├── MainLayout.js
│   │       ├── Navbar.js
│   │       └── Sidebar.js
│   ├── context/
│   │   └── AuthContext.js      # Authentication state management
│   ├── pages/
│   │   ├── announcements/      # Announcements module
│   │   ├── assistant/          # AI Chatbot
│   │   ├── auth/               # Login page
│   │   ├── dashboard/          # Role-specific dashboards
│   │   ├── directory/          # Building & Emergency directories
│   │   ├── facilities/         # Room scheduling
│   │   ├── organizations/      # Org management
│   │   ├── report/             # Issue reporting
│   │   └── schedule/           # Schedule viewer
│   ├── styles/
│   │   ├── components.css      # Component styles
│   │   ├── layouts.css         # Layout styles
│   │   └── theme.css           # Theme variables
│   ├── App.js                  # Main application component
│   └── index.js                # Entry point
├── package.json
└── README.md
```

---

## 👨‍💻 Authors

**Jericho Delos Reyes**
- GitHub: [@JerichoDelosReyes](https://github.com/JerichoDelosReyes)

**Lee Adrian Norona**
- GitHub: [@leeadriannorona](https://github.com/leeadriannorona)

---

<div align="center">
  <p>Made with ❤️ for CvSU Imus Campus</p>
  <p>© 2025 UNISYNC. All rights reserved.</p>
</div>
