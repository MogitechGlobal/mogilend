import React from 'react';

export function Logo({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3.5 ${className}`}>
      {/* The Brand Icon - Maximized box and scaled-up image */}
      <div className="flex items-center justify-center w-10 h-10 bg-white rounded-2xl shadow-lg shrink-0 overflow-hidden border border-slate-200/20">
        <img 
          src="/favicon.ico" 
          alt="MogiLend Icon" 
          /* Increased to w-10 h-10 and added scale-110 to eat up any extra transparent padding */
          className="w-10 h-10 object-contain scale-110" 
        />
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center">
        <span className="text-[26px] font-extrabold leading-none tracking-tight">
          <span className="text-white">Mogi</span>
          <span className="text-green-500">Lend</span>
        </span>
        <span className="text-[0.55rem] font-bold tracking-widest text-slate-400 mt-1 uppercase">
          Lend Smart. Grow Together.
        </span>
      </div>
    </div>
  );
}