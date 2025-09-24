import "server-only";
import { Timestamp } from "firebase-admin/firestore";
import * as admin from "firebase-admin";
import { getAdminDb } from "./firebaseAdmin";

// Type definitions for Firestore collections (same as client-side)
export interface Compound {
    id?: string;
    name: string;
    address: string;
    adminId: string;
    adminEmail: string;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    settings?: {
        allowCSVImport: boolean;
        autoGenerateQR: boolean;
    };
}

export interface User {
    id?: string;
    compoundId: string;
    type: "owner" | "employee" | "manager";
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    propertyUnit?: string;
    isActive: boolean;
    paymentStatus?: "paid" | "pending" | "overdue";
    lastPaymentDate?: Timestamp;
    // Enhanced authentication fields
    firebaseUid?: string;
    hasPassword?: boolean;
    passwordHash?: string; // Only stored on server-side
    isFirstTimeLogin?: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface QRCode {
    id?: string;
    compoundId: string;
    ownerId: string;
    ownerName: string;
    qrData: string;
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    metadata?: {
        generatedBy: string;
        lastScanned?: Timestamp;
        scanCount: number;
    };
}

export interface EntryPoint {
    id?: string;
    compoundId: string;
    name: string;
    location: string;
    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
    settings?: {
        allowAllOwners: boolean;
        allowedOwners?: string[];
        scanRequired: boolean;
        allowRenters?: boolean;
        allowGuests?: boolean;
        enforcePaymentStatus?: boolean;
    };
}

export interface DeviceSession {
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

export const firestoreAdminService = {
    // Generic CRUD operations
    create: async <T>(
        collectionName: string,
        data: Omit<T, "id" | "createdAt" | "updatedAt">
    ): Promise<string> => {
        try {
            const docRef = getAdminDb().collection(collectionName).doc();
            const docData = {
                ...data,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };
            await docRef.set(docData);
            return docRef.id;
        } catch (error) {
            throw error;
        }
    },

    read: async <T>(
        collectionName: string,
        docId: string
    ): Promise<T | null> => {
        try {
            const docRef = getAdminDb().collection(collectionName).doc(docId);
            const docSnap = await docRef.get();

            if (docSnap.exists) {
                return { id: docSnap.id, ...docSnap.data() } as T;
            }
            return null;
        } catch (error) {
            throw error;
        }
    },

    update: async <T>(
        collectionName: string,
        docId: string,
        data: Partial<T>
    ): Promise<void> => {
        try {
            const docRef = getAdminDb().collection(collectionName).doc(docId);
            await docRef.update({
                ...data,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            throw error;
        }
    },

    delete: async (collectionName: string, docId: string): Promise<void> => {
        try {
            const docRef = getAdminDb().collection(collectionName).doc(docId);
            await docRef.delete();
        } catch (error) {
            throw error;
        }
    },

    query: async <T>(
        collectionName: string,
        constraints: {
            field: string;
            op: admin.firestore.WhereFilterOp;
            value: unknown;
        }[] = []
    ): Promise<T[]> => {
        try {
            let query: admin.firestore.Query =
                getAdminDb().collection(collectionName);
            constraints.forEach((constraint) => {
                query = query.where(
                    constraint.field,
                    constraint.op,
                    constraint.value
                );
            });

            const querySnapshot = await query.get();
            return querySnapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as T[];
        } catch (error) {
            throw error;
        }
    },

    // Compound-specific operations
    compounds: {
        create: async (
            data: Omit<Compound, "id" | "createdAt" | "updatedAt">
        ): Promise<string> => {
            return firestoreAdminService.create<Compound>("compounds", data);
        },

        getByAdmin: async (adminId: string): Promise<Compound[]> => {
            try {
                const compounds = await firestoreAdminService.query<Compound>(
                    "compounds",
                    [{ field: "adminId", op: "==", value: adminId }]
                );
                // Sort manually since admin SDK doesn't have orderBy in the same way
                return compounds.sort((a, b) => {
                    const aTime = a.createdAt?.toDate().getTime() || 0;
                    const bTime = b.createdAt?.toDate().getTime() || 0;
                    return bTime - aTime; // Descending order
                });
            } catch (error) {
                throw error;
            }
        },

        getById: async (compoundId: string): Promise<Compound | null> => {
            return firestoreAdminService.read<Compound>(
                "compounds",
                compoundId
            );
        },
    },

    // User-specific operations
    users: {
        create: async (
            data: Omit<User, "id" | "createdAt" | "updatedAt">
        ): Promise<string> => {
            return firestoreAdminService.create<User>("users", data);
        },

        getByCompound: async (compoundId: string): Promise<User[]> => {
            const users = await firestoreAdminService.query<User>("users", [
                { field: "compoundId", op: "==", value: compoundId },
            ]);
            // Sort manually
            return users.sort((a, b) => {
                const aTime = a.createdAt?.toDate().getTime() || 0;
                const bTime = b.createdAt?.toDate().getTime() || 0;
                return bTime - aTime; // Descending order
            });
        },

        getById: async (userId: string): Promise<User | null> => {
            return firestoreAdminService.read<User>("users", userId);
        },

        bulkCreate: async (
            users: Omit<User, "id" | "createdAt" | "updatedAt">[]
        ): Promise<string[]> => {
            const ids: string[] = [];

            for (const user of users) {
                // Create each user and collect the actual ID
                const userId = await firestoreAdminService.create<User>(
                    "users",
                    user
                );
                ids.push(userId);
            }

            return ids;
        },
    },

    // QR Code-specific operations
    qrCodes: {
        create: async (
            data: Omit<QRCode, "id" | "createdAt" | "updatedAt">
        ): Promise<string> => {
            return firestoreAdminService.create<QRCode>("qrcodes", data);
        },

        getByCompound: async (compoundId: string): Promise<QRCode[]> => {
            const qrCodes = await firestoreAdminService.query<QRCode>(
                "qrcodes",
                [{ field: "compoundId", op: "==", value: compoundId }]
            );
            // Sort manually
            return qrCodes.sort((a, b) => {
                const aTime = a.createdAt?.toDate().getTime() || 0;
                const bTime = b.createdAt?.toDate().getTime() || 0;
                return bTime - aTime; // Descending order
            });
        },

        getByOwner: async (ownerId: string): Promise<QRCode[]> => {
            return firestoreAdminService.query<QRCode>("qrcodes", [
                { field: "ownerId", op: "==", value: ownerId },
            ]);
        },
    },

    // Entry Point-specific operations
    entryPoints: {
        create: async (
            data: Omit<EntryPoint, "id" | "createdAt" | "updatedAt">
        ): Promise<string> => {
            return firestoreAdminService.create<EntryPoint>(
                "entryPoints",
                data
            );
        },

        getByCompound: async (compoundId: string): Promise<EntryPoint[]> => {
            const entryPoints = await firestoreAdminService.query<EntryPoint>(
                "entryPoints",
                [{ field: "compoundId", op: "==", value: compoundId }]
            );
            // Sort manually
            return entryPoints.sort((a, b) => {
                const aTime = a.createdAt?.toDate().getTime() || 0;
                const bTime = b.createdAt?.toDate().getTime() || 0;
                return bTime - aTime; // Descending order
            });
        },
    },

    // Device session operations
    deviceSessions: {
        create: async (
            data: Omit<DeviceSession, "id" | "createdAt" | "updatedAt">
        ): Promise<string> => {
            return firestoreAdminService.create<DeviceSession>("deviceSessions", data);
        },

        getByUserAndDevice: async (
            userId: string,
            deviceFingerprint: string
        ): Promise<DeviceSession | null> => {
            const results = await firestoreAdminService.query<DeviceSession>(
                "deviceSessions",
                [
                    { field: "userId", op: "==", value: userId },
                    { field: "deviceFingerprint", op: "==", value: deviceFingerprint },
                ]
            );
            return results.length > 0 ? results[0] : null;
        },

        getByUser: async (userId: string): Promise<DeviceSession[]> => {
            return firestoreAdminService.query<DeviceSession>(
                "deviceSessions",
                [{ field: "userId", op: "==", value: userId }]
            );
        },

        updateLastUsed: async (
            id: string
        ): Promise<void> => {
            await firestoreAdminService.update<DeviceSession>("deviceSessions", id, {
                lastUsedAt: Timestamp.now(),
            });
        },

        deactivateAll: async (userId: string): Promise<void> => {
            const sessions = await firestoreAdminService.deviceSessions.getByUser(userId);
            for (const session of sessions) {
                if (session.id) {
                    await firestoreAdminService.update<DeviceSession>("deviceSessions", session.id, {
                        isActive: false,
                    });
                }
            }
        },
    },
};
