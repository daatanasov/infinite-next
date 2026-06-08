"use client";

import { useMemo, useState } from "react";
import { buildImageSrc } from "../_utils/carouselMath";
import type { PicsumImage } from "../_utils/api";

interface CarouselCardProps {
  image: PicsumImage;
  cardWidth: number;
  height: number;
}

type LoadState = "loading" | "loaded" | "error";

function CarouselCard({ image, cardWidth, height }: CarouselCardProps) {
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const src = useMemo(
    () => buildImageSrc(image.rawId, cardWidth, height),
    [image.rawId, cardWidth, height],
  );

  return (
    <div
      className="card-root"
      role="img"
      aria-label={`Photo by ${image.author}`}>
      <div
        data-testid="card-shimmer-skeleton"
        className={`shimmer-skeleton ${loadState === "loaded" ? "shimmer-hidden" : ""}`}
        aria-hidden="true"
      />

      {loadState !== "error" && (
        <img
          src={src}
          data-testid="carousel-card-image"
          alt={`${image.author}`}
          width={cardWidth}
          height={height}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => setLoadState("loaded")}
          onError={() => setLoadState("error")}
          className={`card-image ${loadState === "loaded" ? "card-image-loaded" : ""}`}
        />
      )}

      <div className="overlay" aria-hidden="true">
        <span className="author-name">{image.author}</span>
      </div>
    </div>
  );
}

export default CarouselCard;
