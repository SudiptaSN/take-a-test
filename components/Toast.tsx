"use client";

import React, { useState, useEffect, useCallback } from 'react';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastVariant;
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const toast = useCallback((message: string, type: ToastVariant = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const ToastContainer = useCallback(() => (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <ToastMessage key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>
  ), [toasts, removeToast]);

  return { toast, ToastContainer };
}

function ToastMessage({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const [mounted, setMounted] = useState(false);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    // Trigger mount animation
    setMounted(true);
    
    // Trigger progress bar shrink
    const progressTimer = setTimeout(() => {
      setProgress(0);
    }, 50);

    // Trigger auto-dismiss
    const closeTimer = setTimeout(() => {
      setMounted(false);
      setTimeout(onDismiss, 300); // Wait for exit animation
    }, 3000);

    return () => {
      clearTimeout(progressTimer);
      clearTimeout(closeTimer);
    };
  }, [onDismiss]);

  const handleManualDismiss = () => {
    setMounted(false);
    setTimeout(onDismiss, 300);
  };

  const borderColors = {
    success: 'border-l-green-500',
    error: 'border-l-red-500',
    info: 'border-l-blue-500',
  };

  const bgColors = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    info: 'bg-blue-500',
  };

  return (
    <div 
      className={`relative overflow-hidden pointer-events-auto flex items-center justify-between w-72 bg-zinc-800 text-zinc-100 rounded shadow-lg border-l-4 ${borderColors[toast.type]} transition-all duration-300 ease-out transform ${mounted ? 'translate-x-0 opacity-100' : 'translate-x-8 opacity-0'}`}
    >
      <div className="p-3 text-sm font-medium">{toast.message}</div>
      <button 
        onClick={handleManualDismiss} 
        className="p-3 text-zinc-400 hover:text-white transition-colors"
        aria-label="Dismiss"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div 
        className={`absolute bottom-0 left-0 h-1 ${bgColors[toast.type]}`} 
        style={{ width: `${progress}%`, transition: 'width 3s linear' }} 
      />
    </div>
  );
}
