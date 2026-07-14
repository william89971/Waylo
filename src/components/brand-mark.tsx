export function BrandMark({ size = 58 }: { size?: number }) {
  return (
    <span className="waylo-mark" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64" width={Math.round(size * 0.72)} height={Math.round(size * 0.72)} fill="none">
        <path d="M7 39 22 24l8 8 8-13 19 20" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 47c11-7 22-8 34-3 5 2 9 1 14-2" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    </span>
  );
}
