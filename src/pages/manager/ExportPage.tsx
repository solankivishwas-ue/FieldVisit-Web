import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useVisits } from '../../hooks/useVisits';
import NavBar from '../../components/NavBar';
import LoadingSpinner from '../../components/LoadingSpinner';
import ErrorBoundary from '../../components/ErrorBoundary';
import { visitsToCsv, downloadCsv, buildExportFilename } from '../../utils/exportCsv';

function toDateInputVal(d: Date): string {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
function dateInputToStartMs(val: string): number {
  const [y, m, d] = val.split('-').map(Number);
  return new Date(y, (m as number) - 1, d as number, 0, 0, 0, 0).getTime();
}
function dateInputToEndMs(val: string): number {
  const [y, m, d] = val.split('-').map(Number);
  return new Date(y, (m as number) - 1, d as number, 23, 59, 59, 999).getTime();
}
function defaultFrom(): string {
  const d = new Date(); d.setDate(d.getDate() - 30); return toDateInputVal(d);
}
function defaultTo(): string { return toDateInputVal(new Date()); }

export default function ExportPage() {
  const navigate                    = useNavigate();
  const { visits, loading, error }  = useVisits();
  const [fromVal,    setFromVal]    = useState(defaultFrom);
  const [toVal,      setToVal]      = useState(defaultTo);
  const [employeeId, setEmployeeId] = useState('');
  const employees = useMemo(() => {
    const seen = new Map<string, string>();
    for (const v of visits) { if (!seen.has(v.userId)) seen.set(v.userId, v.userName); }
    return Array.from(seen.entries()).map(([uid, name]) => ({ uid, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [visits]);
  const filtered = useMemo(() => {
    const fromMs = dateInputToStartMs(fromVal);
    const toMs   = dateInputToEndMs(toVal);
    return visits.filter((v) => {
      if (v.createdAt < fromMs || v.createdAt > toMs) return false;
      if (employeeId && v.userId !== employeeId) return false;
      return true;
    });
  }, [visits, fromVal, toVal, employeeId]);
  function handleExport() {
    if (filtered.length === 0) return;
    const rows = [...filtered].sort((a, b) => b.createdAt - a.createdAt);
    const csv  = visitsToCsv(rows);
    const emp  = employees.find((e) => e.uid === employeeId);
    const suf  = emp ? emp.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') : undefined;
    downloadCsv(csv, buildExportFilename(suf));
  }
  const isRangeValid = fromVal && toVal && fromVal <= toVal;
  const canExport    = isRangeValid && filtered.length > 0;
  const today        = toDateInputVal(new Date());
  return (
    <div className="min-h-screen bg-gray-50">
      <ErrorBoundary>
        <NavBar title="Export" />
      </ErrorBoundary>
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => navigate('/manager')}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Back</button>
          <div>
            <h1 className="text-xl font-bold text-gray-800">Export Visits</h1>
            <p className="text-sm text-gray-500 mt-0.5">Download a CSV of visit records for any date range.</p>
          </div>
        </div>
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Failed to load visits:</strong> {error}
          </div>
        )}
        {loading && <LoadingSpinner message="Loading visits..." />}
        {!loading && !error && (
          <ExportCard fromVal={fromVal} toVal={toVal} today={today}
            employees={employees} employeeId={employeeId}
            totalVisits={visits.length} filtered={filtered}
            isRangeValid={!!isRangeValid} canExport={!!canExport}
            onFromChange={setFromVal} onToChange={setToVal}
            onEmployeeChange={setEmployeeId} onExport={handleExport} />
        )}
      </main>
    </div>
  );
}

interface ExportCardProps {
  fromVal: string; toVal: string; today: string;
  employees: { uid: string; name: string }[];
  employeeId: string; totalVisits: number;
  filtered: unknown[]; isRangeValid: boolean; canExport: boolean;
  onFromChange: (v: string) => void; onToChange: (v: string) => void;
  onEmployeeChange: (v: string) => void; onExport: () => void;
}
function ExportCard({ fromVal, toVal, today, employees, employeeId, totalVisits,
  filtered, isRangeValid, canExport, onFromChange, onToChange, onEmployeeChange, onExport }: ExportCardProps) {
  const count = filtered.length;
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-5">
      <fieldset className="space-y-3">
        <legend className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Date Range <span className="text-red-500">*</span>
        </legend>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label htmlFor="export-from" className="block text-xs font-semibold text-gray-600">From</label>
            <input id="export-from" type="date" max={toVal || today} value={fromVal}
              onChange={(e) => onFromChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent" />
          </div>
          <div className="space-y-1">
            <label htmlFor="export-to" className="block text-xs font-semibold text-gray-600">To</label>
            <input id="export-to" type="date" min={fromVal} max={today} value={toVal}
              onChange={(e) => onToChange(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent" />
          </div>
        </div>
        {!isRangeValid && fromVal && toVal && (
          <p className="text-xs text-red-600">&quot;From&quot; must be on or before &quot;To&quot;.</p>
        )}
      </fieldset>
      <div className="space-y-1">
        <label htmlFor="export-employee" className="block text-xs font-semibold text-gray-600">Employee</label>
        <select id="export-employee" value={employeeId}
          onChange={(e) => onEmployeeChange(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent">
          <option value="">All employees ({totalVisits} total visits)</option>
          {employees.map((e) => (
            <option key={e.uid} value={e.uid}>{e.name}</option>
          ))}
        </select>
      </div>
      <div className={`rounded-lg px-4 py-3 text-sm font-medium border ${count > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
        {isRangeValid
          ? count > 0
            ? `${count} visit${count !== 1 ? 's' : ''} will be exported`
            : 'No visits match the selected filters'
          : 'Select a valid date range to preview'}
      </div>
      <ColumnList />
      <button type="button" onClick={onExport} disabled={!canExport}
        className="w-full py-3 rounded-xl bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
        </svg>
        {canExport ? `Download CSV (${count} row${count !== 1 ? 's' : ''})` : 'Download CSV'}
      </button>
      <p className="text-xs text-gray-400 text-center">
        Opens in Excel and Google Sheets &middot; UTF-8 with BOM &middot; all cells double-quoted
      </p>
    </div>
  );
}

const CSV_COLUMNS = [
  'ID', 'Employee Name', 'Purpose', 'Doctor / Contact', 'Phone',
  'Speciality', 'Clinic / Hospital', 'Address', 'Latitude', 'Longitude',
  'Notes', 'Next Action', 'Follow-up Date', 'Sync Status', 'Created At', 'Updated At',
];

function ColumnList() {
  return (
    <details className="group">
      <summary className="cursor-pointer text-xs font-semibold text-gray-500 hover:text-gray-700 select-none list-none flex items-center gap-1">
        <svg className="w-3.5 h-3.5 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
          <path fillRule="evenodd" d="M7.293 4.293a1 1 0 011.414 0L14 9.586l-5.293 5.293a1 1 0 01-1.414-1.414L11.172 9.586 6.879 5.879a1 1 0 010-1.586z" clipRule="evenodd" />
        </svg>
        CSV column order ({CSV_COLUMNS.length} columns)
      </summary>
      <ol className="mt-2 pl-5 space-y-0.5 text-xs text-gray-500 list-decimal">
        {CSV_COLUMNS.map((col) => <li key={col}>{col}</li>)}
      </ol>
    </details>
  );
}
