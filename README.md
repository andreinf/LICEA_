# LICEA - Educational Platform

A complete educational platform similar to Classroom or Teams, with backend, frontend, database, security, reports, and artificial intelligence features.

## Features

- **Multi-role system**: Admin, Instructor, and Student roles
- **Course Management**: Create and manage courses, materials, and assignments
- **Student Tracking**: Attendance monitoring and performance analysis
- **AI-Powered Features**: 
  - Performance analysis and risk detection
  - Educational chatbot assistant
  - Smart scheduling engine
- **Comprehensive Security**: JWT authentication, password encryption, email verification
- **Reports & Analytics**: Parametrized reports with charts and visualizations
- **Responsive UI**: Modern React interface with TailwindCSS

## Technology Stack

### Backend
- Node.js + Express
- MySQL Database
- JWT Authentication
- bcrypt Password Encryption
- Nodemailer for Email Services

### Frontend
- React 18
- TailwindCSS
- Chart.js/Recharts for Analytics
- Axios for API Communication

### AI Features
- Natural Language Processing for Chatbot
- Statistical Analysis for Performance Monitoring
- Machine Learning for Risk Detection

## Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository-url>
   cd licea-educational-platform
   ```

2. **Database Setup**
   ```bash
   # Create MySQL database
   mysql -u root -p < database/schema.sql
   mysql -u root -p < database/seed.sql
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Configure your environment variables
   npm run dev
   ```

4. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm start
   ```

## Project Structure

```
licea-educational-platform/
├── backend/                 # Node.js + Express API
├── frontend/               # React application
├── database/               # Database schemas and scripts
├── docs/                   # Documentation
├── scripts/                # Setup and deployment scripts
└── README.md
```

## API Documentation

The API documentation is available at `http://localhost:3001/api-docs` when running the backend server.

## Contributing

1. Follow the coding standards defined in each module
2. Write tests for new features
3. Update documentation as needed
4. Ensure security best practices

## License

MIT License - See LICENSE file for details.
