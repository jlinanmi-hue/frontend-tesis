import React from 'react';

export default function ChatTable({ tableData }) {
  if (!tableData) return null;
  const { title, columns = [], rows = [] } = tableData;
  return (
    <div className="bg-white rounded-xl border border-slate-200/90 shadow-2xs mt-2 mb-1 overflow-hidden">
      <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider font-mono">{title}</span>
        <span className="text-[9.5px] font-mono font-medium text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200/80">{rows.length} registros</span>
      </div>
      <div className="overflow-x-auto max-h-56">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              {columns.map((col, i) => (
                <th key={i} className="px-2.5 py-1.5 text-left text-[10px] font-semibold text-slate-600 uppercase tracking-wide whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                {row.map((cell, ci) => (
                  <td key={ci} className="px-2.5 py-1.5 text-slate-700 border-b border-slate-100 whitespace-nowrap">{cell ?? '-'}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}