import { ArrowRight, X, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface MappingDisplayProps {
  csvColumns: string[];
  captions: string[];
  mappings: Record<string, string>;
  csvData: string[][];
  onMappingUpdate: (csvColumn: string, caption: string) => void;
  onMappingRemove: (csvColumn: string) => void;
}

export function MappingDisplay({
  csvColumns,
  captions,
  mappings,
  csvData,
  onMappingUpdate,
  onMappingRemove,
}: MappingDisplayProps) {
  const mappedColumns = Object.keys(mappings);
  const unmappedColumns = csvColumns.filter((col) => !mappings[col]);
  const usedCaptions = Object.values(mappings);
  const availableCaptions = captions.filter((cap) => !usedCaptions.includes(cap));

  const getColumnPreview = (column: string, maxItems = 3) => {
    const columnIndex = csvColumns.indexOf(column);
    if (columnIndex === -1 || csvData.length < 2) return [];

    return csvData
      .slice(1, maxItems + 1)
      .map((row) => row[columnIndex])
      .filter((value) => value && value.trim() !== '');
  };

  const getMappingStatus = () => {
    if (csvColumns.length === 0) return { type: 'none', message: 'No CSV uploaded' };
    if (mappedColumns.length === 0) return { type: 'none', message: 'No mappings created' };
    if (unmappedColumns.length === 0) return { type: 'complete', message: 'All columns mapped!' };
    return {
      type: 'partial',
      message: `${mappedColumns.length}/${csvColumns.length} columns mapped`,
    };
  };

  const status = getMappingStatus();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Column Mappings</CardTitle>
          <div className="flex items-center space-x-2">
            {status.type === 'complete' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {status.type === 'partial' && <AlertCircle className="h-5 w-5 text-yellow-500" />}
            <Badge
              variant={
                status.type === 'complete'
                  ? 'default'
                  : status.type === 'partial'
                    ? 'secondary'
                    : 'outline'
              }
            >
              {status.message}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Mapped Columns */}
        {mappedColumns.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-green-700">Mapped Columns</h3>
            <div className="space-y-3">
              {mappedColumns.map((csvColumn) => {
                const preview = getColumnPreview(csvColumn);
                return (
                  <div
                    key={csvColumn}
                    className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-4"
                  >
                    <div className="flex flex-1 items-center space-x-4">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center space-x-2">
                          <span className="font-medium text-green-800">{csvColumn}</span>
                          <ArrowRight className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-800">{mappings[csvColumn]}</span>
                        </div>
                        {preview.length > 0 && (
                          <div className="text-xs text-green-600">
                            Preview: {preview.join(', ')}
                            {getColumnPreview(csvColumn, 10).length > 3 && '...'}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select
                        value={mappings[csvColumn]}
                        onValueChange={(value) => onMappingUpdate(csvColumn, value)}
                      >
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={mappings[csvColumn]}>{mappings[csvColumn]}</SelectItem>
                          {availableCaptions.map((caption) => (
                            <SelectItem key={caption} value={caption}>
                              {caption}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onMappingRemove(csvColumn)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Unmapped Columns */}
        {unmappedColumns.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-orange-700">Unmapped Columns</h3>
            <div className="space-y-3">
              {unmappedColumns.map((csvColumn) => {
                const preview = getColumnPreview(csvColumn);
                return (
                  <div
                    key={csvColumn}
                    className="flex items-center justify-between rounded-lg border border-orange-200 bg-orange-50 p-4"
                  >
                    <div className="flex-1">
                      <div className="mb-1 flex items-center space-x-2">
                        <span className="font-medium text-orange-800">{csvColumn}</span>
                        <ArrowRight className="h-4 w-4 text-orange-400" />
                        <span className="italic text-orange-600">Not mapped</span>
                      </div>
                      {preview.length > 0 && (
                        <div className="text-xs text-orange-600">
                          Preview: {preview.join(', ')}
                          {getColumnPreview(csvColumn, 10).length > 3 && '...'}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select onValueChange={(value) => onMappingUpdate(csvColumn, value)}>
                        <SelectTrigger className="h-8 w-32 text-xs">
                          <SelectValue placeholder="Map to..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCaptions.map((caption) => (
                            <SelectItem key={caption} value={caption}>
                              {caption}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Available Captions */}
        {availableCaptions.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Available Captions</h3>
            <div className="flex flex-wrap gap-2">
              {availableCaptions.map((caption) => (
                <Badge key={caption} variant="outline" className="text-xs">
                  {caption}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {csvColumns.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-lg font-medium">No CSV Data</p>
            <p className="text-sm">Upload a CSV file to see column mappings</p>
          </div>
        )}

        {csvColumns.length > 0 && captions.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <p className="text-lg font-medium">No Captions Defined</p>
            <p className="text-sm">Add table captions to start mapping columns</p>
          </div>
        )}

        {/* Preview Table */}
        {mappedColumns.length > 0 && csvData.length > 1 && (
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-gray-700">Preview Table</h3>
            <div className="overflow-hidden rounded-lg border">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      {mappedColumns.map((csvColumn) => (
                        <th
                          key={csvColumn}
                          className="border-r px-3 py-2 text-left font-medium text-gray-700 last:border-r-0"
                        >
                          {mappings[csvColumn]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {csvData.slice(1, 4).map((row, rowIndex) => (
                      <tr key={rowIndex} className="border-t">
                        {mappedColumns.map((csvColumn) => {
                          const columnIndex = csvColumns.indexOf(csvColumn);
                          return (
                            <td key={csvColumn} className="border-r px-3 py-2 last:border-r-0">
                              {row[columnIndex] || '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {csvData.length > 4 && (
                <div className="border-t bg-gray-50 px-3 py-2 text-xs text-gray-600">
                  Showing 3 of {csvData.length - 1} rows
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
