"use client"

import { useState, useEffect } from 'react';
import * as migrationService from './services/migrationService';
import StepIndicator from './components/StepIndicator';
import SourceSelector from './components/SourceSelector';
import ConfigForm from './components/ConfigForm';
import MappingInterface from './components/MappingInterface';
import PreviewTable from './components/PreviewTable';

// Import ShadCN components
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';

import { ArrowLeft, Rocket, RefreshCcw, CheckCircle2, Home, Table } from 'lucide-react';

const App = () => {
  const [step, setStep] = useState(1);
  const [sourceType, setSourceType] = useState(null);
  const [config, setConfig] = useState({});
  
  // Dialog State
  const [isConfigDialogOpen, setIsConfigDialogOpen] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  
  // Data State
  const [previewData, setPreviewData] = useState([]);
  const [selectedTableId, setSelectedTableId] = useState(null);
  const [mappings, setMappings] = useState({});
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrationResult, setMigrationResult] = useState(null);
  const [validationError, setValidationError] = useState(null);

  // Handlers
  const handleSourceSelect = (type) => {
    setSourceType(type);
    setValidationError(null);
    
    // Preset some config for demo ease
    const initialConf = {};
    if (type === 'mongodb') {
        initialConf.uri = 'mongodb://nandu:Nandu@1234@cluster0.vj0kwap.mongodb.net/?appName=Cluster0';
        initialConf.database = 'testdb';
    }
    if (type === 'csv') {
        initialConf.filePath = 'src/public/MOCK_DATA.csv';
    }
    setConfig(initialConf);
    setIsConfigDialogOpen(true);
  };

  const handleConfigSubmit = async (newConfig) => {
    setConfig(newConfig);
    setIsValidating(true);
    setValidationError(null);
    
    if (sourceType) {
        try {
            const result = await migrationService.validateSource(sourceType, newConfig);
            setIsValidating(false);
            
            if (result.success) {
                setIsConfigDialogOpen(false);
                // Fetch preview immediately after success
                const previewResult = await migrationService.previewSource(sourceType, newConfig);
                if (previewResult.data) {
                    setPreviewData(previewResult.data);
                    setStep(2); // Go to Preview Step
                }
            } else {
                setValidationError(result.message || "Validation failed. Please check your credentials.");
            }
        } catch (error) {
            setIsValidating(false);
            setValidationError(error.message || "Connection failed. Please check your configuration.");
        }
    }
  };

  const handleStartMapping = () => {
      setStep(3);
  };

  const handleMappingChange = (sourceField, mapping) => {
      setMappings(prev => ({ ...prev, [sourceField]: mapping }));
  };

  const startMigration = async () => {
      if (!selectedTableId || !sourceType) return;
      
      setIsMigrating(true);
      setValidationError(null);

      const mappingPayload = {};
      Object.values(mappings).forEach((m) => {
         mappingPayload[m.sourceField] = m.destinationColumnId === 'new' 
            ? `new_col_${m.newColumnName}` 
            : m.destinationColumnId;
      });

      const payload = {
          sourceType,
          sourceConfig: config,
          organizationId: "c8c72c21-7b5c-435a-912a-803105e7ecc9", 
          tableId: selectedTableId,
          createdBy: "8e112d92-5442-4363-a548-093fd6537e87", 
          g_id: "0cbe4853-4f33-48ef-94f0-e41fff07f5d1", 
          mapping: mappingPayload
      };

      try {
          const result = await migrationService.startMigration(payload);
          setIsMigrating(false);
          setMigrationResult(result);
          setStep(4);
      } catch (error) {
          setIsMigrating(false);
          setValidationError(error.message || "Migration failed. Please try again.");
      }
  };

  const reset = () => {
      setStep(1);
      setSourceType(null);
      setConfig({});
      setPreviewData([]);
      setMappings({});
      setMigrationResult(null);
      setSelectedTableId(null);
      setValidationError(null);
  };

  // Add a useEffect to handle potential routing issues
  useEffect(() => {
    // This helps prevent 404 errors by ensuring we're at the root
    if (window.location.pathname !== '/') {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white text-slate-900 font-sans">
        {/* Navbar */}
        <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <RefreshCcw size={18} className="text-primary-foreground" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">DataFlow</span>
                </div>
                {step > 1 && step < 4 && (
                    <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setStep(s => s - 1)}
                        className="gap-1"
                    >
                        <ArrowLeft size={16} /> Back
                    </Button>
                )}
            </div>
        </header>

        <main className="container mx-auto px-6 py-10">
            {/* Header */}
            <div className="mb-10 text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">
                    {step === 1 && 'Select Data Source'}
                    {step === 2 && 'Preview Data'}
                    {step === 3 && 'Map Columns'}
                    {step === 4 && 'Migration Status'}
                </h1>
                <p className="text-muted-foreground text-lg">
                    {step === 1 && 'Choose where you want to import data from.'}
                    {step === 2 && 'Review the data fetched from your source.'}
                    {step === 3 && 'Match your source fields to the destination table columns.'}
                    {step === 4 && 'Migration has been queued successfully.'}
                </p>
            </div>

            <StepIndicator currentStep={step} />

            {/* Error Alert */}
            {validationError && (
                <Alert variant="destructive" className="mb-6">
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{validationError}</AlertDescription>
                </Alert>
            )}

            <div className="mt-8 max-w-4xl mx-auto">
                {/* STEP 1: SOURCE SELECTION */}
                {step === 1 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Choose Your Source</CardTitle>
                            <CardDescription>
                                Select the type of data source you want to migrate from
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <SourceSelector selected={sourceType} onSelect={handleSourceSelect} />
                        </CardContent>
                    </Card>
                )}

                {/* STEP 2: PREVIEW */}
                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in-50">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Table className="h-5 w-5" />
                                    Data Preview
                                </CardTitle>
                                <CardDescription>
                                    Preview of the first few rows from your source
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <PreviewTable data={previewData} />
                            </CardContent>
                            <CardFooter className="flex justify-between border-t px-6 py-4">
                                <Button 
                                    variant="outline" 
                                    onClick={() => setIsConfigDialogOpen(true)}
                                >
                                    Edit Configuration
                                </Button>
                                <Button
                                    onClick={handleStartMapping}
                                    className="gap-2"
                                >
                                    Continue to Mapping
                                    <Rocket className="h-4 w-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}

                {/* STEP 3: MAPPING */}
                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in-50">
                        <Card>
                            <CardHeader>
                                <CardTitle>Column Mapping</CardTitle>
                                <CardDescription>
                                    Map your source fields to destination table columns
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <MappingInterface 
                                    previewData={previewData}
                                    mappings={mappings}
                                    selectedTableId={selectedTableId}
                                    onTableSelect={setSelectedTableId}
                                    onMappingChange={handleMappingChange}
                                />
                            </CardContent>
                            {selectedTableId && (
                                <CardFooter className="flex justify-between border-t px-6 py-4">
                                    <div className="text-sm text-muted-foreground">
                                        {Object.keys(mappings).filter(k => mappings[k]?.destinationColumnId).length} of {previewData.length > 0 ? Object.keys(previewData[0]).length : 0} fields mapped
                                    </div>
                                    <Button
                                        onClick={startMigration}
                                        disabled={isMigrating}
                                        className="gap-2"
                                    >
                                        {isMigrating ? (
                                            <>
                                                <Progress className="w-4 h-4" />
                                                Starting Migration...
                                            </>
                                        ) : (
                                            <>
                                                Start Migration Job
                                                <Rocket className="h-4 w-4" />
                                            </>
                                        )}
                                    </Button>
                                </CardFooter>
                            )}
                        </Card>
                    </div>
                )}

                {/* STEP 4: SUCCESS */}
                {step === 4 && (
                    <div className="animate-in zoom-in-95">
                        <Card className="text-center">
                            <CardHeader className="space-y-4">
                                <div className="mx-auto w-20 h-20 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                    <CheckCircle2 size={40} />
                                </div>
                                <CardTitle className="text-2xl">Migration Queued Successfully!</CardTitle>
                                <CardDescription>
                                    Your data migration job has been queued and will start processing shortly.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {migrationResult?.jobId && (
                                    <div className="inline-flex items-center gap-2 bg-muted px-4 py-2 rounded-lg">
                                        <Badge variant="secondary">Job ID</Badge>
                                        <code className="font-mono text-sm">
                                            {migrationResult.jobId}
                                        </code>
                                    </div>
                                )}
                                <Alert>
                                    <AlertTitle>Next Steps</AlertTitle>
                                    <AlertDescription>
                                        You can track the progress of this migration in the Jobs section.
                                        An email will be sent upon completion.
                                    </AlertDescription>
                                </Alert>
                            </CardContent>
                            <CardFooter className="flex justify-center gap-4">
                                <Button 
                                    variant="outline"
                                    onClick={reset}
                                    className="gap-2"
                                >
                                    <RefreshCcw className="h-4 w-4" />
                                    Migrate Another Source
                                </Button>
                                <Button className="gap-2">
                                    <Home className="h-4 w-4" />
                                    Go to Dashboard
                                </Button>
                            </CardFooter>
                        </Card>
                    </div>
                )}
            </div>
        </main>

        {/* Configuration Dialog */}
        <Dialog open={isConfigDialogOpen} onOpenChange={setIsConfigDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>
                        Configure {sourceType ? sourceType.toUpperCase() : 'Source'}
                    </DialogTitle>
                    <DialogDescription>
                        Enter the connection details for your {sourceType} source
                    </DialogDescription>
                </DialogHeader>
                <ConfigForm 
                    sourceType={sourceType}
                    initialConfig={config}
                    onSubmit={handleConfigSubmit}
                    isLoading={isValidating}
                    onCancel={() => setIsConfigDialogOpen(false)}
                />
            </DialogContent>
        </Dialog>
    </div>
  );
};

export default App;