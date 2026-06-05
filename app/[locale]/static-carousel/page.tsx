import { StaticImage } from "@/app/_components/StaticCard";
import SmoothCarousel from "@/app/_components/StaticCarousel";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Static Carousel",
  description: "Static Infinite Carousel",
};

async function getImages(): Promise<StaticImage[]> {
  const res = await fetch("https://picsum.photos/v2/list?page=1&limit=20", {
    next: { revalidate: 3600 }, // ISR: re‑fetch every hour
  });
  if (!res.ok) throw new Error("Failed to fetch images");
  const data = await res.json();
  return data.map((img: any) => ({
    id: img.id,
    download_url: img.download_url,
    width: img.width,
    height: img.height,
  }));
}

export default async function Page() {
  const images = await getImages();

  return (
    <>
      <SmoothCarousel images={images} height={220} width={150} speed={0.5} />
      <div className="mt-10"></div>
      <SmoothCarousel
        images={images}
        height={150}
        width={100}
        speed={0.7}
        direction="left"
      />
    </>
  );
}
