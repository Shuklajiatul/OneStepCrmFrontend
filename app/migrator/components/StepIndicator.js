import React from 'react';
import { Check } from 'lucide-react';

const steps = [
  { id: 1, name: 'Select Source' },
  { id: 2, name: 'Preview Data' },
  { id: 3, name: 'Map Columns' },
  { id: 4, name: 'Migrate' }
];

const StepIndicator = ({ currentStep }) => {
  return (
    <div className="w-full py-8">
      <div className="flex items-center justify-center">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <div className={`h-[2px] w-12 sm:w-24 transition-colors duration-300 ${isCompleted ? 'bg-slate-900' : 'bg-slate-200'}`} />
              )}
              
              <div className="relative flex flex-col items-center group">
                <div 
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300 z-10
                    ${isCompleted 
                        ? 'bg-slate-900 border-slate-900 text-white' 
                        : isCurrent 
                            ? 'bg-white border-slate-900 text-slate-900 ring-4 ring-slate-100' 
                            : 'bg-white border-slate-200 text-slate-300'}
                  `}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : <span className="text-sm font-semibold">{step.id}</span>}
                </div>
                <span className={`
                    absolute top-12 text-xs font-semibold whitespace-nowrap transition-colors
                    ${isCurrent ? 'text-slate-900' : 'text-slate-400'}
                `}>
                  {step.name}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;