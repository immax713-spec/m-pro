import React, { useState, useRef, ChangeEvent, useEffect } from 'react';

interface PhotoCaptureScreenProps {
  currentStep: number;
  totalSteps: number;
  prompts: string[];
  onPhotoUpload: (dataUrl: string) => void;
  onSkip: () => void;
}

const PhotoIcon: React.FC<{className: string}> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
);

const SpinnerIcon: React.FC<{className: string}> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);


const PhotoCaptureScreen: React.FC<PhotoCaptureScreenProps> = ({ currentStep, totalSteps, prompts, onPhotoUpload, onSkip }) => {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isProcessing = useRef(false);

  useEffect(() => {
    // Reset state if component is reused for a new photo
    setImagePreview(null);
    setIsLoading(false);
    isProcessing.current = false;
  }, [currentStep, prompts]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (isProcessing.current) return;
    const file = event.target.files?.[0];
    if (file) {
      isProcessing.current = true;
      setIsLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setImagePreview(result);
        // Short delay to show preview before advancing
        setTimeout(() => {
            onPhotoUpload(result);
        }, 500);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileInput = () => {
    if (isLoading) return;
    fileInputRef.current?.click();
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-xl animate-fade-in w-full">
      <div className="text-center mb-6">
        <p className="text-sm font-semibold text-blue-600">
          ШАГ {currentStep} ИЗ {totalSteps}
        </p>
        <h2 className="text-2xl md:text-3xl font-bold text-slate-800 mt-2">
          {prompts[currentStep - 1]}
        </h2>
      </div>

      <div className="flex flex-col items-center">
        <div className="w-full max-w-lg h-64 md:h-96 bg-slate-200 rounded-lg flex items-center justify-center mb-6 border-2 border-dashed border-slate-300 overflow-hidden relative">
          {imagePreview ? (
            <img src={imagePreview} alt="Selected preview" className="object-cover w-full h-full" />
          ) : (
            <div className="text-slate-500 text-center">
              <PhotoIcon className="w-16 h-16 mx-auto text-slate-400" />
              <p className="mt-2">Предпросмотр появится здесь</p>
            </div>
          )}
           {isLoading && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex flex-col items-center justify-center">
                    <SpinnerIcon className="animate-spin h-12 w-12 text-blue-600" />
                    <p className="mt-4 text-slate-700 font-semibold">Обработка...</p>
                </div>
            )}
        </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          disabled={isLoading}
        />

        <div className="flex flex-col sm:flex-row gap-4">
            <button
            onClick={triggerFileInput}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:bg-slate-400 disabled:cursor-not-allowed transform hover:scale-105"
            >
            <PhotoIcon className="w-5 h-5" />
            Сделать фото
            </button>
            <button
              onClick={onSkip}
              disabled={isLoading}
              className="bg-slate-500 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-lg text-lg transition-all focus:outline-none focus:ring-4 focus:ring-slate-300 disabled:bg-slate-400 disabled:cursor-not-allowed"
            >
              Пропустить
            </button>
        </div>
      </div>
    </div>
  );
};

export default PhotoCaptureScreen;
