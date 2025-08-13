import React from 'react';
import {
  House,
  GridFour,
  CheckSquare,
  UserCircle,
  FileText,
  Eye,
  ChartBar,
} from '@phosphor-icons/react';

interface SidebarProps {
  activeItem?: string;
}

export function Sidebar({ activeItem = 'Modules' }: SidebarProps) {
  const navigationItems = [
    {
      icon: <House className="h-8 w-8 text-white/90" weight="regular" />,
      label: 'Home',
      key: 'Home',
    },
    {
      icon: <GridFour className="h-8 w-8 text-white/90" weight="regular" />,
      label: 'Modules',
      key: 'Modules',
    },
    {
      icon: <CheckSquare className="h-8 w-8 text-white/90" weight="regular" />,
      label: 'Tasks',
      key: 'Tasks',
    },
    {
      icon: <UserCircle className="h-8 w-8 text-white/90" weight="regular" />,
      label: 'Portal\nQueue',
      key: 'Portal Queue',
    },
    {
      icon: <FileText className="h-8 w-8 text-white/90" weight="regular" />,
      label: 'Files',
      key: 'Files',
    },
    {
      icon: <Eye className="h-8 w-8 text-white/90" weight="regular" />,
      label: 'Insights',
      key: 'Insights',
    },
    {
      icon: <ChartBar className="h-8 w-8 text-white/90" weight="regular" />,
      label: 'Reports',
      key: 'Reports',
    },
  ];

  return (
    <div className="flex min-h-screen w-[100px] flex-col items-center bg-[#00336E] py-6">
      {/* EVOTIX Logo at Top */}
      <div className="mb-8 text-center">
        <img
          src="/images/evotixlogo.png"
          alt="EVOTIX"
          className="h-8 w-16"
          onError={(e) => {
            console.error('Failed to load image:', e);
            e.currentTarget.style.display = 'none';
          }}
          onLoad={() => console.log('Image loaded successfully')}
        />
      </div>

      {/* Navigation Items */}
      <div className="flex w-full flex-col gap-4">
        {navigationItems.map((item) => (
          <div
            key={item.key}
            className={`flex w-full flex-col items-center justify-center py-4 ${
              item.key === activeItem ? 'bg-[#136DD2]' : ''
            }`}
          >
            <div className="mb-1">{item.icon}</div>
            <div className="text-center text-xs leading-tight text-white">{item.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
