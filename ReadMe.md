// ============================================
// FILE: README.md
// ============================================
# Agriformation Initiative - Backend API

Backend system for managing volunteers, applications, and administrative tasks for the Agriformation Initiative.

## Features

### Volunteer Management
- Public volunteer application submission
- Volunteer profile management
- Application review and approval workflow
- Program assignment tracking
- Hours and certificates tracking

### Admin Dashboard
- View and manage all volunteer applications
- Approve/reject applications
- Assign volunteers to programs
- Track volunteer activities
- Dashboard statistics

### Superadmin Controls
- Create and manage admin accounts
- User role management
- Activate/deactivate users
- Full system oversight

## Tech Stack
- **Node.js** + **Express.js** - Backend framework
- **MongoDB** + **Mongoose** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing

## Installation

1. Clone the repository
```bash
git clone <your-repo-url>
cd agriformation-backend
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file
```bash
cp .env.example .env
```

4. Update `.env` with your values
```
PORT=5000
MONGODB_URI=mongodb://localhost:27017/agriformation
JWT_SECRET=your_super_secret_key_change_this
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

5. Create superadmin account
```bash
node utils/seedSuperadmin.js
```

6. Start the server
```bash
npm run dev
```

## API Endpoints

### Authentication
```
POST   /api/auth/register          - Register new user (volunteer)
POST   /api/auth/login             - Login
GET    /api/auth/me                - Get current user
POST   /api/auth/register-admin    - Create admin (superadmin only)
```

### Volunteers (Public & Private)
```
POST   /api/volunteers/apply       - Submit volunteer application (public)
GET    /api/volunteers/profile     - Get volunteer profile (private)
PUT    /api/volunteers/profile     - Update volunteer profile (private)
```

### Admin Routes (Admin & Superadmin)
```
GET    /api/admin/applications                  - Get all applications
PUT    /api/admin/applications/:id/review       - Review application
GET    /api/admin/volunteers                    - Get all volunteers
GET    /api/admin/volunteers/:id                - Get volunteer details
PUT    /api/admin/volunteers/:id/status         - Update volunteer status
POST   /api/admin/volunteers/:id/assign         - Assign to program
GET    /api/admin/dashboard/stats               - Dashboard statistics
```

### Superadmin Only Routes
```
GET    /api/admin/users                    - Get all users
POST   /api/admin/users/create-admin       - Create admin user
PUT    /api/admin/users/:id/role           - Update user role
PUT    /api/admin/users/:id/toggle-status  - Activate/deactivate user
```

## User Roles & Permissions

### Volunteer
- Submit applications
- View and update own profile
- View assigned programs

### Admin
- Review volunteer applications
- Manage volunteers
- Assign volunteers to programs
- View dashboard statistics

### Superadmin
- All admin permissions
- Create/manage admin accounts
- Manage user roles
- Activate/deactivate users

## Authentication

All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format

Success Response:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

Error Response:
```json
{
  "success": false,
  "message": "Error message"
}
```

## Database Models

### User
- fullName, email, password
- role: superadmin | admin | volunteer
- isActive, lastLogin
- timestamps

### Volunteer
- user (ref to User)
- preferredRole, aboutYourself
- skills, availability, location
- status: pending | approved | rejected | on-hold
- assignedPrograms, hoursContributed
- certificates

### VolunteerApplication
- fullName, email, preferredRole
- aboutYourself
- status: pending | reviewed | accepted | rejected
- processedBy, processedAt

## Development

Run in development mode with auto-restart:
```bash
npm run dev
```

Run in production:
```bash
npm start
```

## Next Steps

1. **Email Integration**: Add email notifications for application status
2. **File Upload**: Implement certificate generation and upload
3. **Analytics**: Add detailed reporting and analytics
4. **Notifications**: Real-time notifications for admins
5. **Activity Logs**: Track all admin actions

## Security Notes

- Always use strong JWT_SECRET in production
- Change default superadmin password immediately
- Use HTTPS in production
- Implement rate limiting for public endpoints
- Add input validation and sanitization
- Enable CORS only for trusted domains

## Support

For questions or issues, contact:
- Email: theagriformation.project@gmail.com
- LinkedIn: https://www.linkedin.com/company/agriformation-initiative/

---

Built with ❤️ for Agriformation Initiative
Transforming Agricultural Education in Nigeria