/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { qrService } from "@/firebase/qr";
import { Timestamp } from "firebase/firestore";
import { CompoundProvider, useCompound } from "@/contexts/CompoundContext";
import Image from "next/image";

function TestQRContent() {
    const { selectedCompound } = useCompound();
    const [result, setResult] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [qrImage, setQrImage] = useState<string>("");
    const [testData, setTestData] = useState({
        firstName: "Test",
        lastName: "Owner",
        email: "test@example.com",
        phone: "1234567890",
        propertyUnit: "A1",
    });

    const testQRGeneration = async () => {
        setLoading(true);
        setResult(null);
        setQrImage("");

        try {
            if (!selectedCompound) {
                setResult("❌ No compound selected");
                return;
            }

            setResult("🔍 Testing QR generation...\n\n");

            // Create a test user object
            const testUser = {
                id: "test-user-" + Date.now(),
                firstName: testData.firstName,
                lastName: testData.lastName,
                email: testData.email,
                phone: testData.phone,
                propertyUnit: testData.propertyUnit,
                compoundId: selectedCompound.id!,
                type: "owner" as const,
                isActive: true,
                createdAt: Timestamp.now(),
                updatedAt: Timestamp.now(),
            };

            // Test 1: Generate QR data URL
            try {
                const qrResult = await qrService.generateUserQRCode(
                    testUser,
                    selectedCompound.id!
                );
                setResult(
                    (prev) => prev + `✅ QR Code generated successfully\n`
                );
                setResult(
                    (prev) =>
                        prev +
                        `📊 QR Data: ${qrResult.qrData.substring(0, 50)}...\n`
                );
                setQrImage(qrResult.dataURL);
            } catch (error: any) {
                setResult(
                    (prev) =>
                        prev + `❌ QR generation failed: ${error.message}\n`
                );
            }

            // Test 2: Test buffer generation
            try {
                const bufferResult = await qrService.generateQRCodeBuffer({
                    ownerId: testUser.id,
                    compoundId: selectedCompound.id!,
                    ownerName: `${testUser.firstName} ${testUser.lastName}`,
                    propertyUnit: testUser.propertyUnit,
                    timestamp: Date.now(),
                    signature: "test-signature",
                });
                setResult((prev) => prev + `✅ Buffer generation successful\n`);
            } catch (error: any) {
                setResult(
                    (prev) =>
                        prev + `❌ Buffer generation failed: ${error.message}\n`
                );
            }

            setResult((prev) => prev + `\n🎉 QR generation tests completed!`);
        } catch (error: any) {
            setResult(`❌ Test failed: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    const downloadQR = () => {
        if (qrImage) {
            const link = document.createElement("a");
            link.href = qrImage;
            link.download = `qr-${testData.firstName}-${testData.lastName}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="container mx-auto py-10">
            <Card className="max-w-2xl mx-auto">
                <CardHeader>
                    <CardTitle>QR Code Generation Test</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                        <h3 className="font-semibold mb-2">Current Context:</h3>
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
                                    value={testData.firstName}
                                    onChange={(e) =>
                                        setTestData({
                                            ...testData,
                                            firstName: e.target.value,
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="lastName">Last Name</Label>
                                <Input
                                    id="lastName"
                                    value={testData.lastName}
                                    onChange={(e) =>
                                        setTestData({
                                            ...testData,
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
                                value={testData.email}
                                onChange={(e) =>
                                    setTestData({
                                        ...testData,
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
                                    value={testData.phone}
                                    onChange={(e) =>
                                        setTestData({
                                            ...testData,
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
                                    value={testData.propertyUnit}
                                    onChange={(e) =>
                                        setTestData({
                                            ...testData,
                                            propertyUnit: e.target.value,
                                        })
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={testQRGeneration}
                        disabled={loading || !selectedCompound}
                        className="w-full"
                    >
                        {loading ? "Testing..." : "Test QR Generation"}
                    </Button>

                    {qrImage && (
                        <div className="space-y-4">
                            <div className="text-center">
                                <h3 className="font-semibold mb-2">
                                    Generated QR Code:
                                </h3>
                                <Image
                                    src={qrImage}
                                    alt="Generated QR Code"
                                    className="mx-auto border rounded"
                                />
                            </div>
                            <Button
                                onClick={downloadQR}
                                className="w-full"
                            >
                                Download QR Code
                            </Button>
                        </div>
                    )}

                    {result && (
                        <div className="p-4 rounded-md bg-gray-50 border">
                            <pre className="whitespace-pre-wrap text-sm">
                                {result}
                            </pre>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function TestQRPage() {
    return (
        <Suspense fallback={<div>Loading QR Test...</div>}>
            <CompoundProvider>
                <TestQRContent />
            </CompoundProvider>
        </Suspense>
    );
}
