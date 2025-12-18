"use client"

import React, { useState } from 'react';
import { Loader2 } from 'lucide-react';
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
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="filePath">File Path</Label>
              <Input
                id="filePath"
                name="filePath"
                value={config.filePath || ''}
                onChange={handleChange}
                placeholder="src/public/DATA.csv"
                required
              />
            </div>
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