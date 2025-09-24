/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreAdminService } from "@/firebase/firestoreAdmin";
import { qrService } from "@/firebase/qr";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const compoundId = searchParams.get("compoundId");
        const phoneNumber = searchParams.get("phone");
        const email = searchParams.get("email");
        const uid = searchParams.get("uid");

        if (!compoundId) {
            return NextResponse.json(
                { error: "compoundId is required" },
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
            return phone.replace(/[\s\-\(\)\.]/g, '');
        };

        // Try multiple phone number formats if phone is provided
        let phoneVariations: string[] = [];
        if (phoneNumber) {
            const normalizedPhone = normalizePhone(phoneNumber);
            phoneVariations = [
                phoneNumber,
                normalizedPhone,
                phoneNumber.replace(/\s/g, ''),
                phoneNumber.replace(/[\s\-]/g, ''),
                `+${normalizedPhone.replace(/^\+/, '')}`,
                normalizedPhone.replace(/^\+/, ''),
            ];
        }

        const uniquePhoneVariations = [...new Set(phoneVariations)];
        let owners: any[] = [];

        // Try each phone variation
        for (const phoneVariation of uniquePhoneVariations) {
            try {
                const foundOwners = await firestoreAdminService.query("users", [
                    { field: "phone", op: "==", value: phoneVariation }
                ]);
                owners.push(...foundOwners);
            } catch (error) {
                console.log(`Error searching for phone variation ${phoneVariation}:`, error);
            }
        }

        // Remove duplicates
        owners = owners.filter((owner, index, self) => 
            index === self.findIndex(o => o.id === owner.id)
        );

        // If no exact matches, try broader search
        if (owners.length === 0) {
            const allUsers = await firestoreAdminService.query("users", []);
            const similarOwners = allUsers.filter((user: any) => {
                if (!user.phone) return false;
                
                const userPhoneNormalized = normalizePhone(user.phone);
                const currentPhoneNormalized = normalizePhone(phoneNumber || '');
                
                const userLast10 = userPhoneNormalized.slice(-10);
                const currentLast10 = currentPhoneNormalized.slice(-10);
                
                return userPhoneNormalized === currentPhoneNormalized || userLast10 === currentLast10;
            });
            
            owners = similarOwners;
        }

        // Try email matching if phone doesn't work
        if (owners.length === 0 && email) {
            const allUsers = await firestoreAdminService.query("users", []);
            const emailMatches = allUsers.filter((user: any) => user.email === email);
            owners = emailMatches;
        }

        // Try UID matching if email doesn't work
        if (owners.length === 0 && uid) {
            const allUsers = await firestoreAdminService.query("users", []);
            const uidMatches = allUsers.filter((user: any) => 
                user.firebaseUid === uid || user.uid === uid
            );
            owners = uidMatches;
        }

        const owner = owners.find(o => o.compoundId === compoundId);
        
        if (!owner) {
            return NextResponse.json(
                { error: "Owner not found for this compound" },
                { status: 404 }
            );
        }

        // Generate fresh QR code data
        const qrResult = await qrService.generateUserQRCode(owner, compoundId);
        
        return NextResponse.json({
            success: true,
            qrCode: {
                dataURL: qrResult.dataURL,
                qrData: qrResult.qrData,
                timestamp: Date.now(),
            },
        });
    } catch (error: any) {
        console.error("Get entrance QR code error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to generate entrance QR code" },
            { status: 500 }
        );
    }
}
