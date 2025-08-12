import React from 'react';
import { ChevronDown, Settings } from 'lucide-react';

interface TopBarProps {
  currentPage?: string;
  orgUnit?: string;
  userName?: string;
}

export function TopBar({ 
  currentPage = 'Data Import Map', 
  orgUnit = 'East Kilbride', 
  userName = 'Michael Scott' 
}: TopBarProps) {
  return (
    <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-md">
        <span className="font-medium text-blue-600">Home</span>
        <ChevronDown className="h-4 w-4 rotate-[-90deg] text-gray-400" />
        <span className="font-medium text-blue-600">{currentPage}</span>
        <ChevronDown className="h-4 w-4 rotate-[-90deg] text-gray-400" />
        <span className="text-gray-600">Edit</span>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-6">
        {/* Org Unit */}
        <div className="flex items-center gap-2">
          <div className="text-md text-gray-600">Org Unit</div>
          <div className="text-md font-semibold text-blue-600">{orgUnit}</div>
        </div>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          <div className="text-md font-semibold text-gray-600">{userName}</div>
          <ChevronDown className="h-4 w-4 text-gray-600" />
        </div>

        {/* Settings */}
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-gray-600" />
          <span className="text-md font-semibold text-gray-600">Settings</span>
          <ChevronDown className="h-4 w-4 text-gray-600" />
        </div>

        {/* Help */}
        <div className="flex items-center gap-2">
          <div className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-600">
            <span className="text-md font-bold text-gray-600">?</span>
          </div>
          <span className="text-md font-semibold text-gray-600">Help</span>
          <ChevronDown className="h-4 w-4 text-gray-600" />
        </div>
      </div>
    </div>
  );
}
