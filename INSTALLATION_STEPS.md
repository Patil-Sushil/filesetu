# FileSetu Vite Migration - Installation Steps

## Step 1: Delete old dependencies and install new ones

Open PowerShell in your project directory and run:

```powershell
# Navigate to project
cd "e:\KALI BYTE\New folder\FileSetu"

# Remove old dependencies
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json

# Install new dependencies
npm install

# Verify installation
npm list --depth=0
```

## Step 2: Replace index.css

After installation completes:

```powershell
# Backup old index.css
Move-Item src\index.css src\index-old.css

# Rename new index.css
Move-Item src\index-new.css src\index.css
```

## Step 3: Start development server

```powershell
npm run dev
```

The app will open at `http://localhost:3000`

## What's Next?

After the server starts, I'll convert all your components to use Tailwind CSS while maintaining functionality.

## Troubleshooting

If you get errors:

1. Make sure Node.js version is 18.x or higher: `node --version`
2. Clear npm cache: `npm cache clean --force`
3. Delete node_modules and reinstall: `Remove-Item -Recurse node_modules; npm install`

## Expected Changes

✅ Vite dev server (faster than CRA)
✅ Tailwind CSS instead of custom CSS files
✅ All functionality preserved
✅ Better responsive design
✅ Smaller bundle size
