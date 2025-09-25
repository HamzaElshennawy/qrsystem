"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { authService } from "@/firebase/auth";
import {
    firestoreService,
    type QRCode,
    type User as FirestoreUser,
    type Compound,
} from "@/firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/firebase/firebaseConfig";
import {
    QrCode,
    RefreshCw,
    Plus,
    Clock,
    User,
    Building,
    Home,
} from "lucide-react";
import Image from "next/image";

interface OwnerProfile {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    propertyUnit?: string;
    type: string;
    isActive: boolean;
    compound: Compound;
}

interface EntranceQRCode {
    dataURL: string;
    qrData: string;
    timestamp: number;
}

interface GuestQRCode {
    id: string;
    dataURL: string;
    qrData: string;
    guestName: string;
    expirationTime: number;
    expiresAt: string;
    compoundId?: string;
    createdAt?: string;
}

export default function OwnerDashboardPage() {
    const [ownerProfiles, setOwnerProfiles] = useState<OwnerProfile[]>([]);
    const [entranceQRCodes, setEntranceQRCodes] = useState<
        Map<string, EntranceQRCode>
    >(new Map());
    const [guestQRCodes, setGuestQRCodes] = useState<GuestQRCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingGuestQRs, setLoadingGuestQRs] = useState(false);
    const [qrRefreshTimers, setQrRefreshTimers] = useState<
        Map<string, NodeJS.Timeout>
    >(new Map());

    // Guest QR generation form
    const [isGuestDialogOpen, setIsGuestDialogOpen] = useState(false);
    const [selectedCompoundId, setSelectedCompoundId] = useState<string>("");
    const [guestName, setGuestName] = useState("");
    const [guestPhone, setGuestPhone] = useState("");
    const [guestPurpose, setGuestPurpose] = useState("");
    const [generatingGuestQR, setGeneratingGuestQR] = useState(false);
    const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
    const [creatingProfile, setCreatingProfile] = useState(false);
    const [availableCompounds, setAvailableCompounds] = useState<
        { id: string; name: string; address: string }[]
    >([]);
    const [createForm, setCreateForm] = useState({
        firstName: "",
        lastName: "",
        email: "",
        propertyUnit: "",
        compoundId: "",
    });

    const loadAvailableCompounds = async () => {
        try {
            const response = await fetch("/api/compounds/list");
            if (response.ok) {
                const data = await response.json();
                setAvailableCompounds(data.compounds);
            }
        } catch (error) {
            console.error("Error loading compounds:", error);
        }
    };

    const loadOwnerProfile = async () => {
        try {
            const user = authService.getCurrentUser();
            if (!user) {
                // Redirect to login page if not authenticated
                window.location.href = "/owner/login";
                return;
            }

            // Build query parameters
            const params = new URLSearchParams();
            if (user.phoneNumber) params.append("phone", user.phoneNumber);
            if (user.email) params.append("email", user.email);
            if (user.uid) params.append("uid", user.uid);

            const response = await fetch(
                `/api/owner/profile?${params.toString()}`
            );
            if (response.ok) {
                const data = await response.json();
                setOwnerProfiles(data.owners);

                // Load entrance QR codes for each compound
                for (const owner of data.owners) {
                    await loadEntranceQRCode(owner.compound.id!);
                }
            } else {
                const error = await response.json();

                // If user is not found, redirect to login
                if (response.status === 404) {
                    window.location.href = "/owner/login";
                    return;
                }
            }
        } catch (error) {
            console.error("Error loading owner profile:", error);
        } finally {
            setLoading(false);
        }
    };

    const loadEntranceQRCode = async (compoundId: string) => {
        try {
            const user = authService.getCurrentUser();
            if (!user) return;

            // Build query parameters
            const params = new URLSearchParams();
            params.append("compoundId", compoundId);
            if (user.phoneNumber) params.append("phone", user.phoneNumber);
            if (user.email) params.append("email", user.email);
            if (user.uid) params.append("uid", user.uid);

            const response = await fetch(
                `/api/owner/qr/entrance?${params.toString()}`
            );
            if (response.ok) {
                const data = await response.json();
                setEntranceQRCodes((prev) => {
                    const newMap = new Map(prev);
                    newMap.set(compoundId, data.qrCode);
                    return newMap;
                });

                // Set up auto-refresh timer for 10 minutes
                setupQRRefreshTimer(compoundId);
            }
        } catch (error) {
            console.error("Error loading entrance QR code:", error);
        }
    };

    const loadGuestQRCodes = async () => {
        try {
            setLoadingGuestQRs(true);
            const user = authService.getCurrentUser();
            if (!user) {
                console.log("No user found");
                return;
            }

            console.log("Loading guest QR codes for user:", {
                phoneNumber: user.phoneNumber,
                email: user.email,
                uid: user.uid,
            });

            // Build query parameters
            const params = new URLSearchParams();
            if (user.phoneNumber)
                params.append("phoneNumber", user.phoneNumber);
            if (user.email) params.append("email", user.email);
            if (user.uid) params.append("uid", user.uid);

            console.log(
                "API call URL:",
                `/api/owner/qr/guest?${params.toString()}`
            );

            const response = await fetch(
                `/api/owner/qr/guest?${params.toString()}`
            );
            console.log("API response status:", response.status);

            if (response.ok) {
                const data = await response.json();
                console.log("API response data:", data);
                setGuestQRCodes(data.qrCodes);
            } else {
                const errorText = await response.text();
                console.error("API error:", errorText);
            }
        } catch (error) {
            console.error("Error loading guest QR codes:", error);
        } finally {
            setLoadingGuestQRs(false);
        }
    };

    const setupQRRefreshTimer = (compoundId: string) => {
        // Clear existing timer
        const existingTimer = qrRefreshTimers.get(compoundId);
        if (existingTimer) {
            clearInterval(existingTimer);
        }

        // Set up new timer for 10 minutes (600000 ms)
        const timer = setInterval(() => {
            loadEntranceQRCode(compoundId);
        }, 600000);

        setQrRefreshTimers((prev) => {
            const newMap = new Map(prev);
            newMap.set(compoundId, timer);
            return newMap;
        });
    };

    const generateGuestQRCode = async () => {
        if (!selectedCompoundId || !guestName) {
            alert("Please select a compound and enter guest name");
            return;
        }

        try {
            setGeneratingGuestQR(true);

            // Get current user for authentication
            const user = authService.getCurrentUser();
            if (!user) {
                alert("Please log in to generate guest QR codes");
                return;
            }

            const response = await fetch("/api/owner/qr/guest", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    compoundId: selectedCompoundId,
                    guestName,
                    guestPhone,
                    purpose: guestPurpose,
                    // Add authentication parameters
                    phoneNumber: user.phoneNumber,
                    email: user.email,
                    uid: user.uid,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                const newGuestQR: GuestQRCode = {
                    id: data.qrCode.id,
                    dataURL: data.qrCode.dataURL,
                    qrData: data.qrCode.qrData,
                    guestName: data.qrCode.guestName,
                    expirationTime: data.qrCode.expirationTime,
                    expiresAt: data.qrCode.expiresAt,
                    compoundId: selectedCompoundId,
                    createdAt: new Date().toISOString(),
                };

                setGuestQRCodes((prev) => [...prev, newGuestQR]);

                // Reset form
                setGuestName("");
                setGuestPhone("");
                setGuestPurpose("");
                setIsGuestDialogOpen(false);
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error("Error generating guest QR code:", error);
            alert("Failed to generate guest QR code");
        } finally {
            setGeneratingGuestQR(false);
        }
    };

    const refreshEntranceQR = (compoundId: string) => {
        loadEntranceQRCode(compoundId);
    };

    const downloadQRCode = (dataURL: string, filename: string) => {
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataURL;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const createOwnerProfile = async () => {
        if (
            !createForm.firstName ||
            !createForm.lastName ||
            !createForm.email ||
            !createForm.compoundId
        ) {
            alert("Please fill in all required fields");
            return;
        }

        try {
            setCreatingProfile(true);
            const response = await fetch("/api/owner/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(createForm),
            });

            if (response.ok) {
                const data = await response.json();
                console.log("Owner profile created:", data);

                // Reset form and close dialog
                setCreateForm({
                    firstName: "",
                    lastName: "",
                    email: "",
                    propertyUnit: "",
                    compoundId: "",
                });
                setIsCreateDialogOpen(false);

                // Reload the profile
                await loadOwnerProfile();

                alert("Owner profile created successfully!");
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            console.error("Error creating owner profile:", error);
            alert("Failed to create owner profile");
        } finally {
            setCreatingProfile(false);
        }
    };

    useEffect(() => {
        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                loadOwnerProfile();
                loadAvailableCompounds();
                loadGuestQRCodes();
            } else {
                window.location.href = "/owner/login";
            }
        });

        // Cleanup on unmount
        return () => {
            unsubscribe();
            qrRefreshTimers.forEach((timer) => clearInterval(timer));
        };
    }, []);

    if (loading) {
        return (
            <div className="p-4 flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                    <p>Loading your profile...</p>
                    <p className="text-sm text-muted-foreground mt-2">
                        If you're not logged in, you'll be redirected to the
                        login page
                    </p>
                </div>
            </div>
        );
    }

    if (ownerProfiles.length === 0) {
        return (
            <div className="p-4 space-y-6">
                <Alert>
                    <AlertDescription>
                        No owner profile found. You can either contact your
                        compound administrator to set up your account, or create
                        your own profile if you have a compound ID.
                    </AlertDescription>
                </Alert>

                <Card>
                    <CardHeader>
                        <CardTitle>Create Owner Profile</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <Dialog
                            open={isCreateDialogOpen}
                            onOpenChange={setIsCreateDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <Button>
                                    <Plus className="h-4 w-4 mr-2" />
                                    Create Owner Profile
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader>
                                    <DialogTitle>
                                        Create Owner Profile
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">
                                            First Name *
                                        </Label>
                                        <Input
                                            id="firstName"
                                            value={createForm.firstName}
                                            onChange={(e) =>
                                                setCreateForm((prev) => ({
                                                    ...prev,
                                                    firstName: e.target.value,
                                                }))
                                            }
                                            placeholder="Enter your first name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">
                                            Last Name *
                                        </Label>
                                        <Input
                                            id="lastName"
                                            value={createForm.lastName}
                                            onChange={(e) =>
                                                setCreateForm((prev) => ({
                                                    ...prev,
                                                    lastName: e.target.value,
                                                }))
                                            }
                                            placeholder="Enter your last name"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email *</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            value={createForm.email}
                                            onChange={(e) =>
                                                setCreateForm((prev) => ({
                                                    ...prev,
                                                    email: e.target.value,
                                                }))
                                            }
                                            placeholder="Enter your email"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="propertyUnit">
                                            Property Unit (Optional)
                                        </Label>
                                        <Input
                                            id="propertyUnit"
                                            value={createForm.propertyUnit}
                                            onChange={(e) =>
                                                setCreateForm((prev) => ({
                                                    ...prev,
                                                    propertyUnit:
                                                        e.target.value,
                                                }))
                                            }
                                            placeholder="e.g., Unit A1, Apartment 5B"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="compoundId">
                                            Select Compound *
                                        </Label>
                                        <select
                                            id="compoundId"
                                            value={createForm.compoundId}
                                            onChange={(e) =>
                                                setCreateForm((prev) => ({
                                                    ...prev,
                                                    compoundId: e.target.value,
                                                }))
                                            }
                                            className="w-full p-2 border rounded-md"
                                        >
                                            <option value="">
                                                Select a compound
                                            </option>
                                            {availableCompounds.map(
                                                (compound) => (
                                                    <option
                                                        key={compound.id}
                                                        value={compound.id}
                                                    >
                                                        {compound.name} -{" "}
                                                        {compound.address}
                                                    </option>
                                                )
                                            )}
                                        </select>
                                        <p className="text-xs text-muted-foreground">
                                            If your compound is not listed,
                                            contact your administrator
                                        </p>
                                    </div>

                                    <Button
                                        onClick={createOwnerProfile}
                                        disabled={
                                            creatingProfile ||
                                            !createForm.firstName ||
                                            !createForm.lastName ||
                                            !createForm.email ||
                                            !createForm.compoundId
                                        }
                                        className="w-full"
                                    >
                                        {creatingProfile ? (
                                            <>
                                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                                Creating...
                                            </>
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4 mr-2" />
                                                Create Profile
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6">
            {/* Owner Account Information */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <User className="h-5 w-5" />
                        Your Account Information
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ownerProfiles.map((owner) => (
                            <div
                                key={owner.id}
                                className="border rounded-lg p-4 space-y-2"
                            >
                                <div className="flex items-center gap-2">
                                    <Building className="h-4 w-4" />
                                    <span className="font-semibold">
                                        {owner.compound.name}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Home className="h-4 w-4" />
                                    <span>
                                        Unit:{" "}
                                        {owner.propertyUnit || "Not specified"}
                                    </span>
                                </div>
                                <div>
                                    <span className="font-medium">
                                        {owner.firstName} {owner.lastName}
                                    </span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    <div>Email: {owner.email}</div>
                                    <div>
                                        Phone: {owner.phone || "Not provided"}
                                    </div>
                                </div>
                                <Badge
                                    variant={
                                        owner.isActive ? "default" : "secondary"
                                    }
                                >
                                    {owner.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Entrance QR Codes */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <QrCode className="h-5 w-5" />
                        Your Entrance QR Codes
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {ownerProfiles.map((owner) => {
                            const entranceQR = entranceQRCodes.get(
                                owner.compound.id!
                            );
                            return (
                                <div
                                    key={owner.compound.id}
                                    className="border rounded-lg p-4 space-y-4"
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-semibold">
                                            {owner.compound.name}
                                        </h3>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() =>
                                                refreshEntranceQR(
                                                    owner.compound.id!
                                                )
                                            }
                                        >
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                            Refresh
                                        </Button>
                                    </div>

                                    {entranceQR ? (
                                        <div className="space-y-4">
                                            <div className="flex justify-center">
                                                <Image
                                                    src={entranceQR.dataURL}
                                                    alt="Entrance QR Code"
                                                    width={200}
                                                    height={200}
                                                    className="border rounded"
                                                />
                                            </div>
                                            <div className="text-center space-y-2">
                                                <p className="text-sm text-muted-foreground">
                                                    Auto-refreshes every 10
                                                    minutes
                                                </p>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        downloadQRCode(
                                                            entranceQR.dataURL,
                                                            `entrance-qr-${owner.compound.name}.png`
                                                        )
                                                    }
                                                >
                                                    Download QR Code
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground">
                                            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
                                            <p>Loading QR code...</p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Guest QR Code Generation */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        Generate Guest QR Code
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <Dialog
                        open={isGuestDialogOpen}
                        onOpenChange={setIsGuestDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Generate Guest QR Code
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>
                                    Generate Guest QR Code
                                </DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="compound">
                                        Select Compound
                                    </Label>
                                    <select
                                        id="compound"
                                        value={selectedCompoundId}
                                        onChange={(e) =>
                                            setSelectedCompoundId(
                                                e.target.value
                                            )
                                        }
                                        className="w-full p-2 border rounded-md"
                                    >
                                        <option value="">
                                            Select a compound
                                        </option>
                                        {ownerProfiles.map((owner) => (
                                            <option
                                                key={owner.compound.id}
                                                value={owner.compound.id}
                                            >
                                                {owner.compound.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="guestName">
                                        Guest Name *
                                    </Label>
                                    <Input
                                        id="guestName"
                                        value={guestName}
                                        onChange={(e) =>
                                            setGuestName(e.target.value)
                                        }
                                        placeholder="Enter guest name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="guestPhone">
                                        Guest Phone (Optional)
                                    </Label>
                                    <Input
                                        id="guestPhone"
                                        value={guestPhone}
                                        onChange={(e) =>
                                            setGuestPhone(e.target.value)
                                        }
                                        placeholder="Enter guest phone number"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="purpose">
                                        Purpose (Optional)
                                    </Label>
                                    <Input
                                        id="purpose"
                                        value={guestPurpose}
                                        onChange={(e) =>
                                            setGuestPurpose(e.target.value)
                                        }
                                        placeholder="e.g., Visit, Delivery, etc."
                                    />
                                </div>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <Clock className="h-4 w-4" />
                                    <span>QR code expires in 24 hours</span>
                                </div>

                                <Button
                                    onClick={generateGuestQRCode}
                                    disabled={
                                        generatingGuestQR ||
                                        !selectedCompoundId ||
                                        !guestName
                                    }
                                    className="w-full"
                                >
                                    {generatingGuestQR ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <QrCode className="h-4 w-4 mr-2" />
                                            Generate QR Code
                                        </>
                                    )}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </CardContent>
            </Card>

            {/* Generated Guest QR Codes */}
            {(guestQRCodes.length > 0 || loadingGuestQRs) && (
                <Card>
                    <CardHeader>
                        <CardTitle>Generated Guest QR Codes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loadingGuestQRs ? (
                            <div className="text-center py-8">
                                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
                                <p>Loading your guest QR codes...</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {guestQRCodes.map((guestQR) => (
                                    <div
                                        key={guestQR.id}
                                        className="border rounded-lg p-4 space-y-4 bg-card min-h-[220px]"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold truncate">
                                                    {guestQR.guestName}
                                                </h3>
                                                <p className="text-xs text-muted-foreground">
                                                    Expires:{" "}
                                                    {new Date(
                                                        guestQR.expiresAt
                                                    ).toLocaleString()}
                                                </p>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="ml-2 flex-shrink-0"
                                                onClick={() =>
                                                    downloadQRCode(
                                                        guestQR.dataURL,
                                                        `guest-qr-${guestQR.guestName}.png`
                                                    )
                                                }
                                            >
                                                Download
                                            </Button>
                                        </div>

                                        <div className="flex justify-center">
                                            <Image
                                                src={guestQR.dataURL}
                                                alt={`Guest QR Code for ${guestQR.guestName}`}
                                                width={200}
                                                height={200}
                                                className="border rounded"
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
