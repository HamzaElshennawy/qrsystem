'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  Building2, 
  Plus, 
  Search, 
  Edit, 
  Trash2,
  Users,
  QrCode,
  MapPin,
  Settings
} from "lucide-react";
import Link from "next/link";
import { firestoreService, type Compound } from '@/firebase/firestore';
import { authService } from '@/firebase/auth';

export default function CompoundsPage() {
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCompound, setNewCompound] = useState({
    name: '',
    address: '',
    adminId: '',
    adminEmail: '',
  });

  useEffect(() => {
    loadCompounds();
  }, []);

  const loadCompounds = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      const userCompounds = await firestoreService.compounds.getByAdmin(currentUser.uid);
      setCompounds(userCompounds);
    } catch (error) {
      console.error('Error loading compounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCompound = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      const compoundData = {
        ...newCompound,
        adminId: currentUser.uid,
        adminEmail: currentUser.email || '',
      };

      await firestoreService.compounds.create(compoundData);
      setNewCompound({
        name: '',
        address: '',
        adminId: '',
        adminEmail: '',
      });
      setIsAddDialogOpen(false);
      loadCompounds();
    } catch (error) {
      console.error('Error adding compound:', error);
    }
  };

  const filteredCompounds = compounds.filter(compound =>
    compound.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    compound.address.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading compounds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Compounds</h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage your residential compounds and their settings
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Compound
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Compound</DialogTitle>
              <DialogDescription>
                Set up a new residential compound for management.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddCompound} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Compound Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., Sunset Gardens"
                  value={newCompound.name}
                  onChange={(e) => setNewCompound({ ...newCompound, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="123 Main Street, City, State 12345"
                  value={newCompound.address}
                  onChange={(e) => setNewCompound({ ...newCompound, address: e.target.value })}
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Create Compound</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Compounds</CardTitle>
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{compounds.length}</div>
          <p className="text-xs text-muted-foreground">
            Compounds under your management
          </p>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Search Compounds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or address..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Compounds Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompounds.length > 0 ? (
          filteredCompounds.map((compound) => (
            <Card key={compound.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{compound.name}</CardTitle>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <CardDescription>{compound.address}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Building2 className="h-4 w-4 mr-2" />
                    Created {compound.createdAt?.toDate().toLocaleDateString()}
                  </div>
                  
                  <div className="flex gap-2">
                    <Link href={`/dashboard/owners?compound=${compound.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Users className="h-4 w-4 mr-2" />
                        Owners
                      </Button>
                    </Link>
                    <Link href={`/dashboard/qrcodes?compound=${compound.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <QrCode className="h-4 w-4 mr-2" />
                        QR Codes
                      </Button>
                    </Link>
                    <Link href={`/dashboard/points?compound=${compound.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <MapPin className="h-4 w-4 mr-2" />
                        Entry Points
                      </Button>
                    </Link>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <Button variant="outline" size="sm" className="flex-1">
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1">
                      <Settings className="h-4 w-4 mr-2" />
                      Settings
                    </Button>
                    <Button variant="outline" size="sm">
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
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">
                  {searchTerm ? 'No compounds found' : 'No compounds yet'}
                </h3>
                <p className="text-muted-foreground mb-4">
                  {searchTerm 
                    ? 'Try adjusting your search terms' 
                    : 'Create your first compound to get started'
                  }
                </p>
                {!searchTerm && (
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Compound
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
