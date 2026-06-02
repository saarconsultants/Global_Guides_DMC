'use client';
import { useState } from 'react';
import { PhotoLightbox } from './photo-lightbox';

interface Props {
  thumb?: string;
  allImages?: string[];
  hotelName: string;
  className?: string;
  /** Placeholder rendered when there's no thumb */
  placeholder?: React.ReactNode;
}

export function HotelPhoto({ thumb, allImages, hotelName, className, placeholder }: Props) {
  const [open, setOpen] = useState(false);
  const images = allImages && allImages.length > 0 ? allImages : (thumb ? [thumb] : []);

  if (!thumb) {
    return <>{placeholder ?? null}</>;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`group relative block overflow-hidden ${className ?? ''}`}
        aria-label={`Open photo gallery for ${hotelName}`}
        title={images.length > 1 ? `${images.length} photos — click to expand` : 'Click to expand'}
      >
        <img
          src={thumb}
          alt={hotelName}
          loading="lazy"
          className="w-full h-full object-cover bg-navy-900 transition-transform group-hover:scale-105"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        {images.length > 1 && (
          <span className="absolute bottom-1.5 right-1.5 inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-black/65 text-white">
            +{images.length - 1} photos
          </span>
        )}
      </button>
      <PhotoLightbox open={open} onClose={() => setOpen(false)} images={images} hotelName={hotelName} />
    </>
  );
}
