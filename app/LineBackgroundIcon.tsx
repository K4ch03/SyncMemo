export default function LineBackgroundIcon({color}:{color?:string|null}) {
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="2" y="7" width="20" height="10" fill={color || 'currentColor'} opacity={color?1:.3}/></svg>;
}
