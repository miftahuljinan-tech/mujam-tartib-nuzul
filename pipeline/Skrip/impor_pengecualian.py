# -*- coding: utf-8 -*-
"""Memasukkan Data-Mentah/pengecualian_ayat.json (pengecualian periode tingkat ayat) ke Hasil/mujam.db.
Aman dijalankan berulang kali (isi lama diganti). Data tidak diubah; hanya diperiksa:
 - setiap ayat harus ada di database,
 - setiap pengecualian berstatus 'pasti' harus benar-benar berbeda dari periode surahnya pada versi itu."""
import json, sqlite3, sys
from pathlib import Path
BASE = Path(__file__).resolve().parent.parent
SUMBER = Path(sys.argv[1]) if len(sys.argv) > 1 else BASE / "Data-Mentah" / "pengecualian_ayat.json"
DB = Path(sys.argv[2]) if len(sys.argv) > 2 else BASE / "Hasil" / "mujam.db"

d = json.load(open(SUMBER, encoding="utf-8"))
db = sqlite3.connect(DB)
db.execute("""create table if not exists ayat_pengecualian(
  id integer primary key, versi_id integer, surah_id integer, ayat_awal integer, ayat_akhir integer,
  periode text, status text, sumber text, catatan text)""")
db.execute("delete from ayat_pengecualian")
db.execute("delete from meta where kunci like 'pengecualian_%'")
vid = {k: i for i, k in db.execute("select id,kode from tartib_versi")}
jml = {s: n for s, n in db.execute("select id,jumlah_ayat from surah")}
salah = 0
n = 0
for r in d["data"]:
    v = vid[r["versi"]]
    a, _, b = r["ayat"].partition("-")
    a1 = int(a); a2 = int(b) if b else a1
    if not (1 <= a1 <= a2 <= jml[r["surah"]]):
        print("AYAT DI LUAR BATAS:", r); salah += 1; continue
    if r["status"] not in ("pasti", "tidak_pasti", "belakangan"):
        print("STATUS TIDAK DIKENAL:", r); salah += 1; continue
    if r["status"] == "pasti":
        sp = db.execute("select periode from tartib_surah where versi_id=? and surah_id=?", (v, r["surah"])).fetchone()
        if sp is None or sp[0] == r["periode"]:
            print("SAMA DENGAN PERIODE SURAH:", r, sp); salah += 1; continue
    db.execute("insert into ayat_pengecualian(versi_id,surah_id,ayat_awal,ayat_akhir,periode,status,sumber,catatan) values(?,?,?,?,?,?,?,?)",
               (v, r["surah"], a1, a2, r["periode"], r["status"], d["sumber"].get(r["versi"], ""), r["catatan"]))
    n += 1
for kode, teks in d["catatan_versi"].items():
    db.execute("insert or replace into meta(kunci,nilai) values(?,?)", ("pengecualian_" + kode, teks))
if salah:
    db.rollback(); sys.exit("Dibatalkan: %d baris bermasalah (lihat di atas)" % salah)
db.commit()
print("pengecualian ayat dimasukkan:", n, "baris")
for kode, c in db.execute("select v.kode,count(*) from ayat_pengecualian e join tartib_versi v on v.id=e.versi_id group by 1"): print(" ", kode, c)
