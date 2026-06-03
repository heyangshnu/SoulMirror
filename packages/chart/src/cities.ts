/** 常见城市经度（东经），用于真太阳时修正。未命中默认 120°（东八区标准子午线） */
export const CITY_LONGITUDE: Record<string, number> = {
  北京: 116.4,
  上海: 121.5,
  广州: 113.3,
  深圳: 114.1,
  杭州: 120.2,
  成都: 104.1,
  重庆: 106.5,
  武汉: 114.3,
  西安: 108.9,
  南京: 118.8,
  天津: 117.2,
  苏州: 120.6,
  郑州: 113.6,
  长沙: 112.9,
  青岛: 120.4,
  济南: 117.0,
  山东: 117.0,
  沈阳: 123.4,
  大连: 121.6,
  厦门: 118.1,
  福州: 119.3,
  昆明: 102.7,
  哈尔滨: 126.6,
  长春: 125.3,
  合肥: 117.3,
  南昌: 115.9,
  南宁: 108.3,
  贵阳: 106.7,
  太原: 112.5,
  石家庄: 114.5,
  兰州: 103.8,
  乌鲁木齐: 87.6,
  拉萨: 91.1,
  香港: 114.2,
  台北: 121.5,
};

export function resolveLongitude(birthPlace?: string, longitude?: number): number {
  if (longitude != null && !Number.isNaN(longitude)) return longitude;
  if (!birthPlace?.trim()) return 120;
  const place = birthPlace.trim();
  for (const [city, lon] of Object.entries(CITY_LONGITUDE)) {
    if (place.includes(city)) return lon;
  }
  return 120;
}
