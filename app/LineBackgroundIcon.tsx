export default function LineBackgroundIcon({color}:{color?:string|null}) {
 return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 5h16M4 19h16" stroke="currentColor" strokeWidth="1.7"/><rect x="2" y="8" width="20" height="8" fill={color || 'currentColor'} opacity={color?1:.25}/><path d="M4 12h13" stroke="currentColor" strokeWidth="1.7"/></svg>;
}
