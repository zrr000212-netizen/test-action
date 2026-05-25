---
name: simple-calculator
description: A minimal calculator skill that evaluates arithmetic expressions via Python. Supports +, -, *, /, **, () and common math functions.
version: 1.0.0
category: utility
author: Hermes Agent
created: 2026-05-25
tags:
  - calculator
  - math
  - utility
---

# Simple Calculator

## Overview

Evaluate arithmetic expressions safely using Python's `ast` module. No external dependencies.

## Usage

```
Calculate: 2 ** 10 + 3 * 7
```

The agent will run the expression and return the result.

## Examples

| Expression | Result |
|------------|--------|
| `1 + 2 * 3` | 7 |
| `(10 - 2) ** 3` | 512 |
| `round(22 / 7, 4)` | 3.1429 |

## Implementation

Run via terminal:

```bash
python3 -c "import ast; print(ast.literal_eval('<expression>'))"
```

For expressions with functions (round, abs, min, max, pow):

```bash
python3 -c "from math import *; print(<expression>)"
```
