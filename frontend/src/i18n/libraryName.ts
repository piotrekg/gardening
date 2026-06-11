import { useTranslation } from 'react-i18next';

/** Minimal shape of a plant-library object that carries localized names. */
export interface LibraryNames {
  common_name_pl: string;
  common_name_en: string;
}

/** Display name of a library plant for the given UI language. */
export function getLibraryPlantName(plant: LibraryNames, language: string): string {
  return language.startsWith('en') ? plant.common_name_en : plant.common_name_pl;
}

/** The "other language" name, useful as a secondary line under the display name. */
export function getLibraryPlantAltName(plant: LibraryNames, language: string): string {
  return language.startsWith('en') ? plant.common_name_pl : plant.common_name_en;
}

/** Reactive helper returning a picker bound to the current UI language. */
export function useLibraryPlantName(): {
  name: (plant: LibraryNames) => string;
  altName: (plant: LibraryNames) => string;
} {
  const { i18n } = useTranslation();
  return {
    name: (plant) => getLibraryPlantName(plant, i18n.language),
    altName: (plant) => getLibraryPlantAltName(plant, i18n.language),
  };
}
