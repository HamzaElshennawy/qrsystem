/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { authService } from "@/firebase/auth";
import { firestoreService } from "@/firebase/firestore";

export default function TestPermissionsPage() {
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const testAllPermissions = async () => {
        setLoading(true);
        setResult(null);

        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                setResult("❌ Error: User not logged in");
                return;
            }

            setResult("🔍 Testing permissions...\n\n");

            // Test 1: Read compounds
            try {
                const compounds = await firestoreService.compounds.getByAdmin(
                    currentUser.uid
                );
                setResult(
                    (prev) =>
                        prev + `✅ Compounds read: ${compounds.length} found\n`
                );
            } catch (error: any) {
                setResult(
                    (prev) =>
                        prev + `❌ Compounds read failed: ${error.message}\n`
                );
            }

            // Test 2: Create a test compound
            try {
                const testCompound = {
                    name: "Test Compound " + Date.now(),
                    address: "Test Address",
                    adminId: currentUser.uid,
                    adminEmail: currentUser.email || "",
                };
                const compoundId = await firestoreService.compounds.create(
                    testCompound
                );
                setResult(
                    (prev) => prev + `✅ Compound created: ${compoundId}\n`
                );

                // Clean up
                await firestoreService.delete("compounds", compoundId);
                setResult((prev) => prev + `✅ Test compound cleaned up\n`);
            } catch (error: any) {
                setResult(
                    (prev) =>
                        prev + `❌ Compound creation failed: ${error.message}\n`
                );
            }

            // Test 3: Create a test owner (if we have a compound)
            try {
                const compounds = await firestoreService.compounds.getByAdmin(
                    currentUser.uid
                );
                if (compounds.length > 0) {
                    const testUser = {
                        firstName: "Test",
                        lastName: "User",
                        email: "test@example.com",
                        phone: "1234567890",
                        propertyUnit: "A1",
                        compoundId: compounds[0].id!,
                        type: "owner" as const,
                        isActive: true,
                    };
                    const userId = await firestoreService.users.create(
                        testUser
                    );
                    setResult((prev) => prev + `✅ User created: ${userId}\n`);

                    // Clean up
                    await firestoreService.delete("users", userId);
                    setResult((prev) => prev + `✅ Test user cleaned up\n`);
                } else {
                    setResult(
                        (prev) =>
                            prev +
                            `⚠️ No compounds found to test owner creation\n`
                    );
                }
            } catch (error: any) {
                setResult(
                    (prev) =>
                        prev + `❌ Owner creation failed: ${error.message}\n`
                );
            }

            setResult((prev) => prev + `\n🎉 Permission test completed!`);
        } catch (error: any) {
            setResult(`❌ Test failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Firebase Permissions Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Current User:</h3>
                        <p>
                            {authService.getCurrentUser()?.email ||
                                "Not logged in"}
                        </p>
                    </div>

                    <Button
                        onClick={testAllPermissions}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? "Testing..." : "Test All Permissions"}
                    </Button>

                    {result && (
                        <div className="p-4 rounded-md bg-gray-50 border">
                            <pre className="whitespace-pre-wrap text-sm">
                                {result}
                            </pre>
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                        <h4 className="font-semibold mb-2">
                            If you see errors:
                        </h4>
                        <ol className="text-sm list-decimal list-inside space-y-1">
                            <li>Make sure you&apos;re logged in</li>
                            <li>Check that Firestore rules are updated</li>
                            <li>
                                Create the missing index (click the link in the
                                error)
                            </li>
                            <li>
                                Wait a few minutes for index creation to
                                complete
                            </li>
                        </ol>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
