"use client"

import React, { useState, useRef } from 'react';
import { Loader2, Upload, FileSettings, Link } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const ConfigForm = ({ sourceType, initialConfig, onSubmit, isLoading, onCancel }) => {
  const [config, setConfig] = useState(initialConfig);

  const handleChange = (e) => {
    setConfig({ ...config, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(config);
  };

  const renderFields = () => {
    switch (sourceType) {
      case 'mongodb':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="uri">Connection String (URI)</Label>
              <Input
                id="uri"
                name="uri"
                value={config.uri || ''}
                onChange={handleChange}
                placeholder="mongodb+srv://..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="database">Database Name</Label>
              <Input
                id="database"
                name="database"
                value={config.database || ''}
                onChange={handleChange}
                placeholder="my_database"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="collection">Collection Name</Label>
              <Input
                id="collection"
                name="collection"
                value={config.collection || ''}
                onChange={handleChange}
                placeholder="my_collection"
                required
              />
            </div>
          </div >
        );
      case 'csv':
        const isUploadMode = config.csvMode === 'upload';
        return (
          <div className="space-y-4">
            <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
              <button
                type="button"
                onClick={() => setConfig({ ...config, csvMode: 'path' })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${!isUploadMode ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Link size={14} />
                File Path
              </button>
              <button
                type="button"
                onClick={() => setConfig({ ...config, csvMode: 'upload' })}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${isUploadMode ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <Upload size={14} />
                Upload File
              </button>
            </div>

            {!isUploadMode ? (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="filePath">File Path</Label>
                <Input
                  id="filePath"
                  name="filePath"
                  value=''
                  onChange={handleChange}
                  placeholder="Enter your file path here e.g src/public/DATA.csv"
                  required
                />
              </div>
            ) : (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                <Label htmlFor="file">Upload CSV File</Label>
                <div className={`
                  relative border-2 border-dashed rounded-lg p-6 transition-all duration-200
                  ${config.file ? 'border-green-500 bg-green-50' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}
                `}>
                  <input
                    id="file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => {
                      const file = e.target.files[0];
                      if (file) {
                        setConfig({ ...config, file, fileName: file.name });
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className="flex flex-col items-center justify-center text-center">
                    <Upload className={`h-8 w-8 mb-2 ${config.file ? 'text-green-500' : 'text-slate-400'}`} />
                    <p className="text-sm font-medium text-slate-700">
                      {config.file ? config.fileName : 'Click to upload or drag and drop'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      CSV files only
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      case 'mysql':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="host">Host</Label>
                <Input
                  id="host"
                  name="host"
                  value={config.host || ''}
                  onChange={handleChange}
                  placeholder="127.0.0.1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="port">Port</Label>
                <Input
                  id="port"
                  name="port"
                  value={config.port || ''}
                  onChange={handleChange}
                  placeholder="3306"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="database">Database</Label>
                <Input
                  id="database"
                  name="database"
                  value={config.database || ''}
                  onChange={handleChange}
                  placeholder="database_name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="table">Table</Label>
                <Input
                  id="table"
                  name="table"
                  value={config.table || ''}
                  onChange={handleChange}
                  placeholder="table_name"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="user">User</Label>
                <Input
                  id="user"
                  name="user"
                  value={config.user || ''}
                  onChange={handleChange}
                  placeholder="root"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  name="password"
                  value={config.password || ''}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>
        );
      default:
        return (
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2">
                <Label htmlFor="generic">Configuration</Label>
                <Input
                  id="generic"
                  name="generic"
                  value={config.generic || ''}
                  onChange={handleChange}
                  placeholder={`Enter ${sourceType} configuration...`}
                />
              </div>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {renderFields()}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isLoading} className="gap-2">
          {isLoading ? (
            <>
              <Loader2 className="animate-spin h-4 w-4" />
              Validating...
            </>
          ) : (
            'Validate Source'
          )}
        </Button>
      </div>
    </form>
  );
};

export default ConfigForm;