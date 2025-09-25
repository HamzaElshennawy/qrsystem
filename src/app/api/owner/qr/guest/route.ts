/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreAdminService } from "@/firebase/firestoreAdmin";
import { qrService } from "@/firebase/qr";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const phoneNumber = searchParams.get("phoneNumber");
        const email = searchParams.get("email");
        const uid = searchParams.get("uid");

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

        // Get all guest QR codes for all owner's compounds
        const guestQRCodes: any[] = [];
        for (const owner of owners) {
            console.log(`Fetching QR codes for owner: ${owner.id}`);

            // First query all QR codes for this owner (try both possible collection names)
            let allQRCodes = await firestoreAdminService.query("qrcodes", [
                { field: "ownerId", op: "==", value: owner.id },
            ]);

            // If no QR codes found, try the old collection name
            if (allQRCodes.length === 0) {
                console.log(
                    `No QR codes found in 'qrcodes', trying 'qrCodes' collection`
                );
                allQRCodes = await firestoreAdminService.query("qrCodes", [
                    { field: "ownerId", op: "==", value: owner.id },
                ]);
            }

            console.log(
                `Found ${allQRCodes.length} total QR codes for owner ${owner.id}`
            );

            // Debug: Log all QR codes for this owner
            console.log(
                `All QR codes for owner ${owner.id}:`,
                (allQRCodes as any[]).map((qr: any) => ({
                    id: qr.id,
                    metadata: qr.metadata,
                    hasMetadata: !!qr.metadata,
                    isGuest: qr.metadata?.isGuest,
                }))
            );

            // Filter for guest QR codes in memory
            const guestQRCodesForOwner = (allQRCodes as any[]).filter(
                (qrCode) => qrCode.metadata && qrCode.metadata.isGuest === true
            );

            console.log(
                `Found ${guestQRCodesForOwner.length} guest QR codes for owner ${owner.id}`
            );

            for (const qrCode of guestQRCodesForOwner) {
                try {
                    // Parse the QR data and regenerate the dataURL
                    const parsedData = qrService.parseQRData(qrCode.qrData);
                    const dataURL = await qrService.generateQRCodeDataURL(
                        parsedData
                    );

                    guestQRCodes.push({
                        id: qrCode.id,
                        dataURL: dataURL,
                        qrData: qrCode.qrData,
                        guestName:
                            qrCode.metadata?.guestName || "Unknown Guest",
                        expirationTime: qrCode.metadata?.expirationTime || 0,
                        expiresAt: qrCode.metadata?.expirationTime
                            ? new Date(
                                  qrCode.metadata.expirationTime
                              ).toISOString()
                            : null,
                        compoundId: qrCode.compoundId,
                        createdAt: qrCode.createdAt?.toDate().toISOString(),
                    });
                } catch (error) {
                    console.error(
                        `Error processing QR code ${qrCode.id}:`,
                        error
                    );
                }
            }
        }

        // Sort by creation date, most recent first
        guestQRCodes.sort(
            (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
        );

        return NextResponse.json({
            success: true,
            qrCodes: guestQRCodes,
        });
    } catch (error: any) {
        console.error("Fetch guest QR codes error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch guest QR codes" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const {
            compoundId,
            guestName,
            guestPhone,
            purpose,
            phoneNumber,
            email,
            uid,
        } = await request.json();

        if (!compoundId || !guestName) {
            return NextResponse.json(
                { error: "compoundId and guestName are required" },
                { status: 400 }
            );
        }

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

        const owner = owners.find((o) => o.compoundId === compoundId);

        if (!owner) {
            return NextResponse.json(
                { error: "Owner not found for this compound" },
                { status: 404 }
            );
        }

        // Create guest QR code data with 1-day expiration
        const timestamp = Date.now();
        const expirationTime = timestamp + 24 * 60 * 60 * 1000; // 24 hours from now

        const guestQRData = {
            ownerId: owner.id!,
            compoundId: compoundId,
            ownerName: `${owner.firstName} ${owner.lastName}`,
            propertyUnit: owner.propertyUnit,
            timestamp: timestamp,
            signature: `guest_${owner.id}_${timestamp}`,
            guestName: guestName,
            guestPhone: guestPhone || "",
            purpose: purpose || "Visit",
            expirationTime: expirationTime,
            isGuest: true,
        };

        const qrString = qrService.generateQRData(guestQRData);
        const dataURL = await qrService.generateQRCodeDataURL(guestQRData);

        // Save guest QR code to database
        const guestQRCodeData = {
            compoundId: compoundId,
            ownerId: owner.id!,
            ownerName: `${owner.firstName} ${owner.lastName}`,
            qrData: qrString,
            isActive: true,
            metadata: {
                generatedBy: uid || email || phoneNumber,
                scanCount: 0,
                guestName: guestName,
                guestPhone: guestPhone || "",
                purpose: purpose || "Visit",
                expirationTime: expirationTime,
                isGuest: true,
            },
        };

        const qrCodeId = await firestoreAdminService.qrCodes.create(
            guestQRCodeData
        );

        return NextResponse.json({
            success: true,
            qrCode: {
                id: qrCodeId,
                dataURL: dataURL,
                qrData: qrString,
                guestName: guestName,
                expirationTime: expirationTime,
                expiresAt: new Date(expirationTime).toISOString(),
            },
        });
    } catch (error: any) {
        console.error("Generate guest QR code error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate guest QR code" },
            { status: 500 }
        );
    }
}
