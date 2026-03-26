# Mathify - Starter Kit

An Electron-based math learning application for Filipino students.

## Project Structure

```
Mathify/
├── backend/                   # Backend/server files
│   ├── main.js               # Electron main process (app entry point)
│   ├── render.js             # Preload script (navigation functions)
│   ├── database.js           # Database operations
│   ├── logger.js             # Logging utility
│   ├── rule-based-ai.js      # AI recommendation system
│   ├── curriculum-question-generator.js  # Question generation
│   └── ai-adapter.js         # AI integration adapter
│
├── scripts/                   # Utility and setup scripts
│   ├── seed-curriculum.js    # Seed curriculum data
│   ├── seed-grade1-quarters.js  # Seed Grade 1 quarters
│   ├── test-backend.js       # Backend testing
│   └── ...                   # Other utility scripts
│
├── src/                       # Frontend files
│   ├── landing.html          # Landing page (opens when app starts)
│   ├── auth.html             # Login/Register page
│   ├── student-dashboard.html/js/css  # Student dashboard
│   ├── admin-dashboard.html  # Admin dashboard
│   └── style.css             # Global styles
│
├── assets/                    # Images and static assets
├── docs/                      # Documentation
├── logs/                      # Application logs
└── package.json               # Project dependencies
```

## Getting Started

### Quick Start (5 minutes)

1. **Install Node.js** (if not already installed)
   - Download from: https://nodejs.org/ (Version 16+)

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the application:**
   ```bash
   npm start
   ```

4. **Seed curriculum data** (recommended):
   ```bash
   npm run seed:curriculum
   npm run seed:grade1
   ```

### Default Admin Account

- **Email:** admin@mathify.local
- **Password:** Admin123!
-  **Change password immediately after first login!**

### Detailed Setup

For detailed setup instructions, troubleshooting, and platform-specific notes, see:
- **Quick Start:** `QUICK_START.md`
- **Full Setup Guide:** `docs/SETUP_GUIDE.md`
- **Installation Checklist:** `INSTALLATION_CHECKLIST.md`

## File Organization

### Core Files (Do not modify unless necessary)
- `backend/main.js` - Handles Electron window creation and navigation routing
- `backend/render.js` - Provides navigation functions to all pages
- `backend/database.js` - Database operations and schema
- `package.json` - Project configuration

### Page Files (Edit these for your features)
- `src/landing.html` - Landing page shown when app opens SEB
- `src/auth.html` - Login and registration forms SEB
- `src/student-dashboard.html` - Student interface RON
- `src/admin-dashboard.html` - Admin interface NOEL

## Navigation

All pages can use these navigation functions (loaded via `render.js`):

- `window.navigateToLanding()` - Go to landing page
- `window.navigateToAuth()` - Go to login/register page
- `window.navigateToStudentDashboard()` - Go to student dashboard
- `window.navigateToAdminDashboard()` - Go to admin dashboard

Example usage in HTML:
```html
<button onclick="window.navigateToAuth()">Get Started</button>
```

## Development Guidelines

1. **Each team member can work on their assigned page independently**
2. **Keep all HTML pages in the `src/` folder**
3. **Use inline styles or link to external CSS files as needed**
4. **Include `<script src="../render.js"></script>` at the bottom of each HTML page for navigation**

## Current Flow

1. App opens → `landing.html`
2. Click "Get Started" → `auth.html`
3. Login/Register → `student-dashboard.html` or `admin-dashboard.html`
4. Logout → `auth.html`

## Notes

- All pages are self-contained with their own styles
- Navigation is handled through Electron IPC (Inter-Process Communication)
- The app window size is set to 1280x800 in `main.js`








