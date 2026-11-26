const PATHS: Record<string, React.ReactNode> = {
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  record: (<><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.2" fill="currentColor" stroke="none" /></>),
  search: (<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>),
  trash: <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v6M14 11v6" />,
  power: (<><path d="M12 3v8" /><path d="M6.3 6.8a8 8 0 1 0 11.4 0" /></>),
  plus: <path d="M12 5v14M5 12h14" />,
  sliders: (<><path d="M4 7h9M17 7h3M4 17h3M11 17h9" /><circle cx="15" cy="7" r="2" /><circle cx="9" cy="17" r="2" /></>),
  more: (<><circle cx="12" cy="5.5" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" /><circle cx="12" cy="18.5" r="1.5" fill="currentColor" stroke="none" /></>),
  'chev-r': <path d="m9 6 6 6-6 6" />,
  'chev-d': <path d="m6 9 6 6 6-6" />,
  format: <path d="M4 6h16M4 10h10M4 14h16M4 18h10" />,
  collapse: <path d="m7 9 5-5 5 5M7 15l5 5 5-5" />,
  copy: (<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h8" /></>),
  check: <path d="m5 12.5 4.5 4.5L19 7" />,
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  upload: <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />,
  download: <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />,
  refresh: (<><path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3" /><path d="M19.5 4.5V9H15" /></>),
  'to-top': <path d="M5 4h14M12 20V8M7 12l5-5 5 5" />,
  'to-bottom': <path d="M5 20h14M12 4v12M7 12l5 5 5-5" />,
  file: (<><path d="M7 3h7l5 5v13H7z" /><path d="M14 3v5h5" /></>),
  back: <path d="M15 6l-6 6 6 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  warn: (<><path d="M12 4 3 20h18z" /><path d="M12 10v4M12 17h.01" /></>),
  info: (<><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></>),
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, small }: { name: IconName; small?: boolean }) {
  return (
    <svg className={`i${small ? ' sm' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
