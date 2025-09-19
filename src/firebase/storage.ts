import {
    ref,
    uploadBytes,
    uploadString,
    getDownloadURL,
    deleteObject,
    UploadResult,
} from "firebase/storage";
import { storage } from "./firebaseConfig";

export const storageService = {
    // Upload a file to Firebase Storage
    uploadFile: async (
        file: File,
        path: string,
        metadata?: { contentType?: string }
    ): Promise<UploadResult> => {
        try {
            const storageRef = ref(storage, path);
            const uploadResult = await uploadBytes(storageRef, file, metadata);
            return uploadResult;
        } catch (error) {
            throw error;
        }
    },

    // Upload a data URL (base64) to Firebase Storage
    uploadDataURL: async (
        dataURL: string,
        path: string,
        metadata?: { contentType?: string }
    ): Promise<UploadResult> => {
        try {
            const storageRef = ref(storage, path);
            const uploadResult = await uploadString(
                storageRef,
                dataURL,
                "data_url",
                metadata
            );
            return uploadResult;
        } catch (error) {
            throw error;
        }
    },

    // Get download URL for a file
    getDownloadURL: async (path: string): Promise<string> => {
        try {
            const storageRef = ref(storage, path);
            const url = await getDownloadURL(storageRef);
            return url;
        } catch (error) {
            throw error;
        }
    },

    // Delete a file from Firebase Storage
    deleteFile: async (path: string): Promise<void> => {
        try {
            const storageRef = ref(storage, path);
            await deleteObject(storageRef);
        } catch (error) {
            throw error;
        }
    },

    // QR Code specific operations
    qrCodes: {
        uploadQRCode: async (
            file: File,
            compoundId: string,
            ownerId: string
        ): Promise<string> => {
            const path = `qrcodes/${compoundId}/${ownerId}/${file.name}`;
            await storageService.uploadFile(file, path, {
                contentType: "image/png",
            });
            return await storageService.getDownloadURL(path);
        },

        deleteQRCode: async (
            compoundId: string,
            ownerId: string,
            fileName: string
        ): Promise<void> => {
            const path = `qrcodes/${compoundId}/${ownerId}/${fileName}`;
            await storageService.deleteFile(path);
        },

        getQRCodeURL: async (
            compoundId: string,
            ownerId: string,
            fileName: string
        ): Promise<string> => {
            const path = `qrcodes/${compoundId}/${ownerId}/${fileName}`;
            return await storageService.getDownloadURL(path);
        },
    },

    // CSV Import specific operations
    csv: {
        uploadCSV: async (file: File, compoundId: string): Promise<string> => {
            const timestamp = Date.now();
            const path = `csv-imports/${compoundId}/${timestamp}-${file.name}`;
            await storageService.uploadFile(file, path, {
                contentType: "text/csv",
            });
            return await storageService.getDownloadURL(path);
        },

        deleteCSV: async (
            compoundId: string,
            fileName: string
        ): Promise<void> => {
            const path = `csv-imports/${compoundId}/${fileName}`;
            await storageService.deleteFile(path);
        },
    },
};
