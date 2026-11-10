# -*- coding: utf-8 -*-
"""
Membangun mujam.db dari tiga berkas mentah:
  Data-Mentah/quran-uthmani.txt               (Tanzil, teks Utsmani)
  Data-Mentah/id.indonesian.txt               (Tanzil, terjemah Kemenag)
  Data-Mentah/quranic-corpus-morphology-0.4.txt (Quranic Arabic Corpus)
Teks Tanzil TIDAK diubah; disalin apa adanya.
Hasil: Hasil/mujam.db, Hasil/laporan-pemeriksaan.txt (data tartib dimasukkan oleh impor_tartib.py)
"""
import re, sqlite3, sys, csv, unicodedata
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
DATA = Path(sys.argv[1]) if len(sys.argv) > 1 else BASE / "Data-Mentah"
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else BASE / "Hasil"
OUT.mkdir(parents=True, exist_ok=True)

SURAH = """Al-Fatihah|Al-Baqarah|Ali Imran|An-Nisa'|Al-Ma'idah|Al-An'am|Al-A'raf|Al-Anfal|At-Taubah|Yunus|Hud|Yusuf|Ar-Ra'd|Ibrahim|Al-Hijr|An-Nahl|Al-Isra'|Al-Kahf|Maryam|Ta Ha|Al-Anbiya'|Al-Hajj|Al-Mu'minun|An-Nur|Al-Furqan|Asy-Syu'ara'|An-Naml|Al-Qasas|Al-'Ankabut|Ar-Rum|Luqman|As-Sajdah|Al-Ahzab|Saba'|Fatir|Ya Sin|As-Saffat|Sad|Az-Zumar|Gafir|Fussilat|Asy-Syura|Az-Zukhruf|Ad-Dukhan|Al-Jasiyah|Al-Ahqaf|Muhammad|Al-Fath|Al-Hujurat|Qaf|Az-Zariyat|At-Tur|An-Najm|Al-Qamar|Ar-Rahman|Al-Waqi'ah|Al-Hadid|Al-Mujadalah|Al-Hasyr|Al-Mumtahanah|As-Saff|Al-Jumu'ah|Al-Munafiqun|At-Tagabun|At-Talaq|At-Tahrim|Al-Mulk|Al-Qalam|Al-Haqqah|Al-Ma'arij|Nuh|Al-Jinn|Al-Muzzammil|Al-Muddassir|Al-Qiyamah|Al-Insan|Al-Mursalat|An-Naba'|An-Nazi'at|'Abasa|At-Takwir|Al-Infitar|Al-Mutaffifin|Al-Insyiqaq|Al-Buruj|At-Tariq|Al-A'la|Al-Gasyiyah|Al-Fajr|Al-Balad|Asy-Syams|Al-Lail|Ad-Duha|Asy-Syarh|At-Tin|Al-'Alaq|Al-Qadr|Al-Bayyinah|Az-Zalzalah|Al-'Adiyat|Al-Qari'ah|At-Takasur|Al-'Asr|Al-Humazah|Al-Fil|Quraisy|Al-Ma'un|Al-Kausar|Al-Kafirun|An-Nasr|Al-Lahab|Al-Ikhlas|Al-Falaq|An-Nas""".split("|")
assert len(SURAH) == 114

VERSI = [  # kode, nama
    ("kairo", "Mushaf Kairo 1924 (Edisi Raja Fu'ad / al-Amiriyyah)"),
    ("noldeke", "Noldeke-Schwally"),
    ("darwazah", "Darwazah (at-Tafsir al-Hadits)"),
    ("klasik", "Riwayat klasik (Ibn 'Abbas)"),
    ("syahrastani", "Mushaf Ibn 'Abbas menurut al-Syahrastani"),
    ("jabiri", "Muhammad 'Abid al-Jabiri (Fahm al-Qur'an al-Hakim)"),
]

# --- Buckwalter -> Arab (untuk akar & lemma; sistem yang dipakai korpus) ---
BW = {
 "'":"ء","|":"آ",">":"أ","&":"ؤ","<":"إ","}":"ئ","A":"ا","b":"ب","p":"ة","t":"ت","v":"ث",
 "j":"ج","H":"ح","x":"خ","d":"د","*":"ذ","r":"ر","z":"ز","s":"س","$":"ش","S":"ص","D":"ض",
 "T":"ط","Z":"ظ","E":"ع","g":"غ","_":"ـ","f":"ف","q":"ق","k":"ك","l":"ل","m":"م","n":"ن",
 "h":"ه","w":"و","Y":"ى","y":"ي","F":"ً","N":"ٌ","K":"ٍ","a":"َ",
 "u":"ُ","i":"ِ","~":"ّ","o":"ْ","`":"ٰ","{":"ٱ","^":"ٓ",
 "#":"ٔ",":":"ۜ","@":"۟",'"':"۠","[":"ۢ",";":"ۣ",",":"ۥ",
 ".":"ۦ","M":"ۭ","!":"ۤ","-":"۪","+":"۫","%":"۬","]":"ۡ",
}
def bw2ar(s):
    return "".join(BW.get(c, c) for c in s)

# --- normalisasi untuk pencarian (hanya salinan; teks asli tidak diubah) ---
DROP = set(range(0x064B, 0x0653)) | {0x0670, 0x0640} | set(range(0x0653, 0x0660)) | set(range(0x06D6, 0x06EF)) | {0x08F0,0x08F1,0x08F2}
def norm(s):
    s = unicodedata.normalize("NFC", s)
    out = []
    for ch in s:
        o = ord(ch)
        if o in DROP: continue
        if ch in "أإآٱ": ch = "ا"
        elif ch == "ى": ch = "ي"
        elif ch == "ة": ch = "ه"
        out.append(ch)
    return "".join(out)

import difflib
def key_ar(bw):
    return norm(bw2ar(bw)).replace("\u0624", "\u0621").replace("\u0626", "\u0621")
def cocokkan_gabungan(token, kunci_kata):
    """Jumlah kata Tanzil = jumlah kata korpus + 1: cari satu pasang kata Tanzil berurutan yang
    dipetakan ke satu kata korpus. Hanya diterima jika kecocokannya jelas; selain itu None."""
    skor = []
    for j in range(len(kunci_kata)):
        cand = token[:j] + [token[j] + " " + token[j+1]] + token[j+2:]
        r = [difflib.SequenceMatcher(None, kunci_kata[i], norm(cand[i]).replace(" ", "")).ratio() for i in range(len(cand))]
        buruk = sum(1 for x in r if x < 0.8)          # jumlah kata yang kurang cocok
        skor.append((buruk, -sum(r) / len(r), r[j], cand))
    skor.sort(key=lambda x: (x[0], x[1]))
    best = skor[0]
    lebih_baik = len(skor) == 1 or skor[1][0] > best[0]
    if best[0] <= 1 and best[2] >= 0.7 and lebih_baik:
        return best[3]
    return None

def baca_ayat(path):
    d = {}
    for line in open(path, encoding="utf-8"):
        m = re.match(r"^(\d+)\|(\d+)\|(.*)$", line.rstrip("\n"))
        if m: d[(int(m[1]), int(m[2]))] = m[3]
    return d

BASMALAH = arab_basmalah = "بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ"
arab = baca_ayat(DATA / "quran-uthmani.txt")
indo = baca_ayat(DATA / "id.indonesian.txt")
assert len(arab) == len(indo) == 6236, (len(arab), len(indo))
assert set(arab) == set(indo)

# --- korpus: kelompokkan segmen per kata ---
kata = {}  # (s,a,w) -> list of (form, tag, feat)
for line in open(DATA / "quranic-corpus-morphology-0.4.txt", encoding="utf-8"):
    if not line.startswith("("): continue
    p = line.rstrip("\n").split("\t")
    s, a, w, seg = map(int, p[0].strip("()").split(":"))
    kata.setdefault((s, a, w), []).append((seg, p[1], p[2], p[3]))

db_path = OUT / "mujam.db"
if db_path.exists(): db_path.unlink()
db = sqlite3.connect(db_path)
db.executescript("""
CREATE TABLE meta(kunci TEXT PRIMARY KEY, nilai TEXT);
CREATE TABLE surah(id INTEGER PRIMARY KEY, nama TEXT, urutan_mushaf INTEGER, jumlah_ayat INTEGER, nama_arab TEXT);
CREATE TABLE tartib_versi(id INTEGER PRIMARY KEY, kode TEXT UNIQUE, nama TEXT, penyusun TEXT, rujukan TEXT, keterangan TEXT);
CREATE TABLE tartib_surah(versi_id INTEGER, surah_id INTEGER, urutan_nuzul INTEGER, periode TEXT, rujukan TEXT, catatan TEXT, PRIMARY KEY(versi_id, surah_id));
CREATE TABLE tartib_segmen(id INTEGER PRIMARY KEY, versi_id INTEGER, surah_id INTEGER, ayat_awal INTEGER, ayat_akhir INTEGER, urutan_nuzul INTEGER, keterangan TEXT);
CREATE TABLE ayah(id INTEGER PRIMARY KEY, surah_id INTEGER, nomor INTEGER, teks TEXT, teks_norm TEXT, terjemah TEXT, periode_override TEXT, teks_tanzil_asli TEXT);
CREATE TABLE root(id INTEGER PRIMARY KEY, huruf_akar TEXT UNIQUE, buckwalter TEXT);
CREATE TABLE word(id INTEGER PRIMARY KEY, ayah_id INTEGER, posisi INTEGER, teks TEXT, teks_norm TEXT, sumber_teks TEXT, lemma TEXT, root_id INTEGER, pos TEXT, buckwalter TEXT);
""")

meta = {
 "sumber_teks": "Tanzil Quran Text (Uthmani, Version 1.1) - Copyright (C) 2007-2026 Tanzil Project - http://tanzil.net - lisensi CC BY 3.0, tidak diubah",
 "sumber_terjemah": "Terjemah Kemenag RI (2010) via Tanzil - http://tanzil.net",
 "sumber_morfologi": "Quranic Arabic Corpus, morphology v0.4, Kais Dukes - http://corpus.quran.com - lisensi GNU GPL",
 "catatan": "Akar kata berasal dari anotasi Quranic Arabic Corpus, bukan dari kitab Mu'jam Mufahras Fu'ad Abd al-Baqi.",
}
db.executemany("INSERT INTO meta VALUES(?,?)", meta.items())
jml = {}
for (s, a) in arab: jml[s] = max(jml.get(s, 0), a)
db.executemany("INSERT INTO surah VALUES(?,?,?,?,NULL)", [(i+1, SURAH[i], i+1, jml[i+1]) for i in range(114)])
for i, (k, n) in enumerate(VERSI, 1):
    db.execute("INSERT INTO tartib_versi(id,kode,nama) VALUES(?,?,?)", (i, k, n))

root_id = {}
lap = {"digabung": [], "basmalah_dibuang": 0, "ayat": 0, "kata": 0, "cocok_tanzil": 0, "ayat_tak_cocok": [], "tanpa_akar": 0}
ayah_id = 0; word_id = 0
for (s, a) in sorted(arab):
    ayah_id += 1; lap["ayat"] += 1
    asli = arab[(s, a)]
    teks = asli
    # Berkas Tanzil ini menempelkan basmalah di depan ayat 1 setiap surah (kecuali 1 dan 9).
    # Teks asli disimpan utuh di teks_tanzil_asli; kolom teks = tanpa basmalah tempelan.
    tk = teks.split()
    if a == 1 and s != 1 and len(tk) > 4 and norm(" ".join(tk[:4])) == norm(BASMALAH):
        teks = " ".join(tk[4:]); lap["basmalah_dibuang"] += 1
    db.execute("INSERT INTO ayah VALUES(?,?,?,?,?,?,NULL,?)", (ayah_id, s, a, teks, norm(teks), indo[(s, a)], asli))
    kunci = sorted(k for k in kata if k[0] == s and k[1] == a) if False else None
    ws = []
    w = 1
    while (s, a, w) in kata:
        ws.append(sorted(kata[(s, a, w)])); w += 1
    token = teks.split()
    kunci_kata = [key_ar("".join(x[1] for x in segs)) for segs in ws]
    pasangan = None  # teks Tanzil untuk tiap kata korpus (1 kata korpus boleh = 2 kata Tanzil)
    if len(token) == len(ws):
        pasangan = token
    elif len(token) == len(ws) + 1:
        pasangan = cocokkan_gabungan(token, kunci_kata)
        if pasangan: lap["digabung"].append((s, a))
    sama = pasangan is not None
    if not sama: lap["ayat_tak_cocok"].append((s, a, len(token), len(ws)))
    for i, segs in enumerate(ws):
        word_id += 1; lap["kata"] += 1
        lem = None; rid = None; pos = None
        bwf = "".join(x[1] for x in segs)
        for _, f, t, feat in segs:
            if feat.startswith("STEM") or "STEM" in feat.split("|")[:1]:
                m = re.search(r"LEM:([^|]+)", feat); lem = bw2ar(m[1]) if m else lem
                m = re.search(r"ROOT:([^|]+)", feat)
                if m:
                    if m[1] not in root_id:
                        root_id[m[1]] = len(root_id) + 1
                        db.execute("INSERT INTO root VALUES(?,?,?)", (root_id[m[1]], bw2ar(m[1]), m[1]))
                    rid = root_id[m[1]]
                m = re.search(r"POS:([^|]+)", feat); pos = m[1] if m else pos
        if rid is None: lap["tanpa_akar"] += 1
        if sama:
            t_ar, sumber = pasangan[i], "tanzil"; lap["cocok_tanzil"] += 1
        else:
            t_ar, sumber = bw2ar(bwf), "korpus"
        db.execute("INSERT INTO word VALUES(?,?,?,?,?,?,?,?,?,?)", (word_id, ayah_id, i+1, t_ar, norm(t_ar), sumber, lem, rid, pos, bwf))

db.executescript("""
CREATE INDEX i_word_root ON word(root_id);
CREATE INDEX i_word_norm ON word(teks_norm);
CREATE INDEX i_word_ayah ON word(ayah_id);
CREATE INDEX i_ayah_surah ON ayah(surah_id, nomor);
""")
db.commit()

n_root = db.execute("select count(*) from root").fetchone()[0]
with open(OUT / "laporan-pemeriksaan.txt", "w", encoding="utf-8") as f:
    f.write("LAPORAN PEMERIKSAAN DATABASE\n")
    f.write(f"Ayat: {lap['ayat']} (harapan 6236)\n")
    f.write(f"Basmalah tempelan di ayat 1 yang dipisahkan dari kolom teks: {lap['basmalah_dibuang']} (teks asli utuh tetap di teks_tanzil_asli)\n")
    f.write(f"Kata: {lap['kata']} (harapan 77429)\n")
    f.write(f"Akar berbeda: {n_root}\n")
    f.write(f"Kata tanpa akar (partikel dsb.): {lap['tanpa_akar']}\n")
    f.write(f"Kata yang teksnya diambil apa adanya dari Tanzil: {lap['cocok_tanzil']}\n")
    f.write(f"Ayat yang dicocokkan dengan memetakan 1 kata korpus ke 2 kata Tanzil: {len(lap['digabung'])} -> " + ", ".join(f"{x}:{y}" for x, y in lap["digabung"]) + "\n")
    f.write(f"Ayat yang jumlah katanya TIDAK cocok antara Tanzil dan korpus: {len(lap['ayat_tak_cocok'])}\n")
    f.write("(untuk ayat itu teks kata dibuat dari konversi korpus, sumber_teks='korpus')\n")
    for s, a, x, y in lap["ayat_tak_cocok"]: f.write(f"  {s}:{a}  Tanzil={x} kata, korpus={y} kata\n")
print("Selesai. Ayat", lap["ayat"], "| kata", lap["kata"], "| akar", n_root, "| ayat tak cocok", len(lap["ayat_tak_cocok"]))
