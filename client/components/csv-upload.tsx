import { useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Trash } from '@phosphor-icons/react';
import { UploadIcon } from '@/components/ui/upload-icon';

interface CSVUploadProps {
  onFileUpload: (csvData: string[][], fileName: string) => void;
}

export function CSVUpload({ onFileUpload }: CSVUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);

  const parseCSV = (csvText: string): string[][] => {
    const lines = csvText.split('\n');
    return lines
      .filter((line) => line.trim() !== '')
      .map((line) => {
        // Simple CSV parser - handles basic cases
        const result: string[] = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }

        result.push(current.trim());
        return result;
      });
  };

  const handleFile = useCallback(
    (file: File) => {
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const csvText = e.target?.result as string;
          const csvData = parseCSV(csvText);
          setUploadedFile(file.name);
          onFileUpload(csvData, file.name);
        };
        reader.readAsText(file);
      } else {
        alert('Please upload a CSV file');
      }
    },
    [onFileUpload],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile],
  );

  const clearFile = () => {
    setUploadedFile(null);
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {!uploadedFile ? (
          <div
            className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
              isDragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <UploadIcon 
              className="mx-auto mb-4" 
              size="default"
              alt="Upload CSV File"
            />
            <h3 className="mb-2 text-lg font-medium text-gray-900">Upload CSV File</h3>
            <p className="mb-4 text-sm text-gray-600">
              Drag and drop your CSV file here, or click to browse
            </p>
            <div className="flex justify-center">
              <Button variant="outline" className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileInput}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                />
                Choose File
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-5 w-5 text-green-600" weight="regular" />
              <span className="text-sm font-medium text-green-800">{uploadedFile}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFile}
              className="text-green-600 hover:text-green-800"
            >
              <Trash className="h-4 w-4" weight="regular" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
