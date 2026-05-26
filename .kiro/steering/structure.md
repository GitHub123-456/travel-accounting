# Project Structure

## Repository Layout
```
travel-accounting/
├── frontend/           # React frontend application
├── backend/            # Express backend API
└── docs/              # Project documentation
```

## Frontend Structure (`frontend/`)
```
frontend/
├── src/
│   ├── api/           # API client modules (one per domain)
│   │   ├── auth.js
│   │   ├── user.js
│   │   ├── accountBook.js
│   │   ├── transaction.js
│   │   ├── participant.js
│   │   ├── splitBill.js
│   │   └── exchangeRate.js
│   ├── components/    # Reusable React components
│   ├── pages/         # Page-level components (one per route)
│   ├── utils/         # Utility functions
│   │   └── request.js # Axios instance with interceptors
│   ├── App.jsx        # Root component with routing
│   ├── main.jsx       # Application entry point
│   └── index.css      # Global styles
├── index.html
├── vite.config.js
└── package.json
```

### Frontend Conventions
- Page components live in `pages/` with matching `.css` files
- Each page component has PascalCase naming (e.g., `AccountBookList.jsx`)
- Reusable components go in `components/`
- API calls are organized by domain in `api/` directory
- All API calls use async/await pattern
- Token stored in localStorage, attached via Axios interceptor

## Backend Structure (`backend/`)
```
backend/
├── src/
│   ├── controllers/   # Request handlers (class-based)
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── accountBookController.js
│   │   ├── transactionController.js
│   │   ├── participantController.js
│   │   ├── splitBillController.js
│   │   └── exchangeRateController.js
│   ├── middleware/    # Express middleware
│   │   └── auth.js    # JWT authentication
│   ├── routes/        # Route definitions
│   │   └── index.js   # Central route registry
│   ├── config/        # Configuration modules
│   │   └── database.js # MySQL connection pool
│   ├── utils/         # Utility functions
│   │   └── response.js # Standardized API responses
│   └── app.js         # Express app setup and entry point
├── database/          # SQL scripts
│   └── schema.sql     # Database schema
├── uploads/           # User-uploaded files
├── .env.example       # Environment variable template
└── package.json
```

### Backend Conventions
- Controllers are classes exported as singleton instances
- All routes prefixed with `/api`
- Use `ResponseUtil.success()` and `ResponseUtil.error()` for responses
- Database queries use parameterized statements (SQL injection prevention)
- JWT middleware protects authenticated routes
- All async operations use try-catch error handling

## Database Schema
Core tables:
- `users` - User accounts
- `account_books` - Trip account books
- `transactions` - Expense records
- `participants` - Trip participants
- `transaction_participants` - Many-to-many relationship
- `exchange_rates` - Currency rates per account book
- `verification_codes` - Password reset codes

## API Response Format
All API responses follow this structure:
```javascript
{
  code: 200,        // HTTP status code
  message: "成功",  // User-facing message
  data: {...}       // Response payload (null on error)
}
```

## File Naming
- Backend: camelCase for files (e.g., `authController.js`)
- Frontend: PascalCase for components (e.g., `Login.jsx`)
- Frontend: camelCase for utilities (e.g., `request.js`)
- CSS files match their component names (e.g., `Login.css`)