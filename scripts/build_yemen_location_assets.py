import json
from pathlib import Path

ROOT = Path('/home/ubuntu/Edusmart')
SOURCE_GEO = Path('/home/ubuntu/yemen_geo_hierarchy.json')
SOURCE_SITES = Path('/home/ubuntu/yemen_schools.json')
DATA_DIR = ROOT / 'src' / 'data'
DATA_DIR.mkdir(parents=True, exist_ok=True)

with SOURCE_GEO.open(encoding='utf-8') as f:
    hierarchy = json.load(f)

# Keep the app's location payload focused on registration: governorates and districts.
# Villages/uzlah rows remain available in the source workbook and can be lazy-loaded later.
for governorate in hierarchy:
    governorate['districts'] = [
        {
            'id': district['id'],
            'nameAr': district['nameAr'],
            'nameEn': district.get('nameEn', ''),
        }
        for district in governorate.get('districts', [])
    ]

with (DATA_DIR / 'yemen-administrative-hierarchy.json').open('w', encoding='utf-8') as f:
    json.dump(hierarchy, f, ensure_ascii=False, separators=(',', ':'))

# Generate a typed module because this repository does not enable resolveJsonModule.
ts_payload = json.dumps(hierarchy, ensure_ascii=False, indent=2)
(DATA_DIR.parent / 'lib' / 'yemenData.generated.ts').write_text(
    "export interface YemenDistrict { id: string; nameAr: string; nameEn: string; }\n"
    "export interface YemenGovernorate { id: string; nameAr: string; nameEn: string; districts: YemenDistrict[]; }\n"
    f"export const yemenGovernorates: YemenGovernorate[] = {ts_payload};\n",
    encoding='utf-8'
)

# The attached "school" workbook has no school-name or EMIS-code column.
# Preserve it as school-site observations without presenting villages as school names.
with SOURCE_SITES.open(encoding='utf-8') as f:
    source_sites = json.load(f)

sites = []
for index, item in enumerate(source_sites, start=1):
    sites.append({
        'id': f"site_{index:05d}",
        'governorateRaw': item.get('governorate', ''),
        'village': item.get('name', ''),
        'status': item.get('status', ''),
        'source': 'attached_school_workbook',
    })

with (DATA_DIR / 'yemen-school-site-observations.json').open('w', encoding='utf-8') as f:
    json.dump(sites, f, ensure_ascii=False, separators=(',', ':'))

metadata = {
    'governorates': len(hierarchy),
    'districts': sum(len(g.get('districts', [])) for g in hierarchy),
    'schoolSiteObservations': len(sites),
    'schoolNameDataAvailable': False,
    'schoolNameDataReason': 'The attached workbook contains المحافظة، القرية، حالة المدرسة، نوع الضرر; it has no school name or EMIS code.',
    'sources': {
        'administrativeHierarchy': 'التقسيم الإداري لليمن.xlsx',
        'schoolObservations': 'قائمة المدارس اليمن.xlsx',
    },
}
with (DATA_DIR / 'yemen-location-metadata.json').open('w', encoding='utf-8') as f:
    json.dump(metadata, f, ensure_ascii=False, indent=2)

print(json.dumps(metadata, ensure_ascii=False))
