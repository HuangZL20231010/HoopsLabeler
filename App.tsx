import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Video, 
  HelpCircle 
} from 'lucide-react';
import { FileSystemDirectoryHandle, FileSystemFileHandle, EditingItem } from './types';
import Toast from './components/Toast';
import OnboardingGuide from './components/OnboardingGuide';
import VideoPlayer from './components/VideoPlayer';
import ControlBar from './components/ControlBar';
import LeftSidebar from './components/LeftSidebar';
import Sidebar from './components/Sidebar';
import EditModal from './components/EditModal';

const App: React.FC = () => {
  // --- State ---
  // Video Player State
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [currentVideoName, setCurrentVideoName] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [fps, setFps] = useState<number>(30);
  const [currentFrameLabel, setCurrentFrameLabel] = useState<string | null>(null);

  // File System State
  const [sourceDirHandle, setSourceDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  const [saveDirHandle, setSaveDirHandle] = useState<FileSystemDirectoryHandle | null>(null);
  
  // Lists
  const [videoList, setVideoList] = useState<FileSystemFileHandle[]>([]);
  // Store handles for images so we can read them later for editing
  const [savedFileList, setSavedFileList] = useState<FileSystemFileHandle[]>([]);

  // Editing State
  const [editingItem, setEditingItem] = useState<EditingItem | null>(null);

  // UI State
  const [toast, setToast] = useState<{ message: string | null; type: 'success' | 'error' }>({ message: null, type: 'success' });
  const [showGuide, setShowGuide] = useState<boolean>(false);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelCache = useRef<Map<string, string>>(new Map()); // cache filename -> label content

  // --- Helpers ---
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
      setCurrentFrameLabel(null);
    } catch (err) {
      console.error(err);
      showToast("Failed to load video file.", 'error');
    }
  }, []);

  // --- Real-time Annotation Check ---

  // Build an index of frame numbers for the current video
  // Format: FrameNumber -> FileSystemFileHandle (Image)
  const currentVideoAnnotations = useMemo(() => {
    const map = new Map<number, FileSystemFileHandle>();
    if (!currentVideoName) return map;

    // Sanitize video name for regex matching (escape dots)
    const safeVidName = currentVideoName.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9]/gi, '_');
    
    savedFileList.forEach(handle => {
        // Filename format: {safeVidName}_frame{frameNum}_{timestamp}s.jpg
        if (handle.name.startsWith(safeVidName)) {
            const match = handle.name.match(/_frame(\d+)_/);
            if (match && match[1]) {
                const frameNum = parseInt(match[1], 10);
                map.set(frameNum, handle);
            }
        }
    });
    return map;
  }, [savedFileList, currentVideoName]);

  // Check if current frame has an annotation
  useEffect(() => {
      const checkAnnotation = async () => {
          const currentFrame = Math.round(currentTime * fps);
          
          if (currentVideoAnnotations.has(currentFrame)) {
              const imgHandle = currentVideoAnnotations.get(currentFrame)!;
              
              // Check cache first
              if (labelCache.current.has(imgHandle.name)) {
                  setCurrentFrameLabel(labelCache.current.get(imgHandle.name)!);
                  return;
              }

              // Read file if not cached
              try {
                  if (saveDirHandle) {
                      const txtName = imgHandle.name.replace(/\.(jpg|png)$/i, '.txt');
                      const txtHandle = await saveDirHandle.getFileHandle(txtName);
                      const file = await txtHandle.getFile();
                      const text = await file.text();
                      const label = text.trim();
                      
                      labelCache.current.set(imgHandle.name, label);
                      setCurrentFrameLabel(label);
                  }
              } catch (e) {
                  // Fallback if txt missing
                  setCurrentFrameLabel('marked');
              }
          } else {
              setCurrentFrameLabel(null);
          }
      };

      checkAnnotation();
  }, [currentTime, fps, currentVideoAnnotations, saveDirHandle]);


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

          // Update cache immediately
          labelCache.current.set(imgFilename, label);

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
      const txtName = imgHandle.name.replace(/\.(jpg|png)$/i, '.txt');
      let txtHandle: FileSystemFileHandle;
      let currentLabel = "Unknown";

      try {
        txtHandle = await saveDirHandle.getFileHandle(txtName);
        const txtFile = await txtHandle.getFile();
        currentLabel = await txtFile.text();
      } catch (e) {
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
      
      // Update cache
      labelCache.current.set(editingItem.filename, newLabel);
      // Force overlay update if on same frame
      setCurrentFrameLabel(newLabel);

      showToast(`Updated to: ${newLabel}`);
      setTimeout(closeEditModal, 500);

    } catch (e) {
      showToast("Failed to update label", 'error');
    }
  };

  const handleDeleteAnnotation = async () => {
      if (!editingItem || !saveDirHandle) return;

      if (!confirm("Are you sure you want to delete this annotation? This cannot be undone.")) {
          return;
      }

      try {
          // Delete Image
          await saveDirHandle.removeEntry(editingItem.filename);
          
          // Delete Text
          const txtName = editingItem.filename.replace(/\.(jpg|png)$/i, '.txt');
          try {
              await saveDirHandle.removeEntry(txtName);
          } catch(e) {
              console.warn("Text file not found or already deleted");
          }

          // Cleanup UI
          labelCache.current.delete(editingItem.filename);
          showToast("Annotation Deleted");
          closeEditModal();

          // Refresh List
          const updatedImages = await scanForImages(saveDirHandle);
          setSavedFileList(updatedImages);

      } catch(e) {
          console.error(e);
          showToast("Failed to delete file", 'error');
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
        
        {/* Left Sidebar: Playlist */}
        <LeftSidebar
          videoList={videoList}
          currentVideoName={currentVideoName}
          sourceDirHandle={sourceDirHandle}
          onSelectSource={handleSourceDirSelect}
          onLoadVideo={loadVideo}
        />

        {/* Center: Video Player & Controls */}
        <div className="flex-1 flex flex-col bg-black relative min-w-0">
          <VideoPlayer
            videoRef={videoRef}
            videoSrc={videoSrc}
            isPlaying={isPlaying}
            currentTime={currentTime}
            duration={duration}
            fps={fps}
            currentLabel={currentFrameLabel}
            onTogglePlay={togglePlay}
          />
          
          <ControlBar
            onSeek={seek}
            onCapture={captureAndSave}
            isVideoLoaded={!!videoSrc}
            isSaveReady={!!saveDirHandle}
          />
        </div>

        {/* Right Sidebar: Rules & Saved */}
        <Sidebar
          savedFileList={savedFileList}
          saveDirHandle={saveDirHandle}
          onSelectSave={handleSaveDirSelect}
          onEditFile={openEditModal}
        />
      </div>

      {/* Edit Modal Overlay */}
      <EditModal 
        item={editingItem} 
        onClose={closeEditModal} 
        onUpdateLabel={updateLabel} 
        onDelete={handleDeleteAnnotation}
      />
    </div>
  );
};

export default App;