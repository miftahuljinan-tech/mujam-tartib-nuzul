# NOTICE — Mu'jam Tartib Nuzul

Hak cipta (C) 2026 Miftahul Janah.

## Lisensi karya ini

| Bagian | Lisensi |
|---|---|
| Kode aplikasi dan skrip (`app/`, `pipeline/Skrip/`, `.github/`) | GNU General Public License v3.0 atau yang lebih baru (berkas `LICENSE`) |
| Data buatan pengembang: `pipeline/Data-Mentah/tartib_*`, `pipeline/Data-Mentah/pengecualian_ayat.json`, `docs/pengecualian-ayat.xlsx` | Creative Commons Atribusi-BerbagiSerupa 4.0 Internasional (berkas `LICENSE-DATA.md`) |

Kedua lisensi mewajibkan Anda menyebut nama penyusun dan tetap membuka turunannya dengan lisensi yang sama.

## Komponen pihak ketiga

Komponen berikut **tidak** tercakup oleh lisensi di atas. Masing-masing tetap berada di bawah ketentuannya sendiri. Berkas aslinya disimpan **tanpa diubah** di `pipeline/Data-Mentah/`, dan aplikasi dibangun dari berkas itu oleh skrip di `pipeline/Skrip/`. Blok hak cipta di bawah disalin apa adanya dari berkas tersebut.

### 1. Teks al-Qur'an — Tanzil Project (`quran-uthmani.txt`)

Sumber: <http://tanzil.net>

```
# PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK
#====================================================================
#
#  Tanzil Quran Text (Uthmani, Version 1.1)
#  Copyright (C) 2007-2026 Tanzil Project
#  License: Creative Commons Attribution 3.0
#
#  This copy of the Quran text is carefully produced, highly 
#  verified and continuously monitored by a group of specialists 
#  at Tanzil Project.
#
#  TERMS OF USE:
#
#  - Permission is granted to copy and distribute verbatim copies 
#    of this text, but CHANGING IT IS NOT ALLOWED.
#
#  - This Quran text can be used in any website or application, 
#    provided that its source (Tanzil Project) is clearly indicated, 
#    and a link is made to tanzil.net to enable users to keep
#    track of changes.
#
#  - This copyright notice shall be included in all verbatim copies 
#    of the text, and shall be reproduced appropriately in all files 
#    derived from or containing substantial portion of this text.
#
#  Please check updates at: http://tanzil.net/updates/
#
#====================================================================
```

Catatan penggunaan: teks ayat tidak diubah. Pada tampilan aplikasi, basmalah yang menempel di awal ayat pertama tiap surah (kecuali al-Fatihah dan at-Taubah) dipisahkan dari ayat tersebut; teks aslinya disimpan utuh di basis data (kolom `teks_tanzil_asli`).

### 2. Anotasi morfologi — Quranic Arabic Corpus (`quranic-corpus-morphology-0.4.txt`)

Sumber: <http://corpus.quran.com>

```
# PLEASE DO NOT REMOVE OR CHANGE THIS COPYRIGHT BLOCK
#====================================================================
#
#  Quranic Arabic Corpus (morphology, version 0.4)
#  Copyright (C) 2011 Kais Dukes
#  License: GNU General Public License
#
#  The Quranic Arabic Corpus includes syntactic and morphological
#  annotation of the Quran, and builds on the verified Arabic text
#  distributed by the Tanzil project.
#
#  TERMS OF USE:
#
#  - Permission is granted to copy and distribute verbatim copies
#    of this file, but CHANGING IT IS NOT ALLOWED.
#
#  - This annotation can be used in any website or application,
#    provided its source (the Quranic Arabic Corpus) is clearly
#    indicated, and a link is made to http://corpus.quran.com to enable
#    users to keep track of changes.
#
#  - This copyright notice shall be included in all verbatim copies
#    of the text, and shall be reproduced appropriately in all works
#    derived from or containing substantial portion of this file.
#
#  Please check updates at: http://corpus.quran.com/download
```

Catatan penggunaan: berkas dikonversi menjadi basis data pencarian (akar, lemma, kelas kata) oleh `pipeline/Skrip/bangun_database.py`. Berkas aslinya tidak diubah.

### 3. Terjemah — Kementerian Agama RI, 2010 (`id.indonesian.txt`)

Diperoleh melalui Tanzil (<http://tanzil.net>). Berkas ini tidak memuat pernyataan lisensi, hanya keterangan sumber:

```
# --------------------------------------------------------------------
#
#  Quran Translation
#  Name: Bahasa Indonesia
#  Translator: Indonesian Ministry of Religious Affairs
#  Language: Indonesian
#  ID: id.indonesian
#  Last Update: June 4, 2010
#  Source: Tanzil.net
#
# --------------------------------------------------------------------
```

### 4. Font

Amiri Quran, Reem Kufi, dan Montserrat, dilisensikan di bawah SIL Open Font License 1.1. Berkas font dan teks lisensinya diunduh dari <https://github.com/google/fonts> saat aplikasi dibangun dan disertakan di `assets/fonts/` pada paket aplikasi (`OFL-*.txt`).

### 5. Rujukan tartib nuzul dan penetapan periode ayat

Data tartib dan pengecualian ayat disusun dari karya berikut. Teks karya-karya itu tidak disertakan di repositori ini.

- T.A. Amal, *Rekonstruksi Sejarah al-Quran*: tabel Mushaf Kairo (edisi standar Mesir 1342 H), riwayat klasik Ibn 'Abbas, urutan Nöldeke–Schwally, dan kutipan mushaf Ibn 'Abbas menurut al-Syahrastani (dari az-Zanjani).
- Theodor Nöldeke dan Friedrich Schwally, *Geschichte des Qorans* (penomoran ayat Flügel dipetakan ke Kairo).
- Muhammad 'Izzat Darwazah, *at-Tafsir al-Hadits*.
- Muhammad 'Abid al-Jabiri, *Fahm al-Qur'an al-Hakim*.
- al-Syahrastani, sebagaimana dikutip az-Zanjani.

Rujukan rinci per baris ada pada kolom `rujukan` dan `sumber` di berkas data serta pada `docs/pengecualian-ayat.xlsx`.
