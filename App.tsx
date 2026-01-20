import React, { useState, useEffect, useRef, useCallback } from 'react';
import { VideoList } from './components/VideoList';
import { VideoPlayer } from './components/VideoPlayer';
import { AudioList } from './components/AudioList';
import { AudioPlayer } from './components/AudioPlayer';
import { TabNavigation } from './components/TabNavigation';
import { VideoFile, AudioFile, AudioPlayerState, RepeatMode } from './types';
import { MusicIcon, PauseIcon, PlayIcon } from './components/Icons';

type Tab = 'video' | 'audio';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('video');
  
  // Video State
  const [videos, setVideos] = useState<VideoFile[]>([]);
  const [currentVideo, setCurrentVideo] = useState<VideoFile | null>(null);

  // Audio State
  const [audioFiles, setAudioFiles] = useState<AudioFile[]>([]);
  const [currentAudioIndex, setCurrentAudioIndex] = useState<number>(-1);
  const [isAudioPlayerOpen, setIsAudioPlayerOpen] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [audioState, setAudioState] = useState<AudioPlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    playbackRate: 1,
    isShuffling: false,
    repeatMode: RepeatMode.OFF,
  });

  // --- Video Logic ---
  const handleVideoFilesAdded = (fileList: FileList) => {
    const newVideos: VideoFile[] = Array.from(fileList).map(file => ({
      id: crypto.randomUUID(),
      name: file.name,
      file: file,
      url: URL.createObjectURL(file)
    }));
    setVideos(prev => [...prev, ...newVideos]);
  };

  const handleVideoSelect = (video: VideoFile) => {
    // Pause audio when video starts
    if (audioState.isPlaying && audioRef.current) {
      audioRef.current.pause();
    }
    setCurrentVideo(video);
  };

  // --- Audio Logic ---
  const handleAudioFilesAdded = (fileList: FileList) => {
    const newAudio: AudioFile[] = Array.from(fileList).map(file => ({
      id: crypto.randomUUID(),
      name: file.name.replace(/\.[^/.]+$/, ""),
      artist: "Local Artist", // Simple fallback as we can't parse ID3 tags without libs easily
      url: URL.createObjectURL(file),
      file: file
    }));
    setAudioFiles(prev => [...prev, ...newAudio]);
  };

  const playAudioAtIndex = (index: number) => {
    if (index >= 0 && index < audioFiles.length) {
      setCurrentAudioIndex(index);
      setIsAudioPlayerOpen(true);
      // Wait for React to render audio element with new src if needed, but ref handles it
      setTimeout(() => {
        audioRef.current?.play().catch(() => {});
      }, 0);
    }
  };

  const handleAudioNext = useCallback(() => {
    if (audioFiles.length === 0) return;
    
    let nextIndex = currentAudioIndex + 1;
    if (audioState.isShuffling) {
      nextIndex = Math.floor(Math.random() * audioFiles.length);
    } else if (nextIndex >= audioFiles.length) {
      nextIndex = 0; // Loop to start
    }
    playAudioAtIndex(nextIndex);
  }, [audioFiles.length, currentAudioIndex, audioState.isShuffling]);

  const handleAudioPrev = useCallback(() => {
    if (audioFiles.length === 0) return;
    
    // If more than 3 seconds in, restart track
    if (audioRef.current && audioRef.current.currentTime > 3) {
        audioRef.current.currentTime = 0;
        return;
    }

    let prevIndex = currentAudioIndex - 1;
    if (audioState.isShuffling) {
      prevIndex = Math.floor(Math.random() * audioFiles.length);
    } else if (prevIndex < 0) {
      prevIndex = audioFiles.length - 1;
    }
    playAudioAtIndex(prevIndex);
  }, [audioFiles.length, currentAudioIndex, audioState.isShuffling]);

  const toggleAudioPlayPause = () => {
    if (audioRef.current) {
      if (audioState.isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
    }
  };

  // Audio Event Listeners
  const onAudioTimeUpdate = () => {
    if (audioRef.current) {
      setAudioState(prev => ({
        ...prev,
        currentTime: audioRef.current!.currentTime,
        duration: audioRef.current!.duration || prev.duration
      }));
    }
  };

  const onAudioEnded = () => {
    if (audioState.repeatMode === RepeatMode.ONE) {
      audioRef.current?.play();
    } else if (audioState.repeatMode === RepeatMode.ALL || (currentAudioIndex < audioFiles.length - 1)) {
      handleAudioNext();
    } else {
      setAudioState(s => ({ ...s, isPlaying: false }));
    }
  };

  // Media Session API Integration (Hardware Controls)
  useEffect(() => {
    if ('mediaSession' in navigator && currentAudioIndex !== -1 && audioFiles[currentAudioIndex]) {
      const file = audioFiles[currentAudioIndex];
      
      navigator.mediaSession.metadata = new MediaMetadata({
        title: file.name,
        artist: file.artist,
        album: 'Local Library',
        artwork: [{ src: 'https://via.placeholder.com/512?text=Music', sizes: '512x512', type: 'image/png' }]
      });

      navigator.mediaSession.setActionHandler('play', () => audioRef.current?.play());
      navigator.mediaSession.setActionHandler('pause', () => audioRef.current?.pause());
      navigator.mediaSession.setActionHandler('previoustrack', handleAudioPrev);
      navigator.mediaSession.setActionHandler('nexttrack', handleAudioNext);
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioRef.current && details.seekTime !== undefined) {
           audioRef.current.currentTime = details.seekTime;
        }
      });
    }
    return () => {
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('previoustrack', null);
        navigator.mediaSession.setActionHandler('nexttrack', null);
      }
    };
  }, [currentAudioIndex, audioFiles, handleAudioNext, handleAudioPrev]);

  // Cleanup
  useEffect(() => {
    return () => {
      videos.forEach(v => URL.revokeObjectURL(v.url));
      audioFiles.forEach(a => URL.revokeObjectURL(a.url));
    };
  }, []); 

  // --- Render ---

  // We render the audio element hidden to persist playback across tabs
  const renderHiddenAudio = () => {
    const currentAudio = audioFiles[currentAudioIndex];
    if (!currentAudio) return null;
    return (
      <audio
        ref={audioRef}
        src={currentAudio.url}
        onTimeUpdate={onAudioTimeUpdate}
        onPlay={() => setAudioState(s => ({ ...s, isPlaying: true }))}
        onPause={() => setAudioState(s => ({ ...s, isPlaying: false }))}
        onEnded={onAudioEnded}
        onLoadedMetadata={() => setAudioState(s => ({ ...s, duration: audioRef.current?.duration || 0 }))}
      />
    );
  };

  return (
    <div className="w-full h-full bg-black flex flex-col overflow-hidden">
      {renderHiddenAudio()}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden">
        
        {/* VIDEO TAB CONTENT */}
        <div className={`absolute inset-0 ${activeTab === 'video' ? 'z-10' : 'z-0 invisible'}`}>
          {currentVideo ? (
            <VideoPlayer video={currentVideo} onBack={() => setCurrentVideo(null)} />
          ) : (
            <VideoList 
              videos={videos} 
              onVideoSelect={handleVideoSelect} 
              onFilesAdded={handleVideoFilesAdded}
            />
          )}
        </div>

        {/* AUDIO TAB CONTENT */}
        <div className={`absolute inset-0 ${activeTab === 'audio' ? 'z-10' : 'z-0 invisible'}`}>
          {isAudioPlayerOpen && currentAudioIndex !== -1 ? (
            <AudioPlayer 
              currentFile={audioFiles[currentAudioIndex]}
              state={audioState}
              onPlayPause={toggleAudioPlayPause}
              onNext={handleAudioNext}
              onPrev={handleAudioPrev}
              onSeek={(time) => { if(audioRef.current) audioRef.current.currentTime = time; }}
              onSpeedChange={(rate) => { 
                if(audioRef.current) audioRef.current.playbackRate = rate; 
                setAudioState(s => ({...s, playbackRate: rate}));
              }}
              onToggleShuffle={() => setAudioState(s => ({...s, isShuffling: !s.isShuffling}))}
              onToggleRepeat={() => {
                const modes = [RepeatMode.OFF, RepeatMode.ALL, RepeatMode.ONE];
                const next = modes[(modes.indexOf(audioState.repeatMode) + 1) % modes.length];
                setAudioState(s => ({...s, repeatMode: next}));
              }}
              onBack={() => setIsAudioPlayerOpen(false)}
            />
          ) : (
            <div className="h-full flex flex-col">
              <AudioList 
                audioFiles={audioFiles}
                currentAudioId={audioFiles[currentAudioIndex]?.id}
                isPlaying={audioState.isPlaying}
                onAudioSelect={playAudioAtIndex}
                onFilesAdded={handleAudioFilesAdded}
              />
              {/* Mini Player if audio is playing but player is closed */}
              {currentAudioIndex !== -1 && (
                <div 
                   onClick={() => setIsAudioPlayerOpen(true)}
                   className="bg-gray-800 border-t border-gray-700 p-3 flex items-center gap-3 cursor-pointer absolute bottom-0 w-full"
                >
                   <div className="w-10 h-10 bg-purple-900 rounded flex items-center justify-center">
                     <MusicIcon />
                   </div>
                   <div className="flex-1 min-w-0">
                     <p className="text-sm font-bold text-white truncate">{audioFiles[currentAudioIndex].name}</p>
                     <p className="text-xs text-purple-400">{audioFiles[currentAudioIndex].artist}</p>
                   </div>
                   <button 
                     onClick={(e) => { e.stopPropagation(); toggleAudioPlayPause(); }}
                     className="p-2 text-white"
                   >
                     {audioState.isPlaying ? <PauseIcon /> : <PlayIcon />}
                   </button>
                </div>
              )}
            </div>
          )}
        </div>

      </div>

      {/* Navigation - Only show if no full player is open (Video Player handles its own full screen) */}
      {!currentVideo && (!isAudioPlayerOpen || activeTab !== 'audio') && (
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      )}
    </div>
  );
}