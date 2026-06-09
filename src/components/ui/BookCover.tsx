import { useState } from "react";

interface BookCoverProps {
  url?: string | null;
  title?: string | null;
  className?: string;
}

// Cover image with a graceful placeholder when the URL is missing or fails.
export function BookCover({ url, title, className = "h-16 w-12" }: BookCoverProps) {
  const [failed, setFailed] = useState(false);
  const showImage = url && !failed;

  if (showImage) {
    return (
      <img
        src={url}
        alt={title ? `Cover of ${title}` : "Book cover"}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`rounded-sm object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`grid place-items-center rounded-sm bg-brand/10 text-brand ${className}`}
    >
      <span className="text-lg">📖</span>
    </div>
  );
}
