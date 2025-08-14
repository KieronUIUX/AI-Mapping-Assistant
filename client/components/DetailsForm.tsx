import { Input } from '@/components/ui/input';

interface DetailsFormProps {
  title: string;
  setTitle: (v: string) => void;
  description: string;
  setDescription: (v: string) => void;
  importType: string;
  setImportType: (v: string) => void;
}

export function DetailsForm({
  title,
  setTitle,
  description,
  setDescription,
  importType,
  setImportType,
}: DetailsFormProps) {
  return (
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
  );
}