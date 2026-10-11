import React from "react";
import {registerRoot, Composition, useCurrentFrame, AbsoluteFill, random} from "remotion";
const N = 180;
const INK = "#1B1B1A", OR = "#D9481C", OFF = "#F2EFEA";
const loop = (f, p, o = 0) => ((f + o) % p) / p;
const MARK = "M552 100 L580 0 L596 0 L607 14 L618 0 L634 0 L662 100 Z";
const CRAT = "M592.9 36 L621.1 36 L632.8 78 L581.2 78 Z";
const Scene = ({wide}) => {
  const f = useCurrentFrame(), th = (f / N) * Math.PI * 2;
  const W = wide ? 1280 : 720, H = wide ? 720 : 1280;
  const s = wide ? 4.4 : 4.0; // escala de la marca
  const cx = wide ? W / 2 : W / 2, cy = wide ? H * 0.56 : H * 0.55;
  const tx = cx - 607 * s, ty = cy - 50 * s;
  const pulse = 0.5 + 0.5 * Math.sin(th * 2 - 1);
  const zoom = 1 + 0.035 * (1 - Math.cos(th)) / 2;
  const sq = [];
  for (let i = 0; i < 22; i++) {
    const per = i % 2 ? 180 : 90, t = loop(f, per, Math.floor(random("o" + i) * per));
    const x = cx + (random("x" + i) - 0.5) * 26 * s * (0.3 + t * 1.2) + Math.sin(t * 5 + i) * 14;
    const y = ty + 10 * s - t * (H * 0.42) * (0.5 + random("v" + i) * 0.6);
    const sz = (3 + random("z" + i) * 7) * (1 - t * 0.5);
    sq.push(<rect key={i} x={x} y={y} width={sz} height={sz} fill={i % 4 ? OR : OFF} opacity={0.75 * Math.sin(t * Math.PI)} transform={`rotate(${45 * Math.sin(t * 4 + i)} ${x} ${y})`} />);
  }
  const sweep = ((f / N) * 2 - 0.5) * (W * 1.6);
  const dash = [];
  for (let i = 0; i < 14; i++) dash.push(<rect key={i} x={((i * 120 - loop(f, 180) * 240) % 1680 + 1680) % 1680 - 120} y={H - 70} width="64" height="6" fill={OFF} opacity=".35" />);
  return (
    <AbsoluteFill style={{background: INK}}>
      <div style={{width: "100%", height: "100%", transform: `scale(${zoom})`, transformOrigin: "50% 58%"}}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <radialGradient id="g" cx=".5" cy=".5" r=".5"><stop offset="0" stopColor={OR} stopOpacity=".55" /><stop offset="1" stopColor={OR} stopOpacity="0" /></radialGradient>
            <linearGradient id="sw" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".07" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></linearGradient>
            <clipPath id="m"><path d={MARK} transform={`translate(${tx} ${ty}) scale(${s})`} /></clipPath>
            <radialGradient id="vg" cx=".5" cy=".5" r=".75"><stop offset=".5" stopColor="#000" stopOpacity="0" /><stop offset="1" stopColor="#000" stopOpacity=".55" /></radialGradient>
          </defs>
          <circle cx={cx} cy={cy + 2 * s} r={(wide ? 380 : 420) * (0.9 + 0.1 * pulse)} fill="url(#g)" opacity={0.55 + 0.35 * pulse} />
          <g transform={`translate(${tx} ${ty}) scale(${s})`}>
            <path d={MARK} fill="#222120" />
            <path d={CRAT} fill={OR} opacity={0.38 + 0.22 * pulse} />
          </g>
          <g clipPath="url(#m)"><rect x={sweep - 260} y="0" width="260" height={H} fill="url(#sw)" transform={`skewX(-18)`} /></g>
          {sq}
          <rect x="0" y={H - 40} width={W} height="40" fill={OR} />
          <rect x="0" y={H - 40} width={W * 0.28} height="40" fill={OFF} opacity=".0" />
          {dash}
          <rect width={W} height={H} fill="url(#vg)" />
        </svg>
      </div>
    </AbsoluteFill>
  );
};
const Root = () => <><Composition id="Gracias" component={Scene} durationInFrames={N} fps={30} width={720} height={1280} /><Composition id="GraciasWide" component={Scene} defaultProps={{wide: true}} durationInFrames={N} fps={30} width={1280} height={720} /></>;
registerRoot(Root);
