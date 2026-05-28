import { fetchExternalJson, jsonFallback, jsonWithCache } from "../_lib/external-api";

function buildWeatherNote(condition: string, temp: number, isRainy: boolean, isHot: boolean, isCold: boolean): string {
  if (isRainy) return "Chuva lá fora — perfeito para cinema, delivery ou maratona de série em casa.";
  if (isHot) return "Calor forte hoje. Priorizei lugares com ar-condicionado ou programas noturnos.";
  if (isCold) return "Friozinho gostoso. Boa noite para fondue, vinho ou café especial a dois.";
  if (temp >= 25) return "Temperatura agradável. Dá para escolher entre terraço ao ar livre ou lugar fechado.";
  return "Tempo estável. Qualquer programa funciona bem hoje, dentro ou fora de casa.";
}

function buildWeatherLabel(temp: number, description: string): string {
  return `${Math.round(temp)}°C, ${description}`;
}

const FALLBACK = {
  temperature: 22,
  feels_like: 20,
  condition: "Clouds",
  description: "parcialmente nublado",
  icon: "02d",
  icon_url: "https://openweathermap.org/img/wn/02d@2x.png",
  humidity: 65,
  wind_speed: 3.5,
  city: "São Paulo",
  isRainy: false,
  isHot: false,
  isCold: false,
  weather_label: "22°C, parcialmente nublado",
  weather_note: "Tempo estável. Qualquer programa funciona bem hoje, dentro ou fora de casa.",
  weather: "clouds",
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city") || "Sao Paulo";
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    return jsonWithCache(FALLBACK, { revalidate: 600, stale: 300 });
  }

  try {
    const params = new URLSearchParams({
      appid: apiKey,
      units: "metric",
      lang: "pt_br",
    });

    if (lat && lng) {
      params.set("lat", lat);
      params.set("lon", lng);
    } else {
      params.set("q", city);
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?${params.toString()}`;
    const data = await fetchExternalJson<any>(url, { revalidate: 600 });
    const weather = data.weather?.[0] || {};
    const main = data.main || {};
    const wind = data.wind || {};

    const temp = main.temp ?? 22;
    const condition = weather.main || "Clouds";
    const description = weather.description || "nublado";
    const icon = weather.icon || "02d";

    const isRainy = ["Rain", "Drizzle", "Thunderstorm"].includes(condition);
    const isHot = temp > 30;
    const isCold = temp < 15;

    const result = {
      temperature: Math.round(temp),
      feels_like: Math.round(main.feels_like ?? temp),
      condition,
      description,
      icon,
      icon_url: `https://openweathermap.org/img/wn/${icon}@2x.png`,
      humidity: main.humidity ?? 65,
      wind_speed: wind.speed ?? 3,
      city: data.name || city,
      isRainy,
      isHot,
      isCold,
      weather_label: buildWeatherLabel(temp, description),
      weather_note: buildWeatherNote(condition, temp, isRainy, isHot, isCold),
      weather: condition.toLowerCase(),
    };

    return jsonWithCache(result, { revalidate: 600, stale: 300 });
  } catch {
    return jsonFallback(FALLBACK, { revalidate: 600, fallbackMaxAge: 60 });
  }
}
