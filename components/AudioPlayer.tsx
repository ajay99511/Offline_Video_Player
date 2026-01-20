import React from 'react';
import { 
  PlayIcon, 
  PauseIcon, 
  SkipBackIcon, 
  SkipForwardIcon, 
  RepeatIcon,
  Repeat1Icon,
  ShuffleIcon,
  DiscIcon,
  BackIcon
} from './Icons';
import { AudioFile, AudioPlayerState, RepeatMode } from '../types';

interface AudioPlayerProps {
  currentFile: AudioFile;
  state: AudioPlayerState;
  onPlayPause: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSeek: (time: number) => void;
  onSpeedChange: (speed: number) => void;
  onToggleShuffle: () => void;
  onToggleRepeat: () => void;
  onBack: () => void; // To minimize/hide full player
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  currentFile,
  state,
  onPlayPause,
  onNext,
  onPrev,
  onSeek,
  onSpeedChange,
  onToggleShuffle,
  onToggleRepeat,
  onBack
}) => {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const speeds = [0.5, 1.0, 1.25, 1.5, 2.0];

  return (
    <div className="h-full w-full bg-gradient-to-b from-gray-900 via-gray-900 to-black flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full">
          <BackIcon />
        </button>
        <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Now Playing</span>
        <div className="w-10" /> {/* Spacer */}
      </div>

      {/* Album Art Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="relative w-64 h-64 md:w-80 md:h-80 bg-gray-800 rounded-full shadow-2xl shadow-purple-900/20 flex items-center justify-center border-4 border-gray-700">
           <div className={`transition-transform duration-[4000ms] ease-linear ${state.isPlaying ? 'animate-[spin_4s_linear_infinite]' : ''}`}>
             <DiscIcon />
           </div>
        </div>
      </div>

      {/* Info Area */}
      <div className="px-8 mb-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2 truncate">{currentFile.name}</h2>
        <p className="text-purple-400 text-lg">{currentFile.artist}</p>
      </div>

      {/* Controls Area */}
      <div className="bg-gray-900/50 p-6 pb-12 rounded-t-3xl backdrop-blur-sm">
        {/* Progress */}
        <div className="flex flex-col gap-2 mb-6">
          <input 
            type="range" 
            min={0} 
            max={state.duration || 100} 
            value={state.currentTime} 
            onChange={(e) => onSeek(Number(e.target.value))}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-purple-500 [&::-webkit-slider-thumb]:rounded-full"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>{formatTime(state.currentTime)}</span>
            <span>{formatTime(state.duration || 0)}</span>
          </div>
        </div>

        {/* Main Buttons */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={onToggleShuffle}
            className={`p-2 rounded-full ${state.isShuffling ? 'text-purple-400 bg-purple-900/20' : 'text-gray-500 hover:text-white'}`}
          >
            <ShuffleIcon />
          </button>

          <button onClick={onPrev} className="p-3 text-white hover:bg-white/10 rounded-full">
            <SkipBackIcon />
          </button>

          <button 
            onClick={onPlayPause} 
            className="w-16 h-16 bg-purple-600 hover:bg-purple-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-900/40 transform active:scale-95 transition-all"
          >
            {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button onClick={onNext} className="p-3 text-white hover:bg-white/10 rounded-full">
            <SkipForwardIcon />
          </button>

          <button 
            onClick={onToggleRepeat}
            className={`p-2 rounded-full ${state.repeatMode !== RepeatMode.OFF ? 'text-purple-400 bg-purple-900/20' : 'text-gray-500 hover:text-white'}`}
          >
            {state.repeatMode === RepeatMode.ONE ? <Repeat1Icon /> : <RepeatIcon />}
          </button>
        </div>

        {/* Speed & Aux */}
        <div className="flex justify-center gap-2">
            {speeds.map(s => (
                <button 
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`text-[10px] w-8 h-6 rounded border flex items-center justify-center transition-colors ${state.playbackRate === s ? 'bg-purple-600 border-purple-600 text-white' : 'border-gray-700 text-gray-500 hover:border-gray-500'}`}
                >
                {s}x
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};
