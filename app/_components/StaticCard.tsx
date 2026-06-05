export interface StaticImage {
  id: string;
  download_url: string;
  width: number;
  height: number;
}

const StaticCard = ({ image }: { image: StaticImage }) => {
  return (
    <div className="card-root">
      <img
        src={image.download_url}
        alt={`Image ${image.id}`}
        className="card-image"
        loading="lazy"
        onLoad={(e) => e.currentTarget.classList.add("card-image-loaded")}
      />
    </div>
  );
};

export default StaticCard;
