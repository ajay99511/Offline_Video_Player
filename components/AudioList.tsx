import React, { useRef } from 'react';
import { FolderIcon, MusicIcon, PlayIcon } from './Icons';
import { AudioFile } from '../types';

interface AudioListProps {
  audioFiles: AudioFile[];
  currentAudioId?: string;
  isPlaying: boolean;
  onAudioSelect: (index: number) => void;
  onFilesAdded: (files: FileList) => void;
}

export const AudioList: React.FC<AudioListProps> = ({ 
  audioFiles, 
  currentAudioId, 
  isPlaying, 
  onAudioSelect, 
  onFilesAdded 
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(e.target.files);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4 overflow-y-auto pb-24">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-900 z-10 py-2 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Music Library</h1>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-lg transition-colors"
        >
          <FolderIcon />
          <span>Open Music</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="audio/*"
          className="hidden"
        />
      </div>

      {audioFiles.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 opacity-50 mt-20">
          <MusicIcon />
          <p className="mt-4 text-lg">No music loaded.</p>
          <p className="text-sm">Tap "Open Music" to select audio files.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {audioFiles.map((audio, index) => {
            const isCurrent = audio.id === currentAudioId;
            return (
              <div
                key={audio.id}
                onClick={() => onAudioSelect(index)}
                className={`flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-colors ${
                  isCurrent ? 'bg-purple-900/40 border border-purple-500/50' : 'bg-gray-800 hover:bg-gray-700'
                }`}
              >
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isCurrent ? 'bg-purple-600' : 'bg-gray-700'}`}>
                  {isCurrent && isPlaying ? <PlayIcon /> : <MusicIcon />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium truncate ${isCurrent ? 'text-purple-300' : 'text-gray-200'}`}>
                    {audio.name}
                  </p>
                  <p className="text-xs text-gray-400 truncate">
                    {audio.artist}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
