`<div align="center">
  <img src="Web/src/assets/cvsu-logo.png" alt="UNISYNC Logo" width="100" height="100">
  
  # UNISYNC
  
  [![React](https://img.shields.io/badge/React-19.0.0-61DAFB?style=flat-square&logo=react&logoColor=white)](https://reactjs.org/)
  [![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
  [![Firebase](https://img.shields.io/badge/Firebase-11.1-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
  [![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
  [![Status](https://img.shields.io/badge/Status-In%20Development-yellow?style=flat-square)]()
  
  **Unified Campus Management System for CvSU Imus Campus**
  
  [Live Demo](https://unisync-web-app-ac1fd.web.app) · [Report Bug](https://github.com/JerichoDelosReyes/unisync-web-app/issues) · [Request Feature](https://github.com/JerichoDelosReyes/unisync-web-app/issues)
</div>

---

## About

UNISYNC is a comprehensive web application that streamlines campus operations at Cavite State University - Imus Campus. It provides a unified platform for announcements, room scheduling, organization management, and campus facilities.

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 19, Vite 5, Tailwind CSS 3 |
| **Backend** | Firebase (Auth, Firestore, Storage, Hosting) |
| **State** | React Context API |
| **PWA** | Vite PWA Plugin, Workbox |
| **Build** | PostCSS, ESBuild |

## Features

- 🔐 **Role-Based Auth** - Students, Faculty, Admin with institutional email validation
- 📢 **Announcements** - Campus-wide and targeted announcements with moderation
- 🚪 **Room Scheduling** - Real-time room status with Best-Fit booking algorithm
- 🏢 **Building Directory** - Floor-by-floor mapping of campus facilities
- 👥 **Organizations** - Management for all 13 campus organizations
- 🤖 **AI Assistant** - Natural language queries for campus information

## Quick Start

```bash
# Clone the repository
git clone https://github.com/JerichoDelosReyes/unisync-web-app.git
cd unisync-web-app

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Firebase config

# Start development server
npm run dev
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |

## Project Structure

```
unisync-web-app/
├── Web/src/
│   ├── components/     # Reusable UI components
│   ├── contexts/       # React Context providers
│   ├── pages/          # Page components
│   ├── services/       # Firebase service functions
│   └── styles/         # Global styles
├── firebase/           # Firestore & Storage rules
└── dist/               # Production build
```

## Contributing

Contributions are welcome! Please read our [Contributing Guide](.github/CONTRIBUTING.md) and [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## Security

Found a vulnerability? Please read our [Security Policy](.github/SECURITY.md) for responsible disclosure.

## Authors

- **Jericho Delos Reyes** - [@JerichoDelosReyes](https://github.com/JerichoDelosReyes)
- **Lee Adrian Norona** - [@leeadriannorona](https://github.com/leeadriannorona)

## License

This project is for educational purposes at CvSU Imus Campus.

---

<div align="center">
  Made with ❤️ for CvSU Imus Campus
</div>
