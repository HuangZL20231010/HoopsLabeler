// Extending the Window interface to include File System Access API types if not already present in the environment
// These are standard WICG File System Access API types

export interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
    isSameEntry(other: FileSystemHandle): Promise<boolean>;
  }
  
  export interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile(): Promise<File>;
    createWritable(options?: FileSystemCreateWritableOptions): Promise<FileSystemWritableFileStream>;
  }
  
  export interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
    getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<FileSystemDirectoryHandle>;
    removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
    resolve(possibleDescendant: FileSystemHandle): Promise<string[] | null>;
  }
  
  export interface FileSystemWritableFileStream extends WritableStream {
    write(data: BufferSource | Blob | string): Promise<void>;
    seek(position: number): Promise<void>;
    truncate(size: number): Promise<void>;
  }
  
  export interface FileSystemCreateWritableOptions {
    keepExistingData?: boolean;
  }

  export interface EditingItem {
    imgUrl: string;
    txtHandle: FileSystemFileHandle;
    currentLabel: string;
    filename: string;
  }
  
  // Extend Window to support showDirectoryPicker
  declare global {
    interface Window {
      showDirectoryPicker(options?: {
        id?: string;
        mode?: 'read' | 'readwrite';
        startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos';
      }): Promise<FileSystemDirectoryHandle>;
    }
  }