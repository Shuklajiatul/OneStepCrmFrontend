
import React from 'react';
import { Table } from 'lucide-react';

const PreviewTable = ({ data }) => {
  if (!data || data.length === 0) return null;

  const headers = Object.keys(data[0]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
                <Table size={18} />
                <h3>Data Preview</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded-md">
                {data.length} rows fetched
            </span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
                    <tr>
                        {headers.map(key => (
                            <th key={key} className="px-4 py-3 font-medium tracking-wider whitespace-nowrap">{key}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {data.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            {headers.map((key, i) => (
                                <td key={i} className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[200px] truncate" title={String(row[key])}>
                                    {String(row[key])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
        {data.length > 5 && (
            <div className="p-3 text-center text-xs text-slate-400 border-t border-slate-100 italic">
                Showing first 5 rows of {data.length}
            </div>
        )}
    </div>
  );
};

export default PreviewTable;