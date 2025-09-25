import Image from "next/image";

const DecorativeElements = () => {
  return (
    <>
      {/* Container for background cloud elements */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        {/* The top-left cloud is not included in the provided assets, so it is omitted as per guidelines. */}
        
        {/* This cloud corresponds to the one visible in the lower-right area of the page background. */}
        <Image
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/874d37be-1344-4eb0-bcaf-1bcd64691e5c-letsgethai-com/assets/images/cloud-2-eb099a6d-2.png?"
          alt=""
          width={594}
          height={595}
          className="absolute -z-10 top-[480px] right-[280px]"
        />
        {/* Additional decorative clouds for cohesive look */}
        <Image
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/874d37be-1344-4eb0-bcaf-1bcd64691e5c-letsgethai-com/assets/images/cloud-2-eb099a6d-2.png?"
          alt=""
          width={520}
          height={520}
          className="absolute -z-10 top-[120px] -right-[220px] opacity-70 scale-90"
        />
        <Image
          src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/874d37be-1344-4eb0-bcaf-1bcd64691e5c-letsgethai-com/assets/images/cloud-2-eb099a6d-2.png?"
          alt=""
          width={640}
          height={640}
          className="absolute -z-10 top-[980px] -left-[240px] opacity-60"
        />
      </div>
    </>
  );
};

export default DecorativeElements;