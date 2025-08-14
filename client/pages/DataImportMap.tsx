import { useState, useRef, useCallback, useEffect } from 'react';
// import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
// (Removed duplicate import of Select and Checkbox)
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Gear,
  CaretDown,
  Upload,
  PaperPlaneTilt,
  FileText,
  CheckCircle,
  Warning,
  List,
  Sparkle,
  WarningCircle,
  Check,
  // WarningOctagon, // Removed duplicate import
  Info,
  WarningOctagon,
} from '@phosphor-icons/react';
import { CheckCircle as LCheckCircle, AlertTriangle as LAlertTriangle, XCircle as LXCircle, Bot, User as LUser, Sparkles } from 'lucide-react';
import { Sidebar } from '@/components/sidebar';
import { TopBar } from '@/components/top-bar';
import { UploadIcon } from '@/components/ui/upload-icon';
import { DetailsForm } from '../components/DetailsForm';
// import { WarningBanner } from '../components/WarningBanner';
// import { MappingTable } from '../components/MappingTable';

interface CSVColumn {
  name: string;
  index: number;
  sample: string[];
  type: string;
}

interface MappingRow {
  id: string;
  order: number;
  header: string;
  sample: string;
  caption: string;
  keyField: boolean;
  matchById: boolean;
  confidence?: number;
  suggested?: boolean;
  confirmed?: boolean;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: MappingSuggestion[];
  // Structured suggestion lists for rich rendering
  certainList?: Array<{ csvColumn: string; targetCaption: string; confidence: number }>;
  uncertainList?: Array<{ csvColumn: string; targetCaption: string; confidence: number }>;
  unmappedList?: string[];
  cta?: 'generate_csv' | 'take_guess';
  // Validation issues for rich rendering
  validationIssues?: Array<{ caption: string; count: number; samples: number[]; rule: string; sampleValues: string[] }>;
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
  const [hasPromptedForCSV, setHasPromptedForCSV] = useState(false);

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

  // Heuristic suggestion engine (used locally; no external model)
  // Reintroduce a robust client-side heuristic as a fallback to improve matching quality
  const computeHeuristicSuggestions = useCallback(
    (
      columns: CSVColumn[],
      captionsList: string[],
    ): Array<{ csvColumn: string; targetCaption: string; confidence: number }> => {
      const normalize = (s: string) =>
        s
          .toLowerCase()
          .replace(/\([^)]*\)/g, ' ')
          .replace(/[^a-z0-9]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const captionSynonyms: Record<string, string[]> = {
        'Forename(s)': ['forename', 'forenames', 'first name', 'firstname', 'given name', 'givenname', 'given'],
        'First Name': ['first name', 'firstname', 'forename', 'given name', 'givenname', 'given'],
        'Surname': ['surname', 'last name', 'lastname', 'family name', 'familyname'],
        'Last Name': ['last name', 'lastname', 'surname', 'family name', 'familyname'],
        'Full Name': ['full name', 'fullname', 'name', 'employee name', 'staff name'],
        Email: ['email', 'e-mail', 'email address', 'mail'],
        'Job Title': ['job title', 'title', 'position', 'job role'],
        'Manager Name': ['manager', 'line manager', 'supervisor'],
        Phone: ['phone', 'telephone', 'tel', 'mobile', 'cell'],
        Department: ['department', 'dept'],
        'Org Unit': ['org unit', 'organisation unit', 'organization unit', 'business unit', 'division', 'org', 'organization', 'organisation'],
        'Start Date': ['start date', 'hire date', 'commencement date', 'joining date', 'date started'],
        'Employee ID': ['employee id', 'emp id', 'employee number', 'staff id', 'worker id', 'personnel number', 'payroll number', 'employee code', 'emp no', 'employee_no', 'employeeid'],
        Reference: ['reference', 'ref', 'external id', 'external reference'],
        Username: ['username', 'user name', 'login', 'login name'],
        Role: ['role', 'user role', 'permission role'],
        Status: ['status', 'state', 'active', 'enabled', 'inactive'],
        Location: ['location', 'site', 'office'],
      };

      // Build quick lookup for column types to boost relevant captions
      const columnTypeBoost: Record<number, Record<string, number>> = {};
      for (const col of columns) {
        columnTypeBoost[col.index] = {};
        if (col.type === 'email') {
          columnTypeBoost[col.index]['Email'] = 0.3;
          columnTypeBoost[col.index]['Username'] = 0.1;
        }
        if (col.type === 'date') {
          columnTypeBoost[col.index]['Start Date'] = 0.3;
        }
        if (col.type === 'number') {
          columnTypeBoost[col.index]['Employee ID'] = 0.15;
          columnTypeBoost[col.index]['Reference'] = 0.1;
        }
      }

      const columnNames = columns.map((c) => c.name);
      const normalizedColumns = columnNames.map((n) => normalize(n));

      const results: Array<{ csvColumn: string; targetCaption: string; confidence: number }> = [];

      // For each caption, find best matching column
      for (const caption of captionsList) {
        const normCaption = normalize(caption);
        const syns = captionSynonyms[caption] || [caption];
        const normalizedSyns = syns.map((s) => normalize(s));

        let bestIdx = -1;
        let bestScore = 0;

        normalizedColumns.forEach((normCol, idx) => {
          let score = 0;

          // Exact and containment checks
          if (normCol === normCaption) score = Math.max(score, 1.0);
          if (normCol.includes(normCaption) || normCaption.includes(normCol)) score = Math.max(score, 0.9);

          // Synonym containment
          for (const s of normalizedSyns) {
            if (!s) continue;
            if (normCol === s) score = Math.max(score, 0.98);
            if (normCol.includes(s) || s.includes(normCol)) score = Math.max(score, 0.92);
          }

          // Token overlap (Jaccard)
          const colTokens = new Set(normCol.split(' '));
          const capTokens = new Set(normCaption.split(' '));
          const intersection = new Set([...colTokens].filter((t) => capTokens.has(t)));
          const union = new Set([...colTokens, ...capTokens]);
          const jaccard = union.size > 0 ? intersection.size / union.size : 0;
          score = Math.max(score, 0.6 * jaccard);

          // ID-like boosts
          if (/(^|\s)(id|code|number|no)($|\s)/.test(normCol)) {
            if (caption === 'Employee ID') score += 0.25;
            if (caption === 'Reference') score += 0.15;
          }

          // Department vs Org Unit nuances
          if (/\bdept\b|department/.test(normCol)) {
            if (caption === 'Department') score += 0.25;
            if (caption === 'Org Unit') score -= 0.05;
          }
          if (/org|organisation|organization|business unit|division/.test(normCol)) {
            if (caption === 'Org Unit') score += 0.2;
          }

          // Type-based boosts
          const typeBoost = columnTypeBoost[columns[idx].index] || {};
          if (typeBoost[caption]) score += typeBoost[caption];

          // Clamp and track best
          score = Math.max(0, Math.min(1, score));
          if (score > bestScore) {
            bestScore = score;
            bestIdx = idx;
          }
        });

        if (bestIdx >= 0 && bestScore >= 0.72) {
          results.push({ csvColumn: columnNames[bestIdx], targetCaption: caption, confidence: Number(bestScore.toFixed(2)) });
        }
      }

      // Ensure unique columns (if two captions chose the same column, keep the higher score)
      const uniqueByColumn = new Map<string, { csvColumn: string; targetCaption: string; confidence: number }>();
      for (const r of results) {
        const prev = uniqueByColumn.get(r.csvColumn);
        if (!prev || r.confidence > prev.confidence) uniqueByColumn.set(r.csvColumn, r);
      }
      return Array.from(uniqueByColumn.values());
    },
    [],
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

        // Request initial mapping suggestions from mock serverless function
        const simpleColumns = columns.map((c) => c.name);
        const captions = mappingRows.map((row) => row.caption).filter(Boolean) as string[];
        const resp = await fetch('/.netlify/functions/ai-chat-mock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType: 'initial_suggestions',
            csvColumns: simpleColumns,
            captions,
            currentMappings: {},
          }),
        });

        let mappingSuggestions: Array<{ csvColumn: string; targetCaption: string; confidence: number }> = [];
        let provider = 'mock';
        let model = 'local-simulator';
        if (resp.ok) {
          const data = await resp.json();
          mappingSuggestions = data.mappingSuggestions || (data.mappingSuggestion ? [data.mappingSuggestion] : []);
          provider = data.provider || provider;
          model = data.model || model;
        } else {
          console.error('Mock initial suggestions failed:', resp.status, resp.statusText);
        }

        // Heuristic fallback or augmentation when AI returns weak/no results
        try {
          const captionsList = mappingRows.map((row) => row.caption).filter(Boolean) as string[];
          const heuristic = computeHeuristicSuggestions(columns, captionsList);
          const already = new Set(mappingSuggestions.map((s) => `${s.csvColumn}::${s.targetCaption}`));
          for (const h of heuristic) {
            const key = `${h.csvColumn}::${h.targetCaption}`;
            if (!already.has(key)) mappingSuggestions.push(h);
          }
          if (heuristic.length > 0) {
            provider = `${provider}+local`;
          }
        } catch (e) {
          console.warn('Heuristic suggestions failed:', e);
        }

        // Decide which suggestions are "certain" (auto-confirm) vs "uncertain" (require user confirmation)
        const normalize = (s: string) =>
          s
            .toLowerCase()
            .replace(/\([^)]*\)/g, ' ')
            .replace(/[^a-z0-9]+/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

        const captionSynonyms: Record<string, string[]> = {
          'Forename(s)': ['forename', 'forenames', 'first name', 'firstname', 'given name', 'givenname', 'given'],
          'First Name': ['first name', 'firstname', 'forename', 'given name', 'givenname', 'given'],
          Surname: ['surname', 'last name', 'lastname', 'family name', 'familyname'],
          'Last Name': ['last name', 'lastname', 'surname', 'family name', 'familyname'],
          'Full Name': ['full name', 'fullname', 'name', 'employee name', 'staff name'],
          Email: ['email', 'e-mail', 'email address', 'mail'],
          'Job Title': ['job title', 'title', 'position', 'job role'],
          'Manager Name': ['manager', 'line manager', 'supervisor'],
          Phone: ['phone', 'telephone', 'tel', 'mobile', 'cell'],
          Department: ['department', 'dept'],
          'Org Unit': ['org unit', 'organisation unit', 'organization unit', 'business unit', 'division', 'org', 'organization', 'organisation'],
          'Start Date': ['start date', 'hire date', 'commencement date', 'joining date', 'date started'],
          'Employee ID': ['employee id', 'emp id', 'employee number', 'staff id', 'worker id', 'personnel number', 'payroll number', 'employee code', 'emp no', 'employee_no', 'employeeid'],
          Reference: ['reference', 'ref', 'external id', 'external reference'],
          Username: ['username', 'user name', 'login', 'login name'],
          Role: ['role', 'user role', 'permission role'],
          Status: ['status', 'state', 'active', 'enabled', 'inactive'],
          Location: ['location', 'site', 'office'],
        };

        const isCertain = (colName: string, caption: string, confidence: number): boolean => {
          const nCol = normalize(colName);
          const nCap = normalize(caption);
          if (!nCol || !nCap) return false;
          if (nCol === nCap) return true; // exact match
          const syns = captionSynonyms[caption] || [];
          if (syns.some((s) => normalize(s) === nCol)) return true; // exact synonym match
          // very strong confidence from heuristic path
          return confidence >= 0.97;
        };

        const certain: Array<{ csvColumn: string; targetCaption: string; confidence: number }> = [];
        const uncertain: Array<{ csvColumn: string; targetCaption: string; confidence: number }> = [];
        for (const s of mappingSuggestions) {
          if (isCertain(s.csvColumn, s.targetCaption, s.confidence)) {
            certain.push(s);
          } else {
            uncertain.push(s);
          }
        }

        // Apply only the certain mappings now; leave others for the user to confirm
        setMappingRows((prev) => {
          const updated = prev.map((row) => ({ ...row, header: row.header, sample: row.sample, confidence: row.confidence, suggested: row.suggested, confirmed: row.confirmed || false }));
          // Reset any previous auto suggestions for a clean slate on re-upload
          for (const r of updated) {
            if (!r.confirmed) {
              r.header = 'N/A';
              r.sample = 'N/A';
              r.confidence = undefined;
              r.suggested = false;
            }
          }
          certain.forEach((s) => {
            const row = updated.find((r) => r.caption === s.targetCaption);
            const col = columns.find((c) => c.name === s.csvColumn);
            if (row && col) {
              row.header = col.name;
              row.sample = col.sample[0] || 'N/A';
              row.confidence = s.confidence;
              row.suggested = true;
              row.confirmed = true; // auto-confirm these
            }
          });
          // Populate uncertain mappings as suggestions (not confirmed) so they are visible in the table
          uncertain.forEach((s) => {
            const row = updated.find((r) => r.caption === s.targetCaption);
            const col = columns.find((c) => c.name === s.csvColumn);
            if (row && col && row.confirmed !== true) {
              row.header = col.name;
              row.sample = col.sample[0] || 'N/A';
              row.confidence = s.confidence;
              row.suggested = true;
              row.confirmed = false;
            }
          });
          return updated;
        });

        setIsFileUploaded(true);

        // Conversational summary showing certain vs uncertain and how to confirm
        const totalCaptions = mappingRows.filter((r) => !!r.caption).length || mappingRows.length;
        const coveragePct = totalCaptions > 0 ? Math.round(((certain.length + 0) / totalCaptions) * 100) : 0;
        const certainBullets = certain
          .slice(0, 8)
          .map((s) => `• ${s.csvColumn} → ${s.targetCaption} (${Math.round(s.confidence * 100)}%)`)
          .join('\n');
        const uncertainBullets = uncertain
          .slice(0, 12)
          .map((s) => `• ${s.csvColumn} → ${s.targetCaption} (${Math.round(s.confidence * 100)}%)`)
          .join('\n');

        const summaryLines: string[] = [];
        const rowCount = parsedData.length - (hasHeader ? 1 : 0);
        summaryLines.push(`I’ve analyzed “${file.name}” (${columns.length} columns, ${rowCount} rows).`);
        if (certain.length > 0) {
          summaryLines.push(`I’ve auto‑applied the following strong matches:`);
          summaryLines.push(certainBullets);
        }
        if (uncertain.length > 0) {
          summaryLines.push(`I’m less confident about the following. Please confirm by saying, for example: Map "Email Address" to "Email".`);
          summaryLines.push(uncertainBullets);
        }
        if (certain.length === 0 && uncertain.length === 0) {
          summaryLines.push('I could not suggest any mappings yet. Tell me a caption (e.g., "Email") and I’ll suggest the best CSV column.');
        }
        summaryLines.push(`Confirmed so far: ${certain.length}/${totalCaptions} (${coveragePct}% coverage).`);

        // Simulate assistant typing with small delays for a friendlier conversational feel
        const nowBase = Date.now();
        const introMessage: ChatMessage = {
          id: `msg-${nowBase}`,
          type: 'assistant',
          content: `Thanks! I’ve scanned your file — ${columns.length} column${columns.length === 1 ? '' : 's'} and ${rowCount} row${rowCount === 1 ? '' : 's'} detected. Let’s map it to your configured fields.`,
          timestamp: new Date(),
        };
        const cardsMessage: ChatMessage = {
          id: `msg-${nowBase + 1}`,
          type: 'assistant',
          content: summaryLines.filter(Boolean).join('\n'),
          certainList: certain,
          uncertainList: uncertain,
          unmappedList: [],
          cta: uncertain.length > 0 ? 'take_guess' : undefined,
          timestamp: new Date(),
        };

        setIsAssistantTyping(true);
        setTimeout(() => {
          setChatMessages((prev) => [...prev, introMessage]);
          setIsAssistantTyping(false);
          setIsAssistantTyping(true);
          setTimeout(() => {
            setChatMessages((prev) => [...prev, cardsMessage]);
            setIsAssistantTyping(false);
          }, 700);
        }, 600);
      } catch (error) {
        console.error('Error processing file:', error);
        alert('Error processing the CSV file. Please check the format and try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    [parseCSV, analyzeCSVData, hasHeader, mappingRows],
  );

  // Removed local generateMappingAnalysis

  // Data fixing functionality
  const fixDataValidationIssue = useCallback(
    (caption: string, oldValue: string, newValue: string, rowNumber: number) => {
      setCSVData((prev) => {
        const updated = prev.map((row, index) => {
          // Adjust for header row if present
          const dataRowIndex = hasHeader ? index - 1 : index;
          if (dataRowIndex === rowNumber - 1) {
            // Find the column index for this caption
            const mappingRow = mappingRows.find((r) => r.caption === caption);
            if (mappingRow && mappingRow.header && mappingRow.header !== 'N/A') {
              const columnIndex = csvColumns.findIndex((c) => c.name === mappingRow.header);
              if (columnIndex >= 0) {
                const newRow = [...row];
                newRow[columnIndex] = newValue;
                return newRow;
              }
            }
          }
          return row;
        });
        return updated;
      });

      // Update sample data in mapping rows
      setMappingRows((prev) => {
        const updated = prev.map((row) => {
          if (row.caption === caption && row.header && row.header !== 'N/A') {
            const columnIndex = csvColumns.findIndex((c) => c.name === row.header);
            if (columnIndex >= 0) {
              // Update sample to show the corrected value
              const newSample = csvData[hasHeader ? 1 : 0]?.[columnIndex] || 'N/A';
              return { ...row, sample: newSample };
            }
          }
          return row;
        });
        return updated;
      });

      const confirm: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content: `Fixed: Updated ${caption} in row ${rowNumber} from "${oldValue}" to "${newValue}"`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, confirm]);
    },
    [csvColumns, mappingRows, hasHeader, csvData],
  );

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

    // Check if this is a data fixing request
    const dataFixPattern = /(?:update|fix|change|correct)\s+(?:sample\s+)?row\s+(\d+)\s+(?:the\s+)?(\w+(?:\s+\w+)*)\s+(?:to|as)\s+["']?([^"']+)["']?/i;
    const match = currentMessage.match(dataFixPattern);
    
    if (match) {
      const [, rowNumberStr, caption, newValue] = match;
      const rowNumber = parseInt(rowNumberStr, 10);
      
      // Find the most recent validation issues to get the old value
      const recentValidationMessage = chatMessages
        .slice()
        .reverse()
        .find(msg => msg.validationIssues && msg.validationIssues.length > 0);
      
      if (recentValidationMessage && recentValidationMessage.validationIssues) {
        const issue = recentValidationMessage.validationIssues.find(iss => 
          iss.caption.toLowerCase().includes(caption.toLowerCase()) ||
          caption.toLowerCase().includes(iss.caption.toLowerCase())
        );
        
        if (issue && issue.sampleValues.length > 0) {
          const oldValue = issue.sampleValues[0]; // Use the first sample value
          fixDataValidationIssue(issue.caption, oldValue, newValue, rowNumber);
          setIsAssistantTyping(false);
          return;
        }
      }
      
      // If we can't find the validation issue, just acknowledge the request
      const ackMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content: `I'll help you fix the data. Please make sure the row number and field name match the validation issues shown above.`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, ackMessage]);
      setIsAssistantTyping(false);
      return;
    }

    // Call serverless AI mock with current context
    try {
      const simpleCsvColumns = csvColumns.map((c) => c.name);
      const captions = mappingRows.map((row) => row.caption).filter(Boolean) as string[];
      const currentMappings = mappingRows.reduce<Record<string, string>>((acc, row) => {
        if (row.header && row.header !== 'N/A' && row.caption) {
          acc[row.header] = row.caption;
        }
        return acc;
      }, {});

      const response = await fetch('/.netlify/functions/ai-chat-mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: currentMessage,
          csvColumns: simpleCsvColumns,
          captions,
          currentMappings,
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`${response.status} ${errText}`);
      }

      const data: {
        content: string;
        mappingSuggestion?: { csvColumn: string; targetCaption: string; confidence: number };
        provider?: string;
        model?: string;
      } = await response.json();

      // Post AI content message
      const assistantMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content: `${data.content}`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);

      // If AI suggested a mapping, apply it to the table
      if (data.mappingSuggestion) {
        const { csvColumn, targetCaption, confidence } = data.mappingSuggestion;

        setMappingRows((prev) => {
          const updated = prev.map((row) => ({ ...row }));
          const targetRow = updated.find((row) => row.caption === targetCaption);
          const targetColumn = csvColumns.find((c) => c.name === csvColumn);
          if (targetRow && targetColumn) {
            targetRow.header = targetColumn.name;
            targetRow.sample = targetColumn.sample[0] || 'N/A';
            targetRow.confidence = confidence;
            targetRow.suggested = true;
            targetRow.confirmed = true; // user-initiated confirmation via chat
          }
          return updated;
        });

        // Also add a brief confirmation message
        const confirm: ChatMessage = {
          id: `msg-${Date.now() + 1}`,
          type: 'assistant',
          content: `Suggestion: ${csvColumn} → ${targetCaption} (${Math.round(confidence * 100)}% match)`,
          timestamp: new Date(),
        };
        setChatMessages((prev) => [...prev, confirm]);
      }
    } catch (error) {
      console.error('AI request failed:', error);
      const failureMessage: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content:
          'There was a problem contacting the AI service. Please check your API key and network, then try again.',
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, failureMessage]);
    } finally {
      setIsAssistantTyping(false);
    }
  }, [currentMessage, mappingRows, csvColumns, chatMessages, fixDataValidationIssue]);

  // Quick confirm helpers for suggestions rendered inside chat
  const quickConfirm = useCallback(
    (csvColumn: string, targetCaption: string, confidence: number) => {
      setMappingRows((prev) => {
        const updated = prev.map((row) => ({ ...row }));
        const targetRow = updated.find((row) => row.caption === targetCaption);
        const targetColumn = csvColumns.find((c) => c.name === csvColumn);
        if (targetRow && targetColumn) {
          targetRow.header = targetColumn.name;
          targetRow.sample = targetColumn.sample[0] || 'N/A';
          targetRow.confidence = confidence;
          targetRow.suggested = true;
          targetRow.confirmed = true;
        }
        return updated;
      });

      const confirm: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content: `Confirmed: ${csvColumn} → ${targetCaption} (${Math.round(confidence * 100)}%)`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, confirm]);
    },
    [csvColumns],
  );

  const quickConfirmAll = useCallback(
    (items: Array<{ csvColumn: string; targetCaption: string; confidence: number }>) => {
      if (!items || items.length === 0) return;
      setMappingRows((prev) => {
        const updated = prev.map((row) => ({ ...row }));
        for (const s of items) {
          const targetRow = updated.find((row) => row.caption === s.targetCaption);
          const targetColumn = csvColumns.find((c) => c.name === s.csvColumn);
          if (targetRow && targetColumn) {
            targetRow.header = targetColumn.name;
            targetRow.sample = targetColumn.sample[0] || 'N/A';
            targetRow.confidence = s.confidence;
            targetRow.suggested = true;
            targetRow.confirmed = true;
          }
        }
        return updated;
      });
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          type: 'assistant',
          content: `Confirmed ${items.length} mapping${items.length === 1 ? '' : 's'} from suggestions.`,
          timestamp: new Date(),
        },
      ]);
    },
    [csvColumns],
  );

  // Removed unused simulated generateAIResponse

  const updateMappingRow = useCallback((rowId: string, field: string, value: any) => {
    setMappingRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row)),
    );
  }, []);

  const removeMappingRow = useCallback((rowId: string) => {
    setMappingRows((prev) => prev.filter((row) => row.id !== rowId));
  }, []);

  const addMappingRow = useCallback(() => {
    setMappingRows((prev) => {
      const newRow: MappingRow = {
        id: `row-${Date.now()}`,
        order: prev.length,
        header: 'N/A',
        sample: 'N/A',
        caption: '',
        keyField: false,
        matchById: false,
      };
      return [...prev, newRow];
    });
  }, []);

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Build and download merged CSV using captions as headers
  const handleGenerateCSV = useCallback(() => {
    if (!csvData || csvData.length === 0) return;
    const dataRows = hasHeader ? csvData.slice(1) : csvData;

    // Determine mapped rows in display order
    const effectiveRows = mappingRows
      .filter((r) => r.caption && r.confirmed === true && r.header && r.header !== 'N/A')
      .sort((a, b) => a.order - b.order);

    const totalCaptions = mappingRows.filter((r) => !!r.caption).length || mappingRows.length;
    const confirmedCount = mappingRows.filter((r) => r.caption && r.confirmed === true).length;

    if (effectiveRows.length === 0 || confirmedCount !== totalCaptions) {
      const m: ChatMessage = {
        id: `msg-${Date.now()}`,
        type: 'assistant',
        content:
          confirmedCount === 0
            ? 'There are no confirmed mappings to export yet. Confirm at least one caption-to-column mapping.'
            : `Not all captions are confirmed (${confirmedCount}/${totalCaptions}). Please confirm the remaining suggestions before generating the CSV.`,
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, m]);
      return;
    }

    const headerRow = effectiveRows.map((r) => r.caption);
    const columnIndices = effectiveRows.map((r) => {
      const col = csvColumns.find((c) => c.name === r.header);
      return col ? col.index : -1;
    });

    const escapeCSV = (value: string) => {
      const needsQuote = /[",\n]/.test(value);
      const escaped = value.replace(/"/g, '""');
      return needsQuote ? `"${escaped}"` : escaped;
    };

    const output: string[] = [];
    output.push(headerRow.map((h) => escapeCSV(String(h || ''))).join(','));
    for (const row of dataRows) {
      const outRow = columnIndices.map((idx) => (idx >= 0 ? String(row[idx] ?? '') : ''));
      output.push(outRow.map((v) => escapeCSV(v)).join(','));
    }

    const csvOut = output.join('\n');
    const blob = new Blob([csvOut], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const base = fileName?.replace(/\.csv$/i, '') || 'mapped-output';
    a.href = url;
    a.download = `${base}-mapped.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    const confirm: ChatMessage = {
      id: `msg-${Date.now()}`,
      type: 'assistant',
      content: `Your mapped CSV is ready and downloaded as "${base}-mapped.csv". It includes ${headerRow.length} headers and ${dataRows.length} rows.`,
      timestamp: new Date(),
    };
    setChatMessages((prev) => [...prev, confirm]);
  }, [csvData, csvColumns, hasHeader, mappingRows, fileName]);

  // When mapping is completed for all captions (confirmed only), offer to generate the CSV once
  useEffect(() => {
    if (!isFileUploaded || hasPromptedForCSV) return;
    const totalCaptions = mappingRows.filter((r) => !!r.caption).length || mappingRows.length;
    const completed = mappingRows.filter((r) => r.caption && r.confirmed === true).length;
    if (totalCaptions > 0 && completed === totalCaptions) {
      // Run a quick validation pass over the mapped data and surface issues in chat
      const dataRows = hasHeader ? csvData.slice(1) : csvData;
      const effectiveRows = mappingRows
        .filter((r) => r.caption && r.header && r.header !== 'N/A')
        .sort((a, b) => a.order - b.order);

      const findColumnIndex = (header: string) => {
        const col = csvColumns.find((c) => c.name === header);
        return col ? col.index : -1;
      };

      const validators: Record<string, (v: string) => boolean> = {
        Email: (v) => /.+@.+\..+/.test(v.trim()),
        Phone: (v) => (v.replace(/\D/g, '').length >= 7),
        'Employee ID': (v) => /^(?:[0-9A-Za-z][0-9A-ZaZ\-_.]*)$/.test(v.trim()),
        Reference: (v) => v.trim().length > 0,
        Username: (v) => v.trim().length > 0,
      };

      const dateValidators: Record<string, (v: string) => boolean> = {
        'DD/MM/YYYY': (v) => /^\d{2}\/\d{2}\/\d{4}$/.test(v.trim()),
        'MM/DD/YYYY': (v) => /^\d{2}\/\d{2}\/\d{4}$/.test(v.trim()),
        'YYYY-MM-DD': (v) => /^\d{4}-\d{2}-\d{2}$/.test(v.trim()),
      };

      type Issue = { caption: string; count: number; samples: number[]; rule: string; sampleValues: string[] };
      const issues: Issue[] = [];

      for (const rowDef of effectiveRows) {
        const idx = findColumnIndex(rowDef.header);
        if (idx < 0) continue;
        const cap = rowDef.caption;
        let check: ((v: string) => boolean) | undefined = undefined;
        let rule = '';

        if (cap === 'Start Date') {
          check = dateValidators[dateFormat] || dateValidators['DD/MM/YYYY'];
          rule = `Expected date format ${dateFormat}`;
        } else if (validators[cap]) {
          check = validators[cap];
          rule = `Invalid ${cap.toLowerCase()}`;
        }

        if (check) {
          let bad = 0;
          const samples: number[] = [];
          const sampleValues: string[] = [];
          for (let r = 0; r < dataRows.length; r++) {
            const value = String(dataRows[r]?.[idx] ?? '').trim();
            if (value === '') continue; // treat empty as permissible unless required
            if (!check(value)) {
              bad++;
              if (samples.length < 5) {
                samples.push(r + 1 + (hasHeader ? 1 : 0)); // report original CSV row numbers
                sampleValues.push(value);
              }
            }
          }
          if (bad > 0) {
            issues.push({ caption: cap, count: bad, samples, rule, sampleValues });
          }
        }
      }

      if (issues.length > 0) {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            type: 'assistant',
            content: 'All captions are now mapped. I also scanned your data and found potential validation issues:',
            validationIssues: issues,
            timestamp: new Date(),
          },
        ]);
      } else {
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            type: 'assistant',
            content: 'All captions are now mapped. I did not find any obvious data quality issues in the mapped columns.',
            timestamp: new Date(),
          },
        ]);
      }

      setHasPromptedForCSV(true);
      const msg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        type: 'assistant',
        content:
          'Would you like me to generate a new CSV using these captions as the column headers and your original data merged into it?',
        timestamp: new Date(),
        cta: 'generate_csv',
      };
      setChatMessages((prev) => [...prev, msg]);
    }
  }, [isFileUploaded, hasPromptedForCSV, mappingRows, hasHeader, csvData, csvColumns, dateFormat]);

  return (
    <div className="min-h-screen bg-gray-100">
      <Sidebar activeItem="Modules" />
      <div className="ml-[100px] flex flex-col">
        <TopBar currentPage="Data Import Map" orgUnit="East Kilbride" userName="Michael Scott" />
        <div className="flex-1 p-6">
          <div className="mx-auto max-w-[988px]">
            <div className="rounded bg-white p-10">
              <DetailsForm
                title={title}
                setTitle={setTitle}
                description={description}
                setDescription={setDescription}
                importType={importType}
                setImportType={setImportType}
              />
              <FileFormatDetails
                delimiter={delimiter}
                setDelimiter={setDelimiter}
                hasHeader={hasHeader}
                setHasHeader={setHasHeader}
                dateFormat={dateFormat}
                setDateFormat={setDateFormat}
              />
              <WarningBanner message={isFileUploaded ? '' : 'Please upload a CSV file to begin mapping.'} />
              <MappingTable
                mappingRows={mappingRows}
                csvColumns={csvColumns}
                updateMappingRow={updateMappingRow}
                removeMappingRow={removeMappingRow}
                addMappingRow={addMappingRow}
              />
              {/* Add other UI sections here */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface FileFormatDetailsProps {
  delimiter: string;
  setDelimiter: (v: string) => void;
  hasHeader: boolean;
  setHasHeader: (v: boolean) => void;
  dateFormat: string;
  setDateFormat: (v: string) => void;
}

export function FileFormatDetails({
  delimiter,
  setDelimiter,
  hasHeader,
  setHasHeader,
  dateFormat,
  setDateFormat,
}: FileFormatDetailsProps) {
  return (
    <div className="mb-6">
      <h3 className="mb-6 text-xl font-bold text-gray-700">File Format</h3>
      <div className="mb-6 flex items-start gap-10">
        <div className="w-[336px]">
          <span className="font-medium text-gray-700">Delimiter</span>
        </div>
        <Select value={delimiter} onValueChange={setDelimiter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select delimiter" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="comma">Comma (,)</SelectItem>
            <SelectItem value="tab">Tab (↹)</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="mb-6 flex items-start gap-10">
        <div className="w-[336px]">
          <span className="font-medium text-gray-700">Has Header Row</span>
        </div>
        <Checkbox checked={hasHeader} onCheckedChange={setHasHeader} />
      </div>
      <div className="mb-6 flex items-start gap-10">
        <div className="w-[336px]">
          <span className="font-medium text-gray-700">Date Format</span>
        </div>
        <Select value={dateFormat} onValueChange={setDateFormat}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select date format" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// import { WarningOctagon } from '@phosphor-icons/react'; // Already imported above

interface WarningBannerProps {
  message: string;
}

export function WarningBanner({ message }: WarningBannerProps) {
  if (!message) return null;
  return (
    <div className="mb-6 flex items-center rounded bg-yellow-100 px-4 py-3 text-yellow-800">
      <WarningOctagon size={24} className="mr-2" />
      <span>{message}</span>
    </div>
  );
}

import { Button } from '@/components/ui/button';
import { Trash, Plus } from '@phosphor-icons/react';

interface MappingRow {
  id: string;
  order: number;
  header: string;
  sample: string;
  caption: string;
  keyField: boolean;
  matchById: boolean;
  confidence?: number;
  suggested?: boolean;
  confirmed?: boolean;
}

interface MappingTableProps {
  mappingRows: MappingRow[];
  csvColumns: { name: string }[];
  updateMappingRow: (rowId: string, field: string, value: any) => void;
  removeMappingRow: (rowId: string) => void;
  addMappingRow: () => void;
}

export function MappingTable({
  mappingRows,
  csvColumns,
  updateMappingRow,
  removeMappingRow,
  addMappingRow,
}: MappingTableProps) {
  return (
    <div className="mb-6">
      <h3 className="mb-6 text-xl font-bold text-gray-700">Mapping Table</h3>
      <table className="w-full border">
        <thead>
          <tr>
            <th>Caption</th>
            <th>CSV Column</th>
            <th>Sample</th>
            <th>Key Field</th>
            <th>Match By ID</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {mappingRows.map((row) => (
            <tr key={row.id}>
              <td>
                <input
                  value={row.caption}
                  onChange={(e) => updateMappingRow(row.id, 'caption', e.target.value)}
                  className="border rounded px-2 py-1"
                />
              </td>
              <td>
                <select
                  value={row.header}
                  onChange={(e) => updateMappingRow(row.id, 'header', e.target.value)}
                  className="border rounded px-2 py-1"
                >
                  <option value="N/A">N/A</option>
                  {csvColumns.map((col) => (
                    <option key={col.name} value={col.name}>
                      {col.name}
                    </option>
                  ))}
                </select>
              </td>
              <td>{row.sample}</td>
              <td>
                <input
                  type="checkbox"
                  checked={row.keyField}
                  onChange={(e) => updateMappingRow(row.id, 'keyField', e.target.checked)}
                />
              </td>
              <td>
                <input
                  type="checkbox"
                  checked={row.matchById}
                  onChange={(e) => updateMappingRow(row.id, 'matchById', e.target.checked)}
                />
              </td>
              <td>
                <Button variant="ghost" size="sm" onClick={() => removeMappingRow(row.id)}>
                  <Trash size={16} />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Button className="mt-4" onClick={addMappingRow}>
        <Plus size={16} className="mr-2" />
        Add Row
      </Button>
    </div>
  );
}
