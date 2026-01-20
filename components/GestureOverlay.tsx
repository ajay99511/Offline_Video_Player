import React from 'react';
import { VolumeIcon, BrightnessIcon, ForwardIcon, RewindIcon } from './Icons';
import { GestureType } from '../types';

interface GestureOverlayProps {
  type: GestureType;
  value?: number; // 0 to 1 or seconds
  text?: string;
}

export const GestureOverlay: React.FC<GestureOverlayProps> = ({ type, value, text }) => {
  if (type === 'NONE') return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
      <div className="bg-black/60 backdrop-blur-sm p-6 rounded-2xl flex flex-col items-center justify-center min-w-[120px] min-h-[120px]">
        {type === 'VOLUME' && (
          <>
            <VolumeIcon />
            <div className="w-16 h-1 bg-gray-500 mt-4 rounded overflow-hidden">
               <div className="h-full bg-white" style={{ width: `${(value || 0) * 100}%` }} />
            </div>
            <span className="mt-2 text-sm font-bold">{Math.round((value || 0) * 100)}%</span>
          </>
        )}
        {type === 'BRIGHTNESS' && (
          <>
            <BrightnessIcon />
            <div className="w-16 h-1 bg-gray-500 mt-4 rounded overflow-hidden">
               <div className="h-full bg-white" style={{ width: `${(value || 0) * 100}%` }} />
            </div>
            <span className="mt-2 text-sm font-bold">{Math.round((value || 0) * 100)}%</span>
          </>
        )}
        {type === 'SEEK' && (
          <>
            {text?.includes('-') ? <RewindIcon /> : <ForwardIcon />}
            <span className="mt-3 text-lg font-bold">{text}</span>
          </>
        )}
        {type === 'ZOOM' && (
           <>
             <span className="text-lg font-bold">Zoom</span>
             <span className="text-sm">{Math.round((value || 1) * 100)}%</span>
           </>
        )}
      </div>
    </div>
  );
};
