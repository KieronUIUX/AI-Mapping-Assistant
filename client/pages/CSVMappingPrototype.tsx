import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CSVUpload } from '@/components/csv-upload';
import { TableCaptions } from '@/components/table-captions';
import { AIChat } from '@/components/ai-chat';
import { MappingDisplay } from '@/components/mapping-display';
import { mockCSVData, suggestedCaptions, getSuggestedCaptionsForData } from '@/lib/mock-data';
import { FileXls, ChatCircle, Gear, Eye } from '@phosphor-icons/react';

export default function CSVMappingPrototype() {
  const [csvData, setCSVData] = useState<string[][]>([]);
  const [fileName, setFileName] = useState('');
  const [captions, setCaptions] = useState<string[]>([]);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState('upload');

  const csvColumns = csvData.length > 0 ? csvData[0] : [];

  const handleFileUpload = (data: string[][], name: string) => {
    setCSVData(data);
    setFileName(name);
    setMappings({}); // Reset mappings when new file is uploaded

    // Auto-suggest captions based on CSV column names
    const suggested = getSuggestedCaptionsForData(data[0]);
    if (captions.length === 0) {
      setCaptions(suggested.slice(0, Math.min(data[0].length, 6)));
    }

    // Auto-advance to captions tab
    setActiveTab('captions');
  };

  const handleCaptionsChange = (newCaptions: string[]) => {
    setCaptions(newCaptions);
  };

  const handleMappingUpdate = (csvColumn: string, caption: string) => {
    setMappings((prev) => ({
      ...prev,
      [csvColumn]: caption,
    }));
  };

  const handleMappingRemove = (csvColumn: string) => {
    setMappings((prev) => {
      const newMappings = { ...prev };
      delete newMappings[csvColumn];
      return newMappings;
    });
  };

  const loadSampleData = (datasetKey: keyof typeof mockCSVData) => {
    const dataset = mockCSVData[datasetKey];
    handleFileUpload(dataset.data, dataset.filename);
  };

  const getTabProgress = () => {
    const hasCSV = csvData.length > 0;
    const hasCaptions = captions.length > 0;
    const hasMappings = Object.keys(mappings).length > 0;

    return {
      upload: hasCSV,
      captions: hasCaptions,
      mapping: hasMappings,
      complete: hasCSV && hasCaptions && Object.keys(mappings).length === csvColumns.length,
    };
  };

  const progress = getTabProgress();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">CSV Column Mapping Prototype</h1>
          <p className="mx-auto max-w-2xl text-lg text-gray-600">
            Upload a CSV file, define table captions, and let our AI assistant help you map columns
            to create your perfect data table.
          </p>
        </div>

        {/* Quick Demo Section */}
        {csvData.length === 0 && (
          <div className="mb-6 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Try with Sample Data</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Object.entries(mockCSVData).map(([key, dataset]) => (
                <Button
                  key={key}
                  variant="outline"
                  onClick={() => loadSampleData(key as keyof typeof mockCSVData)}
                  className="flex h-auto flex-col items-center space-y-2 p-4"
                >
                  <FileXls className="h-6 w-6" weight="regular" />
                  <span className="font-medium capitalize">{key}</span>
                  <span className="text-xs text-gray-500">{dataset.filename}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 bg-white shadow-sm">
            <TabsTrigger value="upload" className="flex items-center space-x-2">
              <FileXls className="h-4 w-4" weight="regular" />
              <span>Upload CSV</span>
              {progress.upload && <div className="ml-1 h-2 w-2 rounded-full bg-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="captions" className="flex items-center space-x-2" disabled={!progress.upload}>
              <Gear className="h-4 w-4" weight="regular" />
              <span>Set Captions</span>
              {progress.captions && <div className="ml-1 h-2 w-2 rounded-full bg-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="mapping" className="flex items-center space-x-2" disabled={!progress.captions}>
              <ChatCircle className="h-4 w-4" weight="regular" />
              <span>AI Mapping</span>
              {progress.mapping && <div className="ml-1 h-2 w-2 rounded-full bg-green-500" />}
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center space-x-2" disabled={!progress.mapping}>
              <Eye className="h-4 w-4" weight="regular" />
              <span>Preview</span>
              {progress.complete && <div className="ml-1 h-2 w-2 rounded-full bg-green-500" />}
            </TabsTrigger>
          </TabsList>

          {/* Tab Contents */}
          <TabsContent value="upload" className="space-y-6">
            <CSVUpload onFileUpload={handleFileUpload} />

            {csvData.length > 0 && (
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h3 className="mb-4 text-lg font-semibold">CSV Preview</h3>
                <div className="mb-4 text-sm text-gray-600">
                  File: <span className="font-medium">{fileName}</span> • Columns:{' '}
                  <span className="font-medium">{csvColumns.length}</span> • Rows:{' '}
                  <span className="font-medium">{csvData.length - 1}</span>
                </div>
                <div className="overflow-hidden rounded-lg border">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {csvColumns.map((column, index) => (
                            <th
                              key={index}
                              className="border-r px-3 py-2 text-left font-medium text-gray-700 last:border-r-0"
                            >
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(1, 4).map((row, rowIndex) => (
                          <tr key={rowIndex} className="border-t">
                            {row.map((cell, cellIndex) => (
                              <td key={cellIndex} className="border-r px-3 py-2 last:border-r-0">
                                {cell || '-'}
                              </td>
                            ))}
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
                <div className="mt-4 flex justify-end">
                  <Button onClick={() => setActiveTab('captions')}>Next: Set Captions →</Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="captions" className="space-y-6">
            <TableCaptions captions={captions} onCaptionsChange={handleCaptionsChange} />
            {captions.length > 0 && (
              <div className="flex justify-end">
                <Button onClick={() => setActiveTab('mapping')}>Next: AI Mapping →</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="mapping" className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <AIChat
                csvColumns={csvColumns}
                captions={captions}
                currentMappings={mappings}
                onMappingUpdate={handleMappingUpdate}
                onMappingRemove={handleMappingRemove}
              />
            </div>
            <div className="space-y-6">
              <MappingDisplay
                csvColumns={csvColumns}
                captions={captions}
                mappings={mappings}
                csvData={csvData}
                onMappingUpdate={handleMappingUpdate}
                onMappingRemove={handleMappingRemove}
              />
              {Object.keys(mappings).length > 0 && (
                <div className="flex justify-end">
                  <Button onClick={() => setActiveTab('preview')}>View Preview →</Button>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="preview" className="space-y-6">
            <MappingDisplay
              csvColumns={csvColumns}
              captions={captions}
              mappings={mappings}
              csvData={csvData}
              onMappingUpdate={handleMappingUpdate}
              onMappingRemove={handleMappingRemove}
            />

            {progress.complete && (
              <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
                <div className="mb-2 text-lg font-semibold text-green-800">
                  🎉 Mapping Complete!
                </div>
                <p className="text-green-700">
                  All {csvColumns.length} columns have been successfully mapped to your captions.
                  Your data is ready for use!
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
