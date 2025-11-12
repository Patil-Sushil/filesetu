# FileSetu - Setup Guide

This guide will help you set up and run the FileSetu File Management System.

## Prerequisites

Ensure you have the following installed on your system:

- **Node.js**: Version 18.x or higher
  - Check version: `node --version`
  - Download from: https://nodejs.org/

- **npm**: Version 9.0.0 or higher
  - Check version: `npm --version`
  - Comes with Node.js installation

## Step-by-Step Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd filesetu
```

### 2. Install Dependencies

```bash
npm install
```

This will install all required packages defined in `package.json`.

### 3. Set Up Firebase

#### 3.1 Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard

#### 3.2 Enable Required Services

In your Firebase project, enable the following services:

**Authentication:**
1. Go to Authentication → Get Started
2. Enable "Email/Password" sign-in method

**Realtime Database:**
1. Go to Realtime Database → Create Database
2. Start in test mode (change rules later for production)
3. Your database URL will be like: `https://your-project.firebaseio.com`

**Cloud Firestore:**
1. Go to Firestore Database → Create Database
2. Start in test mode (change rules later for production)

**Cloud Storage:**
1. Go to Storage → Get Started
2. Start in test mode (change rules later for production)

#### 3.3 Get Firebase Configuration

1. Go to Project Settings (gear icon) → General
2. Scroll down to "Your apps"
3. Click on the web icon (</>) to add a web app
4. Register your app with a nickname
5. Copy the Firebase configuration object

### 4. Configure Environment Variables

#### 4.1 Create .env File

Copy the example environment file:

```bash
cp .env.example .env
```

#### 4.2 Add Your Firebase Credentials

Open `.env` in a text editor and replace the placeholder values with your actual Firebase configuration:

```env
REACT_APP_FIREBASE_API_KEY=your_actual_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789012
REACT_APP_FIREBASE_APP_ID=1:123456789012:web:abcdef123456
REACT_APP_FIREBASE_MEASUREMENTID=G-ABCDEFGHIJ
```

**Example Firebase Config Object:**
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyAbc123...",               // ← Copy this to REACT_APP_FIREBASE_API_KEY
  authDomain: "my-project.firebaseapp.com", // ← Copy this to REACT_APP_FIREBASE_AUTH_DOMAIN
  projectId: "my-project",                  // ← Copy this to REACT_APP_FIREBASE_PROJECT_ID
  storageBucket: "my-project.appspot.com",  // ← Copy this to REACT_APP_FIREBASE_STORAGE_BUCKET
  messagingSenderId: "123456789012",        // ← Copy this to REACT_APP_FIREBASE_MESSAGING_SENDER_ID
  appId: "1:123456789012:web:abc123",      // ← Copy this to REACT_APP_FIREBASE_APP_ID
  measurementId: "G-ABCDEFGHIJ"            // ← Copy this to REACT_APP_FIREBASE_MEASUREMENTID
};
```

> **⚠️ IMPORTANT**: Never commit your `.env` file to version control! It's already in `.gitignore`.

### 5. Run the Application

#### Development Mode

```bash
npm start
```

The application will start at http://localhost:3000

The page will automatically reload when you make changes.

#### Production Build

```bash
npm run build
```

Creates an optimized production build in the `build/` folder.

### 6. First Login

When you first run the application, it will automatically create a default admin account:

**Default Admin Credentials:**
- Email: `admin@gmail.com`
- Password: `admin@123`

> **🔒 Security**: Change this password immediately after your first login, especially in production!

## Troubleshooting

### Issue: "Missing Firebase environment variables"

**Solution:**
1. Ensure you created a `.env` file in the root directory
2. Verify all environment variables are set correctly
3. Restart the development server: `npm start`

### Issue: Build fails with dependency errors

**Solution:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Issue: Firebase authentication errors

**Solution:**
1. Verify Email/Password authentication is enabled in Firebase Console
2. Check that your Firebase configuration is correct
3. Ensure your API key has the correct permissions

### Issue: Cannot upload files

**Solution:**
1. Verify Cloud Storage is enabled in Firebase Console
2. Check Storage security rules allow uploads
3. Ensure your Firebase configuration includes `storageBucket`

## Firebase Security Rules

### Realtime Database Rules

For development:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```

For production, implement more restrictive rules based on user roles.

### Firestore Rules

For development:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### Storage Rules

For development:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Next Steps

1. **Change default admin password**
2. **Configure Firebase security rules** for production
3. **Set up Firebase App Check** for additional security
4. **Configure backup strategies** for your data
5. **Set up monitoring and analytics**

## Additional Resources

- [React Documentation](https://reactjs.org/)
- [Firebase Documentation](https://firebase.google.com/docs)
- [Create React App Documentation](https://create-react-app.dev/)

## Support

If you encounter issues not covered in this guide, please:
1. Check the Firebase Console for error messages
2. Review browser console for error logs
3. Ensure all dependencies are up to date

---

**Last Updated**: November 2024
