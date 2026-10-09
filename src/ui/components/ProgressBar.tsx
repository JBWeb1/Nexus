export default function ProgressBar({ percent, label }: { percent: number; label: string }) {
  return (<div role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label={label}><div className="h-2 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${percent}%` }} /></div></div>);
}
