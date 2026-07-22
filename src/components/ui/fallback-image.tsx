'use client';

import { useState } from 'react';
import Image, { type ImageProps } from 'next/image';

type FallbackImageProps = Omit<ImageProps, 'src' | 'alt' | 'onError'> & { src: string; alt: string };

/**
 * Wraps next/image and swaps a missing generated .png for the committed .svg
 * placeholder on load failure — e.g. before scripts/generate-patient-assets.ts
 * has been run with a real image API key. Pass a `key` tied to the record's id
 * when the same slot can show different sources over time (a selected-item
 * preview, say), so the fallback state resets for the new source instead of
 * sticking to whichever one first errored.
 */
export function FallbackImage({ src, alt, ...props }: FallbackImageProps) {
  const [imgSrc, setImgSrc] = useState(src);

  return (
    <Image
      {...props}
      src={imgSrc}
      alt={alt}
      unoptimized
      onError={() => {
        if (imgSrc.endsWith('.png')) setImgSrc(imgSrc.replace(/\.png$/, '.svg'));
      }}
    />
  );
}
