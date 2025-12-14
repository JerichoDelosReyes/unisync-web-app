<div align="center">
  <img src="public/assets/images/unisync-logo.png" alt="UNISYNC Logo" width="120" height="120">
  
  # UNISYNC - CvSU Imus Campus Portal
  
  [![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://reactjs.org/)
  [![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
  [![Status](https://img.shields.io/badge/Status-In%20Development-yellow?style=for-the-badge)]()
  
  **A unified campus management system for Cavite State University - Imus Campus**
  
  [Demo](#demo) • [Features](#features) • [Installation](#installation) • [Usage](#usage) • [Contributing](#contributing)
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
- Institutional email validation (`@cvsu.edu.ph`)
- Automatic role detection (Student, Faculty, Guard, Admin/MIS)
- Specific dashboard routing based on user role
- Guard-specific email authentication (`imus.guard@cvsu.edu.ph`)

### 📢 Announcement System
- Campus-wide and section-specific announcements
- Role-based posting privileges
- Priority levels and audience targeting
- Rich text formatting support

### 🚪 Room Scheduling & Access
- Real-time room status indicators (Vacant/Occupied/Maintenance)
- **Best-Fit Algorithm** for instant room booking
- Room unlock requests for scheduled classes
- Class Representative "Mark as Vacant" feature
- Guard dispatch system for access requests

### 🏢 Building Directory
- Floor-by-floor mapping of all campus buildings
- Searchable room and facility database
- Detailed amenity information (AC, capacity, equipment)
- 7 major buildings: New Building, Old Building, Gymnasium, Canteen, HM Lab, Covered Court, Administration

### 👥 Organization Management
- All 13 campus organizations
- Tiered visibility (Campus-wide vs Members-only)
- Officer privileges for announcements
- Membership management

### 🤖 AI Assistant (Chatbot)
- Facility locator with natural language queries
- Schedule assistance
- Organization information
- Campus navigation help

### 📊 Role-Specific Dashboards

| Role | Features |
|------|----------|
| **Student** | Schedule view, announcements feed, room status, organization updates |
| **Faculty** | Teaching load, instant booking, ad-hoc room requests, unlock interface |
| **Guard** | Dispatch dashboard, request verification, room unlock management |
| **Admin** | System health, moderation logs, user management, override controls |

### 🔧 Additional Features
- Report Issue module (equipment, schedule errors, offensive content)
- Emergency directory with campus contacts
- Mobile-responsive design
- Real-time notifications

---

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **React 19** | Frontend framework |
| **React Router DOM** | Client-side routing |
| **Lucide React** | Icon library |
| **CSS3** | Styling with CSS custom properties |
| **Context API** | State management |

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

## 🎨 Design System

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| CvSU Green | `#0D5C2F` | Primary brand color |
| CvSU Gold | `#FFD700` | Accent color |
| Success | `#16a34a` | Positive states |
| Warning | `#eab308` | Caution states |
| Error | `#dc2626` | Error states |
| Info | `#0ea5e9` | Informational |

### Typography

- **Font Family**: Inter, system-ui, sans-serif
- **Headings**: 600-700 weight
- **Body**: 400-500 weight

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Coding Guidelines

- Follow React best practices
- Use functional components with hooks
- Maintain consistent naming conventions
- Write meaningful commit messages
- Test your changes before submitting

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Jericho Delos Reyes**

- GitHub: [@JerichoDelosReyes](https://github.com/JerichoDelosReyes)

---

## 🙏 Acknowledgments

- Cavite State University - Imus Campus
- Department of Information Technology
- All contributors and testers

---

<div align="center">
  <p>Made with ❤️ for CvSU Imus Campus</p>
  <p>© 2025 UNISYNC. All rights reserved.</p>
</div>
