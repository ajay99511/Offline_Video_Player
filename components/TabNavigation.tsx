import React from 'react';
import { VideoIcon, MusicIcon } from './Icons';

interface TabNavigationProps {
  activeTab: 'video' | 'audio';
  onTabChange: (tab: 'video' | 'audio') => void;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="h-16 bg-gray-900 border-t border-gray-800 flex items-center justify-around shrink-0 z-50 safe-area-bottom">
      <button 
        onClick={() => onTabChange('video')}
        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
          activeTab === 'video' ? 'text-blue-500' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <VideoIcon />
        <span className="text-[10px] mt-1 font-medium">Video</span>
      </button>
      
      <button 
        onClick={() => onTabChange('audio')}
        className={`flex flex-col items-center justify-center w-full h-full transition-colors ${
          activeTab === 'audio' ? 'text-purple-500' : 'text-gray-500 hover:text-gray-300'
        }`}
      >
        <MusicIcon />
        <span className="text-[10px] mt-1 font-medium">Music</span>
      </button>
    </div>
  );
};
