#!/bin/bash
# EcoRoute Development Server Script
# Start this script to run the app locally with reload on file changes

set -e

echo "🌱 EcoRoute - Starting Development Server"
echo "=========================================="

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install it first."
    echo "   Download from https://nodejs.org/"
    exit 1
fi

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Copy .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo "⚙️  Creating .env from template..."
    cp .env.example .env
    echo "   Edit .env to configure (optional)"
fi

echo "🚀 Starting server on http://localhost:3000"
echo ""
echo "📂 Project structure:"
echo "   Frontend: http://localhost:3000"
echo "   API Docs: http://localhost:3000/api/health"
echo ""
echo "🔥 Press Ctrl+C to stop the server"
echo "=========================================="
echo ""

npm start
