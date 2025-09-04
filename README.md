# 🎓 LICEA Educational Platform

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9-blue.svg)](https://www.typescriptlang.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg)](https://mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A complete **Learning Management System (LMS)** built with modern web technologies. LICEA provides everything needed to manage educational institutions, courses, students, and instructors in one comprehensive platform.

> **LICEA** stands for *Learning • Innovation • Collaboration • Excellence • Achievement*

![LICEA Platform Preview](docs/images/preview.png)

## ✨ Features

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

## 🚀 Quick Start

### Windows (Automatic)
```powershell
git clone https://github.com/yourusername/licea-educational-platform.git
cd licea-educational-platform
.\install.ps1
.\start-all.ps1
```

### Manual Installation
```bash
git clone https://github.com/yourusername/licea-educational-platform.git
cd licea-educational-platform

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
