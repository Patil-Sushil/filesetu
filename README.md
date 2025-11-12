# FileSetu - File Management System

This project is a comprehensive file management system built with React and Firebase.

## Features

- **User Management**: Admin and SubAdmin roles with different permissions
- **File Upload & Management**: Upload, view, and manage files
- **Daily Dairy**: Track daily activities
- **Log Book**: Maintain activity logs
- **Responsive Design**: Works seamlessly on mobile, tablet, and desktop devices

## Prerequisites

Before you begin, ensure you have the following installed:
- Node.js 18.x or higher
- npm 9.0.0 or higher

## Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable the following services:
   - Authentication (Email/Password)
   - Realtime Database
   - Cloud Firestore
   - Cloud Storage

3. Get your Firebase configuration from Project Settings > General > Your apps > Web app

## Installation & Configuration

1. Clone the repository:
```bash
git clone <repository-url>
cd filesetu
```

2. Install dependencies:
```bash
npm install
```

3. Configure Firebase:
   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Open `.env` and replace the placeholder values with your actual Firebase credentials:
     ```env
     REACT_APP_FIREBASE_API_KEY=your_actual_api_key
     REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
     REACT_APP_FIREBASE_PROJECT_ID=your_project_id
     REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
     REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
     REACT_APP_FIREBASE_APP_ID=your_app_id
     REACT_APP_FIREBASE_MEASUREMENTID=your_measurement_id
     ```

4. **Important**: Never commit your `.env` file to version control. It's already included in `.gitignore`.

5. **Optional**: Verify your setup by running the verification script:
   ```bash
   ./verify-setup.sh
   ```
   This will check that all required dependencies and configuration are in place.

## Running the Application

### Development Mode

```bash
npm start
```

The app will run at [http://localhost:3000](http://localhost:3000)

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

## Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

## Default Admin Account

On first run, the application automatically creates a default admin account:

- **Email**: admin@gmail.com
- **Password**: admin@123

⚠️ **Security Note**: Change the default admin password immediately after first login in a production environment.

## Responsive Design

The application is fully responsive and optimized for:

- **Mobile devices**: 320px - 767px
- **Tablets**: 768px - 1023px
- **Laptops**: 1024px - 1399px
- **Desktops**: 1400px and above

### Mobile Features

- Collapsible sidebar with overlay
- Touch-optimized interface
- Optimized layouts for small screens
- Mobile-friendly navigation

### Sidebar Behavior

- **Desktop/Laptop**: Sidebar is expanded by default with collapse toggle
- **Tablet**: Sidebar can be toggled
- **Mobile**: Sidebar auto-collapses and opens as overlay with backdrop

## Project Structure

```
filesetu/
├── public/
│   ├── favicon.ico
│   ├── index.html
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── Dashboard.js
│   │   ├── Sidebar.js
│   │   ├── Login.js
│   │   ├── FileUpload.js
│   │   ├── RecordsView.js
│   │   ├── UserManagement.js
│   │   ├── Dairy.js
│   │   └── LogBook.js
│   ├── contexts/
│   │   └── AuthContext.js
│   ├── styles/
│   │   ├── Dashboard.css
│   │   ├── Sidebar.css
│   │   ├── FileUpload.css
│   │   ├── LogBook.css
│   │   └── UserManagement.css
│   ├── firebase.js
│   ├── App.js
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## Troubleshooting

### Firebase Configuration Error

If you see an error like "Missing Firebase environment variables", ensure:

1. You have created a `.env` file in the root directory
2. All required Firebase environment variables are set
3. You've restarted the development server after creating/modifying `.env`

### Build Errors

If you encounter build errors:

```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear cache
npm cache clean --force
```

## Security Best Practices

1. **Never commit `.env` file**: Your Firebase credentials should never be committed to version control
2. **Use Firebase Security Rules**: Configure proper security rules in Firebase Console
3. **Change default credentials**: Update the default admin password in production
4. **Enable Firebase App Check**: Add an extra layer of security to your Firebase resources

## Deployment

### Netlify

This project is configured for Netlify deployment with `netlify.toml`.

1. Connect your repository to Netlify
2. Configure environment variables in Netlify dashboard (Settings > Build & Deploy > Environment)
3. Deploy!

### Other Platforms

For deployment to other platforms (Vercel, Firebase Hosting, etc.), ensure you:

1. Set all environment variables in the platform's dashboard
2. Configure build command: `npm run build`
3. Configure publish directory: `build`

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is private and proprietary.

## Learn More

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)
