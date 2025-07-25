# Flatbush Safety Patrol

A comprehensive safety patrol communication platform with real-time messaging, incident reporting, push notifications, and admin management features.

## 🚀 Features

- **Real-time Group Chat** - Multiple chat channels for different purposes
- **Direct Messaging** - Private conversations between users
- **Push Notifications** - Stay informed even when the app is closed
- **Admin Permission System** - Request and manage temporary admin access
- **Two-Factor Authentication** - Enhanced security with TOTP
- **NFC Authentication** - Contactless login support
- **Incident Reporting** - Location-based safety reporting
- **User Management** - Profile settings and avatar uploads
- **Mobile-First Design** - Responsive interface optimized for all devices

## 🛠 Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS with custom holographic effects
- **Backend**: Hono framework on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite)
- **Authentication**: Mocha Auth Service
- **Push Notifications**: Service Worker API
- **Maps**: Google Maps integration
- **Charts**: Recharts for data visualization

## 📱 Quick Start

### Development

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

### Production Deployment

#### Cloudflare Pages

1. Connect your GitHub repository to Cloudflare Pages
2. Set build settings:
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Node.js version**: 18.x
3. Add environment variables in Cloudflare Pages settings:
   ```
   MOCHA_USERS_SERVICE_API_URL=your_api_url
   MOCHA_USERS_SERVICE_API_KEY=your_api_key
   ```
4. Deploy!

#### GitHub Pages

1. Fork/clone the repository
2. Enable GitHub Pages in repository settings
3. Set up GitHub Actions workflow (`.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy to GitHub Pages
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Setup Node.js
           uses: actions/setup-node@v3  
           with:
             node-version: '18'
             cache: 'npm'
         - run: npm ci
         - run: npm run build
         - name: Deploy to GitHub Pages
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

#### Manual Deployment

1. Build the project:
   ```bash
   npm run build
   ```
2. Upload the `dist` folder to your web server
3. Configure your server to serve the `index.html` file for all routes

## 🔧 Configuration

### Environment Variables

- `MOCHA_USERS_SERVICE_API_URL` - Mocha authentication service URL
- `MOCHA_USERS_SERVICE_API_KEY` - Mocha authentication service API key

### Push Notifications Setup

1. **Service Worker**: The app includes a service worker (`/sw.js`) for push notifications
2. **VAPID Keys**: Currently using demo keys - replace with your own for production
3. **Browser Permissions**: The app requests notification permissions before enabling push notifications

### 2FA Configuration

- Uses TOTP (Time-based One-Time Password) standard
- Compatible with Google Authenticator, Authy, 1Password, etc.
- QR codes generated via qrserver.com API
- Backup codes available for account recovery

## 🎨 Design System

### Colors
- **Primary**: Holographic cyan (#00f5ff)
- **Secondary**: Electric blue gradients
- **Accent Colors**: Green (success), Red (danger), Orange (warning)
- **Background**: Dark theme with gradient overlays

### Typography
- **Headers**: Bold, holographic text effects
- **Body**: Clean, readable sans-serif
- **Code**: Monospace for technical elements

### Components
- **Glass Morphism**: Frosted glass effects with backdrop blur
- **Gradients**: Multi-layered color transitions
- **Shadows**: Glowing effects and depth
- **Animations**: Smooth transitions and micro-interactions

## 📚 API Endpoints

### Authentication
- `GET /api/oauth/google/redirect_url` - Get OAuth redirect URL
- `POST /api/sessions` - Create session with OAuth code
- `GET /api/logout` - Logout and clear session

### Users
- `GET /api/users/me` - Get current user profile
- `PUT /api/users/me` - Update user profile
- `GET /api/users` - Get all users (for DM list)

### Messages
- `GET /api/messages/:chatType` - Get messages for chat
- `POST /api/messages` - Send new message
- `PUT /api/messages/:id` - Edit message
- `DELETE /api/messages/:id` - Delete message

### Direct Messages
- `GET /api/direct-messages/:userId` - Get DM conversation
- `POST /api/direct-messages` - Send direct message
- `POST /api/direct-messages/:userId/read` - Mark messages as read

### Admin
- `GET /api/admin/permission-requests` - Get permission requests
- `POST /api/admin/permission-requests` - Create permission request
- `POST /api/admin/permission-requests/:id/approve` - Approve request
- `POST /api/admin/permission-requests/:id/deny` - Deny request
- `GET /api/admin/stats` - Get admin dashboard stats

### 2FA
- `POST /api/users/me/2fa/generate-secret` - Generate 2FA setup
- `POST /api/users/me/2fa/enable` - Enable 2FA
- `POST /api/users/me/2fa/disable` - Disable 2FA
- `POST /api/users/me/2fa/backup-codes` - Generate backup codes

### Push Notifications
- `POST /api/users/me/push-subscribe` - Subscribe to push notifications
- `POST /api/users/me/push-unsubscribe` - Unsubscribe from push notifications
- `GET /api/users/me/push-settings` - Get notification settings
- `PUT /api/users/me/push-settings` - Update notification settings
- `POST /api/users/me/push-test` - Send test notification

## 🔒 Security Features

1. **Authentication**: OAuth 2.0 via Mocha Auth Service
2. **Authorization**: Role-based access control (Admin/User)
3. **2FA**: TOTP two-factor authentication
4. **Session Management**: Secure cookie-based sessions
5. **Input Validation**: Zod schema validation
6. **CORS**: Configured for secure cross-origin requests

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@flatbushpatrol.com or create an issue in the GitHub repository.

---

**Baruch Hashem!** - Built with ❤️ for community safety
