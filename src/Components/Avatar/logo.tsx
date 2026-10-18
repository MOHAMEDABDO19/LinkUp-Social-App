// LinkUp logo: chat bubble with three dots + little sparks, and the "LinkUp" wordmark.
// The bubble is an SVG (no background), so it looks right in dark and light mode.

export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg
      viewBox="343 115 600 600"
      role="img"
      aria-label="LinkUp"
      className={`shrink-0 ${className}`}
    >
      <defs>
        <linearGradient id="lu-ring" gradientUnits="userSpaceOnUse" x1="420" y1="230" x2="860" y2="620">
          <stop offset="0" stopColor="#3ccbff" />
          <stop offset="0.5" stopColor="#3b7bff" />
          <stop offset="1" stopColor="#b660ff" />
        </linearGradient>
        <linearGradient id="lu-fold" gradientUnits="userSpaceOnUse" x1="450" y1="340" x2="520" y2="560">
          <stop offset="0" stopColor="#3a3ce0" />
          <stop offset="1" stopColor="#3f7cff" />
        </linearGradient>
        <linearGradient id="lu-spark" gradientUnits="userSpaceOnUse" x1="780" y1="180" x2="910" y2="300">
          <stop offset="0" stopColor="#9a6bff" />
          <stop offset="1" stopColor="#b57bff" />
        </linearGradient>
      </defs>

      {/* bubble ring with the tail; the pill in the middle is cut out */}
      <path
        fillRule="evenodd"
        fill="url(#lu-ring)"
        d="M440 660 C432 652 436 640 448 600 L462 548
           C395 520 372 460 376 415 C382 300 480 225 590 222
           C700 220 780 270 800 335 C803 345 795 348 785 346 L780 372
           C790 366 820 372 850 392 C890 425 892 480 872 525
           C835 600 745 648 660 648 C610 648 570 635 543 621
           L460 658 C452 662 444 664 440 660 Z
           M592 326 H683 C745 326 790 365 790 433 C790 500 745 540 683 540
           H592 C530 540 485 500 485 433 C485 365 530 326 592 326 Z"
      />
      {/* darker fold on the left of the pill */}
      <path
        fill="url(#lu-fold)"
        d="M485 433 C485 385 508 352 545 336 C482 344 438 395 436 455
           C436 500 452 530 462 548 L482 540 C492 530 485 480 485 433 Z"
      />

      {/* the three dots */}
      <circle cx="561" cy="442" r="22" fill="#fff" />
      <circle cx="637" cy="440" r="22" fill="#fff" />
      <circle cx="713" cy="437" r="22" fill="#fff" />

      {/* sparks */}
      <g stroke="url(#lu-spark)" strokeWidth="18" strokeLinecap="round" fill="none">
        <path d="M792 174 L782 234" />
        <path d="M829 262 L887 202" />
        <path d="M856 310 L909 291" />
      </g>
    </svg>
  );
}

export function BrandName({ className = "text-2xl" }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight text-white ${className}`}>
      Link
      <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 bg-clip-text text-transparent">
        Up
      </span>
    </span>
  );
}