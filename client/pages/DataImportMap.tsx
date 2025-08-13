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
  confirmed?: boolean;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: MappingSuggestion[];
  cta?: 'generate_csv';
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
          console.error('Mock initial suggestions failed:', await resp.text());
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
        summaryLines.push(`I’ve analyzed “${file.name}” (${columns.length} columns, ${parsedData.length - (hasHeader ? 1 : 0)} rows).`);
        if (certain.length > 0) {
          summaryLines.push(`I’m 100% confident about these mappings and have applied them:`);
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
        summaryLines.push(`— (${provider} • ${model})`);

        setChatMessages([
          {
            id: `msg-${Date.now()}`,
            type: 'assistant',
            content: summaryLines.filter(Boolean).join('\n'),
            timestamp: new Date(),
          },
        ]);
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
  }, [currentMessage, mappingRows, csvColumns]);

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
        'Employee ID': (v) => /^(?:[0-9A-Za-z][0-9A-Za-z\-_.]*)$/.test(v.trim()),
        Reference: (v) => v.trim().length > 0,
        Username: (v) => v.trim().length > 0,
      };

      const dateValidators: Record<string, (v: string) => boolean> = {
        'DD/MM/YYYY': (v) => /^\d{2}\/\d{2}\/\d{4}$/.test(v.trim()),
        'MM/DD/YYYY': (v) => /^\d{2}\/\d{2}\/\d{4}$/.test(v.trim()),
        'YYYY-MM-DD': (v) => /^\d{4}-\d{2}-\d{2}$/.test(v.trim()),
      };

      type Issue = { caption: string; count: number; samples: number[]; rule: string };
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
          for (let r = 0; r < dataRows.length; r++) {
            const value = String(dataRows[r]?.[idx] ?? '').trim();
            if (value === '') continue; // treat empty as permissible unless required
            if (!check(value)) {
              bad++;
              if (samples.length < 5) samples.push(r + 1 + (hasHeader ? 1 : 0)); // report original CSV row numbers
            }
          }
          if (bad > 0) {
            issues.push({ caption: cap, count: bad, samples, rule });
          }
        }
      }

      if (issues.length > 0) {
        const lines: string[] = [];
        lines.push('All captions are now mapped. I also scanned your data and found potential validation issues:');
        for (const iss of issues) {
          const sampleStr = iss.samples.length > 0 ? ` e.g. rows ${iss.samples.slice(0, 3).join(', ')}` : '';
          lines.push(`- ${iss.caption}: ${iss.count} values flagged (${iss.rule})${sampleStr}`);
        }
        setChatMessages((prev) => [
          ...prev,
          {
            id: `msg-${Date.now()}`,
            type: 'assistant',
            content: lines.join('\n'),
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
    <div className="flex h-screen overflow-hidden bg-gray-100">
      {/* Navigation Sidebar */}
      <Sidebar activeItem="Modules" />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Menu */}
        <TopBar currentPage="Data Import Map" orgUnit="East Kilbride" userName="Michael Scott" />

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-[988px]">
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
                            <List className="mx-auto h-5 w-5 text-gray-600" weight="bold" />
                          </td>
                          <td className="border-r border-gray-300 p-2 text-sm text-gray-800">
                            {row.order}
                          </td>
                          <td className="relative border-r border-gray-300 p-2 text-sm text-gray-800">
                            {row.header}
                            {row.confirmed === true && (
                              <CheckCircle className="absolute right-2 top-2 h-4 w-4 text-green-500" />
                            )}
                            {row.confirmed !== true && row.suggested && (
                              <Warning className="absolute right-2 top-2 h-4 w-4 text-yellow-500" />
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
                      <UploadIcon className="h-full w-full" size="lg" alt="Upload CSV Data" />
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
                              {message.cta === 'generate_csv' && (
                                <div className="mt-3 flex gap-2">
                                  <Button className="bg-blue-600 hover:bg-blue-700" size="sm" onClick={handleGenerateCSV}>
                                    Generate CSV
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setChatMessages((prev) => [
                                        ...prev,
                                        {
                                          id: `msg-${Date.now()}`,
                                          type: 'user',
                                          content: 'Not now',
                                          timestamp: new Date(),
                                        },
                                      ])
                                    }
                                  >
                                    Not now
                                  </Button>
                                </div>
                              )}
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
