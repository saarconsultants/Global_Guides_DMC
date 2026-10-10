'use client';
import { useState } from 'react';
import { PhotoLightbox } from './photo-lightbox';

export function HotelDetailGallery({ images, hotelName }: { images: string[]; hotelName: string }) {
  const [open, setOpen] = useState(false);
  const [startIndex, setStartIndex] = useState(0);

  function openAt(i: number) { setStartIndex(i); setOpen(true); }

  const hero = images[0];
  const rest = images.slice(1, 5);

  return (
    <>
      {/* Phones: full-width hero with a strip of up to 4 thumbnails below.
          sm+: hero spans 2x2 with the thumbnails in a 2x2 block beside it. */}
      <div className={`grid grid-cols-4 gap-2 rounded-lg overflow-hidden ${rest.length ? 'grid-rows-[220px_64px]' : 'grid-rows-[220px]'} sm:grid-rows-2 sm:h-[340px]`}>
        {/* Hero — full width on phones, spans 2x2 from sm */}
        <button type="button" onClick={() => openAt(0)} aria-label={`View photo 1 of ${images.length}`} className="col-span-4 sm:col-span-2 sm:row-span-2 group relative overflow-hidden">
          <img src={hero} alt={hotelName} className="w-full h-full object-cover bg-navy-900 transition-transform group-hover:scale-105" />
        </button>
        {/* Up to 4 smaller tiles */}
        {rest.map((src, i) => (
          <button key={i} type="button" onClick={() => openAt(i + 1)} aria-label={i === rest.length - 1 && images.length > 5 ? `+${images.length - 5} more — view photo ${i + 2} of ${images.length}` : `View photo ${i + 2} of ${images.length}`} className="group relative overflow-hidden">
            <img src={src} alt="" className="w-full h-full object-cover bg-navy-900 transition-transform group-hover:scale-105" />
            {/* "+N more" overlay on the last visible tile */}
            {i === rest.length - 1 && images.length > 5 && (
              <span className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-semibold text-xs sm:text-sm">
                +{images.length - 5} more
              </span>
            )}
          </button>
        ))}
      </div>

      <PhotoLightbox open={open} onClose={() => setOpen(false)} images={images} startIndex={startIndex} hotelName={hotelName} />
    </>
  );
}
