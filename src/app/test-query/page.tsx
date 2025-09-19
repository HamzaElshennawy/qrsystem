/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { firestoreService } from "@/firebase/firestore";
import { authService } from "@/firebase/auth";
import { where, orderBy } from "firebase/firestore";

export default function TestQueryPage() {
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const testQuery = async () => {
        setLoading(true);
        setResult(null);

        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                setResult("❌ User not logged in");
                return;
            }

            setResult("🔍 Testing queries...\n\n");

            // Test 1: Simple query without orderBy
            try {
                console.log("Testing simple query...");
                const simpleResult = await firestoreService.query("compounds", [
                    where("adminId", "==", currentUser.uid),
                ]);
                setResult(
                    (prev) =>
                        prev +
                        `✅ Simple query: ${simpleResult.length} compounds\n`
                );
            } catch (error: any) {
                setResult(
                    (prev) =>
                        prev + `❌ Simple query failed: ${error.message}\n`
                );
            }

            // Test 2: Query with orderBy
            try {
                console.log("Testing query with orderBy...");
                const orderByResult = await firestoreService.query(
                    "compounds",
                    [
                        where("adminId", "==", currentUser.uid),
                        orderBy("createdAt", "desc"),
                    ]
                );
                setResult(
                    (prev) =>
                        prev +
                        `✅ OrderBy query: ${orderByResult.length} compounds\n`
                );
            } catch (error: any) {
                setResult(
                    (prev) =>
                        prev + `❌ OrderBy query failed: ${error.message}\n`
                );
            }

            // Test 3: Manual query construction
            try {
                console.log("Testing manual query construction...");
                const constraints = [
                    where("adminId", "==", currentUser.uid),
                    orderBy("createdAt", "desc"),
                ];
                console.log("Constraints:", constraints);
                const manualResult = await firestoreService.query(
                    "compounds",
                    constraints
                );
                setResult(
                    (prev) =>
                        prev +
                        `✅ Manual query: ${manualResult.length} compounds\n`
                );
            } catch (error: any) {
                setResult(
                    (prev) =>
                        prev + `❌ Manual query failed: ${error.message}\n`
                );
            }

            setResult((prev) => prev + `\n🎉 Query tests completed!`);
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
                    <CardTitle>Firestore Query Test</CardTitle>
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
                        onClick={testQuery}
                        disabled={loading}
                        className="w-full"
                    >
                        {loading ? "Testing..." : "Test Queries"}
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
                            Check browser console (F12) for detailed error logs
                        </h4>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
