"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation'; // Added import
import * as migrationService from './services/migrationService';
import StepIndicator from './components/StepIndicator';
import SourceSelector from './components/SourceSelector';
import ConfigForm from './components/ConfigForm';
import MappingInterface from './components/MappingInterface';
import PreviewTable from './components/PreviewTable';
import { datatablesApi } from '@/lib/api-endpoint';
import { authUtils } from '@/lib/auth-utils';
import { toast } from 'sonner';

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
    const router = useRouter(); // Initialize router
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
                    toast.success("Source validated successfully");
                    // Fetch preview immediately after success
                    console.log("Fetching preview data...");
                    const previewResult = await migrationService.previewSource(sourceType, newConfig);
                    console.log("Preview Result:", previewResult);

                    if (previewResult && (previewResult.rows || previewResult.data)) {
                        const rows = previewResult.rows || previewResult.data;
                        console.log("Row count:", rows.length);
                        setPreviewData(rows);
                        setStep(2); // Go to Preview Step
                        toast.success("Data preview loaded");
                    } else {
                        console.warn("No rows found in preview result");
                        toast.warning("No data found for preview");
                    }
                } else {
                    const msg = result.message || "Validation failed. Please check your credentials.";
                    setValidationError(msg);
                    toast.error(msg);
                }
            } catch (error) {
                setIsValidating(false);
                const msg = error.message || "Connection failed. Please check your configuration.";
                setValidationError(msg);
                toast.error(msg);
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

        const newColumns = [];

        // Identify new columns to create
        Object.entries(mappings).forEach(([sourceField, m]) => {
            if (m.destinationColumnId === 'new') {
                newColumns.push({
                    sourceField,
                    columnName: m.newColumnName,
                    dataType: m.newColumnType || 'string' // Capture selected dataType
                });
            }
        });

        const tokens = authUtils.getTokens();
        const user = tokens?.user;

        try {
            const columnMap = {}; // Map sourceField -> newColumnId

            // Create new columns first
            if (newColumns.length > 0) {
                toast.info(`Creating ${newColumns.length} new columns...`);
                for (const col of newColumns) {
                    const colPayload = [{
                        column_name: col.columnName,
                        data_type: col.dataType, // Use dynamic dataType
                        is_searchable: true,
                        properties: {},
                        optional_values: [],
                        required: false
                    }];

                    // Call the API to add column
                    const res = await datatablesApi.addColumn(selectedTableId, colPayload);

                    // Capture new ID from the correct nested path: data.data.created[0].column_id
                    const newId = res.data?.data?.created?.[0]?.column_id;

                    if (newId) {
                        columnMap[col.sourceField] = newId;
                        console.log(`Created column ${col.columnName}, ID: ${newId}`);
                    } else {
                        console.warn(`Created column ${col.columnName} but ID not found in response`, res);
                    }
                }
                toast.success("Columns created successfully");
            }

            const mappingPayload = {};
            // Log for debugging
            console.log("Migration Debug - Mappings:", mappings);
            console.log("Migration Debug - Column Map:", columnMap);

            Object.entries(mappings).forEach(([sourceField, m]) => {
                // If destination is 'new', use the ID we just created
                // If destination is existing ID, use that
                if (m.destinationColumnId === 'new') {
                    const createdId = columnMap[sourceField];
                    if (createdId) {
                        mappingPayload[sourceField] = createdId;
                    } else {
                        console.warn(`Could not find created ID for new column: ${m.newColumnName} (source: ${sourceField})`);
                    }
                } else if (m.destinationColumnId) {
                    mappingPayload[sourceField] = m.destinationColumnId;
                }
            });

            console.log("Migration Debug - Final Mapping Payload:", mappingPayload);

            const payload = {
                sourceType,
                sourceConfig: config,
                organizationId: user?.organization_id,
                tableId: selectedTableId,
                createdBy: user?.user_id,
                g_id: user?.g_ids?.[0],
                mapping: mappingPayload
            };

            // Double check keys against user object
            console.log("Migration Debug - User Object:", user);
            console.log("Migration Debug - Full Payload:", payload);

            const result = await migrationService.startMigration(payload);
            setIsMigrating(false);
            setMigrationResult(result);
            setStep(4);
            toast.success("Migration started successfully!");

        } catch (error) {
            console.error("Migration/Column Creation Error:", error);
            setIsMigrating(false);
            const msg = error.response?.data?.message || error.message || "Migration failed. Please try again.";
            setValidationError(msg);
            toast.error(msg);
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

    return (
        <div className="min-h-screen bg-muted/30 text-slate-900 font-sans pb-20">
            {/* Navbar - Simplified and Cleaner */}
            <header className="sticky top-0 z-40 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center border border-primary/20">
                            <RefreshCcw size={20} className="text-primary" />
                        </div>
                        <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            DataFlow
                        </span>
                    </div>
                    {step > 1 && step < 4 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setStep(s => s - 1)}
                            className="gap-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        >
                            <ArrowLeft size={16} /> Back
                        </Button>
                    )}
                </div>
            </header>

            <main className="container mx-auto px-6 py-12">
                {/* Header Section */}
                {/* <div className="mb-12 text-center max-w-2xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900">
                        {step === 1 && 'Import Your Data'}
                        {step === 2 && 'Preview Data'}
                        {step === 3 && 'Map Columns'}
                        {step === 4 && 'Migration Status'}
                    </h1>
                    <p className="text-muted-foreground text-lg md:text-xl leading-relaxed">
                        {step === 1 && 'Connect your existing data sources and prepare them for migration in just a few clicks.'}
                        {step === 2 && 'Review the data fetched from your source to ensure everything looks correct.'}
                        {step === 3 && 'Intelligently map your source fields to the destination table columns.'}
                        {step === 4 && 'Sit back and relax while we handle the data transfer for you.'}
                    </p>
                </div> */}

                <div className="max-w-4xl mx-auto mb-12">
                    <StepIndicator currentStep={step} />
                </div>

                <div className="max-w-10xl mx-auto">
                    {/* STEP 1: SOURCE SELECTION */}
                    {step === 1 && (
                        <Card className="border-none shadow-xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-500">
                            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
                                <CardTitle className="text-2xl">Choose Data Source</CardTitle>
                                <CardDescription>
                                    Select the platform or file type you want to migrate data from
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="p-8">
                                <SourceSelector selected={sourceType} onSelect={handleSourceSelect} />
                            </CardContent>
                        </Card>
                    )}

                    {/* STEP 2: PREVIEW */}
                    {step === 2 && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="flex items-center gap-3 text-2xl">
                                                <div className="p-2 bg-primary/10 rounded-lg">
                                                    <Table className="h-5 w-5 text-primary" />
                                                </div>
                                                Data Source Preview
                                            </CardTitle>
                                            <CardDescription className="mt-1">
                                                Showing the first few rows from your selected source
                                            </CardDescription>
                                        </div>
                                        <Badge variant="outline" className="px-3 py-1 bg-white">
                                            {previewData.length} Rows Fetched
                                        </Badge>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="p-6">
                                        <PreviewTable data={previewData} />
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-slate-50/50 border-t border-slate-100 px-8 py-6 flex justify-between">
                                    <Button
                                        variant="outline"
                                        onClick={() => setIsConfigDialogOpen(true)}
                                        className="border-slate-200 hover:bg-white hover:border-slate-300"
                                    >
                                        Edit Configuration
                                    </Button>
                                    <Button
                                        onClick={handleStartMapping}
                                        size="lg"
                                        className="gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
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
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <Card className="border-none shadow-xl rounded-2xl overflow-hidden">
                                <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-6">
                                    <CardTitle className="text-2xl">Field Mapping</CardTitle>
                                    <CardDescription>
                                        Connect your source data fields to the destination columns
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-8">
                                    <MappingInterface
                                        previewData={previewData}
                                        mappings={mappings}
                                        selectedTableId={selectedTableId}
                                        onTableSelect={setSelectedTableId}
                                        onMappingChange={handleMappingChange}
                                    />
                                </CardContent>
                                {selectedTableId && (
                                    <CardFooter className="bg-slate-50/50 border-t border-slate-100 px-8 py-6 flex flex-col sm:flex-row gap-4 justify-between items-center sticky bottom-0 z-10">
                                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground bg-white px-3 py-1.5 rounded-full border shadow-sm">
                                            <CheckCircle2 size={16} className="text-green-500" />
                                            <span>
                                                {Object.keys(mappings).filter(k => mappings[k]?.destinationColumnId).length} fields mapped
                                            </span>
                                        </div>
                                        <Button
                                            onClick={startMigration}
                                            disabled={isMigrating}
                                            size="lg"
                                            className="w-full sm:w-auto gap-2 shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all font-semibold"
                                        >
                                            {isMigrating ? (
                                                <>
                                                    <Progress className="w-4 h-4 mr-2" />
                                                    Initializing...
                                                </>
                                            ) : (
                                                <>
                                                    Start Migration
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
                        <div className="animate-in zoom-in-95 duration-500 max-w-2xl mx-auto">
                            <Card className="text-center border-none shadow-2xl rounded-3xl overflow-hidden ring-1 ring-slate-900/5">
                                <CardHeader className="space-y-6 pt-12 pb-2">
                                    <div className="mx-auto w-24 h-24 rounded-full bg-green-50 flex items-center justify-center ring-8 ring-green-50/50">
                                        <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center shadow-lg shadow-green-500/30">
                                            <CheckCircle2 size={40} className="text-white" />
                                        </div>
                                    </div>
                                    <div>
                                        <CardTitle className="text-3xl font-bold text-slate-900">Migration Active!</CardTitle>
                                        <CardDescription className="text-lg mt-2 max-w-md mx-auto">
                                            Your migration job has been successfully queued and is now processing in the background.
                                        </CardDescription>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-8 pb-8">
                                    {migrationResult?.jobId && (
                                        <div className="flex flex-col items-center justify-center gap-2 p-6 bg-slate-50 rounded-2xl border border-slate-100 mx-auto max-w-sm">
                                            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Job Reference ID</span>
                                            <code className="font-mono text-xl font-bold text-slate-900 tracking-wide bg-white px-4 py-2 rounded-lg border shadow-sm">
                                                {migrationResult.jobId}
                                            </code>
                                        </div>
                                    )}
                                </CardContent>
                                <CardFooter className="flex flex-col sm:flex-row justify-center gap-4 bg-slate-50/50 p-8 border-t border-slate-100">
                                    <Button
                                        variant="outline"
                                        size="lg"
                                        onClick={reset}
                                        className="gap-2 w-full sm:w-auto border-slate-200 hover:bg-white hover:border-slate-300"
                                    >
                                        <RefreshCcw className="h-4 w-4" />
                                        Migrate Another
                                    </Button>
                                    <Button
                                        size="lg"
                                        className="gap-2 w-full sm:w-auto shadow-lg shadow-primary/20 hover:shadow-primary/30 font-semibold"
                                        onClick={() => router.push(`/leadPage?tableId=${selectedTableId}`)}
                                    >
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
                <DialogContent className="sm:max-w-[500px] border-none shadow-2xl rounded-2xl">
                    <DialogHeader className="space-y-3 pb-4 border-b">
                        <DialogTitle className="text-2xl font-bold">
                            Configure {sourceType ? sourceType.toUpperCase() : 'Source'}
                        </DialogTitle>
                        <DialogDescription className="text-base">
                            Enter the connection details to establish a secure link with your {sourceType} source.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="pt-4">
                        <ConfigForm
                            sourceType={sourceType}
                            initialConfig={config}
                            onSubmit={handleConfigSubmit}
                            isLoading={isValidating}
                            onCancel={() => setIsConfigDialogOpen(false)}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default App;