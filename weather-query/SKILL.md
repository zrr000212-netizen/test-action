---
name: weather-query
description: Query real-time weather and forecasts for any city worldwide. Supports current conditions, multi-day forecasts, and weather alerts.
tags: weather,api,query,forecast
---

# Weather Query

Query real-time weather and forecasts for any city worldwide using free and open APIs.

## When to Use

- User asks about current weather in any city
- User needs a multi-day weather forecast
- User wants weather for travel planning or outdoor activities

## Quick Start

### Current Weather (wttr.in — no API key needed)

```bash
# Plain text
curl -s "wttr.in/Beijing?format=3"

# JSON format
curl -s "wttr.in/Beijing?format=j1" | jq '.current_condition[0] | {temp_C, humidity, weatherDesc: .weatherDesc[0].value, winddir16Point, windspeedKmph}'

# Full ASCII art forecast
curl -s "wttr.in/Beijing"
```

### Multi-day Forecast (3 days)

```bash
curl -s "wttr.in/Shanghai?format=j1" | jq '.weather[] | {date: .date, maxtemp_C, mintemp_C}'
```

### Chinese City Names

```bash
# Pinyin
curl -s "wttr.in/guangzhou?format=j1"

# URL-encoded Chinese
curl -s "wttr.in/%E5%B9%BF%E5%B7%9E?format=j1"
```

## Enhanced Mode (OpenWeatherMap — requires API key)

```bash
export OPENWEATHER_API_KEY="your_key_here"

# Current weather with Chinese description
curl -s "https://api.openweathermap.org/data/2.5/weather?q=Beijing&appid=$OPENWEATHER_API_KEY&units=metric&lang=zh_cn" | jq '{city: .name, temp: .main.temp, humidity: .main.humidity, description: .weather[0].description}'

# 5-day forecast
curl -s "https://api.openweathermap.org/data/2.5/forecast?q=Beijing&appid=$OPENWEATHER_API_KEY&units=metric&lang=zh_cn" | jq '.list[] | {dt_txt, temp: .main.temp, description: .weather[0].description}'
```

## Shell Helper

```bash
weather() {
  local city="${1:-Beijing}"
  local format="${2:-3}"
  curl -s "wttr.in/${city}?format=${format}"
}

# weather Beijing        → One-line current
# weather Shanghai 1     → Just temperature
# weather "New York" v2  → Compact forecast
```

## Pitfalls

- wttr.in rate-limits to ~1M requests/day per IP
- Chinese city names must be pinyin or URL-encoded
- wttr.in forecast limited to 3 days; use OpenWeatherMap for 5+
- OpenWeatherMap free tier: 60 calls/minute
