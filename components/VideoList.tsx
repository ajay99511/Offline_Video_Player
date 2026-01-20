import React, { useRef } from 'react';
import { FolderIcon, PlayIcon } from './Icons';
import { VideoFile } from '../types';

interface VideoListProps {
  videos: VideoFile[];
  onVideoSelect: (video: VideoFile) => void;
  onFilesAdded: (files: FileList) => void;
}

export const VideoList: React.FC<VideoListProps> = ({ videos, onVideoSelect, onFilesAdded }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesAdded(e.target.files);
    }
  };

  const handleOpenPicker = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4 overflow-y-auto">
      <div className="flex justify-between items-center mb-6 sticky top-0 bg-gray-900 z-10 py-2 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Video Library</h1>
        <button
          onClick={handleOpenPicker}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
        >
          <FolderIcon />
          <span>Open Files</span>
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          multiple
          accept="video/*"
          className="hidden"
        />
      </div>

      {videos.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 opacity-50 mt-20">
          <FolderIcon />
          <p className="mt-4 text-lg">No videos loaded.</p>
          <p className="text-sm">Tap "Open Files" to select videos from your device.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map((video) => (
            <div
              key={video.id}
              onClick={() => onVideoSelect(video)}
              className="group relative bg-gray-800 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-700 transition-all border border-transparent hover:border-blue-500 hover:shadow-xl hover:shadow-blue-900/20"
            >
              <div className="aspect-video bg-black flex items-center justify-center relative overflow-hidden">
                <video 
                  src={video.url + "#t=1.0"} 
                  className="w-full h-full object-cover opacity-60 group-hover:opacity-40 group-hover:blur-sm transition-all duration-300" 
                  preload="metadata"
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-75 group-hover:scale-100">
                   <div className="bg-blue-600 p-4 rounded-full shadow-lg text-white">
                      <PlayIcon />
                   </div>
                </div>
              </div>
              <div className="p-3">
                <p className="font-medium truncate text-gray-200 group-hover:text-white transition-colors">{video.name}</p>
                <p className="text-xs text-gray-400 mt-1">{(video.file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
