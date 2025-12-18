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
    <div className="w-full py-6">
      <div className="flex items-center justify-center relative">
        {steps.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;

          return (
            <React.Fragment key={step.id}>
              {index > 0 && (
                <div
                  className={`h-[2px] w-12 sm:w-24 transition-all duration-500 ease-in-out ${isCompleted || isCurrent ? 'bg-primary' : 'bg-muted'
                    }`}
                />
              )}

              <div className="relative flex flex-col items-center group">
                <div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-500 ease-in-out z-10
                    ${isCompleted
                      ? 'bg-primary border-primary text-primary-foreground shadow-md scale-100'
                      : isCurrent
                        ? 'bg-background border-primary text-primary ring-4 ring-primary/20 scale-110 shadow-lg'
                        : 'bg-muted/50 border-muted text-muted-foreground'}
                  `}
                >
                  {isCompleted ? <Check size={16} strokeWidth={3} /> : <span className="text-sm font-bold">{step.id}</span>}
                </div>
                <span className={`
                    absolute top-12 text-xs font-bold whitespace-nowrap transition-colors duration-300
                    ${isCurrent ? 'text-primary translate-y-0 opacity-100' : 'text-muted-foreground translate-y-1'}
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