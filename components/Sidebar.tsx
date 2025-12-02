import React from 'react';
import { CheckCircle, FolderOpen, Edit2, ImageIcon, Info } from 'lucide-react';
import { FileSystemDirectoryHandle, FileSystemFileHandle } from '../types';

interface SidebarProps {
  savedFileList: FileSystemFileHandle[];
  saveDirHandle: FileSystemDirectoryHandle | null;
  onSelectSave: () => void;
  onEditFile: (file: FileSystemFileHandle) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  savedFileList,
  saveDirHandle,
  onSelectSave,
  onEditFile,
}) => {
  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col shadow-xl z-20 flex-shrink-0">
      {/* Rules Section */}
      <div className="p-4 bg-gray-900 border-b border-gray-800 space-y-3">
        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider flex items-center gap-2">
          <Info size={16} className="text-blue-400" /> 标注规则 (Rules)
        </h3>
        <div className="text-sm text-gray-300 space-y-3 bg-gray-800/50 p-4 rounded border border-gray-700/50">
          {/* Rule 1 */}
          <p className="flex items-start gap-2 leading-relaxed">
            <span className="text-blue-400 font-bold shrink-0">1.</span>
            <span>
              只需要标注 <span className="text-white font-bold bg-white/10 px-1 rounded">球在篮框附近</span> 的图片
            </span>
          </p>
          {/* Rule 2 */}
          <p className="flex items-start gap-2 leading-relaxed">
            <span className="text-blue-400 font-bold shrink-0">2.</span>
            <span className="text-gray-300">不需要每一个视频 或者 每一帧都标注</span>
          </p>
          {/* Rule 3 */}
          <p className="flex items-start gap-2 leading-relaxed">
            <span className="text-blue-400 font-bold shrink-0">3.</span>
            <span className="text-white font-semibold">“三点一线”的情况一定要标注！</span>
          </p>
          {/* Rule 4 */}
          <p className="flex items-start gap-2 leading-relaxed text-red-400 font-bold">
            <span className="shrink-0">4.</span>
            <span>没篮网的不要标注！</span>
          </p>

          <div className="flex items-start gap-2 pt-2 border-t border-gray-700/50 mt-2">
            <div className="space-y-2 w-full mt-1">
              <p className="text-gray-400 mb-1 font-semibold text-xs">快捷键 (Shortcuts):</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 font-mono">
                <div className="bg-gray-800 px-2 py-1 rounded border border-gray-700 flex justify-between items-center">
                  <span>In</span> <span className="text-gray-200 font-bold">1</span>
                </div>
                <div className="bg-gray-800 px-2 py-1 rounded border border-gray-700 flex justify-between items-center">
                  <span>Out</span> <span className="text-gray-200 font-bold">2</span>
                </div>
                <div className="bg-gray-800 px-2 py-1 rounded border border-gray-700 flex justify-between items-center">
                  <span>Delete</span> <span className="text-gray-200 font-bold">3</span>
                </div>
                <div className="bg-gray-800 px-2 py-1 rounded border border-gray-700 flex justify-between items-center">
                  <span>Play</span> <span className="text-gray-200 font-bold">Spc</span>
                </div>
                <div className="col-span-2 bg-gray-800 px-2 py-1 rounded border border-gray-700 flex justify-between items-center">
                  <span>Switch Video</span> <span className="text-gray-200 font-bold">↑ ↓</span>
                </div>
                 <div className="col-span-2 bg-gray-800 px-2 py-1 rounded border border-gray-700 flex justify-between items-center">
                  <span>Seek</span> <span className="text-gray-200 font-bold">← →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Saved Files & Output Selection */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-900/50">
        <div className="p-3 bg-gray-850 border-b border-gray-800 shadow-sm flex flex-col gap-3">
          <div className="flex justify-between items-center">
            <span className="font-semibold text-xs text-gray-400 uppercase tracking-wider">Saved Output</span>
            <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-300 text-[10px]">{savedFileList.length}</span>
          </div>
          <button
            onClick={onSelectSave}
            className={`text-xs flex items-center justify-center gap-2 w-full py-2.5 rounded-md border transition-all duration-200 font-medium ${
              saveDirHandle
                ? 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-750 hover:text-white hover:border-gray-600'
                : 'bg-blue-600 border-transparent text-white hover:bg-blue-500 shadow-md animate-pulse-slow'
            }`}
          >
            {saveDirHandle ? <CheckCircle size={14} /> : <FolderOpen size={14} />}
            <span className="truncate max-w-[180px]">
              {saveDirHandle ? saveDirHandle.name : 'Select Save Folder'}
            </span>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-2 space-y-1 custom-scrollbar">
          {savedFileList.length === 0 ? (
            <div className="text-gray-600 text-xs text-center py-8 italic">No annotations yet</div>
          ) : (
            savedFileList.map((fileHandle, idx) => (
              <button
                key={idx}
                onClick={() => onEditFile(fileHandle)}
                className="w-full text-left px-3 py-2 rounded-md hover:bg-gray-800 border border-transparent hover:border-gray-700 flex items-center gap-2 text-xs text-gray-400 transition-colors group"
              >
                <div className="bg-gray-800 p-1 rounded text-gray-500 group-hover:text-gray-300">
                  <ImageIcon size={14} />
                </div>
                <span className="truncate flex-1 font-mono">{fileHandle.name}</span>
                <Edit2 size={12} className="opacity-0 group-hover:opacity-50" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;