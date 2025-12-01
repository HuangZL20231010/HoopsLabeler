import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  FolderOpen, 
  Video, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle, 
  AlertCircle,
  FileVideo,
  Image as ImageIcon,
  Play
} from 'lucide-react';
import { FileSystemDirectoryHandle, FileSystemFileHandle } from './types';
import Button from './components/Button';
import Toast from './components/Toast';

const App: React.FC = () => {
  // --- State ---
  // Video Player State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [currentVideoName, setCurrentVideoName] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [fps, setFps] = useState<number>(30);

  // File System State
  const [sourceDirHandle, setSourceDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [saveDirHandle, setSaveDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  
  // Lists
  const [videoList, setVideoList] = useState<FileSystemFileHandle[]>([]);
  const [savedFileList, setSavedFileList] = useState<string[]>([]);

  // UI State
  const [toast, setToast] = useState<{ message: string | null; type: 'success' | 'error' }>({ message: null, type: 'success' });
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Helpers ---
  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // --- File System Logic ---

  // 1. Scan Directory Helpers
  const scanForVideos = async (dirHandle: FileSystemDirectoryHandle) => {
    const videos: FileSystemFileHandle[] = [];
    // @ts-ignore - values() is async iterable in modern browsers
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const name = entry.name.toLowerCase();
        if (name.endsWith('.mp4') || name.endsWith('.mov') || name.endsWith('.webm') || name.endsWith('.mkv')) {
          videos.push(entry as FileSystemFileHandle);
        }
      }
    }
    // Sort alphabetically
    return videos.sort((a, b) => a.name.localeCompare(b.name));
  };

  const scanForImages = async (dirHandle: FileSystemDirectoryHandle) => {
    const images: string[] = [];
    // @ts-ignore
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const name = entry.name.toLowerCase();
        if (name.endsWith('.jpg') || name.endsWith('.png')) {
          images.push(entry.name);
        }
      }
    }
    // Sort by newest (assuming timestamp in name) or alphabetical
    return images.sort((a, b) => b.localeCompare(a));
  };

  // 2. Select Source Directory (Videos)
  const handleSourceDirSelect = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await window.showDirectoryPicker({
          id: 'video-source',
          startIn: 'videos'
        });
        setSourceDirHandle(handle);
        
        const videos = await scanForVideos(handle);
        setVideoList(videos);
        
        showToast(`Found ${videos.length} videos.`);
      } else {
        showToast("Browser not supported.", 'error');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        showToast("Error accessing folder.", 'error');
      }
    }
  };

  // 3. Select Save Directory
  const handleSaveDirSelect = async () => {
    try {
      if ('showDirectoryPicker' in window) {
        const handle = await window.showDirectoryPicker({
          id: 'annotation-output',
          mode: 'readwrite'
        });
        setSaveDirHandle(handle);
        
        const images = await scanForImages(handle);
        setSavedFileList(images);
        
        showToast(`Save folder ready.`);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
         // Handle Security/Iframe issues common in preview environments
        if (err.name === 'SecurityError' || err.message?.includes('Cross origin sub frames')) {
            showToast("Security Block: Open app in a new tab.", 'error');
        } else {
            showToast("Error accessing folder.", 'error');
        }
      }
    }
  };

  // 4. Load a Video from List
  const loadVideo = async (fileHandle: FileSystemFileHandle) => {
    try {
      const file = await fileHandle.getFile();
      
      // Revoke old URL to prevent memory leaks
      if (videoSrc) {
        URL.revokeObjectURL(videoSrc);
      }

      const url = URL.createObjectURL(file);
      setVideoSrc(url);
      setCurrentVideoName(fileHandle.name);
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (err) {
      console.error(err);
      showToast("Failed to load video file.", 'error');
    }
  };

  // --- Core Functionality ---

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

  const captureAndSave = useCallback(async (label: 'ball_in' | 'ball_out') => {
    if (!videoRef.current || !canvasRef.current || !saveDirHandle) {
      if (!saveDirHandle) showToast("Select a Save Folder first!", 'error');
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    video.pause();

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(async (blob) => {
        if (!blob) return;

        try {
          const safeVidName = currentVideoName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_');
          const timestamp = video.currentTime.toFixed(3);
          const frameNum = Math.round(video.currentTime * fps);
          
          const baseFilename = `${safeVidName}_frame${frameNum}_${timestamp}s`;
          const imgFilename = `${baseFilename}.jpg`;
          const txtFilename = `${baseFilename}.txt`;

          // Write Image
          const imgHandle = await saveDirHandle.getFileHandle(imgFilename, { create: true });
          const imgWritable = await imgHandle.createWritable();
          await imgWritable.write(blob);
          await imgWritable.close();

          // Write Label
          const txtHandle = await saveDirHandle.getFileHandle(txtFilename, { create: true });
          const txtWritable = await txtHandle.createWritable();
          await txtWritable.write(label);
          await txtWritable.close();

          showToast(`Saved: ${label.toUpperCase()}`);
          
          // Refresh Saved List
          const updatedImages = await scanForImages(saveDirHandle);
          setSavedFileList(updatedImages);

        } catch (err) {
          console.error(err);
          showToast("Write failed. Check permissions.", 'error');
        }

      }, 'image/jpeg', 0.95);
    }
  }, [saveDirHandle, currentVideoName, fps]);

  // --- Effects ---

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();

      switch (e.key) {
        case 'ArrowLeft': seek('backward'); break;
        case 'ArrowRight': seek('forward'); break;
        case '1': if (!e.repeat) captureAndSave('ball_in'); break;
        case '2': if (!e.repeat) captureAndSave('ball_out'); break;
        case ' ':
          if (!e.repeat && videoRef.current) {
            videoRef.current.paused ? videoRef.current.play() : videoRef.current.pause();
          }
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [seek, captureAndSave]);

  // Video Event Listeners
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
    <div className="flex flex-col h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ ...toast, message: null })} />
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 p-3 shadow-md z-20 flex-none h-16">
        <div className="container mx-auto max-w-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="p-1.5 bg-blue-600 rounded-lg">
                <Video className="w-5 h-5 text-white" />
             </div>
             <h1 className="text-lg font-bold tracking-tight hidden md:block">HoopsLabeler</h1>
          </div>

          <div className="flex items-center gap-4">
             {/* Directory Selectors */}
             <div className="flex gap-2">
                <Button 
                  onClick={handleSourceDirSelect} 
                  variant={sourceDirHandle ? "outline" : "secondary"}
                  className={`text-xs px-3 py-1.5 ${sourceDirHandle ? "border-blue-500/50 text-blue-400 bg-blue-500/10" : ""}`}
                  icon={<FolderOpen size={14} />}
                >
                  {sourceDirHandle ? sourceDirHandle.name : "Select Video Folder"}
                </Button>

                <Button 
                  onClick={handleSaveDirSelect} 
                  variant={saveDirHandle ? "outline" : "secondary"}
                  className={`text-xs px-3 py-1.5 ${saveDirHandle ? "border-green-500/50 text-green-400 bg-green-500/10" : ""}`}
                  icon={saveDirHandle ? <CheckCircle size={14} /> : <FolderOpen size={14} />}
                >
                   {saveDirHandle ? saveDirHandle.name : "Select Save Folder"}
                </Button>
             </div>

             {/* FPS Config */}
             <div className="flex items-center gap-2 bg-gray-800 rounded px-2 py-1 border border-gray-700">
                <span className="text-[10px] text-gray-400 font-bold">FPS</span>
                <input 
                  type="number" 
                  value={fps} 
                  onChange={(e) => setFps(Number(e.target.value))} 
                  className="w-8 bg-transparent text-center focus:outline-none text-xs"
                />
             </div>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left/Center: Video Player */}
        <div className="flex-1 flex flex-col bg-black relative">
          
          <div className="flex-1 flex items-center justify-center p-4">
            {videoSrc ? (
              <div className="relative w-full h-full max-h-[80vh] flex items-center justify-center group">
                <video 
                  ref={videoRef}
                  src={videoSrc} 
                  className="max-w-full max-h-full shadow-2xl"
                  playsInline
                />
                
                {/* Overlay Info */}
                <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-xs font-mono text-white border border-white/10">
                   {formatTime(currentTime)} <span className="text-gray-500">/</span> {formatTime(duration)}
                   <span className="mx-2 text-gray-500">|</span>
                   FR: {Math.floor(currentTime * fps)}
                </div>

                {/* Paused Overlay */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 p-4 rounded-full border border-white/20 backdrop-blur-sm">
                      <Play className="w-8 h-8 fill-white text-white ml-1" />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <FileVideo className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a Video Folder to begin</p>
              </div>
            )}
          </div>

          {/* Player Controls Bar */}
          <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-between px-6 z-10">
             <div className="flex items-center gap-2">
                <Button onClick={() => seek('backward')} variant="secondary" className="h-10 w-10 p-0 rounded-full">
                  <ChevronLeft size={20} />
                </Button>
                <span className="text-xs text-gray-500 text-center w-12 leading-tight">1 Frame<br/>Step</span>
                <Button onClick={() => seek('forward')} variant="secondary" className="h-10 w-10 p-0 rounded-full">
                  <ChevronRight size={20} />
                </Button>
             </div>

             <div className="flex items-center gap-4">
                <Button 
                   onClick={() => captureAndSave('ball_in')} 
                   disabled={!videoSrc || !saveDirHandle}
                   className="bg-green-600 hover:bg-green-700 w-32 h-12 text-sm font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Ball In (1)
                </Button>
                <Button 
                   onClick={() => captureAndSave('ball_out')} 
                   disabled={!videoSrc || !saveDirHandle}
                   className="bg-red-600 hover:bg-red-700 w-32 h-12 text-sm font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Ball Out (2)
                </Button>
             </div>
          </div>
        </div>

        {/* Right Sidebar: Playlist & Output */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col shadow-xl z-20">
          
          {/* Tab 1: Video List */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-gray-800">
             <div className="p-3 bg-gray-850 border-b border-gray-800 font-semibold text-xs text-gray-400 uppercase tracking-wider flex justify-between items-center">
                <span>Playlist</span>
                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">{videoList.length}</span>
             </div>
             
             <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                {videoList.length === 0 ? (
                  <div className="text-gray-600 text-sm text-center py-8 italic">No videos found</div>
                ) : (
                  videoList.map((file, idx) => (
                    <button
                      key={file.name}
                      onClick={() => loadVideo(file)}
                      className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-all flex items-start gap-2 ${
                        currentVideoName === file.name 
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30' 
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`}
                    >
                      <FileVideo size={16} className={`mt-0.5 shrink-0 ${currentVideoName === file.name ? 'text-blue-400' : 'text-gray-600'}`} />
                      <span className="truncate w-full">{file.name}</span>
                    </button>
                  ))
                )}
             </div>
          </div>

          {/* Tab 2: Saved Files */}
          <div className="flex-1 flex flex-col min-h-0 bg-gray-900/50">
             <div className="p-3 bg-gray-850 border-b border-gray-800 font-semibold text-xs text-gray-400 uppercase tracking-wider flex justify-between items-center">
                <span>Saved Output</span>
                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">{savedFileList.length}</span>
             </div>
             
             <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                {savedFileList.length === 0 ? (
                  <div className="text-gray-600 text-sm text-center py-8 italic">No annotations yet</div>
                ) : (
                  savedFileList.map((filename, idx) => (
                    <div 
                      key={idx}
                      className="px-3 py-2 rounded-md bg-gray-900 border border-gray-800 flex items-center gap-2 text-xs text-gray-400"
                    >
                      <ImageIcon size={14} className="text-green-600 shrink-0" />
                      <span className="truncate">{filename}</span>
                    </div>
                  ))
                )}
             </div>
          </div>

        </div>

      </div>
    </div>
  );
};

export default App;