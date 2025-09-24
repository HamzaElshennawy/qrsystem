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

export interface OwnerInvite {
    id?: string;
    token: string;
    compoundId: string;
    phone: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    propertyUnit?: string;
    status: "pending" | "accepted" | "expired" | "revoked";
    createdBy: string; // admin uid
    acceptedByUid?: string; // auth uid of owner
    acceptedAt?: Timestamp;
    expiresAt?: Timestamp;
    createdAt: Timestamp;
    updatedAt: Timestamp;
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

    // User-specific operations
    users: {
        create: async (
            data: Omit<User, "id" | "createdAt" | "updatedAt">
        ): Promise<string> => {
            // Enforce unique phone when provided (global uniqueness)
            const phone = (data as User).phone?.toString().trim();
            if (phone) {
                const existing = await firestoreService.query<User>("users", [
                    where("phone", "==", phone),
                ]);
                if (existing.length > 0) {
                    throw new Error(`Phone number already in use: ${phone}`);
                }
            }
            return firestoreService.create<User>("users", data);
        },

        getByCompound: async (compoundId: string): Promise<User[]> => {
            const users = await firestoreService.query<User>("users", [
                where("compoundId", "==", compoundId),
            ]);
            // Sort manually to avoid index issues
            return users.sort((a, b) => {
                const aTime = a.createdAt?.toDate().getTime() || 0;
                const bTime = b.createdAt?.toDate().getTime() || 0;
                return bTime - aTime; // Descending order
            });
        },

        getById: async (userId: string): Promise<User | null> => {
            return firestoreService.read<User>("users", userId);
        },

        bulkCreate: async (
            users: Omit<User, "id" | "createdAt" | "updatedAt">[]
        ): Promise<string[]> => {
            const ids: string[] = [];

            // Intra-payload duplicate phone detection
            const seenPhones = new Set<string>();
            for (const u of users) {
                const phone = (u as User).phone?.toString().trim();
                if (phone) {
                    const key = phone;
                    if (seenPhones.has(key)) {
                        throw new Error(`Duplicate phone in CSV/import: ${phone}`);
                    }
                    seenPhones.add(key);
                }
            }

            for (const user of users) {
                // Enforce global uniqueness per create()
                const userId = await firestoreService.users.create(user);
                ids.push(userId);
            }

            return ids;
        },

        getByPhone: async (phone: string): Promise<User[]> => {
            return firestoreService.query<User>("users", [where("phone", "==", phone.trim())]);
        },

        // Enhanced phone number search with multiple format matching
        getByPhoneEnhanced: async (phone: string): Promise<User[]> => {
            // Normalize phone number for better matching - remove ALL non-digit characters except +
            const normalizePhone = (phone: string) => {
                // Remove spaces, dashes, parentheses, and other formatting
                return phone.replace(/[\s\-\(\)\.]/g, '');
            };

            const normalizedPhone = normalizePhone(phone);
            console.log(`Normalizing phone: "${phone}" -> "${normalizedPhone}"`);

            // Try multiple phone number formats
            const phoneVariations = [
                phone, // Original format
                normalizedPhone, // Digits only (no spaces/formatting)
                phone.replace(/\s/g, ''), // Remove only spaces
                phone.replace(/[\s\-]/g, ''), // Remove spaces and dashes
                `+${normalizedPhone.replace(/^\+/, '')}`, // Ensure + prefix
                normalizedPhone.replace(/^\+/, ''), // Remove + prefix
            ];

            // Remove duplicates
            const uniquePhoneVariations = [...new Set(phoneVariations)];
            console.log(`Phone variations to try:`, uniquePhoneVariations);
            
            const owners: User[] = [];

            // Try each phone variation
            for (const phoneVariation of uniquePhoneVariations) {
                try {
                    console.log(`Trying phone variation: "${phoneVariation}"`);
                    const foundOwners = await firestoreService.query<User>("users", [where("phone", "==", phoneVariation)]);
                    console.log(`Found ${foundOwners.length} owners for variation: "${phoneVariation}"`);
                    owners.push(...foundOwners);
                } catch (error) {
                    console.log(`Error searching for phone variation ${phoneVariation}:`, error);
                }
            }

            // Remove duplicates based on user ID
            const uniqueOwners = owners.filter((owner, index, self) => 
                index === self.findIndex(o => o.id === owner.id)
            );

            console.log(`Total unique owners found: ${uniqueOwners.length}`);

            // If no exact matches, try broader search
            if (uniqueOwners.length === 0) {
                console.log("No exact matches found, trying broader search...");
                const allUsers = await firestoreService.query<User>("users", []);
                
                const similarOwners = allUsers.filter((user) => {
                    if (!user.phone) return false;
                    
                    const userPhoneNormalized = normalizePhone(user.phone);
                    const currentPhoneNormalized = normalizePhone(phone);
                    
                    console.log(`Comparing: "${userPhoneNormalized}" vs "${currentPhoneNormalized}"`);
                    
                    // Check if the last 10 digits match (common for US numbers)
                    const userLast10 = userPhoneNormalized.slice(-10);
                    const currentLast10 = currentPhoneNormalized.slice(-10);
                    
                    // Also try full normalized comparison
                    const fullMatch = userPhoneNormalized === currentPhoneNormalized;
                    const last10Match = userLast10 === currentLast10;
                    
                    console.log(`Full match: ${fullMatch}, Last 10 match: ${last10Match}`);
                    
                    return fullMatch || last10Match;
                });
                
                console.log(`Found ${similarOwners.length} similar phone number matches`);
                return similarOwners;
            }

            return uniqueOwners;
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


    // Owner invite operations
    ownerInvites: {
        create: async (
            data: Omit<OwnerInvite, "id" | "status" | "createdAt" | "updatedAt">
        ): Promise<string> => {
            return firestoreService.create<OwnerInvite>("ownerInvites", {
                ...data,
                status: "pending",
            });
        },

        getByToken: async (token: string): Promise<OwnerInvite | null> => {
            const results = await firestoreService.query<OwnerInvite>(
                "ownerInvites",
                [where("token", "==", token)]
            );
            return results.length > 0 ? results[0] : null;
        },

        markAccepted: async (
            id: string,
            acceptedByUid: string
        ): Promise<void> => {
            await firestoreService.update<OwnerInvite>("ownerInvites", id, {
                status: "accepted",
                acceptedByUid,
                acceptedAt: Timestamp.now(),
            });
        },
    },

    // Device session operations
    deviceSessions: {
        create: async (
            data: Omit<DeviceSession, "id" | "createdAt" | "updatedAt">
        ): Promise<string> => {
            return firestoreService.create<DeviceSession>("deviceSessions", data);
        },

        getByUserAndDevice: async (
            userId: string,
            deviceFingerprint: string
        ): Promise<DeviceSession | null> => {
            const results = await firestoreService.query<DeviceSession>(
                "deviceSessions",
                [
                    where("userId", "==", userId),
                    where("deviceFingerprint", "==", deviceFingerprint),
                ]
            );
            return results.length > 0 ? results[0] : null;
        },

        getByUser: async (userId: string): Promise<DeviceSession[]> => {
            return firestoreService.query<DeviceSession>(
                "deviceSessions",
                [where("userId", "==", userId)]
            );
        },

        updateLastUsed: async (
            id: string
        ): Promise<void> => {
            await firestoreService.update<DeviceSession>("deviceSessions", id, {
                lastUsedAt: Timestamp.now(),
            });
        },

        deactivateAll: async (userId: string): Promise<void> => {
            const sessions = await firestoreService.deviceSessions.getByUser(userId);
            for (const session of sessions) {
                if (session.id) {
                    await firestoreService.update<DeviceSession>("deviceSessions", session.id, {
                        isActive: false,
                    });
                }
            }
        },
    },
};
