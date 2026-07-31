# -*- coding: utf-8 -*-
"""生成 Python 侧对拍夹具 → test/fixtures.json"""
import importlib.util
import json
import sys
import types
from datetime import datetime
from pathlib import Path

for name in [
    "numpy", "requests", "PIL", "PIL.Image", "PIL.ImageTk",
    "tkinter", "tkinter.ttk", "tkinter.messagebox", "tkinter.simpledialog",
    "tkinter.filedialog", "tkinter.scrolledtext",
]:
    if name not in sys.modules:
        m = types.ModuleType(name)
        parent, _, child = name.rpartition(".")
        if parent and parent in sys.modules:
            setattr(sys.modules[parent], child, m)
        sys.modules[name] = m

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT.parent / "liuyao_0519.py"
OUT = ROOT / "test" / "fixtures.json"

spec = importlib.util.spec_from_file_location("liuyao", SRC)
mod = importlib.util.module_from_spec(spec)
sys.modules["liuyao"] = mod
spec.loader.exec_module(mod)

ds = mod.DivinationSystem()

GUA_CASES = [
    {"gua": [9, 7, 8, 6, 7, 8], "day_gan": "甲"},
    {"gua": [7, 7, 7, 8, 8, 8], "day_gan": "丙"},
    {"gua": [6, 6, 6, 6, 6, 6], "day_gan": "庚"},
    {"gua": [9, 9, 9, 9, 9, 9], "day_gan": "壬"},
    {"gua": [7, 8, 7, 8, 7, 8], "day_gan": "乙"},
    {"gua": [8, 8, 8, 7, 7, 7], "day_gan": "戊"},
    {"gua": [6, 9, 7, 8, 9, 6], "day_gan": "癸"},
]

DATE_CASES = [
    [2024, 2, 10],
    [2025, 1, 1],
    [2025, 6, 25],
    [2025, 7, 25],
    [2026, 7, 31],
]

fixtures = {"gua_cases": [], "date_cases": []}

for c in GUA_CASES:
    gua, day_gan = c["gua"], c["day_gan"]
    symbol = ds.get_hexagram_symbol(gua)
    entry = ds.lookup_hexagram(gua)
    full = ds.get_hexagram_full_info(gua, entry, day_gan)
    fixtures["gua_cases"].append({
        "gua": gua,
        "day_gan": day_gan,
        "symbol": symbol,
        "lookup": {
            "name": entry["name"], "judgment": entry["judgment"],
            "palace": entry["palace"], "shi_yao": entry["shi_yao"],
            "type": entry["type"],
        },
        "branches": ds.get_branches({"ben_gua": gua}),
        "shi_ying": list(ds.get_shi_ying(entry)),
        "changing": ds.get_changing_lines(gua),
        "zhi_gua": [9 if y == 6 else 6 if y == 9 else y for y in gua],
        "full_info": full,
    })

for y, m, d in DATE_CASES:
    date = datetime(y, m, d)
    gan, zhi = ds.get_gan_zhi(date)
    fixtures["date_cases"].append({
        "date": [y, m, d],
        "gan_zhi": [gan, zhi],
        "lunar_str": ds.get_lunar_date_str(date),
        "gan_zhi_year": ds.get_gan_zhi_year(y),
        "weekday": ds.get_weekday_str(date),
    })

OUT.write_text(json.dumps(fixtures, ensure_ascii=False, indent=1), encoding="utf-8")
print(f"OK: {len(fixtures['gua_cases'])} gua cases, {len(fixtures['date_cases'])} date cases -> {OUT}")
