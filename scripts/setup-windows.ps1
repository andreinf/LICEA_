# LICEA Educational Platform - Windows Setup Script
# This script sets up the entire LICEA platform on Windows

Write-Host "🎓 LICEA Educational Platform Setup" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found. Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check if npm is installed
try {
    $npmVersion = npm --version
    Write-Host "✅ npm found: $npmVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ npm not found. Please install Node.js which includes npm." -ForegroundColor Red
    exit 1
}

# Check if MySQL is available (optional)
Write-Host ""
Write-Host "📊 Database Setup" -ForegroundColor Yellow
Write-Host "=================" -ForegroundColor Yellow
Write-Host "Make sure you have MySQL installed and running."
Write-Host "You can use XAMPP, WAMP, or install MySQL separately."
Write-Host "Default configuration expects MySQL on localhost:3306"
Write-Host ""

# Setup Backend
Write-Host "🔧 Setting up Backend..." -ForegroundColor Yellow
Write-Host "========================" -ForegroundColor Yellow

try {
    Set-Location -Path "backend"
    
    if (!(Test-Path "node_modules")) {
        Write-Host "📦 Installing backend dependencies..."
        npm install
    } else {
        Write-Host "✅ Backend dependencies already installed"
    }
    
    # Create .env file if it doesn't exist
    if (!(Test-Path ".env")) {
        Write-Host "📝 Creating backend .env file..."
        Copy-Item ".env.example" ".env"
        Write-Host "⚠️  Please configure the .env file with your database credentials" -ForegroundColor Yellow
    } else {
        Write-Host "✅ Backend .env file exists"
    }
    
    Set-Location -Path ".."
    Write-Host "✅ Backend setup complete" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend setup failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Setup Frontend
Write-Host "🎨 Setting up Frontend..." -ForegroundColor Yellow
Write-Host "=========================" -ForegroundColor Yellow

try {
    Set-Location -Path "frontend"
    
    if (!(Test-Path "node_modules")) {
        Write-Host "📦 Installing frontend dependencies..."
        npm install
    } else {
        Write-Host "✅ Frontend dependencies already installed"
    }
    
    Set-Location -Path ".."
    Write-Host "✅ Frontend setup complete" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend setup failed: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Database Setup Instructions
Write-Host "💾 Database Setup Instructions" -ForegroundColor Yellow
Write-Host "==============================" -ForegroundColor Yellow
Write-Host "1. Ensure MySQL is running on localhost:3306"
Write-Host "2. Create the database by running:"
Write-Host "   mysql -u root -p < database/schema.sql"
Write-Host "3. Populate with sample data:"
Write-Host "   mysql -u root -p < database/seed.sql"
Write-Host ""

# Final Instructions
Write-Host "🚀 Setup Complete!" -ForegroundColor Green
Write-Host "==================" -ForegroundColor Green
Write-Host ""
Write-Host "To start the application:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. Configure backend/.env with your database credentials"
Write-Host "2. Set up the database (see instructions above)"
Write-Host "3. Start the backend server:"
Write-Host "   cd backend"
Write-Host "   npm run dev"
Write-Host ""
Write-Host "4. In a new terminal, start the frontend:"
Write-Host "   cd frontend"
Write-Host "   npm start"
Write-Host ""
Write-Host "5. Open your browser to:"
Write-Host "   Frontend: http://localhost:3000"
Write-Host "   Backend API: http://localhost:3001"
Write-Host "   API Docs: http://localhost:3001/api-docs"
Write-Host ""
Write-Host "Demo Login Credentials:" -ForegroundColor Cyan
Write-Host "Admin: admin@licea.edu / password123"
Write-Host "Instructor: sarah.johnson@licea.edu / password123"
Write-Host "Student: alice.smith@student.licea.edu / password123"
Write-Host ""
Write-Host "Happy learning! 🎓" -ForegroundColor Green
