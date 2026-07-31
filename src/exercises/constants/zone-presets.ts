/**
 * Product zones for workout recommendations.
 * `zone` matches catalog `category` from GET /exercises/labels.
 * Front sends `zone` + `equipment`; back resolves targets/slots via these presets.
 */

export type RecommendZone =
  | 'back'
  | 'cardio'
  | 'chest'
  | 'lower arms'
  | 'lower legs'
  | 'neck'
  | 'shoulders'
  | 'upper arms'
  | 'upper legs'
  | 'waist';

export type RecommendSlot = {
  role: string;
  targets: string[];
};

export type ZonePreset = {
  zone: RecommendZone;
  category: RecommendZone;
  targets: string[];
  slots: RecommendSlot[];
};

export const ZONE_PRESETS: Record<RecommendZone, ZonePreset> = {
  back: {
    zone: 'back',
    category: 'back',
    targets: ['lats', 'upper back', 'traps'],
    slots: [
      { role: 'vertical_pull', targets: ['lats'] },
      { role: 'horizontal_pull', targets: ['upper back', 'lats'] },
      { role: 'isolation', targets: ['lats', 'upper back'] },
      { role: 'accessory', targets: ['traps', 'upper back'] },
    ],
  },

  cardio: {
    zone: 'cardio',
    category: 'cardio',
    targets: ['cardiovascular system'],
    slots: [
      { role: 'primary', targets: ['cardiovascular system'] },
      { role: 'secondary', targets: ['cardiovascular system'] },
      { role: 'finisher', targets: ['cardiovascular system'] },
      { role: 'optional', targets: ['cardiovascular system'] },
    ],
  },

  chest: {
    zone: 'chest',
    category: 'chest',
    targets: ['pectorals', 'serratus anterior'],
    slots: [
      { role: 'horizontal_press', targets: ['pectorals'] },
      { role: 'incline_or_upper', targets: ['pectorals'] },
      { role: 'fly_isolation', targets: ['pectorals'] },
      { role: 'accessory', targets: ['pectorals', 'serratus anterior'] },
    ],
  },

  'lower arms': {
    zone: 'lower arms',
    category: 'lower arms',
    targets: ['forearms'],
    slots: [
      { role: 'flexion', targets: ['forearms'] },
      { role: 'extension', targets: ['forearms'] },
      { role: 'grip', targets: ['forearms'] },
      { role: 'accessory', targets: ['forearms'] },
    ],
  },

  'lower legs': {
    zone: 'lower legs',
    category: 'lower legs',
    targets: ['calves'],
    slots: [
      { role: 'standing_calf', targets: ['calves'] },
      { role: 'seated_or_variation', targets: ['calves'] },
      { role: 'unilateral', targets: ['calves'] },
      { role: 'accessory', targets: ['calves'] },
    ],
  },

  neck: {
    zone: 'neck',
    category: 'neck',
    targets: ['levator scapulae'],
    slots: [
      { role: 'primary', targets: ['levator scapulae'] },
      { role: 'secondary', targets: ['levator scapulae'] },
      { role: 'mobility', targets: ['levator scapulae'] },
      { role: 'accessory', targets: ['levator scapulae'] },
    ],
  },

  shoulders: {
    zone: 'shoulders',
    category: 'shoulders',
    targets: ['delts', 'traps'],
    slots: [
      { role: 'overhead_press', targets: ['delts'] },
      { role: 'lateral_raise', targets: ['delts'] },
      { role: 'rear_delt', targets: ['delts', 'traps'] },
      { role: 'accessory', targets: ['delts', 'traps'] },
    ],
  },

  'upper arms': {
    zone: 'upper arms',
    category: 'upper arms',
    targets: ['biceps', 'triceps'],
    slots: [
      { role: 'biceps_primary', targets: ['biceps'] },
      { role: 'triceps_primary', targets: ['triceps'] },
      { role: 'biceps_secondary', targets: ['biceps'] },
      { role: 'triceps_secondary', targets: ['triceps'] },
    ],
  },

  'upper legs': {
    zone: 'upper legs',
    category: 'upper legs',
    targets: ['quads', 'hamstrings', 'glutes', 'abductors', 'adductors'],
    slots: [
      { role: 'squat_pattern', targets: ['quads', 'glutes'] },
      { role: 'hinge_pattern', targets: ['hamstrings', 'glutes'] },
      { role: 'unilateral', targets: ['quads', 'glutes', 'hamstrings'] },
      {
        role: 'accessory',
        targets: ['abductors', 'adductors', 'glutes'],
      },
    ],
  },

  waist: {
    zone: 'waist',
    category: 'waist',
    targets: ['abs', 'spine'],
    slots: [
      { role: 'anti_extension', targets: ['abs'] },
      { role: 'flexion', targets: ['abs'] },
      { role: 'rotation_or_lateral', targets: ['abs', 'spine'] },
      { role: 'accessory', targets: ['abs', 'spine'] },
    ],
  },
};

export const RECOMMEND_ZONES = Object.keys(ZONE_PRESETS) as RecommendZone[];

export function getZonePreset(zone: string): ZonePreset | undefined {
  return ZONE_PRESETS[zone as RecommendZone];
}
