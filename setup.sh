#!/bin/bash

# SpotiSeek Setup Script
echo "🎵 Setting up SpotiSeek - Spotify to Soulseek Downloader"
echo "=================================================="

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js (v14 or higher) first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 14 ]; then
    echo "❌ Node.js version $NODE_VERSION is too old. Please upgrade to v14 or higher."
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "✅ npm $(npm -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "✅ .env file created from template"
    echo ""
    echo "⚠️  IMPORTANT: Please edit the .env file with your credentials:"
    echo "   - Spotify Client ID and Secret"
    echo "   - Soulseek username and password"
    echo ""
else
    echo "✅ .env file already exists"
fi

# Create downloads directory
if [ ! -d "downloads" ]; then
    mkdir downloads
    echo "✅ Downloads directory created"
fi

# Check if slsk-batchdl is available
if command -v sldl &> /dev/null; then
    echo "✅ slsk-batchdl (sldl) found in PATH"
elif command -v slsk-batchdl &> /dev/null; then
    echo "✅ slsk-batchdl found in PATH"
    echo "   Note: You may need to set SLDL_PATH=slsk-batchdl in your .env file"
else
    echo "⚠️  slsk-batchdl not found in PATH"
    echo "   Please install it from: https://github.com/fiso64/slsk-batchdl/releases"
    echo "   Or specify the full path in your .env file (SLDL_PATH variable)"
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit the .env file with your credentials"
echo "2. Set up your Spotify app at https://developer.spotify.com/dashboard"
echo "3. Install slsk-batchdl if not already installed"
echo "4. Run 'npm start' to start the application"
echo ""
echo "For detailed instructions, see README.md"