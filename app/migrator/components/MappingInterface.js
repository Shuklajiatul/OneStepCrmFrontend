"use client"

import React, { useState, useEffect } from 'react';
import { ArrowRight, Plus, Table as TableIcon, Loader2 } from 'lucide-react';
import { datatablesApi } from '@/lib/api-endpoint';
import { toast } from 'sonner';

const MappingInterface = ({
  previewData,
  mappings,
  selectedTableId,
  onTableSelect,
  onMappingChange,
}) => {
  const [sourceFields, setSourceFields] = useState([]);
  const [targetColumns, setTargetColumns] = useState([]);
  const [availableTables, setAvailableTables] = useState([]);
  const [isLoadingTables, setIsLoadingTables] = useState(false);
  const [isLoadingColumns, setIsLoadingColumns] = useState(false);

  useEffect(() => {
    if (previewData.length > 0) {
      setSourceFields(Object.keys(previewData[0]));
    }
  }, [previewData]);

  // Fetch tables on mount
  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    setIsLoadingTables(true);
    try {
      console.log("Fetching tables...");
      const response = await datatablesApi.getAll();
      console.log("Tables response:", response);
      if (response.data && response.data.success) {
        setAvailableTables(response.data.data || []);
      } else if (Array.isArray(response.data)) {
        setAvailableTables(response.data);
      } else if (response.data && Array.isArray(response.data.data)) {
        // Fallback if success flag is missing but structure is { data: [...] }
        setAvailableTables(response.data.data);
      }
      console.log("Available tables set to:", availableTables);
    } catch (error) {
      console.error("Error fetching tables:", error);
      toast.error("Failed to fetch destination tables");
    } finally {
      setIsLoadingTables(false);
    }
  };

  // Fetch columns when table is selected
  useEffect(() => {
    const fetchColumns = async () => {
      if (!selectedTableId) {
        setTargetColumns([]);
        return;
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
          type: col.parent_datatype || 'string'
        }));

        setTargetColumns(formattedColumns);
      } catch (error) {
        console.error("Error fetching columns:", error);
        toast.error("Failed to fetch table columns");
        setTargetColumns([]);
      } finally {
        setIsLoadingColumns(false);
      }
    };

    fetchColumns();
  }, [selectedTableId]);

  const handleMappingUpdate = (sourceField, value) => {
    if (value === 'create_new') {
      onMappingChange(sourceField, {
        sourceField,
        destinationColumnId: 'new',
        newColumnName: sourceField
      });
    } else {
      onMappingChange(sourceField, {
        sourceField,
        destinationColumnId: value
      });
    }
  };

  const handleNewNameChange = (sourceField, newName) => {
    const current = mappings[sourceField];
    if (current && current.destinationColumnId === 'new') {
      onMappingChange(sourceField, { ...current, newColumnName: newName });
    }
  };

  // If no table is selected, show table selection
  if (!selectedTableId) {
    return (
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">Select Destination Table</h3>

        {isLoadingTables ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : availableTables.length === 0 ? (
          <div className="text-center p-8 border rounded-lg bg-slate-50 text-slate-500">
            No tables found in your organization.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableTables.map((table) => (
              <button
                key={table.table_id || table.id}
                onClick={() => onTableSelect(table.table_id || table.id)}
                className="flex items-center gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-400 hover:shadow-sm transition-all text-left group"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                  <TableIcon size={20} />
                </div>
                <div>
                  <div className="font-medium text-slate-900">{table.table_name || table.name}</div>
                  <div className="text-xs text-slate-500">Click to select</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // If table is selected, show mapping
  const selectedTableName = availableTables.find(t => (t.table_id || t.id) === selectedTableId)?.table_name || 'Selected Table';

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-lg border border-slate-200">
        <div className="flex items-center gap-2">
          <div className="bg-white p-2 rounded-md border border-slate-200">
            <TableIcon size={16} className="text-slate-600" />
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Mapping To</div>
            <div className="font-semibold text-slate-900">{selectedTableName}</div>
          </div>
        </div>
        <button
          onClick={() => onTableSelect(null)}
          className="text-xs font-medium text-slate-500 hover:text-slate-900 underline"
        >
          Change Table
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-12 bg-slate-50 border-b border-slate-200 p-3 font-medium text-slate-500 text-xs uppercase tracking-wider">
          <div className="col-span-5 pl-2">Source Field</div>
          <div className="col-span-1"></div>
          <div className="col-span-6">Destination Column</div>
        </div>

        {isLoadingColumns ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {sourceFields.map((field) => {
              const mapping = mappings[field] || { sourceField: field, destinationColumnId: '' };
              const isNew = mapping.destinationColumnId === 'new';
              const isMapped = mapping.destinationColumnId && mapping.destinationColumnId !== '';

              return (
                <div key={field} className={`grid grid-cols-12 p-3 items-center transition-colors ${isMapped ? 'bg-white' : 'bg-slate-50/30'}`}>
                  <div className="col-span-5 font-medium text-slate-700 truncate pl-2" title={field}>
                    {field}
                  </div>

                  <div className="col-span-1 flex justify-center text-slate-300">
                    <ArrowRight size={14} />
                  </div>

                  <div className="col-span-6 flex gap-2">
                    <div className="flex-1 relative">
                      <select
                        value={mapping.destinationColumnId || ''}
                        onChange={(e) => handleMappingUpdate(field, e.target.value)}
                        className={`
                                h-9 w-full rounded-md border text-sm focus:outline-none focus:ring-2 focus:ring-slate-400 bg-transparent px-3
                                ${isNew
                            ? 'border-blue-200 bg-blue-50/50 text-blue-700'
                            : 'border-slate-200 text-slate-700'}
                            `}
                      >
                        <option value="">-- Ignore --</option>
                        <option value="create_new" className="font-semibold text-blue-600">+ Create New Column</option>
                        <optgroup label="Existing Columns">
                          {targetColumns.map(col => (
                            <option key={col.id} value={col.id}>{col.name} ({col.type})</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {isNew && (
                      <input
                        type="text"
                        placeholder="Column Name"
                        value={mapping.newColumnName || ''}
                        onChange={(e) => handleNewNameChange(field, e.target.value)}
                        className="flex-1 h-9 rounded-md border border-blue-200 bg-blue-50 px-3 text-sm text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 placeholder:text-blue-300"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MappingInterface;