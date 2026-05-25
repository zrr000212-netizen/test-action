#!/usr/bin/env python3
"""Simple calculator — safely evaluate arithmetic expressions."""
import ast
import math
import sys

ALLOWED_NAMES = {
    k: v for k, v in math.__dict__.items()
    if not k.startswith("_")
}
ALLOWED_NAMES.update({"abs": abs, "round": round, "min": min, "max": max, "pow": pow})

class CalcVisitor(ast.NodeVisitor):
    ALLOWED = (ast.Expression, ast.BinOp, ast.UnaryOp, ast.Call, ast.Constant,
               ast.Name, ast.Load, ast.Add, ast.Sub, ast.Mult, ast.Div,
               ast.FloorDiv, ast.Mod, ast.Pow, ast.USub, ast.UAdd,
               ast.Tuple, ast.List)

    def visit(self, node):
        if not isinstance(node, self.ALLOWED):
            raise ValueError(f"Unsupported: {type(node).__name__}")
        super().visit(node)

def calc(expr: str) -> str:
    node = ast.parse(expr, mode="eval")
    CalcVisitor().visit(node)
    result = eval(compile(node, "<calc>", "eval"), {"__builtins__": {}}, ALLOWED_NAMES)
    return f"{expr} = {result}"

if __name__ == "__main__":
    expr = " ".join(sys.argv[1:])
    if not expr:
        expr = input("Expression: ")
    print(calc(expr))
