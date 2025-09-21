#!/bin/bash

echo "🚀 AGORA DEPLOYMENT SCRIPT"
echo "=========================="
echo ""

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "🔧 Initializing Git repository..."
    git init
    git branch -M main
fi

# Add all files
echo "📁 Adding files to Git..."
git add .

# Commit changes
echo "💾 Committing changes..."
git commit -m "Ready for deployment - AGORA Political Intelligence App

✅ Features included:
- Congressional member profiles with Wikipedia enhancement
- AI-powered political debate simulator
- Q&A sessions with politicians
- Bill analysis and impact assessment
- Campaign finance transparency
- Interactive US map
- Nuclear-cleaned Wikipedia content
- Comprehensive political analytics

🎯 Deployment ready for Vercel with all features working!"

# Check if remote exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo ""
    echo "⚠️  No GitHub remote found!"
    echo "Please create a GitHub repository and add it as remote:"
    echo "git remote add origin https://github.com/yourusername/politicanhackathon.git"
    echo ""
    echo "Then run: git push -u origin main"
else
    # Push to GitHub
    echo "🌐 Pushing to GitHub..."
    git push -u origin main
    
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo ""
    echo "🎯 NEXT STEPS FOR VERCEL DEPLOYMENT:"
    echo "1. Go to https://vercel.com"
    echo "2. Sign up with your GitHub account"
    echo "3. Click 'New Project'"
    echo "4. Import your repository"
    echo "5. Add environment variables:"
    echo "   - GEMINI_API_KEY: (your Gemini API key)"
    echo "   - DATABASE_URL: file:./prisma/dev.db"
    echo "6. Click Deploy"
    echo ""
    echo "🎉 Your AGORA app will be live at: yourapp.vercel.app"
fi
