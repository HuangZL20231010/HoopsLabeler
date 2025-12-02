import React, { RefObject } from 'react';
import { Play, FileVideo } from 'lucide-react';

interface VideoPlayerProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  videoSrc: string | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  fps: number;
  currentLabel?: string | null;
  onTogglePlay: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
  videoRef,
  videoSrc,
  isPlaying,
  currentTime,
  duration,
  fps,
  currentLabel,
  onTogglePlay,
}) => {
  const formatTime = (time: number) => {
    const safeTime = Math.max(0, time);
    const minutes = Math.floor(safeTime / 60);
    const seconds = Math.floor(safeTime % 60);
    const ms = Math.floor((safeTime % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex-1 flex flex-col bg-black relative">
      <div className="flex-1 flex items-center justify-center p-4">
        {videoSrc ? (
          <div
            className="relative w-full h-full max-h-[80vh] flex items-center justify-center group cursor-pointer"
            onClick={onTogglePlay}
          >
            <video
              ref={videoRef}
              src={videoSrc}
              className="max-w-full max-h-full shadow-2xl"
              playsInline
            />

            {/* Current Label Overlay */}
            {currentLabel && (
              <div className={`absolute top-8 right-8 px-6 py-2 rounded-lg text-white font-bold text-xl shadow-lg animate-fade-in z-20 uppercase tracking-wider border border-white/20 backdrop-blur-md ${
                currentLabel === 'ball_in' ? 'bg-green-600/90' : 'bg-red-600/90'
              }`}>
                {currentLabel.replace('_', ' ')}
              </div>
            )}

            {/* Time/FPS Info - Centered and Enlarged */}
            <div
              className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-xl text-2xl font-mono text-white border border-white/20 select-none shadow-lg z-10"
              onClick={(e) => e.stopPropagation()}
            >
              {formatTime(Math.min(currentTime, duration > 0 ? duration : Infinity))}{' '}
              <span className="text-gray-500">/</span> {formatTime(duration)}
              <span className="mx-3 text-gray-500">|</span>
              <span className="text-blue-400 font-bold">FR: {Math.floor(currentTime * fps)}</span>
            </div>
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <FileVideo className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>Select a Video Folder in the Sidebar to begin</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoPlayer;