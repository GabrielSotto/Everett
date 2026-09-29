import image1 from './deep-sky-assets/01.webp';
import image2 from './deep-sky-assets/02.webp';
import image3 from './deep-sky-assets/03.webp';
import image4 from './deep-sky-assets/04.webp';
import image5 from './deep-sky-assets/05.webp';
import image6 from './deep-sky-assets/06.webp';
import image7 from './deep-sky-assets/07.webp';
import image8 from './deep-sky-assets/08.webp';
// Recursos decorativos recuperados del HTML original; hashes en docs/asset-manifest.json.
export const deepSkyAssets: readonly { kind: 'nebula' | 'galaxy'; data: string }[] = [
  {
    kind: 'nebula',
    data: image1,
  },
  {
    kind: 'nebula',
    data: image2,
  },
  {
    kind: 'nebula',
    data: image3,
  },
  {
    kind: 'nebula',
    data: image4,
  },
  {
    kind: 'galaxy',
    data: image5,
  },
  {
    kind: 'galaxy',
    data: image6,
  },
  {
    kind: 'galaxy',
    data: image7,
  },
  {
    kind: 'galaxy',
    data: image8,
  },
];
