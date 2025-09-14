'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Users, 
  Plus, 
  Search, 
  Upload, 
  Download, 
  Edit, 
  Trash2,
  FileText,
  Filter
} from "lucide-react";
import { firestoreService, type Owner, type Compound } from '@/firebase/firestore';
import { authService } from '@/firebase/auth';
import { useCompound } from '@/contexts/CompoundContext';

export default function OwnersPage() {
  const { selectedCompound } = useCompound();
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [newOwner, setNewOwner] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    propertyUnit: '',
    compoundId: selectedCompound?.id || '',
  });

  useEffect(() => {
    if (selectedCompound) {
      loadData();
    }
  }, [selectedCompound]);

  const loadData = async () => {
    if (!selectedCompound) return;
    
    try {
      setLoading(true);
      // Load owners for the selected compound only
      const compoundOwners = await firestoreService.owners.getByCompound(selectedCompound.id!);
      setOwners(compoundOwners);
    } catch (error) {
      console.error('Error loading owners data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ownerData = {
        ...newOwner,
        compoundId: selectedCompound?.id || '',
      };
      await firestoreService.owners.create(ownerData);
      setNewOwner({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        propertyUnit: '',
        compoundId: selectedCompound?.id || '',
      });
      setIsAddDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Error adding owner:', error);
    }
  };

  const handleCSVImport = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement CSV import functionality
    console.log('CSV import functionality to be implemented');
    setIsImportDialogOpen(false);
  };

  const filteredOwners = owners.filter(owner => {
    const matchesSearch = 
      owner.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      owner.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading owners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Owners</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage property owners and their access credentials
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Owners from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with owner information. The file should include columns for:
                  firstName, lastName, email, phone, propertyUnit, and compoundId.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCSVImport} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="csv-file">CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Import Owners</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Owner
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Owner</DialogTitle>
                <DialogDescription>
                  Enter the details for the new property owner.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleAddOwner} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={newOwner.firstName}
                      onChange={(e) => setNewOwner({ ...newOwner, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={newOwner.lastName}
                      onChange={(e) => setNewOwner({ ...newOwner, lastName: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newOwner.email}
                    onChange={(e) => setNewOwner({ ...newOwner, email: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    value={newOwner.phone}
                    onChange={(e) => setNewOwner({ ...newOwner, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="propertyUnit">Property Unit (Optional)</Label>
                  <Input
                    id="propertyUnit"
                    value={newOwner.propertyUnit}
                    onChange={(e) => setNewOwner({ ...newOwner, propertyUnit: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="compoundId">Compound</Label>
                  <Input
                    id="compoundId"
                    value={selectedCompound?.name || ''}
                    disabled
                    className="bg-gray-50"
                  />
                  <p className="text-xs text-muted-foreground">
                    Owner will be added to {selectedCompound?.name}
                  </p>
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Owner</Button>
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
            <CardTitle className="text-sm font-medium">Total Owners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{owners.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Owners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {owners.filter(owner => owner.isActive).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inactive Owners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {owners.filter(owner => !owner.isActive).length}
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
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="sm:w-48">
              <Label htmlFor="compound-display">Compound</Label>
              <Input
                id="compound-display"
                value={selectedCompound?.name || ''}
                disabled
                className="bg-gray-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Owners Table */}
      <Card>
        <CardHeader>
          <CardTitle>Property Owners</CardTitle>
          <CardDescription>
            {filteredOwners.length} of {owners.length} owners
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredOwners.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Property Unit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOwners.map((owner) => (
                  <TableRow key={owner.id}>
                    <TableCell className="font-medium">
                      {owner.firstName} {owner.lastName}
                    </TableCell>
                    <TableCell>{owner.email}</TableCell>
                    <TableCell>{owner.phone || 'N/A'}</TableCell>
                    <TableCell>{owner.propertyUnit || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge variant={owner.isActive ? "default" : "secondary"}>
                        {owner.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
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
              <h3 className="text-lg font-medium mb-2">No owners found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm 
                  ? 'Try adjusting your search' 
                  : 'Get started by adding your first property owner'
                }
              </p>
              {!searchTerm && (
                <Button onClick={() => setIsAddDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Owner
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
