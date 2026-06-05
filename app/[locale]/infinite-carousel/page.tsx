import InfiniteCarousel from "@/app/_components/InfiniteCarousel";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Infinite Carousel",
  description: "Infinite carousel",
};

export default function PageInfiniteCarousel() {
  return (
    <>
      <InfiniteCarousel />
    </>
  );
}
