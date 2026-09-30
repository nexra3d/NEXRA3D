import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

// SVG Definition of the Official Nexra 3D Logo Mark
// 512x512 Canvas
const createNexraFaviconSvg = (isDark = true) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient -->
    <radialGradient id="bgGrad" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#14192B" />
      <stop offset="60%" stop-color="#0B0F1B" />
      <stop offset="100%" stop-color="#060810" />
    </radialGradient>

    <!-- Border Gradient -->
    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.6" />
      <stop offset="50%" stop-color="#C084FC" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#FB7185" stop-opacity="0.5" />
    </linearGradient>

    <!-- Logo Line Gradient across the 3D cube from violet to rose/pink -->
    <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="70%">
      <stop offset="0%" stop-color="#7C3AED" />
      <stop offset="30%" stop-color="#9333EA" />
      <stop offset="60%" stop-color="#C084FC" />
      <stop offset="85%" stop-color="#F43F5E" />
      <stop offset="100%" stop-color="#FB7185" />
    </linearGradient>

    <!-- Inner Glow Filter -->
    <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="3.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#8B5CF6" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Luxury Squircle Container for universal tab visibility (Dark & Light browser themes) -->
  <rect x="12" y="12" width="488" height="488" rx="108" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="4.5" />

  <!-- Center Group for the Nexra 3D Cube & Particle Mark -->
  <g transform="translate(18, 12)" filter="url(#subtleGlow)">

    <!-- 1. LEFT SIDE DISINTEGRATING PARTICLE CLOUD (Scattered Halftone Dots) -->
    <!-- Far-left dispersed micro-particles -->
    <circle cx="140" cy="158" r="3.2" fill="#7C3AED" opacity="0.65" />
    <circle cx="152" cy="120" r="3.8" fill="#8B5CF6" opacity="0.6" />
    <circle cx="162" cy="144" r="4.5" fill="#7C3AED" opacity="0.75" />
    <circle cx="132" cy="190" r="3.0" fill="#6D28D9" opacity="0.55" />
    <circle cx="148" cy="180" r="4.2" fill="#8B5CF6" opacity="0.8" />
    <circle cx="138" cy="225" r="3.6" fill="#7C3AED" opacity="0.65" />
    <circle cx="155" cy="208" r="4.8" fill="#9333EA" opacity="0.8" />
    <circle cx="144" cy="254" r="3.5" fill="#7C3AED" opacity="0.7" />
    <circle cx="160" cy="242" r="4.6" fill="#9333EA" opacity="0.85" />
    <circle cx="150" cy="285" r="3.8" fill="#8B5CF6" opacity="0.65" />
    <circle cx="170" cy="108" r="3.5" fill="#8B5CF6" opacity="0.7" />
    <circle cx="180" cy="126" r="4.8" fill="#9333EA" opacity="0.85" />
    <circle cx="172" cy="164" r="5.2" fill="#9333EA" opacity="0.9" />
    <circle cx="168" cy="275" r="4.8" fill="#9333EA" opacity="0.8" />
    <circle cx="160" cy="300" r="4.0" fill="#7C3AED" opacity="0.65" />
    <circle cx="178" cy="316" r="3.6" fill="#6D28D9" opacity="0.6" />

    <!-- Mid-density transition particles -->
    <circle cx="190" cy="148" r="5.5" fill="#A855F7" opacity="0.9" />
    <circle cx="186" cy="182" r="5.5" fill="#A855F7" opacity="0.9" />
    <circle cx="184" cy="218" r="5.5" fill="#A855F7" opacity="0.9" />
    <circle cx="182" cy="254" r="5.5" fill="#A855F7" opacity="0.9" />
    <circle cx="188" cy="290" r="5.0" fill="#9333EA" opacity="0.85" />

    <!-- 2. REGULAR MATRIX GRID OF DOTS (Halftone Array before solid wireframe) -->
    <!-- Column 1 (x ~ 205) -->
    <circle cx="206" cy="125" r="4.5" fill="#9333EA" opacity="0.8" />
    <circle cx="206" cy="143" r="4.5" fill="#A855F7" opacity="0.85" />
    <circle cx="206" cy="161" r="4.5" fill="#A855F7" opacity="0.9" />
    <circle cx="206" cy="179" r="4.5" fill="#A855F7" opacity="0.9" />
    <circle cx="206" cy="197" r="4.5" fill="#C084FC" opacity="0.9" />
    <circle cx="206" cy="215" r="4.5" fill="#C084FC" opacity="0.9" />
    <circle cx="206" cy="233" r="4.5" fill="#C084FC" opacity="0.9" />
    <circle cx="206" cy="251" r="4.5" fill="#A855F7" opacity="0.85" />
    <circle cx="206" cy="269" r="4.5" fill="#9333EA" opacity="0.85" />
    <circle cx="206" cy="287" r="4.5" fill="#8B5CF6" opacity="0.8" />
    <circle cx="206" cy="305" r="4.0" fill="#7C3AED" opacity="0.75" />

    <!-- Column 2 (x ~ 222) -->
    <circle cx="222" cy="134" r="4.5" fill="#9333EA" opacity="0.85" />
    <circle cx="222" cy="152" r="4.5" fill="#A855F7" opacity="0.9" />
    <circle cx="222" cy="170" r="4.5" fill="#C084FC" opacity="0.9" />
    <circle cx="222" cy="188" r="4.5" fill="#C084FC" opacity="0.95" />
    <circle cx="222" cy="206" r="4.5" fill="#C084FC" opacity="0.95" />
    <circle cx="222" cy="224" r="4.5" fill="#C084FC" opacity="0.95" />
    <circle cx="222" cy="242" r="4.5" fill="#C084FC" opacity="0.95" />
    <circle cx="222" cy="260" r="4.5" fill="#A855F7" opacity="0.9" />
    <circle cx="222" cy="278" r="4.5" fill="#9333EA" opacity="0.85" />
    <circle cx="222" cy="296" r="4.0" fill="#8B5CF6" opacity="0.8" />

    <!-- Column 3 (x ~ 238) -->
    <circle cx="238" cy="143" r="4.2" fill="#A855F7" opacity="0.9" />
    <circle cx="238" cy="161" r="4.2" fill="#C084FC" opacity="0.9" />
    <circle cx="238" cy="179" r="4.2" fill="#C084FC" opacity="0.95" />
    <circle cx="238" cy="197" r="4.2" fill="#E879F9" opacity="0.95" />
    <circle cx="238" cy="215" r="4.2" fill="#E879F9" opacity="0.95" />
    <circle cx="238" cy="233" r="4.2" fill="#E879F9" opacity="0.95" />
    <circle cx="238" cy="251" r="4.2" fill="#C084FC" opacity="0.9" />
    <circle cx="238" cy="269" r="4.2" fill="#A855F7" opacity="0.9" />
    <circle cx="238" cy="287" r="4.0" fill="#9333EA" opacity="0.85" />

    <!-- 3. ISOMETRIC 3D CUBE WIREFRAME LINES -->
    <g stroke="url(#wireGrad)" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
      <!-- Main Outer Hexagonal Silhouette Lines -->
      <!-- Top Left to Top Center -->
      <line x1="206" y1="125" x2="252" y2="98" />
      <!-- Top Center to Top Right Outer -->
      <line x1="252" y1="98" x2="354" y2="157" />
      <!-- Top Right Outer to Mid Right Outer -->
      <line x1="354" y1="157" x2="354" y2="255" />
      <!-- Mid Right Outer to Bottom Right -->
      <line x1="354" y1="255" x2="258" y2="313" />
      <!-- Bottom Center to Bottom Left Node -->
      <line x1="258" y1="313" x2="222" y2="292" />
      <line x1="222" y1="292" x2="185" y2="278" />

      <!-- Left Facet Polygon Line Segments connecting into particles -->
      <line x1="206" y1="143" x2="190" y2="168" />
      <line x1="190" y1="168" x2="212" y2="192" />
      <line x1="212" y1="192" x2="185" y2="216" />
      <line x1="185" y1="216" x2="202" y2="242" />
      <line x1="202" y1="242" x2="160" y2="265" />
      <line x1="160" y1="265" x2="178" y2="280" />
      <line x1="178" y1="280" x2="222" y2="292" />

      <!-- Isometric Central Y-Axes -->
      <!-- Center Vertical Axis -->
      <line x1="252" y1="98" x2="252" y2="242" />
      <!-- Center to Bottom Center -->
      <line x1="252" y1="242" x2="258" y2="313" />
      <!-- Center Node to Left Face Inner -->
      <line x1="252" y1="242" x2="206" y2="262" />
      <!-- Center Node to Bottom Right Internal -->
      <line x1="252" y1="242" x2="304" y2="274" />

      <!-- Interior 3D Box Transparent Wireframe (Creating 3D Cube Depth) -->
      <!-- Back Interior Vertex (304, 138) connected to Top Right and Center -->
      <line x1="252" y1="98" x2="292" y2="138" stroke-width="4.2" opacity="0.85" />
      <line x1="292" y1="138" x2="354" y2="157" stroke-width="4.2" opacity="0.85" />
      <line x1="292" y1="138" x2="304" y2="192" stroke-width="4.2" opacity="0.85" />

      <!-- Internal Right Face Grid Lines -->
      <line x1="304" y1="192" x2="354" y2="192" stroke-width="4.2" opacity="0.9" />
      <line x1="304" y1="192" x2="304" y2="274" stroke-width="4.2" opacity="0.9" />
      <line x1="304" y1="274" x2="354" y2="255" stroke-width="4.2" opacity="0.9" />
      <line x1="252" y1="242" x2="304" y2="192" stroke-width="4.2" opacity="0.9" />
    </g>

    <!-- 4. VERTEX NODES (Luminescent Spheres / Joint Rings) -->
    <!-- Top Apex Node -->
    <circle cx="252" cy="98" r="9.0" fill="#7C3AED" stroke="#C084FC" stroke-width="2.5" />
    <circle cx="252" cy="98" r="3.2" fill="#FFFFFF" />

    <!-- Top Right Corner Node -->
    <circle cx="354" cy="157" r="8.5" fill="#E11D48" stroke="#FDA4AF" stroke-width="2.5" />
    <circle cx="354" cy="157" r="3.0" fill="#FFFFFF" />

    <!-- Center Node (Focal Joint) -->
    <circle cx="252" cy="242" r="9.5" fill="#9333EA" stroke="#E879F9" stroke-width="2.5" />
    <circle cx="252" cy="242" r="3.5" fill="#FFFFFF" />

    <!-- Right Mid Node -->
    <circle cx="354" cy="255" r="8.5" fill="#F43F5E" stroke="#FECDD3" stroke-width="2.5" />
    <circle cx="354" cy="255" r="3.0" fill="#FFFFFF" />

    <!-- Bottom Apex Node -->
    <circle cx="258" cy="313" r="8.5" fill="#8B5CF6" stroke="#C084FC" stroke-width="2.5" />
    <circle cx="258" cy="313" r="3.0" fill="#FFFFFF" />

    <!-- Internal Grid Nodes -->
    <circle cx="292" cy="138" r="6.0" fill="#A855F7" stroke="#E9D5FF" stroke-width="1.8" />
    <circle cx="304" cy="192" r="7.5" fill="#EC4899" stroke="#FCE7F3" stroke-width="2.2" />
    <circle cx="304" cy="274" r="6.5" fill="#FB7185" stroke="#FFE4E6" stroke-width="2.0" />
    <circle cx="222" cy="292" r="7.0" fill="#7C3AED" stroke="#DDD6FE" stroke-width="2.0" />
    <circle cx="185" cy="278" r="6.5" fill="#6D28D9" stroke="#C4B5FD" stroke-width="1.8" />

    <!-- 5. ELEGANT BRAND TYPOGRAPHY: Nexra 3D (Subtle and Crisp) -->
    <g transform="translate(245, 388)">
      <text
        x="0"
        y="0"
        text-anchor="middle"
        font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        font-size="44"
        letter-spacing="0.5"
      >
        <tspan fill="#F8FAFC" font-weight="400">Nexra </tspan>
        <tspan fill="#C084FC" font-weight="300">3D</tspan>
      </text>
    </g>
  </g>
</svg>
`;

// Pure Icon SVG (focused squarely on the iconic 3D Cube Particle Mark for small 16px/32px favicons)
const createNexraFaviconIconOnlySvg = () => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="45%" r="65%">
      <stop offset="0%" stop-color="#14192B" />
      <stop offset="60%" stop-color="#0B0F1B" />
      <stop offset="100%" stop-color="#060810" />
    </radialGradient>

    <linearGradient id="borderGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.7" />
      <stop offset="50%" stop-color="#C084FC" stop-opacity="0.4" />
      <stop offset="100%" stop-color="#FB7185" stop-opacity="0.6" />
    </linearGradient>

    <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="70%">
      <stop offset="0%" stop-color="#7C3AED" />
      <stop offset="30%" stop-color="#9333EA" />
      <stop offset="60%" stop-color="#C084FC" />
      <stop offset="85%" stop-color="#F43F5E" />
      <stop offset="100%" stop-color="#FB7185" />
    </linearGradient>

    <filter id="subtleGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2" stdDeviation="4" flood-color="#8B5CF6" flood-opacity="0.4" />
    </filter>
  </defs>

  <!-- Luxury Squircle Container -->
  <rect x="12" y="12" width="488" height="488" rx="108" fill="url(#bgGrad)" stroke="url(#borderGrad)" stroke-width="4.5" />

  <!-- Enlarged Icon Centered for Maximum Crispness at 16x16 / 32x32 / 48x48 -->
  <g transform="translate(256, 256) scale(1.35) translate(-250, -210)" filter="url(#subtleGlow)">

    <!-- Halftone Particles -->
    <circle cx="140" cy="158" r="3.6" fill="#7C3AED" opacity="0.65" />
    <circle cx="152" cy="120" r="4.2" fill="#8B5CF6" opacity="0.6" />
    <circle cx="162" cy="144" r="5.0" fill="#7C3AED" opacity="0.75" />
    <circle cx="132" cy="190" r="3.5" fill="#6D28D9" opacity="0.55" />
    <circle cx="148" cy="180" r="4.8" fill="#8B5CF6" opacity="0.8" />
    <circle cx="138" cy="225" r="4.0" fill="#7C3AED" opacity="0.65" />
    <circle cx="155" cy="208" r="5.2" fill="#9333EA" opacity="0.8" />
    <circle cx="144" cy="254" r="4.0" fill="#7C3AED" opacity="0.7" />
    <circle cx="160" cy="242" r="5.2" fill="#9333EA" opacity="0.85" />
    <circle cx="150" cy="285" r="4.2" fill="#8B5CF6" opacity="0.65" />
    <circle cx="170" cy="108" r="4.0" fill="#8B5CF6" opacity="0.7" />
    <circle cx="180" cy="126" r="5.2" fill="#9333EA" opacity="0.85" />
    <circle cx="172" cy="164" r="5.8" fill="#9333EA" opacity="0.9" />
    <circle cx="168" cy="275" r="5.2" fill="#9333EA" opacity="0.8" />
    <circle cx="160" cy="300" r="4.5" fill="#7C3AED" opacity="0.65" />

    <!-- Matrix Dots Column 1 -->
    <circle cx="206" cy="125" r="4.8" fill="#9333EA" opacity="0.8" />
    <circle cx="206" cy="143" r="4.8" fill="#A855F7" opacity="0.85" />
    <circle cx="206" cy="161" r="4.8" fill="#A855F7" opacity="0.9" />
    <circle cx="206" cy="179" r="4.8" fill="#A855F7" opacity="0.9" />
    <circle cx="206" cy="197" r="4.8" fill="#C084FC" opacity="0.9" />
    <circle cx="206" cy="215" r="4.8" fill="#C084FC" opacity="0.9" />
    <circle cx="206" cy="233" r="4.8" fill="#C084FC" opacity="0.9" />
    <circle cx="206" cy="251" r="4.8" fill="#A855F7" opacity="0.85" />
    <circle cx="206" cy="269" r="4.8" fill="#9333EA" opacity="0.85" />
    <circle cx="206" cy="287" r="4.8" fill="#8B5CF6" opacity="0.8" />

    <!-- Column 2 -->
    <circle cx="222" cy="134" r="4.8" fill="#9333EA" opacity="0.85" />
    <circle cx="222" cy="152" r="4.8" fill="#A855F7" opacity="0.9" />
    <circle cx="222" cy="170" r="4.8" fill="#C084FC" opacity="0.9" />
    <circle cx="222" cy="188" r="4.8" fill="#C084FC" opacity="0.95" />
    <circle cx="222" cy="206" r="4.8" fill="#C084FC" opacity="0.95" />
    <circle cx="222" cy="224" r="4.8" fill="#C084FC" opacity="0.95" />
    <circle cx="222" cy="242" r="4.8" fill="#C084FC" opacity="0.95" />
    <circle cx="222" cy="260" r="4.8" fill="#A855F7" opacity="0.9" />
    <circle cx="222" cy="278" r="4.8" fill="#9333EA" opacity="0.85" />

    <!-- Column 3 -->
    <circle cx="238" cy="143" r="4.6" fill="#A855F7" opacity="0.9" />
    <circle cx="238" cy="161" r="4.6" fill="#C084FC" opacity="0.9" />
    <circle cx="238" cy="179" r="4.6" fill="#C084FC" opacity="0.95" />
    <circle cx="238" cy="197" r="4.6" fill="#E879F9" opacity="0.95" />
    <circle cx="238" cy="215" r="4.6" fill="#E879F9" opacity="0.95" />
    <circle cx="238" cy="233" r="4.6" fill="#E879F9" opacity="0.95" />
    <circle cx="238" cy="251" r="4.6" fill="#C084FC" opacity="0.9" />
    <circle cx="238" cy="269" r="4.6" fill="#A855F7" opacity="0.9" />

    <!-- Wireframe Lines -->
    <g stroke="url(#wireGrad)" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round">
      <line x1="206" y1="125" x2="252" y2="98" />
      <line x1="252" y1="98" x2="354" y2="157" />
      <line x1="354" y1="157" x2="354" y2="255" />
      <line x1="354" y1="255" x2="258" y2="313" />
      <line x1="258" y1="313" x2="222" y2="292" />
      <line x1="222" y1="292" x2="185" y2="278" />

      <line x1="206" y1="143" x2="190" y2="168" />
      <line x1="190" y1="168" x2="212" y2="192" />
      <line x1="212" y1="192" x2="185" y2="216" />
      <line x1="185" y1="216" x2="202" y2="242" />
      <line x1="202" y1="242" x2="160" y2="265" />
      <line x1="160" y1="265" x2="178" y2="280" />
      <line x1="178" y1="280" x2="222" y2="292" />

      <line x1="252" y1="98" x2="252" y2="242" />
      <line x1="252" y1="242" x2="258" y2="313" />
      <line x1="252" y1="242" x2="206" y2="262" />
      <line x1="252" y1="242" x2="304" y2="274" />

      <line x1="252" y1="98" x2="292" y2="138" stroke-width="4.8" opacity="0.85" />
      <line x1="292" y1="138" x2="354" y2="157" stroke-width="4.8" opacity="0.85" />
      <line x1="292" y1="138" x2="304" y2="192" stroke-width="4.8" opacity="0.85" />

      <line x1="304" y1="192" x2="354" y2="192" stroke-width="4.8" opacity="0.9" />
      <line x1="304" y1="192" x2="304" y2="274" stroke-width="4.8" opacity="0.9" />
      <line x1="304" y1="274" x2="354" y2="255" stroke-width="4.8" opacity="0.9" />
      <line x1="252" y1="242" x2="304" y2="192" stroke-width="4.8" opacity="0.9" />
    </g>

    <!-- Vertex Nodes -->
    <circle cx="252" cy="98" r="9.5" fill="#7C3AED" stroke="#C084FC" stroke-width="2.5" />
    <circle cx="252" cy="98" r="3.5" fill="#FFFFFF" />

    <circle cx="354" cy="157" r="9.0" fill="#E11D48" stroke="#FDA4AF" stroke-width="2.5" />
    <circle cx="354" cy="157" r="3.2" fill="#FFFFFF" />

    <circle cx="252" cy="242" r="10.5" fill="#9333EA" stroke="#E879F9" stroke-width="2.5" />
    <circle cx="252" cy="242" r="4.0" fill="#FFFFFF" />

    <circle cx="354" cy="255" r="9.0" fill="#F43F5E" stroke="#FECDD3" stroke-width="2.5" />
    <circle cx="354" cy="255" r="3.2" fill="#FFFFFF" />

    <circle cx="258" cy="313" r="9.0" fill="#8B5CF6" stroke="#C084FC" stroke-width="2.5" />
    <circle cx="258" cy="313" r="3.2" fill="#FFFFFF" />

    <circle cx="292" cy="138" r="6.8" fill="#A855F7" stroke="#E9D5FF" stroke-width="2.0" />
    <circle cx="304" cy="192" r="8.0" fill="#EC4899" stroke="#FCE7F3" stroke-width="2.2" />
    <circle cx="304" cy="274" r="7.0" fill="#FB7185" stroke="#FFE4E6" stroke-width="2.0" />
    <circle cx="222" cy="292" r="7.5" fill="#7C3AED" stroke="#DDD6FE" stroke-width="2.0" />
    <circle cx="185" cy="278" r="7.0" fill="#6D28D9" stroke="#C4B5FD" stroke-width="1.8" />
  </g>
</svg>
`;

async function generateAll() {
  const publicDir = path.resolve('public');
  const distDir = path.resolve('dist');

  const mainSvg = createNexraFaviconSvg(true);
  const iconOnlySvg = createNexraFaviconIconOnlySvg();

  // Save SVGs
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), iconOnlySvg.trim());
  fs.writeFileSync(path.join(publicDir, 'logo.svg'), mainSvg.trim());

  const svgBuffer = Buffer.from(iconOnlySvg);
  const largeSvgBuffer = Buffer.from(mainSvg);

  // Generate PNG sizes
  const sizes = [
    { name: 'favicon-16x16.png', size: 16, src: svgBuffer },
    { name: 'favicon-32x32.png', size: 32, src: svgBuffer },
    { name: 'favicon-48x48.png', size: 48, src: svgBuffer },
    { name: 'apple-touch-icon.png', size: 180, src: largeSvgBuffer },
    { name: 'favicon-192x192.png', size: 192, src: largeSvgBuffer },
    { name: 'favicon-512x512.png', size: 512, src: largeSvgBuffer }
  ];

  for (const item of sizes) {
    const pngBuffer = await sharp(item.src)
      .resize(item.size, item.size)
      .png({ quality: 100, compressionLevel: 9 })
      .toBuffer();

    fs.writeFileSync(path.join(publicDir, item.name), pngBuffer);
    if (fs.existsSync(distDir)) {
      fs.writeFileSync(path.join(distDir, item.name), pngBuffer);
    }
    console.log(`Generated: ${item.name} (${item.size}x${item.size})`);
  }

  // Generate multi-resolution favicon.ico (16, 32, 48)
  // Sharp can generate a 32x32 PNG and write as .ico, or standard ICO header
  const ico32Buffer = await sharp(svgBuffer).resize(32, 32).png().toBuffer();
  fs.writeFileSync(path.join(publicDir, 'favicon.ico'), ico32Buffer);
  if (fs.existsSync(distDir)) {
    fs.writeFileSync(path.join(distDir, 'favicon.ico'), ico32Buffer);
    fs.writeFileSync(path.join(distDir, 'favicon.svg'), iconOnlySvg.trim());
    fs.writeFileSync(path.join(distDir, 'logo.svg'), mainSvg.trim());
  }
  console.log('Generated: favicon.ico');
  console.log('All Nexra 3D Favicon assets successfully generated!');
}

generateAll().catch(console.error);
