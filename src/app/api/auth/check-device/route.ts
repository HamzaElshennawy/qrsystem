import { NextRequest, NextResponse } from "next/server";
import { firestoreAdminService } from "@/firebase/firestoreAdmin";

// POST /api/auth/check-device
// Canonical implementation: prefer phone (OTP flows) -> firebaseUid -> device session fallback.
export async function POST(request: NextRequest) {
    try {
        const { deviceFingerprint, userAgent, firebaseUid, phone } =
            (await request.json()) as any;

        if (!deviceFingerprint || !userAgent) {
            return NextResponse.json(
                { error: "Device fingerprint and user agent are required" },
                { status: 400 }
            );
        }

        const normalizePhone = (p: string) =>
            String(p || "").replace(/[\s\-\(\)\.]/g, "");
        const buildPhoneVariations = (p: string) => {
            const normalized = normalizePhone(p);
            const withoutPlus = normalized.replace(/^\+/, "");
            const egyptianLocal = withoutPlus.startsWith("20")
                ? `0${withoutPlus.replace(/^20/, "")}`
                : null;
            return [
                ...new Set([
                    p,
                    normalized,
                    p?.replace(/\s/g, ""),
                    p?.replace(/[\s\-]/g, ""),
                    `+${withoutPlus}`,
                    withoutPlus,
                    ...(egyptianLocal ? [egyptianLocal] : []),
                ]),
            ].filter(Boolean) as string[];
        };

        const makeResponse = (
            resolvedOwner: any,
            deviceSessionForOwner: any
        ) => {
            const isKnownDevice = !!(
                deviceSessionForOwner && deviceSessionForOwner.isActive
            );
            const hasPassword = resolvedOwner?.hasPassword || false;
            const isFirstTimeLogin = resolvedOwner?.isFirstTimeLogin !== false;
            const requiresOTP =
                !hasPassword || isFirstTimeLogin || !isKnownDevice;

            return NextResponse.json({
                owner: {
                    id: resolvedOwner.id,
                    firstName: resolvedOwner.firstName,
                    lastName: resolvedOwner.lastName,
                    email: resolvedOwner.email,
                    phone: resolvedOwner.phone,
                    hasPassword,
                    isFirstTimeLogin,
                },
                deviceSession: {
                    isKnownDevice,
                    requiresOTP,
                    lastUsedAt: deviceSessionForOwner
                        ? deviceSessionForOwner.lastUsedAt
                        : null,
                },
                requiresOTP,
            });
        };

        // 1) Phone-first (OTP flows): try exact variations, then normalized/last-10 fallback
        if (phone) {
            let resolvedOwner: any = null;
            const variations = buildPhoneVariations(phone);

            for (const v of variations) {
                if (!v) continue;
                try {
                    const found = (await firestoreAdminService.query("users", [
                        { field: "phone", op: "==", value: v },
                    ])) as any[];
                    if (found && found.length > 0) {
                        resolvedOwner = found[0];
                        break;
                    }
                } catch (e) {
                    // ignore and continue
                }
            }

            if (!resolvedOwner) {
                try {
                    const allUsers = (await firestoreAdminService.query(
                        "users",
                        []
                    )) as any[];
                    const normalizedTarget = normalizePhone(phone);
                    resolvedOwner = allUsers.find((u) => {
                        if (!u?.phone) return false;
                        const up = normalizePhone(u.phone);
                        return (
                            up === normalizedTarget ||
                            up.slice(-10) === normalizedTarget.slice(-10)
                        );
                    });
                } catch (e) {
                    // ignore
                }
            }

            if (!resolvedOwner) {
                // If client provided a phone (OTP flow) but no owner exists with that phone,
                // do NOT fall back to device-session/admin profiles. Tell the client the
                // phone is not yet registered by an administrator.
                return NextResponse.json(
                    {
                        error: "Phone not registered by admin",
                        notRegisteredByAdmin: true,
                    },
                    { status: 404 }
                );
            }

            // Best-effort: attach firebaseUid if provided and user lacks it
            if (firebaseUid && !resolvedOwner.firebaseUid) {
                try {
                    await firestoreAdminService.update(
                        "users",
                        resolvedOwner.id,
                        { firebaseUid }
                    );
                    resolvedOwner.firebaseUid = firebaseUid;
                } catch (e) {
                    console.warn("Failed to attach firebaseUid to user", e);
                }
            }

            const deviceSessionForOwner =
                (await firestoreAdminService.deviceSessions.getByUserAndDevice(
                    resolvedOwner.id,
                    deviceFingerprint
                )) as any;
            return makeResponse(resolvedOwner, deviceSessionForOwner);
        }

        // 2) If firebaseUid provided, try to resolve by that
        if (firebaseUid) {
            try {
                const usersByUid = (await firestoreAdminService.query("users", [
                    { field: "firebaseUid", op: "==", value: firebaseUid },
                ])) as any[];
                if (usersByUid && usersByUid.length > 0) {
                    const resolvedOwner = usersByUid[0];
                    const deviceSessionForOwner =
                        (await firestoreAdminService.deviceSessions.getByUserAndDevice(
                            resolvedOwner.id,
                            deviceFingerprint
                        )) as any;
                    return makeResponse(resolvedOwner, deviceSessionForOwner);
                }
            } catch (e) {
                // ignore and fallthrough
            }
        }

        // 3) Fallback: find active device session and return its owner
        const deviceSessions = (await firestoreAdminService.query(
            "deviceSessions",
            [
                {
                    field: "deviceFingerprint",
                    op: "==",
                    value: deviceFingerprint,
                },
                { field: "isActive", op: "==", value: true },
            ]
        )) as any[];

        if (!deviceSessions || deviceSessions.length === 0) {
            return NextResponse.json(
                { error: "No active device session found" },
                { status: 401 }
            );
        }

        const deviceSession = deviceSessions[0] as any;
        const owner = (await firestoreAdminService.read(
            "users",
            deviceSession.userId
        )) as any;
        if (!owner)
            return NextResponse.json(
                { error: "Owner profile not found" },
                { status: 404 }
            );

        return makeResponse(owner, deviceSession);
    } catch (err: any) {
        console.error("Check device error:", err);
        return NextResponse.json(
            { error: err?.message || "Failed to check device" },
            { status: 500 }
        );
    }
}
