# TODO — Kompletní sjednocení a rozšíření aplikace Firemní Docházka (Web App & Android APK)

Tento dokument obsahuje kompletní seznam chybějících funkcí z původního zadání AI Studia (`cf66a2c8-383c-4be5-bade-042d1600b80c` / `firebase-blueprint.json`), oprav synchronizace mezi platformami a nových praktických vylepšení pro reálný firemní provoz.

---

## FÁZE 1: Datové modely, úložiště a obousměrná synchronizace (`lib/` & `src/`)
- [x] **T1.1 — Model `Absence` v Android APK (`lib/models/absence_model.dart`)**:
  - Typy nepřítomnosti: `vacation` (Dovolená), `doctor` (Lékař / Propustka), `sick` (Nemocenská / PN), `personal` (Osobní volno).
  - Podpora celodenních (`isFullDay`) i hodinových (`startTime` – `endTime`) absencí, stavů `pending`, `approved`, `rejected`.
- [x] **T1.2 — Model `ProjectPhoto` v Android APK (`lib/models/project_photo.dart`)**:
  - Fotodokumentace k zakázkám (`id`, `projectId`, `userId`, `userName`, `photoData`, `caption`, `createdAt`).
- [x] **T1.3 — Model `SalaryAdvance` (Zálohy na mzdu) na Webu i v APK (`lib/models/salary_advance.dart`, `src/types/index.ts`)**:
  - Evidence vyplacených záloh zaměstnancům (`id`, `userId`, `userName`, `monthKey`, `date`, `amount`, `note`, `createdAt`).
- [x] **T1.4 — Rozšíření `FirestoreService` (`lib/services/firestore_service.dart`) a `StorageService` (`src/services/storage.ts`)**:
  - Kompletní reaktivní správa a perzistence na disk + Firestore pro `absences`, `project_photos` a `advances`.
  - Metody `batchApproveAll` (hromadné schválení čekajících směn), `adminUpdateShift` (úprava směny šéfem včetně okamžitého schválení), `updateProject` a `deleteProject`.
- [x] **T1.5 — Oprava real-time synchronizace**:
  - Synchronizace všech 6 kolekcí (`users`, `projects`, `time_entries`, `absences`, `project_photos`, `advances`) mezi Webem a APK, včetně správného promazávání smazaných záznamů při `onSnapshot`.

---

## FÁZE 2: Pohled pracovníka v Android APK (`lib/screens/worker/`) — 100% parita s Webem + vylepšení
- [x] **T2.1 — 3 hlavní záložky v `WorkerDashboard`**:
  1. *Docházka & Stopky*
  2. *Kalendář & Volno*
  3. *Zakázky & Fotky*
- [x] **T2.2 — Dialog ukončení živých stopek (Pauza + Poznámka + Sazba + Koncept/Odeslat)**:
  - Při kliknutí na *Ukončit směnu* otevřít modální okno s výběrem pauzy (`0 / 15 / 30 / 45 / 60 min`), popisem vykonané práce, případnou vlastní sazbou a volbou *Uložit koncept* nebo *Odeslat ke schválení*.
- [x] **T2.3 — 24h denní časová osa (`DayTimeline`)**:
  - Vizuální grafická osa dnešního dne (00:00–24:00) ukazující odpracované směny a právě běžící směnu.
- [x] **T2.4 — Zobrazení GPS záznamu (`GpsLocationDialog`)**:
  - Klikací badge `GPS` u směn i živých stopek s detailem souřadnic startu/konce, přesností v metrech a přímým otevřením v Google Mapách.
- [x] **T2.5 — Záložka Kalendář absencí & Žádost o volno**:
  - Měsíční kalendář s barevným vyznačením dnů, seznamem žádostí pracovníka a formulářem pro podání nové žádosti (Dovolená, Lékař, Nemocenská, Osobní volno).
- [x] **T2.6 — Záložka Seznam zakázek & Fotodokumentace pro pracovníka**:
  - Přehled zakázek zobrazující pouze vlastní hodiny a vlastní výdělek pracovníka na zakázce (soukromí rozpočtu šéfa) + galerie a přidávání fotodokumentace ze stavby/zakázky.
- [x] **T2.7 — Osobní výplatní lístek, Export výkazu a Sdílení aplikace**:
  - Přehledný měsíční výplatní lístek pracovníka (*Schváleno celkem − Zálohy = Doplatek k výplatě*, rozpad po zakázkách, dny volna), export do CSV a modál pro sdílení odkazu na aplikaci / APK.

---

## FÁZE 3: Pohled šéfa / Administrace v Android APK (`lib/screens/admin/`) — 100% parita s Webem + vylepšení
- [x] **T3.1 — 6 sekcí v `AdminDashboard`**:
  1. *Přehled & Grafy* (`AnalyticsTab`)
  2. *Schválení* (`ApprovalTab`)
  3. *Zakázky* (`ProjectsTab`)
  4. *Lidé* (`UsersTab`)
  5. *Kalendář* (`AbsenceCalendarView` se schvalováním dovolených/lékařů a badgem čekajících žádostí)
  6. *Výplaty* (`PayrollExportTab`)
- [x] **T3.2 — Živý panel „Právě na směně (Live)“**:
  - Okamžitý přehled pracovníků, kteří mají v tuto chvíli zapnuté stopky (`isRunning == true`), na jaké zakázce pracují, od kolika hodin, běžící výdělek a GPS lokace.
- [x] **T3.3 — Grafy, Analytika a Rychlé akce (`AnalyticsTab`)**:
  - Hero karta mzdového fondu s rychlými akcemi (*Nová zakázka*, *+ Zaměstnanec*, *Schvalování*, *Export dat*, *Sdílet app*).
  - Týdenní trend hodin a nákladů.
  - Čerpání rozpočtů zakázek.
  - Rozdělení hodin v týmu.
- [x] **T3.4 — Hromadné schválení (`Schválit vše`), Úprava směny šéfem a GPS v `ApprovalTab`**:
  - Tlačítko *Schválit vše* pro schválení všech čekajících směn jedním klikem.
  - Tlačítko *Upravit směnu* umožňující šéfovi opravit časy Od–Do, pauzu, zakázku nebo sazbu a směnu rovnou schválit.
  - Kontrola GPS záznamu přímo na kartě směny.
- [x] **T3.5 — Fotodokumentace zakázek + Úprava a smazání zakázky v `ProjectsTab`**:
  - Tlačítko *Fotky* u každé zakázky, možnost upravit název/klienta/rozpočet zakázky a možnost zakázku smazat.
- [x] **T3.6 — Detail zaměstnance (`EmployeeDetailDialog`) a správa záloh v `UsersTab`**:
  - Detailní karta zaměstnance po kliknutí: rozpad hodin a výdělku po zakázkách, seznam směn, absence a správa vyplacených záloh.
- [x] **T3.7 — Evidence záloh, Čistý doplatek a Pokročilý export v `PayrollExportTab`**:
  - Zobrazení *Schváleno celkem | Vyplacené zálohy | Čistý doplatek k výplatě* u každého zaměstnance i za celou firmu.
  - Pokročilý export (filtr podle zakázky a pracovníka, CSV výkaz).

---

## FÁZE 4: Doplnění nových vylepšení do Web App (`src/`) pro 100% paritu
- [x] **T4.1 — Živý panel „Právě na směně (Live)“ v `AdminDashboard.tsx`**:
  - Zobrazení právě běžících směn zaměstnanců v reálném čase s běžícím výdělkem.
- [x] **T4.2 — Úprava směny šéfem v `AdminDashboard.tsx`**:
  - Možnost šéfa upravit čekající směnu pracovníka a rovnou ji schválit.
- [x] **T4.3 — Evidence záloh (`SalaryAdvance`), Čistý doplatek k výplatě a Výplatní lístek na Webu**:
  - Zadávání záloh u zaměstnanců/v uzávěrce, výpočet čistého doplatku k výplatě v `AdminDashboard.tsx` i v peněžence `WorkerDashboard.tsx`.
- [x] **T4.4 — Ověření kompilace a příprava releasu Web App i Android APK (`v1.0.23+`)**.
