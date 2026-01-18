#!/bin/bash
# Railway Initial Setup Script
# Run this once to setup your Railway project

set -e

echo "🚂 Railway Project Setup"
echo "========================"
echo ""

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "📦 Installing Railway CLI..."
    npm install -g @railway/cli
    echo "✅ Railway CLI installed!"
    echo ""
fi

# Login
echo "🔐 Logging in to Railway..."
railway login
echo "✅ Logged in!"
echo ""

# Initialize project
echo "🎯 Initializing Railway project..."
echo ""
echo "Choose an option:"
echo "  1. Create new project"
echo "  2. Link to existing project"
read -p "Enter choice (1 or 2): " choice

if [ "$choice" = "1" ]; then
    railway init
elif [ "$choice" = "2" ]; then
    railway link
else
    echo "❌ Invalid choice"
    exit 1
fi
echo ""

# Add PostgreSQL
echo "🗄️  Adding PostgreSQL database..."
read -p "Do you want to add PostgreSQL? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    railway add --database postgres
    echo "✅ PostgreSQL added!"
else
    echo "⚠️  Skipped PostgreSQL setup"
fi
echo ""

# Set environment variables
echo "🔧 Setting environment variables..."
echo ""

read -p "Enter JWT_SECRET (or press Enter for default): " jwt_secret
jwt_secret=${jwt_secret:-$(openssl rand -base64 32)}
railway variables set JWT_SECRET="$jwt_secret"
echo "✅ JWT_SECRET set"

railway variables set NODE_ENV=production
echo "✅ NODE_ENV set"

read -p "Do you want to set webhook URLs? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "NEXT_PUBLIC_WEBHOOK_URL: " webhook_url
    if [ ! -z "$webhook_url" ]; then
        railway variables set NEXT_PUBLIC_WEBHOOK_URL="$webhook_url"
    fi
    
    read -p "NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL: " asset_webhook
    if [ ! -z "$asset_webhook" ]; then
        railway variables set NEXT_PUBLIC_ASSET_MATCH_WEBHOOK_URL="$asset_webhook"
    fi
    
    read -p "NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL: " maxstream_webhook
    if [ ! -z "$maxstream_webhook" ]; then
        railway variables set NEXT_PUBLIC_MAXSTREAM_WEBHOOK_URL="$maxstream_webhook"
    fi
    
    read -p "NEXT_PUBLIC_MYORBIT_WEBHOOK_URL: " myorbit_webhook
    if [ ! -z "$myorbit_webhook" ]; then
        railway variables set NEXT_PUBLIC_MYORBIT_WEBHOOK_URL="$myorbit_webhook"
    fi
    
    read -p "NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL: " duniagames_webhook
    if [ ! -z "$duniagames_webhook" ]; then
        railway variables set NEXT_PUBLIC_DUNIAGAMES_WEBHOOK_URL="$duniagames_webhook"
    fi
fi
echo ""

read -p "Do you want to set Google OAuth? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    read -p "NEXT_PUBLIC_GOOGLE_CLIENT_ID: " google_client_id
    if [ ! -z "$google_client_id" ]; then
        railway variables set NEXT_PUBLIC_GOOGLE_CLIENT_ID="$google_client_id"
    fi
fi
echo ""

# Deploy
echo "🚀 Ready to deploy!"
echo ""
read -p "Do you want to deploy now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📦 Deploying to Railway..."
    railway up
    echo "✅ Deployment started!"
    echo ""
    echo "🔍 Check status: railway status"
    echo "📊 View logs: railway logs"
    echo ""
    echo "⏳ Waiting for deployment to complete..."
    sleep 10
    
    read -p "Do you want to run database migration now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        chmod +x scripts/railway-migrate.sh
        ./scripts/railway-migrate.sh
    else
        echo "⚠️  Don't forget to run: ./scripts/railway-migrate.sh"
    fi
else
    echo "⚠️  Deployment skipped"
    echo "📝 To deploy later, run: railway up"
fi
echo ""

echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Check deployment: railway status"
echo "   2. View logs: railway logs"
echo "   3. Open app: railway open"
echo "   4. Run migration: ./scripts/railway-migrate.sh"
echo ""
echo "🔗 Useful commands:"
echo "   - railway variables: View all environment variables"
echo "   - railway logs -f: Follow logs in real-time"
echo "   - railway restart: Restart services"
echo "   - railway domain: Manage custom domains"
echo ""
