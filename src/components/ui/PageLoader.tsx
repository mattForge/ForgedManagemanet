import React from 'react';

export default function PageLoader() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Crisp corporate blue spinning loader */}
        <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin shadow-sm"></div>
        
        {/* Subtle, professional text */}
        <div className="flex flex-col items-center">
          <p className="text-sm font-semibold text-slate-900 tracking-tight">
            Loading Workspace
          </p>
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mt-1">
            Enterprise Suite
          </p>
        </div>
      </div>
    </div>
  );
}
