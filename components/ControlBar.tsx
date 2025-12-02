import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import Button from './Button';

interface ControlBarProps {
  onSeek: (direction: 'forward' | 'backward') => void;
  onCapture: (label: 'ball_in' | 'ball_out') => void;
  isVideoLoaded: boolean;
  isSaveReady: boolean;
}

const ControlBar: React.FC<ControlBarProps> = ({
  onSeek,
  onCapture,
  isVideoLoaded,
  isSaveReady,
}) => {
  return (
    <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-center relative px-6 z-10">
      {/* Left Controls (Absolute) */}
      <div className="absolute left-6 flex items-center gap-2">
        <Button onClick={() => onSeek('backward')} variant="secondary" className="h-10 w-10 p-0 rounded-full">
          <ChevronLeft size={20} />
        </Button>
        <span className="text-xs text-gray-500 text-center w-12 leading-tight select-none">
          1 Frame<br />Step
        </span>
        <Button onClick={() => onSeek('forward')} variant="secondary" className="h-10 w-10 p-0 rounded-full">
          <ChevronRight size={20} />
        </Button>
      </div>

      {/* Center Controls (Ball In/Out) */}
      <div className="flex items-center gap-4">
        <Button
          onClick={() => onCapture('ball_in')}
          disabled={!isVideoLoaded || !isSaveReady}
          className="bg-green-600 hover:bg-green-700 w-32 h-12 text-sm font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-green-900/20"
        >
          Ball In (1)
        </Button>
        <Button
          onClick={() => onCapture('ball_out')}
          disabled={!isVideoLoaded || !isSaveReady}
          className="bg-red-600 hover:bg-red-700 w-32 h-12 text-sm font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-red-900/20"
        >
          Ball Out (2)
        </Button>
      </div>
    </div>
  );
};

export default ControlBar;