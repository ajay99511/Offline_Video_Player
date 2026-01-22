import React, { useRef, useState, useEffect, useCallback } from 'react';
import { VideoFile, PlayerState, ZoomMode, GestureType } from '../types';
import { PlayerControls } from './PlayerControls';
import { GestureOverlay } from './GestureOverlay';
import { SWIPE_THRESHOLD, DOUBLE_TAP_DELAY } from '../constants';

interface VideoPlayerProps {
  video: VideoFile;
  onBack: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onBack }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimeoutRef = useRef<number | null>(null);

  // Gesture State
  const [gestureType, setGestureType] = useState<GestureType>('NONE');
  const [gestureValue, setGestureValue] = useState<number>(0);
  const [gestureText, setGestureText] = useState<string>('');
  
  // Touch refs
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<{ time: number; x: number } | null>(null);
  const initialValueRef = useRef<number>(0);
  const pinchStartDistRef = useRef<number>(0);
  const targetSeekTimeRef = useRef<number>(0);
  
  const [state, setState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
    brightness: 1,
    playbackRate: 1,
    zoomMode: ZoomMode.FIT,
    scale: 1,
  });

  // Helper to hide controls after delay
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    setControlsVisible(true);
    if (state.isPlaying) {
      controlsTimeoutRef.current = window.setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [state.isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
    };
  }, [resetControlsTimeout]);

  // Video Event Handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setState(s => ({ ...s, currentTime: videoRef.current!.currentTime }));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setState(s => ({ ...s, duration: videoRef.current!.duration }));
      videoRef.current.play().catch(() => {});
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (state.isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setState(s => ({ ...s, isPlaying: !s.isPlaying }));
    }
  };

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setState(s => ({ ...s, currentTime: time }));
      resetControlsTimeout();
    }
  };

  const handleSpeedChange = (rate: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
      setState(s => ({ ...s, playbackRate: rate }));
    }
  };

  const cycleZoomMode = () => {
    const modes = [ZoomMode.FIT, ZoomMode.FILL, ZoomMode.STRETCH];
    const currentIndex = modes.indexOf(state.zoomMode as ZoomMode);
    const nextMode = modes[(currentIndex + 1) % modes.length];
    
    // Reset scale when switching standard modes
    setState(s => ({ ...s, zoomMode: nextMode, scale: 1 }));
  };

  // --- GESTURE LOGIC ---

  const handleTouchStart = (e: React.TouchEvent) => {
    resetControlsTimeout();

    if (e.touches.length === 2) {
      // Pinch start
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      pinchStartDistRef.current = dist;
      initialValueRef.current = state.scale;
      setGestureType('ZOOM');
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const now = Date.now();
      
      // Double tap detection
      if (lastTapRef.current && (now - lastTapRef.current.time) < DOUBLE_TAP_DELAY) {
        const xDiff = Math.abs(touch.clientX - lastTapRef.current.x);
        if (xDiff < 50) {
           // Double tap confirmed
           const screenWidth = window.innerWidth;
           const isLeft = touch.clientX < screenWidth / 2;
           const seekAmount = isLeft ? -10 : 10;
           handleSeek(Math.min(Math.max(state.currentTime + seekAmount, 0), state.duration));
           setGestureType('SEEK');
           setGestureValue(state.currentTime + seekAmount);
           setGestureText(seekAmount > 0 ? '+10s' : '-10s');
           
           setTimeout(() => setGestureType('NONE'), 500);
           lastTapRef.current = null;
           return;
        }
      }
      
      lastTapRef.current = { time: now, x: touch.clientX };
      touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: now };
      
      // Determine zone for potential vertical swipe
      const screenWidth = window.innerWidth;
      const isLeft = touch.clientX < screenWidth / 2;
      
      // Store initial value based on side
      if (isLeft) {
        initialValueRef.current = state.brightness; // Left = Brightness
      } else {
        initialValueRef.current = state.volume; // Right = Volume
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (gestureType === 'SEEK' && !touchStartRef.current && e.touches.length === 1) return;

    if (e.touches.length === 2 && gestureType === 'ZOOM') {
       // Pinch zoom logic
       const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const scaleFactor = dist / pinchStartDistRef.current;
      const newScale = Math.min(Math.max(initialValueRef.current * scaleFactor, 0.5), 3.0);
      setState(s => ({ ...s, scale: newScale, zoomMode: ZoomMode.ZOOM_150 }));
      setGestureValue(newScale);
      return;
    }

    if (e.touches.length === 1 && touchStartRef.current) {
      const touch = e.touches[0];
      const dx = touch.clientX - touchStartRef.current.x;
      const dy = touchStartRef.current.y - touch.clientY; // Up is positive

      // If gesture not locked yet, determine direction
      if (gestureType === 'NONE' || gestureType === 'ZOOM') {
        if (Math.abs(dx) > SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
          setGestureType('SEEK');
          initialValueRef.current = state.currentTime;
        } else if (Math.abs(dy) > SWIPE_THRESHOLD && Math.abs(dy) > Math.abs(dx)) {
           // Vertical
           const screenWidth = window.innerWidth;
           const isLeft = touchStartRef.current.x < screenWidth / 2;
           setGestureType(isLeft ? 'BRIGHTNESS' : 'VOLUME');
        }
      }

      // Handle ongoing gesture
      if (gestureType === 'VOLUME') {
        const change = dy / (window.innerHeight / 2); // Full screen height = 200% change
        const newVal = Math.min(Math.max(initialValueRef.current + change, 0), 1);
        if (videoRef.current) videoRef.current.volume = newVal;
        setState(s => ({ ...s, volume: newVal }));
        setGestureValue(newVal);
      } else if (gestureType === 'BRIGHTNESS') {
        const change = dy / (window.innerHeight / 2);
        const newVal = Math.min(Math.max(initialValueRef.current + change, 0.2), 1.5); // Min 0.2 brightness, Max 1.5
        setState(s => ({ ...s, brightness: newVal }));
        setGestureValue(newVal / 1.5); // Normalize for display (0-1 approx)
      } else if (gestureType === 'SEEK') {
        const changeS = (dx / window.innerWidth) * 90; // Full width swipe = 90 seconds
        const target = Math.min(Math.max(initialValueRef.current + changeS, 0), state.duration);
        targetSeekTimeRef.current = target;
        setGestureValue(target); 
        const diff = target - initialValueRef.current;
        setGestureText(`${diff > 0 ? '+' : ''}${Math.round(diff)}s`);
      }
    }
  };

  const handleTouchEnd = () => {
     if (gestureType === 'SEEK') {
         if (videoRef.current) {
             videoRef.current.currentTime = targetSeekTimeRef.current;
             setState(s => ({...s, currentTime: targetSeekTimeRef.current}));
         }
     }
     
     touchStartRef.current = null;
     setGestureType('NONE');
     setGestureText('');
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-black overflow-hidden select-none touch-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={() => setControlsVisible(!controlsVisible)}
    >
      <video
        ref={videoRef}
        src={video.url}
        className="w-full h-full pointer-events-none"
        style={{ 
            filter: `brightness(${state.brightness})`,
            objectFit: state.zoomMode === ZoomMode.ZOOM_150 ? 'contain' : state.zoomMode as any,
            transform: state.zoomMode === ZoomMode.ZOOM_150 ? `scale(${state.scale})` : 'none'
        }}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setState(s => ({ ...s, isPlaying: false }))}
      />

      {/* Overlays */}
      <GestureOverlay 
        type={gestureType} 
        value={gestureValue} 
        text={gestureText} 
        duration={state.duration}
      />

      <PlayerControls
        isVisible={controlsVisible && gestureType === 'NONE'}
        state={state}
        title={video.name}
        onPlayPause={togglePlay}
        onSeek={handleSeek}
        onZoomChange={cycleZoomMode}
        onSpeedChange={handleSpeedChange}
        onBack={onBack}
      />
    </div>
  );
};