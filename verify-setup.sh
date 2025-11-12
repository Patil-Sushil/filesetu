#!/bin/bash

# FileSetu Setup Verification Script
# This script checks if your development environment is properly configured

echo "🔍 FileSetu Setup Verification"
echo "================================"
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node.js
echo "Checking Node.js version..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js is installed: $NODE_VERSION"
    
    # Check if version is >= 18
    NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR" -ge 18 ]; then
        echo -e "${GREEN}✓${NC} Node.js version is compatible (>= 18.x)"
    else
        echo -e "${YELLOW}⚠${NC} Node.js version should be >= 18.x (current: $NODE_VERSION)"
    fi
else
    echo -e "${RED}✗${NC} Node.js is not installed"
    echo "  Please install Node.js 18.x or higher from https://nodejs.org/"
fi
echo ""

# Check npm
echo "Checking npm version..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm is installed: $NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm is not installed"
fi
echo ""

# Check if package.json exists
echo "Checking project files..."
if [ -f "package.json" ]; then
    echo -e "${GREEN}✓${NC} package.json found"
else
    echo -e "${RED}✗${NC} package.json not found"
    echo "  Are you in the project root directory?"
fi
echo ""

# Check node_modules
echo "Checking dependencies..."
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✓${NC} node_modules directory exists"
else
    echo -e "${YELLOW}⚠${NC} node_modules not found"
    echo "  Run 'npm install' to install dependencies"
fi
echo ""

# Check .env file
echo "Checking environment configuration..."
if [ -f ".env" ]; then
    echo -e "${GREEN}✓${NC} .env file exists"
    
    # Check for required environment variables
    REQUIRED_VARS=(
        "REACT_APP_FIREBASE_API_KEY"
        "REACT_APP_FIREBASE_AUTH_DOMAIN"
        "REACT_APP_FIREBASE_PROJECT_ID"
        "REACT_APP_FIREBASE_STORAGE_BUCKET"
        "REACT_APP_FIREBASE_MESSAGING_SENDER_ID"
        "REACT_APP_FIREBASE_APP_ID"
    )
    
    MISSING_VARS=()
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env; then
            VALUE=$(grep "^$var=" .env | cut -d'=' -f2)
            if [ -n "$VALUE" ] && [ "$VALUE" != "your_api_key_here" ] && [ "$VALUE" != "your_project_id" ] && [[ ! "$VALUE" =~ your_ ]]; then
                echo -e "${GREEN}  ✓${NC} $var is configured"
            else
                echo -e "${YELLOW}  ⚠${NC} $var exists but has placeholder value"
                MISSING_VARS+=("$var")
            fi
        else
            echo -e "${RED}  ✗${NC} $var is missing"
            MISSING_VARS+=("$var")
        fi
    done
    
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}⚠ Configuration needed:${NC}"
        echo "  Please update the following variables in .env:"
        for var in "${MISSING_VARS[@]}"; do
            echo "    - $var"
        done
        echo ""
        echo "  Get your Firebase credentials from:"
        echo "  https://console.firebase.google.com/ → Project Settings → Web App"
    fi
else
    echo -e "${RED}✗${NC} .env file not found"
    echo ""
    echo -e "${YELLOW}Action required:${NC}"
    echo "  1. Copy the example file: cp .env.example .env"
    echo "  2. Edit .env and add your Firebase credentials"
    echo "  3. See SETUP.md for detailed instructions"
fi
echo ""

# Check .env.example
if [ -f ".env.example" ]; then
    echo -e "${GREEN}✓${NC} .env.example file exists"
else
    echo -e "${YELLOW}⚠${NC} .env.example file not found"
fi
echo ""

# Check Firebase configuration files
echo "Checking Firebase setup..."
if [ -f "src/firebase.js" ]; then
    echo -e "${GREEN}✓${NC} Firebase configuration file exists"
else
    echo -e "${RED}✗${NC} Firebase configuration file not found"
fi
echo ""

# Summary
echo "================================"
echo "📋 Summary"
echo "================================"

# Count issues
ISSUES=0

if ! command -v node &> /dev/null; then
    ((ISSUES++))
fi

if ! command -v npm &> /dev/null; then
    ((ISSUES++))
fi

if [ ! -d "node_modules" ]; then
    ((ISSUES++))
fi

if [ ! -f ".env" ]; then
    ((ISSUES++))
fi

if [ $ISSUES -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You're ready to start development:"
    echo "  npm start"
else
    echo -e "${YELLOW}⚠ Found $ISSUES issue(s) that need attention${NC}"
    echo ""
    echo "Please fix the issues above and run this script again."
    echo "For detailed setup instructions, see SETUP.md"
fi

echo ""
