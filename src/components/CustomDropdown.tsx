import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: string | number;
  label: string;
}

interface CustomDropdownProps {
  value: string | number;
  onChange: (value: any) => void;
  options: Option[];
  placeholder?: string;
  className?: string;
  icon?: React.ReactNode;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  onChange,
  options,
  placeholder = 'Selecione...',
  className = '',
  icon
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find(o => o.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-[#060D1A]/60 border border-secondary/20 hover:border-secondary/50 rounded-xl py-2.5 px-4 text-[10px] font-bold uppercase tracking-widest text-surface flex items-center justify-between transition-all focus:outline-none focus:ring-1 focus:ring-secondary/30"
      >
        <div className="flex items-center gap-2.5 truncate">
          {icon && <span className="text-secondary shrink-0">{icon}</span>}
          <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-secondary/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-[#060D1A] border border-secondary/30 rounded-2xl shadow-2xl shadow-black/80 p-1.5 max-h-60 overflow-y-auto custom-scrollbar-dark animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1">
          {options.map((option) => {
            const isSelected = value === option.value;
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3.5 py-2 rounded-xl text-[9px] uppercase tracking-widest transition-all flex items-center justify-between border ${
                  isSelected
                    ? 'bg-secondary/10 border-secondary text-secondary font-black shadow-[0_0_12px_rgba(244,192,37,0.15)]'
                    : 'bg-transparent border-transparent text-surface/70 hover:bg-secondary/5 hover:border-secondary/20 hover:text-secondary'
                }`}
              >
                <span>{option.label}</span>
                {isSelected && (
                  <span className="w-1.5 h-1.5 rounded-full bg-secondary shadow-[0_0_6px_#F4C025]" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
