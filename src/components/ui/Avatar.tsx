import { useState } from "react";

import { initials } from "@/lib/format";

interface AvatarProps {
  name: string;
  src?: string | null;
  className?: string;
}

export function Avatar({ name, src, className = "" }: AvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const base = `inline-grid h-9 w-9 place-items-center rounded-full ${className}`;

  if (src && !imgFailed) {
    return (
      <img
        src={src}
        alt={name}
        onError={() => setImgFailed(true)}
        className={`${base} object-cover`}
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className={`${base} bg-brand/15 text-sm font-semibold text-brand`}
    >
      {initials(name) || "?"}
    </span>
  );
}
