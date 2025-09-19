import {
    collection,
    doc,
    getDoc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    QueryConstraint,
    Timestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

// Type definitions for Firestore collections
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

export interface Owner {
    id?: string;
    compoundId: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    propertyUnit?: string;
    isActive: boolean;
    paymentStatus?: "paid" | "pending" | "overdue";
    lastPaymentDate?: Timestamp;
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

export const firestoreService = {
    // Generic CRUD operations
    create: async <T>(
        collectionName: string,
        data: Omit<T, "id" | "createdAt" | "updatedAt">
    ): Promise<string> => {
        try {
            const docRef = await addDoc(collection(db, collectionName), {
                ...data,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            });
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
            const docRef = doc(db, collectionName, docId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
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
            const docRef = doc(db, collectionName, docId);
            await updateDoc(docRef, {
                ...data,
                updatedAt: Timestamp.now(),
            });
        } catch (error) {
            throw error;
        }
    },

    delete: async (collectionName: string, docId: string): Promise<void> => {
        try {
            const docRef = doc(db, collectionName, docId);
            await deleteDoc(docRef);
        } catch (error) {
            throw error;
        }
    },

    query: async <T>(
        collectionName: string,
        constraints: QueryConstraint[] = []
    ): Promise<T[]> => {
        try {
            const q = query(collection(db, collectionName), ...constraints);
            const querySnapshot = await getDocs(q);

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
            return firestoreService.create<Compound>("compounds", data);
        },

        getByAdmin: async (adminId: string): Promise<Compound[]> => {
            try {
                console.log("Querying compounds for admin:", adminId);
                // Try with orderBy first
                const result = await firestoreService.query<Compound>(
                    "compounds",
                    [
                        where("adminId", "==", adminId),
                        orderBy("createdAt", "desc"),
                    ]
                );
                console.log("Query result:", result);
                return result;
            } catch (error) {
                console.error("Error in getByAdmin with orderBy:", error);
                // Fallback to simple query without orderBy
                try {
                    console.log("Trying fallback query without orderBy...");
                    const result = await firestoreService.query<Compound>(
                        "compounds",
                        [where("adminId", "==", adminId)]
                    );
                    console.log("Fallback query result:", result);
                    // Sort manually in JavaScript
                    return result.sort((a, b) => {
                        const aTime = a.createdAt?.toDate().getTime() || 0;
                        const bTime = b.createdAt?.toDate().getTime() || 0;
                        return bTime - aTime; // Descending order
                    });
                } catch (fallbackError) {
                    console.error("Fallback query also failed:", fallbackError);
                    throw fallbackError;
                }
            }
        },

        getById: async (compoundId: string): Promise<Compound | null> => {
            return firestoreService.read<Compound>("compounds", compoundId);
        },
    },

    // Owner-specific operations
    owners: {
        create: async (
            data: Omit<Owner, "id" | "createdAt" | "updatedAt">
        ): Promise<string> => {
            return firestoreService.create<Owner>("owners", data);
        },

        getByCompound: async (compoundId: string): Promise<Owner[]> => {
            const owners = await firestoreService.query<Owner>("owners", [
                where("compoundId", "==", compoundId),
            ]);
            // Sort manually to avoid index issues
            return owners.sort((a, b) => {
                const aTime = a.createdAt?.toDate().getTime() || 0;
                const bTime = b.createdAt?.toDate().getTime() || 0;
                return bTime - aTime; // Descending order
            });
        },

        getById: async (ownerId: string): Promise<Owner | null> => {
            return firestoreService.read<Owner>("owners", ownerId);
        },

        bulkCreate: async (
            owners: Omit<Owner, "id" | "createdAt" | "updatedAt">[]
        ): Promise<string[]> => {
            const batch = [];
            const ids: string[] = [];

            for (const owner of owners) {
                const docRef = doc(collection(db, "owners"));
                batch.push(docRef);
                ids.push(docRef.id);

                // Note: In a real implementation, you'd use writeBatch for atomic operations
                await firestoreService.create<Owner>("owners", owner);
            }

            return ids;
        },
    },

    // QR Code-specific operations
    qrCodes: {
        create: async (
            data: Omit<QRCode, "id" | "createdAt" | "updatedAt">
        ): Promise<string> => {
            return firestoreService.create<QRCode>("qrcodes", data);
        },

        getByCompound: async (compoundId: string): Promise<QRCode[]> => {
            const qrCodes = await firestoreService.query<QRCode>("qrcodes", [
                where("compoundId", "==", compoundId),
            ]);
            // Sort manually to avoid index issues
            return qrCodes.sort((a, b) => {
                const aTime = a.createdAt?.toDate().getTime() || 0;
                const bTime = b.createdAt?.toDate().getTime() || 0;
                return bTime - aTime; // Descending order
            });
        },

        getByOwner: async (ownerId: string): Promise<QRCode[]> => {
            return firestoreService.query<QRCode>("qrcodes", [
                where("ownerId", "==", ownerId),
            ]);
        },
    },

    // Entry Point-specific operations
    entryPoints: {
        create: async (
            data: Omit<EntryPoint, "id" | "createdAt" | "updatedAt">
        ): Promise<string> => {
            return firestoreService.create<EntryPoint>("entryPoints", data);
        },

        getByCompound: async (compoundId: string): Promise<EntryPoint[]> => {
            const entryPoints = await firestoreService.query<EntryPoint>(
                "entryPoints",
                [where("compoundId", "==", compoundId)]
            );
            // Sort manually to avoid index issues
            return entryPoints.sort((a, b) => {
                const aTime = a.createdAt?.toDate().getTime() || 0;
                const bTime = b.createdAt?.toDate().getTime() || 0;
                return bTime - aTime; // Descending order
            });
        },
    },
};
