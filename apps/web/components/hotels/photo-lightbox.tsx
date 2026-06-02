'use client';
import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  images: string[];
  startIndex?: number;
  hotelName: string;
}

export function PhotoLightbox({ open, onClose, images, startIndex = 0, hotelName }: Props) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => { if (open) setIndex(startIndex); }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
      if (e.key === 'ArrowLeft')  setIndex((i) => (i - 1 + images.length) % images.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, images.length, onClose]);

  if (!open || images.length === 0) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
      role="dialog"
      aria-label={`${hotelName} — photo ${index + 1} of ${images.length}`}
    >
      {/* Close */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 w-10 h-10 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
        aria-label="Close"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Caption */}
      <div className="absolute top-4 left-4 text-white text-sm font-medium">
        {hotelName} <span className="text-white/60 ml-2">{index + 1} / {images.length}</span>
      </div>

      {/* Prev */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i - 1 + images.length) % images.length); }}
          className="absolute left-4 w-12 h-12 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
          aria-label="Previous photo"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
      )}

      {/* Image */}
      <img
        src={images[index]}
        alt=""
        onClick={(e) => e.stopPropagation()}
        className="max-w-full max-h-[85vh] object-contain rounded-md shadow-2xl"
      />

      {/* Next */}
      {images.length > 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); setIndex((i) => (i + 1) % images.length); }}
          className="absolute right-4 w-12 h-12 inline-flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white"
          aria-label="Next photo"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      )}

      {/* Thumbnails strip */}
      {images.length > 1 && images.length <= 12 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 max-w-[90vw] overflow-x-auto px-4 py-2 bg-black/40 rounded-lg" onClick={(e) => e.stopPropagation()}>
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`w-16 h-16 rounded overflow-hidden flex-shrink-0 border-2 transition-all ${i === index ? 'border-white' : 'border-transparent opacity-60 hover:opacity-100'}`}
            >
              <img src={src} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
