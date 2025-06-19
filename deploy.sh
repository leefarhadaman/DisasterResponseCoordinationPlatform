#!/bin/bash

echo "🚀 Disaster Coordination Platform - Deployment Script"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Install server dependencies
echo "📦 Installing server dependencies..."
cd server
npm install

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  No .env file found in server directory."
    echo "📝 Please create a .env file with the following variables:"
    echo "   SUPABASE_URL=your_supabase_url_here"
    echo "   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here"
    echo "   GEMINI_API_KEY=your_gemini_api_key_here"
    echo "   MAPBOX_TOKEN=your_mapbox_token_here"
    echo "   TWITTER_BEARER=your_twitter_bearer_token_here (optional)"
    echo "   PORT=3000"
    echo "   NODE_ENV=development"
    echo ""
    echo "💡 You can copy env.example to .env as a starting point:"
    echo "   cp env.example .env"
    echo ""
    read -p "Press Enter to continue without .env file (some features may not work)..."
else
    echo "✅ .env file found"
fi

# Install client dependencies
echo "📦 Installing client dependencies..."
cd ../client
npm install

echo ""
echo "🎉 Installation completed!"
echo ""
echo "📋 Next steps:"
echo "1. Set up your Supabase database with the SQL schema from README.md"
echo "2. Configure your .env file with API keys"
echo "3. Start the development servers:"
echo ""
echo "   # Terminal 1 - Start backend server"
echo "   cd server && npm run dev"
echo ""
echo "   # Terminal 2 - Start frontend"
echo "   cd client && npm run dev"
echo ""
echo "4. Test the API:"
echo "   cd server && npm test"
echo ""
echo "🌐 The application will be available at:"
echo "   Frontend: http://localhost:5173"
echo "   Backend API: http://localhost:3000"
echo ""
echo "📚 For more information, see README.md" 