/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server";
import { firestoreAdminService } from "@/firebase/firestoreAdmin";

export async function POST(request: NextRequest) {
    try {
        console.log("CSV Import: Starting import process");

        const formData = await request.formData();
        const file = formData.get("file") as File;
        const compoundId = formData.get("compoundId") as string;
        const userId = formData.get("userId") as string;

        console.log(
            "CSV Import: File received:",
            file?.name,
            "Size:",
            file?.size
        );
        console.log("CSV Import: CompoundId:", compoundId);
        console.log("CSV Import: UserId:", userId);

        if (!userId) {
            console.log("CSV Import: No userId provided");
            return NextResponse.json(
                { error: "User authentication required" },
                { status: 401 }
            );
        }

        console.log(
            "CSV Import: File received:",
            file?.name,
            "Size:",
            file?.size
        );
        console.log("CSV Import: CompoundId:", compoundId);

        if (!file) {
            console.log("CSV Import: No file provided");
            return NextResponse.json(
                { error: "No file provided - Please select a CSV file" },
                { status: 400 }
            );
        }

        if (!compoundId) {
            console.log("CSV Import: No compoundId provided");
            return NextResponse.json(
                {
                    error: "No compound selected - Please select a compound first",
                },
                { status: 400 }
            );
        }

        // Verify the user owns this compound
        console.log(
            "CSV Import: Verifying compound ownership for compoundId:",
            compoundId
        );
        const compound = await firestoreAdminService.compounds.getById(
            compoundId
        );
        console.log("CSV Import: Compound found:", compound ? "Yes" : "No");

        if (!compound) {
            console.log("CSV Import: Compound not found:", compoundId);
            return NextResponse.json(
                { error: "Compound not found" },
                { status: 404 }
            );
        }

        console.log("CSV Import: Compound adminId:", compound.adminId);
        console.log("CSV Import: Current userId:", userId);

        if (compound.adminId !== userId) {
            console.log(
                "CSV Import: User does not own compound. User:",
                userId,
                "Compound admin:",
                compound.adminId
            );
            return NextResponse.json(
                {
                    error: "You don't have permission to import users for this compound",
                },
                { status: 403 }
            );
        }

        console.log("CSV Import: Compound ownership verified successfully");

        console.log("CSV Import: Compound verified, parsing CSV file");

        // Read and parse CSV file
        const csvText = await file.text();
        console.log("CSV Import: CSV text length:", csvText.length);
        console.log(
            "CSV Import: CSV content preview:",
            csvText.substring(0, 200)
        );

        let records;
        try {
            // Simple CSV parsing as fallback
            const lines = csvText.trim().split("\n");
            if (lines.length < 2) {
                throw new Error(
                    "CSV file must have at least a header row and one data row"
                );
            }

            const headers = lines[0]
                .split(",")
                .map((h) => h.trim().replace(/"/g, ""));
            console.log("CSV Import: Parsed headers:", headers);

            records = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i]
                    .split(",")
                    .map((v) => v.trim().replace(/"/g, ""));
                if (values.length === headers.length) {
                    const record: any = {};
                    headers.forEach((header, index) => {
                        record[header] = values[index];
                    });
                    records.push(record);
                }
            }

            console.log("CSV Import: Parsed records count:", records.length);
        } catch (parseError) {
            console.error("CSV Import: CSV parsing error:", parseError);
            const errorMessage =
                parseError instanceof Error
                    ? parseError.message
                    : "Unknown parsing error";
            return NextResponse.json(
                { error: `Invalid CSV format: ${errorMessage}` },
                { status: 400 }
            );
        }

        // Validate required columns
        const requiredColumns = ["firstName", "lastName", "email"];
        const optionalColumns = ["phone", "propertyUnit", "type"];
        const headers = Object.keys(records[0] || {});

        console.log("CSV Import: Headers found:", headers);
        console.log("CSV Import: Required columns:", requiredColumns);

        for (const column of requiredColumns) {
            if (!headers.includes(column)) {
                console.log("CSV Import: Missing required column:", column);
                return NextResponse.json(
                    {
                        error: `Missing required column: ${column}. Found columns: ${headers.join(
                            ", "
                        )}`,
                    },
                    { status: 400 }
                );
            }
        }

        // Process each record
        const owners = [];
        const errors = [];

        for (let i = 0; i < records.length; i++) {
            const record = records[i] as {
                firstName: string;
                lastName: string;
                email: string;
                phone?: string;
                propertyUnit?: string;
                type?: string;
            };
            try {
                // Validate and set user type
                const userType = record.type?.trim().toLowerCase();
                const validTypes = ["owner", "employee", "manager"];
                const type = validTypes.includes(userType || "")
                    ? (userType as "owner" | "employee" | "manager")
                    : "owner";

                const userData = {
                    compoundId,
                    type,
                    firstName: record.firstName.trim(),
                    lastName: record.lastName.trim(),
                    email: record.email.trim(),
                    phone: record.phone?.trim() || "",
                    propertyUnit: record.propertyUnit?.trim() || "",
                    isActive: true,
                };

                // Validate email format
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(userData.email)) {
                    throw new Error(`Invalid email format: ${userData.email}`);
                }

                owners.push(userData);
            } catch (error: any) {
                errors.push({
                    row: i + 2, // +2 because CSV is 1-indexed and we skip header
                    error: error.message,
                });
            }
        }

        if (errors.length > 0) {
            return NextResponse.json(
                {
                    success: false,
                    errors,
                    message: "Some rows had errors",
                },
                { status: 400 }
            );
        }

        // Bulk create users
        console.log(
            "CSV Import: Starting bulk creation of",
            owners.length,
            "users"
        );
        const userIds = await firestoreAdminService.users.bulkCreate(owners);
        console.log(
            "CSV Import: Successfully created",
            userIds.length,
            "users"
        );

        return NextResponse.json({
            success: true,
            userIds,
            count: owners.length,
            message: `Successfully imported ${owners.length} users`,
        });
    } catch (error: any) {
        console.error("CSV Import: Unexpected error:", error);
        console.error("CSV Import: Error stack:", error.stack);
        return NextResponse.json(
            {
                error: `Import failed: ${
                    error.message || "Unknown error occurred"
                }`,
            },
            { status: 500 }
        );
    }
}
