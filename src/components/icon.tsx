import type { SVGProps } from "react";

const paths = {
  bolt: "m13 2-9 12h7l-1 8 10-12h-7l1-8Z",
  shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6",
  arrow: "M4 12h16m-6-6 6 6-6 6",
  globe: "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0ZM3 12h18M12 3c4 5 4 13 0 18-4-5-4-13 0-18Z",
  wifi: "M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-11 4a6 6 0 0 1 8 0m-4 4h.01",
  phone: "M7 3h10v18H7V3Zm3 15h4",
  check: "m5 12 4 4L19 6",
  leaf: "M20 3C8 2 2 8 5 15s17 6 15-12ZM5 20l10-11",
} as const;

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: keyof typeof paths }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  );
}
