# Firebase Admin Setup Guide

## 🚨 Current Issue
The authentication system requires Firebase Admin SDK credentials to work properly.

## 🔧 Quick Setup (Development)

### Option 1: Use Service Account File (Easiest)
1. Go to [Firebase Console](https://console.firebase.google.com/project/qr-compounds/settings/serviceaccounts/adminsdk)
2. Click "Generate new private key"
3. Download the JSON file
4. Rename it to `firebase-service-account.json`
5. Place it in your project root directory
6. Restart your development server: `npm run dev`

### Option 2: Use Environment Variable
1. Get your service account JSON from Firebase Console (same as above)
2. Copy the entire JSON content
3. Add this line to your `.env.local` file:
```
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"qr-compounds",...}
```
4. Replace `...` with the full JSON content (all on one line)
5. Restart your development server: `npm run dev`

## 🔒 Security Notes
- Never commit service account keys to version control
- The `firebase-service-account.json` file is already in `.gitignore`
- Service account keys give full admin access to your Firebase project

## 🧪 Testing the Authentication
Once set up, you can test:
1. Go to `/owner/login`
2. Enter your phone number
3. Complete OTP verification
4. Set up your password (e.g., "Hamza159_")
5. The system should work without errors

## 📞 Support
If you continue to have issues, check:
- Firebase Console → Project Settings → Service Accounts
- Ensure your project ID matches: `qr-compounds`
- Verify the service account has the correct permissions
