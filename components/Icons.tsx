import React from 'react';
import { 
  Play, 
  Pause, 
  FastForward, 
  Rewind, 
  Maximize, 
  Minimize, 
  Sun, 
  Volume2, 
  Settings,
  FolderOpen,
  ChevronLeft,
  X,
  Music,
  Video,
  SkipBack,
  SkipForward,
  Repeat,
  Repeat1,
  Shuffle,
  Disc
} from 'lucide-react';

export const PlayIcon = () => <Play size={24} fill="currentColor" />;
export const PauseIcon = () => <Pause size={24} fill="currentColor" />;
export const ForwardIcon = () => <FastForward size={24} />;
export const RewindIcon = () => <Rewind size={24} />;
export const ExpandIcon = () => <Maximize size={20} />;
export const ShrinkIcon = () => <Minimize size={20} />;
export const BrightnessIcon = () => <Sun size={32} />;
export const VolumeIcon = () => <Volume2 size={32} />;
export const SettingsIcon = () => <Settings size={20} />;
export const FolderIcon = () => <FolderOpen size={32} />;
export const BackIcon = () => <ChevronLeft size={28} />;
export const CloseIcon = () => <X size={20} />;

// Audio & Nav Icons
export const MusicIcon = () => <Music size={24} />;
export const VideoIcon = () => <Video size={24} />;
export const SkipBackIcon = () => <SkipBack size={24} fill="currentColor" />;
export const SkipForwardIcon = () => <SkipForward size={24} fill="currentColor" />;
export const RepeatIcon = () => <Repeat size={20} />;
export const Repeat1Icon = () => <Repeat1 size={20} />;
export const ShuffleIcon = () => <Shuffle size={20} />;
export const DiscIcon = () => <Disc size={64} />;
