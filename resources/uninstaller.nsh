; Custom NSIS uninstaller hook for Bodhaka Dispatcher
; Removes all application data (including the consent/acceptance record)
; so that a fresh install always re-prompts for consent.

!macro customUnInstall
  ; Remove the app's data folder in AppData\Roaming
  RMDir /r "$APPDATA\Bodhaka Dispatcher"
  ; Also clean up any legacy folder from the old product name
  RMDir /r "$APPDATA\Student Agent Builder"
!macroend
