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
            uidLength: uid?.length,
        });

        if (!phoneNumber && !email && !uid) {
            return NextResponse.json(
                { error: "Phone number, email, or UID is required" },
                { status: 400 }
            );
        }

        // Enhanced phone number normalization
        const normalizePhone = (phone: string | null) => {
            if (!phone) return "";
            // Remove spaces, dashes, parentheses, and other formatting
            return phone.replace(/[\s\-\(\)\.]/g, "");
        };

        // Try multiple phone number formats if phone is provided
        let phoneVariations: string[] = [];
        if (phoneNumber) {
            const normalizedPhone = normalizePhone(phoneNumber);
            console.log(
                `Normalizing phone: "${phoneNumber}" -> "${normalizedPhone}"`
            );

            const withoutPlus = normalizedPhone.replace(/^\+/, "");
            const egyptianLocal = withoutPlus.startsWith("20")
                ? `0${withoutPlus.replace(/^20/, "")}`
                : null;

            phoneVariations = [
                phoneNumber, // Original format
                normalizedPhone, // Digits only (no spaces/formatting)
                phoneNumber.replace(/\s/g, ""), // Remove only spaces
                phoneNumber.replace(/[\s\-]/g, ""), // Remove spaces and dashes
                `+${withoutPlus}`, // Ensure + prefix
                withoutPlus, // Remove + prefix
                ...(egyptianLocal ? [egyptianLocal] : []),
            ];
        }

        const uniquePhoneVariations = [...new Set(phoneVariations)];
        console.log(`Phone variations to try:`, uniquePhoneVariations);

        // If client provided a phone, perform phone-first lookup and if not found
        // return 404 indicating the phone is not registered by the admin. This
        // prevents returning unrelated admin profiles for phone-based OTP flows.
        let owners: any[] = [];

        if (phoneNumber) {
            try {
                // Try each phone variation first
                for (const phoneVariation of uniquePhoneVariations) {
                    try {
                        const foundOwners = await firestoreAdminService.query(
                            "users",
                            [
                                {
                                    field: "phone",
                                    op: "==",
                                    value: phoneVariation,
                                },
                            ]
                        );
                        owners.push(...foundOwners);
                    } catch (err) {
                        // ignore individual variation errors
                    }
                }

                // Dedupe
                owners = owners.filter(
                    (owner, index, self) =>
                        index === self.findIndex((o) => o.id === owner.id)
                );

                // If still no exact matches, try broader normalized/last-10 heuristic across all users
                if (owners.length === 0) {
                    const allUsers = await firestoreAdminService.query(
                        "users",
                        []
                    );
                    const normalizedTarget = normalizePhone(phoneNumber);
                    const similar = allUsers.find((u: any) => {
                        if (!u?.phone) return false;
                        const up = normalizePhone(u.phone);
                        return (
                            up === normalizedTarget ||
                            up.slice(-10) === normalizedTarget.slice(-10)
                        );
                    });
                    if (similar) owners = [similar];
                }
            } catch (error) {
                console.error("Error searching by phone:", error);
            }

            // If client supplied a phone and we couldn't find any owner, return 404
            if (owners.length === 0) {
                return NextResponse.json(
                    {
                        error: "Phone not registered by admin",
                        notRegisteredByAdmin: true,
                    },
                    { status: 404 }
                );
            }
        } else {
            // No phone provided: fallback to UID-based search and email matching as before
            try {
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
                        uidMatch: user.uid === uid,
                    });
                    return user.firebaseUid === uid || user.uid === uid;
                });

                if (uidMatches.length > 0) {
                    console.log(
                        `Found ${uidMatches.length} users by UID match`
                    );
                    owners = uidMatches;
                } else {
                    // Fall back to email matching if available
                    if (email) {
                        const emailMatches = allUsers.filter(
                            (user: any) => user.email === email
                        );
                        if (emailMatches.length > 0) owners = emailMatches;
                    }
                }
            } catch (error) {
                console.error("Error in UID/email search:", error);
            }
        }

        if (owners.length === 0) {
            // Try to match by email if phone doesn't work
            if (email) {
                console.log("Trying email matching...");
                const allUsers = await firestoreAdminService.query("users", []);
                console.log(`Searching for email: "${email}"`);
                const emailMatches = allUsers.filter((user: any) => {
                    const match = user.email === email;
                    console.log(
                        `Email comparison for user ${user.id}: "${user.email}" === "${email}" = ${match}`
                    );
                    return match;
                });
                if (emailMatches.length > 0) {
                    console.log(
                        `Found ${emailMatches.length} users by email match`
                    );
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
                    const emailDomain = email.split("@")[1];
                    const userEmailDomain = user.email.split("@")[1];
                    const partialMatch =
                        user.email.includes(email.split("@")[0]) ||
                        email.includes(user.email.split("@")[0]);
                    const domainMatch = emailDomain === userEmailDomain;
                    console.log(
                        `Partial email check for user ${user.id}: "${user.email}" vs "${email}" - domain: ${domainMatch}, partial: ${partialMatch}`
                    );
                    return partialMatch || domainMatch;
                });
                if (partialEmailMatches.length > 0) {
                    console.log(
                        `Found ${partialEmailMatches.length} users by partial email match`
                    );
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
                            allUsers: (allUsers as any[]).map((u) => ({
                                id: u.id,
                                name: `${u.firstName} ${u.lastName}`,
                                phone: u.phone,
                                email: u.email,
                                compoundId: u.compoundId,
                                firebaseUid: u.firebaseUid,
                            })),
                        },
                    },
                    { status: 404 }
                );
            }
        }

        // If multiple owners were matched, apply stronger disambiguation rules:
        // 1) If uid + phone provided, prefer owner matching both firebaseUid/uid and normalized phone.
        // 2) Then prefer owners with isActive === true.
        // 3) Finally pick the most recently updated owner as a last resort.
        if (owners.length > 1) {
            const normalizePhone = (phone: string | null | undefined) => {
                if (!phone) return "";
                return phone.replace(/[\s\-\(\)\.]/g, "");
            };

            // Try exact firebaseUid/uid + phone match
            if (uid && (phoneNumber || phoneVariations.length > 0)) {
                const targetPhoneNorm = normalizePhone(phoneNumber);
                const bothMatched = owners.find((o: any) => {
                    const oPhone = normalizePhone(o.phone);
                    const uidMatch = o.firebaseUid === uid || o.uid === uid;
                    const phoneMatch =
                        oPhone === targetPhoneNorm ||
                        (oPhone &&
                            targetPhoneNorm &&
                            oPhone.slice(-10) === targetPhoneNorm.slice(-10));
                    return uidMatch && phoneMatch;
                });
                if (bothMatched) {
                    owners = [bothMatched];
                }
            }

            // If still multiple, prefer active owners
            if (owners.length > 1) {
                const active = owners.filter((o: any) => o.isActive);
                if (active.length === 1) owners = active;
                else if (active.length > 1) owners = active; // keep active set for next tie-breaker
            }

            // If still multiple, pick the most recently updated owner
            if (owners.length > 1) {
                owners.sort((a: any, b: any) => {
                    const aTime = a.updatedAt?.toDate?.()?.getTime?.() ?? 0;
                    const bTime = b.updatedAt?.toDate?.()?.getTime?.() ?? 0;
                    return bTime - aTime;
                });
                owners = [owners[0]];
            }
        }

        // Get compounds for each owner
        const ownerData = await Promise.all(
            owners.map(async (owner) => {
                const compound = await firestoreAdminService.compounds.getById(
                    owner.compoundId
                );
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
                foundOwners: owners.length,
            },
        });
    } catch (error: any) {
        console.error("Get owner profile error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to fetch owner profile" },
            { status: 500 }
        );
    }
}
