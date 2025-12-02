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
  Play,
  X,
  Edit2,
  HelpCircle,
  Info
} from 'lucide-react';
import { FileSystemDirectoryHandle, FileSystemFileHandle } from './types';
import Button from './components/Button';
import Toast from './components/Toast';
import OnboardingGuide from './components/OnboardingGuide';

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
  // Store handles for images so we can read them later for editing
  const [savedFileList, setSavedFileList] = useState<FileSystemFileHandle[]>([]);

  // Editing State
  const [editingItem, setEditingItem] = useState<{
    imgUrl: string;
    txtHandle: FileSystemFileHandle;
    currentLabel: string;
    filename: string;
  } | null>(null);

  // UI State
  const [toast, setToast] = useState<{ message: string | null; type: 'success' | 'error' }>({ message: null, type: 'success' });
  const [showGuide, setShowGuide] = useState<boolean>(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // --- Helpers ---
  const formatTime = (time: number) => {
    // Clamp time to avoid 0.51 / 0.40 issues visually
    const safeTime = Math.max(0, time);
    const minutes = Math.floor(safeTime / 60);
    const seconds = Math.floor(safeTime % 60);
    const ms = Math.floor((safeTime % 1) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  };

  // --- Initialization & Guide ---
  useEffect(() => {
    const hasSeenGuide = localStorage.getItem('hoops_guide_seen');
    if (!hasSeenGuide) {
      setShowGuide(true);
    }
  }, []);

  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('hoops_guide_seen', 'true');
  };

  const handleOpenGuide = () => {
    setShowGuide(true);
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
    const images: FileSystemFileHandle[] = [];
    // @ts-ignore
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        const name = entry.name.toLowerCase();
        if (name.endsWith('.jpg') || name.endsWith('.png')) {
          images.push(entry as FileSystemFileHandle);
        }
      }
    }
    // Sort by name (which usually contains timestamp) descending to show newest first
    return images.sort((a, b) => b.name.localeCompare(a.name));
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
        if (err.name === 'SecurityError' || err.message?.includes('Cross origin sub frames')) {
            showToast("Security Block: Open app in a new tab.", 'error');
        } else {
            showToast("Error accessing folder.", 'error');
        }
      }
    }
  };

  // 4. Load a Video from List
  const loadVideo = useCallback(async (fileHandle: FileSystemFileHandle) => {
    try {
      const file = await fileHandle.getFile();
      
      setVideoSrc(prev => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(file);
      });

      setCurrentVideoName(fileHandle.name);
      setCurrentTime(0);
      setIsPlaying(false);
    } catch (err) {
      console.error(err);
      showToast("Failed to load video file.", 'error');
    }
  }, []);

  // --- Core Functionality ---

  const togglePlay = useCallback(() => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
      } else {
        videoRef.current.pause();
      }
    }
  }, []);

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

  // --- Edit Modal Logic ---

  const openEditModal = async (imgHandle: FileSystemFileHandle) => {
    if (!saveDirHandle) return;

    try {
      // 1. Get Image URL
      const file = await imgHandle.getFile();
      const imgUrl = URL.createObjectURL(file);

      // 2. Find Text Handle
      // Assume convention: name.jpg -> name.txt
      const txtName = imgHandle.name.replace(/\.(jpg|png)$/i, '.txt');
      let txtHandle: FileSystemFileHandle;
      let currentLabel = "Unknown";

      try {
        txtHandle = await saveDirHandle.getFileHandle(txtName);
        const txtFile = await txtHandle.getFile();
        currentLabel = await txtFile.text();
      } catch (e) {
        // If text file doesn't exist, create it? Or just warn. 
        // Let's create a new handle if we can't find it to allow fixing missing labels
        txtHandle = await saveDirHandle.getFileHandle(txtName, { create: true });
        currentLabel = "No Label";
      }

      setEditingItem({
        imgUrl,
        txtHandle,
        currentLabel: currentLabel.trim(),
        filename: imgHandle.name
      });

    } catch (err) {
      console.error(err);
      showToast("Could not open file details.", 'error');
    }
  };

  const closeEditModal = () => {
    if (editingItem) {
      URL.revokeObjectURL(editingItem.imgUrl);
    }
    setEditingItem(null);
  };

  const updateLabel = async (newLabel: string) => {
    if (!editingItem) return;
    try {
      const writable = await editingItem.txtHandle.createWritable();
      await writable.write(newLabel);
      await writable.close();
      
      setEditingItem({
        ...editingItem,
        currentLabel: newLabel
      });
      showToast(`Updated to: ${newLabel}`);
      setTimeout(closeEditModal, 500);

    } catch (e) {
      showToast("Failed to update label", 'error');
    }
  };

  // --- Effects ---

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if modal is open
      if (editingItem || showGuide) {
         if (e.key === 'Escape') {
             closeEditModal();
             handleCloseGuide();
         }
         return;
      }

      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) e.preventDefault();

      switch (e.key) {
        case 'ArrowLeft': seek('backward'); break;
        case 'ArrowRight': seek('forward'); break;
        
        // Playlist Navigation
        case 'ArrowUp': {
           const prevIdx = videoList.findIndex(v => v.name === currentVideoName);
           if (prevIdx > 0) {
             loadVideo(videoList[prevIdx - 1]);
           }
           break;
        }
        case 'ArrowDown': {
           const nextIdx = videoList.findIndex(v => v.name === currentVideoName);
           if (nextIdx !== -1 && nextIdx < videoList.length - 1) {
             loadVideo(videoList[nextIdx + 1]);
           } else if (nextIdx === -1 && videoList.length > 0) {
             loadVideo(videoList[0]);
           }
           break;
        }

        case '1': if (!e.repeat) captureAndSave('ball_in'); break;
        case '2': if (!e.repeat) captureAndSave('ball_out'); break;
        case ' ':
          if (!e.repeat) togglePlay();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [seek, captureAndSave, togglePlay, editingItem, showGuide, videoList, currentVideoName, loadVideo]);

  // Video Event Listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => {
       if (video.duration && video.duration !== Infinity) {
         setDuration(video.duration);
       }
    };
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
      <OnboardingGuide isOpen={showGuide} onClose={handleCloseGuide} />
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
             
             {/* Help Button */}
             <button onClick={handleOpenGuide} className="text-gray-500 hover:text-white transition-colors" title="Guide">
                 <HelpCircle size={20} />
             </button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left/Center: Video Player */}
        <div className="flex-1 flex flex-col bg-black relative">
          
          <div className="flex-1 flex items-center justify-center p-4">
            {videoSrc ? (
              <div 
                className="relative w-full h-full max-h-[80vh] flex items-center justify-center group cursor-pointer"
                onClick={togglePlay}
              >
                <video 
                  ref={videoRef}
                  src={videoSrc} 
                  className="max-w-full max-h-full shadow-2xl"
                  playsInline
                />
                
                {/* Overlay Info - Centered and Enlarged */}
                <div 
                  className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/70 backdrop-blur-md px-6 py-3 rounded-xl text-2xl font-mono text-white border border-white/20 select-none shadow-lg z-10"
                  onClick={(e) => e.stopPropagation()} // Prevent clicking info from toggling play
                >
                   {/* Clamp current time visually to duration if needed */}
                   {formatTime(Math.min(currentTime, duration > 0 ? duration : Infinity))} <span className="text-gray-500">/</span> {formatTime(duration)}
                   <span className="mx-3 text-gray-500">|</span>
                   <span className="text-blue-400 font-bold">FR: {Math.floor(currentTime * fps)}</span>
                </div>

                {/* Paused Overlay */}
                {!isPlaying && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-black/50 p-4 rounded-full border border-white/20 backdrop-blur-sm shadow-xl">
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

          {/* Player Controls Bar - Centered Action Buttons */}
          <div className="h-20 bg-gray-900 border-t border-gray-800 flex items-center justify-center relative px-6 z-10">
             {/* Left Controls (Absolute) */}
             <div className="absolute left-6 flex items-center gap-2">
                <Button onClick={() => seek('backward')} variant="secondary" className="h-10 w-10 p-0 rounded-full">
                  <ChevronLeft size={20} />
                </Button>
                <span className="text-xs text-gray-500 text-center w-12 leading-tight select-none">1 Frame<br/>Step</span>
                <Button onClick={() => seek('forward')} variant="secondary" className="h-10 w-10 p-0 rounded-full">
                  <ChevronRight size={20} />
                </Button>
             </div>

             {/* Center Controls (Ball In/Out) */}
             <div className="flex items-center gap-4">
                <Button 
                   onClick={() => captureAndSave('ball_in')} 
                   disabled={!videoSrc || !saveDirHandle}
                   className="bg-green-600 hover:bg-green-700 w-32 h-12 text-sm font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-green-900/20"
                >
                  Ball In (1)
                </Button>
                <Button 
                   onClick={() => captureAndSave('ball_out')} 
                   disabled={!videoSrc || !saveDirHandle}
                   className="bg-red-600 hover:bg-red-700 w-32 h-12 text-sm font-bold uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed shadow-lg hover:shadow-red-900/20"
                >
                  Ball Out (2)
                </Button>
             </div>
          </div>
        </div>

        {/* Right Sidebar: Playlist & Output */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col shadow-xl z-20">
          
          {/* Rules Section (New) */}
          <div className="p-4 bg-gray-900 border-b border-gray-800 space-y-3">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
              <Info size={14} className="text-blue-400" /> 标注规则 (Rules)
            </h3>
            <div className="text-xs text-gray-300 space-y-2 bg-gray-800/50 p-3 rounded border border-gray-700/50">
              <p className="flex items-start gap-2 leading-relaxed">
                <span className="text-blue-400 font-bold shrink-0">1.</span>
                <span>只需要标注 <span className="text-white font-bold bg-white/10 px-1 rounded">球在篮框附近</span> 的图片</span>
              </p>
              <div className="flex items-start gap-2 pt-1 border-t border-gray-700/50 mt-1">
                <span className="text-blue-400 font-bold shrink-0">2.</span>
                <div className="space-y-1 w-full">
                   <p className="text-gray-400 mb-1">快捷键 (Shortcuts):</p>
                   <div className="grid grid-cols-2 gap-1.5 text-[10px] text-gray-400 font-mono">
                      <div className="bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 flex justify-between"><span>In</span> <span className="text-gray-200">1</span></div>
                      <div className="bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 flex justify-between"><span>Out</span> <span className="text-gray-200">2</span></div>
                      <div className="bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 flex justify-between"><span>Play</span> <span className="text-gray-200">Spc</span></div>
                      <div className="bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 flex justify-between"><span>Seek</span> <span className="text-gray-200">←→</span></div>
                      <div className="col-span-2 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 flex justify-between"><span>Switch Video (切换视频)</span> <span className="text-gray-200">↑ ↓</span></div>
                   </div>
                </div>
              </div>
            </div>
          </div>

          {/* Tab 1: Video List */}
          <div className="flex-1 flex flex-col min-h-0 border-b border-gray-800">
             <div className="p-3 bg-gray-850 border-b border-gray-800 font-semibold text-xs text-gray-400 uppercase tracking-wider flex justify-between items-center shadow-sm">
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
                      className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-all flex items-start gap-2 group ${
                        currentVideoName === file.name 
                          ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30' 
                          : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                      }`}
                    >
                      <FileVideo size={16} className={`mt-0.5 shrink-0 transition-colors ${currentVideoName === file.name ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'}`} />
                      <span className="truncate w-full">{file.name}</span>
                    </button>
                  ))
                )}
             </div>
          </div>

          {/* Tab 2: Saved Files */}
          <div className="flex-1 flex flex-col min-h-0 bg-gray-900/50">
             <div className="p-3 bg-gray-850 border-b border-gray-800 font-semibold text-xs text-gray-400 uppercase tracking-wider flex justify-between items-center shadow-sm">
                <span>Saved Output</span>
                <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300">{savedFileList.length}</span>
             </div>
             
             <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
                {savedFileList.length === 0 ? (
                  <div className="text-gray-600 text-sm text-center py-8 italic">No annotations yet</div>
                ) : (
                  savedFileList.map((fileHandle, idx) => (
                    <button 
                      key={idx}
                      onClick={() => openEditModal(fileHandle)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-800 border border-transparent hover:border-gray-700 flex items-center gap-2 text-xs text-gray-400 transition-colors group"
                    >
                      <div className="bg-gray-800 p-1 rounded text-gray-500 group-hover:text-gray-300">
                         <ImageIcon size={14} />
                      </div>
                      <span className="truncate flex-1">{fileHandle.name}</span>
                      <Edit2 size={12} className="opacity-0 group-hover:opacity-50" />
                    </button>
                  ))
                )}
             </div>
          </div>

        </div>
      </div>

      {/* Edit Modal Overlay */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            
            <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-850">
               <h3 className="font-semibold text-sm text-gray-200 truncate pr-4" title={editingItem.filename}>
                 Edit: {editingItem.filename}
               </h3>
               <button onClick={closeEditModal} className="text-gray-500 hover:text-white transition-colors">
                 <X size={20} />
               </button>
            </div>

            <div className="p-6 flex flex-col items-center">
               <div className="relative rounded-lg overflow-hidden border border-gray-700 mb-6 bg-black">
                 <img src={editingItem.imgUrl} alt="Frame preview" className="max-h-[50vh] object-contain" />
                 <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-center backdrop-blur-sm">
                    <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">Current Label</span>
                    <div className={`text-lg font-bold ${editingItem.currentLabel.includes('in') ? 'text-green-400' : 'text-red-400'}`}>
                      {editingItem.currentLabel.toUpperCase()}
                    </div>
                 </div>
               </div>

               <div className="grid grid-cols-2 gap-4 w-full">
                  <Button 
                    variant={editingItem.currentLabel === 'ball_in' ? 'primary' : 'outline'}
                    className={editingItem.currentLabel === 'ball_in' ? 'bg-green-600 hover:bg-green-700 border-transparent' : 'hover:border-green-500 hover:text-green-500'}
                    onClick={() => updateLabel('ball_in')}
                  >
                    Set Ball In
                  </Button>
                  <Button 
                    variant={editingItem.currentLabel === 'ball_out' ? 'primary' : 'outline'}
                    className={editingItem.currentLabel === 'ball_out' ? 'bg-red-600 hover:bg-red-700 border-transparent' : 'hover:border-red-500 hover:text-red-500'}
                    onClick={() => updateLabel('ball_out')}
                  >
                    Set Ball Out
                  </Button>
               </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default App;