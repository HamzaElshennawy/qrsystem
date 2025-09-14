# QR Compound Management System

A comprehensive QR code management system for residential compounds built with Next.js, Firebase, and TypeScript.

## Features

- **Compound Management**: Create and manage multiple residential compounds
- **Owner Management**: Add property owners manually or via CSV import
- **QR Code Generation**: Generate unique QR codes for each property owner
- **Entry Point Configuration**: Set up and manage access points with security settings
- **Dashboard Analytics**: View statistics and manage your compounds from a centralized dashboard
- **Responsive Design**: Mobile-friendly interface built with Tailwind CSS and shadcn/ui

## Tech Stack

- **Frontend**: Next.js 15 with App Router, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui with Radix UI primitives
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **QR Code Generation**: qrcode library
- **File Processing**: CSV parsing for bulk owner import

## Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── landing/           # Landing page
│   ├── login/             # Authentication page
│   ├── dashboard/         # Main dashboard
│   │   ├── owners/        # Owner management
│   │   ├── compounds/     # Compound management
│   │   ├── qrcodes/       # QR code management
│   │   ├── points/        # Entry point management
│   │   └── help/          # Help and support
│   └── api/               # API routes
├── components/            # Reusable UI components
│   └── ui/               # shadcn/ui components
├── firebase/             # Firebase configuration and services
│   ├── firebaseConfig.ts # Firebase initialization
│   ├── auth.ts          # Authentication service
│   ├── firestore.ts     # Firestore operations
│   ├── storage.ts       # Firebase Storage operations
│   └── qr.ts            # QR code generation service
└── lib/                  # Utility functions
```

## Getting Started

### Prerequisites

- Node.js 18+ 
- Firebase project with Authentication, Firestore, and Storage enabled
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd qrsystem
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Firebase**
   - Create a new Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password)
   - Enable Firestore Database
   - Enable Firebase Storage
   - Get your Firebase configuration

4. **Environment Variables**
   Create a `.env.local` file in the root directory:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

5. **Run the development server**
   ```bash
   npm run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Usage

### 1. Create an Account
- Visit the landing page and click "Get Started"
- Sign up with your email and password

### 2. Set Up Your First Compound
- Go to the Compounds section in the dashboard
- Click "Create Compound" and fill in the details
- Add your compound name and address

### 3. Add Property Owners
- Navigate to the Owners section
- Add owners manually or import via CSV
- For CSV import, download the template and fill in owner details

### 4. Generate QR Codes
- Go to the QR Codes section
- Generate QR codes for individual owners or bulk generate for all owners
- Download and print QR codes for distribution

### 5. Configure Entry Points
- Set up entry points in the Points section
- Configure security settings for each access point
- Define which owners have access to specific entry points

## Firestore Collections

The system uses the following Firestore collections:

- **compounds**: Compound information and settings
- **owners**: Property owner details linked to compounds
- **qrcodes**: Generated QR codes with metadata
- **entryPoints**: Access point configurations

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/signup` - User registration
- `POST /api/auth/logout` - User logout

### Compounds
- `GET /api/compounds` - Get user's compounds
- `POST /api/compounds` - Create new compound
- `GET /api/compounds/[id]` - Get compound details
- `PUT /api/compounds/[id]` - Update compound
- `DELETE /api/compounds/[id]` - Delete compound

### Owners
- `GET /api/owners` - Get owners
- `POST /api/owners` - Create new owner
- `POST /api/owners/import` - Import owners from CSV

### QR Codes
- `GET /api/qrcodes` - Get QR codes
- `POST /api/qrcodes` - Generate QR code
- `POST /api/qrcodes/generate` - Bulk generate QR codes
- `POST /api/qrcodes/preview` - Preview QR code

### Entry Points
- `GET /api/points` - Get entry points
- `POST /api/points` - Create entry point

## CSV Import Format

For bulk owner import, use the following CSV format:

```csv
firstName,lastName,email,phone,propertyUnit
John,Doe,john@example.com,+1234567890,Unit A1
Jane,Smith,jane@example.com,+1234567891,Unit B2
```

Required columns: `firstName`, `lastName`, `email`
Optional columns: `phone`, `propertyUnit`

## Security Features

- Firebase Authentication for secure user management
- Role-based access control (compound admin permissions)
- QR code data includes timestamps and signatures
- Entry point access restrictions
- Audit trails for QR code usage

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Email: support@qrcompound.com
- Documentation: [Help section in the dashboard](/dashboard/help)
- Issues: Create an issue in the GitHub repository

## Roadmap

- [ ] Mobile app for QR code scanning
- [ ] Advanced analytics and reporting
- [ ] Custom QR code designs and branding
- [ ] Integration with access control systems
- [ ] Multi-language support
- [ ] API for third-party integrations