/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreAdminService } from "@/firebase/firestoreAdmin";

export async function GET(request: NextRequest) {
    try {
        // For now, we'll get user info from request headers or query params
        // In production, you would implement proper JWT token verification here
        
        const { searchParams } = new URL(request.url);
        const phoneNumber = searchParams.get("phone");
        const email = searchParams.get("email");
        const uid = searchParams.get("uid");
        
        console.log("API called with params:", { phoneNumber, email, uid });
        console.log("Firebase user data being searched:", { 
            phone: phoneNumber, 
            email: email, 
            uid: uid,
            phoneLength: phoneNumber?.length,
            emailLength: email?.length,
            uidLength: uid?.length
        });
        
        if (!phoneNumber && !email && !uid) {
            return NextResponse.json(
                { error: "Phone number, email, or UID is required" },
                { status: 400 }
            );
        }

        // Enhanced phone number normalization
        const normalizePhone = (phone: string | null) => {
            if (!phone) return '';
            // Remove spaces, dashes, parentheses, and other formatting
            return phone.replace(/[\s\-\(\)\.]/g, '');
        };

        // Try multiple phone number formats if phone is provided
        let phoneVariations: string[] = [];
        if (phoneNumber) {
            const normalizedPhone = normalizePhone(phoneNumber);
            console.log(`Normalizing phone: "${phoneNumber}" -> "${normalizedPhone}"`);

            phoneVariations = [
                phoneNumber, // Original format
                normalizedPhone, // Digits only (no spaces/formatting)
                phoneNumber.replace(/\s/g, ''), // Remove only spaces
                phoneNumber.replace(/[\s\-]/g, ''), // Remove spaces and dashes
                `+${normalizedPhone.replace(/^\+/, '')}`, // Ensure + prefix
                normalizedPhone.replace(/^\+/, ''), // Remove + prefix
            ];
        }

        const uniquePhoneVariations = [...new Set(phoneVariations)];
        console.log(`Phone variations to try:`, uniquePhoneVariations);

        // First, try to find by UID (in case the user was created with UID mapping)
        let owners: any[] = [];
        
        try {
            // Check if there's a user with UID matching the Firebase Auth UID
            const allUsers = await firestoreAdminService.query("users", []);
            console.log(`Total users in database: ${allUsers.length}`);
            
            // Try to find by UID first (if there's a custom field for Firebase UID)
            const uidMatches = allUsers.filter((user: any) => {
                if (!uid) return false;
                console.log(`Checking UID match for user ${user.id}:`, {
                    userFirebaseUid: user.firebaseUid,
                    userUid: user.uid,
                    searchUid: uid,
                    firebaseUidMatch: user.firebaseUid === uid,
                    uidMatch: user.uid === uid
                });
                return user.firebaseUid === uid || user.uid === uid;
            });
            
            if (uidMatches.length > 0) {
                console.log(`Found ${uidMatches.length} users by UID match`);
                owners = uidMatches;
            } else {
                // Fall back to enhanced phone number matching
                console.log("No UID matches found, trying enhanced phone number matching...");
                
                // Try each phone variation
                for (const phoneVariation of uniquePhoneVariations) {
                    try {
                        console.log(`Trying phone variation: "${phoneVariation}"`);
                        const foundOwners = await firestoreAdminService.query("users", [
                            { field: "phone", op: "==", value: phoneVariation }
                        ]);
                        console.log(`Found ${foundOwners.length} owners for variation: "${phoneVariation}"`);
                        owners.push(...foundOwners);
                    } catch (error) {
                        console.log(`Error searching for phone variation ${phoneVariation}:`, error);
                    }
                }
                
                // Remove duplicates
                owners = owners.filter((owner, index, self) => 
                    index === self.findIndex(o => o.id === owner.id)
                );
                
                // If still no matches, try broader search
                if (owners.length === 0) {
                    console.log("No exact phone matches found, trying broader search...");
                    
                    const similarOwners = allUsers.filter((user: any) => {
                        if (!user.phone || !phoneNumber) return false;
                        
                        const userPhoneNormalized = normalizePhone(user.phone);
                        const currentPhoneNormalized = normalizePhone(phoneNumber);
                        
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
                    owners = similarOwners;
                }
            }
        } catch (error) {
            console.error("Error in enhanced search:", error);
            // Fall back to simple phone search
            owners = await firestoreAdminService.query("users", [
                { field: "phone", op: "==", value: phoneNumber }
            ]);
        }

        console.log(`Found ${owners.length} owners using enhanced search`);

        if (owners.length === 0) {
            // Try to match by email if phone doesn't work
            if (email) {
                console.log("Trying email matching...");
                const allUsers = await firestoreAdminService.query("users", []);
                console.log(`Searching for email: "${email}"`);
                const emailMatches = allUsers.filter((user: any) => {
                    const match = user.email === email;
                    console.log(`Email comparison for user ${user.id}: "${user.email}" === "${email}" = ${match}`);
                    return match;
                });
                if (emailMatches.length > 0) {
                    console.log(`Found ${emailMatches.length} users by email match`);
                    owners = emailMatches;
                }
            }
            
            // If still no matches, try partial email matching as last resort
            if (owners.length === 0 && email) {
                console.log("Trying partial email matching as last resort...");
                const allUsers = await firestoreAdminService.query("users", []);
                const partialEmailMatches = allUsers.filter((user: any) => {
                    if (!user.email || !email) return false;
                    // Try to match by email domain or partial email
                    const emailDomain = email.split('@')[1];
                    const userEmailDomain = user.email.split('@')[1];
                    const partialMatch = user.email.includes(email.split('@')[0]) || email.includes(user.email.split('@')[0]);
                    const domainMatch = emailDomain === userEmailDomain;
                    console.log(`Partial email check for user ${user.id}: "${user.email}" vs "${email}" - domain: ${domainMatch}, partial: ${partialMatch}`);
                    return partialMatch || domainMatch;
                });
                if (partialEmailMatches.length > 0) {
                    console.log(`Found ${partialEmailMatches.length} users by partial email match`);
                    owners = partialEmailMatches;
                }
            }
            
            // If still no matches, show all users for debugging
            if (owners.length === 0) {
                const allUsers = await firestoreAdminService.query("users", []);
                return NextResponse.json(
                    { 
                        error: "Owner not found",
                        debug: {
                            searchedPhone: phoneNumber,
                            searchedEmail: email,
                            searchedUID: uid,
                            phoneVariations: uniquePhoneVariations,
                            totalUsersInDB: allUsers.length,
                            allUsers: allUsers.map(u => ({
                                id: u.id,
                                name: `${u.firstName} ${u.lastName}`,
                                phone: u.phone,
                                email: u.email,
                                compoundId: u.compoundId,
                                firebaseUid: u.firebaseUid
                            }))
                        }
                    },
                    { status: 404 }
                );
            }
        }

        // Get compounds for each owner
        const ownerData = await Promise.all(
            owners.map(async (owner) => {
                const compound = await firestoreAdminService.compounds.getById(owner.compoundId);
                return {
                    ...owner,
                    compound: compound,
                };
            })
        );

        return NextResponse.json({
            success: true,
            owners: ownerData,
            debug: {
                searchedPhone: phoneNumber,
                searchedEmail: email,
                searchedUID: uid,
                foundOwners: owners.length
            }
        });
    } catch (error: any) {
        console.error("Get owner profile error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch owner profile" },
            { status: 500 }
        );
    }
}
