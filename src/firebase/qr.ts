import QRCodeLib from "qrcode";
import { firestoreService, type QRCode, type User } from "./firestore";

export interface QRCodeData {
    ownerId: string;
    compoundId: string;
    ownerName: string;
    propertyUnit?: string;
    timestamp: number;
    signature: string;
}

export const qrService = {
    // Generate QR code data string
    generateQRData: (data: QRCodeData): string => {
        return JSON.stringify(data);
    },

    // Parse QR code data string
    parseQRData: (qrString: string): QRCodeData => {
        try {
            return JSON.parse(qrString);
        } catch (error) {
            throw new Error("Invalid QR code data format");
        }
    },

    // Generate QR code as data URL (for display)
    generateQRCodeDataURL: async (
        data: QRCodeData,
        options?: {
            width?: number;
            margin?: number;
            color?: {
                dark?: string;
                light?: string;
            };
        }
    ): Promise<string> => {
        try {
            const qrString = qrService.generateQRData(data);
            const defaultOptions = {
                width: options?.width || 256,
                margin: options?.margin || 2,
                color: {
                    dark: options?.color?.dark || "#000000",
                    light: options?.color?.light || "#FFFFFF",
                },
            };

            return await QRCodeLib.toDataURL(qrString, defaultOptions);
        } catch (error) {
            throw error;
        }
    },

    // Generate QR code as PNG buffer (for download)
    generateQRCodeBuffer: async (
        data: QRCodeData,
        options?: {
            width?: number;
            margin?: number;
            color?: {
                dark?: string;
                light?: string;
            };
        }
    ): Promise<string> => {
        try {
            const qrString = qrService.generateQRData(data);
            const defaultOptions = {
                width: options?.width || 256,
                margin: options?.margin || 2,
                color: {
                    dark: options?.color?.dark || "#000000",
                    light: options?.color?.light || "#FFFFFF",
                },
            };

            // Use toDataURL instead of toBuffer for browser compatibility
            return await QRCodeLib.toDataURL(qrString, defaultOptions);
        } catch (error) {
            throw error;
        }
    },

    // Generate QR code for a user
    generateUserQRCode: async (
        user: User,
        compoundId: string,
        signature?: string
    ): Promise<{
        qrData: string;
        dataURL: string;
        buffer: string;
    }> => {
        try {
            const timestamp = Date.now();
            const qrData: QRCodeData = {
                ownerId: user.id!,
                compoundId,
                ownerName: `${user.firstName} ${user.lastName}`,
                propertyUnit: user.propertyUnit,
                timestamp,
                signature: signature || `qr_${user.id}_${timestamp}`,
            };

            const qrString = qrService.generateQRData(qrData);
            const dataURL = await qrService.generateQRCodeDataURL(qrData);
            const bufferDataURL = await qrService.generateQRCodeBuffer(qrData);

            return {
                qrData: qrString,
                dataURL,
                buffer: bufferDataURL, // Now returns data URL instead of buffer
            };
        } catch (error) {
            throw error;
        }
    },

    // Create and save QR code to Firestore
    createAndSaveQRCode: async (
        user: User,
        compoundId: string,
        generatedBy: string
    ): Promise<string> => {
        try {
            const qrResult = await qrService.generateUserQRCode(
                user,
                compoundId
            );

            const qrCodeData: Omit<QRCode, "id" | "createdAt" | "updatedAt"> = {
                compoundId,
                ownerId: user.id!,
                ownerName: `${user.firstName} ${user.lastName}`,
                qrData: qrResult.qrData,
                isActive: true,
                metadata: {
                    generatedBy,
                    scanCount: 0,
                },
            };

            return await firestoreService.qrCodes.create(qrCodeData);
        } catch (error) {
            throw error;
        }
    },

    // Bulk generate QR codes for multiple users
    bulkGenerateQRCodes: async (
        users: User[],
        compoundId: string,
        generatedBy: string
    ): Promise<string[]> => {
        try {
            const qrCodeIds: string[] = [];

            for (const user of users) {
                const qrCodeId = await qrService.createAndSaveQRCode(
                    user,
                    compoundId,
                    generatedBy
                );
                qrCodeIds.push(qrCodeId);
            }

            return qrCodeIds;
        } catch (error) {
            throw error;
        }
    },

    // Validate QR code
    validateQRCode: async (
        qrString: string
    ): Promise<{
        isValid: boolean;
        data?: QRCodeData;
        error?: string;
    }> => {
        try {
            const qrData = qrService.parseQRData(qrString);

            // Check if user exists and is active
            const user = await firestoreService.users.getById(qrData.ownerId);
            if (!user || !user.isActive) {
                return {
                    isValid: false,
                    error: "User not found or inactive",
                };
            }

            // Check if compound exists
            const compound = await firestoreService.compounds.getById(
                qrData.compoundId
            );
            if (!compound) {
                return {
                    isValid: false,
                    error: "Compound not found",
                };
            }

            return {
                isValid: true,
                data: qrData,
            };
        } catch (error) {
            return {
                isValid: false,
                error:
                    error instanceof Error ? error.message : "Invalid QR code",
            };
        }
    },
};
