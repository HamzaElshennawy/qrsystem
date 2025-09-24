import { initializeApp, getApps } from "firebase/app";
import { getAuth, browserLocalPersistence, setPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase only if not already initialized
let app;
if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
} else {
    app = getApps()[0];
}

// Initialize Firebase services
export const auth = getAuth(app);
// Ensure auth state persists across tabs and reloads
setPersistence(auth, browserLocalPersistence).catch(() => {
    // no-op: fallback to default persistence if setting fails
});
// Use device/browser language for SMS and reCAPTCHA
try {
    // @ts-expect-error useDeviceLanguage exists at runtime
    auth.useDeviceLanguage?.();
} catch {}

// Enable local testing mode for phone auth if env flag is set
if (process.env.NEXT_PUBLIC_FIREBASE_USE_TEST_PHONE === "true") {
    try {
        // During local testing with Firebase console test numbers, disable app verification
        // so reCAPTCHA is bypassed. DO NOT ENABLE IN PRODUCTION.
        // @ts-expect-error settings exists at runtime
        auth.settings.appVerificationDisabledForTesting = true;
        // eslint-disable-next-line no-console
        console.warn("[Auth] Phone app verification disabled for testing (local only)");
    } catch {}
} else {
    // eslint-disable-next-line no-console
    console.info("[Auth] Phone auth in REAL SMS mode (reCAPTCHA enabled)");
}
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
