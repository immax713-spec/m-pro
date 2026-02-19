export type AppStep = 'registry' | 'capture' | 'present';

export interface Slide {
  imageUrl: string;
  description: string;
}

export interface CommentSlide {
  imageUrl: string;
  comment: string;
}

export interface SubProgressCategory {
  id: string;
  name: string;
  previous: number;
  current: number;
}

export interface ProgressCategory {
  id:string;
  name: string;
  previous: number; // Renamed from 'plan'
  current: number;  // Renamed from 'fact'
  isOpen?: boolean;
  subItemsOpen?: boolean;
  subItems?: SubProgressCategory[];
}

export interface Observation {
  id: string;
  text: string;
  isActive: boolean;
}

export type StatusLevel = 'critical' | 'high' | 'medium' | 'low' | 'none';

export interface Status {
  text: string;
  level: StatusLevel;
}

export interface Presentation {
  id: string; // Unique identifier for each presentation
  title: string;
  status: Status;
  slides: Slide[];
  commentSlides: CommentSlide[];
  observations: Observation[];
  actualStateNotes: string; // Added for the new modal
  objectInfo: {
    customer: string;
    generalContractor: string;
    contractDate: string;
    contractExtension: string;
    personnel: number;
    aipCompletionDate: string;
    directiveCompletionDate: string;
    contractualCompletionDate: string;
    forecastedCommissioningDate: string;
    penalties: string;
    technicalEconomicIndicators: string;
  };
  monitoringPeriod: {
    start: string;
    end: string;
  };
  progress: ProgressCategory[];
}

export interface SheetInfoEntry {
  label: string;
  value: string | number;
}

export interface SheetProgressChild {
  name: string;
  previous: number;
  current: number;
}

export interface SheetProgressBar {
  name: string;
  previous: number;
  current: number;
  children?: SheetProgressChild[];
}

export interface SheetMonthAggregate {
  month: string;
  manpower: number | null;
  readiness: number | null;
}

export interface SheetPayload {
  info: SheetInfoEntry[];
  progressBars: SheetProgressBar[];
  months: SheetMonthAggregate[];
  period?: {
    start: string; // Дата из mark4, строка 22
    end: string;   // Дата из mark5, строка 22
  };
  availableDates?: string[];
}