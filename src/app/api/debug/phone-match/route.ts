import { NextRequest, NextResponse } from "next/server";
import { firestoreAdminService } from "@/firebase/firestoreAdmin";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const phone = searchParams.get("phone");

        if (!phone) {
            return NextResponse.json(
                { error: "phone query param required" },
                { status: 400 }
            );
        }

        const normalize = (p: string) => p.replace(/[\s\-\(\)\.]/g, "");
        const normalized = normalize(phone);
        const withoutPlus = normalized.replace(/^\+/, "");
        const egyptianLocal = withoutPlus.startsWith("20")
            ? `0${withoutPlus.replace(/^20/, "")}`
            : null;

        const variations = [
            phone,
            normalized,
            phone.replace(/\s/g, ""),
            phone.replace(/[\s\-]/g, ""),
            `+${withoutPlus}`,
            withoutPlus,
            ...(egyptianLocal ? [egyptianLocal] : []),
        ].filter((v, i, a) => v && a.indexOf(v) === i);

        const exactMatches: any[] = [];
        for (const v of variations) {
            const found = (await firestoreAdminService.query("users", [
                { field: "phone", op: "==", value: v },
            ])) as any[];
            exactMatches.push({
                variation: v,
                results: found.map((u: any) => ({
                    id: u.id,
                    email: u.email,
                    phone: u.phone,
                    firebaseUid: u.firebaseUid,
                })),
            });
        }

        const allUsers = (await firestoreAdminService.query(
            "users",
            []
        )) as any[];
        const similar: any[] = [];
        for (const u of allUsers) {
            if (!(u as any).phone) continue;
            const up = normalize((u as any).phone);
            const cp = normalized;
            const last10Match = up.slice(-10) === cp.slice(-10);
            const fullMatch = up === cp;
            if (fullMatch || last10Match) {
                similar.push({
                    id: (u as any).id,
                    email: (u as any).email,
                    phone: (u as any).phone,
                    firebaseUid: (u as any).firebaseUid,
                    fullMatch,
                    last10Match,
                });
            }
        }

        return NextResponse.json({
            phone,
            normalized,
            variations,
            exactMatches,
            similar,
            totalUsers: allUsers.length,
        });
    } catch (err: any) {
        console.error("Phone match debug error:", err);
        return NextResponse.json(
            { error: err.message || String(err) },
            { status: 500 }
        );
    }
}
