import * as XLSX from 'xlsx';

export interface ValidationError {
  row: number;
  field: string;
  message: string;
}

export interface ParsedData<T> {
  data: T[];
  errors: ValidationError[];
}

export function parseExcelFile<T>(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        resolve(jsonData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

export function generateExcelTemplate(columns: { header: string; key: string; example?: string }[], filename: string) {
  const ws = XLSX.utils.json_to_sheet([
    // Header row with examples
    columns.reduce((acc, col) => ({ ...acc, [col.header]: col.example || '' }), {}),
  ]);
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, filename);
}

export function validateRequired(value: any, fieldName: string): string | null {
  if (value === undefined || value === null || value === '') {
    return `${fieldName} is required`;
  }
  return null;
}

export function validateNumber(value: any, fieldName: string, min?: number, max?: number): string | null {
  const num = Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a number`;
  }
  if (min !== undefined && num < min) {
    return `${fieldName} must be at least ${min}`;
  }
  if (max !== undefined && num > max) {
    return `${fieldName} must be at most ${max}`;
  }
  return null;
}

export function validateString(value: any, fieldName: string, maxLength?: number): string | null {
  const str = String(value || '').trim();
  if (maxLength && str.length > maxLength) {
    return `${fieldName} must be less than ${maxLength} characters`;
  }
  return null;
}

export function sanitizeString(value: any): string {
  return String(value || '').trim();
}

export function exportToExcel(data: any[], filename: string, sheetName: string = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
