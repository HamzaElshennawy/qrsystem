'use client';

import { useState } from 'react';
import { Button } from './button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './card';
import { Alert, AlertDescription } from './alert';
import { Upload, FileText, CheckCircle, XCircle } from 'lucide-react';

interface CSVUploadProps {
  onUpload: (file: File) => Promise<void>;
  loading?: boolean;
  error?: string;
  success?: string;
  accept?: string;
  maxSize?: number; // in MB
}

export function CSVUpload({ 
  onUpload, 
  loading = false, 
  error, 
  success,
  accept = '.csv',
  maxSize = 10 
}: CSVUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFile(files[0]);
    }
  };

  const handleFile = (selectedFile: File) => {
    // Validate file type
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      return;
    }

    // Validate file size
    if (selectedFile.size > maxSize * 1024 * 1024) {
      return;
    }

    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (file) {
      await onUpload(file);
    }
  };

  const removeFile = () => {
    setFile(null);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            CSV File Upload
          </CardTitle>
          <CardDescription>
            Upload a CSV file with owner information. Maximum file size: {maxSize}MB
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950' 
                : 'border-gray-300 dark:border-gray-600'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            {file ? (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <CheckCircle className="h-8 w-8" />
                  <span className="font-medium">File Ready</span>
                </div>
                <div className="flex items-center justify-center gap-4">
                  <FileText className="h-6 w-6 text-muted-foreground" />
                  <span className="font-medium">{file.name}</span>
                  <span className="text-sm text-muted-foreground">
                    ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={removeFile}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
                <Button onClick={handleUpload} disabled={loading}>
                  {loading ? 'Uploading...' : 'Upload CSV'}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <p className="text-lg font-medium">
                    Drag and drop your CSV file here
                  </p>
                  <p className="text-sm text-muted-foreground">
                    or click to browse files
                  </p>
                </div>
                <input
                  type="file"
                  accept={accept}
                  onChange={handleFileInput}
                  className="hidden"
                  id="csv-upload"
                />
                <label htmlFor="csv-upload">
                  <Button variant="outline" asChild>
                    <span>Choose File</span>
                  </Button>
                </label>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      {/* CSV Template Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">CSV Format Requirements</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="space-y-2">
            <p><strong>Required columns:</strong> firstName, lastName, email</p>
            <p><strong>Optional columns:</strong> phone, propertyUnit</p>
            <p><strong>Example:</strong></p>
            <pre className="bg-muted p-2 rounded text-xs overflow-x-auto">
{`firstName,lastName,email,phone,propertyUnit
John,Doe,john@example.com,+1234567890,Unit A1
Jane,Smith,jane@example.com,+1234567891,Unit B2`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
