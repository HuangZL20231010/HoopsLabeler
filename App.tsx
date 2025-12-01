import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FolderOpen, 
  Video, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  XCircle, 
  AlertCircle 
} from 'lucide-react';
import { FileSystemDirectoryHandle } from './types';
import Button from './components/Button';
import Toast from './components/Toast';

const App: React.FC = () => {
  // State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [videoName, setVideoName] = useState<string>("");
  const [dirHandle, setDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [fps, setFps] = useState<number>(30);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [toast, setToast] = useState<{ message: string | null; type: 'success' | 'error' }>({ message: null, type: 'success' });
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Helper: Format Time
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  // Helper: Show Toast
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // 1. File Selection
  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setVideoName(file.name);
      // Reset video specific states
      setCurrentTime(0);
      setIsPlaying(false);
    }
  };

  // 2. Directory Selection
  const handleDirSelect = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await window.showDirectoryPicker();
        setDirHandle(handle);
        showToast(`Directory selected: ${handle.name}`);
      } else {
        showToast("Your browser does not support the File System Access API.", 'error');
      }
    } catch (err: any) {
      console.error(err);
      // Handle User Cancellation
      if (err.name === 'AbortError') return;

      // Handle Security/Iframe issues common in preview environments
      if (err.name === 'SecurityError' || err.message?.includes('Cross origin sub frames')) {
        showToast("Security Block: Open app in a new tab or run locally.", 'error');
      } else {
        showToast("Failed to select directory.", 'error');
      }
    }
  };

  // 3. Navigation Logic
  const seek = useCallback((direction: 'forward' | 'backward') => {
    if (videoRef.current) {
      videoRef.current.pause();
      const frameTime = 1 / fps;
      if (direction === 'forward') {
        videoRef.current.currentTime = Math.min(videoRef.current.currentTime + frameTime, videoRef.current.duration);
      } else {
        videoRef.current.currentTime = Math.max(videoRef.current.currentTime - frameTime, 0);
      }
    }
  }, [fps]);

  // 4. Capture and Save Logic
  const captureAndSave = useCallback(async (label: 'ball_in' | 'ball_out') => {
    if (!videoRef.current || !canvasRef.current || !dirHandle) {
      if (!dirHandle) showToast("Please select a save directory first.", 'error');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // 1. Pause Video
    video.pause();

    // 2. Draw Frame
    // Ensure canvas matches video dimensions
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // 3. Convert to Blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          showToast("Failed to capture frame.", 'error');
          return;
        }

        try {
          // 4. Generate Filename
          // Clean video name, remove extension
          const safeVidName = videoName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_');
          const timestamp = video.currentTime.toFixed(3);
          const frameNum = Math.round(video.currentTime * fps);
          
          const baseFilename = `${safeVidName}_frame${frameNum}_${timestamp}s`;
          const imgFilename = `${baseFilename}.jpg`;
          const txtFilename = `${baseFilename}.txt`;

          // 5. Write Image
          const imgHandle = await dirHandle.getFileHandle(imgFilename, { create: true });
          const imgWritable = await imgHandle.createWritable();
          await imgWritable.write(blob);
          await imgWritable.close();

          // 6. Write Label
          const txtHandle = await dirHandle.getFileHandle(txtFilename, { create: true });
          const txtWritable = await txtHandle.createWritable();
          await txtWritable.write(label);
          await txtWritable.close();

          showToast(`Saved: ${label.replace('_', ' ').toUpperCase()}`);

        } catch (err) {
          console.error(err);
          showToast("Failed to save files. Check permissions.", 'error');
        }

      }, 'image/jpeg', 0.95); // High quality JPG
    }

  }, [dirHandle, videoName, fps]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default scrolling for arrows if video is loaded
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key) {
        case 'ArrowLeft':
          seek('backward');
          break;
        case 'ArrowRight':
          seek('forward');
          break;
        case '1':
          if (!e.repeat) captureAndSave('ball_in');
          break;
        case '2':
          if (!e.repeat) captureAndSave('ball_out');
          break;
        case ' ':
          if (!e.repeat && videoRef.current) {
            if (videoRef.current.paused) videoRef.current.play();
            else videoRef.current.pause();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [seek, captureAndSave]);

  // Video Event Listeners update loop
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
    };
  }, [videoSrc]);


  return (
    <div className="flex flex-col h-screen bg-gray-900 text-gray-100 font-sans">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: null })} />
      
      {/* Hidden Canvas for Processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header / Controls */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 shadow-md z-10">
        <div className="container mx-auto flex flex-wrap items-center justify-between gap-4">
          
          <div className="flex items-center gap-2">
             <div className="p-2 bg-blue-600 rounded-lg">
                <Video className="w-5 h-5 text-white" />
             </div>
             <div>
                <h1 className="text-lg font-bold tracking-tight">HoopsLabeler</h1>
                <p className="text-xs text-gray-400">Video Annotation Tool</p>
             </div>
          </div>

          <div className="flex flex-1 items-center justify-center gap-4 flex-wrap">
            {/* Video Input */}
            <div className="relative group">
              <input 
                type="file" 
                accept="video/*" 
                onChange={handleVideoSelect} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <Button variant="secondary" icon={<FolderOpen size={16} />}>
                {videoSrc ? "Change Video" : "Select Video"}
              </Button>
            </div>

            {/* Directory Input */}
            <Button 
              onClick={handleDirSelect} 
              variant={dirHandle ? "outline" : "secondary"}
              className={dirHandle ? "border-green-500 text-green-400" : ""}
              icon={dirHandle ? <CheckCircle size={16} className="text-green-500" /> : <FolderOpen size={16} />}
            >
               {dirHandle ? dirHandle.name : "Select Save Folder"}
            </Button>

            {/* FPS Settings */}
            <div className="flex items-center gap-2 bg-gray-700 rounded-md px-3 py-1">
              <Settings size={14} className="text-gray-400" />
              <label className="text-xs font-semibold text-gray-300 uppercase">FPS</label>
              <input 
                type="number" 
                value={fps} 
                onChange={(e) => setFps(Number(e.target.value))} 
                className="w-12 bg-transparent text-center border-b border-gray-500 focus:border-blue-500 focus:outline-none text-sm"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden bg-gray-950">
        
        {videoSrc ? (
          <div className="relative w-full max-w-5xl aspect-video bg-black rounded-lg shadow-2xl border border-gray-800 overflow-hidden group">
            <video 
              ref={videoRef}
              src={videoSrc} 
              className="w-full h-full object-contain"
              controls={false} // Custom controls
              playsInline
            />
            
            {/* Current Frame Info Overlay */}
            <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-md text-xs font-mono text-white border border-white/10">
               Time: {formatTime(currentTime)} / {formatTime(duration)}
               <span className="mx-2 text-gray-500">|</span>
               Frame: {Math.floor(currentTime * fps)}
            </div>

            {/* Helper Overlay (Initially visible or on pause) */}
            {!isPlaying && currentTime === 0 && (
               <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-black/40 backdrop-blur-md p-6 rounded-xl border border-white/10 text-center">
                    <p className="text-gray-300 mb-2">Keyboard Shortcuts</p>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm text-left">
                        <span className="text-gray-400">Seek Left</span> <span className="font-mono text-white">←</span>
                        <span className="text-gray-400">Seek Right</span> <span className="font-mono text-white">→</span>
                        <span className="text-gray-400">Play/Pause</span> <span className="font-mono text-white">Space</span>
                        <span className="text-blue-400 font-bold">Ball In</span> <span className="font-mono text-white">1</span>
                        <span className="text-red-400 font-bold">Ball Out</span> <span className="font-mono text-white">2</span>
                    </div>
                  </div>
               </div>
            )}
          </div>
        ) : (
          <div className="text-center p-12 border-2 border-dashed border-gray-700 rounded-2xl bg-gray-900/50">
            <Video className="w-16 h-16 mx-auto text-gray-600 mb-4" />
            <h3 className="text-xl font-medium text-gray-300">No Video Selected</h3>
            <p className="text-gray-500 mt-2">Select a video file to start annotating.</p>
          </div>
        )}

      </main>

      {/* Footer Controls */}
      <footer className="bg-gray-800 border-t border-gray-700 p-4 pb-6">
        <div className="container mx-auto max-w-5xl">
          
          {/* Timeline / Scrubber Visualization could go here, for now just simple controls */}
          
          <div className="flex items-center justify-between gap-6">
            
            {/* Seek Controls */}
            <div className="flex items-center gap-2">
               <Button onClick={() => seek('backward')} variant="secondary" className="px-3">
                 <ChevronLeft size={20} />
               </Button>
               <div className="text-xs text-center px-2 text-gray-400">
                  <div className="font-mono">1 frame</div>
                  <div>step</div>
               </div>
               <Button onClick={() => seek('forward')} variant="secondary" className="px-3">
                 <ChevronRight size={20} />
               </Button>
            </div>

            {/* Action Buttons (The Core Requirement) */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center">
                 <Button 
                   onClick={() => captureAndSave('ball_in')} 
                   variant="success" 
                   className="w-40 py-3 text-lg font-bold shadow-lg shadow-green-900/20 active:scale-95 transition-transform"
                   disabled={!dirHandle || !videoSrc}
                 >
                   Ball In
                 </Button>
                 <span className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-wider">Press '1'</span>
              </div>

              <div className="flex flex-col items-center">
                 <Button 
                   onClick={() => captureAndSave('ball_out')} 
                   variant="danger" 
                   className="w-40 py-3 text-lg font-bold shadow-lg shadow-red-900/20 active:scale-95 transition-transform"
                   disabled={!dirHandle || !videoSrc}
                 >
                   Ball Out
                 </Button>
                 <span className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-wider">Press '2'</span>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 w-32 justify-end">
               {!dirHandle ? (
                 <div className="flex items-center text-orange-400 text-xs">
                    <AlertCircle size={14} className="mr-1" />
                    <span>No Folder</span>
                 </div>
               ) : (
                 <div className="flex items-center text-green-500 text-xs">
                    <CheckCircle size={14} className="mr-1" />
                    <span>Ready</span>
                 </div>
               )}
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;