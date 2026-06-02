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
      <div className="grid grid-cols-4 grid-rows-2 gap-2 h-[340px] rounded-xl overflow-hidden">
        {/* Hero — spans 2x2 */}
        <button onClick={() => openAt(0)} className="col-span-2 row-span-2 group relative overflow-hidden">
          <img src={hero} alt={hotelName} className="w-full h-full object-cover bg-navy-900 transition-transform group-hover:scale-105" />
        </button>
        {/* Up to 4 smaller tiles */}
        {rest.map((src, i) => (
          <button key={i} onClick={() => openAt(i + 1)} className="group relative overflow-hidden">
            <img src={src} alt="" className="w-full h-full object-cover bg-navy-900 transition-transform group-hover:scale-105" />
            {/* "+N more" overlay on the last visible tile */}
            {i === rest.length - 1 && images.length > 5 && (
              <span className="absolute inset-0 bg-black/55 flex items-center justify-center text-white font-semibold text-sm">
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
