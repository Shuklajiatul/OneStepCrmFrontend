"use client"

import React, { useState, useEffect } from 'react';
import { ArrowRight, Plus, Table as TableIcon, Loader2 } from 'lucide-react';
import { datatablesApi } from '@/lib/api-endpoint';
import * as migrationService from '../services/migrationService';
import { toast } from 'sonner';
import { Database, Layout, Server, Boxes } from 'lucide-react';

// Helper: determine if a column should show the "Autogenerate" checkbox
// Only shown for ID (uuid) and Date type columns
const isAutoGenColumn = (col) => {
  if (!col) return false;
  const type = (col.type || '').toLowerCase();
  return (
    type === 'uuid' ||
    type === 'id' ||
    type === 'date' ||
    type === 'datetime' ||
    type === 'timestamp'
  );
};

const MappingInterface = ({
  previewData,
  mappings,
  selectedTableId,
  onTableSelect,
  onMappingChange,
  initialTables = [],
  destinationType,
  onDestinationTypeChange,
  onPartitionKeysChange = () => {} // Default empty function
}) => {
  const [sourceFields, setSourceFields] = useState([]);
  const [targetColumns, setTargetColumns] = useState([]);
  const [availableTables, setAvailableTables] = useState(initialTables); // Initialize with initialTables
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);
  const [partitionKeyColumns, setPartitionKeyColumns] = useState([]);

  useEffect(() => {
    if (previewData.length > 0) {
      setSourceFields(Object.keys(previewData[0]));
    }
  }, [previewData]);

  // Fetch tables on mount OR update if initialTables changes or destinationType changes
  useEffect(() => {
    if (destinationType === 'dynamic') {
      if (initialTables && initialTables.length > 0) {
        setAvailableTables(initialTables);
      } else {
        fetchTables();
      }
    } else if (destinationType === 'static') {
      fetchTables();
    }
  }, [initialTables, destinationType]);

  const fetchTables = async () => {
    if (!destinationType) return;

    // For dynamic, if we already have initialTables from SSR, use them
    if (destinationType === 'dynamic' && initialTables?.length > 0 && availableTables.length > 0) return;

    setIsLoadingTables(true);
    try {
      console.log(`Fetching ${destinationType} tables...`);
      let tables = [];

      if (destinationType === 'dynamic') {
        const response = await datatablesApi.getAll();
        const data = response.data;
        if (data && data.success) {
          tables = data.data || [];
        } else if (Array.isArray(data)) {
          tables = data;
        } else if (data && Array.isArray(data.data)) {
          tables = data.data;
        }
      } else {
        // Static tables from keyspace crm
        const response = await migrationService.getSystemTables('crm');
        // Handle various response formats for system tables
        if (Array.isArray(response)) {
          tables = response;
        } else if (response.data && Array.isArray(response.data)) {
          tables = response.data;
        } else if (response.tables && Array.isArray(response.tables)) {
          tables = response.tables;
        }
      }

      setAvailableTables(tables);
      console.log(`Available ${destinationType} tables set to:`, tables);
    } catch (error) {
      console.error(`Error fetching ${destinationType} tables:`, error);
      toast.error(`Failed to fetch ${destinationType} destination tables`);
    } finally {
      setIsLoadingTables(false);
    }
  };

  // Fetch columns when table is selected
  useEffect(() => {
    const fetchColumns = async () => {
      if (!selectedTableId) {
        setTargetColumns([]);
        setPartitionKeyColumns([]);
        onPartitionKeysChange([]);
        return;
      }

      if (destinationType === 'static') {
        const tableObj = availableTables.find(t => (t.table || t.table_id || t.id) === selectedTableId);
        if (tableObj && tableObj.columns) {
          const formattedColumns = tableObj.columns.map(col => ({
            id: col.name,
            name: col.name,
            type: col.type || 'string',
            kind: col.kind
          }));
          setTargetColumns(formattedColumns);

          // Extract partition key columns for validation
          const partitionKeys = tableObj.columns
            .filter(col => col.kind === 'partition_key')
            .map(col => col.name);
          setPartitionKeyColumns(partitionKeys);
          onPartitionKeysChange(partitionKeys);
          setIsLoadingColumns(false);
          return;
        }
      }

      setIsLoadingColumns(true);
      try {
        const response = await datatablesApi.getColumns(selectedTableId);
        const result = response.data;
        let columns = [];

        if (Array.isArray(result)) {
          columns = result;
        } else if (result.success && result.columns) {
          columns = result.columns;
        } else if (Array.isArray(result.data)) {
          columns = result.data;
        }

        // Standardize column format for the UI
        const formattedColumns = columns.map(col => ({
          id: col.column_id,
          name: col.column_name,
          type: col.parent_datatype || 'string',
          kind: 'regular' // Dynamic tables don't have partition keys
        }));

        setTargetColumns(formattedColumns);
        setPartitionKeyColumns([]); // Dynamic tables don't have partition key requirements
        onPartitionKeysChange([]); // Reset for dynamic tables
      } catch (error) {
        console.error("Error fetching columns:", error);
        toast.error("Failed to fetch table columns");
        setTargetColumns([]);
      } finally {
        setIsLoadingColumns(false);
      }
    };

    fetchColumns();
  }, [selectedTableId, destinationType, availableTables]);

  // Check if a column is a required partition key
  const isPartitionKeyColumn = (columnName) => {
    return destinationType === 'static' && partitionKeyColumns.includes(columnName);
  };

  // Get unmapped partition key columns for validation display
  const getUnmappedPartitionKeys = () => {
    if (destinationType !== 'static') return [];

    return partitionKeyColumns.filter(colName => {
      const isMapped = Object.values(mappings).some(mapping =>
        mapping.destinationColumnId === colName ||
        mapping.column_name === colName
      );
      return !isMapped;
    });
  };

  // Build the enriched mapping object for a field
  const buildMappingObject = (sourceField, columnId, extraProps = {}) => {
    if (columnId === 'create_new') {
      return {
        sourceField,
        destinationColumnId: 'new',
        newColumnName: sourceField,
        newColumnType: 'string',
        required: false,
        autogenerate: false,
        ...extraProps
      };
    }

    // Find column metadata for the selected column
    const col = targetColumns.find(c => c.id === columnId);

    return {
      sourceField,
      destinationColumnId: columnId,
      column_id: columnId || null,
      column_name: col?.name || null,
      required: false,
      autogenerate: false,
      ...extraProps
    };
  };

  const handleMappingUpdate = (sourceField, value) => {
    const current = mappings[sourceField] || {};
    let autogenerate = false;
    let required = false;

    // For static group, automatically set autogenerate/required if it's a timestamp or uuid
    if (destinationType === 'static' && value && value !== 'create_new') {
      const col = targetColumns.find(c => c.id === value);
      if (col) {
        const type = (col.type || '').toLowerCase();
        if (type === 'uuid' || type === 'timestamp') {
          autogenerate = true;
          required = true;
        }
      }
    }

    const extraProps = { autogenerate, required };

    if (value === 'create_new') {
      onMappingChange(sourceField, buildMappingObject(sourceField, 'create_new', extraProps));
    } else {
      onMappingChange(sourceField, buildMappingObject(sourceField, value, extraProps));
    }
  };

  const handleRequiredChange = (sourceField, checked) => {
    const current = mappings[sourceField] || {};
    // If autogenerate is on, it must be required
    const isAutogen = !!current.autogenerate;
    onMappingChange(sourceField, { ...current, required: isAutogen ? true : checked });
  };

  const handleAutogenerateChange = (sourceField, checked) => {
    const current = mappings[sourceField] || {};
    // When autogenerate is set to true, it should be required true by default
    onMappingChange(sourceField, {
      ...current,
      autogenerate: checked,
      required: checked ? true : (current.required ?? false)
    });
  };

  const handleNewNameChange = (sourceField, newName) => {
    const current = mappings[sourceField];
    if (current && current.destinationColumnId === 'new') {
      onMappingChange(sourceField, { ...current, newColumnName: newName, column_name: newName });
    }
  };

  const handleNewDataTypeChange = (sourceField, newType) => {
    const current = mappings[sourceField];
    if (current && current.destinationColumnId === 'new') {
      onMappingChange(sourceField, { ...current, newColumnType: newType });
    }
  };

  // If no table is selected, show category selection OR table list
  if (!selectedTableId) {
    if (!destinationType) {
      return (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-slate-900 border-l-4 border-primary pl-3">Select Destination Group</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => onDestinationTypeChange('dynamic')}
              className="flex flex-col items-center justify-center gap-4 p-8 bg-white border-2 border-slate-100 rounded-2xl hover:border-primary hover:shadow-xl transition-all group"
            >
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-500 scale-100 group-hover:scale-110">
                <Layout size={36} />
              </div>
              <div className="text-center">
                <div className="font-bold text-xl text-slate-900 mb-1">Dynamic Group</div>
                <div className="text-sm text-slate-500 max-w-[200px]">Migrate data to your custom-built tables</div>
              </div>
            </button>

            <button
              onClick={() => onDestinationTypeChange('static')}
              className="flex flex-col items-center justify-center gap-4 p-8 bg-white border-2 border-slate-100 rounded-2xl hover:border-blue-500 hover:shadow-xl transition-all group"
            >
              <div className="w-20 h-20 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 scale-100 group-hover:scale-110">
                <Server size={36} />
              </div>
              <div className="text-center">
                <div className="font-bold text-xl text-slate-900 mb-1">Static Group</div>
                <div className="text-sm text-slate-500 max-w-[200px]">Migrate data to pre-defined system tables</div>
              </div>
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4 animate-in fade-in slide-in-from-left-4 duration-300">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 border-l-4 border-primary pl-3">
            Select {destinationType === 'dynamic' ? 'Dynamic' : 'Static'} Table
          </h3>
          <button
            onClick={() => {
              onDestinationTypeChange(null);
              setAvailableTables([]);
            }}
            className="text-xs font-medium text-slate-500 hover:text-primary flex items-center gap-1 group"
          >
            <Boxes size={14} className="group-hover:rotate-12 transition-transform" />
            Switch Group
          </button>
        </div>

        {isLoadingTables ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-10 w-10 animate-spin text-primary/80" />
          </div>
        ) : availableTables.length === 0 ? (
          <div className="text-center p-10 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-500">
            No {destinationType} tables found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {availableTables.map((table) => (
              <button
                key={table.table_id || table.id || table.tableId || table.name || table.table}
                onClick={() => onTableSelect(table.table_id || table.id || table.tableId || table.name || table.table)}
                className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl hover:border-primary hover:ring-1 hover:ring-primary/20 hover:shadow-md transition-all text-left group"
              >
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <Database size={20} />
                </div>
                <div>
                  <div className="font-semibold text-slate-900 group-hover:text-primary transition-colors">{table.table_name || table.name || table.tableId || table.table}</div>
                  <div className="text-xs text-slate-500">{destinationType === 'static' ? 'System Table' : 'Custom Table'}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // If table is selected, show mapping
  const selectedTableObj = availableTables.find(t => (t.table_id || t.id || t.tableId || t.name || t.table) === selectedTableId);
  const selectedTableName = selectedTableObj?.table_name || selectedTableObj?.name || selectedTableObj?.tableId || selectedTableObj?.table || 'Selected Table';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between bg-slate-50/80 p-4 rounded-xl border border-slate-200/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-sm">
            <TableIcon size={18} className="text-primary" />
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Mapping To</div>
            <div className="font-bold text-slate-900 text-lg">{selectedTableName}</div>
          </div>
        </div>
        <button
          onClick={() => {
            onTableSelect(null);
          }}
          className="text-xs font-semibold text-primary hover:text-primary/80 hover:underline px-3 py-1.5 bg-primary/5 rounded-md transition-colors"
        >
          Change Table
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Table Header */}
        <div className="grid bg-slate-50/80 border-b border-slate-200 p-3 font-semibold text-slate-500 text-xs uppercase tracking-wider"
          style={{ gridTemplateColumns: '1fr 24px 2fr 80px 90px' }}
        >
          <div className="pl-3">Source Field</div>
          <div></div>
          <div className="pl-1 flex items-center gap-1">
            Destination Column
            {destinationType === 'static' && partitionKeyColumns.length > 0 && (
              <span className="text-red-500 text-xs" title="* indicates required partition key columns">*</span>
            )}
          </div>
          <div className="text-center">Required</div>
          <div className="text-center">Autogenerate</div>
        </div>

        {isLoadingColumns ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sourceFields.map((field) => {
              const mapping = mappings[field] || { sourceField: field, destinationColumnId: '' };
              const isNew = mapping.destinationColumnId === 'new';
              const isMapped = mapping.destinationColumnId && mapping.destinationColumnId !== '';

              // Find the selected column object (for autogenerate detection)
              const selectedCol = targetColumns.find(c => c.id === mapping.destinationColumnId);
              const showAutogenerate = isNew
                ? (mapping.newColumnType === 'date' || mapping.newColumnType === 'uuid')
                : isAutoGenColumn(selectedCol);

              return (
                <div
                  key={field}
                  className={`p-3 items-center gap-2 transition-colors hover:bg-slate-50 ${isMapped ? 'bg-white' : 'bg-slate-50/30'}`}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 24px 2fr 80px 90px' }}
                >
                  {/* Source Field Name */}
                  <div className="font-medium text-slate-700 truncate pl-3" title={field}>
                    {field}
                  </div>

                  {/* Arrow */}
                  <div className="flex justify-center text-slate-300">
                    <ArrowRight size={16} className={isMapped ? "text-primary/40" : ""} />
                  </div>

                  {/* Destination Column selector + new column inputs */}
                  <div className="flex gap-2 min-w-0">
                    <div className="flex-1 relative min-w-[120px]">
                      <select
                        value={mapping.destinationColumnId || ''}
                        onChange={(e) => handleMappingUpdate(field, e.target.value)}
                        className={`
                                h-10 w-full rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-offset-0 transition-all cursor-pointer bg-transparent px-3
                                ${isNew
                            ? 'border-blue-300 bg-blue-50/50 text-blue-700 focus:ring-blue-400/50'
                            : 'border-slate-200 text-slate-700 focus:ring-primary/20 focus:border-primary'}`}
                      >
                        <option value="">-- Ignore Field --</option>
                        {destinationType === 'dynamic' && (
                          <option value="create_new" className="font-semibold text-blue-600 bg-blue-50">+ Create New Column</option>
                        )}
                        <optgroup label="Existing Columns">
                          {targetColumns.map(col => {
                            const isRequired = isPartitionKeyColumn(col.name);
                            return (
                              <option key={col.id} value={col.id}>
                                {col.name} ({col.type}){isRequired ? ' *' : ''}
                              </option>
                            );
                          })}
                        </optgroup>
                      </select>
                    </div>

                    {isNew && (
                      <>
                        <input
                          type="text"
                          placeholder="Column Name"
                          value={mapping.newColumnName || ''}
                          onChange={(e) => handleNewNameChange(field, e.target.value)}
                          className="w-[110px] h-10 rounded-lg border border-blue-300 bg-blue-50/50 px-3 text-sm text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400/50 placeholder:text-blue-300/70"
                        />
                        <select
                          value={mapping.newColumnType || 'string'}
                          onChange={(e) => handleNewDataTypeChange(field, e.target.value)}
                          className="w-[90px] h-10 rounded-lg border border-blue-300 bg-blue-50/50 px-2 text-sm text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400/50 cursor-pointer"
                        >
                          <option value="string">Text</option>
                          <option value="number">Number</option>
                          <option value="boolean">Boolean</option>
                          <option value="email">Email</option>
                          <option value="phone">Phone</option>
                          <option value="url">URL</option>
                          <option value="date">Date</option>
                          <option value="uuid">UUID/ID</option>
                        </select>
                      </>
                    )}
                  </div>

                  {/* Required Checkbox */}
                  <div className="flex items-center justify-center">
                    <label className="flex items-center gap-1.5 cursor-pointer group" title="Mark this field as required">
                      <input
                        type="checkbox"
                        checked={!!mapping.required}
                        disabled={!!mapping.autogenerate}
                        onChange={(e) => handleRequiredChange(field, e.target.checked)}
                        className={`w-4 h-4 rounded border-slate-300 text-primary accent-primary ${mapping.autogenerate ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                      />
                    </label>
                  </div>

                  {/* Autogenerate Checkbox — only for id/date column types */}
                  <div className="flex items-center justify-center">
                    {showAutogenerate ? (
                      <label className="flex items-center gap-1.5 cursor-pointer group" title="Auto-generate value for this field">
                        <input
                          type="checkbox"
                          checked={!!mapping.autogenerate}
                          onChange={(e) => handleAutogenerateChange(field, e.target.checked)}
                          className="w-4 h-4 rounded border-slate-300 text-primary accent-primary cursor-pointer"
                        />
                      </label>
                    ) : (
                      <span className="text-slate-200 text-lg select-none">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Validation Alert for Unmapped Partition Keys */}
      {destinationType === 'static' && getUnmappedPartitionKeys().length > 0 && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-800 font-medium mb-2">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Required Partition Key Columns Missing
          </div>
          <p className="text-red-700 text-sm">
            The following partition key columns must be mapped: <strong>{getUnmappedPartitionKeys().join(', ')}</strong>
          </p>
        </div>
      )}
    </div>
  );
};

export default MappingInterface;