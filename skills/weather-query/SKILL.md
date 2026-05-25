---
name: weather-query
description: |
  查询全球城市天气，支持当前天气和3日预报。数据来源 wttr.in，无需 API Key。

  **触发场景**:
  - 用户说"查询天气"、"今天天气"、"天气预报"
  - 用户提到某城市天气，如"北京天气"、"上海明天天气"
---

# 天气查询

通过 wttr.in 查询天气，无需 API Key。

## 使用

```bash
# 当前天气
python scripts/weather.py 北京

# 3日预报
python scripts/weather.py 上海 --forecast

# 简洁输出
python scripts/weather.py 广州 --short

# JSON输出
python scripts/weather.py 深圳 --json
```

## 参数

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `city` | 城市名（中文/英文/机场代码） | 必填 |
| `--forecast` | 3日预报 | false |
| `--short` | 简洁单行 | false |
| `--json` | JSON格式 | false |
