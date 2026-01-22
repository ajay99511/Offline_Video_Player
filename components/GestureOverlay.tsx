import React, { useEffect, useState } from 'react';
import { VolumeIcon, BrightnessIcon, ForwardIcon, RewindIcon } from './Icons';
import { GestureType } from '../types';

interface GestureOverlayProps {
  type: GestureType;
  value?: number; // 0-1 for Vol/Bright, Seconds for Seek
  text?: string;
  duration?: number;
}

export const GestureOverlay: React.FC<GestureOverlayProps> = ({ type, value, text, duration }) => {
  const [renderData, setRenderData] = useState({ 
    type: 'NONE' as GestureType, 
    value: 0, 
    text: '', 
    duration: 0 
  });

  useEffect(() => {
    if (type !== 'NONE') {
      setRenderData({ 
        type, 
        value: value || 0, 
        text: text || '', 
        duration: duration || 0 
      });
    }
  }, [type, value, text, duration]);

  const isVisible = type !== 'NONE';

  // Format seconds to MM:SS
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // If we haven't had a gesture yet, don't render anything
  if (renderData.type === 'NONE') return null;

  return (
    <div className={`absolute inset-0 flex items-center justify-center pointer-events-none z-50 transition-opacity duration-300 ease-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      <div className="bg-black/70 backdrop-blur-md p-6 rounded-3xl flex flex-col items-center justify-center min-w-[160px] min-h-[160px] shadow-2xl border border-white/10">
        
        {renderData.type === 'VOLUME' && (
          <>
            <VolumeIcon />
            <div className="w-24 h-1.5 bg-white/20 mt-5 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                 style={{ width: `${Math.min(Math.max(renderData.value, 0), 1) * 100}%` }} 
               />
            </div>
            <span className="mt-3 text-2xl font-bold font-mono">{Math.round(renderData.value * 100)}%</span>
          </>
        )}

        {renderData.type === 'BRIGHTNESS' && (
          <>
            <BrightnessIcon />
            <div className="w-24 h-1.5 bg-white/20 mt-5 rounded-full overflow-hidden">
               {/* Note: VideoPlayer passes normalized 0-1 value for brightness overlay */}
               <div 
                 className="h-full bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]" 
                 style={{ width: `${Math.min(Math.max(renderData.value, 0), 1) * 100}%` }} 
               />
            </div>
            <span className="mt-3 text-2xl font-bold font-mono">{Math.round(renderData.value * 100)}%</span>
          </>
        )}

        {renderData.type === 'SEEK' && (
          <>
            <div className="flex items-center gap-2 text-white/90">
                {renderData.text?.includes('-') ? <RewindIcon /> : <ForwardIcon />}
            </div>
            <span className="mt-2 text-3xl font-bold">{renderData.text}</span>
            
            {/* Seek Progress Bar */}
            <div className="w-32 h-1.5 bg-white/20 mt-4 rounded-full overflow-hidden">
               <div 
                  className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                  style={{ 
                      width: `${renderData.duration > 0 ? (Math.min(Math.max(renderData.value, 0), renderData.duration) / renderData.duration) * 100 : 0}%` 
                  }} 
               />
            </div>
            <span className="mt-2 text-xs text-gray-300 font-mono">
                {formatTime(renderData.value)} / {formatTime(renderData.duration)}
            </span>
          </>
        )}

        {renderData.type === 'ZOOM' && (
           <>
             <span className="text-xl font-bold text-white/90">Zoom</span>
             <span className="text-2xl mt-2 font-mono">{Math.round((renderData.value || 1) * 100)}%</span>
           </>
        )}

      </div>
    </div>
  );
};