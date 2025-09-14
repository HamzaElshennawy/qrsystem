'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  HelpCircle, 
  BookOpen, 
  MessageCircle, 
  Mail, 
  Phone,
  Video,
  Download,
  ExternalLink,
  ChevronRight,
  QrCode,
  Users,
  Building2,
  MapPin
} from "lucide-react";

export default function HelpPage() {
  const quickStartSteps = [
    {
      step: 1,
      title: "Create Your Compound",
      description: "Set up your first compound with basic information",
      icon: Building2,
    },
    {
      step: 2,
      title: "Add Property Owners",
      description: "Manually add owners or import via CSV file",
      icon: Users,
    },
    {
      step: 3,
      title: "Generate QR Codes",
      description: "Create unique QR codes for each property owner",
      icon: QrCode,
    },
    {
      step: 4,
      title: "Setup Entry Points",
      description: "Configure access points and security settings",
      icon: MapPin,
    },
  ];

  const faqItems = [
    {
      question: "How do I import multiple owners at once?",
      answer: "Use the CSV import feature in the Owners section. Download the template CSV file, fill it with your owner data, and upload it. The system will automatically create QR codes for all imported owners."
    },
    {
      question: "Can I customize QR code designs?",
      answer: "Currently, QR codes are generated with standard black and white colors. Customization options for colors and logos are planned for future updates."
    },
    {
      question: "How do entry points work?",
      answer: "Entry points define where QR codes can be scanned for access. You can configure whether scanning is required, which owners have access, and other security settings."
    },
    {
      question: "Can I track QR code usage?",
      answer: "Yes! The system tracks scan counts and timestamps for each QR code. You can view this data in the QR Codes section of your dashboard."
    },
    {
      question: "What happens if a QR code is lost?",
      answer: "You can regenerate QR codes for any owner. The old QR code will become inactive, and a new one will be generated with updated security information."
    },
    {
      question: "How do I manage multiple compounds?",
      answer: "Each compound is managed separately. You can switch between compounds using the compound selector, and each has its own owners, QR codes, and entry points."
    },
  ];

  const resources = [
    {
      title: "User Manual",
      description: "Complete guide to using QR Compound",
      icon: BookOpen,
      action: "Download PDF",
      type: "download"
    },
    {
      title: "Video Tutorials",
      description: "Step-by-step video guides",
      icon: Video,
      action: "Watch Videos",
      type: "link"
    },
    {
      title: "CSV Template",
      description: "Download template for bulk owner import",
      icon: Download,
      action: "Download Template",
      type: "download"
    },
    {
      title: "API Documentation",
      description: "Developer resources and API reference",
      icon: ExternalLink,
      action: "View Docs",
      type: "link"
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <HelpCircle className="h-12 w-12 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">
          Help & Support
        </h1>
        <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
          Get the most out of QR Compound with our comprehensive help resources and support options.
        </p>
      </div>

      {/* Quick Start Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ChevronRight className="h-5 w-5" />
            Quick Start Guide
          </CardTitle>
          <CardDescription>
            Follow these steps to get your compound management system up and running
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickStartSteps.map((step) => {
              const Icon = step.icon;
              return (
                <div key={step.step} className="text-center p-4 border rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Icon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-3 text-sm font-bold">
                    {step.step}
                  </div>
                  <h3 className="font-semibold mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <MessageCircle className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <CardTitle className="text-lg">Live Chat</CardTitle>
            <CardDescription>Get instant help from our support team</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button className="w-full">Start Chat</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <Mail className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <CardTitle className="text-lg">Email Support</CardTitle>
            <CardDescription>Send us a detailed message</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full">Send Email</Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardHeader className="text-center">
            <Phone className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <CardTitle className="text-lg">Phone Support</CardTitle>
            <CardDescription>Call us for urgent issues</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" className="w-full">Call Now</Button>
          </CardContent>
        </Card>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>
            Find answers to common questions about using QR Compound
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2 text-slate-900 dark:text-slate-100">
                  {item.question}
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Helpful Resources</CardTitle>
          <CardDescription>
            Download guides, templates, and access additional documentation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resources.map((resource, index) => {
              const Icon = resource.icon;
              return (
                <div key={index} className="flex items-center p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center mr-4">
                    <Icon className="h-6 w-6 text-slate-600 dark:text-slate-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {resource.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      {resource.description}
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    {resource.action}
                  </Button>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Status & Updates */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Current system status and recent updates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                <span className="font-medium">All systems operational</span>
              </div>
              <Badge variant="default">Online</Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <span className="font-medium">Last updated: December 2024</span>
                <p className="text-sm text-muted-foreground">
                  Added bulk QR code generation and improved CSV import
                </p>
              </div>
              <Badge variant="secondary">v1.2.0</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <CardTitle>Contact Information</CardTitle>
          <CardDescription>
            Reach out to us for any questions or support needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold mb-3">Business Hours</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Monday - Friday: 9:00 AM - 6:00 PM</p>
                <p>Saturday: 10:00 AM - 4:00 PM</p>
                <p>Sunday: Closed</p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold mb-3">Contact Details</h3>
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Email: support@qrcompound.com</p>
                <p>Phone: +1 (555) 123-4567</p>
                <p>Address: 123 Tech Street, Digital City</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
