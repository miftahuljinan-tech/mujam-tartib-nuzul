# -*- coding: utf-8 -*-
"""Memasukkan Data-Mentah/tartib_nuzul_5_versi.json ke Hasil/mujam.db.
Aman dijalankan berulang kali (isi tartib lama diganti). Data tartib TIDAK diubah, hanya disalin
dan diperiksa (tiap versi harus berupa urutan 1..N tanpa nomor ganda)."""
import json, sqlite3, sys
from pathlib import Path
BASE = Path(__file__).resolve().parent.parent
SUMBER = Path(sys.argv[1]) if len(sys.argv) > 1 else BASE / "Data-Mentah" / "tartib_nuzul_5_versi.json"
DB = Path(sys.argv[2]) if len(sys.argv) > 2 else BASE / "Hasil" / "mujam.db"
SYAHR = Path(sys.argv[3]) if len(sys.argv) > 3 else BASE / "Data-Mentah" / "tartib_syahrastani.json"

d = json.load(open(SUMBER, encoding="utf-8"))
db = sqlite3.connect(DB)
# (kode di database, kunci di JSON, kolom urutan, kolom periode)
PETA = [("kairo", "kairo", "kairo_pos", "kairo_class"),
        ("noldeke", "noldeke_schwally", "noldeke_schwally_pos", "noldeke_schwally_period"),
        ("darwazah", "darwazah", "darwazah_pos", "darwazah_class"),
        ("klasik", "ibnabbas", "ibnabbas_pos", "ibnabbas_class"),
        ("jabiri", "jabiri", "jabiri_pos", "jabiri_stage")]
S = d["surahs"]
assert len(S) == 114
db.execute("delete from tartib_surah"); db.execute("delete from tartib_segmen")
for s in S: db.execute("update surah set nama_arab=? where id=?", (s["name_arab"], s["surah_no"]))
for kode, kunci, cpos, ccls in PETA:
    vid = db.execute("select id from tartib_versi where kode=?", (kode,)).fetchone()[0]
    ket = d["versi"][kunci]
    db.execute("update tartib_versi set rujukan=? where id=?", (ket, vid))
    urut = [s[cpos] for s in S if s[cpos] not in (None, "")]
    assert sorted(urut) == list(range(1, len(urut) + 1)), f"{kode}: urutan bukan 1..N tanpa ganda"
    for s in S:
        if s[cpos] in (None, ""): continue
        cat = s["catatan"] if (s["catatan"] or "").lower().startswith({"kairo":"kairo","noldeke":"nöldeke","darwazah":"darwazah","klasik":"ibn abbas","jabiri":"jabiri"}[kode]) else None
        db.execute("insert into tartib_surah values(?,?,?,?,?,?)",
                   (vid, s["surah_no"], int(s[cpos]), s[ccls], ket, cat))
    print(f"{kode}: {len(urut)} surah, urutan 1..{len(urut)} valid")
# --- versi al-Syahrastani (Amal hlm. 212-214): urutan saja, tanpa periode
sy = json.load(open(SYAHR, encoding="utf-8"))
vs = db.execute("select id from tartib_versi where kode='syahrastani'").fetchone()[0]
urut = [x["surah"] for x in sy["urutan"]]
assert sorted(urut) == list(range(1, 115)), "syahrastani: bukan permutasi 1..114"
db.execute("update tartib_versi set rujukan=? where id=?", (sy["versi"], vs))
for no, sid in enumerate(urut, 1):
    db.execute("insert into tartib_surah values(?,?,?,?,?,?)", (vs, sid, no, "", sy["versi"], None))
print(f"syahrastani: {len(urut)} surah, urutan 1..114 valid")
vj = db.execute("select id from tartib_versi where kode='jabiri'").fetchone()[0]
for g in d["jabiri_segments"]:
    a, b = g["ayat"].split("-")
    ket = g.get("after") and ("disisipkan setelah " + g["after"]) or "urutan sendiri"
    db.execute("insert into tartib_segmen(versi_id,surah_id,ayat_awal,ayat_akhir,urutan_nuzul,keterangan) values(?,?,?,?,?,?)",
               (vj, g["surah"], int(a), int(b), g.get("pos"), ket))
print("segmen al-Jabiri:", len(d["jabiri_segments"]))
db.commit()
