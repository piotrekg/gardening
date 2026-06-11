import { useTranslation } from 'react-i18next';

/** Keys ending in `_pl`/`_en` that the bilingual picker can read off an object. */
type BilingualBase<T> = {
  [K in keyof T & string]: K extends `${infer B}_pl`
    ? `${B}_en` extends keyof T
      ? B
      : never
    : never;
}[keyof T & string];

/** The English/Polish field pair for a given base on object T. */
type PairOf<T, B extends string> = T extends Record<`${B}_pl`, infer P>
  ? T extends Record<`${B}_en`, infer E>
    ? P & E
    : never
  : never;

export interface Bilingual {
  /** Return the right of two pre-resolved values by the current UI language. */
  pick: <V>(pl: V, en: V) => V;
  /** Read obj[`${base}_en`] or obj[`${base}_pl`] by the current UI language. */
  pickField: <T, B extends BilingualBase<T>>(obj: T, base: B) => PairOf<T, B>;
}

function isEnglish(language: string): boolean {
  return language.startsWith('en');
}

/** Reactive bilingual content picker bound to the current UI language. */
export function useBilingual(): Bilingual {
  const { i18n } = useTranslation();
  const en = isEnglish(i18n.language);
  return {
    pick: <V>(pl: V, enValue: V): V => (en ? enValue : pl),
    pickField: <T, B extends BilingualBase<T>>(obj: T, base: B): PairOf<T, B> => {
      const record = obj as Record<string, unknown>;
      return record[`${base}_${en ? 'en' : 'pl'}`] as PairOf<T, B>;
    },
  };
}
