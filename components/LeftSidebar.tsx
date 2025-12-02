import React from 'react';
import { FolderOpen, AlertCircle, FileVideo } from 'lucide-react';
import { FileSystemDirectoryHandle, FileSystemFileHandle } from '../types';

interface LeftSidebarProps {
  videoList: FileSystemFileHandle[];
  currentVideoName: string;
  sourceDirHandle: FileSystemDirectoryHandle | null;
  onSelectSource: () => void;
  onLoadVideo: (file: FileSystemFileHandle) => void;
}

const LeftSidebar: React.FC<LeftSidebarProps> = ({
  videoList,
  currentVideoName,
  sourceDirHandle,
  onSelectSource,
  onLoadVideo,
}) => {
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shadow-xl z-20 flex-shrink-0">
      {/* Header / Select Button */}
      <div className="p-3 bg-gray-850 border-b border-gray-800 shadow-sm flex flex-col gap-3">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-xs text-gray-400 uppercase tracking-wider">Playlist</span>
          <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 text-[10px]">{videoList.length}</span>
        </div>
        <button
          onClick={onSelectSource}
          className={`text-xs flex items-center justify-center gap-2 w-full py-2.5 rounded-md border transition-all duration-200 font-medium ${
            sourceDirHandle
              ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:text-white hover:border-gray-600'
              : 'bg-blue-600 border-transparent text-white hover:bg-blue-500 shadow-md animate-pulse-slow'
          }`}
        >
          <FolderOpen size={14} />
          <span className="truncate max-w-[180px]">
            {sourceDirHandle ? sourceDirHandle.name : 'Select Video Folder'}
          </span>
        </button>
      </div>

      {/* Video List */}
      <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
        {videoList.length === 0 ? (
          <div className="text-gray-600 text-xs text-center py-8 italic flex flex-col items-center gap-2">
            <AlertCircle size={16} />
            <span>Select a folder to load videos</span>
          </div>
        ) : (
          videoList.map((file) => (
            <button
              key={file.name}
              onClick={() => onLoadVideo(file)}
              className={`w-full text-left px-3 py-2.5 rounded-md text-sm transition-all flex items-start gap-2 group ${
                currentVideoName === file.name
                  ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
              }`}
            >
              <FileVideo
                size={16}
                className={`mt-0.5 shrink-0 transition-colors ${
                  currentVideoName === file.name ? 'text-blue-400' : 'text-gray-600 group-hover:text-gray-400'
                }`}
              />
              <span className="truncate w-full font-medium">{file.name}</span>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default LeftSidebar;