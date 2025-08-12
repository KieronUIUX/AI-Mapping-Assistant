import { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Gear,
  CaretDown,
  Plus,
  Trash,
  Upload,
  PaperPlaneTilt,
  FileText,
  CheckCircle,
  Warning,
  List,
} from '@phosphor-icons/react';
import { Sidebar } from '@/components/sidebar';
import { TopBar } from '@/components/top-bar';
import { UploadIcon } from '@/components/ui/upload-icon';

interface CSVColumn {
  name: string;
  index: number;
  sample: string[];
  type: string;
}

interface MappingRow {
  order: number;
  header: string;
  sample: string;
  caption: string;
  keyField: boolean;
  matchById: boolean;
  id: string;
  confidence?: number;
  suggested?: boolean;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: MappingSuggestion[];
}

interface MappingSuggestion {
  columnIndex: number;
  caption: string;
  confidence: number;
  reasoning: string;
}

const availableCaptions = [
  'Reference',
  'Org Unit',
  'Forename(s)',
  'Surname',
  'Email',
  'Job Title',
  'Manager Name',
  'Phone',
  'Department',
  'Location',
  'Start Date',
  'Employee ID',
  'First Name',
  'Last Name',
  'Full Name',
  'Username',
  'Role',
  'Status',
];

export default function DataImportMap() {
  const [importType, setImportType] = useState('module');
  const [delimiter, setDelimiter] = useState('comma');
  const [operationType, setOperationType] = useState('insert-update');
  const [hasHeader, setHasHeader] = useState(true);
  const [title, setTitle] = useState('Workday Import');
  const [description, setDescription] = useState('Example HR import form');
  const [dateFormat, setDateFormat] = useState('DD/MM/YYYY');

  // File upload and CSV data
  const [csvData, setCSVData] = useState<string[][]>([]);
  const [csvColumns, setCSVColumns] = useState<CSVColumn[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isFileUploaded, setIsFileUploaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mapping state - Initialize with predefined captions
  const [mappingRows, setMappingRows] = useState<MappingRow[]>([
    {
      id: 'row-0',
      order: 0,
      header: 'N/A',
      sample: 'N/A',
      caption: 'Reference',
      keyField: true,
      matchById: true,
    },
    {
      id: 'row-1',
      order: 1,
      header: 'N/A',
      sample: 'N/A',
      caption: 'Org Unit',
      keyField: false,
      matchById: false,
    },
    {
      id: 'row-2',
      order: 2,
      header: 'N/A',
      sample: 'N/A',
      caption: 'Forename(s)',
      keyField: false,
      matchById: false,
    },
    {
      id: 'row-3',
      order: 3,
      header: 'N/A',
      sample: 'N/A',
      caption: 'Surname',
      keyField: false,
      matchById: false,
    },
    {
      id: 'row-4',
      order: 4,
      header: 'N/A',
      sample: 'N/A',
      caption: 'Email',
      keyField: false,
      matchById: false,
    },
    {
      id: 'row-5',
      order: 5,
      header: 'N/A',
      sample: 'N/A',
      caption: 'Job Title',
      keyField: false,
      matchById: false,
    },
    {
      id: 'row-6',
      order: 6,
      header: 'N/A',
      sample: 'N/A',
      caption: 'Manager Name',
      keyField: false,
      matchById: false,
    },
  ]);

  // AI Assistant state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = useCallback(
    (csvText: string): string[][] => {
      const lines = csvText.split('\n').filter((line) => line.trim() !== '');
      const delim = delimiter === 'comma' ? ',' : '\t';

      return lines.map((line) => {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
          const char = line[i];

          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === delim && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });
    },
    [delimiter],
  );

  const analyzeCSVData = useCallback(
    (data: string[][]) => {
      if (data.length === 0) return [];

      const headerRow = hasHeader ? data[0] : null;
      const dataRows = hasHeader ? data.slice(1) : data;
      const maxColumns = Math.max(...data.map((row) => row.length));

      const columns: CSVColumn[] = [];

      for (let i = 0; i < maxColumns; i++) {
        const columnData = dataRows.map((row) => row[i] || '').filter(Boolean);
        const sample = columnData.slice(0, 3);

        // Determine column type
        let type = 'text';
        if (columnData.every((val) => !isNaN(Number(val)) && val !== '')) {
          type = 'number';
        } else if (columnData.some((val) => val.includes('@'))) {
          type = 'email';
        } else if (columnData.some((val) => /\d{1,2}\/\d{1,2}\/\d{4}/.test(val))) {
          type = 'date';
        }

        columns.push({
          name: headerRow ? headerRow[i] || `Column ${i + 1}` : `Column ${i + 1}`,
          index: i,
          sample,
          type,
        });
      }

      return columns;
    },
    [hasHeader],
  );

  const generateAIMapping = useCallback(
    (columns: CSVColumn[]): MappingSuggestion[] => {
      const suggestions: MappingSuggestion[] = [];
      const existingCaptions = mappingRows.map((row) => row.caption).filter(Boolean);

      columns.forEach((column, index) => {
        const columnName = column.name.toLowerCase();
        const sampleData = column.sample.join(' ').toLowerCase();

        let bestMatch = { caption: '', confidence: 0, reasoning: '' };

        // Smart matching logic against existing captions
        for (const caption of existingCaptions) {
          const captionLower = caption.toLowerCase();

          if (
            (captionLower.includes('forename') || captionLower.includes('first')) &&
            (columnName.includes('first') ||
              columnName.includes('forename') ||
              (column.type === 'text' && column.sample.some((s) => s.length > 0 && s.length < 20)))
          ) {
            if (bestMatch.confidence < 0.9) {
              bestMatch = {
                caption,
                confidence: 0.9,
                reasoning: 'Contains first names',
              };
            }
          } else if (
            (captionLower.includes('surname') || captionLower.includes('last')) &&
            (columnName.includes('last') ||
              columnName.includes('surname') ||
              columnName.includes('family'))
          ) {
            if (bestMatch.confidence < 0.9) {
              bestMatch = {
                caption,
                confidence: 0.9,
                reasoning: 'Contains surnames',
              };
            }
          } else if (
            captionLower.includes('email') &&
            (columnName.includes('email') || column.type === 'email')
          ) {
            if (bestMatch.confidence < 0.95) {
              bestMatch = {
                caption,
                confidence: 0.95,
                reasoning: 'Contains email addresses',
              };
            }
          } else if (
            (captionLower.includes('title') || captionLower.includes('job')) &&
            (columnName.includes('title') ||
              columnName.includes('job') ||
              columnName.includes('position'))
          ) {
            if (bestMatch.confidence < 0.8) {
              bestMatch = {
                caption,
                confidence: 0.8,
                reasoning: 'Contains job titles',
              };
            }
          } else if (
            captionLower.includes('manager') &&
            (columnName.includes('manager') || columnName.includes('supervisor'))
          ) {
            if (bestMatch.confidence < 0.8) {
              bestMatch = {
                caption,
                confidence: 0.8,
                reasoning: 'Contains manager information',
              };
            }
          } else if (
            (captionLower.includes('reference') || captionLower.includes('id')) &&
            (columnName.includes('id') ||
              columnName.includes('ref') ||
              columnName.includes('reference'))
          ) {
            if (bestMatch.confidence < 0.85) {
              bestMatch = {
                caption,
                confidence: 0.85,
                reasoning: 'Contains reference/ID data',
              };
            }
          } else if (
            (captionLower.includes('org') || captionLower.includes('unit')) &&
            (columnName.includes('org') ||
              columnName.includes('unit') ||
              columnName.includes('department'))
          ) {
            if (bestMatch.confidence < 0.8) {
              bestMatch = {
                caption,
                confidence: 0.8,
                reasoning: 'Contains organizational data',
              };
            }
          }
        }

        if (bestMatch.confidence > 0.5) {
          suggestions.push({
            columnIndex: index,
            caption: bestMatch.caption,
            confidence: bestMatch.confidence,
            reasoning: bestMatch.reasoning,
          });
        }
      });

      return suggestions;
    },
    [mappingRows],
  );

  const handleFileUpload = useCallback(
    async (file: File) => {
      if (!file || !file.name.endsWith('.csv')) {
        alert('Please select a valid CSV file');
        return;
      }

      setIsProcessing(true);
      setFileName(file.name);

      try {
        const text = await file.text();
        const parsedData = parseCSV(text);

        if (parsedData.length === 0) {
          alert('The CSV file appears to be empty');
          return;
        }

        setCSVData(parsedData);
        const columns = analyzeCSVData(parsedData);
        setCSVColumns(columns);

        // Generate AI mapping suggestions
        const suggestions = generateAIMapping(columns);

        // Update existing mapping rows with CSV data
        setMappingRows((prev) => {
          const updatedRows = [...prev];

          // First, reset all rows to show no CSV mapping
          updatedRows.forEach((row) => {
            row.header = 'N/A';
            row.sample = 'N/A';
            row.confidence = undefined;
            row.suggested = false;
          });

          // Then apply suggestions to matching captions
          suggestions.forEach((suggestion) => {
            const targetRow = updatedRows.find((row) => row.caption === suggestion.caption);
            if (targetRow) {
              const column = columns[suggestion.columnIndex];
              targetRow.header = column.name;
              targetRow.sample = column.sample[0] || 'N/A';
              targetRow.confidence = suggestion.confidence;
              targetRow.suggested = true;
            }
          });

          return updatedRows;
        });
        setIsFileUploaded(true);

        // Add initial AI message
        const welcomeMessage: ChatMessage = {
          id: `msg-${Date.now()}`,
          type: 'assistant',
          content: `Thanks! I've scanned your file "${file.name}" with ${columns.length} columns and ${parsedData.length - (hasHeader ? 1 : 0)} rows detected. Let's map it to your configured captions.`,
          timestamp: new Date(),
          suggestions,
        };

        setChatMessages([welcomeMessage]);

        // Add mapping analysis message
        setTimeout(() => {
          const analysisMessage: ChatMessage = {
            id: `msg-${Date.now() + 1}`,
            type: 'assistant',
            content: generateMappingAnalysis(suggestions, columns),
            timestamp: new Date(),
          };
          setChatMessages((prev) => [...prev, analysisMessage]);
        }, 1000);
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing the CSV file. Please check the format and try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    [parseCSV, analyzeCSVData, generateAIMapping, hasHeader],
  );

  const generateMappingAnalysis = (
    suggestions: MappingSuggestion[],
    columns: CSVColumn[],
  ): string => {
    const configuredCaptions = mappingRows.filter((row) => row.caption).length;
    const mapped = suggestions.length;
    const unmappedCaptions = mappingRows.filter(
      (row) => row.caption && !suggestions.find((s) => s.caption === row.caption),
    );
    const unmappedColumns = columns.filter(
      (_, index) => !suggestions.find((s) => s.columnIndex === index),
    );

    let message = `I've analyzed your CSV against your ${configuredCaptions} configured captions. Here's what I found:\n\n`;

    if (mapped > 0) {
      message += `✅ **Mapped (${mapped}):**\n`;
      suggestions.forEach((suggestion) => {
        const confidence = Math.round(suggestion.confidence * 100);
        const icon = confidence > 80 ? '🎯' : confidence > 60 ? '⚠️' : '❓';
        message += `${icon} ${columns[suggestion.columnIndex].name} → ${suggestion.caption} (${confidence}%)\n`;
      });
      message += '\n';
    }

    if (unmappedCaptions.length > 0) {
      message += `❌ **Unmapped Captions (${unmappedCaptions.length}):**\n`;
      unmappedCaptions.forEach((row) => {
        message += `• ${row.caption}\n`;
      });
      message += '\n';
    }

    if (unmappedColumns.length > 0) {
      message += `📋 **Unmapped CSV Columns (${unmappedColumns.length}):**\n`;
      unmappedColumns.forEach((column) => {
        message += `• ${column.name}\n`;
      });
      message += '\n';
    }

    if (unmappedCaptions.length > 0 || unmappedColumns.length > 0) {
      message += `Would you like me to help map the remaining items? I can suggest matches or you can tell me how to map them.`;
    } else {
      message += `Perfect! All your captions are mapped. You can review the mappings above.`;
    }

    return message;
  };

  const handleSendMessage = useCallback(async () => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'user',
      content: currentMessage,
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, userMessage]);
    setCurrentMessage('');
    setIsAssistantTyping(true);

    // Simulate AI processing
    setTimeout(() => {
      const response = generateAIResponse(currentMessage, mappingRows, csvColumns);
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setChatMessages((prev) => [...prev, assistantMessage]);
      setIsAssistantTyping(false);
    }, 1500);
  }, [currentMessage, mappingRows, csvColumns]);

  const generateAIResponse = (
    userInput: string,
    currentMappings: MappingRow[],
    columns: CSVColumn[],
  ): string => {
    const input = userInput.toLowerCase();

    if (input.includes('help') || input.includes('what') || input.includes('how')) {
      return 'I can help you map your CSV columns to the required fields. You can:\n\n• Ask me to suggest mappings for specific columns\n• Tell me if a mapping looks wrong\n• Ask me to explain why I suggested a particular mapping\n• Request me to map unmapped columns\n\nWhat would you like me to help with?';
    }

    if (input.includes('map') || input.includes('suggest')) {
      const unmapped = currentMappings.filter((row) => !row.caption);
      if (unmapped.length > 0) {
        return `I notice ${unmapped.length} columns still need mapping. Based on the data, here are my suggestions:\n\n${unmapped.map((row) => `• ${row.header} → I'd suggest mapping this to one of: ${availableCaptions.slice(0, 3).join(', ')}`).join('\n')}\n\nWhich would you like me to help with first?`;
      } else {
        return "All your columns are already mapped! The mapping looks complete. Is there anything you'd like me to review or change?";
      }
    }

    if (input.includes('confidence') || input.includes('sure') || input.includes('certain')) {
      const confident = currentMappings.filter((row) => row.confidence && row.confidence > 0.8);
      const uncertain = currentMappings.filter((row) => row.confidence && row.confidence <= 0.8);

      let response = `Here's my confidence breakdown:\n\n`;
      if (confident.length > 0) {
        response += `High confidence (80%+):\n${confident.map((row) => `• ${row.header} → ${row.caption}`).join('\n')}\n\n`;
      }
      if (uncertain.length > 0) {
        response += `Lower confidence:\n${uncertain.map((row) => `• ${row.header} → ${row.caption} (${Math.round((row.confidence || 0) * 100)}%)`).join('\n')}\n\n`;
      }

      response += 'Would you like me to review any of these mappings?';
      return response;
    }

    return "I understand you'd like help with the mapping. Could you be more specific? For example, you could ask me to:\n\n• 'Help map the remaining columns'\n• 'Why did you map X to Y?'\n• 'What should column Z be mapped to?'\n\nWhat would you like me to assist with?";
  };

  const updateMappingRow = useCallback((rowId: string, field: string, value: any) => {
    setMappingRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  }, []);

  const removeMappingRow = useCallback((rowId: string) => {
    setMappingRows((prev) => prev.filter((row) => row.id !== rowId));
  }, []);

  const addMappingRow = useCallback(() => {
    const newRow: MappingRow = {
      id: `row-${Date.now()}`,
      order: mappingRows.length,
      header: 'N/A',
      sample: 'N/A',
      caption: '',
      keyField: false,
      matchById: false,
    };
    setMappingRows((prev) => [...prev, newRow]);
  }, [mappingRows.length]);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Navigation Sidebar */}
      <Sidebar activeItem="Modules" />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Menu */}
        <TopBar currentPage="Data Import Map" orgUnit="East Kilbride" userName="Michael Scott" />

        {/* Page Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-[988px] mx-auto">
            <div className="rounded bg-white p-10">

              {/* Details */}
              <div className="mb-6">
                <h3 className="mb-6 text-xl font-bold text-gray-700">Details</h3>

                {/* Type of Import */}
                <div className="mb-6 flex items-start gap-10">
                  <div className="w-[336px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Type of Import</span>
                      <span className="text-xl font-medium text-red-600">*</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <div
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-blue-600"
                        onClick={() => setImportType('module')}
                      >
                        {importType === 'module' && (
                          <div className="h-4 w-4 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <span className="text-gray-700">Module</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <div
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-blue-600"
                        onClick={() => setImportType('user')}
                      >
                        {importType === 'user' && (
                          <div className="h-4 w-4 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <span className="text-gray-700">User</span>
                    </label>
                  </div>
                </div>

                {/* Module */}
                <div className="mb-6 flex items-start gap-10">
                  <div className="w-[336px]">
                    <span className="font-medium text-gray-700">Module</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-[280px] items-center rounded border border-gray-300 bg-gray-100 px-2">
                      <span className="text-gray-700">Person Register</span>
                    </div>
                    <Button className="border-3 h-9 border-blue-600 bg-transparent px-3 text-blue-600">
                      <Gear className="h-5 w-5" weight="regular" />
                      <CaretDown className="h-5 w-5" weight="regular" />
                    </Button>
                  </div>
                </div>

                {/* Title */}
                <div className="mb-6 flex items-start gap-10">
                  <div className="w-[336px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Title</span>
                      <span className="text-xl font-medium text-red-600">*</span>
                    </div>
                  </div>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="h-9 w-[280px]"
                  />
                </div>

                {/* Description */}
                <div className="mb-6 flex items-start gap-10">
                  <div className="w-[336px]">
                    <span className="font-medium text-gray-700">Description</span>
                  </div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="h-[120px] w-[303px] resize-none rounded border border-gray-300 p-2"
                  />
                </div>
              </div>

              {/* File Format Details */}
              <div className="mb-6">
                <h3 className="mb-6 text-xl font-bold text-gray-700">File Format Details</h3>

                {/* Has Header */}
                <div className="mb-6 flex items-start gap-10">
                  <div className="w-[336px]">
                    <span className="font-medium text-gray-700">Has Header</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={hasHeader}
                      onCheckedChange={(checked) => setHasHeader(checked === true)}
                      className="h-5 w-5"
                    />
                  </div>
                </div>

                {/* Delimiter */}
                <div className="mb-6 flex items-start gap-10">
                  <div className="w-[336px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Delimiter</span>
                      <span className="text-xl font-medium text-red-600">*</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <div
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-blue-600"
                        onClick={() => setDelimiter('comma')}
                      >
                        {delimiter === 'comma' && (
                          <div className="h-4 w-4 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <span className="text-gray-700">Comma</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <div
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-blue-600"
                        onClick={() => setDelimiter('tab')}
                      >
                        {delimiter === 'tab' && (
                          <div className="h-4 w-4 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <span className="text-gray-700">Tab</span>
                    </label>
                  </div>
                </div>

                {/* Import Type */}
                <div className="mb-6 flex items-start gap-10">
                  <div className="w-[336px]">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700">Import Type</span>
                      <span className="text-xl font-medium text-red-600">*</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="flex cursor-pointer items-center gap-2">
                      <div
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-blue-600"
                        onClick={() => setOperationType('insert-update')}
                      >
                        {operationType === 'insert-update' && (
                          <div className="h-4 w-4 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <span className="text-gray-700">Insert and Update</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <div
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-blue-600"
                        onClick={() => setOperationType('insert')}
                      >
                        {operationType === 'insert' && (
                          <div className="h-4 w-4 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <span className="text-gray-700">Insert</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                      <div
                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border-2 border-blue-600"
                        onClick={() => setOperationType('update')}
                      >
                        {operationType === 'update' && (
                          <div className="h-4 w-4 rounded-full bg-blue-600" />
                        )}
                      </div>
                      <span className="text-gray-700">Update</span>
                    </label>
                  </div>
                </div>

                {/* Date Format */}
                <div className="mb-6 flex items-start gap-10">
                  <div className="w-[336px]">
                    <span className="font-medium text-gray-700">Date Format</span>
                  </div>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger className="h-9 w-[280px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Warning Banner */}
              <div className="mb-6 flex items-center gap-4 rounded border border-yellow-200 bg-yellow-50 p-4">
                <Warning className="h-8 w-8 text-yellow-600" />
                <span className="text-yellow-800">
                  All required fields (indicated with *) must be mapped. Record fields must be
                  matched by ID.
                </span>
              </div>

              {/* Data Table - Always show */}
              {
                <div className="mb-6 overflow-hidden rounded border border-gray-300">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="w-12 border-r border-gray-300 p-2"></th>
                        <th className="w-16 border-r border-gray-300 p-2 text-left text-sm font-medium text-gray-700">
                          Order
                        </th>
                        <th className="w-20 border-r border-gray-300 p-2 text-left text-sm font-medium text-gray-700">
                          Header
                        </th>
                        <th className="w-24 border-r border-gray-300 p-2 text-left text-sm font-medium text-gray-700">
                          Sample Data
                        </th>
                        <th className="w-60 border-r border-gray-300 p-2 text-left text-sm font-medium text-gray-700">
                          Caption
                        </th>
                        <th className="w-20 border-r border-gray-300 p-2 text-left text-sm font-medium text-gray-700">
                          Key Field
                        </th>
                        <th className="w-24 border-r border-gray-300 p-2 text-left text-sm font-medium text-gray-700">
                          Match By ID
                        </th>
                        <th className="w-28 p-2 text-left text-sm font-medium text-gray-700"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappingRows.map((row, index) => (
                        <tr key={row.id} className="border-t border-gray-300">
                          <td className="border-r border-gray-300 p-2 text-center">
                            <List className="h-5 w-5 text-gray-600 mx-auto" weight="bold" />
                          </td>
                          <td className="border-r border-gray-300 p-2 text-sm text-gray-800">
                            {row.order}
                          </td>
                          <td className="relative border-r border-gray-300 p-2 text-sm text-gray-800">
                            {row.header}
                            {row.suggested && (
                              <CheckCircle className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                            )}
                          </td>
                          <td className="border-r border-gray-300 p-2 text-sm text-gray-800">
                            {row.sample}
                          </td>
                          <td className="border-r border-gray-300 p-2">
                            <Select
                              value={row.caption}
                              onValueChange={(value) => updateMappingRow(row.id, 'caption', value)}
                            >
                              <SelectTrigger className="h-8 w-full text-sm">
                                <SelectValue placeholder="Select caption..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableCaptions.map((caption) => (
                                  <SelectItem key={caption} value={caption}>
                                    {caption}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="border-r border-gray-300 p-2 text-center">
                            <Checkbox
                              checked={row.keyField}
                              onCheckedChange={(checked) =>
                                updateMappingRow(row.id, 'keyField', checked)
                              }
                              className="h-5 w-5"
                            />
                          </td>
                          <td className="border-r border-gray-300 p-2 text-center">
                            <Checkbox
                              checked={row.matchById}
                              onCheckedChange={(checked) =>
                                updateMappingRow(row.id, 'matchById', checked)
                              }
                              className="h-5 w-5"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              variant="destructive"
                              size="sm"
                              className="h-8 bg-red-600 px-3 hover:bg-red-700"
                              onClick={() => removeMappingRow(row.id)}
                            >
                              <Trash className="mr-1 h-5 w-5" weight="regular" />
                              Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              }

              {/* Add Button - Always show */}
              <Button className="mb-6 bg-blue-600 hover:bg-blue-700" onClick={addMappingRow}>
                <Plus className="mr-2 h-5 w-5" weight="regular" />
                Add
              </Button>

              <div className="mb-6 h-px w-full bg-gray-300"></div>

              {/* Data Mapping Assistant */}
              <div className="mb-6">
                <h3 className="mb-6 text-xl font-bold text-gray-700">Data Mapping Assistant</h3>

                {!isFileUploaded ? (
                  <div className="flex flex-col items-center gap-6 py-12">
                    <div className="w-25 h-25 text-gray-400">
                      <UploadIcon 
                        className="w-full h-full" 
                        size="lg"
                        alt="Upload CSV Data"
                      />
                    </div>

                    <div className="space-y-3 text-center">
                      <h4 className="font-medium text-gray-800">Upload Your CSV Data</h4>
                      <p className="max-w-[296px] text-sm text-gray-600">
                        Upload your CSV file and I'll help map the columns to your configured
                        captions above. The AI assistant will suggest the best matches.
                      </p>
                    </div>

                    <Button
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleUploadClick}
                      disabled={isProcessing}
                    >
                      <Upload className="mr-2 h-5 w-5" weight="regular" />
                      {isProcessing ? 'Processing...' : 'Upload File'}
                    </Button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={handleFileInputChange}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="rounded-lg border border-gray-300 p-4">
                    {/* File Info */}
                    <div className="mb-4 flex items-center gap-3 rounded border border-green-200 bg-green-50 p-3">
                      <FileText className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-800">{fileName}</span>
                      <span className="text-sm text-green-600">
                        ({csvColumns.length} columns, {csvData.length - (hasHeader ? 1 : 0)} rows)
                      </span>
                    </div>

                    {/* Chat Interface */}
                    <div className="space-y-4">
                      {/* Messages */}
                      <div className="max-h-64 space-y-3 overflow-y-auto rounded bg-gray-50 p-3">
                        {chatMessages.map((message) => (
                          <div
                            key={message.id}
                            className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[80%] rounded-lg p-3 ${
                                message.type === 'user'
                                  ? 'bg-blue-600 text-white'
                                  : 'border border-gray-200 bg-white text-gray-800'
                              }`}
                            >
                              <div className="whitespace-pre-wrap">{message.content}</div>
                            </div>
                          </div>
                        ))}

                        {isAssistantTyping && (
                          <div className="flex justify-start">
                            <div className="rounded-lg border border-gray-200 bg-white p-3 text-gray-800">
                              <div className="flex items-center gap-2">
                                <div className="flex gap-1">
                                  <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400"></div>
                                  <div
                                    className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                                    style={{ animationDelay: '0.1s' }}
                                  ></div>
                                  <div
                                    className="h-2 w-2 animate-bounce rounded-full bg-gray-400"
                                    style={{ animationDelay: '0.2s' }}
                                  ></div>
                                </div>
                                <span className="text-sm text-gray-600">
                                  Assistant is typing...
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Input */}
                      <div className="flex gap-2">
                        <Input
                          value={currentMessage}
                          onChange={(e) => setCurrentMessage(e.target.value)}
                          placeholder="Type here to speak to the assistant"
                          className="flex-1"
                          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        />
                        <Button
                          onClick={handleSendMessage}
                          disabled={!currentMessage.trim() || isAssistantTyping}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          <PaperPlaneTilt className="h-5 w-5" weight="regular" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
