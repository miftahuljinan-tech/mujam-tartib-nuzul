# -*- coding: utf-8 -*-
"""Membangun desktop/app/index.html tanpa basis data.
Data (ayat, terjemah, akar, tartib) diambil dari HTML Android yang sudah jadi (app/src/main/assets/mujam-nuzul.html),
lalu dipasang ke templat terbaru (pipeline/Skrip/aplikasi-template-android.html) beserta modul ekspor Word/Excel."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASET = ROOT / "app/src/main/assets/mujam-nuzul.html"
TPL = ROOT / "pipeline/Skrip/aplikasi-template-android.html"
EXP = ROOT / "pipeline/Skrip/ekspor-office.js"
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(__file__).resolve().parent / "app" / "index.html"

gen = ASET.read_text(encoding="utf-8")
i = gen.index("const DATA=") + len("const DATA=")
j = gen.index(";\n\n/* ===== normalisasi", i)
data = gen[i:j]
assert data.startswith("{") and data.endswith("}"), "data tidak terbaca"

tpl = TPL.read_text(encoding="utf-8")
for tanda in ("/*EKSPOR_OFFICE*/", "/*DATA_DISINI*/null"):
    assert tpl.count(tanda) == 1, tanda
exp = EXP.read_text(encoding="utf-8").replace('if(typeof module!=="undefined")module.exports=OFC;', "")
html = tpl.replace("/*EKSPOR_OFFICE*/", exp).replace("/*DATA_DISINI*/null", data)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(html, encoding="utf-8")
print(f"Selesai: {OUT}  ({OUT.stat().st_size/1e6:.1f} MB)")
