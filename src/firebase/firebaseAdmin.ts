import "server-only";
import * as admin from "firebase-admin";
import * as fs from "fs";
import * as path from "path";

let hasInitializedAdmin = false;

function resolveServiceAccount(): admin.credential.Credential | null {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
        try {
            const serviceAccount = JSON.parse(
                process.env.FIREBASE_SERVICE_ACCOUNT_KEY
            );
            return admin.credential.cert(serviceAccount);
        } catch (err) {
            console.error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY JSON:", err);
            throw err;
        }
    }

    const serviceAccountPath =
        process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
        path.resolve(process.cwd(), "firebase-service-account.json");

    if (fs.existsSync(serviceAccountPath)) {
        const serviceAccountContent = fs.readFileSync(serviceAccountPath, "utf8");
        const serviceAccount = JSON.parse(serviceAccountContent);
        return admin.credential.cert(serviceAccount);
    }

    return null;
}

export function ensureAdminInitialized(): void {
    if (hasInitializedAdmin && admin.apps.length > 0) return;

    const credential = resolveServiceAccount();
    if (!credential) {
        // Defer throwing until actual runtime usage to avoid failing builds
        throw new Error(
            "Firebase Admin credentials not found. Set FIREBASE_SERVICE_ACCOUNT_KEY or FIREBASE_SERVICE_ACCOUNT_PATH."
        );
    }

    admin.initializeApp({
        credential,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    hasInitializedAdmin = true;
}

export function getAdmin() {
    if (!admin.apps.length) {
        ensureAdminInitialized();
    }
    return admin;
}

export function getAdminDb() {
    return getAdmin().firestore();
}

export function getAdminAuth() {
    return getAdmin().auth();
}
