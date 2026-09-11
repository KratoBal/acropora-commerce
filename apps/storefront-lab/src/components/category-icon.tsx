type IconName =
  | "light"
  | "pump"
  | "filter"
  | "water"
  | "food"
  | "livestock"
  | "aquarium"
  | "all";

export function CategoryIcon({ name }: { name: IconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.65,
  };

  const content = {
    light: (
      <>
        <path
          {...common}
          d="M12 3a6 6 0 0 0-3.8 10.65c.78.65 1.3 1.58 1.3 2.6h5c0-1.02.52-1.95 1.3-2.6A6 6 0 0 0 12 3Z"
        />
        <path {...common} d="M9.5 19h5M10.5 22h3" />
      </>
    ),
    pump: (
      <>
        <path {...common} d="M12 7c4 0 7 2.5 7 6s-3 6-7 6-7-2.5-7-6 3-6 7-6Z" />
        <path
          {...common}
          d="M12 7V3M12 19v2M5 9 2 7M5 17l-3 2M19 9l3-2M19 17l3 2M9.5 13h5M12 10.5v5"
        />
      </>
    ),
    filter: (
      <>
        <path {...common} d="M3 4h18l-7 8v7l-4 2v-9L3 4Z" />
      </>
    ),
    water: (
      <>
        <path {...common} d="M9 4h6M10 4v5.5a4 4 0 1 0 4 0V4M8 14h8" />
        <path {...common} d="M4 21c1.2-2 2.8-3 4.5-3s3.3 1 4.5 3" />
      </>
    ),
    food: (
      <>
        <path
          {...common}
          d="M12 3c4 4.1 6 7.1 6 10a6 6 0 0 1-12 0c0-2.9 2-5.9 6-10Z"
        />
        <path {...common} d="M17 7c2.5 1 4 2.7 4 5a4 4 0 0 1-4 4" />
      </>
    ),
    livestock: (
      <>
        <path
          {...common}
          d="M4 12c3.1-4 7.2-5.5 12-4l4-3v5c1 1 1 3 0 4v5l-4-3c-4.8 1.5-8.9 0-12-4Z"
        />
        <circle {...common} cx="10" cy="11" r=".8" />
        <path {...common} d="M6 12h5" />
      </>
    ),
    aquarium: (
      <>
        <path {...common} d="m4 9 8-4 8 4-8 4-8-4Z" />
        <path {...common} d="m4 13 8 4 8-4M4 17l8 4 8-4" />
      </>
    ),
    all: (
      <>
        <path {...common} d="M4 6h16M4 12h16M4 18h16" />
        <path {...common} d="M8 4v4M15 10v4M10 16v4" />
      </>
    ),
  }[name];

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      {content}
    </svg>
  );
}
