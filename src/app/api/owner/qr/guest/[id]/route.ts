/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreAdminService } from "@/firebase/firestoreAdmin";

export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const qrCodeId = params.id;
        console.log(`Attempting to delete QR code: ${qrCodeId}`);

        const { searchParams } = new URL(request.url);
        const phoneNumber = searchParams.get("phoneNumber");
        const email = searchParams.get("email");
        const uid = searchParams.get("uid");

        console.log("Delete request params:", { phoneNumber, email, uid });

        if (!phoneNumber && !email && !uid) {
            return NextResponse.json(
                { error: "Phone number, email, or UID is required" },
                { status: 400 }
            );
        }

        // Enhanced phone number normalization
        const normalizePhone = (phone: string) => {
            if (!phone) return "";
            return phone.replace(/[\s\-\(\)\.]/g, "");
        };

        // Try multiple phone number formats if phone is provided
        let phoneVariations: string[] = [];
        if (phoneNumber) {
            const normalizedPhone = normalizePhone(phoneNumber);
            phoneVariations = [
                phoneNumber, // Original format
                normalizedPhone, // Digits only (no spaces/formatting)
                phoneNumber.replace(/\s/g, ""), // Remove only spaces
                phoneNumber.replace(/[\s\-]/g, ""), // Remove spaces and dashes
                `+${normalizedPhone.replace(/^\+/, "")}`, // Ensure + prefix
                normalizedPhone.replace(/^\+/, ""), // Remove + prefix
            ];
        }

        const uniquePhoneVariations = [...new Set(phoneVariations)];
        let owners: any[] = [];

        // Try each phone variation
        for (const phoneVariation of uniquePhoneVariations) {
            try {
                const foundOwners = await firestoreAdminService.query("users", [
                    { field: "phone", op: "==", value: phoneVariation },
                ]);
                owners.push(...foundOwners);
            } catch (error) {
                console.log(
                    `Error searching for phone variation ${phoneVariation}:`,
                    error
                );
            }
        }

        // Remove duplicates
        owners = owners.filter(
            (owner, index, self) =>
                index === self.findIndex((o) => o.id === owner.id)
        );

        // If no exact matches, try broader search
        if (owners.length === 0 && phoneNumber) {
            const allUsers = await firestoreAdminService.query("users", []);
            const similarOwners = allUsers.filter((user: any) => {
                if (!user.phone) return false;

                const userPhoneNormalized = normalizePhone(user.phone);
                const currentPhoneNormalized = normalizePhone(phoneNumber);

                const userLast10 = userPhoneNormalized.slice(-10);
                const currentLast10 = currentPhoneNormalized.slice(-10);

                return (
                    userPhoneNormalized === currentPhoneNormalized ||
                    userLast10 === currentLast10
                );
            });

            owners = similarOwners;
        }

        // Try email matching if phone doesn't work
        if (owners.length === 0 && email) {
            const allUsers = await firestoreAdminService.query("users", []);
            const emailMatches = allUsers.filter(
                (user: any) => user.email === email
            );
            owners = emailMatches;
        }

        // Try UID matching if email doesn't work
        if (owners.length === 0 && uid) {
            const allUsers = await firestoreAdminService.query("users", []);
            const uidMatches = allUsers.filter(
                (user: any) => user.firebaseUid === uid || user.uid === uid
            );
            owners = uidMatches;
        }

        if (owners.length === 0) {
            return NextResponse.json(
                { error: "Owner not found" },
                { status: 404 }
            );
        }

        // Check if the QR code exists and belongs to one of the owners
        // Try both possible collection names
        let qrCode = await firestoreAdminService.read("qrcodes", qrCodeId);
        let collectionName = "qrcodes";

        if (!qrCode) {
            console.log(
                `QR code not found in 'qrcodes', trying 'qrCodes' collection`
            );
            qrCode = await firestoreAdminService.read("qrCodes", qrCodeId);
            collectionName = "qrCodes";
        }

        if (!qrCode) {
            console.log(`QR code ${qrCodeId} not found in either collection`);
            return NextResponse.json(
                { error: "QR code not found" },
                { status: 404 }
            );
        }

        console.log(`Found QR code in collection '${collectionName}'`);

        // Check if the QR code belongs to one of the authenticated owners
        const ownerIds = owners.map((owner) => owner.id);
        if (!ownerIds.includes((qrCode as any).ownerId)) {
            return NextResponse.json(
                { error: "You don't have permission to delete this QR code" },
                { status: 403 }
            );
        }

        // Delete the QR code from the correct collection
        await firestoreAdminService.delete(collectionName, qrCodeId);
        console.log(
            `Successfully deleted QR code ${qrCodeId} from collection '${collectionName}'`
        );

        return NextResponse.json({
            success: true,
            message: "QR code deleted successfully",
        });
    } catch (error: any) {
        console.error("Delete guest QR code error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to delete guest QR code" },
            { status: 500 }
        );
    }
}
