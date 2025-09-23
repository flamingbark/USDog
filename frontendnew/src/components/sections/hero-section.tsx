import Image from "next/image";
import { Info, ChevronDown } from "lucide-react";
import Link from "next/link";

const StatInfo = ({
  label,
  tooltipText,
}: {
  label: string;
  tooltipText: string;
}) => (
  <div className="flex items-center justify-center gap-1 text-sm text-[#333333] font-normal">
    <span>{label}</span>
    <div className="group relative flex items-center">
      <Info className="h-3.5 w-3.5 cursor-help text-black/40" />
      <div
        className="invisible absolute bottom-full left-1/2 z-10 mb-2 w-64 -translate-x-1/2
        transform rounded-md bg-[#2d2d2d] p-3 text-xs font-normal text-white
        opacity-0 transition-opacity duration-200 group-hover:visible group-hover:opacity-100"
      >
        {tooltipText}
        <div className="absolute top-full left-1/2 h-0 w-0 -translate-x-1/2 border-x-8 border-x-transparent border-t-8 border-t-[#2d2d2d]"></div>
      </div>
    </div>
  </div>
);

const HeroSection = () => {
  return (
    <section className="relative flex w-full flex-col items-center overflow-x-hidden bg-[#f3f1f7] pt-20 pb-10 md:pt-[120px]">
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            "linear-gradient(180deg, rgb(211, 196, 237), rgb(238, 230, 247) 25%, rgb(238, 230, 247) 75%, rgb(211, 196, 237))",
        }}
      />
      <Image
        src="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/object/public/test-clones/874d37be-1344-4eb0-bcaf-1bcd64691e5c-letsgethai-com/assets/images/cloud-2-eb099a6d-2.png?"
        alt="background cloud"
        width={594}
        height={595}
        className="pointer-events-none absolute top-[80px] -left-[300px] z-0 md:-left-[200px]"
        priority
      />

      <div className="z-10 mx-auto w-full max-w-4xl px-4">
        <div
          className="w-full rounded-[24px] p-6 md:p-8"
          style={{
            background: "rgba(255, 255, 255, 0.6)",
            border: "1px solid rgba(0, 0, 0, 0.1)",
            boxShadow: "rgba(0, 0, 0, 0.04) 0px 4px 32px",
            backdropFilter: "blur(10px)",
          }}
        >
          <div className="flex flex-col items-center gap-1.5 text-center">
            <h1 className="text-4xl font-bold leading-none tracking-tight md:text-5xl">
              <span className="text-[#2eb397]">I </span>
              <span className="text-[#5599cc]">WANT </span>
              <span className="text-[#9768d5]">TO</span>
            </h1>
            <Link href="/vaults" className="relative flex cursor-pointer items-center gap-2">
              <h1 className="bg-gradient-to-r from-[#ffaa4c] via-[#ff7c9a] to-[#ff5cd3] bg-clip-text text-4xl font-extrabold leading-none tracking-tight text-transparent md:text-5xl">
                GET $USDog
              </h1>
              <ChevronDown className="h-7 w-7 text-[#ff7c9a] md:h-8 md:w-8" />
            </Link>
          </div>

          <p className="mt-4 text-center text-sm text-[#333333]">
            Mint & borrow USDog against your preferred collateral.{" "}
            <a
              href="https://docs.letsgethai.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-[#8c65f7] hover:underline"
            >
              Read more about borrowing →
            </a>
          </p>

          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 rounded-2xl overflow-hidden">
            <div
              className="flex flex-col items-center gap-2 p-4"
              style={{
                background:
                  "radial-gradient(circle at 100% 0%, rgba(206, 237, 214, 0.5) 0%, rgba(206, 237, 214, 0) 40%), linear-gradient(rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)",
              }}
            >
              <div className="font-price text-2xl font-bold text-black">$0</div>
              <StatInfo
                label="My Locked Collateral"
                tooltipText="Summation of the total amount of a given collateral locked in your vaults multiplied by the protocol oracle price of that collateral."
              />
            </div>

            <div
              className="flex flex-col items-center gap-2 border-y-2 border-dashed border-black/10 p-4 md:border-x-2 md:border-y-0"
              style={{
                background:
                  "radial-gradient(circle at 100% 0%, rgba(206, 222, 237, 0.5) 0%, rgba(206, 222, 237, 0) 40%), linear-gradient(rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)",
              }}
            >
              <div className="font-price text-2xl font-bold text-black">$0</div>
              <StatInfo
                label="My Total Debt"
                tooltipText="The total amount of minted debt tokens multiplied by the protocol redemption price of debt."
              />
            </div>

            <div
              className="flex flex-col items-center gap-2 p-4"
              style={{
                background:
                  "radial-gradient(circle at 100% 0%, rgba(237, 206, 222, 0.5) 0%, rgba(237, 206, 222, 0) 40%), linear-gradient(rgb(255, 255, 255) 0%, rgb(255, 255, 255) 100%)",
              }}
            >
              <div className="font-price text-2xl font-bold text-black">0.0%</div>
              <StatInfo
                label="My Net Stability Fee"
                tooltipText="Weighted average stability fee of My Total Debt"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;