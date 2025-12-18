import React from 'react';
import { Database, FileText, Cloud, Server, Code, HardDrive } from 'lucide-react';

const SOURCE_OPTIONS = [
  { id: 'mongodb', label: 'MongoDB', icon: Database, description: 'Import from Mongo Atlas or local instance.' },
  { id: 'mysql', label: 'SQL Database', icon: Server, description: 'MySQL, PostgreSQL, MSSQL support.' },
  { id: 'csv', label: 'CSV File', icon: FileText, description: 'Upload or link to a CSV file.' },
  { id: 'api', label: 'REST API', icon: Code, description: 'Fetch data from an external JSON endpoint.' },
  { id: 's3', label: 'Amazon S3', icon: Cloud, description: 'Import files from S3 buckets.' },
  { id: 'google_cloud', label: 'Google Cloud', icon: Cloud, description: 'Import from GCP Storage.' },
  { id: 'aws', label: 'AWS RDS', icon: HardDrive, description: 'Connect directly to AWS RDS instances.' },
];

const SourceSelector = ({ selected, onSelect }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {SOURCE_OPTIONS.map((option) => {
        const Icon = option.icon;
        const isSelected = selected === option.id;

        return (
          <div
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`
              relative flex flex-col items-start p-6 rounded-xl border cursor-pointer transition-all duration-200
              ${isSelected
                ? 'border-slate-900 ring-1 ring-slate-900 bg-slate-50'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'}
            `}
          >
            <div className={`p-2.5 rounded-lg mb-4 ${isSelected ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}>
              <Icon size={24} strokeWidth={1.5} />
            </div>
            <h3 className="text-base font-semibold text-slate-900">{option.label}</h3>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{option.description}</p>
          </div>
        );
      })}
    </div>
  );
};

export default SourceSelector;