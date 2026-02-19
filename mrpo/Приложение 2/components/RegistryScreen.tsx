import React from 'react';
import { Presentation, StatusLevel } from '../types';

interface RegistryScreenProps {
  presentations: Presentation[];
  onStartNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
}

const statusColorClasses: Record<StatusLevel, string> = {
    critical: 'bg-red-700',
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
    none: 'bg-green-500',
};

const PresentationCard: React.FC<{ presentation: Presentation, onSelect: (id: string) => void, onDelete: (id: string) => void }> = ({ presentation, onSelect, onDelete }) => {
    const firstImage = presentation.slides.find(s => s.imageUrl)?.imageUrl;

    return (
        <div className="w-full bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow border border-slate-200 flex flex-col text-left relative">
            <button 
                onClick={() => onSelect(presentation.id)}
                className="absolute inset-0 z-0 opacity-0"
                aria-label="open"
            />
            <button
                onClick={(e) => { e.stopPropagation(); onDelete(presentation.id); }}
                className="absolute top-3 right-3 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                title="Удалить презентацию"
            >
                Удалить
            </button>
            <div className="w-full h-40 bg-slate-200 rounded-t-lg flex items-center justify-center overflow-hidden">
                {firstImage ? (
                    <img src={firstImage} alt={presentation.title} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-slate-400">Нет фото</span>
                )}
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <h3 className="font-bold text-slate-800 mb-2 flex-grow">{presentation.title}</h3>
                <div className="flex items-center gap-2 text-sm">
                    <span className={`w-3 h-3 rounded-full ${statusColorClasses[presentation.status.level]}`}></span>
                    <span className="text-slate-600">{presentation.status.text}</span>
                </div>
            </div>
        </div>
    );
};


const RegistryScreen: React.FC<RegistryScreenProps> = ({ presentations, onStartNew, onSelect, onDelete }) => {
  return (
    <div className="p-6 md:p-8 bg-white rounded-lg shadow-xl animate-fade-in">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 border-b border-slate-200 pb-6">
        <div>
            <h1 className="text-3xl md:text-4xl font-bold text-slate-800">
                Реестр объектов
            </h1>
            <p className="text-slate-600 mt-2">
                Выберите объект для редактирования или создайте новый отчет.
            </p>
        </div>
        <button
          onClick={onStartNew}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 mt-4 sm:mt-0 whitespace-nowrap"
        >
          + Создать новую презентацию
        </button>
      </header>

      {presentations.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {presentations.map(p => (
            <PresentationCard key={p.id} presentation={p} onSelect={onSelect} onDelete={onDelete} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed border-slate-300 rounded-lg">
            <h2 className="text-2xl font-semibold text-slate-700">Презентации не найдены</h2>
            <p className="text-slate-500 mt-2 mb-6">Начните с создания вашего первого отчета по объекту.</p>
            <button
                onClick={onStartNew}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-xl transition-transform transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
                Создать презентацию
            </button>
        </div>
      )}
    </div>
  );
};

export default RegistryScreen;
