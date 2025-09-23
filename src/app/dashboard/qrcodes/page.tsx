/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    QrCode,
    Plus,
    Search,
    Download,
    Eye,
    Trash2,
    RefreshCw,
    Filter,
    Users,
} from "lucide-react";
import { firestoreService, type QRCode, type User } from "@/firebase/firestore";
import { qrService } from "@/firebase/qr";
import { authService } from "@/firebase/auth";
import { useCompound } from "@/contexts/CompoundContext";
import Image from "next/image";

export default function QRCodesPage() {
    const { selectedCompound } = useCompound();
    const [qrCodes, setQrCodes] = useState<QRCode[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
    const [isBulkGenerateDialogOpen, setIsBulkGenerateDialogOpen] =
        useState(false);
    const [selectedOwner, setSelectedOwner] = useState<string>("");
    const [previewQR, setPreviewQR] = useState<string>("");

    useEffect(() => {
        if (selectedCompound) {
            loadData();
        }
    }, [selectedCompound]);

    const loadData = async () => {
        if (!selectedCompound) return;

        try {
            setLoading(true);
            // Load owners and QR codes for the selected compound only
            const [compoundUsers, compoundQrCodes] = await Promise.all([
                firestoreService.users.getByCompound(selectedCompound.id!),
                firestoreService.qrCodes.getByCompound(selectedCompound.id!),
            ]);

            setUsers(compoundUsers);
            setQrCodes(compoundQrCodes);
        } catch (error) {
            console.error("Error loading QR codes data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateQRCode = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const user = users.find((u) => u.id === selectedOwner);
            if (!user) {
                alert("User not found");
                return;
            }

            const currentUser = authService.getCurrentUser();
            if (!currentUser) return;

            // Generate QR code
            await qrService.createAndSaveQRCode(
                user,
                selectedCompound!.id!,
                currentUser.uid
            );

            setSelectedOwner("");
            setIsGenerateDialogOpen(false);
            loadData();
        } catch (error) {
            console.error("Error generating QR code:", error);
        }
    };

    const handleBulkGenerate = async () => {
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) return;

            // Get users without QR codes
            const usersWithoutQr = users.filter(
                (user) => !qrCodes.some((qr) => qr.ownerId === user.id)
            );

            if (usersWithoutQr.length === 0) {
                alert("All users already have QR codes!");
                return;
            }

            // Generate QR codes for users without them
            await qrService.bulkGenerateQRCodes(
                usersWithoutQr,
                selectedCompound!.id!,
                currentUser.uid
            );

            setIsBulkGenerateDialogOpen(false);
            loadData();
        } catch (error) {
            console.error("Error bulk generating QR codes:", error);
        }
    };

    const handlePreviewQR = async (ownerId: string) => {
        try {
            const user = users.find((u) => u.id === ownerId);
            if (!user) return;

            const qrResult = await qrService.generateUserQRCode(
                user,
                selectedCompound!.id!
            );
            setPreviewQR(qrResult.dataURL);
        } catch (error) {
            console.error("Error previewing QR code:", error);
        }
    };

    const handleDownloadQR = async (qrCode: QRCode) => {
        try {
            const user = users.find((u) => u.id === qrCode.ownerId);
            if (!user) return;

            const qrResult = await qrService.generateUserQRCode(
                user,
                qrCode.compoundId
            );

            // Create download link
            const link = document.createElement("a");
            link.href = qrResult.dataURL;
            link.download = `qr-${user.firstName}-${user.lastName}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error("Error downloading QR code:", error);
        }
    };

    const filteredQrCodes = qrCodes.filter((qrCode) => {
        const user = users.find((u) => u.id === qrCode.ownerId);
        if (!user) return false;

        const matchesSearch =
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            qrCode.ownerName.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    const getUserName = (userId: string) => {
        const user = users.find((u) => u.id === userId);
        return user ? `${user.firstName} ${user.lastName}` : "Unknown User";
    };

    const usersWithoutQr = users.filter(
        (user) => !qrCodes.some((qr) => qr.ownerId === user.id)
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">
                        Loading QR codes...
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                        QR Codes
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Generate and manage QR codes for property owners
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog
                        open={isBulkGenerateDialogOpen}
                        onOpenChange={setIsBulkGenerateDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Bulk Generate
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>
                                    Bulk Generate QR Codes
                                </DialogTitle>
                                <DialogDescription>
                                    Generate QR codes for all owners who
                                    don&apos;t have one yet.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="p-4 bg-muted rounded-lg">
                                    <p className="text-sm">
                                        <strong>{usersWithoutQr.length}</strong>{" "}
                                        owners don&apos;t have QR codes yet.
                                    </p>
                                    {usersWithoutQr.length > 0 && (
                                        <p className="text-xs text-muted-foreground mt-1">
                                            QR codes will be generated for all
                                            of them.
                                        </p>
                                    )}
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setIsBulkGenerateDialogOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        onClick={handleBulkGenerate}
                                        disabled={usersWithoutQr.length === 0}
                                    >
                                        Generate {usersWithoutQr.length} QR
                                        Codes
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={isGenerateDialogOpen}
                        onOpenChange={setIsGenerateDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Generate QR Code
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Generate QR Code</DialogTitle>
                                <DialogDescription>
                                    Generate a QR code for a specific property
                                    owner.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={handleGenerateQRCode}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="owner-select">
                                        Select Owner
                                    </Label>
                                    <select
                                        title="Select an owner"
                                        id="owner-select"
                                        className="w-full p-2 border rounded-md"
                                        value={selectedOwner}
                                        onChange={(e) =>
                                            setSelectedOwner(e.target.value)
                                        }
                                        required
                                    >
                                        <option value="">
                                            Choose an owner
                                        </option>
                                        {users.map((user) => (
                                            <option
                                                key={user.id}
                                                value={user.id}
                                            >
                                                {user.firstName} {user.lastName}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setIsGenerateDialogOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit">
                                        Generate QR Code
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total QR Codes
                        </CardTitle>
                        <QrCode className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {qrCodes.length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active QR Codes
                        </CardTitle>
                        <QrCode className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {qrCodes.filter((qr) => qr.isActive).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Owners Without QR
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {usersWithoutQr.length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Scans
                        </CardTitle>
                        <QrCode className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {qrCodes.reduce(
                                (total, qr) =>
                                    total + (qr.metadata?.scanCount || 0),
                                0
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <Label htmlFor="search">Search</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="search"
                                    placeholder="Search by owner name..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="sm:w-48">
                            <Label htmlFor="compound-display">Compound</Label>
                            <Input
                                id="compound-display"
                                value={selectedCompound?.name || ""}
                                disabled
                                className="bg-gray-50"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* QR Codes Table */}
            <Card>
                <CardHeader>
                    <CardTitle>QR Codes</CardTitle>
                    <CardDescription>
                        {filteredQrCodes.length} of {qrCodes.length} QR codes
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredQrCodes.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Owner</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Scans</TableHead>
                                    <TableHead>Created</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredQrCodes.map((qrCode) => (
                                    <TableRow key={qrCode.id}>
                                        <TableCell className="font-medium">
                                            {getUserName(qrCode.ownerId)}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    qrCode.isActive
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {qrCode.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {qrCode.metadata?.scanCount || 0}
                                        </TableCell>
                                        <TableCell>
                                            {qrCode.createdAt
                                                ?.toDate()
                                                .toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handlePreviewQR(
                                                            qrCode.ownerId
                                                        )
                                                    }
                                                >
                                                    <Eye className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        handleDownloadQR(qrCode)
                                                    }
                                                >
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <div className="text-center py-8">
                            <QrCode className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                                No QR codes found
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                {searchTerm
                                    ? "Try adjusting your search"
                                    : "Generate your first QR code to get started"}
                            </p>
                            {!searchTerm && (
                                <Button
                                    onClick={() =>
                                        setIsGenerateDialogOpen(true)
                                    }
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Generate First QR Code
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* QR Code Preview Dialog */}
            {previewQR && (
                <Dialog
                    open={!!previewQR}
                    onOpenChange={() => setPreviewQR("")}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>QR Code Preview</DialogTitle>
                            <DialogDescription>
                                This is how the QR code will appear when
                                printed.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="flex justify-center">
                            <Image
                                src={previewQR}
                                alt="QR Code Preview"
                                className="max-w-full h-auto"
                            />
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
