'use client';
import { useState } from 'react';

interface Props {
  src?: string;
  alt?: string;
  className?: string;
  /** Rendered when src is missing or the image fails to load. */
  fallback?: React.ReactNode;
}

// A plain <img> that gracefully degrades to a fallback on error. Must be a
// client component — server components can't pass the onError event handler.
export function ImageWithFallback({ src, alt = '', className, fallback }: Props) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return <>{fallback ?? null}</>;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={className}
      onError={() => setFailed(true)}
    />
  );
}
