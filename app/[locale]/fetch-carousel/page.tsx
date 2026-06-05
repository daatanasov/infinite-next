import FetchCarousel from "@/app/_components/FetchCarousel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fetch Carousel",
  description: "Fetch Infinite carousel",
};

export default async function Page() {
  return (
    <>
      <FetchCarousel />
    </>
  );
}
