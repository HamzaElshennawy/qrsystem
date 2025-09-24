/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect } from "react";
import { Timestamp } from "firebase/firestore";
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
import { PhoneInput } from "@/components/ui/phone-input";
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
    Users,
    Plus,
    Search,
    Upload,
    Edit,
    Trash2,
    Filter,
} from "lucide-react";
import { firestoreService, type User } from "@/firebase/firestore";
import { authService } from "@/firebase/auth";
import { useCompound } from "@/contexts/CompoundContext";

export default function OwnersPage() {
    const { selectedCompound } = useCompound();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
    // Self registration removed
    const [newUser, setNewUser] = useState({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        propertyUnit: "",
        type: "owner" as "owner" | "employee" | "manager",
        paymentStatus: "pending" as "paid" | "pending" | "overdue",
        lastPaymentDate: undefined as Timestamp | undefined,
        compoundId: selectedCompound?.id || "",
    });

    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    useEffect(() => {
        if (selectedCompound) {
            loadData();
        }
    }, [selectedCompound]);

    const loadData = async () => {
        if (!selectedCompound) return;

        try {
            setLoading(true);
            // Load users for the selected compound only
            const compoundUsers = await firestoreService.users.getByCompound(
                selectedCompound.id!
            );
            setUsers(compoundUsers);
            // no-op
        } catch (error) {
            console.error("Error loading owners data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const userData: any = {
                firstName: newUser.firstName,
                lastName: newUser.lastName,
                email: newUser.email,
                paymentStatus: newUser.paymentStatus,
                compoundId: selectedCompound?.id || "",
                type: newUser.type,
                isActive: true,
            };

            if (newUser.phone) {
                userData.phone = newUser.phone;
            }
            if (newUser.propertyUnit) {
                userData.propertyUnit = newUser.propertyUnit;
            }
            if (newUser.lastPaymentDate) {
                userData.lastPaymentDate = newUser.lastPaymentDate;
            }

            // Create user record
            // Check for duplicate phone before creating
            if (newUser.phone) {
                const dup = await firestoreService.users.getByPhone(newUser.phone);
                if (dup.length > 0) {
                    alert("Phone number already in use");
                    return;
                }
            }
            await firestoreService.users.create(userData);
            // Auto-create invite for phone login if phone provided
            if (newUser.phone) {
                const currentUser = authService.getCurrentUser();
                const idToken = currentUser ? await currentUser.getIdToken() : '';
                await fetch('/api/owners/invites', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                    body: JSON.stringify({
                        compoundId: selectedCompound?.id,
                        phone: newUser.phone,
                        email: newUser.email,
                        firstName: newUser.firstName,
                        lastName: newUser.lastName,
                        propertyUnit: newUser.propertyUnit,
                    }),
                });
            }
            setNewUser({
                firstName: "",
                lastName: "",
                email: "",
                phone: "",
                propertyUnit: "",
                type: "owner",
                paymentStatus: "pending",
                lastPaymentDate: undefined,
                compoundId: selectedCompound?.id || "",
            });
            setIsAddDialogOpen(false);
            loadData();
        } catch (error) {
            console.error("Error adding user:", error);
        }
    };

    const openEditDialog = (user: User) => {
        setEditingUser(user);
        setIsEditDialogOpen(true);
    };

    const handleDeleteUser = async (user: User) => {
        if (!user?.id) return;
        const confirmed = window.confirm(
            `Delete ${user.firstName} ${user.lastName}? This will remove the user and their QR codes.`
        );
        if (!confirmed) return;
        try {
            // Delete related QR codes first
            const ownerQrCodes = await firestoreService.qrCodes.getByOwner(
                user.id
            );
            for (const qr of ownerQrCodes) {
                if (qr.id) {
                    await firestoreService.delete("qrcodes", qr.id);
                }
            }
            // Delete the user
            await firestoreService.delete("users", user.id);
            await loadData();
        } catch (error) {
            console.error("Error deleting user:", error);
            alert("Failed to delete user. Please try again.");
        }
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUser?.id) return;
        try {
            const updateData: any = {
                firstName: editingUser.firstName,
                lastName: editingUser.lastName,
                email: editingUser.email,
                paymentStatus: editingUser.paymentStatus,
                isActive: editingUser.isActive,
            };

            if (editingUser.phone !== undefined && editingUser.phone !== null) {
                updateData.phone = editingUser.phone;
            }
            if (
                editingUser.propertyUnit !== undefined &&
                editingUser.propertyUnit !== null
            ) {
                updateData.propertyUnit = editingUser.propertyUnit;
            }
            if (editingUser.lastPaymentDate !== undefined) {
                updateData.lastPaymentDate = editingUser.lastPaymentDate;
            }

            await firestoreService.update("users", editingUser.id, updateData);
            setIsEditDialogOpen(false);
            setEditingUser(null);
            loadData();
        } catch (error) {
            console.error("Error updating owner:", error);
        }
    };

    const handleCSVImport = async (e: React.FormEvent) => {
        e.preventDefault();

        // Check if user is logged in
        const currentUser = authService.getCurrentUser();
        if (!currentUser) {
            alert("Please log in first");
            return;
        }

        // Check if compound is selected
        if (!selectedCompound) {
            alert("Please select a compound first");
            return;
        }

        const formData = new FormData(e.target as HTMLFormElement);
        const file = formData.get("csv-file") as File;

        if (!file) {
            alert("Please select a CSV file");
            return;
        }

        // Validate file type
        if (!file.name.toLowerCase().endsWith(".csv")) {
            alert("Please select a valid CSV file");
            return;
        }

        // Validate file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            alert("File size must be less than 10MB");
            return;
        }

        try {
            // Verify ownership client-side
            const compound = await firestoreService.compounds.getById(
                selectedCompound.id!
            );
            if (!compound) {
                alert("Compound not found");
                return;
            }
            if (compound.adminId !== currentUser.uid) {
                alert("You don't have permission to import users for this compound");
                return;
            }

            // Read CSV text
            const csvText = await file.text();

            // Parse CSV (simple parser for comma-separated, no quotes/escapes)
            const lines = csvText.trim().split("\n");
            if (lines.length < 2) {
                alert("CSV must have a header and at least one row");
                return;
            }

            const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
            const required = ["firstName", "lastName", "email"];
            for (const col of required) {
                if (!headers.includes(col)) {
                    alert(`Missing required column: ${col}. Found: ${headers.join(", ")}`);
                    return;
                }
            }

            const records: any[] = [];
            for (let i = 1; i < lines.length; i++) {
                const values = lines[i].split(",").map((v) => v.trim().replace(/"/g, ""));
                if (values.length !== headers.length) continue;
                const rec: any = {};
                headers.forEach((h, idx) => (rec[h] = values[idx]));
                records.push(rec);
            }

            // Build user payloads
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            const payload = records.map((r) => {
                const typeRaw = (r.type || "owner").toString().trim().toLowerCase();
                const type = ["owner", "employee", "manager"].includes(typeRaw)
                    ? (typeRaw as "owner" | "employee" | "manager")
                    : "owner";
                const email = (r.email || "").toString().trim();
                if (!emailRegex.test(email)) {
                    throw new Error(`Invalid email: ${email}`);
                }
                return {
                    compoundId: selectedCompound.id!,
                    type,
                    firstName: (r.firstName || "").toString().trim(),
                    lastName: (r.lastName || "").toString().trim(),
                    email,
                    phone: (r.phone || "").toString().trim(),
                    propertyUnit: (r.propertyUnit || "").toString().trim(),
                    isActive: true,
                } as any;
            });

            // Write to Firestore using client SDK (rules require auth)
            const ids = await firestoreService.users.bulkCreate(payload);
            alert(`Successfully imported ${ids.length} users`);
            loadData();
        } catch (error) {
            console.error("CSV import error:", error);
            alert("Failed to import CSV file");
        }

        setIsImportDialogOpen(false);
    };

    const filteredUsers = users.filter((user) => {
        const matchesSearch =
            user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        return matchesSearch;
    });

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-slate-600 dark:text-slate-400">
                        Loading owners...
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
                        Users
                    </h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        Manage property users (owners, employees, managers) and
                        their access credentials
                    </p>
                </div>
                <div className="flex gap-2">
                    <Dialog
                        open={isImportDialogOpen}
                        onOpenChange={setIsImportDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <Upload className="h-4 w-4 mr-2" />
                                Import CSV
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Import Users from CSV</DialogTitle>
                                <DialogDescription>
                                    Upload a CSV file with user information. The
                                    file should include columns for: firstName,
                                    lastName, email, phone, propertyUnit, and
                                    type (owner/employee/manager).
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={handleCSVImport}
                                className="space-y-4"
                            >
                                <div className="space-y-2">
                                    <Label htmlFor="csv-file">CSV File</Label>
                                    <Input
                                        id="csv-file"
                                        name="csv-file"
                                        type="file"
                                        accept=".csv"
                                        required
                                    />
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setIsImportDialogOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit">Import Users</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Dialog
                        open={isAddDialogOpen}
                        onOpenChange={setIsAddDialogOpen}
                    >
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                Add User
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New User</DialogTitle>
                                <DialogDescription>
                                    Enter the details for the new property user.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={handleAddUser}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">
                                            First Name
                                        </Label>
                                        <Input
                                            id="firstName"
                                            value={newUser.firstName}
                                            onChange={(e) =>
                                                setNewUser({
                                                    ...newUser,
                                                    firstName: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">
                                            Last Name
                                        </Label>
                                        <Input
                                            id="lastName"
                                            value={newUser.lastName}
                                            onChange={(e) =>
                                                setNewUser({
                                                    ...newUser,
                                                    lastName: e.target.value,
                                                })
                                            }
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={newUser.email}
                                        onChange={(e) =>
                                            setNewUser({
                                                ...newUser,
                                                email: e.target.value,
                                            })
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="type">User Type</Label>
                                    <select
                                        id="type"
                                        aria-label="User Type"
                                        value={newUser.type}
                                        onChange={(e) =>
                                            setNewUser({
                                                ...newUser,
                                                type: e.target.value as
                                                    | "owner"
                                                    | "employee"
                                                    | "manager",
                                            })
                                        }
                                        className="w-full p-2 border rounded-md"
                                    >
                                        <option value="owner">Owner</option>
                                        <option value="employee">
                                            Employee
                                        </option>
                                        <option value="manager">Manager</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="phone">
                                        Phone (Optional)
                                    </Label>
                                    <PhoneInput
                                        value={newUser.phone}
                                        onChange={(value) =>
                                            setNewUser({
                                                ...newUser,
                                                phone: value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="propertyUnit">
                                        Property Unit (Optional)
                                    </Label>
                                    <Input
                                        id="propertyUnit"
                                        value={newUser.propertyUnit}
                                        onChange={(e) =>
                                            setNewUser({
                                                ...newUser,
                                                propertyUnit: e.target.value,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="paymentStatus">
                                        Payment Status
                                    </Label>
                                    <select
                                        id="paymentStatus"
                                        aria-label="Payment Status"
                                        value={newUser.paymentStatus}
                                        onChange={(e) =>
                                            setNewUser({
                                                ...newUser,
                                                paymentStatus: e.target
                                                    .value as
                                                    | "paid"
                                                    | "pending"
                                                    | "overdue",
                                            })
                                        }
                                        className="w-full p-2 border rounded-md"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="overdue">Overdue</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="lastPaymentDate">
                                        Last Payment Date (Optional)
                                    </Label>
                                    <Input
                                        id="lastPaymentDate"
                                        type="date"
                                        value={
                                            newUser.lastPaymentDate
                                                ? newUser.lastPaymentDate
                                                      .toDate()
                                                      .toISOString()
                                                      .split("T")[0]
                                                : ""
                                        }
                                        onChange={(e) =>
                                            setNewUser({
                                                ...newUser,
                                                lastPaymentDate: e.target.value
                                                    ? Timestamp.fromDate(
                                                          new Date(
                                                              e.target.value
                                                          )
                                                      )
                                                    : undefined,
                                            })
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="compoundId">Compound</Label>
                                    <Input
                                        id="compoundId"
                                        value={selectedCompound?.name || ""}
                                        disabled
                                        className="bg-gray-50"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Owner will be added to{" "}
                                        {selectedCompound?.name}
                                    </p>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setIsAddDialogOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit">Add User</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Edit Dialog */}
                    <Dialog
                        open={isEditDialogOpen}
                        onOpenChange={setIsEditDialogOpen}
                    >
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Edit Owner</DialogTitle>
                                <DialogDescription>
                                    Update owner information.
                                </DialogDescription>
                            </DialogHeader>
                            <form
                                onSubmit={handleUpdateUser}
                                className="space-y-4"
                            >
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="editFirstName">
                                            First Name
                                        </Label>
                                        <Input
                                            id="editFirstName"
                                            value={editingUser?.firstName || ""}
                                            onChange={(e) =>
                                                setEditingUser((prev) =>
                                                    prev
                                                        ? {
                                                              ...prev,
                                                              firstName:
                                                                  e.target
                                                                      .value,
                                                          }
                                                        : null
                                                )
                                            }
                                            required
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="editLastName">
                                            Last Name
                                        </Label>
                                        <Input
                                            id="editLastName"
                                            value={editingUser?.lastName || ""}
                                            onChange={(e) =>
                                                setEditingUser((prev) =>
                                                    prev
                                                        ? {
                                                              ...prev,
                                                              lastName:
                                                                  e.target
                                                                      .value,
                                                          }
                                                        : null
                                                )
                                            }
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="editEmail">Email</Label>
                                    <Input
                                        id="editEmail"
                                        type="email"
                                        value={editingUser?.email || ""}
                                        onChange={(e) =>
                                            setEditingUser((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          email: e.target.value,
                                                      }
                                                    : null
                                            )
                                        }
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="editPhone">Phone</Label>
                                    <PhoneInput
                                        value={editingUser?.phone || ""}
                                        onChange={(value) =>
                                            setEditingUser((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          phone: value,
                                                      }
                                                    : null
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="editPropertyUnit">
                                        Property Unit
                                    </Label>
                                    <Input
                                        id="editPropertyUnit"
                                        value={editingUser?.propertyUnit || ""}
                                        onChange={(e) =>
                                            setEditingUser((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          propertyUnit:
                                                              e.target.value,
                                                      }
                                                    : null
                                            )
                                        }
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="editPaymentStatus">
                                        Payment Status
                                    </Label>
                                    <select
                                        id="editPaymentStatus"
                                        aria-label="Payment Status"
                                        value={
                                            editingUser?.paymentStatus ||
                                            "pending"
                                        }
                                        onChange={(e) =>
                                            setEditingUser((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          paymentStatus: e
                                                              .target.value as
                                                              | "paid"
                                                              | "pending"
                                                              | "overdue",
                                                      }
                                                    : null
                                            )
                                        }
                                        className="w-full p-2 border rounded-md"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="paid">Paid</option>
                                        <option value="overdue">Overdue</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="editLastPaymentDate">
                                        Last Payment Date
                                    </Label>
                                    <Input
                                        id="editLastPaymentDate"
                                        type="date"
                                        value={
                                            editingUser?.lastPaymentDate
                                                ? editingUser.lastPaymentDate
                                                      .toDate()
                                                      .toISOString()
                                                      .split("T")[0]
                                                : ""
                                        }
                                        onChange={(e) =>
                                            setEditingUser((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          lastPaymentDate: e
                                                              .target.value
                                                              ? Timestamp.fromDate(
                                                                    new Date(
                                                                        e.target.value
                                                                    )
                                                                )
                                                              : undefined,
                                                      }
                                                    : null
                                            )
                                        }
                                    />
                                </div>
                                <div className="flex items-center space-x-2">
                                    <input
                                        title="Active"
                                        type="checkbox"
                                        id="editIsActive"
                                        checked={editingUser?.isActive || false}
                                        onChange={(e) =>
                                            setEditingUser((prev) =>
                                                prev
                                                    ? {
                                                          ...prev,
                                                          isActive:
                                                              e.target.checked,
                                                      }
                                                    : null
                                            )
                                        }
                                        className="rounded"
                                    />
                                    <Label htmlFor="editIsActive">Active</Label>
                                </div>
                                <div className="flex justify-end gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() =>
                                            setIsEditDialogOpen(false)
                                        }
                                    >
                                        Cancel
                                    </Button>
                                    <Button type="submit">Update Owner</Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Total Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{users.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Active Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {users.filter((user) => user.isActive).length}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">
                            Inactive Users
                        </CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {users.filter((user) => !user.isActive).length}
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
                                    placeholder="Search by name or email..."
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
                        <div className="sm:w-48">
                            <Label>Owner Links</Label>
                            <div className="flex flex-col gap-2 text-sm">
                                <a className="underline" href="/owner/login" target="_blank" rel="noreferrer">Owner Portal Login</a>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Owners Table */}
            <Card>
                <CardHeader>
                    <CardTitle>Property Users</CardTitle>
                    <CardDescription>
                        {filteredUsers.length} of {users.length} users
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {filteredUsers.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Phone</TableHead>
                                    <TableHead>Property Unit</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Payment Status</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredUsers.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">
                                            {user.firstName} {user.lastName}
                                        </TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="capitalize"
                                            >
                                                {user.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.phone || "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            {user.propertyUnit || "N/A"}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    user.isActive
                                                        ? "default"
                                                        : "secondary"
                                                }
                                            >
                                                {user.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    user.paymentStatus ===
                                                    "paid"
                                                        ? "default"
                                                        : user.paymentStatus ===
                                                          "pending"
                                                        ? "secondary"
                                                        : "destructive"
                                                }
                                            >
                                                {user.paymentStatus ||
                                                    "Pending"}
                                            </Badge>
                                            {user.lastPaymentDate && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {user.lastPaymentDate
                                                        .toDate()
                                                        .toLocaleDateString()}
                                                </p>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() =>
                                                        openEditDialog(user)
                                                    }
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleDeleteUser(user)}
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
                            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium mb-2">
                                No users found
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                {searchTerm
                                    ? "Try adjusting your search"
                                    : "Get started by adding your first property user"}
                            </p>
                            {!searchTerm && (
                                <Button
                                    onClick={() => setIsAddDialogOpen(true)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add First User
                                </Button>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Self-registration removed */}
        </div>
    );
}
