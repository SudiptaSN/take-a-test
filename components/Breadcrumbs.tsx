'use client';

import Link from 'next/link';
import React from 'react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm mb-6 flex items-center flex-wrap gap-2">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        
        return (
          <React.Fragment key={index}>
            {item.href ? (
              <Link 
                href={item.href}
                className="text-zinc-400 hover:text-white hover:underline transition"
              >
                {item.label}
              </Link>
            ) : (
              <span className="text-zinc-200 font-medium">
                {item.label}
              </span>
            )}
            
            {!isLast && (
              <span className="text-zinc-600 select-none">
                &gt;
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
