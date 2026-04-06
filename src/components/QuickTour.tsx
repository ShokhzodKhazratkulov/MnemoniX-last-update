import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronRight, X, Sparkles } from 'lucide-react';
import { AppView } from '../types';

interface TourStep {
  target: string; // CSS selector
  title: string;
  description: string;
  view: AppView;
}

interface Props {
  onComplete: () => void;
  onSkip: () => void;
  t: any;
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

export const QuickTour: React.FC<Props> = ({ onComplete, onSkip, t, currentView, onNavigate }) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const steps: TourStep[] = [
    {
      target: '[data-tour="home"]',
      title: t.tourHomeTitle,
      description: t.tourHomeDesc,
      view: AppView.HOME
    },
    {
      target: '[data-tour="search"]',
      title: t.tourSearchTitle,
      description: t.tourSearchDesc,
      view: AppView.SEARCH
    },
    {
      target: '[data-tour="posts"]',
      title: t.tourPostsTitle,
      description: t.tourPostsDesc,
      view: AppView.POSTS
    },
    {
      target: '[data-tour="flashcards"]',
      title: t.tourFlashcardsTitle,
      description: t.tourFlashcardsDesc,
      view: AppView.FLASHCARDS
    },
    {
      target: '[data-tour="dashboard"]',
      title: t.tourDashboardTitle,
      description: t.tourDashboardDesc,
      view: AppView.DASHBOARD
    },
    {
      target: '[data-tour="profile"]',
      title: t.tourProfileTitle,
      description: t.tourProfileDesc,
      view: AppView.PROFILE
    }
  ];

  const currentStep = steps[stepIndex];

  useEffect(() => {
    if (currentView !== currentStep.view) {
      onNavigate(currentStep.view);
    }
  }, [stepIndex]);

  useEffect(() => {
    const updateRect = () => {
      const element = document.querySelector(currentStep.target);
      if (element) {
        setTargetRect(element.getBoundingClientRect());
      }
    };

    // Small delay to allow view transition and element rendering
    const timer = setTimeout(updateRect, 300);
    window.addEventListener('resize', updateRect);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateRect);
    };
  }, [stepIndex, currentView]);

  const handleNext = () => {
    if (stepIndex < steps.length - 1) {
      setStepIndex(stepIndex + 1);
    } else {
      onComplete();
    }
  };

  if (!targetRect) return null;

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none overflow-hidden">
      {/* Backdrop with hole */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-all duration-500"
        style={{
          clipPath: `polygon(
            0% 0%, 
            0% 100%, 
            ${targetRect.left - 8}px 100%, 
            ${targetRect.left - 8}px ${targetRect.top - 8}px, 
            ${targetRect.right + 8}px ${targetRect.top - 8}px, 
            ${targetRect.right + 8}px ${targetRect.bottom + 8}px, 
            ${targetRect.left - 8}px ${targetRect.bottom + 8}px, 
            ${targetRect.left - 8}px 100%, 
            100% 100%, 
            100% 0%
          )`
        }}
      />

      {/* Highlight ring */}
      <motion.div 
        initial={false}
        animate={{
          top: targetRect.top - 12,
          left: targetRect.left - 12,
          width: targetRect.width + 24,
          height: targetRect.height + 24,
        }}
        className="absolute border-4 border-indigo-500 rounded-2xl shadow-[0_0_30px_rgba(79,70,229,0.5)]"
      />

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div 
          key={stepIndex}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className="absolute pointer-events-auto bg-white dark:bg-slate-900 p-6 rounded-3xl shadow-2xl border border-gray-100 dark:border-slate-800 max-w-xs w-full"
          style={{
            top: targetRect.bottom + 24 > window.innerHeight - 200 ? 'auto' : targetRect.bottom + 24,
            bottom: targetRect.bottom + 24 > window.innerHeight - 200 ? window.innerHeight - targetRect.top + 24 : 'auto',
            left: Math.min(Math.max(20, targetRect.left + targetRect.width / 2 - 160), window.innerWidth - 340),
          }}
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={18} />
                <span className="text-[10px] font-black uppercase tracking-widest">Quick Tour</span>
              </div>
              <button 
                onClick={onSkip}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-gray-900 dark:text-white leading-tight">
                {currentStep.title}
              </h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-relaxed">
                {currentStep.description}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2">
              <div className="flex gap-1">
                {steps.map((_, i) => (
                  <div 
                    key={i}
                    className={`h-1 rounded-full transition-all ${
                      i === stepIndex ? 'w-4 bg-indigo-600' : 'w-1 bg-gray-200 dark:bg-slate-800'
                    }`}
                  />
                ))}
              </div>
              <button 
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl font-black text-xs hover:bg-indigo-700 transition-all active:scale-95"
              >
                {stepIndex === steps.length - 1 ? t.finish : t.next}
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
};
