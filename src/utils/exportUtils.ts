// ==============================================================================
// File: src/utils/exportUtils.ts
// Description: Secure CSV and XLSX (Excel) Export Utilities for A TIGER GROUPS Admin
// ==============================================================================

import * as XLSX from 'xlsx';

/**
 * Escapes a single CSV field value according to RFC 4180
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an array of objects into a properly escaped UTF-8 CSV string
 */
export function generateCsv(data: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  if (data.length === 0) {
    return headers.map((h) => escapeCsvCell(h.label)).join(',');
  }

  const headerRow = headers.map((h) => escapeCsvCell(h.label)).join(',');
  const rows = data.map((row) => {
    return headers.map((h) => escapeCsvCell(row[h.key])).join(',');
  });

  // Prepend UTF-8 Byte Order Mark (\uFEFF) for seamless compatibility with Microsoft Excel
  return '\uFEFF' + [headerRow, ...rows].join('\r\n');
}

/**
 * Triggers a browser download of a CSV file
 */
export function downloadCsv(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates and triggers download of an XLSX file with proper column formatting
 */
export function downloadXlsx(data: Record<string, unknown>[], filename: string, sheetName = 'Enquiries'): void {
  const worksheet = XLSX.utils.json_to_sheet(data);

  // Auto-fit column widths where possible
  const colWidths: { wch: number }[] = [];
  if (data.length > 0) {
    const keys = Object.keys(data[0]);
    keys.forEach((key) => {
      let maxLen = key.length;
      data.slice(0, 100).forEach((row) => {
        const val = row[key];
        if (val) {
          const strLen = String(val).length;
          if (strLen > maxLen) maxLen = strLen;
        }
      });
      colWidths.push({ wch: Math.min(Math.max(maxLen + 3, 10), 50) });
    });
    worksheet['!cols'] = colWidths;
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, filename);
}

/**
 * Formats current local date as YYYY-MM-DD for standardized export filenames
 */
export function getExportDateStamp(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
