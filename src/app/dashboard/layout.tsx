'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  QrCode, 
  Users, 
  Building2, 
  MapPin, 
  HelpCircle, 
  LogOut,
  Menu,
  X,
  Home,
  Settings,
  ChevronDown,
  Check
} from "lucide-react";
import Link from "next/link";
import { authService } from '@/firebase/auth';
import { firestoreService } from '@/firebase/firestore';
import { CompoundProvider, useCompound } from '@/contexts/CompoundContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

function DashboardContent({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<{ uid: string; email: string | null; displayName: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [compounds, setCompounds] = useState<any[]>([]);
  const [compoundDropdownOpen, setCompoundDropdownOpen] = useState(false);
  const { selectedCompound, loading: compoundLoading } = useCompound();
  const router = useRouter();

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    if (!currentUser) {
      router.push('/login');
    } else {
      setUser(currentUser);
      loadCompounds(currentUser.uid);
      setLoading(false);
    }
  }, [router]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (compoundDropdownOpen) {
        const target = event.target as HTMLElement;
        if (!target.closest('[data-compound-dropdown]')) {
          setCompoundDropdownOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [compoundDropdownOpen]);

  const loadCompounds = async (userId: string) => {
    try {
      const userCompounds = await firestoreService.compounds.getByAdmin(userId);
      setCompounds(userCompounds);
    } catch (error) {
      console.error('Error loading compounds:', error);
    }
  };

  const refreshCompounds = async () => {
    if (user) {
      await loadCompounds(user.uid);
    }
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

  const handleSwitchCompound = (compoundId?: string) => {
    if (compoundId) {
      localStorage.setItem('selectedCompoundId', compoundId);
      router.push(`/dashboard?compound=${compoundId}`);
    } else {
      router.push('/compound-selection');
    }
  };

  if (loading || compoundLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">
            {loading ? 'Loading dashboard...' : 'Loading compound...'}
          </p>
        </div>
      </div>
    );
  }

  if (!selectedCompound) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Compound Selected</h2>
          <p className="text-muted-foreground mb-4">Please select a compound to continue</p>
          <Button onClick={handleSwitchCompound}>
            Select Compound
          </Button>
        </div>
      </div>
    );
  }

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Owners', href: '/dashboard/owners', icon: Users },
    { name: 'QR Codes', href: '/dashboard/qrcodes', icon: QrCode },
    { name: 'Entry Points', href: '/dashboard/points', icon: MapPin },
    { name: 'Help', href: '/dashboard/help', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0  left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:inset-auto lg:flex-shrink-0 lg:h-screen lg:overflow-visible ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="h-[98vh] lg:my-[1vh] lg:ml-4 lg:mr-2">
          <div className="h-full bg-white/95 dark:bg-slate-800/95 rounded-2xl shadow-2xl border border-slate-200/20 dark:border-slate-700/30 backdrop-blur-xl ring-1 ring-slate-200/10 dark:ring-slate-700/20">
        <div className="flex flex-col h-full">
          {/* Section 1: Logo and Main Links */}
          <div className="flex flex-col flex-1">
            {/* Logo Header */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center space-x-2">
                <QrCode className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
                  QR Compound
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="lg:hidden"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Compound Dropdown */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 relative" data-compound-dropdown>
              <Button
                variant="ghost"
                className="w-full justify-between p-0 h-auto text-left"
                onClick={() => setCompoundDropdownOpen(!compoundDropdownOpen)}
              >
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {selectedCompound.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {selectedCompound.address}
                  </p>
                </div>
                <ChevronDown className={`h-4 w-4 text-slate-600 dark:text-slate-400 flex-shrink-0 ml-2 transition-transform ${compoundDropdownOpen ? 'rotate-180' : ''}`} />
              </Button>
              
              {/* Custom Dropdown */}
              {compoundDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg z-[60] max-h-80 overflow-y-auto">
                  <div className="p-2">
                    <div className="px-2 py-1 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      Your Compounds
                    </div>
                    {compounds.map((compound) => (
                      <button
                        key={compound.id}
                        onClick={() => {
                          handleSwitchCompound(compound.id);
                          setCompoundDropdownOpen(false);
                        }}
                        className="w-full flex items-start space-x-2 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-sm truncate">
                              {compound.name}
                            </span>
                            {selectedCompound.id === compound.id && (
                              <Check className="h-4 w-4 text-blue-600 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-1">
                            {compound.address}
                          </p>
                        </div>
                      </button>
                    ))}
                    <div className="border-t border-slate-200 dark:border-slate-700 my-1"></div>
                    <button
                      onClick={async () => {
                        await refreshCompounds();
                        setCompoundDropdownOpen(false);
                        handleSwitchCompound();
                      }}
                      className="w-full flex items-center space-x-2 p-3 text-left hover:bg-slate-50 dark:hover:bg-slate-700 rounded-md transition-colors"
                    >
                      <Building2 className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <span className="text-sm">Manage Compounds</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Main Navigation */}
            <nav className="mt-6 px-3 flex-1 overflow-y-auto">
              <div className="space-y-1">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className="flex items-center px-3 py-2 text-sm font-medium rounded-lg text-slate-700 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-slate-100 dark:hover:bg-slate-700 transition-colors"
                    >
                      <Icon className="mr-3 h-5 w-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Section 2: Sign Out and Related Links */}
          <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-b-2xl overflow-hidden">
            {/* User Profile */}
            <div className="p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                    {user?.displayName || 'Admin'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              {/* Sign Out Action */}
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0 lg:ml-2">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white dark:bg-slate-800 shadow-sm border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                Dashboard
              </h1>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <CompoundProvider>
      <DashboardContent>{children}</DashboardContent>
    </CompoundProvider>
  );
}
