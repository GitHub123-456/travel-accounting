# Technology Stack

## Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Router**: React Router v6
- **UI Library**: Ant Design Mobile (mobile-first components)
- **HTTP Client**: Axios
- **Date Handling**: Day.js
- **Charts**: Recharts

## Backend
- **Runtime**: Node.js 18+
- **Framework**: Express
- **Database**: MySQL 8.0 with mysql2 driver
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **File Upload**: Multer
- **Validation**: express-validator
- **Environment**: dotenv

## Development Tools
- **Backend Dev Server**: nodemon
- **Frontend Dev Server**: Vite dev server

## Common Commands

### Backend
```bash
cd backend
npm install              # Install dependencies
npm run dev             # Start development server (port 3000)
npm start               # Start production server
```

### Frontend
```bash
cd frontend
npm install              # Install dependencies
npm run dev             # Start development server (port 5173)
npm run build           # Build for production
npm run preview         # Preview production build
```

### Database
```bash
# Create database
mysql -u root -p
CREATE DATABASE travel_accounting CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Import schema
mysql -u root -p travel_accounting < backend/database/schema.sql
```

## Environment Configuration
Backend requires `.env` file (copy from `.env.example`):
- Database credentials (host, user, password, database)
- JWT secret and expiration
- Server port
- Verification code expiration

## API Communication
- Backend runs on port 3000
- Frontend runs on port 5173
- Frontend proxies `/api` requests to backend during development
- All API endpoints prefixed with `/api`