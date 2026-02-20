# Rami — Prayer Times App

Expo (SDK 54) app for daily prayer times, countdown to next prayer, local notifications, and optional Azan sound.

## Quick start

```bash
cd Rami
npm install
npx expo start
```

Scan the QR code with Expo Go on your device, or press `i` / `a` for iOS/Android simulator.

## Ljudfiler (Azan)

Placeholder-ljud skapas av `node scripts/create-sounds.js` (korta tysta MP3:er). För riktig azan:

- Lägg **azan1.mp3** och **azan2.mp3** i **`assets/sounds/`**
- Filer måste finnas för att "Test sound" i inställningar ska fungera
- Om filerna saknas vid bygg: Metro kan klaga; kör då `node scripts/create-sounds.js` för placeholders

## Testa notiser

### Emulator / simulator

- **iOS Simulator**: Lokala notiser fungerar. Kör `npx expo run:ios`, vänta tills appen öppnas, aktivera notiser i Inställningar och använd "Refresh schedule".
- **Android Emulator**: Lokala notiser fungerar. Aktivera notisbehörighet när appen frågar; använd "Refresh schedule" efter att bönetider laddats.

### Fysisk enhet (rekommenderat)

- **Expo Go**: `npx expo start` → skanna QR. Notiser fungerar bäst på riktig enhet.
- Godkänn plats och notifieringar när appen frågar.
- Gå till Inställningar → aktivera "Enable notifications" och "Refresh schedule".
- För att verkligen höra en notis: sätt en bönetid 1–2 minuter framåt (t.ex. via tidsändring på enheten), eller vänta till nästa bön.

### Kända begränsningar

- **iOS**: Notisljud är begränsat till ca 30 sekunder. Vid tryck på notisen öppnas appen; om "Play Azan sound" är på spelas full azan i appen.
- **Android**: Tyst läge styrs av notiskanalens inställningar. Se "Known limitations" i Inställningar i appen.

## Projektstruktur

```
Rami/
├── app/                    # Expo Router
│   ├── _layout.tsx
│   ├── index.tsx
│   └── settings.tsx
├── assets/
│   └── sounds/             # azan1.mp3, azan2.mp3
├── src/
│   ├── constants/i18n.ts
│   └── features/prayer/
│       ├── api/aladhan.ts
│       ├── hooks/usePrayerTimes.ts
│       ├── storage/prayerSettings.ts
│       ├── notifications/scheduler.ts
│       ├── components/NextPrayerCard.tsx
│       ├── screens/PrayerTimesScreen.tsx
│       ├── screens/PrayerSettingsScreen.tsx
│       └── utils/nextPrayer.ts, playAzan.ts
└── scripts/create-sounds.js
```

## Teknisk översikt

- **Bönetider**: AlAdhan API (lat/long), cache per datum i AsyncStorage.
- **Plats**: expo-location vid start; sparad plats i AsyncStorage om användaren sätter manuell plats.
- **Notiser**: expo-notifications, lokala påminnelser per bön för dagens datum; "Refresh schedule" uppdaterar schemat.
- **Ljud**: expo-audio; "Test sound" i inställningar och vid tryck på notis (om "Play Azan sound" är på).
- **Språk**: Engelska + arabiska via enkel i18n i `src/constants/i18n.ts`.
