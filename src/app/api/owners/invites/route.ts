/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreService } from "@/firebase/firestore";
import { getAdminAuth } from "@/firebase/firebaseAdmin";

function generateToken(): string {
    const rand = Math.random().toString(36).slice(2);
    const ts = Date.now().toString(36);
    return `${ts}${rand}`;
}

export async function POST(request: NextRequest) {
    try {
        const authHeader = request.headers.get('authorization') || '';
        const authToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
        if (!authToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const decoded = await getAdminAuth().verifyIdToken(authToken);

        const { compoundId, phone, email, firstName, lastName, propertyUnit, expiresAt } = await request.json();
        if (!compoundId || !phone) {
            return NextResponse.json({ error: "compoundId and phone are required" }, { status: 400 });
        }

        const compound = await firestoreService.compounds.getById(compoundId);
        if (!compound || compound.adminId !== decoded.uid) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }

        const inviteToken = generateToken();
        const id = await firestoreService.ownerInvites.create({
            token: inviteToken,
            compoundId,
            phone,
            email,
            firstName,
            lastName,
            propertyUnit,
            createdBy: decoded.uid,
            expiresAt: expiresAt ? new Date(expiresAt) as any : undefined,
        } as any);

        return NextResponse.json({ success: true, id, token: inviteToken });
    } catch (error: any) {
        console.error("Create invite error:", error);
        return NextResponse.json({ error: error.message || "Failed to create invite" }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get("token");
        if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });
        const invite = await firestoreService.ownerInvites.getByToken(token);
        if (!invite) return NextResponse.json({ error: "Invite not found" }, { status: 404 });
        return NextResponse.json({ success: true, invite });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || "Failed to fetch invite" }, { status: 500 });
    }
}


