'use client';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QrCode, Users, Building2, Shield, ArrowRight, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Navigation */}
      <nav className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <QrCode className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-slate-900 dark:text-slate-100">
              QR Compound
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/login">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge variant="secondary" className="mb-4">
            Secure QR Code Management System
          </Badge>
          <h1 className="text-5xl font-bold text-slate-900 dark:text-slate-100 mb-6">
            Manage Your Compound with
            <span className="text-blue-600"> Smart QR Codes</span>
          </h1>
          <p className="text-xl text-slate-600 dark:text-slate-400 max-w-3xl mx-auto mb-8">
            Streamline property access, manage owners, and enhance security with our comprehensive 
            QR code management system designed for residential compounds.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Button variant="outline" size="lg" className="w-full sm:w-auto">
              Watch Demo
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          <Card className="text-center">
            <CardHeader>
              <QrCode className="h-12 w-12 text-blue-600 mx-auto mb-4" />
              <CardTitle>QR Code Generation</CardTitle>
              <CardDescription>
                Generate unique QR codes for each property owner with automatic management
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <CardTitle>Owner Management</CardTitle>
              <CardDescription>
                Add owners manually or import via CSV with bulk operations support
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Building2 className="h-12 w-12 text-purple-600 mx-auto mb-4" />
              <CardTitle>Compound Setup</CardTitle>
              <CardDescription>
                Create and manage multiple compounds with custom entry points
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <Shield className="h-12 w-12 text-orange-600 mx-auto mb-4" />
              <CardTitle>Secure Access</CardTitle>
              <CardDescription>
                Track access logs and maintain security with real-time monitoring
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Benefits Section */}
        <div className="grid lg:grid-cols-2 gap-12 items-center mb-16">
          <div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-6">
              Why Choose QR Compound?
            </h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Easy Setup & Management
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Get your compound up and running in minutes with our intuitive dashboard
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Bulk Operations
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Import multiple owners via CSV and generate QR codes automatically
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Real-time Monitoring
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Track access patterns and maintain security with detailed logs
                  </p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-6 w-6 text-green-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                    Mobile Friendly
                  </h3>
                  <p className="text-slate-600 dark:text-slate-400">
                    Access your dashboard from any device with our responsive design
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-8">
            <div className="text-center">
              <QrCode className="h-24 w-24 text-blue-600 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Ready to Get Started?
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Join hundreds of compounds already using our system
              </p>
              <Link href="/login">
                <Button size="lg" className="w-full">
                  Start Your Free Trial
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-12 text-white">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Transform Your Compound Management?
          </h2>
          <p className="text-xl mb-8 opacity-90">
            Join the future of secure property access management
          </p>
          <Link href="/login">
            <Button size="lg" variant="secondary">
              Get Started Today
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm dark:bg-slate-900/80">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <QrCode className="h-6 w-6 text-blue-600" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                QR Compound
              </span>
            </div>
            <div className="text-sm text-slate-600 dark:text-slate-400">
              © 2024 QR Compound. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
