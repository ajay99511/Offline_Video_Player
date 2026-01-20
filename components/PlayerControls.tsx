import React from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  ForwardIcon, 
  RewindIcon, 
  ExpandIcon,
  SettingsIcon,
  BackIcon
} from './Icons';
import { PlayerState, ZoomMode } from '../types';

interface PlayerControlsProps {
  isVisible: boolean;
  state: PlayerState;
  title: string;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onZoomChange: () => void;
  onSpeedChange: (speed: number) => void;
  onBack: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  isVisible,
  state,
  title,
  onPlayPause,
  onSeek,
  onZoomChange,
  onSpeedChange,
  onBack
}) => {
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const speeds = [0.5, 1.0, 1.25, 1.5, 2.0];

  return (
    <div 
      className={`absolute inset-0 bg-black/40 flex flex-col justify-between p-4 transition-opacity duration-300 pointer-events-none ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Top Bar */}
      <div className="flex justify-between items-center pointer-events-auto">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full">
          <BackIcon />
        </button>
        <h2 className="text-sm font-semibold truncate max-w-[60%]">{title}</h2>
        <div className="flex gap-4">
           {/* Zoom Toggle */}
           <button onClick={onZoomChange} className="p-2 hover:bg-white/10 rounded-full flex flex-col items-center">
            <ExpandIcon />
            <span className="text-[10px] uppercase mt-0.5">{state.zoomMode === 'contain' ? 'Fit' : state.zoomMode === 'cover' ? 'Fill' : 'Crop'}</span>
          </button>
        </div>
      </div>

      {/* Center Controls */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="flex items-center gap-8 pointer-events-auto">
          <button onClick={() => onSeek(state.currentTime - 10)} className="p-3 hover:bg-white/10 rounded-full">
            <RewindIcon />
          </button>
          
          <button 
            onClick={onPlayPause} 
            className="p-5 bg-blue-600 hover:bg-blue-700 rounded-full shadow-lg transform active:scale-95 transition-all"
          >
            {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button onClick={() => onSeek(state.currentTime + 10)} className="p-3 hover:bg-white/10 rounded-full">
            <ForwardIcon />
          </button>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="flex flex-col gap-2 mb-4 pointer-events-auto bg-gradient-to-t from-black/80 to-transparent p-4 -mx-4 -mb-4">
        <div className="flex items-center gap-3 text-xs font-medium">
            <span>{formatTime(state.currentTime)}</span>
            <input 
              type="range" 
              min={0} 
              max={state.duration || 0} 
              value={state.currentTime} 
              onChange={(e) => onSeek(Number(e.target.value))}
              className="flex-1 h-1 bg-white/30 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:rounded-full"
            />
            <span>{formatTime(state.duration)}</span>
        </div>

        <div className="flex justify-between items-center mt-2">
            <div className="flex gap-2">
               {speeds.map(s => (
                   <button 
                    key={s}
                    onClick={() => onSpeedChange(s)}
                    className={`text-xs px-2 py-1 rounded border ${state.playbackRate === s ? 'bg-white text-black border-white' : 'border-white/30 text-white/70 hover:bg-white/10'}`}
                   >
                    {s}x
                   </button>
               ))}
            </div>
            
            <div className="flex items-center gap-2 text-xs text-white/60">
                <SettingsIcon />
                <span>Swipe left/right for brightness/volume</span>
            </div>
        </div>
      </div>
    </div>
  );
};
