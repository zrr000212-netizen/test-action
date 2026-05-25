#!/usr/bin/env python3
"""天气查询 - 基于 wttr.in，无需 API Key"""

import argparse
import json
import sys
import urllib.request
import urllib.parse

API = "https://wttr.in"

def query(city, fmt="j1", timeout=10):
    url = f"{API}/{urllib.parse.quote(city)}?format={fmt}&lang=zh"
    with urllib.request.urlopen(url, timeout=timeout) as r:
        return json.loads(r.read())

def show_current(data, short=False):
    c = data["current_condition"][0]
    temp = c["temp_C"]
    feel = c["FeelsLikeC"]
    desc = c["lang_zh"][0]["value"] if c.get("lang_zh") else c["weatherDesc"][0]["value"]
    hum = c["humidity"]
    wind = c["windspeedKmph"]
    wind_dir = c["winddir16Point"]
    if short:
        print(f"{data['nearest_area'][0]['areaName'][0]['value']}: {desc} {temp}°C (体感{feel}°C) 湿度{hum}% 风{wind}km/h{wind_dir}")
        return
    area = data["nearest_area"][0]["areaName"][0]["value"]
    print(f"📍 {area} 当前天气")
    print("─" * 30)
    print(f"  {desc}")
    print(f"  温度: {temp}°C (体感 {feel}°C)")
    print(f"  湿度: {hum}%")
    print(f"  风速: {wind} km/h {wind_dir}")
    print("─" * 30)

def show_forecast(data):
    area = data["nearest_area"][0]["areaName"][0]["value"]
    print(f"📍 {area} 未来3日预报")
    print("─" * 30)
    for day in data["weather"]:
        date = day["date"]
        max_t = day["maxtempC"]
        min_t = day["mintempC"]
        desc = day["hourly"][4]["lang_zh"][0]["value"] if day["hourly"][4].get("lang_zh") else day["hourly"][4]["weatherDesc"][0]["value"]
        print(f"  {date}  {desc}  {min_t}°C ~ {max_t}°C")
    print("─" * 30)

def show_json(data):
    print(json.dumps(data, ensure_ascii=False, indent=2))

def main():
    p = argparse.ArgumentParser(description="天气查询")
    p.add_argument("city", help="城市名（中文/英文/机场代码）")
    p.add_argument("--forecast", action="store_true", help="3日预报")
    p.add_argument("--short", action="store_true", help="简洁输出")
    p.add_argument("--json", action="store_true", help="JSON输出")
    args = p.parse_args()

    try:
        data = query(args.city)
    except Exception as e:
        print(f"[ERROR] 查询失败: {e}", file=sys.stderr)
        sys.exit(1)

    if args.json:
        show_json(data)
    elif args.forecast:
        show_forecast(data)
    else:
        show_current(data, short=args.short)

if __name__ == "__main__":
    main()
