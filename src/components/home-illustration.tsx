export function HomeIllustration({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 460 340" role="img" aria-label={label} className="home-illustration">
      <circle cx="237" cy="164" r="140" fill="#e2eddf" />
      <circle cx="338" cy="79" r="30" fill="#e8bb62" />
      <g stroke="#26604f" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M73 282h326" />
        <path d="M132 162 238 77l107 85" fill="#f9f7ee" />
        <path d="M151 151v129h174V151L238 99Z" fill="#f9f7ee" />
        <path d="M132 162 238 77l107 85" fill="none" strokeWidth="7" />
        <path d="M280 108V77h22v49" fill="#f9f7ee" />
        <path d="M216 280v-76h45v76" fill="#8db6a1" />
        <path d="M171 180h28v35h-28zm108 0h28v35h-28z" fill="#d6e5d8" />
        <path d="M185 180v35m108-35v35m-122-18h28m80 0h28" />
        <path d="M252 244h.1" strokeWidth="5" />
        <path d="M99 280v-42m0 18c-25-3-33-22-24-36 23 5 29 19 24 36Zm0-13c-6-25 6-42 23-43 9 24-5 39-23 43Z" fill="#92b89c" />
        <path d="M362 280v-31m0 14c-22-2-26-18-23-27 19 2 25 13 23 27Zm0-13c-2-19 6-31 21-33 7 19-4 31-21 33Z" fill="#92b89c" />
        <path d="M206 305h64" stroke="#9ab29c" />
      </g>
      <g transform="translate(60 95) rotate(-9)">
        <rect width="103" height="55" rx="12" fill="#fffdf7" stroke="#d8dfd0" />
        <path d="m26 13-9 16h10l-2 13 14-20H28l3-9Z" fill="#26604f" />
        <path d="M52 22h31m-31 11h20" stroke="#abc0ad" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g transform="translate(311 201) rotate(8)">
        <rect width="90" height="52" rx="12" fill="#fffdf7" stroke="#d8dfd0" />
        <circle cx="26" cy="26" r="12" fill="#e2eddf" />
        <path d="m20 26 4 4 8-9" fill="none" stroke="#26604f" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M49 21h24m-24 10h15" stroke="#abc0ad" strokeWidth="5" strokeLinecap="round" />
      </g>
    </svg>
  );
}
