const landscape = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="#87b6cf"/><stop offset="1" stop-color="#e4e3ce"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h640v400H0z"/><circle cx="480" cy="92" r="34" fill="#fff0ba"/><path fill="#697f91" d="M0 238L158 70l143 154L415 100l225 169v131H0z"/><path fill="#e5e7e0" d="m158 70-48 51 47-18 40 25zm257 30-41 47 39-14 42 22z"/><path fill="#456d69" d="M0 241q145-70 290 17t350-12v154H0z"/><path fill="#70aab6" d="M90 288q220-34 487 10l-83 102H170z"/><path fill="#2c514d" d="m35 270 31-71 31 71H80v44H54v-44zm505-3 36-91 36 91h-23v54h-25v-54z"/></svg>`;
const city =
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><path fill="#eee1ce" d="M0 0h640v400H0z"/><circle cx="476" cy="104" r="56" fill="#df8e68"/><path fill="#537e87" d="M0 294h640v106H0z"/><path fill="#9fbbb6" d="M32 166h110v142H32zM488 198h122v110H488z"/><path fill="#516b82" d="M158 108h132v200H158zM316 176h150v132H316z"/><path fill="#e7cc91" d="M179 131h25v27h-25zM238 131h25v27h-25zM179 186h25v27h-25zM238 186h25v27h-25zM338 199h38v34h-38zM408 199h38v34h-38zM55 188h28v30H55zM98 188h28v30H98zM509 222h29v33h-29zM553 222h29v33h-29z"/><path stroke="#c2d8d4" stroke-width="5" d="M0 337h640M0 365h640"/><path fill="#273f52" d="M291 237h19v98h-19zM297 229h34v12h-34z"/></svg>';
const nature =
  '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400" viewBox="0 0 640 400"><path fill="#dce7dc" d="M0 0h640v400H0z"/><circle cx="455" cy="126" r="108" fill="#b2cec2"/><circle cx="170" cy="288" r="87" fill="#eac8a2"/><path fill="#547c6b" d="M293 315C154 304 115 138 186 82c109 18 162 128 107 233z"/><path fill="#8dafa0" d="M303 315c20-176 119-237 196-193-2 139-94 196-196 193z"/><path fill="#31594d" d="M307 329c-4-112 73-154 131-132-3 92-60 132-131 132z"/><path fill="none" stroke="#edf2e7" stroke-width="5" stroke-linecap="round" d="M188 94l102 201M483 136 315 296M423 212l-103 99"/><path fill="none" stroke="#31594d" stroke-width="8" stroke-linecap="round" d="M304 356V240"/></svg>';
const sampleImages = [
  { name: 'Paisaje — ejemplo.svg', source: landscape },
  { name: 'Ciudad — ejemplo.svg', source: city },
  { name: 'Naturaleza — ejemplo.svg', source: nature },
] as const;

function guide(): Uint8Array<ArrayBuffer> {
  const content =
    'BT /F1 24 Tf 25 365 Td (Materiales de Canvas) Tj 0 -48 Td /F1 12 Tf (Imagen, video y PDF incorporados como ejemplos.) Tj 0 -26 Td (Mover, redimensionar, conectar y comentar.) Tj 0 -26 Td (Los archivos se conservan al recargar.) Tj ET';
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 420] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let text = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(text.length);
    text += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const start = text.length;
  text += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => String(offset).padStart(10, '0') + ' 00000 n \n')
    .join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return new TextEncoder().encode(text);
}

/** Clip real generado localmente. No requiere cámara, micrófono ni recursos de red. */
async function orbit(): Promise<{ file: File; duration: number }> {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 360;
  const draw = canvas.getContext('2d')!;
  const stream = canvas.captureStream(24);
  const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => chunks.push(event.data);
  const started = performance.now();
  const paint = () => {
    const phase = ((performance.now() - started) / 2400) * Math.PI * 2;
    draw.fillStyle = '#27313f';
    draw.fillRect(0, 0, 640, 360);
    draw.strokeStyle = '#8ba1b6';
    draw.lineWidth = 2;
    draw.beginPath();
    draw.ellipse(320, 180, 210, 100, 0, 0, Math.PI * 2);
    draw.stroke();
    draw.fillStyle = '#d6ae7d';
    draw.beginPath();
    draw.arc(320, 180, 60, 0, Math.PI * 2);
    draw.fill();
    draw.fillStyle = '#bac9df';
    draw.beginPath();
    draw.arc(320 + 210 * Math.cos(phase), 180 + 100 * Math.sin(phase), 16, 0, Math.PI * 2);
    draw.fill();
    draw.fillStyle = '#edf0f7';
    draw.font = '18px system-ui';
    draw.fillText('Movimiento orbital · ejemplo', 24, 32);
  };
  paint();
  const stopped = new Promise<void>((resolve, reject) => {
    recorder.onstop = () => resolve();
    recorder.onerror = () => reject(new Error('No se pudo generar el video de ejemplo'));
  });
  const timer = setInterval(paint, 1000 / 24);
  try {
    recorder.start();
    await new Promise((resolve) => setTimeout(resolve, 2400));
    recorder.stop();
    await stopped;
    return {
      file: new File(chunks, 'Órbita — ejemplo.webm', { type: 'video/webm' }),
      duration: (performance.now() - started) / 1000,
    };
  } finally {
    clearInterval(timer);
    stream.getTracks().forEach((track) => track.stop());
  }
}
export async function sampleFiles(imageIndex = 0): Promise<{
  files: File[];
  nextImageIndex: number;
  duration?: number;
}> {
  const index =
    Number.isSafeInteger(imageIndex) && imageIndex >= 0 ? imageIndex % sampleImages.length : 0;
  const image = sampleImages[index]!;
  const nextImageIndex = (index + 1) % sampleImages.length;
  const files = [
    new File([image.source], image.name, { type: 'image/svg+xml' }),
    new File([guide()], 'Guía — ejemplo.pdf', { type: 'application/pdf' }),
  ];
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported('video/webm'))
    return { files, nextImageIndex };
  const video = await orbit();
  files.splice(1, 0, video.file);
  return { files, nextImageIndex, duration: video.duration };
}
