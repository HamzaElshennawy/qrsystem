# Enhanced Owner Authentication System

This document describes the new authentication system implemented for the owners portal, which includes OTP verification, device tracking, and password-based login.

## Features

### 1. OTP Authentication
- **First-time login**: Users must verify their identity via OTP
- **New device detection**: When logging in from a new device, OTP verification is required
- **Phone number verification**: Uses Firebase phone authentication

### 2. Device Tracking
- **Device fingerprinting**: Creates unique device identifiers based on browser characteristics
- **Session management**: Tracks known devices and their usage
- **Security**: Requires OTP verification when device changes

### 3. Password-based Login
- **Setup during OTP**: Users set up passwords after first OTP verification
- **Flexible login**: Supports both email/password and phone/password combinations
- **Same device convenience**: No OTP required for subsequent logins on the same device

## Authentication Flow

### First-time User
1. User enters phone number
2. OTP is sent and verified
3. User sets up password
4. Device is registered as "known"
5. User is redirected to dashboard

### Returning User (Same Device)
1. User enters email/phone + password
2. System recognizes device as "known"
3. User is directly logged in (no OTP required)

### Returning User (New Device)
1. User enters email/phone + password
2. System detects new device
3. OTP verification is required
4. Device is registered as "known"
5. User is logged in

## API Endpoints

### `/api/auth/check-device`
- **Method**: POST
- **Purpose**: Check if user is authenticated and device status
- **Body**: `{ deviceFingerprint, userAgent }`
- **Response**: User info, device status, OTP requirement

### `/api/auth/setup-password`
- **Method**: POST
- **Purpose**: Set up password after OTP verification
- **Body**: `{ password, confirmPassword, deviceFingerprint, userAgent }`
- **Response**: Success confirmation

### `/api/auth/login-password`
- **Method**: POST
- **Purpose**: Login with email/phone and password
- **Body**: `{ email?, phone?, password, deviceFingerprint, userAgent }`
- **Response**: Login result, OTP requirement if new device

### `/api/auth/activate-device`
- **Method**: POST
- **Purpose**: Activate device session after OTP verification
- **Body**: `{ deviceFingerprint, userAgent }`
- **Response**: Success confirmation

## Database Schema

### Users Collection
```typescript
interface User {
  id?: string;
  compoundId: string;
  type: "owner" | "employee" | "manager";
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  propertyUnit?: string;
  isActive: boolean;
  // Enhanced authentication fields
  firebaseUid?: string;
  hasPassword?: boolean;
  passwordHash?: string; // Only stored on server-side
  isFirstTimeLogin?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### Device Sessions Collection
```typescript
interface DeviceSession {
  id?: string;
  userId: string;
  deviceFingerprint: string;
  userAgent: string;
  ipAddress?: string;
  lastUsedAt: Timestamp;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

## Security Features

### Password Security
- **Hashing**: Uses scrypt with random salt
- **Strength validation**: Requires uppercase, lowercase, number, and special character
- **Minimum length**: 8 characters

### Device Fingerprinting
- **Browser characteristics**: User agent, screen resolution, timezone, language
- **Hardware info**: Platform, color depth, pixel ratio
- **Privacy considerations**: Uses hashing to protect user privacy

### Session Management
- **Device tracking**: Monitors device changes
- **Automatic deactivation**: Sessions can be deactivated for security
- **IP tracking**: Optional IP address logging

## Usage

### For Developers

1. **Import device fingerprinting**:
```typescript
import { generateDeviceFingerprint } from '@/lib/device-fingerprint';
const fingerprint = generateDeviceFingerprint();
```

2. **Check authentication status**:
```typescript
const response = await fetch('/api/auth/check-device', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ deviceFingerprint, userAgent: navigator.userAgent })
});
```

3. **Handle authentication flow**:
```typescript
if (data.requiresOTP) {
  // Show OTP verification
} else {
  // Show password login
}
```

### For Users

1. **First visit**: Enter phone → OTP → Set password → Access granted
2. **Same device**: Enter email/phone + password → Access granted
3. **New device**: Enter email/phone + password → OTP → Access granted

## Testing

Visit `/test-auth` to test the authentication system:
- Generate device fingerprint
- Test device checking
- Test password login
- View API responses

## Migration Notes

### Existing Users
- Existing users will be treated as "first-time" users
- They'll need to complete OTP verification and set up passwords
- Device tracking will start from their next login

### Database Updates
- New fields added to User documents: `hasPassword`, `passwordHash`, `isFirstTimeLogin`, `firebaseUid`
- New `deviceSessions` collection created
- Existing users will have `isFirstTimeLogin: true` by default

## Security Considerations

1. **Device fingerprinting** is not 100% unique - users clearing browser data may trigger OTP
2. **Password hashing** uses industry-standard scrypt algorithm
3. **Session management** allows for easy device deactivation if needed
4. **OTP verification** ensures security even if password is compromised
5. **Firebase integration** maintains existing phone authentication security

## Future Enhancements

1. **Multi-factor authentication**: Add email-based OTP as backup
2. **Device management**: Allow users to view and manage trusted devices
3. **Session timeout**: Automatic logout after inactivity
4. **Audit logging**: Track all authentication attempts
5. **Biometric authentication**: Add fingerprint/face ID support for mobile
