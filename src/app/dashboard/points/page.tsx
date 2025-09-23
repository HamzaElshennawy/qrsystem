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
    MapPin,
    Plus,
    Search,
    Edit,
    Trash2,
    Settings,
    Shield,
    Users,
} from "lucide-react";
import {
    firestoreService,
    type EntryPoint,
    type Compound,
    type User,
} from "@/firebase/firestore";
import { authService } from "@/firebase/auth";

export default function EntryPointsPage() {
    const [entryPoints, setEntryPoints] = useState<EntryPoint[]>([]);
    const [compounds, setCompounds] = useState<Compound[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCompound, setSelectedCompound] = useState<string>("all");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingEntryPoint, setEditingEntryPoint] =
        useState<EntryPoint | null>(null);
    const [newEntryPoint, setNewEntryPoint] = useState({
        compoundId: "",
        name: "",
        location: "",
        isActive: true,
        settings: {
            allowAllOwners: true,
            allowedOwners: [] as string[],
            scanRequired: true,
            allowRenters: true,
            allowGuests: true,
            enforcePaymentStatus: false,
        },
    });
    const [editEntryPoint, setEditEntryPoint] = useState({
        id: "",
        compoundId: "",
        name: "",
        location: "",
        isActive: true,
        settings: {
            allowAllOwners: true,
            allowedOwners: [] as string[],
            scanRequired: true,
            allowRenters: true,
            allowGuests: true,
            enforcePaymentStatus: false,
        },
    });

    const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
    const [settingsEntryPoint, setSettingsEntryPoint] =
        useState<EntryPoint | null>(null);
    const [compoundUsers, setCompoundUsers] = useState<User[]>([]);
    const [selectedOwners, setSelectedOwners] = useState<string[]>([]);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const currentUser = authService.getCurrentUser();
            if (!currentUser) return;

            // Load compounds
            const userCompounds = await firestoreService.compounds.getByAdmin(
                currentUser.uid
            );
            setCompounds(userCompounds);

            // Load entry points for all compounds
            const allEntryPoints: EntryPoint[] = [];
            for (const compound of userCompounds) {
                const compoundEntryPoints =
                    await firestoreService.entryPoints.getByCompound(
                        compound.id!
                    );
                allEntryPoints.push(...compoundEntryPoints);
            }
            setEntryPoints(allEntryPoints);
        } catch (error) {
            console.error("Error loading entry points data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddEntryPoint = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await firestoreService.entryPoints.create(newEntryPoint);
            setNewEntryPoint({
                compoundId: "",
                name: "",
                location: "",
                isActive: true,
                settings: {
                    allowAllOwners: true,
                    allowedOwners: [],
                    scanRequired: true,
                    allowRenters: true,
                    allowGuests: true,
                    enforcePaymentStatus: false,
                },
            });
            setIsAddDialogOpen(false);
            loadData();
        } catch (error) {
            console.error("Error adding entry point:", error);
        }
    };

    const handleEditEntryPoint = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingEntryPoint) return;
        try {
            await firestoreService.update(
                "entryPoints",
                editingEntryPoint.id!,
                editEntryPoint
            );
            setIsEditDialogOpen(false);
            setEditingEntryPoint(null);
            loadData();
        } catch (error) {
            console.error("Error updating entry point:", error);
        }
    };

    const openEditDialog = (entryPoint: EntryPoint) => {
        setEditingEntryPoint(entryPoint);
        setEditEntryPoint({
            id: entryPoint.id || "",
            compoundId: entryPoint.compoundId,
            name: entryPoint.name,
            location: entryPoint.location,
            isActive: entryPoint.isActive,
            settings: {
                allowAllOwners: entryPoint.settings?.allowAllOwners || true,
                allowedOwners: entryPoint.settings?.allowedOwners || [],
                scanRequired: entryPoint.settings?.scanRequired || true,
                allowRenters: entryPoint.settings?.allowRenters || true,
                allowGuests: entryPoint.settings?.allowGuests || true,
                enforcePaymentStatus:
                    entryPoint.settings?.enforcePaymentStatus || false,
            },
        });
        setIsEditDialogOpen(true);
    };

    const openSettingsDialog = (entryPoint: EntryPoint) => {
        setSettingsEntryPoint(entryPoint);
        setSelectedOwners(entryPoint.settings?.allowedOwners || []);
        setIsSettingsDialogOpen(true);
    };

    const toggleOwner = (ownerId: string) => {
        setSelectedOwners((prev) =>
            prev.includes(ownerId)
                ? prev.filter((id) => id !== ownerId)
                : [...prev, ownerId]
        );
    };

    const handleUpdateOwners = async () => {
        if (!settingsEntryPoint || !settingsEntryPoint.id) return;

        const updatedSettings = {
            ...settingsEntryPoint.settings,
            allowedOwners: selectedOwners,
        };

        try {
            await firestoreService.update(
                "entryPoints",
                settingsEntryPoint.id,
                { settings: updatedSettings }
            );
            setIsSettingsDialogOpen(false);
            setSelectedOwners([]);
            setSettingsEntryPoint(null);
            loadData();
        } catch (error) {
            console.error("Error updating allowed owners:", error);
        }
    };

    useEffect(() => {
        const loadOwnersForSettings = async () => {
            if (isSettingsDialogOpen && settingsEntryPoint?.compoundId) {
                try {
                    const users = await firestoreService.users.getByCompound(
                        settingsEntryPoint.compoundId
                    );
                    setCompoundUsers(users);
                } catch (error) {
                    console.error("Error loading owners for settings:", error);
                }
            }
        };

        loadOwnersForSettings();
    }, [isSettingsDialogOpen, settingsEntryPoint]);

    const filteredEntryPoints = entryPoints.filter((entryPoint) => {
        const matchesSearch =
            entryPoint.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            entryPoint.location
                .toLowerCase()
                .includes(searchTerm.toLowerCase());

        const matchesCompound =
            selectedCompound === "all" ||
            entryPoint.compoundId === selectedCompound;

        return matchesSearch && matchesCompound;
    });

    const getCompoundName = (compoundId: string) => {
        const compound = compounds.find((c) => c.id === compoundId);
        return compound?.name || "Unknown Compound";
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">
                        Loading entry points...
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
                        Entry Points
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Configure access points and security settings for your
                        compounds
                    </p>
                </div>
                <Dialog
                    open={isAddDialogOpen}
                    onOpenChange={setIsAddDialogOpen}
                >
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Entry Point
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add New Entry Point</DialogTitle>
                            <DialogDescription>
                                Set up a new access point for your compound.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleAddEntryPoint}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="compoundId">Compound</Label>
                                <select
                                    title="compoundid"
                                    id="compoundId"
                                    className="w-full p-2 border rounded-md"
                                    value={newEntryPoint.compoundId}
                                    onChange={(e) =>
                                        setNewEntryPoint({
                                            ...newEntryPoint,
                                            compoundId: e.target.value,
                                        })
                                    }
                                    required
                                >
                                    <option value="">Select a compound</option>
                                    {compounds.map((compound) => (
                                        <option
                                            key={compound.id}
                                            value={compound.id}
                                        >
                                            {compound.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Entry Point Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Main Gate, Side Entrance"
                                    value={newEntryPoint.name}
                                    onChange={(e) =>
                                        setNewEntryPoint({
                                            ...newEntryPoint,
                                            name: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">
                                    Location Description
                                </Label>
                                <Input
                                    id="location"
                                    placeholder="e.g., Front of building, Parking area entrance"
                                    value={newEntryPoint.location}
                                    onChange={(e) =>
                                        setNewEntryPoint({
                                            ...newEntryPoint,
                                            location: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        title="allowallowners"
                                        type="checkbox"
                                        id="allowAllOwners"
                                        checked={
                                            newEntryPoint.settings
                                                .allowAllOwners
                                        }
                                        onChange={(e) =>
                                            setNewEntryPoint({
                                                ...newEntryPoint,
                                                settings: {
                                                    ...newEntryPoint.settings,
                                                    allowAllOwners:
                                                        e.target.checked,
                                                },
                                            })
                                        }
                                        className="rounded"
                                    />
                                    <Label htmlFor="allowAllOwners">
                                        Allow all compound owners
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        title="scanrequired"
                                        type="checkbox"
                                        id="scanRequired"
                                        checked={
                                            newEntryPoint.settings.scanRequired
                                        }
                                        onChange={(e) =>
                                            setNewEntryPoint({
                                                ...newEntryPoint,
                                                settings: {
                                                    ...newEntryPoint.settings,
                                                    scanRequired:
                                                        e.target.checked,
                                                },
                                            })
                                        }
                                        className="rounded"
                                    />
                                    <Label htmlFor="scanRequired">
                                        QR code scan required
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        title="allowrenters"
                                        type="checkbox"
                                        id="allowRenters"
                                        checked={
                                            newEntryPoint.settings.allowRenters
                                        }
                                        onChange={(e) =>
                                            setNewEntryPoint({
                                                ...newEntryPoint,
                                                settings: {
                                                    ...newEntryPoint.settings,
                                                    allowRenters:
                                                        e.target.checked,
                                                },
                                            })
                                        }
                                        className="rounded"
                                    />
                                    <Label htmlFor="allowRenters">
                                        Allow renters access
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        title="allowguests"
                                        type="checkbox"
                                        id="allowGuests"
                                        checked={
                                            newEntryPoint.settings.allowGuests
                                        }
                                        onChange={(e) =>
                                            setNewEntryPoint({
                                                ...newEntryPoint,
                                                settings: {
                                                    ...newEntryPoint.settings,
                                                    allowGuests:
                                                        e.target.checked,
                                                },
                                            })
                                        }
                                        className="rounded"
                                    />
                                    <Label htmlFor="allowGuests">
                                        Allow guests access
                                    </Label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsAddDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit">Add Entry Point</Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
                <Dialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                >
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Edit Entry Point</DialogTitle>
                            <DialogDescription>
                                Update the access point settings.
                            </DialogDescription>
                        </DialogHeader>
                        <form
                            onSubmit={handleEditEntryPoint}
                            className="space-y-4"
                        >
                            <div className="space-y-2">
                                <Label htmlFor="compoundId">Compound</Label>
                                <select
                                    title="compoundid"
                                    id="compoundId"
                                    className="w-full p-2 border rounded-md"
                                    value={editEntryPoint.compoundId}
                                    onChange={(e) =>
                                        setEditEntryPoint({
                                            ...editEntryPoint,
                                            compoundId: e.target.value,
                                        })
                                    }
                                    disabled
                                >
                                    {compounds.map((compound) => (
                                        <option
                                            key={compound.id}
                                            value={compound.id}
                                        >
                                            {compound.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="name">Entry Point Name</Label>
                                <Input
                                    id="name"
                                    placeholder="e.g., Main Gate, Side Entrance"
                                    value={editEntryPoint.name}
                                    onChange={(e) =>
                                        setEditEntryPoint({
                                            ...editEntryPoint,
                                            name: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="location">
                                    Location Description
                                </Label>
                                <Input
                                    id="location"
                                    placeholder="e.g., Front of building, Parking area entrance"
                                    value={editEntryPoint.location}
                                    onChange={(e) =>
                                        setEditEntryPoint({
                                            ...editEntryPoint,
                                            location: e.target.value,
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <input
                                        title="isactive"
                                        type="checkbox"
                                        id="isActive"
                                        checked={editEntryPoint.isActive}
                                        onChange={(e) =>
                                            setEditEntryPoint({
                                                ...editEntryPoint,
                                                isActive: e.target.checked,
                                            })
                                        }
                                        className="rounded"
                                    />
                                    <Label htmlFor="isActive">Active</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        title="allowallowners"
                                        type="checkbox"
                                        id="allowAllOwners"
                                        checked={
                                            editEntryPoint.settings
                                                .allowAllOwners
                                        }
                                        onChange={(e) =>
                                            setEditEntryPoint({
                                                ...editEntryPoint,
                                                settings: {
                                                    ...editEntryPoint.settings,
                                                    allowAllOwners:
                                                        e.target.checked,
                                                },
                                            })
                                        }
                                        className="rounded"
                                    />
                                    <Label htmlFor="allowAllOwners">
                                        Allow all compound owners
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        title="scanrequired"
                                        type="checkbox"
                                        id="scanRequired"
                                        checked={
                                            editEntryPoint.settings.scanRequired
                                        }
                                        onChange={(e) =>
                                            setEditEntryPoint({
                                                ...editEntryPoint,
                                                settings: {
                                                    ...editEntryPoint.settings,
                                                    scanRequired:
                                                        e.target.checked,
                                                },
                                            })
                                        }
                                        className="rounded"
                                    />
                                    <Label htmlFor="scanRequired">
                                        QR code scan required
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        title="allowrenters"
                                        type="checkbox"
                                        id="allowRenters"
                                        checked={
                                            editEntryPoint.settings.allowRenters
                                        }
                                        onChange={(e) =>
                                            setEditEntryPoint({
                                                ...editEntryPoint,
                                                settings: {
                                                    ...editEntryPoint.settings,
                                                    allowRenters:
                                                        e.target.checked,
                                                },
                                            })
                                        }
                                        className="rounded"
                                    />
                                    <Label htmlFor="allowRenters">
                                        Allow renters access
                                    </Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        title="allowguests"
                                        type="checkbox"
                                        id="allowGuests"
                                        checked={
                                            editEntryPoint.settings.allowGuests
                                        }
                                        onChange={(e) =>
                                            setEditEntryPoint({
                                                ...editEntryPoint,
                                                settings: {
                                                    ...editEntryPoint.settings,
                                                    allowGuests:
                                                        e.target.checked,
                                                },
                                            })
                                        }
                                        className="rounded"
                                    />
                                    <Label htmlFor="allowGuests">
                                        Allow guests access
                                    </Label>
                                </div>
                            </div>
                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsEditDialogOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Update Entry Point
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Settings Dialog */}
            <Dialog
                open={isSettingsDialogOpen}
                onOpenChange={(open) => {
                    setIsSettingsDialogOpen(open);
                    if (!open) {
                        setSelectedOwners([]);
                        setSettingsEntryPoint(null);
                        setCompoundUsers([]);
                    }
                }}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Entry Point Access Settings</DialogTitle>
                        <DialogDescription>
                            Configure which owners can access this entry point.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        {settingsEntryPoint?.settings?.allowAllOwners ? (
                            <div className="p-4 bg-blue-50 rounded-lg border">
                                <div className="flex items-center space-x-2 text-blue-800">
                                    <Users className="h-4 w-4" />
                                    <p className="text-sm">
                                        All compound owners have unrestricted
                                        access.
                                    </p>
                                </div>
                                <p className="text-xs text-blue-700 mt-2">
                                    To limit access to specific owners, edit the
                                    entry point and disable &quot;Allow all
                                    compound owners&quot; in basic settings.
                                </p>
                            </div>
                        ) : (
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium">
                                        Allowed Owners
                                    </span>
                                    <Badge className="text-xs">
                                        {selectedOwners.length} selected
                                    </Badge>
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-2">
                                    {compoundUsers.length > 0 ? (
                                        compoundUsers.map((user) => (
                                            <div
                                                key={user.id}
                                                className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded cursor-pointer"
                                                onClick={() =>
                                                    toggleOwner(user.id!)
                                                }
                                            >
                                                <input
                                                    title="allowuser"
                                                    type="checkbox"
                                                    checked={selectedOwners.includes(
                                                        user.id!
                                                    )}
                                                    onChange={() =>
                                                        toggleOwner(user.id!)
                                                    }
                                                    className="rounded"
                                                />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium truncate">
                                                        {user.firstName}{" "}
                                                        {user.lastName}
                                                    </p>
                                                    {user.propertyUnit && (
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            Unit:{" "}
                                                            {user.propertyUnit}
                                                        </p>
                                                    )}
                                                    {user.email && (
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {user.email}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-muted-foreground">
                                            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">
                                                No owners available
                                            </p>
                                            <p className="text-xs">
                                                Add owners to the compound first
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                        <div className="flex justify-end gap-2 pt-4 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsSettingsDialogOpen(false);
                                    setSelectedOwners([]);
                                    setSettingsEntryPoint(null);
                                    setCompoundUsers([]);
                                }}
                            >
                                Cancel
                            </Button>
                            {!settingsEntryPoint?.settings?.allowAllOwners && (
                                <Button
                                    onClick={handleUpdateOwners}
                                    disabled={selectedOwners.length === 0}
                                >
                                    {selectedOwners.length > 0
                                        ? "Save Changes"
                                        : "Select Owners"}
                                </Button>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Entry Points
                        </CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {entryPoints.length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Points
                        </CardTitle>
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {
                                entryPoints.filter((point) => point.isActive)
                                    .length
                            }
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Scan Required
                        </CardTitle>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {
                                entryPoints.filter(
                                    (point) => point.settings?.scanRequired
                                ).length
                            }
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Open Access
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {
                                entryPoints.filter(
                                    (point) => point.settings?.allowAllOwners
                                ).length
                            }
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <Card>
                <CardHeader>
                    <CardTitle>Search Entry Points</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="flex-1">
                            <div className="relative">
                                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or location..."
                                    value={searchTerm}
                                    onChange={(e) =>
                                        setSearchTerm(e.target.value)
                                    }
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="sm:w-48">
                            <select
                                title="compoundid"
                                className="w-full p-2 border rounded-md"
                                value={selectedCompound}
                                onChange={(e) =>
                                    setSelectedCompound(e.target.value)
                                }
                            >
                                <option value="all">All Compounds</option>
                                {compounds.map((compound) => (
                                    <option
                                        key={compound.id}
                                        value={compound.id}
                                    >
                                        {compound.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Entry Points Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEntryPoints.length > 0 ? (
                    filteredEntryPoints.map((entryPoint) => (
                        <Card
                            key={entryPoint.id}
                            className="hover:shadow-md transition-shadow"
                        >
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">
                                        {entryPoint.name}
                                    </CardTitle>
                                    <Badge
                                        variant={
                                            entryPoint.isActive
                                                ? "default"
                                                : "secondary"
                                        }
                                    >
                                        {entryPoint.isActive
                                            ? "Active"
                                            : "Inactive"}
                                    </Badge>
                                </div>
                                <CardDescription>
                                    {entryPoint.location}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4 mr-2" />
                                        {getCompoundName(entryPoint.compoundId)}
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span>QR Scan Required:</span>
                                            <Badge
                                                variant={
                                                    entryPoint.settings
                                                        ?.scanRequired
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {entryPoint.settings
                                                    ?.scanRequired
                                                    ? "Yes"
                                                    : "No"}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Access Level:</span>
                                            <Badge
                                                variant={
                                                    entryPoint.settings
                                                        ?.allowAllOwners
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {entryPoint.settings
                                                    ?.allowAllOwners
                                                    ? "All Owners"
                                                    : "Restricted"}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Renters Access:</span>
                                            <Badge
                                                variant={
                                                    entryPoint.settings
                                                        ?.allowRenters
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {entryPoint.settings
                                                    ?.allowRenters
                                                    ? "Allowed"
                                                    : "Denied"}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span>Guests Access:</span>
                                            <Badge
                                                variant={
                                                    entryPoint.settings
                                                        ?.allowGuests
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {entryPoint.settings
                                                    ?.allowGuests
                                                    ? "Allowed"
                                                    : "Denied"}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-2 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() =>
                                                openEditDialog(entryPoint)
                                            }
                                        >
                                            <Edit className="h-4 w-4 mr-2" />
                                            Edit
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="flex-1"
                                            onClick={() =>
                                                openSettingsDialog(entryPoint)
                                            }
                                        >
                                            <Settings className="h-4 w-4 mr-2" />
                                            Settings
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                ) : (
                    <div className="col-span-full">
                        <Card>
                            <CardContent className="text-center py-12">
                                <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">
                                    {searchTerm
                                        ? "No entry points found"
                                        : "No entry points yet"}
                                </h3>
                                <p className="text-muted-foreground mb-4">
                                    {searchTerm
                                        ? "Try adjusting your search terms"
                                        : "Create your first entry point to get started"}
                                </p>
                                {!searchTerm && (
                                    <Button
                                        onClick={() => setIsAddDialogOpen(true)}
                                    >
                                        <Plus className="h-4 w-4 mr-2" />
                                        Create First Entry Point
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}
            </div>
        </div>
    );
}
