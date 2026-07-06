import logoUrl from "@/assets/jollof-logo.svg";
import { cn } from "@/lib/utils";

interface JollofLogoProps {
  className?: string;
}

const JollofLogo = ({ className }: JollofLogoProps) => {
  return (
    <img
      src={logoUrl}
      alt="Jollof"
      className={cn(
        "h-4 w-4",
        "[filter:invert(48%)_sepia(13%)_saturate(3207%)_hue-rotate(338deg)_brightness(100%)_contrast(80%)]",
        className
      )}
    />
  );
};

export default JollofLogo;
