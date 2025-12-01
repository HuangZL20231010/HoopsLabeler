import React, { useState } from 'react';
import { FolderOpen, Keyboard, Save, X } from 'lucide-react';
import Button from './Button';

interface OnboardingGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  {
    title: "1. 准备工作 (Setup)",
    desc: "首先，点击左上角的按钮。分别选择包含视频的文件夹（源）和用于存储截图的文件夹（保存位置）。",
    icon: <FolderOpen className="w-12 h-12 text-blue-400 mb-4" />,
    color: "bg-blue-500/10 border-blue-500/30"
  },
  {
    title: "2. 播放控制 (Controls)",
    desc: "使用键盘「左右方向键」进行逐帧微调。按「空格键」或点击画面来播放/暂停视频。",
    icon: <Keyboard className="w-12 h-12 text-purple-400 mb-4" />,
    color: "bg-purple-500/10 border-purple-500/30"
  },
  {
    title: "3. 快速标注 (Labeling)",
    desc: "看到进球或投篮时，按键盘「1」标记进球 (Ball In)，按「2」标记未进球 (Ball Out)。系统会自动保存截图和标签。",
    icon: <Save className="w-12 h-12 text-green-400 mb-4" />,
    color: "bg-green-500/10 border-green-500/30"
  }
];

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl max-w-md w-full overflow-hidden relative">
        
        {/* Close Button */}
        <button 
          onClick={onClose} 
          className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
          <div className={`p-6 rounded-full border mb-6 ${steps[currentStep].color} transition-all duration-300`}>
            {steps[currentStep].icon}
          </div>
          
          <h2 className="text-xl font-bold text-white mb-3">
            {steps[currentStep].title}
          </h2>
          
          <p className="text-gray-400 text-sm leading-relaxed mb-8 h-16">
            {steps[currentStep].desc}
          </p>

          {/* Indicators */}
          <div className="flex gap-2 mb-8">
            {steps.map((_, idx) => (
              <div 
                key={idx} 
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-8 bg-blue-500' : 'w-2 bg-gray-700'
                }`}
              />
            ))}
          </div>

          {/* Action Button */}
          <Button 
            onClick={handleNext} 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
          >
            {currentStep === steps.length - 1 ? "开始使用 (Start)" : "下一步 (Next)"}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default OnboardingGuide;