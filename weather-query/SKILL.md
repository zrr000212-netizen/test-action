---
name: weather-query
description: Query real-time weather and forecasts for any city worldwide. Supports current conditions, multi-day forecasts, and weather alerts. Use when checking weather for travel planning, outdoor activities, or general information needs.
tags: weather,api,query,forecast
---

# Weather Query

Query real-time weather and forecasts for any city worldwide using free and open APIs.

## When to Use

- User asks about current weather in any city
- User needs a multi-day weather forecast
- User wants weather alerts or conditions for travel planning
- User mentions weather-related activities (hiking, sailing, etc.)

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
curl -s "wttr.in/Shanghai?format=j1" | jq '.weather[] | {date: .date, maxtemp_C, mintemp_C, hourly: [.hourly[] | {time, tempC, weatherDesc: .weatherDesc[0].value}]}'
```

### Chinese City Names

```bash
# Use pinyin
curl -s "wttr.in/guangzhou?format=j1"

# Or URL-encoded Chinese
curl -s "wttr.in/%E5%B9%BF%E5%B7%9E?format=j1"
```

## Enhanced Mode (OpenWeatherMap — requires API key)

For richer data (UV index, precipitation probability, etc.), use OpenWeatherMap:

```bash
# Set your API key (free tier: 60 calls/min)
export OPENWEATHER_API_KEY="your_key_here"

# Current weather
curl -s "https://api.openweathermap.org/data/2.5/weather?q=Beijing&appid=$OPENWEATHER_API_KEY&units=metric&lang=zh_cn" | jq '{city: .name, temp: .main.temp, humidity: .main.humidity, description: .weather[0].description, wind_speed: .wind.speed}'

# 5-day forecast (3-hour intervals)
curl -s "https://api.openweathermap.org/data/2.5/forecast?q=Beijing&appid=$OPENWEATHER_API_KEY&units=metric&lang=zh_cn" | jq '.list[] | {dt_txt, temp: .main.temp, description: .weather[0].description}'
```

## Shell Helper Function

Add to `~/.bashrc` or `~/.zshrc`:

```bash
weather() {
  local city="${1:-Beijing}"
  local format="${2:-3}"
  curl -s "wttr.in/${city}?format=${format}"
}

# Usage:
# weather Beijing        # One-line current
# weather Shanghai 1     # Just temperature
# weather "New York" v2  # Compact forecast
```

## Common Patterns

| Task | Command |
|------|---------|
| Temperature only | `curl -s "wttr.in/City?format=%t"` |
| Wind + direction | `curl -s "wttr.in/City?format=%w+%d"` |
| Humidity | `curl -s "wttr.in/City?format=%h"` |
| Condition icon | `curl -s "wttr.in/City?format=%c"` |
| All in one line | `curl -s "wttr.in/City?format=%c+%t+%w+%h"` |

## Pitfalls

- wttr.in has no auth but rate-limits to ~1M requests/day per IP
- Chinese city names must be pinyin or URL-encoded; raw UTF-8 may fail
- wttr.in forecast is limited to 3 days; use OpenWeatherMap for 5+ days
- OpenWeatherMap free tier allows 60 calls/minute; cache results locally
- Some corporate networks block wttr.in; fallback to OpenWeatherMap

## Related Skills

- `imap-smtp-email`: Send weather alerts via email
- `agent-email-kit`: Email weather reports on schedule
