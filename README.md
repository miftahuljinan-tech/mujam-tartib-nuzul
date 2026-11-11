# Mu'jam Tartib Nuzul

Aplikasi Android offline untuk mencari akar atau kata dalam al-Qur'an dan menampilkan hasilnya menurut tartib mushaf atau tartib nuzul. Dibuat untuk membantu mahasiswa dan peneliti tafsir maudhu'i. Gratis, tanpa iklan, tanpa izin internet.

Pengembang: Miftahul Janah.

## Fitur

- Pencarian menurut akar atau bentuk kata, dengan papan ketik Arab dan pencarian dua akar sekaligus.
- Enam versi tartib: Mushaf Kairo 1924, Nöldeke–Schwally, Darwazah, riwayat klasik (Ibn 'Abbas), Ibn 'Abbas menurut al-Syahrastani, dan al-Jabiri.
- Pengecualian periode tingkat ayat (⚑) dengan sumber dan status.
- Penyaringan periode, statistik, koleksi tematik, catatan pribadi, cadangan, dan ekspor CSV.
- Salin dan Kutip dengan sitasi lengkap, serta kutipan aplikasi dalam format APA, Chicago, RIS, dan BibTeX.

## Struktur

| Folder | Isi |
|---|---|
| `app/` | Proyek Android (pembungkus WebView, tanpa izin internet) |
| `pipeline/` | Alur pembuatan data: `Data-Mentah/` (sumber), `Skrip/` (skrip dan templat), `Hasil/` (keluaran) |
| `docs/` | Tabel pengecualian ayat |
| `NOTICE.md` | Lisensi dan kredit semua komponen |

## Membangun ulang data

Perlu Python 3.

```
cd pipeline/Skrip
python bangun_database.py
python impor_tartib.py
python impor_pengecualian.py
python buat_aplikasi.py ../Hasil/mujam.db aplikasi-template-android.html ../../app/src/main/assets/mujam-nuzul.html
```

Untuk versi HTML satu berkas (untuk dibuka di peramban), jalankan `python buat_aplikasi.py` tanpa argumen.

## Membangun APK

Repositori ini memuat alur GitHub Actions (`.github/workflows/build-apk.yml`) yang mengunduh font, lalu membangun APK debug.

## Lisensi

- Kode: GNU GPL v3 saja (`LICENSE`).
- Data buatan pengembang: CC BY-SA 4.0 (`LICENSE-DATA.md`).
- Teks Tanzil, anotasi Quranic Arabic Corpus, terjemah Kemenag RI, dan font tetap di bawah ketentuan masing-masing (`NOTICE.md`).

## Kutipan

Janah, M. (2026). *Mu'jam Tartib Nuzul* (Versi 0.6.3) [Aplikasi Android]. https://doi.org/10.5281/zenodo.24106183

DOI: [10.5281/zenodo.24106183](https://doi.org/10.5281/zenodo.24106183). Lihat juga `CITATION.cff`, atau gunakan bagian "Kutip aplikasi ini" di halaman Tentang aplikasi.
