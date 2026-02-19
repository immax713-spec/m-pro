import React, { useState, useCallback, useEffect } from 'react';
import { AppStep, Presentation, Observation, SheetPayload, SheetProgressBar } from './types';
import { TOTAL_MAIN_PHOTOS, TOTAL_COMMENTS_PHOTOS, MAIN_PHOTO_PROMPTS, COMMENTS_PHOTO_PROMPTS, GOOGLE_SHEETS_ENDPOINT, buildExtraParams } from './constants';
import PhotoCaptureScreen from './components/PhotoCaptureScreen';
import PresentationScreen from './components/PresentationScreen';
import RegistryScreen from './components/RegistryScreen';

const PRESENTATIONS_STORAGE_KEY = 'presentations-list';

const INFO_LABEL_MAP: Record<string, keyof Presentation['objectInfo'] | 'title'> = {
  'хедер': 'title',
  'заказчик:': 'customer',
  'генподрядчик:': 'generalContractor',
  'дата заключения контракта:': 'contractDate',
  'продление по контракту:': 'contractExtension',
  'срок исполнения по аип:': 'aipCompletionDate',
  'срок исполнения по директивному графику:': 'directiveCompletionDate',
  'срок исполнения по контракту:': 'contractualCompletionDate',
  'прогноз фактического ввода:': 'forecastedCommissioningDate',
  'штрафные санкции/пени, руб.:': 'penalties',
  'тэп (кв.м, п.км):': 'technicalEconomicIndicators',
};

const normalizeLabel = (label: string) => label
  .toLowerCase()
  .replace(/[()]/g, '')
  .replace(/meta\s*[:\-]?/g, '')
  .replace(/\s+/g, ' ')
  .trim();

const formatDateRU = (input: string) => {
  if (!input) return '';
  const tryISO = new Date(input);
  if (!isNaN(tryISO.getTime())) {
    const dd = String(tryISO.getDate()).padStart(2, '0');
    const mm = String(tryISO.getMonth() + 1).padStart(2, '0');
    const yyyy = tryISO.getFullYear();
    return `${dd}.${mm}.${yyyy}`;
  }
  const m = input.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  return m ? input : input;
};

const PROGRESS_CATEGORIES: { keys: string[]; name: string; children?: { keys: string[]; name: string }[] }[] = [
  { keys: ['1_overall_readiness', 'строительная готовность'], name: 'СТРОИТЕЛЬНАЯ ГОТОВНОСТЬ' },
  { keys: ['2_structure', 'конструктив'], name: 'КОНСТРУКТИВ' },
  { keys: ['3_walls_partitions', 'стены и перегородки'], name: 'СТЕНЫ И ПЕРЕГОРОДКИ' },
  { keys: ['4_facades', 'фасады'], name: 'ФАСАДЫ' },
  {
    keys: ['5_finishing_total', 'отделочные работы'],
    name: 'ОТДЕЛОЧНЫЕ РАБОТЫ',
    children: [
      { keys: ['5_1_finishing_prelim', 'черновая отделка'], name: 'Черновая отделка' },
      { keys: ['5_2_finishing_final', 'чистовая отделка'], name: 'Чистовая отделка' },
    ]
  },
  {
    keys: ['6_internal_total', 'внутренние инженерные системы'],
    name: 'ВНУТРЕННИЕ ИНЖЕНЕРНЫЕ СИСТЕМЫ',
    children: [
      { keys: ['6_1_ventilation', 'вентиляция'], name: 'Вентиляция' },
      { keys: ['6_2_electric', 'электрика'], name: 'Электрика' },
      { keys: ['6_3_sks', 'скс'], name: 'СКС' },
      { keys: ['6_4_water', 'сантехника'], name: 'Сантехника' },
    ]
  },
  { keys: ['8_external_networks', 'наружные инженерные сети'], name: 'НАРУЖНЫЕ ИНЖЕНЕРНЫЕ СЕТИ' },
  {
    keys: ['9_landscaping', 'благоустройство'],
    name: 'БЛАГОУСТРОЙСТВО',
    children: [
      { keys: ['9_1_hard_cover', 'твердое покрытие'], name: 'Твердое покрытие' },
      { keys: ['9_2_greening', 'озеленение'], name: 'Озеленение' },
      { keys: ['9_3_maf', 'маф'], name: 'МАФ' },
    ]
  },
];

// 🔥 Вынесенная константа для маппинга ключей наблюдений (используется в двух местах)
const OBS_KEY_TO_ID: Record<string, string> = {
  'obs_01_passport_missing': 'obs1',
  'obs_02_tech_process_violation': 'obs2',
  'obs_03_signal_fence_absent': 'obs3',
  'obs_04_signal_fence_damaged': 'obs4',
  'obs_05_guard_post_absent': 'obs5',
  'obs_06_fire_passages_blocked': 'obs6',
  'obs_07_wheel_wash_absent': 'obs7',
  'obs_08_wheel_wash_not_working': 'obs8',
  'obs_09_site_cover_absent': 'obs9',
  'obs_10_site_cover_damaged_dirty': 'obs10',
  'obs_11_access_roads_damaged': 'obs11',
  'obs_12_dirt_tracking_from_site': 'obs12',
  'obs_13_trash_on_site': 'obs13',
  'obs_14_storage_rules_violated': 'obs14',
};

const parseJsonOrJsonp = async (res: Response) => {
  const txt = await res.text();
  console.log('[parseJsonOrJsonp] RAW TEXT:', txt.substring(0, 500)); // Log first 500 chars
  try {
    return JSON.parse(txt);
  } catch (e) {
    const text = txt;
    const m = text.match(/^[\s\S]*?\((\{[\s\S]*\})\)[\s\S]*$/);
    if (m && m[1]) {
      try { return JSON.parse(m[1]); } catch (e) { throw e; }
    }
    throw new Error('Invalid JSON/JSONP response');
  }
};

const initialObservations: Observation[] = [
  { id: 'obs1', text: 'Отсутствует/поврежден паспорт объекта', isActive: false },
  { id: 'obs2', text: 'Нарушение технологии производства работ на строительной площадке', isActive: false },
  { id: 'obs3', text: 'Отсутствует сигнальное (защитное) ограждение', isActive: false },
  { id: 'obs4', text: 'Сигнальное (защитное) ограждение повреждено', isActive: false },
  { id: 'obs5', text: 'Отсутствует пост охраны', isActive: false },
  { id: 'obs6', text: 'Загораживание пожарных проходов/проездов на строительной площадке (объекта)', isActive: false },
  { id: 'obs7', text: 'Отсутствует пункт мойки колес', isActive: false },
  { id: 'obs8', text: 'Пункт мойки колес не функционирует', isActive: false },
  { id: 'obs9', text: 'Отсутствует покрытие строительной площадки', isActive: false },
  { id: 'obs10', text: 'Покрытие строительной площадки повреждено/сильно загрязнено', isActive: false },
  { id: 'obs11', text: 'Имеются повреждения покрытия подъездных путей', isActive: false },
  { id: 'obs12', text: 'Осуществляется вынос грязи с территории строительной площадки', isActive: false },
  { id: 'obs13', text: 'Мусор на территории строительной площадки', isActive: false },
  { id: 'obs14', text: 'Нарушены правила хранения/складирования', isActive: false },
  ...[
    'Несоответствие типа временного ограждения',
    'Наличие загрязнений временного ограждения',
    'Нарушение целостности ограждения производственных территорий',
    'Наличие механических повреждений периметрального ограждения',
    'Несоответствие геометрических параметров временного ограждения',
    'Наличие наклеек/ объявлений/ вандальных надписей',
    'Отсутствие сигнального освещения «гирлянда»',
    'Отсутствие/ износ окраски ограждения',
    'Отсутствие сплошного защитного козырька мест прохода людей'
  ].map(t => ({ id: ('perimeter-' + t.toLowerCase().replace(/\s+/g, '_')), text: t, isActive: false } as Observation)),
  ...[
    'Нарушение санитарно-эпидемиологических норм и правил',
    'Нарушены требования к размещению временных коммуникаций/ отсутствует освещение бытового городка',
    'Санитарно-бытовые помещения отсутствуют',
    'Отсутствуют средства первичной медицинской помощи (аптечки)',
    'Организованы места проживания в бытовом городке/на объекте строительства',
    'Отсутствуют информационные знаки',
    'Отсутствуют первичные средства пожаротушения',
    'Бытовые помещения должны иметь надлежащий вид',
    'Отсутствует безопасный проход/покрытие в бытовом помещении',
    'Нарушены требования к размещению мобильных туалетных кабин',
    'Мусор на территории бытового городка',
    'Нарушены правила хранения и складирования'
  ].map(t => ({ id: ('household-' + t.toLowerCase().replace(/\s+/g, '_')), text: t, isActive: false } as Observation)),
];

const createNewPresentation = (): Presentation => ({
  id: `pres_${Date.now()}`,
  title: 'Школа на 825 мест, р-н Бирюлево Восточное, ул. 6-я Радиальная, влд. 7, участок 20',
  status: { text: 'Срыв срока', level: 'critical' },
  slides: Array(TOTAL_MAIN_PHOTOS).fill({ imageUrl: '', description: '' }),
  commentSlides: Array(TOTAL_COMMENTS_PHOTOS).fill({ imageUrl: '', comment: '' }),
  observations: JSON.parse(JSON.stringify(initialObservations)), // Deep copy
  actualStateNotes: 'Здесь можно будет добавить подробное описание текущего состояния объекта, любые важные заметки или наблюдения, которые не вошли в стандартные категории.',
  objectInfo: {
    customer: 'АНО «РСИ»',
    generalContractor: 'ООО «СК Альтаир»',
    contractDate: '06.05.2021',
    contractExtension: '3 (от 04.10.2024)',
    personnel: 0,
    aipCompletionDate: '2026',
    directiveCompletionDate: 'Март 2026',
    contractualCompletionDate: 'Июнь 2025',
    forecastedCommissioningDate: 'Апрель 2026',
    penalties: '9 428 786,28',
    technicalEconomicIndicators: '6 089,73'
  },
  monitoringPeriod: {
    start: '01.07.2024',
    end: '01.08.2024',
  },
  progress: [
    { id: 'overall', name: 'СТРОИТЕЛЬНАЯ ГОТОВНОСТЬ', previous: 80, current: 87, isOpen: false },
    { id: 'structure', name: 'КОНСТРУКТИВ', previous: 74, current: 90, isOpen: false },
    { id: 'walls', name: 'СТЕНЫ И ПЕРЕГОРОДКИ', previous: 95, current: 100, isOpen: false },
    { id: 'facades', name: 'ФАСАДЫ', previous: 45, current: 60, isOpen: false },
    {
      id: 'finishing',
      name: 'ОТДЕЛОЧНЫЕ РАБОТЫ',
      previous: 22,
      current: 30,
      isOpen: false,
      subItemsOpen: false,
      subItems: [
        { id: 'finishing-prelim', name: 'Черновые работы', previous: 50, current: 60 },
        { id: 'finishing-final', name: 'Чистовые работы', previous: 10, current: 15 },
      ]
    },
    {
      id: 'internalSystems',
      name: 'ВНУТРЕННИЕ ИНЖЕНЕРНЫЕ СИСТЕМЫ',
      previous: 10,
      current: 15,
      isOpen: false,
      subItemsOpen: false,
      subItems: [
        { id: 'internal-heating', name: 'Вентиляция', previous: 15, current: 20 },
        { id: 'internal-ventilation', name: 'Водоснабжение', previous: 5, current: 10 },
        { id: 'internal-electric', name: 'СКС/Электроснабжение', previous: 10, current: 15 },
      ]
    },
    { id: 'externalSystems', name: 'НАРУЖНЫЕ ИНЖЕНЕРНЫЕ СИСТЕМЫ', previous: 30, current: 40, isOpen: false },
    { id: 'landscaping', name: 'БЛАГОУСТРОЙСТВО', previous: 5, current: 10, isOpen: false }
  ]
});


const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('registry');
  const [presentations, setPresentations] = useState<Presentation[]>(() => {
    const savedData = localStorage.getItem(PRESENTATIONS_STORAGE_KEY);
    if (savedData) {
      return JSON.parse(savedData);
    }
    // If no data, create one example presentation
    return [createNewPresentation()];
  });
  const [activePresentationId, setActivePresentationId] = useState<string | null>(null);
  const [captureStage, setCaptureStage] = useState<'main' | 'comments'>('main');
  const [currentPhoto, setCurrentPhoto] = useState(1);
  const [sheetData, setSheetData] = useState<SheetPayload | null>(null);
  const [sheetStatus, setSheetStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [photosStatus, setPhotosStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const [targetObjectId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const oid = params.get('object_id');
    return oid && oid.trim() ? oid.trim() : null;
  });

  useEffect(() => {
    localStorage.setItem(PRESENTATIONS_STORAGE_KEY, JSON.stringify(presentations));
  }, [presentations]);

  const applySheetPayload = useCallback((payload: SheetPayload) => {
    const targetId = targetObjectId ? `obj-${targetObjectId}` : (activePresentationId || presentations[0]?.id);
    setPresentations(prev => prev.map((presentation) => {
      if (!targetId || presentation.id !== targetId) return presentation;

      const patchedObjectInfo = { ...presentation.objectInfo };
      let newTitle = presentation.title;

      payload.info.forEach(entry => {
        const key = INFO_LABEL_MAP[normalizeLabel(entry.label)];
        if (!key) return;
        if (key === 'title') {
          newTitle = String(entry.value);
        } else {
          const value = typeof entry.value === 'number' ? entry.value.toString() : String(entry.value ?? '');
          (patchedObjectInfo as any)[key] = value;
        }
      });

      const getInfoVal = (labels: string[]) => {
        const found = payload.info.find(e => labels.includes(normalizeLabel(e.label)));
        return found ? String(found.value ?? '') : '';
      };
      const addr = getInfoVal(['adress', 'address', 'адрес']);
      if (addr) newTitle = addr;

      const personnelStr = getInfoVal(['personnel', 'персонал', 'численность персонала']);
      const personnelFromInfo = personnelStr ? parseInt(personnelStr.replace(/\D+/g, ''), 10) : NaN;

      const updatedProgress = (payload.progressBars || []).map((item, idx) => ({
        id: `sheet-${idx}`,
        name: item.name,
        previous: Math.round(item.previous ?? 0),
        current: Math.round(item.current ?? 0),
        isOpen: false,
        subItemsOpen: false,
        subItems: item.children?.map((child, childIdx) => ({
          id: `sheet-${idx}-${childIdx}`,
          name: child.name,
          previous: Math.round(child.previous ?? 0),
          current: Math.round(child.current ?? 0),
        })),
      }));

      const latestManpower = payload.months
        .slice()
        .reverse()
        .find(month => typeof month.manpower === 'number' && month.manpower !== null)?.manpower;

      let monitoringPeriod = presentation.monitoringPeriod;
      if (payload.period) {
        monitoringPeriod = {
          start: formatDateRU(payload.period.start || presentation.monitoringPeriod.start),
          end: formatDateRU(payload.period.end || presentation.monitoringPeriod.end),
        };
      } else {
        const monitoringDates = payload.info
          .filter(e => ['monitoring_date', 'дата мониторинга'].includes(normalizeLabel(e.label)))
          .map(e => String(e.value))
          .filter(v => v && v.trim());
        const uniqueDates = Array.from(new Set(monitoringDates)).slice(-2);
        if (uniqueDates.length === 2) {
          monitoringPeriod = { start: formatDateRU(uniqueDates[0]), end: formatDateRU(uniqueDates[1]) };
        } else if ((payload.months || []).length >= 2) {
          const m = payload.months.slice(-2);
          monitoringPeriod = {
            start: formatDateRU(m[0].month),
            end: formatDateRU(m[1].month),
          };
        }
      }



      const isTruthy = (v: any) => {
        if (v === null || v === undefined) return false;
        if (typeof v === 'number') return v !== 0;
        const s = String(v).trim().toLowerCase();
        return ['1', 'true', 'да', 'yes', 'y', 'активно', 'on'].includes(s);
      };
      const obsActiveMap: Record<string, boolean> = {};
      payload.info.forEach(entry => {
        const key = normalizeLabel(String(entry.label));
        const id = OBS_KEY_TO_ID[key];
        if (id) {
          obsActiveMap[id] = isTruthy(entry.value);
        }
      });
      const observationsUpdated = presentation.observations.map(o => {
        if (obsActiveMap[o.id] !== undefined) return { ...o, isActive: !!obsActiveMap[o.id] };
        return o;
      });
      const observationsMerged = mergeObservations(initialObservations, observationsUpdated);

      const labelVal = (labels: string[]) => {
        const found = payload.info.find(e => labels.includes(normalizeLabel(String(e.label))));
        return found ? String(found.value ?? '') : '';
      };
      const slidesUpdated = [...presentation.slides];
      for (let i = 0; i < slidesUpdated.length; i++) {
        const idx = i + 1;
        const desc = labelVal([
          `photo_description_${idx}`,
          `description_${idx}`,
          `описание_${idx}`,
          `описание_фото_${idx}`
        ]);
        if (desc) slidesUpdated[i] = { ...slidesUpdated[i], description: desc };
      }
      const commentSlidesUpdated = [...presentation.commentSlides];
      for (let i = 0; i < commentSlidesUpdated.length; i++) {
        const idx = i + 1;
        const com = labelVal([
          `site_comment_${idx}`,
          `comment_site_${idx}`,
          `photo_comment_site_${idx}`,
          `site_photo_comment_${idx}`,
          `комментарий_${idx}`,
          `комментарий_по_площадке_${idx}`
        ]);
        if (com) commentSlidesUpdated[i] = { ...commentSlidesUpdated[i], comment: com };
      }

      return {
        ...presentation,
        title: newTitle,
        objectInfo: {
          ...patchedObjectInfo,
          personnel: Number.isFinite(personnelFromInfo) ? Math.floor(personnelFromInfo) : (latestManpower ? Math.round(latestManpower) : presentation.objectInfo.personnel),
        },
        progress: updatedProgress,
        monitoringPeriod: monitoringPeriod,
        slides: slidesUpdated,
        commentSlides: commentSlidesUpdated,
        observations: observationsMerged,
      };
    }));
  }, [targetObjectId, activePresentationId, presentations]);

  const fetchPhotosForOid = async (oid: string) => {
    // Clear photos immediately to show loading state
    const gid = targetObjectId ? `obj-${targetObjectId}` : (activePresentationId || presentations[0]?.id);
    if (gid) {
      setPresentations(prev => prev.map(p => {
        if (p.id !== gid) return p;
        const slides = p.slides.map(s => ({ ...s, imageUrl: '' }));
        const commentSlides = p.commentSlides.map(s => ({ ...s, imageUrl: '' }));
        return { ...p, slides, commentSlides };
      }));
    }
    setPhotosStatus('loading');
    try {
      const ps = new URLSearchParams(window.location.search);
      const overridePhoto = ps.get('photo_date');
      const overrideEnd = ps.get('period_end');
      const effectiveEnd = (overridePhoto || overrideEnd || sheetData?.period?.end || activePresentation?.monitoringPeriod?.end || '').trim();
      const ruDate = (() => {
        if (!effectiveEnd) return '';
        // Check for YYYY-MM-DD format first (from URL params)
        const isoMatch = effectiveEnd.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
        if (isoMatch) return `${isoMatch[3].padStart(2, '0')}.${isoMatch[2].padStart(2, '0')}.${isoMatch[1]}`;
        // Check for DD.MM.YYYY format
        const m = effectiveEnd.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
        if (m) return `${m[1].padStart(2, '0')}.${m[2].padStart(2, '0')}.${m[3]}`;
        // Fallback to Date parsing
        const d = new Date(effectiveEnd);
        if (!isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0');
          const mm = String(d.getMonth() + 1).padStart(2, '0');
          const yyyy = d.getFullYear();
          return `${dd}.${mm}.${yyyy}`;
        }
        return '';
      })();

      const tryFetch = async (action: 'getPhotosLatest' | 'getPhotos', withDate: boolean) => {
        // Force add sheet_id to ensure we query the correct spreadsheet
        const params = new URLSearchParams({
          action,
          object_id: oid,
          sheet_id: '1B9Joj6DFhJM9DMmp8JHQpF66JSii0WPSdKZIUPvZGko'
        });
        if (withDate && ruDate) params.set('monitoring_date', ruDate);
        console.log(`[fetchPhotos] action=${action}, withDate=${withDate}, ruDate="${ruDate}", effectiveEnd="${effectiveEnd}", URL params:`, params.toString());
        const pr = await fetch(`${GOOGLE_SHEETS_ENDPOINT}?${params.toString()}${buildExtraParams()}`, { method: 'GET', mode: 'cors', cache: 'no-store', redirect: 'follow' });
        return parseJsonOrJsonp(pr);
      };

      let prj: any = null;
      if (ruDate) {
        prj = await tryFetch('getPhotos', true);
        // Строгая фильтрация по выбранной дате: без откатов на последние фото
      } else {
        prj = await tryFetch('getPhotosLatest', false);
        if (!(prj && prj.success && prj.photos && Object.keys(prj.photos).length)) {
          prj = await tryFetch('getPhotos', false);
        }
      }

      const photos: Record<string, { seq: string; url: string; comment?: string; obs?: string[] }[]> = (prj && prj.success && prj.photos) ? prj.photos : {};
      const uniqByUrl = (arr: { url: string }[]) => {
        const seen = new Set<string>();
        const out: any[] = [];
        for (const it of arr) {
          const u = String(it.url || '').trim();
          if (!u) continue;
          if (seen.has(u)) continue;
          seen.add(u);
          out.push(it);
        }
        return out;
      };
      const general = uniqByUrl((photos['Общий фотоотчет'] || photos['general'] || [])).slice(0, TOTAL_MAIN_PHOTOS);
      const site = uniqByUrl((
        photos['Оценка строительной площадки'] ||
        photos['Замечания по строительной площадке'] ||
        photos['site'] ||
        []
      )).slice(0, TOTAL_COMMENTS_PHOTOS);
      const perimeter = uniqByUrl((photos['Оценка периметрального ограждения'] || []));
      const household = uniqByUrl((photos['Оценка бытовых помещений'] || []));
      const gid = targetObjectId ? `obj-${targetObjectId}` : (activePresentationId || presentations[0]?.id);
      if (gid) {
        setPresentations(prev => prev.map(p => {
          // Debug logging for state update
          if (p.id == gid) {
            console.log(`[fetchPhotos] Updating presentation ${p.id} with ${general.length} photos`);
          }
          if (p.id !== gid) return p;
          const slides = [...p.slides];
          // Bypass proxy and use direct URL. Browser handles redirects and auth cookies better.
          // Use thumbnail URL which is more friendly for embedding
          const proxyImage = (u: string) => {
            const m = u.match(/id=([a-zA-Z0-9_-]+)/);
            if (m && m[1]) return `https://drive.google.com/thumbnail?id=${m[1]}&sz=w2000`;
            return u;
          };
          general.forEach((ph, i) => {
            console.log(`[fetchPhotos] Setting slide ${i} url to: ${ph.url}`);
            slides[i] = { ...slides[i], imageUrl: proxyImage(ph.url), description: ph.comment || slides[i]?.description || '' };
          });
          for (let i = general.length; i < TOTAL_MAIN_PHOTOS; i++) { slides[i] = { ...slides[i], imageUrl: '' }; }
          const commentSlides = [...p.commentSlides];
          site.forEach((ph, i) => { commentSlides[i] = { ...commentSlides[i], imageUrl: proxyImage(ph.url), comment: ph.comment || commentSlides[i]?.comment || '' }; });
          for (let i = site.length; i < TOTAL_COMMENTS_PHOTOS; i++) { commentSlides[i] = { ...commentSlides[i], imageUrl: '' }; }

          const activeFromPhotos: Record<string, boolean> = {};
          const allForObs = [...site, ...perimeter, ...household];
          allForObs.forEach(ph => {
            (ph.obs || []).forEach(k => {
              const key = (k || '').toLowerCase();
              const mapped = OBS_KEY_TO_ID[key] || k;
              if (mapped) activeFromPhotos[String(mapped)] = true;
            });
          });
          const observations = p.observations.map(o => ({ ...o, isActive: !!activeFromPhotos[o.id] }));
          return { ...p, slides, commentSlides, observations };
        }));
      }
      console.log('getPhotos result:', photos);
      setPhotosStatus('idle');
    } catch (e) {
      console.warn('getPhotos failed', e);
      setPhotosStatus('error');
    }
  };

  const fetchSheetData = useCallback(() => {
    const controller = new AbortController();
    setSheetStatus('loading');
    const timestamp = Date.now();

    const oid = targetObjectId || activePresentationId?.replace(/^obj-/, '') || '';
    const urlHist = `${GOOGLE_SHEETS_ENDPOINT}?action=getObjectHistory&object_id=${encodeURIComponent(oid)}&target=database&limit=12&t=${timestamp}${buildExtraParams()}`;

    fetch(urlHist, {
      method: 'GET',
      mode: 'cors',
      cache: 'no-store',
      signal: controller.signal,
      redirect: 'follow'
    })
      .then(async (response) => {
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const resp = await parseJsonOrJsonp(response);
        const rows: any[] = Array.isArray(resp?.rows) ? resp.rows : [];
        if (!rows.length) throw new Error('No history data for object');

        let latest = rows[rows.length - 1];
        const normalizeDateKey = (s: string) => {
          const str = String(s || '').trim();
          const m = str.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
          if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
          const d = new Date(str);
          if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
          return str || '';
        };
        const latestKey = normalizeDateKey(latest['monitoring_date']);
        const dateRowMap = new Map<string, any>();
        rows.forEach(r => {
          const k = normalizeDateKey(r['monitoring_date']);
          if (k) dateRowMap.set(k, r);
        });
        let previous: any = null;
        for (let i = rows.length - 2; i >= 0; i--) {
          const key = normalizeDateKey(rows[i]['monitoring_date']);
          if (key && key !== latestKey) { previous = rows[i]; break; }
        }
        // Ручное переопределение периода через URL
        const ps = new URLSearchParams(window.location.search);
        const overrideStart = ps.get('period_start');
        const overrideEnd = ps.get('period_end');
        if (overrideEnd || overrideStart) {
          const endKey = overrideEnd ? normalizeDateKey(overrideEnd) : latestKey;
          const startKey = overrideStart ? normalizeDateKey(overrideStart) : (previous ? normalizeDateKey(previous['monitoring_date']) : latestKey);
          const endRow = dateRowMap.get(endKey) || latest;
          const startRow = dateRowMap.get(startKey) || previous || latest;
          latest = endRow;
          previous = startRow;
        }

        const info = Object.entries(latest).map(([label, value]) => ({ label: String(label), value: value as any }));

        const progressBars = PROGRESS_CATEGORIES.reduce((acc, cat) => {
          const findVal = (row: any, keys: string[]) => {
            for (const k of keys) {
              if (typeof row[k] === 'number') return row[k];
            }
            return undefined;
          };
          const curr = findVal(latest, cat.keys);
          const prev = previous ? findVal(previous, cat.keys) : undefined;
          if (typeof curr === 'number') {
            const bar: any = { name: cat.name, previous: Number(prev ?? curr) || 0, current: Number(curr) || 0 };
            if (cat.children && cat.children.length) {
              bar.children = cat.children.map(ch => {
                const cCurr = findVal(latest, ch.keys);
                const cPrev = previous ? findVal(previous, ch.keys) : undefined;
                return {
                  name: ch.name,
                  previous: Number(cPrev ?? cCurr ?? 0) || 0,
                  current: Number(cCurr ?? 0) || 0,
                };
              });
            }
            acc.push(bar);
          }
          return acc;
        }, [] as any[]);

        const parseMonthKey = (s: string) => {
          const m = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})/);
          if (m) return `${m[3]}-${m[2].padStart(2, '0')}`;
          const d = new Date(s);
          if (!isNaN(d.getTime())) return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          return '';
        };

        const monthsMap: Record<string, { manpowerVals: number[]; readinessVals: number[] }> = {};
        rows.forEach(r => {
          const dateStr = String(r['monitoring_date'] || '');
          const mk = parseMonthKey(dateStr);
          if (!mk) return;
          if (!monthsMap[mk]) monthsMap[mk] = { manpowerVals: [], readinessVals: [] };
          const manpower = Number(String(r['personnel'] || '').replace(/[^\d.]+/g, '').trim());
          if (isFinite(manpower)) monthsMap[mk].manpowerVals.push(manpower);
          let readiness: any = undefined;
          for (const k of ['1_overall_readiness', '1']) {
            if (typeof r[k] === 'number') { readiness = r[k]; break; }
          }
          if (typeof readiness === 'number') monthsMap[mk].readinessVals.push(readiness);
        });

        const monthKeys = Object.keys(monthsMap).sort();
        const months = monthKeys.slice(-5).map(k => {
          const m = monthsMap[k];
          const manpower = m.manpowerVals.length ? Math.floor(m.manpowerVals.reduce((a, b) => a + b, 0) / m.manpowerVals.length) : null;
          const readiness = m.readinessVals.length ? Math.max(...m.readinessVals) : null;
          return { month: k, manpower, readiness };
        });

        const period = latest['monitoring_date']
          ? { start: String(previous ? previous['monitoring_date'] : latest['monitoring_date']), end: String(latest['monitoring_date']) }
          : undefined;

        const availableDates = Array.from(new Set(rows.map(r => String(r['monitoring_date'] || '').trim()).filter(Boolean)));

        const payload: SheetPayload = { info, progressBars, months, period, availableDates };

        setSheetData(payload);
        applySheetPayload(payload);
        setSheetStatus('idle');
        setLastUpdateTime(timestamp);
        fetchPhotosForOid(oid);
      })
      .catch(error => {
        if (error.name === 'AbortError') return;
        // Force add sheet_id to ensure we query the correct spreadsheet
        const SHEET_ID = '1B9Joj6DFhJM9DMmp8JHQpF66JSii0WPSdKZIUPvZGko';
        const urlOne = `${GOOGLE_SHEETS_ENDPOINT}?action=getLatestChecklist&object_id=${encodeURIComponent(oid)}&target=database&t=${timestamp}&sheet_id=${SHEET_ID}${buildExtraParams()}`;
        fetch(urlOne, {
          method: 'GET',
          mode: 'cors',
          cache: 'no-store',
          signal: controller.signal,
          redirect: 'follow'
        })
          .then(async (response) => {
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const resp = await parseJsonOrJsonp(response);
            const row = resp?.row || null;
            if (!row) throw new Error('No data for object');

            const info = Object.entries(row).map(([label, value]) => ({ label: String(label), value: value as any }));
            const progressBars = PROGRESS_CATEGORIES.reduce((acc, cat) => {
              const findVal = (rowAny: any, keys: string[]) => {
                for (const k of keys) {
                  if (typeof rowAny[k] === 'number') return rowAny[k];
                }
                return undefined;
              };
              const curr = findVal(row, cat.keys);
              if (typeof curr === 'number') {
                const bar: any = { name: cat.name, previous: Number(curr) || 0, current: Number(curr) || 0 };
                if (cat.children && cat.children.length) {
                  bar.children = cat.children.map(ch => {
                    const cCurr = findVal(row, ch.keys);
                    return {
                      name: ch.name,
                      previous: Number(cCurr ?? 0) || 0,
                      current: Number(cCurr ?? 0) || 0,
                    };
                  });
                }
                acc.push(bar);
              }
              return acc;
            }, [] as any[]);
            const months: SheetPayload['months'] = [];
            const period = row['monitoring_date'] ? { start: String(row['monitoring_date']), end: String(row['monitoring_date']) } : undefined;

            const payload: SheetPayload = { info, progressBars, months, period, availableDates: row['monitoring_date'] ? [String(row['monitoring_date'])] : [] };
            setSheetData(payload);
            applySheetPayload(payload);
            setSheetStatus('idle');
            setLastUpdateTime(timestamp);
            fetchPhotosForOid(oid);
          })
          .catch(err2 => {
            console.error('Checklist fetch error:', error, 'Fallback error:', err2);
            const emptyPayload: SheetPayload = { info: [], progressBars: [], months: [], period: undefined, availableDates: [] };
            setSheetData(emptyPayload);
            applySheetPayload(emptyPayload);
            setSheetStatus('idle');
          });
      });

    return controller;
  }, [applySheetPayload, targetObjectId, activePresentationId]);

  // Инициализация без автообновления; обновление только по кнопке
  useEffect(() => {
    if (targetObjectId) {
      const id = `obj-${targetObjectId}`;
      const base = createNewPresentation();
      const newPres: Presentation = { ...base, id, title: `Объект ${targetObjectId}` };
      setPresentations(prev => prev.some(p => p.id === id) ? prev : [...prev, newPres]);
      setActivePresentationId(id);
      setStep('present');
    }
  }, [targetObjectId]);

  const activePresentation = presentations.find(p => p.id === activePresentationId) || null;

  const handleStartNew = useCallback(() => {
    const newPresentation = createNewPresentation();
    setPresentations(prev => [...prev, newPresentation]);
    setActivePresentationId(newPresentation.id);
    setCurrentPhoto(1);
    setCaptureStage('main');
    setStep('capture');
  }, []);

  const handleSelectPresentation = useCallback((id: string) => {
    setActivePresentationId(id);
    setStep('present');
  }, []);

  const handleReturnToRegistry = useCallback(() => {
    setActivePresentationId(null);
    setStep('registry');
  }, []);

  const handlePhotoUpload = (dataUrl: string) => {
    if (!activePresentationId) return;

    const updatePresentation = (field: 'slides' | 'commentSlides', newArray: any[]) => {
      setPresentations(prev => prev.map(p =>
        p.id === activePresentationId ? { ...p, [field]: newArray } : p
      ));
    };

    if (captureStage === 'main') {
      const newSlides = [...(activePresentation?.slides || [])];
      const photoIndex = currentPhoto - 1;
      newSlides[photoIndex] = { ...newSlides[photoIndex], imageUrl: dataUrl };
      updatePresentation('slides', newSlides);

      if (currentPhoto < TOTAL_MAIN_PHOTOS) {
        setCurrentPhoto(currentPhoto + 1);
      } else {
        setCaptureStage('comments');
        setCurrentPhoto(1);
      }
    } else { // 'comments'
      const newCommentSlides = [...(activePresentation?.commentSlides || [])];
      const photoIndex = currentPhoto - 1;
      newCommentSlides[photoIndex] = { ...newCommentSlides[photoIndex], imageUrl: dataUrl };
      updatePresentation('commentSlides', newCommentSlides);

      if (currentPhoto < TOTAL_COMMENTS_PHOTOS) {
        setCurrentPhoto(currentPhoto + 1);
      } else {
        setStep('present');
      }
    }
  };

  const handleSkip = useCallback(() => {
    if (captureStage === 'main') {
      if (currentPhoto < TOTAL_MAIN_PHOTOS) {
        setCurrentPhoto(currentPhoto + 1);
      } else {
        setCaptureStage('comments');
        setCurrentPhoto(1);
      }
    } else { // 'comments'
      if (currentPhoto < TOTAL_COMMENTS_PHOTOS) {
        setCurrentPhoto(currentPhoto + 1);
      } else {
        setStep('present');
      }
    }
  }, [captureStage, currentPhoto]);

  const handleUpdate = useCallback((updatedPresentation: Presentation) => {
    if (!activePresentationId) return;
    setPresentations(prev => prev.map(p => p.id === activePresentationId ? updatedPresentation : p));
  }, [activePresentationId]);

  const handleDeletePresentation = useCallback((id: string) => {
    setPresentations(prev => prev.filter(p => p.id !== id));
    if (activePresentationId === id) {
      setActivePresentationId(null);
      setStep('registry');
    }
  }, [activePresentationId]);

  const renderStep = () => {
    switch (step) {
      case 'capture': {
        const isMainStage = captureStage === 'main';
        const prompts = isMainStage ? MAIN_PHOTO_PROMPTS : COMMENTS_PHOTO_PROMPTS;
        const totalSteps = isMainStage ? TOTAL_MAIN_PHOTOS : TOTAL_COMMENTS_PHOTOS;
        return (
          <PhotoCaptureScreen
            currentStep={currentPhoto}
            totalSteps={totalSteps}
            prompts={prompts}
            onPhotoUpload={handlePhotoUpload}
            onSkip={handleSkip}
          />
        );
      }
      case 'present':
        if (activePresentation) {
          return (
            <PresentationScreen
              presentation={activePresentation}
              sheetData={sheetData}
              sheetStatus={sheetStatus}
              photosStatus={photosStatus}
              onUpdate={handleUpdate}
              onReturnToRegistry={handleReturnToRegistry}
              onRefreshData={fetchSheetData}
              onDelete={handleDeletePresentation}
              onReloadPhotos={() => {
                const oid = targetObjectId || activePresentationId?.replace(/^obj-/, '') || '';
                if (oid) fetchPhotosForOid(oid);
              }}
            />
          );
        }
        // Fallback to registry if no active presentation
        handleReturnToRegistry();
        return null;

      case 'registry':
      default:
        return (
          <RegistryScreen
            presentations={presentations}
            onStartNew={handleStartNew}
            onSelect={handleSelectPresentation}
            onDelete={handleDeletePresentation}
          />
        );
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-0 sm:p-4">
      <div className="w-full max-w-[90rem] mx-auto">
        {renderStep()}
      </div>
    </div>
  );
};

export default App;
const mergeObservations = (catalog: Observation[], current: Observation[]): Observation[] => {
  const byId: Record<string, Observation> = {};
  current.forEach(o => { byId[o.id] = o; });
  const out: Observation[] = catalog.map(base => {
    const cur = byId[base.id];
    if (cur) return { ...cur, text: base.text };
    return { ...base };
  });
  return out;
};
