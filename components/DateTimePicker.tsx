"use client";

import React, { useState, useEffect, useRef } from 'react';

export interface DateTimePickerProps {
  value: string; // ISO string or empty
  onChange: (isoString: string) => void;
  placeholder?: string;
  label?: string; // Optional label text rendered above
}

export default function DateTimePicker({ value, onChange, placeholder = 'Select date & time...', label }: DateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Internal state for calendar viewing (which month/year is shown)
  const [viewDate, setViewDate] = useState(() => {
    if (value) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    }
    return new Date();
  });

  const containerRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Sync view date if value changes from outside when closed
  useEffect(() => {
    if (value && !isOpen) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        setViewDate(d);
      }
    }
  }, [value, isOpen]);

  const selectedDate = value ? new Date(value) : null;
  const isSelectedDateValid = selectedDate && !isNaN(selectedDate.getTime());

  const handleDateSelect = (year: number, month: number, date: number) => {
    let newDate = selectedDate && !isNaN(selectedDate.getTime()) ? new Date(selectedDate) : new Date();
    newDate.setFullYear(year, month, date);
    
    // if there was no previously selected date, set to midnight, otherwise preserve time
    if (!isSelectedDateValid) {
      newDate.setHours(0, 0, 0, 0);
    }
    onChange(newDate.toISOString());
  };

  const handleTimeChange = (type: 'hour' | 'minute', val: number) => {
    let newDate = selectedDate && !isNaN(selectedDate.getTime()) ? new Date(selectedDate) : new Date();
    if (!isSelectedDateValid) {
        // Just set date to today if changing time first
        const now = new Date();
        newDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        newDate.setHours(0, 0, 0, 0);
    }

    if (type === 'hour') {
      newDate.setHours(val);
    } else {
      newDate.setMinutes(val);
    }
    onChange(newDate.toISOString());
  };
  
  const getCustomDisplayFormat = () => {
    if (!isSelectedDateValid) return '';
    const m = selectedDate.toLocaleString('en-US', { month: 'short' });
    const d = selectedDate.getDate();
    const y = selectedDate.getFullYear();
    let hr = selectedDate.getHours();
    const min = selectedDate.getMinutes();
    const ampm = hr >= 12 ? 'PM' : 'AM';
    hr = hr % 12;
    hr = hr ? hr : 12; // 0 should be 12
    const minStr = min < 10 ? '0' + min : min.toString();
    return `${m} ${d}, ${y} at ${hr}:${minStr} ${ampm}`;
  };

  // Calendar logic
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  
  const prevMonthDays = new Date(viewDate.getFullYear(), viewDate.getMonth(), 0).getDate();
  
  const days = [];
  
  // Prev month padding
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    days.push({
      year: viewDate.getMonth() === 0 ? viewDate.getFullYear() - 1 : viewDate.getFullYear(),
      month: viewDate.getMonth() === 0 ? 11 : viewDate.getMonth() - 1,
      date: prevMonthDays - i,
      isCurrentMonth: false,
    });
  }
  
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      year: viewDate.getFullYear(),
      month: viewDate.getMonth(),
      date: i,
      isCurrentMonth: true,
    });
  }
  
  // Next month padding
  const remainingCells = 42 - days.length; // 6 rows * 7 days
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      year: viewDate.getMonth() === 11 ? viewDate.getFullYear() + 1 : viewDate.getFullYear(),
      month: viewDate.getMonth() === 11 ? 0 : viewDate.getMonth() + 1,
      date: i,
      isCurrentMonth: false,
    });
  }
  
  const changeMonth = (offset: number) => {
    const newViewDate = new Date(viewDate);
    newViewDate.setMonth(viewDate.getMonth() + offset);
    setViewDate(newViewDate);
  };
  
  const today = new Date();
  
  return (
    <div className="relative flex flex-col w-full" ref={containerRef}>
      {label && <label className="mb-2 text-sm font-medium text-zinc-300">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-zinc-100 hover:bg-zinc-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500/50"
      >
        {isSelectedDateValid ? getCustomDisplayFormat() : <span className="text-zinc-500">{placeholder}</span>}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 w-72 bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl z-40 p-4">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => changeMonth(-1)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              &lt;
            </button>
            <div className="text-zinc-100 font-medium">
              {viewDate.toLocaleString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button
              type="button"
              onClick={() => changeMonth(1)}
              className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              &gt;
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
              <div key={day} className="text-xs font-medium text-zinc-500 w-8 h-8 flex items-center justify-center">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              const isSelected = isSelectedDateValid && 
                selectedDate.getFullYear() === day.year && 
                selectedDate.getMonth() === day.month && 
                selectedDate.getDate() === day.date;
                
              const isToday = today.getFullYear() === day.year && 
                today.getMonth() === day.month && 
                today.getDate() === day.date;

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleDateSelect(day.year, day.month, day.date)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors ${!day.isCurrentMonth ? 'text-zinc-600' : 'text-zinc-200'} ${isSelected ? 'bg-orange-500 text-white' : 'hover:bg-zinc-700'} ${isToday && !isSelected ? 'ring-1 ring-orange-500/50' : ''}`}
                >
                  {day.date}
                </button>
              );
            })}
          </div>

          <div className="mt-4 pt-4 border-t border-zinc-800 flex gap-2 justify-center items-center">
            <select
              value={isSelectedDateValid ? selectedDate.getHours().toString().padStart(2, '0') : '00'}
              onChange={(e) => handleTimeChange('hour', parseInt(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <option key={i} value={i.toString().padStart(2, '0')}>
                  {i.toString().padStart(2, '0')}
                </option>
              ))}
            </select>
            <span className="text-zinc-400 font-bold">:</span>
            <select
              value={isSelectedDateValid ? selectedDate.getMinutes().toString().padStart(2, '0') : '00'}
              onChange={(e) => handleTimeChange('minute', parseInt(e.target.value))}
              className="bg-zinc-800 border border-zinc-700 text-zinc-100 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500"
            >
              {Array.from({ length: 12 }).map((_, i) => (
                <option key={i * 5} value={(i * 5).toString().padStart(2, '0')}>
                  {(i * 5).toString().padStart(2, '0')}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
}
