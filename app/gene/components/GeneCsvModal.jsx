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
     
      await onSubmit(formData);
      
            setSelectedFile(null);
      setFileName('');
      onClose();
    } catch (error) {
      console.error('CSV submission error:', error);
      // Error toast is handled by parent component
      throw error; // Re-throw to let parent handle it
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
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Upload className="h-5 w-5 text-primary" />
            Import Genes from CSV
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground pt-1">
            Upload a CSV file to import genes in bulk. Make sure your file follows the required format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Sample CSV Download */}
          <Alert className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <AlertTitle className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  Download Template
                </AlertTitle>
                <AlertDescription className="text-xs text-blue-700 dark:text-blue-300">
                  <p className="mb-2">Get the sample CSV file with proper format</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadSampleCSV}
                    className="w-full sm:w-auto border-blue-600 dark:border-blue-500 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download CSV Template
                  </Button>
                </AlertDescription>
              </div>
            </div>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* File Upload Section */}
            <div className="space-y-3">
              <Label htmlFor="csv-file" className="text-sm font-semibold text-foreground">
                Upload CSV File
              </Label>
              <div
                className={cn(
                  "relative border-2 border-dashed rounded-lg transition-all duration-200 min-h-[160px] flex items-center justify-center group",
                  dragActive
                    ? "border-primary bg-primary/10 dark:bg-primary/20"
                    : fileName 
                      ? "border-green-500 dark:border-green-600 bg-green-50/50 dark:bg-green-950/20" 
                      : "border-muted-foreground/30 hover:border-primary/60 bg-muted/20 hover:bg-muted/40",
                  loading && "opacity-60 cursor-not-allowed"
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
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                />
                <div className="flex flex-col items-center justify-center text-center space-y-3 px-4 py-6">
                  {fileName ? (
                    <>
                      <div className="relative">
                        <FileCheck className="h-12 w-12 text-green-600 dark:text-green-500" />
                        <div className="absolute -top-1 -right-1 h-5 w-5 bg-green-600 dark:bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      </div>
                      <div className="space-y-2 max-w-full">
                        <p className="text-sm font-semibold text-foreground truncate px-2">
                          {fileName}
                        </p>
                        <Badge variant="secondary" className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-300 dark:border-green-700">
                          File Selected
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="rounded-full bg-muted p-4 group-hover:bg-primary/10 transition-colors">
                        <Upload className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-semibold text-primary">Click to upload</span> or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground">
                          CSV file only (Max size: 10MB)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* CSV Format Instructions */}
            <Alert className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <AlertTitle className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                    Format Requirements
                  </AlertTitle>
                  <AlertDescription className="text-xs text-amber-800 dark:text-amber-200">
                    <ul className="space-y-2 mt-2">
                      <li className="flex items-start gap-2">
                        <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                        <span>
                          <strong className="font-semibold">Required columns:</strong>
                        </span>
                      </li>
                      <li className="flex items-start gap-2 ml-5">
                        <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                        <span>
                          <code className="bg-muted dark:bg-muted/50 px-2 py-1 rounded text-xs font-mono border border-amber-200 dark:border-amber-800">
                            g_name
                          </code>
                          {' '}- Gene name
                        </span>
                      </li>
                      <li className="flex items-start gap-2 ml-5">
                        <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                        <span>
                          <code className="bg-muted dark:bg-muted/50 px-2 py-1 rounded text-xs font-mono border border-amber-200 dark:border-amber-800">
                            hierarchy_level
                          </code>
                          {' '}- Format: {'"{"'}1:level1, 2:level2, 3:level3{'"}"'}
                        </span>
                      </li>
                      <li className="flex items-start gap-2 ml-5">
                        <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                        <span>
                          <code className="bg-muted dark:bg-muted/50 px-2 py-1 rounded text-xs font-mono border border-amber-200 dark:border-amber-800">
                            is_active
                          </code>
                          {' '}- true/false
                        </span>
                      </li>
                      <li className="flex items-start gap-2 mt-3">
                        <span className="text-amber-600 dark:text-amber-400 mt-1">•</span>
                        <span className="font-medium">First row must be header row with column names</span>
                      </li>
                    </ul>
                  </AlertDescription>
                </div>
              </div>
            </Alert>

            {fileName && (
              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearForm}
                  disabled={loading}
                  className="flex-1 sm:flex-none"
                  size="sm"
                >
                  <X className="mr-2 h-4 w-4" />
                  Clear File
                </Button>
              </div>
            )}
          </form>
        </div>

        <DialogFooter className="gap-2 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={loading || !selectedFile}
            className="min-w-[140px]"
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

