; Memasang font Amiri Quran untuk pengguna ini (tanpa hak administrator), agar ayat yang diekspor ke Word
; tampil dengan font yang sama seperti di aplikasi. Berlaku untuk Windows 10 versi 1809 ke atas.
!macro customInstall
  SetOutPath "$LOCALAPPDATA\Microsoft\Windows\Fonts"
  File "${BUILD_RESOURCES_DIR}\AmiriQuran-Regular.ttf"
  WriteRegStr HKCU "Software\Microsoft\Windows NT\CurrentVersion\Fonts" "Amiri Quran (TrueType)" "$LOCALAPPDATA\Microsoft\Windows\Fonts\AmiriQuran-Regular.ttf"
!macroend
!macro customUnInstall
  DeleteRegValue HKCU "Software\Microsoft\Windows NT\CurrentVersion\Fonts" "Amiri Quran (TrueType)"
  Delete "$LOCALAPPDATA\Microsoft\Windows\Fonts\AmiriQuran-Regular.ttf"
!macroend
