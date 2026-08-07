"use client";

import React, { useState, useEffect, useCallback } from 'react';

import { createPortal } from 'react-dom';

export type ToastVariant = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastVariant;
}

function ToastPortal({ toasts, removeToast }: { toasts: ToastItem[], removeToast: (id: string) => void }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || typeof document === 'undefined') return null;
  
  return createPortal(
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 pointer-events-none max-h-[calc(100vh-2rem)] overflow-y-auto pr-1">
      {toasts.slice(-5).map((t) => (
        <ToastMessage key={t.id} toast={t} onDismiss={() => removeToast(t.id)} />
      ))}
    </div>,
    document.body
  );
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
    <ToastPortal toasts={toasts} removeToast={removeToast} />
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

  const containerClasses = {
    success: 'bg-green-950/80 border-green-800/50 text-green-100',
    error: 'bg-red-950/80 border-red-800/50 text-red-100',
    info: 'bg-zinc-900/90 border-zinc-800/50 text-zinc-100',
  };

  const progressColors = {
    success: 'bg-green-500/50',
    error: 'bg-red-500/50',
    info: 'bg-orange-500/50',
  };

  return (
    <div 
      className={`relative overflow-hidden pointer-events-auto flex items-center justify-between w-80 backdrop-blur-md border rounded-xl shadow-2xl transition-all duration-300 transform ${containerClasses[toast.type]} ${mounted ? 'translate-x-0 opacity-100 scale-100' : 'translate-x-8 opacity-0 scale-95'}`}
      style={{ transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' }}
    >
      <div className="p-4 text-sm font-medium">{toast.message}</div>
      <button 
        onClick={handleManualDismiss} 
        className="p-4 opacity-70 hover:opacity-100 active:scale-95 transition-all"
        aria-label="Dismiss"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </button>
      <div 
        className={`absolute bottom-0 left-0 h-1 ${progressColors[toast.type]}`} 
        style={{ width: `${progress}%`, transition: 'width 3s linear' }} 
      />
    </div>
  );
}
