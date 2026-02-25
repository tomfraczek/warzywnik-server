export type GeoLang = 'pl' | 'en';

export type GeoSearchItemDto = {
  placeId: string;
  label: string;
  lat: number;
  lon: number;
};

export type GeoSearchResponseDto = GeoSearchItemDto[];

export type GeoReverseResponseDto = {
  label: string;
};
