export type YemenGradeKey =
  | 'grade_7'
  | 'grade_8'
  | 'grade_9'
  | 'secondary_1'
  | 'secondary_2_scientific'
  | 'secondary_2_literary'
  | 'secondary_3_scientific'
  | 'secondary_3_literary';

export interface YemenGradeOption {
  key: YemenGradeKey;
  labelAr: string;
  labelEn: string;
  aliases: string[];
}

export const YEMEN_GRADE_OPTIONS: YemenGradeOption[] = [
  {
    key: 'grade_7',
    labelAr: 'الصف السابع الأساسي',
    labelEn: 'Grade 7 Basic',
    aliases: ['السابع', 'الصف السابع', 'السابع الأساسي', 'grade 7'],
  },
  {
    key: 'grade_8',
    labelAr: 'الصف الثامن الأساسي',
    labelEn: 'Grade 8 Basic',
    aliases: ['الثامن', 'الصف الثامن', 'الثامن الأساسي', 'grade 8'],
  },
  {
    key: 'grade_9',
    labelAr: 'الصف التاسع الأساسي',
    labelEn: 'Grade 9 Basic',
    aliases: ['التاسع', 'الصف التاسع', 'التاسع الأساسي', 'grade 9'],
  },
  {
    key: 'secondary_1',
    labelAr: 'الصف الأول الثانوي',
    labelEn: 'Grade 10 / First Secondary',
    aliases: ['الأول الثانوي', 'الصف الأول الثانوي', 'الصف العاشر', 'الصف العاشر الثانوي', 'grade 10'],
  },
  {
    key: 'secondary_2_scientific',
    labelAr: 'الصف الثاني الثانوي (العلمي)',
    labelEn: 'Grade 11 / Second Secondary - Scientific',
    aliases: ['الثاني الثانوي', 'الصف الثاني الثانوي', 'الثاني الثانوي العلمي', 'الصف الثاني الثانوي (العلمي)', 'grade 11 scientific'],
  },
  {
    key: 'secondary_2_literary',
    labelAr: 'الصف الثاني الثانوي (الأدبي)',
    labelEn: 'Grade 11 / Second Secondary - Literary',
    aliases: ['الثاني الثانوي الأدبي', 'الصف الثاني الثانوي (الأدبي)', 'grade 11 literary'],
  },
  {
    key: 'secondary_3_scientific',
    labelAr: 'الصف الثالث الثانوي (العلمي)',
    labelEn: 'Grade 12 / Third Secondary - Scientific',
    aliases: ['الثالث الثانوي', 'الصف الثالث الثانوي', 'الثالث الثانوي العلمي', 'الصف الثالث الثانوي (العلمي)', 'grade 12 scientific'],
  },
  {
    key: 'secondary_3_literary',
    labelAr: 'الصف الثالث الثانوي (الأدبي)',
    labelEn: 'Grade 12 / Third Secondary - Literary',
    aliases: ['الثالث الثانوي الأدبي', 'الصف الثالث الثانوي (الأدبي)', 'grade 12 literary'],
  },
];

function normalize(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[()\[\]{}]/g, ' ')
    .replace(/[ـ]/g, '')
    .replace(/\s+/g, ' ');
}

export function getGradeOption(keyOrLabel?: string | null): YemenGradeOption | undefined {
  if (!keyOrLabel) return undefined;
  const value = normalize(keyOrLabel);
  return YEMEN_GRADE_OPTIONS.find((option) =>
    option.key === keyOrLabel ||
    normalize(option.labelAr) === value ||
    normalize(option.labelEn) === value ||
    option.aliases.some((alias) => normalize(alias) === value)
  );
}

export function getGradeKey(keyOrLabel?: string | null): YemenGradeKey | undefined {
  return getGradeOption(keyOrLabel)?.key;
}

export function getGradeLabelAr(keyOrLabel?: string | null): string {
  return getGradeOption(keyOrLabel)?.labelAr || keyOrLabel || '';
}
