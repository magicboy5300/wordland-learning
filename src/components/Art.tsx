export function Fox({ className = '', happy = false }: { className?: string; happy?: boolean }) {
  return <svg className={className} width="180" height="190" viewBox="0 0 180 190" fill="none" aria-hidden="true">
    <path d="M132 123c55-10 46 58 12 48l-30-8" fill="#d77a3f"/><path d="M155 132c20 13 17 34 1 38l-11-13" fill="#fff1d3"/>
    <ellipse cx="88" cy="143" rx="40" ry="39" fill="#eaa15b"/><ellipse cx="86" cy="148" rx="22" ry="29" fill="#fff1d3"/>
    <path d="m38 79-5-61 43 28h25l44-28-6 61-50 38Z" fill="#e9954e"/><path d="m43 54-2-21 24 15Z" fill="#a55238"/><path d="m115 48 22-15-2 23Z" fill="#a55238"/>
    <path d="M39 76c21-9 39 3 50 25 12-22 29-34 50-25l-11 24-39 23-40-24Z" fill="#fff3d9"/>
    {happy ? <><path d="m61 75 8-5 7 5M102 75l7-5 7 5" stroke="#3e4734" strokeWidth="5" strokeLinecap="round"/></> : <><ellipse cx="69" cy="74" rx="4" ry="6" fill="#3e4734"/><ellipse cx="109" cy="74" rx="4" ry="6" fill="#3e4734"/></>}
    <path d="m81 94 8 7 8-7" fill="#3e4734"/><path d="M89 101v5l-5 3m5-3 5 3" stroke="#3e4734" strokeWidth="2.5" strokeLinecap="round"/>
    <ellipse cx="57" cy="87" rx="7" ry="4" fill="#e58c78"/><ellipse cx="120" cy="87" rx="7" ry="4" fill="#e58c78"/>
    <path d="m54 132 12 12m48-12-12 12" stroke="#d77a3f" strokeWidth="13" strokeLinecap="round"/>
    <path d="M51 138q18-7 36 4 18-11 36-4v31q-18-7-36 4-18-11-36-4Z" fill="#658462"/><path d="M87 143v30" stroke="#e5e8c8" strokeWidth="2"/>
    <path d="m57 145 23 4m-23 4 23 4m14-8 22-4m-22 12 22-4" stroke="#e3e9d2" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

function Tree({ x, y, scale = 1, color = '#72936a' }: { x: number; y: number; scale?: number; color?: string }) {
  return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="M0 10v74" stroke="#8d7c55" strokeWidth="9" strokeLinecap="round"/><path d="m-35 46 35-75 35 75Z" fill={color}/><path d="m-28 11 28-62 28 62Z" fill={color}/><path d="m-20-20 20-45 20 45Z" fill={color}/></g>;
}

export function Landscape({ className = '', map = false }: { className?: string; map?: boolean }) {
  return <svg className={className} viewBox="0 0 620 360" fill="none" role="img" aria-label="小书狐在有树木、小屋和小桥的文字森林里读书">
    <defs><linearGradient id={map ? 'mapHill' : 'heroHill'} x1="0" y1="170" x2="0" y2="360"><stop stopColor="#b9c79a"/><stop offset="1" stopColor="#99b082"/></linearGradient></defs>
    <circle cx="472" cy="72" r="38" fill="#efd88e"/>
    <path d="M89 68q13-25 31-9 18-34 39-9 30-4 32 15H89ZM334 36q9-17 23-9 13-22 30-6 19-3 24 15Z" fill="#fffdf3"/>
    <path d="M5 199 128 68l105 127 92-108 110 134Z" fill="#d5dbc4"/><path d="m103 96 25-28 27 33-24-8-14 9Z" fill="#f6f5e7"/>
    <path d="M12 261Q114 107 290 214 421 105 615 222v133H12Z" fill="#c6d2ae"/>
    <path d="M6 295q132-124 288-43 150-114 326 10v98H6Z" fill={`url(#${map ? 'mapHill' : 'heroHill'})`}/>
    <path d="M439 224q-95 28-70 53t-132 83h103q135-65 75-78t65-53Z" fill="#f2e5b9"/>
    <path d="M25 327q68-17 132 5t145-11" stroke="#8ea579" strokeWidth="2" strokeLinecap="round"/>
    <Tree x={99} y={163} scale={0.95}/><Tree x={52} y={215} scale={0.65} color="#8ba879"/><Tree x={544} y={175} scale={1.15}/><Tree x={491} y={209} scale={0.72} color="#8ca574"/>
    <g transform="translate(296 148)"><path d="M0 44 55 0l55 44" fill="#bd7852"/><path d="M12 41h86v69H12Z" fill="#f5e5bf"/><path d="M42 67h26v43H42Z" fill="#7a8a5d"/><path d="M21 54h15v17H21Zm53 0h15v17H74Z" fill="#b4c7bc"/><path d="M49 11h15v22H49Z" fill="#f1d78f"/><path d="M30 98H4m76 0h26" stroke="#cbb991" strokeWidth="4"/><path d="M0 43 55-2l55 45" stroke="#a76849" strokeWidth="6" strokeLinecap="round"/></g>
    <g transform="translate(447 254) rotate(8)"><path d="M0 0h43v29H0Z" fill="#fff5da"/><path d="m1 2 20 13L42 2" stroke="#c49e6d" strokeWidth="2"/><circle cx="21" cy="13" r="4" fill="#c78355"/></g>
    <path d="M197 257q32-20 62-1m-61 8q32-20 62-1" stroke="#a3875b" strokeWidth="6"/><path d="m199 249 1 24m15-30v24m17-23v24m16-20v24" stroke="#a3875b" strokeWidth="3"/>
    <g transform="translate(140 158) scale(.92)"><Fox/></g>
    <g fill="#f8e5a3"><path d="m397 99 3 9 9 3-9 3-3 9-3-9-9-3 9-3Z"/><path d="m248 98 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z"/></g>
    {[['396','325'],['72','301'],['481','308'],['114','333']].map(([cx,cy], i) => <g key={i}><path d={`M${cx} ${cy}v10`} stroke="#60825a" strokeWidth="2"/><circle cx={cx} cy={cy} r="4" fill={i % 2 ? '#efd58f' : '#f3ead3'}/></g>)}
    <path d="m411 51 7-4 7 4m-184-3 5-3 5 3" stroke="#8e9a7a" strokeWidth="2" strokeLinecap="round"/>
  </svg>;
}

export function SceneIcon({ scene, className = '' }: { scene: string; className?: string }) {
  return <svg className={className} viewBox="0 0 100 90" fill="none" aria-hidden="true">
    {scene === 'sun' ? <><circle cx="50" cy="41" r="22" fill="#edbd60"/>{[0,45,90,135,180,225,270,315].map((a) => <path key={a} d="M50 8v-6" transform={`rotate(${a} 50 41)`} stroke="#edbd60" strokeWidth="4" strokeLinecap="round"/>)}<path d="M8 78q35-28 84 0" fill="#98af7a"/></> :
    scene === 'moon' ? <><path d="M60 9c-27 2-43 33-25 54 14 18 38 16 51-2-39 9-52-23-26-52Z" fill="#dbc282"/><path d="m78 11 2 8 8 2-8 2-2 8-2-8-8-2 8-2Z" fill="#dbc282"/><circle cx="20" cy="32" r="3" fill="#b4a3cd"/></> :
    scene === 'tree' ? <><Tree x={32} y={43} scale={0.44}/><Tree x={69} y={47} scale={0.4} color="#8ba575"/><path d="M11 80h78" stroke="#bacba0" strokeWidth="3"/></> :
    scene === 'mail' ? <><path d="M18 29h65v45H18Z" fill="#eac88a"/><path d="m19 30 32 23 31-23" stroke="#b78151" strokeWidth="3"/><circle cx="51" cy="53" r="7" fill="#b06f51"/><path d="M31 17h38" stroke="#96a883" strokeWidth="5" strokeLinecap="round"/></> :
    scene === 'letters' ? <><text x="9" y="58" fill="#a58ab8" fontSize="44" fontFamily="Georgia,serif" fontWeight="bold">a</text><text x="45" y="65" fill="#c18a62" fontSize="53" fontFamily="Georgia,serif" fontWeight="bold">o</text><path d="m71 14 2 6 6 2-6 2-2 6-2-6-6-2 6-2Z" fill="#d8bc68"/></> :
    scene === 'flower' ? <><path d="M50 43v36m0-16q-24 1-22-18 21 3 22 18Zm0 9q23 0 24-18-20 2-24 18Z" fill="#88a372" stroke="#759461" strokeWidth="3"/><g fill="#dfac9d"><circle cx="50" cy="23" r="12"/><circle cx="36" cy="36" r="12"/><circle cx="64" cy="36" r="12"/><circle cx="50" cy="48" r="12"/></g><circle cx="50" cy="36" r="10" fill="#f2d78a"/></> :
    scene === 'water' ? <><path d="M50 8C43 27 24 42 25 55c1 30 50 30 50 0 0-14-17-27-25-47Z" fill="#91b9c5"/><path d="M35 55q0 12 13 15" stroke="#e3f0ee" strokeWidth="4" strokeLinecap="round"/></> :
    scene === 'bridge' ? <><path d="M8 69q42-69 84 0" stroke="#b79268" strokeWidth="12"/><path d="M8 51q42-66 84 0" stroke="#c5a17c" strokeWidth="5"/><path d="m21 40v12m19-23v13m20-13v13m19-2v12" stroke="#c5a17c" strokeWidth="4"/><path d="M4 79q19-8 37 0t39 0" stroke="#99bdc3" strokeWidth="4"/></> :
    <><path d="M25 44q-4-25 18-25 7-17 18-6 13 5 9 21" stroke="#8da778" strokeWidth="8" strokeLinecap="round"/><path d="M28 40q22-14 43 0l-9 35q-16 14-29-2Z" fill="#e8aa69"/><path d="m33 50 12 3m13 6 10-2m-30 8 9 2" stroke="#c78a51" strokeWidth="3" strokeLinecap="round"/></>}
  </svg>;
}
