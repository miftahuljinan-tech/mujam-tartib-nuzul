# -*- coding: utf-8 -*-
"""Mengubah Hasil/mujam.db + Skrip/aplikasi-template.html menjadi SATU berkas: Hasil/mujam-nuzul.html
(berkas inilah yang disalin ke HP dan dibuka di Chrome; tidak butuh internet)."""
import json, re, sqlite3, sys
from pathlib import Path
BASE = Path(__file__).resolve().parent.parent
DB = Path(sys.argv[1]) if len(sys.argv) > 1 else BASE / "Hasil" / "mujam.db"
TPL = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent / "aplikasi-template.html"
OUT = Path(sys.argv[3]) if len(sys.argv) > 3 else BASE / "Hasil" / "mujam-nuzul.html"
# Opsi: tambahkan --tanpa-terjemah sebagai argumen ke-4 untuk membangun versi tanpa terjemah
# (teks terjemah dikosongkan dan semua tampilan terjemah disembunyikan).
TANPA_TR = "--tanpa-terjemah" in sys.argv[4:]

db = sqlite3.connect(DB)
D = {}
D["meta"] = dict(db.execute("select kunci,nilai from meta"))
D["surah"] = [list(r) for r in db.execute("select id,nama,nama_arab,jumlah_ayat from surah order by id")]
roots = db.execute("select id,huruf_akar from root order by id").fetchall()
assert [r[0] for r in roots] == list(range(1, len(roots) + 1))
D["roots"] = [r[1] for r in roots]

versi = []
for vid, kode, nama, rujukan in db.execute("select id,kode,nama,rujukan from tartib_versi order by id"):
    pos = {sid: [u, per or "", cat or ""] for sid, u, per, cat in
           db.execute("select surah_id,urutan_nuzul,periode,catatan from tartib_surah where versi_id=?", (vid,))}
    seg = []
    for sid, a1, a2, u, ket in db.execute("select surah_id,ayat_awal,ayat_akhir,urutan_nuzul,keterangan from tartib_segmen where versi_id=? order by id", (vid,)):
        seg.append([sid, a1, a2, u, ket])
    # urutan segmen yang "disisipkan": pakai urutan surah rujukan + 0.5, 0.6 (disisipkan berurutan)
    prev = None
    for g in seg:
        if g[3] is None:
            m = re.search(r"urutan (\d+)", g[4])
            if m:
                g[3] = int(m.group(1)) + 0.5
            else:
                assert prev is not None
                g[3] = prev + 0.1
        prev = g[3]
    ex = [list(r) for r in db.execute("select surah_id,ayat_awal,ayat_akhir,periode,status,catatan from ayat_pengecualian where versi_id=? order by surah_id,ayat_awal", (vid,))]
    exsrc = (db.execute("select sumber from ayat_pengecualian where versi_id=? limit 1", (vid,)).fetchone() or [""])[0]
    versi.append({"kode": kode, "nama": nama, "rujukan": rujukan or "", "pos": pos, "seg": seg, "ex": ex, "exsrc": exsrc})
D["versi"] = versi

# Nama diri yang di QAC tanpa akar tetapi di Mu'jam Mufahras dicantumkan di bawah akar tertentu.
# Setiap pasangan sudah dicocokkan dengan halaman Mu'jam (cetakan pindai, lihat catatan di bawah).
# kunci: lema tanpa harakat (hamza disatukan) -> akar menurut Mu'jam Mufahras
ALIH_MUJAM = {
    "مسيح": ("مسح", "hlm. 666", "المسيح"),     # المسيح (11)
    "ابليس": ("بلس", "hlm. 134", "إبليس"),    # إبليس (11)
    "محمد": ("حمد", "hlm. 218", "محمد"),     # محمد (4)
    "احمد": ("حمد", "hlm. 218", "أحمد"),     # أحمد (1)
    "سليمن": ("سلم", "hlm. 357-358", "سليمان"),  # سليمان (17)
    "عمرن": ("عمر", "hlm. 483", "عمران"),
    "اسحاق": ("سحق", "hlm. 347", "إسحاق"),  # إسحاق (17); sesuai kritik al-Hujaili, Shamela 8558 hlm. 32     # عمران (3)
}
_HRK = re.compile("[\u064B-\u065F\u0670\u0640]")
def _kunci(l):
    return _HRK.sub("", l or "").translate(str.maketrans("إأآٱ", "اااا"))
rid_of = {r[1]: r[0] for r in roots}
alih_n = {}
ayah = []
words = {}
for aid, wid, teks, rid, lemma, pos in db.execute("select ayah_id,posisi,teks,root_id,lemma,pos from word order by ayah_id,posisi"):
    if rid is None and pos == "PN":
        k = _kunci(lemma)
        if k in ALIH_MUJAM:
            rid = rid_of[ALIH_MUJAM[k][0]]
            alih_n[k] = alih_n.get(k, 0) + 1
    words.setdefault(aid, []).append([teks, (rid or 0) - 1])  # -1 = tanpa akar
mismatch = {r[0] for r in db.execute("select distinct ayah_id from word where sumber_teks='korpus'")}
for aid, s, n, teks, tr in db.execute("select id,surah_id,nomor,teks,terjemah from ayah order by id"):
    ayah.append([s, n, teks, "" if TANPA_TR else tr, 1 if aid in mismatch else 0, words[aid]])
D["ayah"] = ayah
assert len(alih_n) == len(ALIH_MUJAM), alih_n
# daftar untuk halaman Tentang: [nama, akar, jumlah kemunculan]
D["meta"]["alih_mujam"] = json.dumps([[ALIH_MUJAM[k][2], ALIH_MUJAM[k][0], alih_n[k]] for k in ALIH_MUJAM], ensure_ascii=False)
if TANPA_TR:
    D["meta"]["tanpa_terjemah"] = "1"

js = json.dumps(D, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
html = TPL.read_text(encoding="utf-8").replace("/*DATA_DISINI*/null", js)
OUT.write_text(html, encoding="utf-8")
print(f"Selesai: {OUT.name}  ({OUT.stat().st_size/1e6:.1f} MB)")
