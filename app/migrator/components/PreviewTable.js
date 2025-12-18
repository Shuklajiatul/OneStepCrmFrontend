
import React from 'react';

const PreviewTable = ({ data }) => {
    if (!data || data.length === 0) return null;

    const headers = Object.keys(data[0]);

    return (
        <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50/80 border-b border-slate-200">
                    <tr>
                        {headers.map(key => (
                            <th key={key} className="px-4 py-3 font-semibold tracking-wider whitespace-nowrap text-slate-700">{key}</th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                    {data.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors duration-150">
                            {headers.map((key, i) => (
                                <td key={i} className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[200px] truncate" title={String(row[key])}>
                                    {String(row[key])}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
            {data.length > 5 && (
                <div className="bg-slate-50/50 p-2 text-center text-xs text-muted-foreground border-t border-slate-200">
                    Displaying first 5 rows
                </div>
            )}
        </div>
    );
};

export default PreviewTable;