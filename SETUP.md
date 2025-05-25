# Synaptic MCP Setup Guide

## Prerequisites Installation

### 1. Install Node.js

#### Windows (Recommended Method)
1. Visit [Node.js official website](https://nodejs.org/)
2. Download the LTS version (18.x or higher)
3. Run the installer and follow the setup wizard
4. Restart your terminal/PowerShell after installation

#### Alternative: Using Chocolatey (Windows Package Manager)
```powershell
# Install Chocolatey first (if not installed)
Set-ExecutionPolicy Bypass -Scope Process -Force; [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072; iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

# Install Node.js
choco install nodejs
```

#### Alternative: Using Winget (Windows Package Manager)
```powershell
winget install OpenJS.NodeJS
```

### 2. Verify Installation
After installing Node.js, restart your terminal and verify:

```powershell
node --version
npm --version
```

You should see version numbers (e.g., v18.17.0 and 9.6.7).

## Project Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Configuration
Copy the environment template:
```bash
copy env.example .env
```

Edit `.env` file and add your API keys:
```env
# AI API Keys (at least one required)
CLAUDE_API_KEY=your_claude_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here

# Security
JWT_SECRET=your_secure_random_string_here
```

### 3. Build the Project
```bash
npm run build
```

### 4. Run Tests
```bash
npm test
```

### 5. Start Development Server
```bash
npm run dev
```

## Getting API Keys

### Claude API Key (Anthropic)
1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign up/login to your account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key to your `.env` file

### OpenAI API Key
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Sign up/login to your account
3. Go to API Keys section
4. Create a new secret key
5. Copy the key to your `.env` file

### Google Gemini API Key
1. Visit [Google AI Studio](https://makersuite.google.com/)
2. Sign up/login with your Google account
3. Create a new API key
4. Copy the key to your `.env` file

## Troubleshooting

### Common Issues

#### 1. "npm is not recognized"
- Node.js is not installed or not in PATH
- Restart terminal after Node.js installation
- Reinstall Node.js with "Add to PATH" option checked

#### 2. Permission Errors (Windows)
```powershell
# Run PowerShell as Administrator and execute:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

#### 3. TypeScript Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. Port Already in Use
```bash
# Change port in .env file
PORT=3001
```

### Development Commands

```bash
# Start development with hot reload
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Lint code
npm run lint

# Format code
npm run format

# Start production server
npm start
```

## Project Structure Overview

```
Synaptic/
├── src/                    # Source code
│   ├── core/              # Core protocol
│   ├── storage/           # Memory storage
│   ├── ai/                # AI integrations
│   ├── blockchain/        # Blockchain logic
│   ├── privacy/           # Privacy protection
│   ├── utils/             # Utilities
│   ├── types/             # TypeScript types
│   └── config/            # Configuration
├── tests/                 # Test files
├── apps/                  # Applications (desktop, mobile, extension)
├── contracts/             # Smart contracts
├── docs/                  # Documentation
└── dist/                  # Built files
```

## Next Steps

1. **Install Node.js** following the guide above
2. **Install dependencies** with `npm install`
3. **Configure environment** by copying and editing `.env`
4. **Get API keys** from AI providers
5. **Run the project** with `npm run dev`

For detailed usage examples, see the main [README.md](README.md) file.

## Support

If you encounter issues:
1. Check this troubleshooting guide
2. Ensure Node.js version >= 18.0.0
3. Verify all dependencies are installed
4. Check environment variables are set correctly
5. Open an issue on GitHub with error details 