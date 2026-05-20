# San Roque - Barangay Information Management System

A modern full-stack Barangay Information System built with React, Node.js, Express, and MySQL.

## Features

- **Role-based Authentication** (Admin/Resident)
- **Dashboard** with real-time statistics and recent activities
- **Residents Management** (CRUD operations) - Admin only
- **Projects Management** - Admin only
- **Barangay Officials** - Admin only
- **Session/Schedule Management** - Admin only
- **Document Request System** - Residents can request, Admins can approve/reject/release
- **Activity Log** - Admin only
- **Age Demographics** - Admin only
- **Archives** - Admin only
- **User Profile** - View personal information

## Tech Stack

### Backend
- Node.js
- Express.js
- Prisma ORM
- MySQL
- JWT Authentication
- bcryptjs for password hashing
- express-validator for validation
- Helmet, CORS, Rate limiting for security

### Frontend
- React 18
- React Router v6
- Material-UI (MUI)
- Axios
- Context API for state management
- Font Awesome icons

## Prerequisites

- Node.js (v16 or higher)
- MySQL (v5.7 or higher)
- npm or yarn

## Installation

### 1. Clone the repository

```bash
cd san-roque-react
```

### 2. Install dependencies

```bash
# Install server dependencies
npm install

# Install client dependencies
cd client && npm install && cd ..
```

### 3. Set up the database

Create a MySQL database named `brgy_info_sys`:

```sql
CREATE DATABASE brgy_info_sys CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

### 4. Configure environment variables

Copy `.env.example` to `.env` and update the values:

```bash
cp .env.example .env
```

Edit `.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
DATABASE_URL="mysql://root:@localhost:3306/brgy_info_sys"
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

### 5. Run database migrations

```bash
npx prisma migrate dev --name init
```

### 6. Seed the database (optional)

Create an admin user:

```bash
node server/seed.js
```

### 7. Start the development servers

```bash
# Run both server and client concurrently
npm run dev

# Or run separately:
# Terminal 1 - Server
npm run dev:server

# Terminal 2 - Client
npm run dev:client
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Build for Production

```bash
# Build the client
npm run build

# Start the production server
npm start
```

## Default Admin Credentials

After running the seed script:
- Username: `admin`
- Password: `admin123`

**Important**: Change the default password in production!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Users (Admin only)
- `GET /api/users` - List all users
- `GET /api/users/:id` - Get specific user

### Residents
- `GET /api/residents` - List all residents
- `GET /api/residents/:id` - Get specific resident
- `POST /api/residents` - Create resident (Admin)
- `PUT /api/residents/:id` - Update resident (Admin)
- `DELETE /api/residents/:id` - Delete resident (Admin)

### Projects (Admin)
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project

### Officials (Admin)
- `GET /api/officials` - List all officials
- `POST /api/officials` - Add official
- `PUT /api/officials/:id` - Update official
- `DELETE /api/officials/:id` - Remove official

### Sessions (Admin)
- `GET /api/sessions` - List all sessions
- `POST /api/sessions` - Create session
- `PUT /api/sessions/:id` - Update session
- `DELETE /api/sessions/:id` - Delete session

### Documents
- `GET /api/documents` - List requests
- `POST /api/documents` - Create request
- `PUT /api/documents/:id/status` - Update status (Admin only)

### Activity Log (Admin)
- `GET /api/activity/log` - Get activity history
- `GET /api/activity/dashboard` - Get recent activities for dashboard

## Project Structure

```
san-roque-react/
├── client/                 # React frontend
│   └── src/
│       ├── components/
│       │   └── Layout.jsx
│       ├── context/
│       │   └── AuthContext.jsx
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Login.jsx
│       │   ├── Register.jsx
│       │   ├── Residents.jsx
│       │   ├── Projects.jsx
│       │   ├── Officials.jsx
│       │   ├── Sessions.jsx
│       │   ├── Documents.jsx
│       │   ├── Profile.jsx
│       │   ├── Archives.jsx
│       │   ├── ActivityLog.jsx
│       │   └── AgeDemographics.jsx
│       ├── services/
│       │   └── api.js
│       ├── App.jsx
│       ├── main.jsx
│       └── index.css
├── server/                 # Node.js backend
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   └── validate.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── residents.js
│   │   ├── projects.js
│   │   ├── officials.js
│   │   ├── sessions.js
│   │   ├── documents.js
│   │   └── activity.js
│   ├── index.js
│   └── seed.js
├── prisma/
│   └── schema.prisma
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Database Schema

The database consists of the following main tables:
- `users` - User accounts (Admin/Resident)
- `residents` - Resident information
- `projects` - Community projects
- `officials` - Barangay officials
- `sessions` - Meeting sessions
- `document_requests` - Document request tracking
- `activity_log` - System activity logs
- `archives` - File archives

See `prisma/schema.prisma` for the complete schema.

## Security Features

- JWT-based authentication
- Password hashing with bcryptjs
- Rate limiting on API endpoints
- CORS protection
- Input validation with express-validator
- Helmet for security headers
- Role-based access control

## License

This project is created for Barangay San Roque.
