# LICEA Educational Platform - Development Guide

## Overview

LICEA is a comprehensive educational platform built with modern web technologies. This guide provides information for developers working on the project.

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: express-validator
- **Security**: helmet, bcrypt, express-rate-limit
- **Documentation**: Swagger/OpenAPI
- **Email**: Nodemailer

### Frontend
- **Framework**: React 18 with TypeScript
- **Styling**: TailwindCSS
- **Routing**: React Router
- **Forms**: React Hook Form
- **HTTP Client**: Axios
- **Charts**: Chart.js / Recharts
- **Icons**: Heroicons

## Project Structure

```
licea-educational-platform/
├── backend/
│   ├── config/            # Database and configuration
│   ├── controllers/       # Route handlers
│   ├── middleware/        # Authentication, logging, etc.
│   ├── models/           # Data models
│   ├── routes/           # API routes
│   ├── services/         # Business logic
│   ├── utils/            # Helper functions
│   └── server.js         # Main server file
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   ├── context/      # React contexts
│   │   ├── services/     # API services
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # Helper functions
│   └── public/           # Static assets
├── database/
│   ├── schema.sql        # Database schema
│   └── seed.sql          # Sample data
├── docs/                 # Documentation
└── scripts/              # Setup scripts
```

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MySQL (v8.0 or higher)

### Quick Setup
Run the setup script for your platform:

**Windows:**
```powershell
.\scripts\setup-windows.ps1
```

**Manual Setup:**

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd licea-educational-platform
   ```

2. **Setup Backend:**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   ```

4. **Setup Database:**
   ```bash
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```

### Environment Configuration

#### Backend (.env)
```env
PORT=3001
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_NAME=licea_platform
DB_USER=root
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
FRONTEND_URL=http://localhost:3000
```

#### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_APP_NAME=LICEA Educational Platform
```

## Running the Application

### Development Mode

1. **Start Backend:**
   ```bash
   cd backend
   npm run dev
   ```

2. **Start Frontend:**
   ```bash
   cd frontend
   npm start
   ```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - API Documentation: http://localhost:3001/api-docs

### Production Mode

1. **Build Frontend:**
   ```bash
   cd frontend
   npm run build
   ```

2. **Start Backend:**
   ```bash
   cd backend
   npm start
   ```

## Code Style and Standards

### Backend
- Use ES6+ features
- Follow RESTful API conventions
- Implement proper error handling
- Add input validation for all endpoints
- Use meaningful variable and function names
- Add JSDoc comments for functions
- Keep functions small and focused

### Frontend
- Use TypeScript for type safety
- Follow React best practices and hooks
- Use functional components
- Implement proper error boundaries
- Keep components small and reusable
- Use proper prop types and interfaces
- Follow consistent naming conventions

### Database
- Use descriptive table and column names
- Implement proper foreign key relationships
- Add indexes for performance
- Include audit fields (created_at, updated_at)
- Use transactions for complex operations

## Testing

### Backend Testing
```bash
cd backend
npm test
```

### Frontend Testing
```bash
cd frontend
npm test
```

## Security Considerations

### Authentication
- JWT tokens with short expiration times
- Refresh token rotation
- Password hashing with bcrypt
- Account lockout after failed attempts

### API Security
- Rate limiting on all endpoints
- Input validation and sanitization
- CORS configuration
- Helmet for security headers
- SQL injection prevention

### Frontend Security
- XSS prevention
- CSRF protection
- Secure token storage
- Input sanitization

## Database Management

### Migrations
Database schema changes should be tracked through migration files.

### Backup
Regular database backups are recommended:
```bash
mysqldump -u root -p licea_platform > backup_$(date +%Y%m%d).sql
```

### Seeding
Use the provided seed file for development data:
```bash
mysql -u root -p licea_platform < database/seed.sql
```

## API Documentation

The API is documented using Swagger/OpenAPI. Access the interactive documentation at:
```
http://localhost:3001/api-docs
```

## Deployment

### Environment Setup
1. Configure production environment variables
2. Set NODE_ENV=production
3. Configure reverse proxy (nginx)
4. Setup SSL certificates
5. Configure database connection pooling

### Build Process
1. Build frontend assets
2. Install production dependencies
3. Run database migrations
4. Start application with PM2 or similar

## Monitoring and Logging

### Logging
- Application logs in `logs/app.log`
- Error logs in `logs/errors.log`
- Audit logs in database

### Health Checks
- Backend health endpoint: `/health`
- Database connection monitoring
- System resource monitoring

## Contributing

1. Create a feature branch
2. Write tests for new functionality
3. Follow code style guidelines
4. Update documentation
5. Create pull request
6. Code review process

## Troubleshooting

### Common Issues

**Database Connection Error:**
- Check MySQL is running
- Verify credentials in .env
- Ensure database exists

**CORS Issues:**
- Check FRONTEND_URL in backend .env
- Verify cors configuration

**Authentication Issues:**
- Check JWT secrets are set
- Verify token expiration settings

**Build Errors:**
- Clear node_modules and reinstall
- Check Node.js version compatibility

## Performance Optimization

### Backend
- Database query optimization
- Connection pooling
- Caching strategies
- Compression middleware

### Frontend
- Code splitting
- Lazy loading
- Image optimization
- Bundle analysis

## Support and Resources

- API Documentation: `/api-docs`
- Database Schema: `database/schema.sql`
- Sample Data: `database/seed.sql`
- Setup Scripts: `scripts/`

For additional help, refer to the technology-specific documentation for React, Express, MySQL, and other dependencies used in the project.
