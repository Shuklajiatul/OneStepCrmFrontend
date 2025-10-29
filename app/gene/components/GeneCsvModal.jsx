'use client';

import { useState } from 'react';
import { Upload, Download, FileText, AlertCircle, Loader2, FileCheck, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function GeneCsvModal({ isOpen, onClose, onSubmit }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast.error('Please upload a CSV file');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('csvfile', selectedFile);
      formData.append('tableName', 'genes');
     
      await onSubmit(formData);
      
      toast.success('Genes imported successfully!');
      setSelectedFile(null);
      setFileName('');
      onClose();
    } catch (error) {
      console.error('CSV submission error:', error);
      toast.error('Failed to import genes');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please upload a valid CSV file');
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
        toast.error('Please upload a valid CSV file');
        return;
      }
      setSelectedFile(file);
      setFileName(file.name);
    }
  };

  const downloadSampleCSV = () => {
    const sampleCSV = `g_name,hierarchy_level,is_active
test,"{1:india, 2:maharashtr, 3:pune}",true
marketing-gene,"{1:department, 2:team, 3:subteam}",true
sales-gene,"{1:territory, 2:area}",true`;
    
    const blob = new Blob([sampleCSV], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = 'sample_genes_template.csv';
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    toast.success('Template downloaded');
  };

  const clearForm = () => {
    setSelectedFile(null);
    setFileName('');
    const fileInput = document.querySelector('input[type="file"]');
    if (fileInput) fileInput.value = '';
  };

  const handleClose = () => {
    if (!loading) {
      clearForm();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5" />
            Import Genes
          </DialogTitle>
          <DialogDescription>
            Upload a CSV file to import genes in bulk
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Sample CSV Download */}
          <Alert className="bg-blue-50/50 border-blue-200">
            <FileText className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-sm font-medium text-blue-800">Download Template</AlertTitle>
            <AlertDescription className="text-xs text-blue-600 space-y-2 mt-1">
              <p>Get the sample CSV file with proper format</p>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadSampleCSV}
                className="w-full sm:w-auto border-blue-600 text-blue-700 hover:bg-blue-50"
              >
                <Download className="mr-2 h-3.5 w-3.5" />
                Download CSV Template
              </Button>
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* File Upload Section */}
            <div className="space-y-2">
              <Label htmlFor="csv-file" className="text-sm font-medium">Upload CSV File</Label>
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg p-8 transition-colors min-h-[140px] flex items-center justify-center",
                  dragActive
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50 bg-muted/30",
                  fileName && "border-green-500 bg-green-50/50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <input
                  id="csv-file"
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={loading}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center text-center space-y-2">
                  {fileName ? (
                    <>
                      <FileCheck className="h-10 w-10 text-green-600" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-foreground">
                          {fileName}
                        </p>
                        <Badge variant="secondary" className="text-xs">
                          File Selected
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-muted-foreground" />
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-primary">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CSV file only
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CSV Format Instructions */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Format Requirements</AlertTitle>
              <AlertDescription>
                <ul className="text-xs space-y-1.5 mt-2">
                  <li className="flex items-start gap-2">
                    <span className="text-muted-foreground">•</span>
                    <span>
                      <strong>Required columns:</strong>
                    </span>
                  </li>
                  <li className="flex items-start gap-2 ml-4">
                    <span className="text-muted-foreground">•</span>
                    <span>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                        g_name
                      </code>
                      {' '}- Gene name
                    </span>
                  </li>
                  <li className="flex items-start gap-2 ml-4">
                    <span className="text-muted-foreground">•</span>
                    <span>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                        hierarchy_level
                      </code>
                      {' '}- Format: {'"{"'}1:level1, 2:level2, 3:level3{'"}"'}
                    </span>
                  </li>
                  <li className="flex items-start gap-2 ml-4">
                    <span className="text-muted-foreground">•</span>
                    <span>
                      <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">
                        is_active
                      </code>
                      {' '}- true/false
                    </span>
                  </li>
                  <li className="flex items-start gap-2 mt-2">
                    <span className="text-muted-foreground">•</span>
                    <span>First row must be header row with column names</span>
                  </li>
                </ul>
              </AlertDescription>
            </Alert>

            {fileName && (
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearForm}
                  disabled={loading}
                  className="flex-1"
                  size="sm"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear
                </Button>
              </div>
            )}
          </form>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !selectedFile}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Import Genes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

