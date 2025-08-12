import { useState, useCallback } from 'react';
import { Plus, Trash, PencilSimple } from '@phosphor-icons/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface TableCaptionsProps {
  captions: string[];
  onCaptionsChange: (captions: string[]) => void;
}

export function TableCaptions({ captions, onCaptionsChange }: TableCaptionsProps) {
  const [newCaption, setNewCaption] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const addCaption = useCallback(() => {
    if (newCaption.trim() && !captions.includes(newCaption.trim())) {
      onCaptionsChange([...captions, newCaption.trim()]);
      setNewCaption('');
    }
  }, [newCaption, captions, onCaptionsChange]);

  const removeCaption = useCallback(
    (index: number) => {
      const newCaptions = captions.filter((_, i) => i !== index);
      onCaptionsChange(newCaptions);
    },
    [captions, onCaptionsChange],
  );

  const startEditing = useCallback(
    (index: number) => {
      setEditingIndex(index);
      setEditValue(captions[index]);
    },
    [captions],
  );

  const saveEdit = useCallback(() => {
    if (editingIndex !== null && editValue.trim()) {
      const newCaptions = [...captions];
      newCaptions[editingIndex] = editValue.trim();
      onCaptionsChange(newCaptions);
      setEditingIndex(null);
      setEditValue('');
    }
  }, [editingIndex, editValue, captions, onCaptionsChange]);

  const cancelEdit = useCallback(() => {
    setEditingIndex(null);
    setEditValue('');
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter') {
      action();
    }
  };

  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Table Captions</CardTitle>
        <p className="text-sm text-gray-600">Define the column headers you want for your table</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add new caption */}
        <div className="flex items-center gap-2">
          <Input
            placeholder="Enter a new caption..."
            value={newCaption}
            onChange={(e) => setNewCaption(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, addCaption)}
            className="flex-1"
          />
          <Button onClick={addCaption} disabled={!newCaption.trim()}>
            <Plus className="h-5 w-5" weight="regular" />
            Add
          </Button>
        </div>

        {/* Display captions */}
        {captions.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <p>No captions added yet</p>
            <p className="text-sm">Add captions that will serve as your table headers</p>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Your Captions ({captions.length}):</p>
            <div className="grid gap-2">
              {captions.map((caption, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between rounded-lg border bg-gray-50 p-3"
                >
                  {editingIndex === index ? (
                    <div className="flex flex-1 items-center space-x-2">
                      <Input
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyPress={handleEditKeyPress}
                        className="flex-1"
                        autoFocus
                      />
                      <Button size="sm" onClick={saveEdit} disabled={!editValue.trim()}>
                        Save
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEdit}>
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          {index + 1}
                        </Badge>
                        <span className="font-medium">{caption}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(index)}
                          className="h-8 w-8 p-0"
                        >
                          <PencilSimple className="h-3 w-3" weight="regular" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeCaption(index)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <Trash className="h-3 w-3" weight="regular" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick add suggestions */}
        {captions.length === 0 && (
          <div className="border-t pt-4">
            <p className="mb-2 text-sm text-gray-600">Quick suggestions:</p>
            <div className="flex flex-wrap gap-2">
              {['Name', 'Email', 'Phone', 'Address', 'Date', 'Amount'].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!captions.includes(suggestion)) {
                      onCaptionsChange([...captions, suggestion]);
                    }
                  }}
                  className="text-xs"
                >
                  + {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
