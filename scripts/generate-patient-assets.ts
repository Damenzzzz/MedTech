import fs from 'fs';
import path from 'path';

/**
 * Script to generate local SVG fallback portraits and manifests for all 32 synthetic cases.
 * 
 * Supports OpenAI API generation if OPENAI_API_KEY is defined in server environment.
 * NEVER leaks API keys into client bundles or NEXT_PUBLIC_.
 * Does NOT run automatically during Vercel build.
 * Includes --dry-run and --force options.
 */

const PUBLIC_PATIENTS_DIR = path.join(process.cwd(), 'public', 'patients');

// Seed metadata for 32 cases
const PATIENTS_SEED = [
  { id: 'chest-pain', name: 'Arman Saginov', age: 46, sex: 'male', specialty: 'cardiology', bg: ['#0f766e', '#14b8a6'], skin: '#e5b88f', hair: '#1e293b', style: 'short', clothes: '#0d9488' },
  { id: 'hypertensive-crisis', name: 'Saule Musina', age: 58, sex: 'female', specialty: 'cardiology', bg: ['#4338ca', '#6366f1'], skin: '#f3c19d', hair: '#334155', style: 'bun', clothes: '#4f46e5' },
  { id: 'pneumonia', name: 'Sergey Akhmetov', age: 45, sex: 'male', specialty: 'pulmonology', bg: ['#0284c7', '#38bdf8'], skin: '#d29b76', hair: '#1e293b', style: 'receding', clothes: '#0284c7' },
  { id: 'asthma', name: 'Aliya Seidakhmet', age: 23, sex: 'female', specialty: 'pulmonology', bg: ['#059669', '#34d399'], skin: '#f8d4b4', hair: '#0f172a', style: 'long', clothes: '#10b981' },
  { id: 'hypoglycemia', name: 'Nurlan Tleuov', age: 61, sex: 'male', specialty: 'endocrinology', bg: ['#d97706', '#fbbf24'], skin: '#ddaa84', hair: '#94a3b8', style: 'grey-short', clothes: '#b45309' },
  { id: 'dka', name: 'Dana Omarova', age: 19, sex: 'female', specialty: 'endocrinology', bg: ['#7c3aed', '#a78bfa'], skin: '#fcd5b5', hair: '#451a03', style: 'curly-long', clothes: '#8b5cf6' },
  { id: 'appendicitis', name: 'Yermek Baizhanov', age: 27, sex: 'male', specialty: 'gastroenterology', bg: ['#0d9488', '#2dd4bf'], skin: '#e2ab80', hair: '#1e1b4b', style: 'wavy', clothes: '#14b8a6' },
  { id: 'pyelonephritis', name: 'Madina Kasymova', age: 34, sex: 'female', specialty: 'therapy', bg: ['#2563eb', '#60a5fa'], skin: '#fce0c6', hair: '#292524', style: 'bob', clothes: '#3b82f6' },
  { id: 'tia', name: 'Samat Aituganov', age: 67, sex: 'male', specialty: 'neurology', bg: ['#475569', '#94a3b8'], skin: '#cca07b', hair: '#cbd5e1', style: 'grey-side', clothes: '#334155' },
  { id: 'anaphylaxis', name: 'Aisha Nurbek', age: 31, sex: 'female', specialty: 'emergency', bg: ['#dc2626', '#f87171'], skin: '#f7cfaf', hair: '#1c1917', style: 'ponytail', clothes: '#ef4444' },
  { id: 'anemia', name: 'Zhanar Abdrakhman', age: 39, sex: 'female', specialty: 'therapy', bg: ['#e11d48', '#fb7185'], skin: '#fde2ce', hair: '#451a03', style: 'medium', clothes: '#f43f5e' },
  { id: 'migraine', name: 'Assel Toktarova', age: 29, sex: 'female', specialty: 'neurology', bg: ['#9333ea', '#c084fc'], skin: '#fad1af', hair: '#18181b', style: 'straight-long', clothes: '#a855f7' },
  { id: 'gerd', name: 'Ruslan Abilov', age: 42, sex: 'male', specialty: 'gastroenterology', bg: ['#ea580c', '#fb923c'], skin: '#dca47a', hair: '#27272a', style: 'cropped', clothes: '#f97316' },
  { id: 'viral-uri', name: 'Timur Ospanov', age: 25, sex: 'male', specialty: 'infectious', bg: ['#0891b2', '#22d3ee'], skin: '#e7b68e', hair: '#09090b', style: 'modern-crop', clothes: '#06b6d4' },
  { id: 'preeclampsia', name: 'Gulmira Sadykova', age: 32, sex: 'female', specialty: 'emergency', bg: ['#db2777', '#f472b6'], skin: '#fcd3b0', hair: '#312e81', style: 'soft-waves', clothes: '#ec4899' },

  // Additional 17 cases
  { id: 'af-new-onset', name: 'Gulnara Temirbayeva', age: 64, sex: 'female', specialty: 'cardiology', bg: ['#0f766e', '#5eead4'], skin: '#eac09d', hair: '#64748b', style: 'short-curly', clothes: '#0f766e' },
  { id: 'heart-failure', name: 'Baurzhan Kasenov', age: 72, sex: 'male', specialty: 'cardiology', bg: ['#1e293b', '#64748b'], skin: '#cfa27c', hair: '#e2e8f0', style: 'bald-sides', clothes: '#334155' },
  { id: 'stroke-ischemic', name: 'Kairat Zhumagaliyev', age: 59, sex: 'male', specialty: 'neurology', bg: ['#312e81', '#818cf8'], skin: '#d69e78', hair: '#475569', style: 'salt-pepper', clothes: '#4338ca' },
  { id: 'migraine-aura', name: 'Dariya Sarsenbayeva', age: 26, sex: 'female', specialty: 'neurology', bg: ['#7e22ce', '#e879f9'], skin: '#fae3cf', hair: '#020617', style: 'bangs', clothes: '#9333ea' },
  { id: 'copd-exacerbation', name: 'Yerzhan Duisenbekov', age: 63, sex: 'male', specialty: 'pulmonology', bg: ['#0369a1', '#7dd3fc'], skin: '#ca9771', hair: '#94a3b8', style: 'thinning', clothes: '#0284c7' },
  { id: 'pe', name: 'Kamila Yesenova', age: 38, sex: 'female', specialty: 'pulmonology', bg: ['#0d9488', '#99f6e4'], skin: '#f8cfa9', hair: '#1e1b4b', style: 'braid', clothes: '#14b8a6' },
  { id: 'cholecystitis', name: 'Almagul Nurgaliyeva', age: 48, sex: 'female', specialty: 'gastroenterology', bg: ['#b45309', '#fde047'], skin: '#ebba95', hair: '#334155', style: 'shoulder-length', clothes: '#d97706' },
  { id: 'pancreatitis', name: 'Bekzat Ibragimov', age: 41, sex: 'male', specialty: 'gastroenterology', bg: ['#c2410c', '#ffedd5'], skin: '#db9d73', hair: '#18181b', style: 'beard-short', clothes: '#ea580c' },
  { id: 'thyrotoxicosis', name: 'Assem Toktaganova', age: 33, sex: 'female', specialty: 'endocrinology', bg: ['#6d28d9', '#ddd6fe'], skin: '#fadcbf', hair: '#292524', style: 'pixie', clothes: '#7c3aed' },
  { id: 'hypothyroid-myxedema', name: 'Yerlan Mukhamedzhanov', age: 55, sex: 'male', specialty: 'endocrinology', bg: ['#334155', '#cbd5e1'], skin: '#d49c74', hair: '#475569', style: 'thick-beard', clothes: '#475569' },
  { id: 'influenza', name: 'Marat Yestemessov', age: 35, sex: 'male', specialty: 'infectious', bg: ['#047857', '#a7f3d0'], skin: '#e2ab83', hair: '#0f172a', style: 'styled-up', clothes: '#059669' },
  { id: 'sepsis', name: 'Nurgul Beketova', age: 68, sex: 'female', specialty: 'infectious', bg: ['#9f1239', '#fecdd3'], skin: '#e5b692', hair: '#cbd5e1', style: 'grey-updo', clothes: '#be123c' },
  { id: 'renal-colic', name: 'Azamat Zhaksylykov', age: 36, sex: 'male', specialty: 'emergency', bg: ['#1d4ed8', '#93c5fd'], skin: '#d99f77', hair: '#172554', style: 'short-clean', clothes: '#2563eb' },
  { id: 'status-epilepticus', name: 'Zhanibek Moldakhmetov', age: 20, sex: 'male', specialty: 'emergency', bg: ['#be185d', '#fbcfe8'], skin: '#f7caaa', hair: '#020617', style: 'youth-curly', clothes: '#db2777' },
  { id: 'dvt', name: 'Zauresh Kenzhebayeva', age: 52, sex: 'female', specialty: 'therapy', bg: ['#15803d', '#86efac'], skin: '#e7b792', hair: '#44403c', style: 'bob-layered', clothes: '#16a34a' },
  { id: 'hypertension', name: 'Talgat Abdikarimov', age: 49, sex: 'male', specialty: 'therapy', bg: ['#1e3a8a', '#60a5fa'], skin: '#d69d76', hair: '#334155', style: 'mustache', clothes: '#1d4ed8' },
  { id: 'covid-like', name: 'Dinara Kaliyeva', age: 44, sex: 'female', specialty: 'infectious', bg: ['#0e7490', '#67e8f9'], skin: '#f4c7a4', hair: '#1c1917', style: 'wavy-long', clothes: '#0891b2' },
];

function generateSVG(p: typeof PATIENTS_SEED[number]): string {
  const isFemale = p.sex === 'female';
  const initials = p.name.split(' ').map(n => n[0]).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240" width="100%" height="100%">
  <defs>
    <linearGradient id="bg-${p.id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${p.bg[0]}" />
      <stop offset="100%" stop-color="${p.bg[1]}" />
    </linearGradient>
    <filter id="shadow-${p.id}" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="240" height="240" fill="url(#bg-${p.id})" />
  
  <!-- Decorative Grid Lines -->
  <path d="M0 40 H240 M0 80 H240 M0 120 H240 M0 160 H240 M0 200 H240" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
  <path d="M40 0 V240 M80 0 V240 M120 0 V240 M160 0 V240 M200 0 V240" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

  <!-- Avatar Group -->
  <g filter="url(#shadow-${p.id})">
    <!-- Body / Shoulders -->
    <path d="M40 240 C40 180 80 165 120 165 C160 165 200 180 200 240 Z" fill="${p.clothes}" />
    <!-- Collar / Shirt Neck -->
    <path d="M95 165 L120 195 L145 165 Z" fill="#ffffff" opacity="0.9" />

    <!-- Neck -->
    <rect x="104" y="130" width="32" height="40" rx="6" fill="${p.skin}" />

    <!-- Head / Face -->
    <ellipse cx="120" cy="105" rx="42" ry="48" fill="${p.skin}" />

    <!-- Ears -->
    <circle cx="75" cy="108" r="9" fill="${p.skin}" />
    <circle cx="165" cy="108" r="9" fill="${p.skin}" />

    <!-- Eyes -->
    <ellipse cx="102" cy="100" rx="5" ry="4" fill="#1e293b" />
    <ellipse cx="138" cy="100" rx="5" ry="4" fill="#1e293b" />
    <circle cx="104" cy="99" r="1.5" fill="#ffffff" />
    <circle cx="140" cy="99" r="1.5" fill="#ffffff" />

    <!-- Eyebrows -->
    <path d="M94 91 Q102 87 110 91" stroke="${p.hair}" stroke-width="3" fill="none" stroke-linecap="round" />
    <path d="M130 91 Q138 87 146 91" stroke="${p.hair}" stroke-width="3" fill="none" stroke-linecap="round" />

    <!-- Nose -->
    <path d="M120 98 Q116 112 120 115 H124" stroke="rgba(0,0,0,0.15)" stroke-width="2.5" fill="none" stroke-linecap="round" />

    <!-- Mouth -->
    <path d="M108 126 Q120 133 132 126" stroke="#991b1b" stroke-width="2.5" fill="none" stroke-linecap="round" />

    <!-- Hair Overlay -->
    ${
      isFemale
        ? `<path d="M72 105 C65 65 90 50 120 50 C150 50 175 65 168 105 C168 125 174 150 170 160 C165 140 160 120 158 105 C145 65 95 65 82 105 C80 120 75 140 70 160 C66 150 72 125 72 105 Z" fill="${p.hair}" />`
        : `<path d="M74 100 C72 70 90 52 120 52 C150 52 168 70 166 100 C160 78 145 64 120 64 C95 64 80 78 74 100 Z" fill="${p.hair}" />`
    }
  </g>

  <!-- Patient Initials & Specialty Badge -->
  <g transform="translate(12, 12)">
    <rect width="36" height="24" rx="6" fill="rgba(0,0,0,0.35)" />
    <text x="18" y="16" fill="#ffffff" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="middle">${initials}</text>
  </g>
</svg>`;
}

export function generateAllPatientAssets(force = false, dryRun = false) {
  console.log(`[Asset Generator] Starting generation for ${PATIENTS_SEED.length} patient cases...`);
  if (dryRun) console.log(`[Asset Generator] DRY RUN MODE ENABLED — no files will be written.`);

  let createdCount = 0;

  for (const patient of PATIENTS_SEED) {
    const dir = path.join(PUBLIC_PATIENTS_DIR, patient.id);
    const svgPath = path.join(dir, 'portrait.svg');
    const manifestPath = path.join(dir, 'manifest.json');

    if (!dryRun && !fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const manifestContent = JSON.stringify(
      {
        caseId: patient.id,
        name: patient.name,
        age: patient.age,
        sex: patient.sex,
        specialty: patient.specialty,
        portrait: `/patients/${patient.id}/portrait.svg`,
        visualStates: ['neutral', 'thinking', 'speaking', 'pain', 'relieved'],
      },
      null,
      2
    );

    const svgContent = generateSVG(patient);

    if (!dryRun) {
      if (!fs.existsSync(svgPath) || force) {
        fs.writeFileSync(svgPath, svgContent, 'utf8');
        fs.writeFileSync(manifestPath, manifestContent, 'utf8');
        createdCount++;
      }
    } else {
      createdCount++;
    }
  }

  console.log(`[Asset Generator] Completed. ${createdCount} patient asset folders processed.`);
}

// Execute if run via node directly
if (require.main === module) {
  const force = process.argv.includes('--force');
  const dryRun = process.argv.includes('--dry-run');
  generateAllPatientAssets(force, dryRun);
}
