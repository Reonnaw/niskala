import type { ReactNode, SVGProps } from 'react';

// One drawing style for every glyph: 24 px grid, 1.75 stroke, round joins.
function make(children: ReactNode) {
  return function Icon({ className = 'size-5', ...rest }: SVGProps<SVGSVGElement>) {
    return (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className={className}
        {...rest}
      >
        {children}
      </svg>
    );
  };
}

export const IconWorkspace = make(
  <>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </>,
);
export const IconHistory = make(<path d="M4 20h16M7 16v-4M12 16V7M17 16v-7" />);
export const IconShield = make(
  <>
    <path d="M12 3l7 3v5c0 4.5-3 8.4-7 10-4-1.6-7-5.5-7-10V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </>,
);
export const IconSun = make(
  <>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </>,
);
export const IconMoon = make(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />);
export const IconAuto = make(
  <>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" />
  </>,
);
export const IconCamera = make(
  <>
    <rect x="3" y="6" width="12" height="12" rx="2" />
    <path d="M15 10.5l5-3v9l-5-3" />
  </>,
);
export const IconTimer = make(
  <>
    <circle cx="12" cy="13" r="8" />
    <path d="M12 9v4l2.5 2.5M9.5 2.5h5" />
  </>,
);
export const IconSliders = make(
  <>
    <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
    <circle cx="15" cy="7" r="2" />
    <circle cx="9" cy="17" r="2" />
  </>,
);
export const IconPlay = make(<path d="M8 5.5l11 6.5-11 6.5v-13z" />);
export const IconPause = make(<path d="M9 5.5v13M15 5.5v13" />);
export const IconStop = make(<rect x="6.5" y="6.5" width="11" height="11" rx="2" />);
export const IconNext = make(<path d="M6 5.5l9 6.5-9 6.5v-13zM18 5.5v13" />);
export const IconEye = make(
  <>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="3" />
  </>,
);
export const IconPosture = make(
  <>
    <circle cx="9.5" cy="4.5" r="2" />
    <path d="M9.5 8.5v6h6v5.5M9.5 11h5M6 20h11" />
  </>,
);
export const IconBreath = make(<path d="M3 8h9a2.5 2.5 0 1 0-2.5-2.5M3 12h14a3 3 0 1 1-3 3M3 16h6" />);
export const IconStretch = make(<path d="M20 12a8 8 0 1 1-2.4-5.7M20 4v4h-4" />);
export const IconBell = make(
  <>
    <path d="M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15L6 16z" />
    <path d="M10 20.5a2 2 0 0 0 4 0" />
  </>,
);
export const IconPip = make(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <rect x="12" y="11" width="6" height="5" rx="1" fill="currentColor" stroke="none" />
  </>,
);
export const IconDownload = make(<path d="M12 4v11M7 10l5 5 5-5M5 20h14" />);
export const IconTrash = make(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />);
export const IconMenu = make(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IconClose = make(<path d="M6 6l12 12M18 6L6 18" />);
export const IconCheck = make(<path d="M5 12.5l4.5 4.5L19 7.5" />);
export const IconArrowRight = make(<path d="M5 12h14M13 6l6 6-6 6" />);
export const IconInfo = make(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v6M12 7.5v.01" />
  </>,
);
export const IconGauge = make(
  <>
    <path d="M4 17a8 8 0 1 1 16 0" />
    <path d="M12 17l4-5" />
  </>,
);
export const IconVolume = make(
  <>
    <path d="M4 9.5v5h4l5 4v-13l-5 4H4z" />
    <path d="M16.5 9a4 4 0 0 1 0 6" />
  </>,
);
export const IconLock = make(
  <>
    <rect x="5" y="11" width="14" height="10" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>,
);
export const IconLean = make(
  <>
    <circle cx="14" cy="4.5" r="2" />
    <path d="M13 8.5l-3 7M7 20h11M10 15.5l5 4.5" />
  </>,
);
export const IconRefresh = make(<path d="M4 12a8 8 0 0 1 14-5.3M20 4v4h-4M20 12a8 8 0 0 1-14 5.3M4 20v-4h4" />);
