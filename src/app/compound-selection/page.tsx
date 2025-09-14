'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/firebase/firebaseConfig';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Plus, 
  ArrowRight,
  Users,
  QrCode,
  MapPin,
  Settings,
  LogOut
} from "lucide-react";
import { authService } from '@/firebase/auth';
import { firestoreService, type Compound } from '@/firebase/firestore';

export default function CompoundSelectionPage() {
  const [compounds, setCompounds] = useState<Compound[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newCompound, setNewCompound] = useState({
    name: '',
    address: '',
  });
  const [selectedCompoundId, setSelectedCompoundId] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    // Wait for authentication state to be ready
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log('Auth state changed, user:', user);
        loadUserCompounds();
      } else {
        console.log('No authenticated user, redirecting to login');
        router.push('/login');
      }
    });

    return () => unsubscribe();
  }, []);

  const loadUserCompounds = async () => {
    try {
      const currentUser = authService.getCurrentUser();
      console.log('Current user:', currentUser);
      
      if (!currentUser) {
        console.log('No current user, redirecting to login');
        router.push('/login');
        return;
      }

      console.log('Loading compounds for admin:', currentUser.uid);
      const userCompounds = await firestoreService.compounds.getByAdmin(currentUser.uid);
      console.log('Loaded compounds:', userCompounds);
      setCompounds(userCompounds);
    } catch (error) {
      console.error('Error loading compounds:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCompound = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const currentUser = authService.getCurrentUser();
      if (!currentUser) return;

      const compoundData = {
        ...newCompound,
        adminId: currentUser.uid,
        adminEmail: currentUser.email || '',
      };

      const compoundId = await firestoreService.compounds.create(compoundData);
      
      // Store selected compound in localStorage
      localStorage.setItem('selectedCompoundId', compoundId);
      
      setNewCompound({ name: '', address: '' });
      setIsCreateDialogOpen(false);
      
      // Redirect to dashboard with the new compound
      router.push(`/dashboard?compound=${compoundId}`);
    } catch (error) {
      console.error('Error creating compound:', error);
      alert(`Error creating compound: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSelectCompound = (compoundId: string) => {
    // Store selected compound in localStorage
    localStorage.setItem('selectedCompoundId', compoundId);
    
    // Redirect to dashboard with selected compound
    router.push(`/dashboard?compound=${compoundId}`);
  };

  const handleSignOut = async () => {
    try {
      await authService.signOut();
      localStorage.removeItem('selectedCompoundId');
      router.push('/landing');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading your compounds...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              QR Compound
            </span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadUserCompounds}>
              <ArrowRight className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
            Select Your Compound
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Choose an existing compound to manage, or create a new one to get started.
          </p>
        </div>

        {/* Existing Compounds */}
        {compounds.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-6">
              Your Compounds
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {compounds.map((compound) => (
                <Card key={compound.id} className="hover:shadow-lg transition-all duration-200 cursor-pointer group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg group-hover:text-blue-600 transition-colors">
                        {compound.name}
                      </CardTitle>
                      <Badge variant="secondary">Active</Badge>
                    </div>
                    <CardDescription className="text-sm">
                      {compound.address}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Building2 className="h-4 w-4 mr-2" />
                        Created {compound.createdAt?.toDate().toLocaleDateString()}
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          className="flex-1"
                          onClick={() => handleSelectCompound(compound.id!)}
                        >
                          <ArrowRight className="h-4 w-4 mr-2" />
                          Access Dashboard
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Create New Compound */}
        <div className="text-center">
          <Card className="max-w-md mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-center gap-2">
                <Plus className="h-6 w-6 text-blue-600" />
                Create New Compound
              </CardTitle>
              <CardDescription>
                Set up a new compound management system
              </CardDescription>
            </CardHeader>
            <CardContent>
              {compounds.length === 0 ? (
                <div className="space-y-4">
                  <div className="text-center py-6">
                    <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No compounds yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create your first compound to start managing property access
                    </p>
                  </div>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Create First Compound
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Your First Compound</DialogTitle>
                        <DialogDescription>
                          Set up your compound management system with basic information.
                        </DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleCreateCompound} className="space-y-4">
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
                          <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                            Cancel
                          </Button>
                          <Button type="submit">Create Compound</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              ) : (
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Another Compound
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Create New Compound</DialogTitle>
                      <DialogDescription>
                        Add another compound to your management portfolio.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateCompound} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Compound Name</Label>
                        <Input
                          id="name"
                          placeholder="e.g., Riverside Complex"
                          value={newCompound.name}
                          onChange={(e) => setNewCompound({ ...newCompound, name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="address">Address</Label>
                        <Input
                          id="address"
                          placeholder="456 Oak Avenue, City, State 12345"
                          value={newCompound.address}
                          onChange={(e) => setNewCompound({ ...newCompound, address: e.target.value })}
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Create Compound</Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Features Preview */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-8 text-center">
            What You Can Do
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardHeader>
                <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <CardTitle>Manage Owners</CardTitle>
                <CardDescription>
                  Add property owners manually or via CSV import
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <QrCode className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <CardTitle>Generate QR Codes</CardTitle>
                <CardDescription>
                  Create unique access codes for each property owner
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <MapPin className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <CardTitle>Entry Points</CardTitle>
                <CardDescription>
                  Configure access points and security settings
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <Settings className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <CardTitle>Dashboard Analytics</CardTitle>
                <CardDescription>
                  Monitor access patterns and manage your compound
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
