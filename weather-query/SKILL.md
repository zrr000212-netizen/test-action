---
name: weather-query
description: Query real-time weather and forecasts for any city worldwide. Supports current conditions, multi-day forecasts, and weather alerts. Use when checking weather for trip planning, outdoor activities, or daily routines.
compatibility: Requires curl and jq. Works with wttr.in (no API key needed) or OpenWeatherMap (API key optional for enhanced data).
metadata:
  openclaw:
    emoji: "🌤️"
    requires:
      bins:
        - curl
        - jq
      env:
        - WEATHER_API_KEY
    primaryEnv: WEATHER_API_KEY
---

# Weather Query

Query current weather conditions, forecasts, and alerts for any city worldwide via wttr.in or OpenWeatherMap API.

---

## Quick Start

```bash
# Current weather (no API key needed, uses wttr.in)
curl -s "wttr.in/Beijing?format=3"

# Detailed current weather
curl -s "wttr.in/Beijing?format=%C+%t+%h+%w+%p"

# 3-day forecast (ASCII art)
curl -s "wttr.in/Beijing"

# JSON format for programmatic use
curl -s "wttr.in/Beijing?format=j1" | jq .
```

---

## Usage

### Current Weather

```bash
# Basic: city + temperature
curl -s "wttr.in/Shanghai?format=3"
# Output: Shanghai: ☀️ +28°C

# Detailed: condition, temp, humidity, wind, precipitation
curl -s "wttr.in/Shanghai?format=%C+%t+%h+%w+%p"
# Output: ☀️ +28°C 65% 12km/h 0.0mm

# Full JSON response
curl -s "wttr.in/Shanghai?format=j1" | jq '{
  condition: .current_condition[0].weatherDesc[0].value,
  temperature: .current_condition[0].temp_C + "°C",
  humidity: .current_condition[0].humidity + "%",
  wind: .current_condition[0].windspeedKmph + "km/h",
  feels_like: .current_condition[0].FeelsLikeC + "°C"
}'
```

### Multi-Day Forecast

```bash
# 3-day forecast (ASCII)
curl -s "wttr.in/Guangzhou"

# Forecast as JSON
curl -s "wttr.in/Guangzhou?format=j1" | jq '.weather[] | {
  date: .date,
  max_temp: .maxtempC + "°C",
  min_temp: .mintempC + "°C",
  condition: .hourly[4].weatherDesc[0].value
}'
```

### OpenWeatherMap (Enhanced Data)

```bash
# Requires API key from https://openweathermap.org/api
export WEATHER_API_KEY="your_api_key"

# Current weather
CITY="Beijing"
curl -s "https://api.openweathermap.org/data/2.5/weather?q=${CITY}&appid=${WEATHER_API_KEY}&units=metric&lang=zh_cn" | jq '{
  city: .name,
  condition: .weather[0].description,
  temperature: (.main.temp | tostring) + "°C",
  humidity: (.main.humidity | tostring) + "%",
  wind_speed: (.wind.speed | tostring) + "m/s"
}'

# 5-day forecast
curl -s "https://api.openweathermap.org/data/2.5/forecast?q=${CITY}&appid=${WEATHER_API_KEY}&units=metric&lang=zh_cn&cnt=8" | jq '.list[] | {
  time: .dt_txt,
  condition: .weather[0].description,
  temperature: (.main.temp | tostring) + "°C"
}'
```

### One-Liner Helpers

```bash
# Add to shell profile for quick access
weather() { curl -s "wttr.in/${1:-Beijing}?format=%C+%t+%h+%w"; }

# Usage
weather Shanghai    # ☀️ +28°C 65% 12km/h
weather "New York"  # 🌧️ +18°C 72% 20km/h
weather Tokyo       # ⛅ +22°C 58% 8km/h
```

---

## Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| City name | Any city worldwide, URL-encoded | Beijing |
| `format` | Output format: `3`(brief), `j1`(JSON), ASCII(full) | ASCII |
| `lang` | Language: `zh-cn`, `en`, `ja`, `de`, `fr` etc. | en |
| `units` | Units: `metric`(°C), `imperial`(°F) | metric |

---

## Notes

- **wttr.in** requires no API key, rate limit ~1M requests/month
- **OpenWeatherMap** free tier: 60 calls/min, 1M calls/month
- City names with spaces: use quotes or URL-encode (`New%20York`)
- For Chinese cities, use pinyin (`Beijing`, `Shanghai`) or Chinese characters (URL-encoded)
- wttr.in may be slow from China; OpenWeatherMap is generally faster
