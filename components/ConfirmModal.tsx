"use client";

import React, { useEffect, useState } from 'react';

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  const [show, setShow] = useState(open);
  const [render, setRender] = useState(open);

  useEffect(() => {
    if (open) {
      setRender(true);
      // Small delay to allow the DOM to update before triggering transition
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setShow(true));
      });
    } else {
      setShow(false);
      const timer = setTimeout(() => setRender(false), 200); // Matches duration-200
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!render) return null;

  const confirmColors = {
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-orange-600 hover:bg-orange-700 text-white',
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onCancel} />
      <div className={`card relative w-full max-w-md shadow-2xl transition-transform duration-200 ${show ? 'scale-100' : 'scale-95'}`}>
        <h2 className="text-xl font-semibold text-zinc-100 mb-2">{title}</h2>
        <p className="text-zinc-400 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button 
            onClick={onCancel} 
            className="btn-secondary px-4 py-2 font-medium"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            className={`px-4 py-2 rounded-md font-medium transition-colors ${confirmColors[variant]}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
