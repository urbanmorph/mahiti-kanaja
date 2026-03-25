// Build a flat search index from all data files at build time.
// This gets serialized into the page as JSON for Fuse.js to consume client-side.
import services from '../../data/services.json';
import departments from '../../data/departments.json';
import schemes from '../../data/schemes.json';

export function buildSearchItems() {
  const items = [];

  for (const s of services) {
    items.push({
      id: s.id,
      type: 'service',
      nameEn: s.name.en,
      nameKn: s.name.kn,
      descEn: s.description.en,
      descKn: s.description.kn,
      tags: s.tags,
      url: '/coming-soon',
      icon: s.icon,
      department: s.department,
      sector: s.sector,
    });
  }

  for (const d of departments) {
    items.push({
      id: d.id,
      type: 'department',
      nameEn: d.name.en,
      nameKn: d.name.kn,
      descEn: `${d.service_count} government services`,
      descKn: `${d.service_count} ಸರ್ಕಾರಿ ಸೇವೆಗಳು`,
      tags: [d.sector],
      url: `/explore/by-department`,
      sector: d.sector,
    });
  }

  for (const sc of schemes) {
    items.push({
      id: sc.id,
      type: 'scheme',
      nameEn: sc.name.en,
      nameKn: sc.name.kn,
      descEn: sc.description.en,
      descKn: sc.description.kn,
      tags: [sc.tag],
      url: '/coming-soon',
      beneficiaries: sc.beneficiaries,
    });
  }

  return items;
}
