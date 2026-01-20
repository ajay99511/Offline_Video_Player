export interface VideoFile {
  id: string;
  name: string;
  url: string;
  file: File;
}

export interface AudioFile {
  id: string;
  name: string;
  artist: string;
  url: string;
  file: File;
}

export enum ZoomMode {
  FIT = 'contain',
  FILL = 'cover',
  STRETCH = 'fill',
  ZOOM_150 = 'zoom_150',
  ZOOM_200 = 'zoom_200'
}

export enum RepeatMode {
  OFF = 'off',
  ONE = 'one',
  ALL = 'all'
}

export type GestureType = 'NONE' | 'VOLUME' | 'BRIGHTNESS' | 'SEEK' | 'ZOOM';

export interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  brightness: number;
  playbackRate: number;
  zoomMode: ZoomMode;
  scale: number;
}

export interface AudioPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playbackRate: number;
  isShuffling: boolean;
  repeatMode: RepeatMode;
}
