import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    try {
        let credential;

        // Try to use service account from environment variable first
        if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
            console.log("Using service account from environment variable");
            const serviceAccount = JSON.parse(
                process.env.FIREBASE_SERVICE_ACCOUNT_KEY
            );
            credential = admin.credential.cert(serviceAccount);
        } else {
            // Fallback to service account file
            const serviceAccountPath =
                process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
                "./firebase-service-account.json";

            if (fs.existsSync(serviceAccountPath)) {
                console.log(
                    "Using service account from file:",
                    serviceAccountPath
                );
                const serviceAccountContent = fs.readFileSync(
                    serviceAccountPath,
                    "utf8"
                );
                const serviceAccount = JSON.parse(serviceAccountContent);
                credential = admin.credential.cert(serviceAccount);
            } else {
                throw new Error(
                    `Service account file not found at ${serviceAccountPath}`
                );
            }
        }

        admin.initializeApp({
            credential,
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        });
        console.log("Firebase Admin initialized successfully");
    } catch (error) {
        console.error("Failed to initialize Firebase Admin:", error);
        throw error;
    }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export default admin;
