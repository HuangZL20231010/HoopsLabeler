import React from 'react';
import { X } from 'lucide-react';
import Button from './Button';
import { EditingItem } from '../types';

interface EditModalProps {
  item: EditingItem | null;
  onClose: () => void;
  onUpdateLabel: (label: string) => void;
}

const EditModal: React.FC<EditModalProps> = ({ item, onClose, onUpdateLabel }) => {
  if (!item) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
        <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-gray-850">
          <h3 className="font-semibold text-sm text-gray-200 truncate pr-4" title={item.filename}>
            Edit: {item.filename}
          </h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 flex flex-col items-center">
          <div className="relative rounded-lg overflow-hidden border border-gray-700 mb-6 bg-black">
            <img
              src={item.imgUrl}
              alt="Frame preview"
              className="max-h-[50vh] object-contain"
            />
            <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2 text-center backdrop-blur-sm">
              <span className="text-xs text-gray-400 uppercase tracking-widest font-bold">
                Current Label
              </span>
              <div
                className={`text-lg font-bold ${
                  item.currentLabel.includes('in') ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {item.currentLabel.toUpperCase()}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 w-full">
            <Button
              variant={item.currentLabel === 'ball_in' ? 'primary' : 'outline'}
              className={
                item.currentLabel === 'ball_in'
                  ? 'bg-green-600 hover:bg-green-700 border-transparent'
                  : 'hover:border-green-500 hover:text-green-500'
              }
              onClick={() => onUpdateLabel('ball_in')}
            >
              Set Ball In
            </Button>
            <Button
              variant={item.currentLabel === 'ball_out' ? 'primary' : 'outline'}
              className={
                item.currentLabel === 'ball_out'
                  ? 'bg-red-600 hover:bg-red-700 border-transparent'
                  : 'hover:border-red-500 hover:text-red-500'
              }
              onClick={() => onUpdateLabel('ball_out')}
            >
              Set Ball Out
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditModal;