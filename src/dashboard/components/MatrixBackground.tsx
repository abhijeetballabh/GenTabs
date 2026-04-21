import { useEffect, useRef, useState } from 'react';

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  pulsePhase: number;
  pulseSpeed: number;
  label: string;
}

interface Packet {
  fromNode: number;
  toNode: number;
  progress: number;
  speed: number;
}

const TAB_LABELS = ['github.com', 'docs', 'claude.ai', 'figma', 'notion', 'npm', 'youtube', 'gmail', 'vercel', 'stackoverflow', 'twitter', 'linear', 'slack'];

function createNodes(count: number, w: number, h: number): Node[] {
  return Array.from({ length: count }, (_, i) => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
    radius: 3 + Math.random() * 4,
    pulsePhase: Math.random() * Math.PI * 2,
    pulseSpeed: 0.015 + Math.random() * 0.02,
    label: TAB_LABELS[i % TAB_LABELS.length],
  }));
}

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<Node[]>([]);
  const packetsRef = useRef<Packet[]>([]);
  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (nodesRef.current.length === 0) {
        nodesRef.current = createNodes(22, canvas.width, canvas.height);
      }
    };
    resize();
    window.addEventListener('resize', resize);

    const MAX_DIST = 240;
    const nodeColor   = isDark ? 'rgba(96, 165, 250,' : 'rgba(37, 99, 235,';
    const lineColor   = isDark ? 'rgba(96, 165, 250,' : 'rgba(37, 99, 235,';
    const packetColor = isDark ? '#93c5fd'            : '#3b82f6';
    const labelColor  = isDark ? 'rgba(148,163,255,'  : 'rgba(37,99,235,';

    const frame = () => {
      const w = canvas.width, h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const nodes = nodesRef.current;

      // Move nodes
      nodes.forEach(n => {
        n.x += n.vx;
        n.y += n.vy;
        if (n.x < 0 || n.x > w) n.vx *= -1;
        if (n.y < 0 || n.y > h) n.vy *= -1;
        n.pulsePhase += n.pulseSpeed;
      });

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < MAX_DIST) {
            const alpha = (1 - dist / MAX_DIST) * (isDark ? 0.35 : 0.18);
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `${lineColor}${alpha})`;
            ctx.lineWidth = isDark ? 0.8 : 0.6;
            ctx.stroke();
          }
        }
      }

      // Spawn data packets randomly
      if (Math.random() < 0.04 && packetsRef.current.length < 18) {
        const from = Math.floor(Math.random() * nodes.length);
        let to = Math.floor(Math.random() * nodes.length);
        while (to === from) to = Math.floor(Math.random() * nodes.length);
        packetsRef.current.push({ fromNode: from, toNode: to, progress: 0, speed: 0.008 + Math.random() * 0.012 });
      }

      // Draw + move packets
      packetsRef.current = packetsRef.current.filter(p => {
        p.progress += p.speed;
        if (p.progress >= 1) return false;
        const from = nodes[p.fromNode], to = nodes[p.toNode];
        const px = from.x + (to.x - from.x) * p.progress;
        const py = from.y + (to.y - from.y) * p.progress;
        // Glow trail
        const trail = ctx.createRadialGradient(px, py, 0, px, py, 10);
        trail.addColorStop(0, isDark ? 'rgba(147,197,253,0.9)' : 'rgba(59,130,246,0.8)');
        trail.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.beginPath();
        ctx.arc(px, py, 10, 0, Math.PI * 2);
        ctx.fillStyle = trail;
        ctx.fill();
        // Core dot
        ctx.beginPath();
        ctx.arc(px, py, 2.5, 0, Math.PI * 2);
        ctx.fillStyle = packetColor;
        ctx.fill();
        return true;
      });

      // Draw nodes
      nodes.forEach(n => {
        const pulse = Math.sin(n.pulsePhase);
        const glowRadius = n.radius + 8 + pulse * 4;
        // Outer glow
        const grd = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, glowRadius);
        grd.addColorStop(0, `${nodeColor}${isDark ? 0.55 : 0.3})`);
        grd.addColorStop(1, `${nodeColor}0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, glowRadius, 0, Math.PI * 2);
        ctx.fillStyle = grd;
        ctx.fill();
        // Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${nodeColor}${isDark ? 0.9 : 0.7})`;
        ctx.fill();
        // Ring
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = `${nodeColor}${isDark ? 0.4 : 0.25})`;
        ctx.lineWidth = 1;
        ctx.stroke();
        // Label
        const labelAlpha = (0.35 + pulse * 0.12) * (isDark ? 1 : 0.7);
        ctx.font = '9px "DM Sans", system-ui, sans-serif';
        ctx.fillStyle = `${labelColor}${labelAlpha})`;
        ctx.fillText(n.label, n.x + n.radius + 5, n.y + 3);
      });

      animRef.current = requestAnimationFrame(frame);
    };

    animRef.current = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, [isDark]);

  return (
    <canvas
      ref={canvasRef}
      style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
    />
  );
}
