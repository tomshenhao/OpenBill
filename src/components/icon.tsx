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
  droplet: "M12 3S5 11 5 15a7 7 0 0 0 14 0c0-4-7-12-7-12Zm-3 12a3 3 0 0 0 3 3",
  house: "m3 11 9-8 9 8M5 10v11h14V10M9 21v-8h6v8",
  flame: "M12 3c2 5-2 6 1 9 2-1 3-3 3-5 6 7 5 14-4 14S2 13 7 8c0 4 2 5 3 5-1-4 2-6 2-10Z",
  landmark: "m3 8 9-5 9 5H3Zm2 3v7m7-7v7m7-7v7M3 21h18M4 18h16",
  key: "M14 10a5 5 0 1 1-4-5 5 5 0 0 1 4 5Zm-3 4 9 7m-3-2 2-2m-5 0 2-2M8 9h.01",
  car: "m5 10 2-6h10l2 6M4 10h16v9H4v-9Zm3 4h2m6 0h2M6 19v2m12-2v2",
  recycle: "m8 4 3-2 4 7m-1-5 1 5-5-1m9 2 3 5-5 3m4-3-4 3-2-4M9 21H4l-2-5m2 4-2-4 5-1m-2-2 4-7",
  repeat: "m17 3 4 4-4 4M3 10V7h18M7 21l-4-4 4-4m14 1v3H3",
  book: "M12 6C9 3 5 3 2 4v15c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v15",
  heart: "M12 21S2 15 2 8a5 5 0 0 1 10-1A5 5 0 0 1 22 8c0 7-10 13-10 13Z",
  basket: "M3 9h18l-2 12H5L3 9Zm4 0 5-7 5 7M9 13v4m6-4v4",
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d={paths[name]} />
    </svg>
  );
}
