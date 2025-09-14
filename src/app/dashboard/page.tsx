'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Building2, 
  QrCode, 
  MapPin, 
  TrendingUp,
  Plus,
  Download,
  Upload
} from "lucide-react";
import Link from "next/link";
import { firestoreService, type Owner, type QRCode } from '@/firebase/firestore';
import { authService } from '@/firebase/auth';
import { useCompound } from '@/contexts/CompoundContext';

export default function DashboardPage() {
  const { selectedCompound } = useCompound();
  const [stats, setStats] = useState({
    totalOwners: 0,
    totalQRCodes: 0,
    totalEntryPoints: 0,
  });
  const [recentOwners, setRecentOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!selectedCompound) return;

      try {
        setLoading(true);
        
        // Load data for the selected compound
        const [owners, qrCodes, entryPoints] = await Promise.all([
          firestoreService.owners.getByCompound(selectedCompound.id!),
          firestoreService.qrCodes.getByCompound(selectedCompound.id!),
          firestoreService.entryPoints.getByCompound(selectedCompound.id!),
        ]);

        setStats({
          totalOwners: owners.length,
          totalQRCodes: qrCodes.length,
          totalEntryPoints: entryPoints.length,
        });

        setRecentOwners(owners.slice(0, 5));
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, [selectedCompound]);

  const quickActions = [
    {
      title: 'Add Owner',
      description: 'Manually add a new property owner',
      icon: Users,
      href: '/dashboard/owners',
      color: 'bg-blue-500',
    },
    {
      title: 'Import CSV',
      description: 'Bulk import owners from CSV file',
      icon: Upload,
      href: '/dashboard/owners?import=true',
      color: 'bg-green-500',
    },
    {
      title: 'Generate QR Codes',
      description: 'Create QR codes for owners',
      icon: QrCode,
      href: '/dashboard/qrcodes',
      color: 'bg-orange-500',
    },
    {
      title: 'Setup Entry Points',
      description: 'Configure access points',
      icon: MapPin,
      href: '/dashboard/points',
      color: 'bg-purple-500',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-2xl font-bold mb-2">Welcome back!</h1>
        <p className="text-blue-100">
          Managing <strong>{selectedCompound?.name}</strong> - {selectedCompound?.address}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Owners</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOwners}</div>
            <p className="text-xs text-muted-foreground">
              Property owners registered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">QR Codes</CardTitle>
            <QrCode className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalQRCodes}</div>
            <p className="text-xs text-muted-foreground">
              Generated access codes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entry Points</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalEntryPoints}</div>
            <p className="text-xs text-muted-foreground">
              Configured access points
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow cursor-pointer">
              <Link href={action.href}>
                <CardHeader className="pb-3">
                  <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <CardTitle className="text-sm font-medium">{action.title}</CardTitle>
                  <CardDescription className="text-xs">
                    {action.description}
                  </CardDescription>
                </CardHeader>
              </Link>
            </Card>
          );
        })}
      </div>

      {/* Recent Owners */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Recent Owners</CardTitle>
            <CardDescription>Latest property owner registrations</CardDescription>
          </div>
          <Link href="/dashboard/owners">
            <Button variant="outline" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {recentOwners.length > 0 ? (
            <div className="space-y-3">
              {recentOwners.map((owner) => (
                <div key={owner.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">
                      {owner.firstName} {owner.lastName}
                    </h4>
                    <p className="text-xs text-muted-foreground">{owner.email}</p>
                  </div>
                  <Badge variant={owner.isActive ? "default" : "secondary"} className="text-xs">
                    {owner.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No owners yet</p>
              <Link href="/dashboard/owners">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Owner
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
