export type Slug =
  | 'abs'
  | 'adductors'
  | 'ankles'
  | 'biceps'
  | 'calves'
  | 'chest'
  | 'deltoids'
  | 'feet'
  | 'forearm'
  | 'gluteal'
  | 'hamstring'
  | 'hands'
  | 'hair'
  | 'head'
  | 'knees'
  | 'lower-back'
  | 'neck'
  | 'obliques'
  | 'quadriceps'
  | 'tibialis'
  | 'trapezius'
  | 'triceps'
  | 'upper-back'
  | 'abductors';

export interface BodyPart {
  slug: Slug;
  color?: string;
  path: {
    common?: string[];
    left?: string[];
    right?: string[];
  };
}

export interface ExtendedBodyPart extends BodyPart {
  color?: string;
  intensity?: number;
  side?: 'left' | 'right';
  styles?: {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  };
}
