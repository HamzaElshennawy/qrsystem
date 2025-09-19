/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authService } from "@/firebase/auth";
import { firestoreService } from "@/firebase/firestore";
import { CompoundProvider, useCompound } from "@/contexts/CompoundContext";

function TestOwnerCreationContent() {
    const { selectedCompound } = useCompound();
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [newOwner, setNewOwner] = useState({
        firstName: "Test",
        lastName: "Owner",
        email: "test@example.com",
        phone: "1234567890",
        propertyUnit: "A1",
        compoundId: "",
    });

    const testOwnerCreation = async () => {
        setLoading(true);
        setResult(null);

        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) {
                setResult("Error: User not logged in. Please log in first.");
                return;
            }

            if (!selectedCompound) {
                setResult(
                    "Error: No compound selected. Please select a compound first."
                );
                return;
            }

            // Update the compound ID
            const ownerData = {
                ...newOwner,
                compoundId: selectedCompound.id!,
                isActive: true,
            };

            console.log("Attempting to create owner with data:", ownerData);

            // Test creating an owner
            const ownerId = await firestoreService.owners.create(ownerData);
            setResult(`Successfully created owner with ID: ${ownerId}`);

            // Clean up - delete the test owner
            await firestoreService.delete("owners", ownerId);
            setResult((prev) => prev + "\nTest owner cleaned up successfully.");
        } catch (error: any) {
            console.error("Owner Creation Test Error:", error);
            setResult(
                `Error: ${
                    error.message || "Unknown error"
                }. Check console for details.`
            );
        } finally {
            setLoading(false);
        }
    };

    const testOwnerRead = async () => {
        setLoading(true);
        setResult(null);

        try {
            if (!selectedCompound) {
                setResult("Error: No compound selected.");
                return;
            }

            console.log(
                "Attempting to read owners for compound:",
                selectedCompound.id
            );

            // Test reading owners
            const owners = await firestoreService.owners.getByCompound(
                selectedCompound.id!
            );
            setResult(
                `Successfully read ${owners.length} owners for compound ${selectedCompound.name}`
            );
        } catch (error: any) {
            console.error("Owner Read Test Error:", error);
            setResult(
                `Error: ${
                    error.message || "Unknown error"
                }. Check console for details.`
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto py-10">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>Owner Creation Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Current Context:</h3>
                        <p>
                            <strong>User:</strong>{" "}
                            {authService.getCurrentUser()?.email ||
                                "Not logged in"}
                        </p>
                        <p>
                            <strong>Selected Compound:</strong>{" "}
                            {selectedCompound?.name || "None selected"}
                        </p>
                        <p>
                            <strong>Compound ID:</strong>{" "}
                            {selectedCompound?.id || "N/A"}
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">First Name</Label>
                                <Input
                                    id="firstName"
                                    value={newOwner.firstName}
                                    onChange={(e) =>
                                        setNewOwner({
                                            ...newOwner,
                                            firstName: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    value={newOwner.lastName}
                                    onChange={(e) =>
                                        setNewOwner({
                                            ...newOwner,
                                            lastName: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={newOwner.email}
                                onChange={(e) =>
                                    setNewOwner({
                                        ...newOwner,
                                        email: e.target.value,
                                    })
                                }
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone</Label>
                                <Input
                                    id="phone"
                                    value={newOwner.phone}
                                    onChange={(e) =>
                                        setNewOwner({
                                            ...newOwner,
                                            phone: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="propertyUnit">
                                    Property Unit
                                </Label>
                                <Input
                                    id="propertyUnit"
                                    value={newOwner.propertyUnit}
                                    onChange={(e) =>
                                        setNewOwner({
                                            ...newOwner,
                                            propertyUnit: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            onClick={testOwnerCreation}
                            disabled={loading || !selectedCompound}
                        >
                            {loading ? "Testing..." : "Test Owner Creation"}
                        </Button>
                        <Button
                            onClick={testOwnerRead}
                            disabled={loading || !selectedCompound}
                            variant="outline"
                        >
                            {loading ? "Testing..." : "Test Owner Read"}
                        </Button>
                    </div>

                    {result && (
                        <div
                            className={`p-4 rounded-md ${
                                result.startsWith("Error")
                                    ? "bg-red-100 text-red-800"
                                    : "bg-green-100 text-green-800"
                            }`}
                        >
                            <pre className="whitespace-pre-wrap text-sm">
                                {result}
                            </pre>
                        </div>
                    )}

                    <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
                        <h4 className="font-semibold mb-2">
                            If you get permission errors:
                        </h4>
                        <p className="text-sm mb-2">
                            You need to update your Firestore security rules to
                            allow owner creation:
                        </p>
                        <pre className="text-xs bg-white p-2 rounded border overflow-x-auto">
                            {`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents for authenticated users (DEVELOPMENT ONLY)
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}`}
                        </pre>
                        <p className="text-xs mt-2">
                            Go to:{" "}
                            <a
                                rel="noopener"
                                href="https://console.firebase.google.com/project/qr-compounds/firestore/rules"
                                target="_blank"
                                className="text-blue-600 underline"
                            >
                                Firebase Console → Firestore Rules
                            </a>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function TestOwnerCreationPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <CompoundProvider>
                <TestOwnerCreationContent />
            </CompoundProvider>
        </Suspense>
    );
}
