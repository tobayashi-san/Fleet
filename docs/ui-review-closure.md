# Review-Abschlussmatrix

Historisches Prüfprotokoll: Die Nachweislinks zeigen auf einen festen Git-Stand.
Hinweise zum Archiv stehen in der [Dokumentationsübersicht](README.md#historical-review-records).

Stand: 11. September 2026. Quelle: [Originalreview](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/index.html).

Diese Liste erhält alle 10 priorisierten Befunde und alle 35 Feature-Anforderungen. Sie ersetzt keine Abnahme durch Testzahlen. Das chronologische [Implementierungsprotokoll](ui-review-implementation.md) enthält bisherige Änderungen; dessen Einträge allein beweisen keinen vollständigen Abschluss. „Abnahme offen“ bedeutet ausdrücklich nicht, dass noch keine Implementierung existiert.

## Prioritäten und abgeschlossene Hauptblöcke

1. **F34 – lokal abgenommen:** Backup-/Reset-Prüfung, Ziel-/Datenumfang, geschützte Bestätigung und der CLI-Wiederherstellungsweg einschließlich Rollback/Bereinigung sind implementiert. Nachweise stehen unter F34. Kein Produktionsrollout und keine Ausführung gegen externe Workloads erfolgt.
2. **F13 – VM-Lebenszyklus:** Assistent allein reicht nicht: Planung, Apply, Drift und Wiederherstellung mit einer isolierten Test-VM funktional abnehmen. Vor externen Änderungen Ziel und vorhandene Autorisierung prüfen.
3. **F31 – lokal abgenommen:** Paket-/Versionsinventar, Freigabe, Kompatibilität, Rechte und manueller Update-/Rollback-Status sowie aktive Hostseite separat geprüft; Nachweise und Grenzen unter F31.
4. **P1-Befunde:** Dieselben Ressourcen und Ereignisse über mehrere Ansichten vergleichen; Reservierungsstandard und restriktive Benutzeranlage einschließlich tatsächlicher Speicherung prüfen.
5. **Übrige Feature-Abnahme:** Die untenstehenden Anforderungen einzeln an aktueller Implementierung und Verhalten prüfen. Fehlendes beheben, danach passende Nachweise ergänzen. Screenshots für veränderte Seiten aktualisieren; synthetische Fixture-Nachweise ausdrücklich von Live-Prüfungen unterscheiden.

## Abnahmeregel

Ein Punkt wird erst abgeschlossen, wenn sämtliche genannten Teilanforderungen belegt sind. Pro Nachweis: konkrete Datei/Route, Test oder reproduzierbarer Ablauf, Ergebnis sowie relevante Screenshot-Datei. Ein Build belegt keine fachliche Richtigkeit. Eine Fixture belegt keine reale Controller-Ausführung. Bedingte Ausbauvorschläge des Originals bleiben bedingt und werden nicht stillschweigend zu Pflichtprojekten erweitert.

## Priorisierte Befunde

### P1-01 · Zeitangaben konsistent und mit Zeitzone anzeigen

**Status:** Lokal abgenommen.

**Anforderung:** Alle Zeitangaben zentral nach derselben Benutzerzeitzone formatieren. Start, Ende und letzte Aktualisierung ausdrücklich unterscheiden. Zeitzone sichtbar oder per Tooltip ergänzen; absolute Zeit und relative Zeit kombinieren.

**Abnahmekriterium:** Ein identischer Lauf bzw. Sync hat in allen Ansichten dieselbe lokale Uhrzeit; UTC ist eindeutig gekennzeichnet.

**Nachweis:** Noch vollständig zuzuordnen; ursprüngliche Screenshot-Nummern: 2, 16, 25, 27, 32, 50, 62.

**Aktueller Befund:** Gemeinsamer formatDateTime normalisiert SQLite-UTC und zeigt Europe/Zurich. Backup-Freigabe auf diesen Formatter umgestellt. ActivityCenter-Zeiten stammen aus Browserempfang, nicht Serverausführung; Beschriftung und absoluter Tooltip nennen dies ausdrücklich. Browservergleich HistoryTab → OperationExecutionPage für Lauf 42 bestanden: äquivalente SQLite-/ISO-UTC-Werte ergeben identische Start-/Endzeiten 20:00/20:01 Europe/Zurich. Nachweise: verification/history-time-list.png, history-time-detail.png und history-time-review.html. ProxmoxConnectionsCard zusätzlich im Browser mit äquivalentem SQLite-/ISO-Zeitpunkt geprüft: beide zeigen Last synchronized: 9 Sept 2026, 20:00 (Europe/Zurich). Screenshot verification/sync-time-current.png, Fixture sync-time-review.html. GuestTaskHistory zusätzlich mit SQLite-Anfragezeit und ISO-Prüfzeit im Browser bestätigt: Requested 20:00 / Last checked 20:01 Europe/Zurich; Screenshot verification/task-time-current.png und Fixture task-time-review.html. Benutzerübersicht zusätzlich im Browser geprüft: Last login aus SQLite-UTC und MFA-Checked aus numerischem UTC ergeben beide 9 Sept 2026, 20:00 (Europe/Zurich), klar unterschiedlich beschriftet. Nachweis verification/account-time-current.png und account-time-review.html. Operations-Liste im Browser mit laufendem ISO-UTC- und abgeschlossenem SQLite-UTC-Testvorgang bestätigt: Started 20:00 und Completed 20:01 Europe/Zurich, konsistent mit dem bereits verglichenen Detail. Nachweis verification/operations-time-current.png und operations-time-review.html. Hosthistorie im Browser bestätigt: SQLite-Start 18:00Z und ISO-Ende 18:01:30Z zeigen 20:00/20:01 Europe/Zurich und 1m 30s Dauer; Screenshot verification/host-time-current.png und Fixture host-time-review.html. Mobile Hosthistorie um beschriftete Abschlusszeit ergänzt und im 390px-Iframe visuell bestätigt: Start, Abschluss, Zeitzone, Dauer und Logzugang passen ohne Abschneiden. Screenshot verification/host-time-narrow.png; Fixture host-time-narrow.html. Snapshotzeit in VM-Übersicht und Snapshotliste im Browser identisch bestätigt: Epoch-Sekunden für 18:00Z werden als 9 Sept 2026, 20:00 (Europe/Zurich) dargestellt. Nachweis verification/snapshot-time-current.png und snapshot-time-review.html. Die ursprünglichen Ansichten sind damit für absolute Zeitwerte verglichen. Noch offen: Anforderung zur Kombination relativer und absoluter Zeiten sowie Konsistenz der optionalen 12h/24h-Anzeige abschließend prüfen.

**Abschlussnachweis:** Gemeinsame Timestamp-Komponente verbindet sichtbare absolute Zeit/Zeitzone mit relativem Alter in Operations, Laufhistorie/-details, Hosthistorie, Infrastruktur-Taskhistorie, Proxmox-Sync, Snapshots und letztem Login. Absolute und relative Darstellung in diesen Ansichten lokal im Browser geprüft; 390px-Nachweise für Operations/Hosthistorie nach Layoutkorrektur. Weitere aktuelle Screenshots: verification/history-relative-current.png, operations-relative-narrow.png, host-relative-narrow.png, task-relative-current.png, sync-relative-current.png, account-relative-current.png, snapshot-relative-current.png. Die letzten drei Screenshots visuell auf vollständige Lesbarkeit geprüft. 12h-Liste/Details stimmen überein (history-clock-12h.png); zentrale Formatierung respektiert gespeicherte Präferenz. 14 Datumstests und 4 Timestamp-Komponententests bestanden. Ausführungszeit, Synczeit, letzte Prüfung und Browserempfang bleiben ausdrücklich unterschieden. Browserantworten waren synthetisch; kein Produktionsrollout oder Controller-Schreibzugriff.

### P1-02 · Gesundheitszustand und Datenquellen widerspruchsfrei machen

**Status:** Lokal abgenommen.

**Anforderung:** OS-, Image- und Custom-Updates getrennt benennen und im Gesamthealth aggregieren. Quelle, Erhebungszeit und Veraltungsstatus anzeigen. Abweichende Updatekataloge erklären statt kommentarlos verschiedene Summen zu zeigen.

**Abnahmekriterium:** Image-Updates führen nicht zu einer pauschalen grünen Update-Zusammenfassung; Abweichungen zwischen Inventaren sind nachvollziehbar.

**Nachweis:** Noch vollständig zuzuordnen; ursprüngliche Screenshot-Nummern: 1, 10, 14, 49, 55.

**Abschlussnachweis (11. September):** Dashboard, Hostübersicht, Workloads und Custom-Update-Details unterscheiden OS-Pakete, Container-Images und Custom-Checks. Fehlende beziehungsweise veraltete OS-, Image- oder Custom-Kataloge ergeben keine grüne Gesamtbehauptung; der Dashboardzähler umfasst nur gemeldete Resultate und weist auf unvollständige Prüfungen hin. [Dashboard-Warnzustand](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/dashboard-image-stale-final.png). Nach bestätigter Aktualität verschwindet der Warnzustand im reproduzierbaren Browserablauf.

**Quellen- und Konsistenznachweis:** Die Hostübersicht aggregiert direkte Katalogresultate mit Attention-Daten, ohne doppelte Container-/Image-Schlüssel zu zählen. Unterschiedliche explizite Zahlen erscheinen als `catalog …, inventory …; refresh both sources`. [Image-Detailvergleich](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/image-catalog-consistency-final.png) zeigt Erhebungszeit, Europe/Zurich, Quelle, Aktualität und denselben betroffenen Container; [Custom-Detailvergleich](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/custom-catalog-consistency-final.png) zeigt bekannten Updatezustand, fehlgeschlagenen letzten Versuch, letzten Erfolg und SSH-Quelle. F09 ergänzt Paketquelle, Zeitpunkt, Veraltung und getrennte Katalogerklärung. Der Proxmox-Paketbereich bleibt ausdrücklich ein eigener Node-Katalog, sodass seine Zahl nicht als Host-OS-Zahl ausgegeben wird.

**Funktionale Prüfung:** `p1-02-closure-check.cjs` prüft die Ansichtswechsel mit tatsächlichen Komponenten und synthetischen Antworten. Elf Backendtests aus `dashboard-update-overview`, `server-inventory-state` und `server-attention` bestanden und belegen identische, berechtigungsgebundene Dashboard-/Inventarfelder, Katalogzeit, Veraltung und kanonische Attention-Gründe. 17 Frontendtests bestanden für Aggregation, Abweichungen, Freshness und Dringlichkeit. Keine produktive OS-, Registry- oder Custom-Prüfung ausgeführt.

### P1-03 · Host, Inventar-VM und deklarativ verwaltete VM verständlich verbinden

**Status:** Lokal abgenommen.

**Anforderung:** Drei eindeutige Managementzustände verwenden: Inventar, Hostbetrieb aktiv, deklarativ verwaltet. In jeder Ansicht beide Namen und Beziehungen zeigen. Baumklicks konsistent halten; Host- und VM-Ansicht ausdrücklich umschaltbar machen. Zähler nach derselben Definition berechnen.

**Abnahmekriterium:** Jede Zahl hat einen eindeutigen Geltungsbereich; dieselbe Ressource bleibt über Navigation und Aktionen eindeutig identifizierbar.

**Aktueller Nachweisstand:** Host-/VM-Detailzuordnung, konsistente Kontextzustände, abweichende Namen, getrennte Baumlinks, Aliasfilter und Zählerumfang sind implementiert und mit tatsächlichen Komponenten sowie ausdrücklich synthetischen Browserdaten geprüft. Nachweise unter `artifacts/ui-review-2026-09-09/verification/`: `vm-definition-identity-current.png`, `host-management-current.png`, `tree-identity-current.png`, `tree-mixed-current.png`, `tree-count-current.png`. Die API-Namenszuordnung ist mit echter Route und isolierter SQLite in `server/test/managed-host-identity.test.js` geprüft, einschließlich eingeschränkter Rollen; `inventory-guest-name.test.js` prüft eindeutige Quellzuordnung.

**Abschlussnachweis (11. September):** Plattformübersicht, Nodebestand, Baum, VM-/CT-Inventar, Guestdetail und VM-Definition verwenden stabile Plattform-/Node-/Guest-/Host-/Workspace-IDs. Sie zeigen getrennt `Inventory`, `Host operations enabled` und `VM definition` sowie bei abweichenden Namen sowohl Guest- als auch Host-/Definitionsnamen. VM und Host besitzen getrennte Links; die Definition verlinkt zurück zum Inventarobjekt. Zähler heißen Nodes, VMs/containers und with host operations, sodass Hostbetrieb nicht als deklarative Verwaltung gezählt wird. Browsernachweise: `vm-definition-identity-current.png`, `host-management-current.png`, `tree-identity-current.png`, `tree-mixed-current.png`, `tree-count-current.png`, [Guestdetail mit beiden Beziehungen](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/vm-definition-identity-current.png) und [vollständige Infrastrukturübersicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/infrastructure-overview-retained.png). API- und UI-Tests für stabile Namenszuordnung, eingeschränkte Rollen und direkte Navigation sind in den bestandenen F19/F21-Suiten enthalten. Browserdaten waren synthetisch; keine Infrastruktur wurde verändert. Ursprüngliche Screenshots: 20, 44, 47, 61, 68, 70.

### P1-04 · Reservierungsformular mit passendem Standard öffnen

**Status:** Lokal abgenommen.

**Anforderung:** Reserved vorauswählen und die nächste freie Adresse vorbefüllen. Präfix und Quelle im Formular zeigen; bei Wechsel auf Active die Bedeutung erklären.

**Abnahmekriterium:** Der Standardpfad einer Reservierung erzeugt eine Reservierung und bleibt im gewählten Präfix.

**Nachweis:** `frontend-next/src/routes/network-detail.tsx`: openAddressReservation setzt Reserved bei jedem Öffnen und übernimmt next_free_address; Mutation übergibt Status an den ausgewählten Subnet-Endpunkt mit expliziter Zielumgebung. Browser am 11. September: Reserve address öffnet Reserved und 192.0.2.1, zeigt Prefix 192.0.2.0/24 und Source Manual; Wechsel auf Active erklärt bereits verwendete gegenüber künftig reservierter Adresse. Aktueller Screenshot `artifacts/ui-review-2026-09-09/verification/reservation-default-current.png` visuell geprüft; Fixture `verification/reservation-review.html`. Aktuell 41 Tests in `server/test/ipam-route.test.js` bestanden. Der dedizierte Review-Reservierungstest verwendet tatsächliche HTTP-Routen und SQLite: Gateway übersprungen, nächste freie .2 reserviert, Datenbankstatus reserved und source_type manual, Allokationsliste bestätigt Status, nächste Adresse .3, Duplikat HTTP 409, fremde/Netz-/Broadcastadresse HTTP 400, exakt ein Datensatz im Zielpräfix. Keine produktive Reservierung ausgeführt. Ursprüngliche Screenshots: 41, 42.

### P1-05 · Standardrolle bei neuen Benutzern transparenter und restriktiver gestalten

**Status:** Lokal abgenommen.

**Anforderung:** Viewer oder explizite Rollenauswahl als Standard. Effektive Ressourcen und sensible Fähigkeiten direkt im Benutzerformular zusammenfassen. Die bestehenden guten Rollen-Presets dort integrieren.

**Abnahmekriterium:** Vor dem Erstellen sind Umfang und sensible Fähigkeiten sichtbar; ein neuer Benutzer erhält nicht implizit umfassende Betriebsrechte.

**Nachweis:** `UserFormDialog` in `frontend-next/src/routes/settings/tabs/users-roles.tsx` initialisiert neue Konten mit leerer, explizit zu wählender Rolle; Speichern ohne Auswahl oder ohne verfügbare effektive Berechtigungen ist gesperrt. Ressourcen und sensible Fähigkeiten erscheinen vor dem Speichern, Rollenrevision wird mitgegeben. Browser am 11. September mit tatsächlichem Dialog: zunächst Select a role und deaktiviertes Create invitation; Viewer-Preset empfiehlt ausschließlich Inventory observer mit passenden Leserechten, nicht die absichtlich irreführend Viewer benannte Rolle mit Terminalrecht. Auswahl zeigt Operations team, inspect.yml, keine Plugins und keine sensiblen Rechte; manuelle Auswahl der breiteren Rolle zeigt All hosts/All playbooks und Use Terminal. Screenshot `verification/user-access-current.png` visuell geprüft, reproduzierbare Fixture `verification/user-default-current.html` unter artifacts/ui-review-2026-09-09.

10 aktuelle Tests in `server/test/user-role-assignment.test.js` und `user-invitations.test.js` bestanden: fehlende Rolle abgewiesen, fehlende/veraltete Revision abgewiesen, Rollenänderung während Hashing erzeugt kein Konto, erfolgreiche direkte Anlage/Einladung übernehmen die ausgewählte Rolle, Auditausfall hinterlässt kein Konto. Browserdaten synthetisch, API-/Persistenztests mit isolierter SQLite; keine produktiven Benutzer angelegt. Ursprüngliche Screenshots: 33, 34, 73.

### P2-01 · Technische Ereignisse in verständliche Aufgaben übersetzen

**Status:** Lokal abgenommen.

**Anforderung:** Lesbare Aktionsnamen, stabile Ressourcennamen auch nach Löschung, Detail-Deep-Links zum konkreten Run, Laufzeit, Ergebniszusammenfassung und verlinkte Logs ergänzen.

**Abnahmekriterium:** Ein Benutzer kann aus einer Zeile direkt den betroffenen Lauf und dessen Ergebnis öffnen.

**Aktueller Abnahmestand:**

- Direkte Laufnavigation: Desktop- und 390px-Mobilroute mit tatsächlicher OperationsPage/OperationExecutionPage geprüft (`verification/operations-direct-navigation-review.html`, `operations-direct-mobile-review.html`). Zwei IDs liefern jeweils eigene Details und Logs; Rückkehr geprüft. API-Zugriff separat durch Operations-Routentests abgesichert.
- Historische Hostnamen: API-Test „deleted host executions retain their original name only for complete host scope“ prüft ursprünglichen Namen nach Umbenennung/Löschung, erhaltenes Log und Ausschluss eingeschränkter Rollen. Workflow-Historie besitzt einen eigenen Test nach Zeitplanänderung/-löschung.
- Laufzeit und Zusammenfassung: API-Tests prüfen SQLite/ISO-Zeiten, fehlende/ungültige/rückwärts laufende Zeiten, Fehler vor Cleanup sowie unveränderte Logs. Detailseiten zeigen bei aktiven Vorgängen ausstehende Zeiten ausdrücklich an.
- Fehlerzustände: Einzelabfrage des Hostlogs sowie Operations-Ausführungsseite nach Ladefehler und Wiederholung im Browser geprüft. Filterfehler-Rückkehr ebenfalls geprüft.
- Auditlinks: Mehrere Ressourcen werden dargestellt; gelöschte Hosts/Präfixe verweisen nicht auf gleichnamige Ersatzobjekte. Umfangreiche API-/Renderingtests sind den Nachprüfungen unten zugeordnet.

**Abschlussnachweis (11. September):** Operations, Dashboard, Audit, Hosthistorie, Workflowhistorie und Infrastruktur-Tasks verwenden lesbare bekannte Aktionsnamen; unbekannte Codes werden in Wörter zerlegt, während die technische ID nur in Diagnosekontexten erhalten bleibt. Jede Operationszeile/Mobilkarte öffnet den konkreten Lauf, gruppierte Synchronisierungen listen alle zugelassenen Einzelausführungen. Detailseiten und eingebettete Details zeigen Ziel, Auslöser, Start/Ende, Laufzeit, Ergebnis und exakt zugehöriges Log; fehlende oder rückwärts laufende Zeiten werden nicht als Null ausgegeben. Gelöschte Hosts und Schedules behalten ihren aufgezeichneten Namen und verlinken nie auf einen gleichnamigen Ersatz.

Browsernachweise umfassen `operations-direct-navigation-review.html`, `operations-direct-mobile-review.html`, `operations-group-navigation-review.html`, [Operations mit Ergebnis und Log](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/operations-activity-final.png), [Hosthistorie](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/host-history-filters-final.png), [Audit-Diffs](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/maintenance-audit-before-after.png) und [Infrastruktur-Taskverlauf](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/snapshot-history-checked.png). Die abschließenden 27 Operations-Backendtests und 18 fokussierten Frontendtests bestanden; F04, F10, F17 und F24 ergänzen die quellenspezifischen Tests. Browserdaten waren synthetisch; keine Aktion wurde ausgeführt. Ursprüngliche Screenshots: 2, 5, 16, 50.

### P2-02 · Große Formulare in prüfbare Schritte aufteilen

**Status:** Lokal abgenommen.

**Anforderung:** VM-Assistent: Vorlage → Ressourcen → Netzwerk/Zugriff → Automatisierung → Zusammenfassung. Expertenoptionen ausblenden, Vorlagenwerte ableiten, Einheiten vereinheitlichen, feldnahe Fehler und eine dauerhaft sichtbare Zusammenfassung ergänzen.

**Abnahmekriterium:** Vor dem Speichern sind Ziel, Ressourcenumfang, Netzwerk, Zugriff und ausgelöste Schritte auf einer Review-Seite sichtbar.

**Abschlussnachweis (11. September):** Der VM-Dialog führt durch `Template & identity`, `Resources`, `Network & access`, `Automation` und `Review`. Direkte Schrittnavigation validiert die dazwischenliegenden Felder; Fehler erscheinen am Feld. Vorlagen liefern ihre gespeicherten Abhängigkeiten, ein Debian-Template erhält keinen erfundenen Ubuntu-Login. RAM wird durchgehend in MiB/GiB und Disk in GiB gezeigt; Clone attempts liegt unter erweiterten Compute-Optionen. Der Netzschritt kann ein IPAM-Präfix wählen und die frisch geladene nächste Adresse, Prefix und Gateway übernehmen, ohne eine Reservierung vorzutäuschen. Die Abschlussseite zeigt Plattform/Node/Template, CPU/RAM/Disk, Netzwerk/Gateway, Login/DNS/SSH-Key-Variable, Pre-/Post-Workflows, Agent/Start und Expertenoptionen vor `Save VM definition`.

Entwürfe überleben Hintergrundaktualisierungen; eine geänderte gespeicherte Definition sperrt das Speichern und erhält den Benutzerentwurf. Visuell geprüft: [vollständige Review-Seite](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/vm-review.png), [IPAM-Auswahl](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/vm-ipam-selected.png) und [Konflikt mit erhaltenem Entwurf](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/vm-draft-conflict.png). Validierung und Blueprintnormalisierung sind in den bestandenen 39 Frontend- und 38 OpenTofu-Backendtests enthalten. Dies schließt den Formularpunkt; die reale Plan/Apply/Drift/Recovery-Abnahme bleibt korrekt separat unter F13 offen. Ursprüngliche Screenshots: 9, 22, 28, 34.

### P2-03 · Leere oder unbekannte Metriken erklärbar machen

**Status:** Lokal abgenommen.

**Anforderung:** Explizite Zustände mit Grund, Datenquelle und Zeitpunkt. Agent konfiguriert von Agent erreichbar unterscheiden. Gestoppt nicht als Unknown darstellen. Dezimalwerte für CPU-Kerne und Details zur Image-Prüfbarkeit ergänzen.

**Abnahmekriterium:** Jede fehlende Metrik nennt einen Grund oder nächsten Schritt; Rundungen erzeugen keine widersprüchlichen Werte.

**Aktueller Nachweisstand:** Plattform-/Node-Aggregate unterscheiden fehlende CPU-/RAM-Werte von gemessener Nullnutzung (`platform-capacity.test.ts`, `detail-model.test.tsx`, Browserfixtures `platform-missing-capacity-review.html`, `platform-missing-capacity-mobile.html`, `object-missing-capacity-review.html`). Datastore-Auswahl verwendet gemeinsame Status-/Messwertprüfung (`datastores.test.tsx`, `platform-storage-state-review.html`). Die VM-Detailroute erklärt fehlende Messungen und gestoppte Gäste (`guest-metrics.test.ts`, `vm-missing-metrics-review.html`, `vm-running-metrics-review.html`). Image-Prüfbarkeit nennt Gründe und nächste Schritte (`docker-image-help-review.html`). Agent-lastSeen nutzt Timestamp, fehlende Berichte sind explizit (`host-agent-report-review.html`). Sämtliche Browserdaten dieser Nachweise sind synthetisch.

**Abschlussnachweis (11. September):** Die vollständige Hostübersicht wurde unter F07 visuell geprüft und unterscheidet `Host operations enabled`, installierten Agent und bestätigte Agent-Erreichbarkeit. Messquelle, Erhebungszeit, Cachezustand und kurze Verläufe sind sichtbar. Storage zeigt Mountstatus und unbekannte Kapazität ausdrücklich; Docker unterscheidet fehlende Samples, regulär gestoppte Container, fehlerhafte Exits und Image-Prüfgründe. Plattform-, Node-, Datastore- und VM-Ansichten bewahren gemessene Nullwerte sowie dezimale CPU-Werte und erklären fehlende Messungen beziehungsweise gestoppte Gäste. Nachweise: [vollständige Hostübersicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/host-overview-trends-final.png), [Storage-Zustände](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/host-storage-states-final.png), `platform-missing-capacity-review.html`, `object-missing-capacity-review.html`, `vm-missing-metrics-review.html`, `vm-running-metrics-review.html`, `docker-image-help-review.html`, `docker-lifecycle-review.html` und `host-agent-report-review.html`. Die komplette Frontend-Suite bestand mit 66 Dateien und 300 Tests; TypeScript und die 32 betroffenen Host-Backendtests bestanden. Browserdaten waren synthetisch, die Host-Snapshothistorie und Quellenpersistenz sind mit isolierter SQLite getestet. Ursprüngliche Screenshots: 12, 44, 47, 57, 58.

### P2-04 · Betriebseingriffe besser in Change-Prozesse einbetten

**Status:** Lokal abgenommen.

**Anforderung:** Ressourcen- und Teamauswahl, Konflikthinweise, Wartungsbezug und Change-Referenz ergänzen. Force stop in ein Gefahrenmenü verschieben. Snapshot-Restore anbieten oder klar zu Proxmox führen. Vor Updates Rebootbedarf und betroffene Dienste zusammenfassen.

**Abnahmekriterium:** Jeder kritische Ablauf erläutert Ziel, Auswirkungen und Wiederherstellungsmöglichkeiten; Ausführungsdialoge separat funktional testen.

**Abschlussnachweis (11. September):** Wartungsfenster unterstützen Ressourcen- und Teamauswahl, Change-Referenz, Wiederholung, Zeitzone und Konflikthinweise; dies ist in [Wartungsplanung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/maintenance-planning-final.png) geprüft. Kritische Gastaktionen nennen exaktes Ziel und Auswirkung; `Force stop` liegt im Gefahrenbereich und liefert ein objektspezifisches Ergebnis ([Gastaktion](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/guest-power-result.png)). Snapshot-Restore ist mit Schutz-, RAM-, Konsistenz- und Wiederherstellungshinweisen sowie dauerhaftem Taskverlauf umgesetzt ([Restore-Ergebnis](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/snapshot-restoration-result.png)). Paketupdates zeigen vor der Ausführung mögliche Dienstneustarts/Reboot, das passende Wartungsfenster und Release-Informationen ([Updateauswirkungen](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/proxmox-updates-final.png)). Die jeweiligen Frontend- und Backendtests sowie getrennten Browserchecks bestanden; alle Browserdaten und schreibenden Antworten waren synthetisch. Ursprüngliche Screenshot-Nummern: 4, 55, 57, 59.

### P2-05 · Sprache, Beschriftungen und Tabellenhierarchie vereinheitlichen

**Status:** Lokal abgenommen.

**Anforderung:** Eine konsequente UI-Sprache, gemeinsames Glossar und Statusvokabular. Kürzere Seitentexte, kompaktere Statusleisten, gut lesbare Sekundärtexte, konsistente Tabellenwerkzeuge und kontextbezogene Hilfe.

**Abnahmekriterium:** Keine gemischten Sprachen oder internen Aktionscodes im Standardpfad; Kernaufgaben sind im ersten Bildschirm sichtbar.

**Abschlussnachweis (11. September):** Englisch ist die einzige Produktoberflächensprache; eine frühere Browser-Sprachwahl wird entfernt und `ui-language.test.ts` prüft sämtliche TypeScript-/TSX-Oberflächen auf deutsches Restvokabular und alte Objektbegriffe. IPAM-Texte laufen vollständig über den englischen Übersetzungskatalog. Gemeinsame Statusübersetzer verhindern interne Ausführungscodes im Standardpfad; Operations, Audit, Playbook Runs, Snapshots und Gastaktionen zeigen lesbare Zustände. Kompakte Statusleisten, einheitliche Tabellenwerkzeuge, Sekundärtext-Kontraste und kontextbezogene Hilfen wurden in den jeweiligen Feature-Nachweisen visuell geprüft. Die 29 gezielten Sprach-, Status- und UI-Vertragstests bestanden. Beispielnachweise: [Operations](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/operations-activity-final.png), [Audit](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/audit-export-policy-final.png), [Infrastruktur](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/infrastructure-overview-retained.png), [Playbook-Inventar](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/playbook-release-final.png) und [Plattformverbindung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/proxmox-connection-test-final.png). Ursprüngliche Screenshot-Nummern: 2, 7, 45, 52, 63, 65.

## Feature-Anforderungen

### F01 · Dashboard

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshot 1 erfüllt.

**Anforderung:** Nach Dringlichkeit sortieren; Auswirkungen, Datenalter und direkt passende nächste Aktionen anbieten.

**Zusätzlicher Prüfkontext – Informationen:** Die fünf Statusgruppen und betroffenen Hosts sind nützlich. Schweregrad, Alter und Updatearten bleiben zu wenig differenziert.

**Eingaben:** Drill-downs sind passend; ein sichtbarer Zeitraum für Failed operations würde die Interpretation verbessern.

**UI:** Ruhige Gestaltung und klare Tabelle. Die Attention-Sektion wiederholt Überschriften und nutzt viel Fläche.

**Abschlussnachweis (11. September):** Die Attention-Liste sortiert kritische Hosts vor Warnungen und anschließend stabil nach natürlichem Hostnamen; drei Frontendtests sichern diese Reihenfolge. Der sichtbare Grund nennt die Auswirkung pro Host (zum Beispiel RAM-Kapazität oder getrennte OS-/Image-/Custom-Updates). Der Kopf zeigt das Alter der Dashboarddaten, markiert Werte nach 75 Sekunden als veraltet und nennt das automatische 30-Sekunden-Intervall. Kritische Hosts, Updates, aktive Operationen und nicht bestätigte Fehlschläge sind direkte Links mit passendem Zielfilter; der Zeitraum der Fehlschläge ist ausdrücklich `All retained history`. Der Fehlschlagzähler stammt aus der autoritativen Operations-Abfrage. Bei deren Ausfall zeigt die Kachel einen Gedankenstrich, eine konkrete Fehlermeldung und `Try again`, statt einen falschen Nullwert oder Altwert zu verwenden.

**Prüfung:** Elf Backendtests für Dashboard-Historie, Updateübersicht und serverseitige Attention sowie drei Frontendtests für die Priorisierung bestanden. Visuell geprüft: [priorisierte Attention-Liste](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/dashboard-priority.png), [Fehlerzustand des Operationszählers](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/dashboard-counts-error.png) und [unvollständige/veraltete Update-Ergebnisse](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/dashboard-image-stale-final.png). Die Browserdaten waren synthetisch; es wurden keine Operationen ausgelöst.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 1.

### F02 · Operations / Activity

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshot 2 erfüllt.

**Anforderung:** Konkrete Run-Links, Ergebniszusammenfassung, Dauer und Logs ergänzen; Statusleiste komprimieren.

**Zusätzlicher Prüfkontext – Informationen:** Zeit, Auslöser, Ziel und Status sind vorhanden. Technische Namen, UUID-Ziele und eine weitgehend redundante Detailkarte reduzieren den Nutzen.

**Eingaben:** Quelle, Status, Suchtext und Datumsbereich passen. Kalender und gespeicherte Filter wären hilfreicher als reine Texteingabe.

**UI:** Viel vertikaler Platz vor der eigentlichen Liste. Die rechte Detailansicht benötigt mehr relevante Inhalte.

**Abschlussnachweis (11. September):** Der frühere hohe Betriebsblock ist auf eine einzeilige Statusleiste für aktive Aufgaben, offene Fehlschläge und Wartung verdichtet; nur ein tatsächlich aktives oder nächstes Wartungsfenster ergänzt eine knappe zweite Zeile. Die Aktivitätsliste beginnt dadurch im ersten Bildschirm. Jede Desktopzeile und Mobilkarte besitzt einen direkten Link zu ihrer konkreten Ausführung; Synchronisierungsgruppen bieten zusätzlich alle zugelassenen Einzelläufe an. Die Detailspalte zeigt statt einer redundanten Auswahlkarte Status, lesbares Ziel, Auslöser, absolute und relative Zeit, Ausführungs-ID, Dauer, Ergebniszusammenfassung und aufklappbares exaktes Log. Die eigene Ausführungsseite zeigt dieselben Daten und bewahrt die Umgebung im Link.

**Filter und Fehlerzustände:** Quelle, Status, Volltext sowie Zürcher Von-/Bis-Kalendertage sind in der URL reproduzierbar. Die Datumskomponente unterstützt Picker und Tastatureingabe. Ungültige oder umgekehrte Bereiche werden serverseitig abgewiesen; `Reset filters and show newest tasks` stellt die Liste nach einem Filterfehler wieder her. Lesbare Aktionsnamen ersetzen bekannte technische Codes, während der Originalcode für Suche und Diagnose erhalten bleibt. Gelöschte Hosts und Zeitpläne behalten ihren aufgezeichneten Namen. Eine gespeicherte-Filter-Bibliothek ist kein Bestandteil der konkreten F02-Anforderung und wurde angesichts URL-stabiler Filter nicht als zusätzlicher Schreibpfad eingeführt.

**Prüfung:** TypeScript bestand. 27 Backendtests für Operations, Anzeige und Zürcher Datumsgrenzen sowie 18 fokussierte Frontendtests bestanden. Der reproduzierbare Browserlauf `verification/f02-closure-check.cjs` prüft Statusleiste, Datumseingaben, konkrete Laufnavigation, 90-Sekunden-Dauer, Ergebnis und exaktes Log mit tatsächlicher `OperationsPage`/`OperationExecutionPage`. Visuell geprüft: [kompakte Aktivitätsansicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/operations-activity-final.png) und [konkrete Ausführung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/operations-execution-final.png). Browserdaten waren synthetisch; es wurde keine produktive Operation ausgelöst oder bestätigt.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 2.

### F03 · Wartungsplanung

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 3/4 erfüllt.

**Anforderung:** Datum-/Zeitpicker mit Tastatureingabe, vollständige Zeitzonensuche, Ressourcen- und Teamauswahl, Wiederholung und Konflikthinweise.

**Zusätzlicher Prüfkontext – Informationen:** Name, Zeit, Beschreibung, Owner und Ressourcen sind vorhanden; Auswirkungen sind nur Freitext.

**Eingaben:** Datumseingaben sind format- und zeitzonenbeschriftet, aber manuell. Nur vier Zeitzonen zur Auswahl; Ressourcen und Owner ohne echte Zuordnung.

**UI:** Der leere Zustand erklärt den nächsten Schritt gut. Das Formular ist überschaubar.

**Abschlussnachweis (11. September):** Start und Ende verwenden einen nativen Datum-/Zeitpicker mit vollständiger Tastatureingabe und sichtbarer Zeitzone. Die Zeitzonensuche filtert alle vom Browser unterstützten IANA-Zonen; die Vorschau hält den lokalen Start über Sommerzeitwechsel stabil und weist nicht existente oder doppelte Ortszeiten zurück. Der Zielbereich ist eine echte, durch Berechtigungen begrenzte Hostauswahl mit Namens-/IP-Suche oder ausdrücklich gewählter gesamter Umgebung. `Owner / team` schlägt vorhandene Teams der Umgebung sowie frühere Verantwortliche vor und erlaubt weiterhin eine konkrete Person. Auswirkungshinweis und Change-Referenz sind getrennte Felder.

**Wiederholung und Konflikte:** Tägliche und wöchentliche Serien erzeugen eine endliche, vor dem Speichern sichtbare Liste. Konflikte innerhalb der geplanten Serie und mit bestehenden Fenstern werden pro Termin genannt. Überlappungen bleiben bewusst möglich, verlangen aber Koordination; fehlende Berechtigung zur Konfliktprüfung wird ausdrücklich angezeigt. Einzelne Vorkommen können getrennt bearbeitet, storniert oder gelöscht werden; Revisionen verhindern stilles Überschreiben.

**Prüfung:** TypeScript bestand. Die zusammengefasste F17-Prüfung umfasste 36 Backendtests und neun Frontendtests für Wartungsfenster, Serien, Vorschau, DST, Transaktionen, Verlauf und Überschneidungen; die letzte Änderung bestand zusätzlich 18 Backend- und fünf Frontendtests. `verification/f03-closure-check.cjs` prüft Pickerhinweis, vollständige Zeitzonensuche, Host- und Teamwahl, Change-Referenz, Wiederholung und konkreten Konflikt im tatsächlichen Dialog. Visuell geprüft: [vollständige Wartungsplanung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/maintenance-planning-final.png) und [Zeitplanabdeckung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/schedule-maintenance-coverage.png). Browserdaten waren synthetisch; kein Fenster wurde produktiv gespeichert.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 3, 4.

### F04 · Audit Log

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 5/6 erfüllt.

**Anforderung:** Änderungen als Vorher/Nachher-Diff zeigen, Ressourcen nach Löschung benennbar halten und Export-/Retention-Regeln transparent machen.

**Zusätzlicher Prüfkontext – Informationen:** Actor, IP, Zeit, Status und Objektlinks sind hilfreich. Retention ist sichtbar. Technische Eventcodes und oft leere Objektfelder stören.

**Eingaben:** Filter nach Aktion, Benutzer, Status und Datum sowie Export sind passend. Volltext- und Objektfilter fehlen im sichtbaren Filterbereich.

**UI:** Die Tabelle ist nachvollziehbar, aber textlastig. Manche Informationen wiederholen sich.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 5, 6.

**Aktueller Nachweisstand:** Hostmetadaten-Diffs sind für alle Felder des Bearbeitungsendpunkts implementiert und im Browser aufgeklappt geprüft. API-Tests belegen Diffpersistenz, keine Doppeleinträge bei unverändertem Speichern sowie Rollback von Metadaten/Tags/Gruppen bei Auditfehler. Anlage und Löschung sind ebenfalls transaktional samt Umgebung und stabiler ID. Rolle, Benutzer, Wartung und SSH-Schlüssel besitzen bereits strukturierte Änderungsformate; deren ältere Nachweise bleiben separat zu prüfen. Host-Diffs werden zusätzlich in den strukturierten CSV-Spalten ausgegeben. Metadaten-Ladezustände und lesbare Filterchips sind im Browser nachgewiesen; Liste/Zähler/Export teilen geprüfte Zürcher Tagesgrenzen.

**Abschlussnachweis (11. September):** Host-, Rollen-, Benutzer-, Wartungs- und SSH-Schlüsseländerungen zeigen strukturierte Vorher-/Nachher-Werte mit historischem Objektnamen und stabiler ID. Hoständerungen umfassen alle bearbeitbaren Metadaten einschließlich Tags, Services, Links, Mounts und Gruppe. Neue Anlagen, Änderungen und Löschungen schreiben Ressource und Audit atomar; erzwungene Auditfehler rollen die fachliche Änderung zurück. Gelöschte Ressourcen behalten ihren aufgezeichneten Namen und verlinken nie versehentlich auf ein später gleich benanntes Objekt. Unvermeidbare Legacy-Ereignisse ohne stabile ID bleiben als historischer Text sichtbar und werden nicht spekulativ zugeordnet.

**Suche, Export und Retention:** Der sichtbare Volltextfilter sucht Aktion, Benutzer, IP und Ressourcendetail; Aktion, Benutzer, Status sowie Zürcher Von-/Bis-Tage bleiben separat filterbar. Liste, Zähler und Export verwenden denselben Zugriffs- und Filterumfang. Die aufgeklappte Policy erklärt vollständige CSV-Ausgabe bis 10.000 Treffer, notwendige Eingrenzung darüber, strukturierte Diffspalten, Formelschutz und die 90-Tage-Bereinigung beim Serverstart. Ein echter Headless-Browserdownload wurde jetzt als `fleet-audit-log.csv` empfangen und sein Inhalt geprüft; der Fehlerzustand mit erneuter Bedienbarkeit war bereits separat belegt.

**Prüfung:** 36 Backendtests für Export, Suche, Datumsgrenzen, stabile Objektzuordnung und Hosttransaktionen sowie 13 Frontendtests für strukturierte Auditdarstellung bestanden. `verification/f04-export-check.cjs` prüft die sichtbare Policy und den tatsächlichen Download samt Dateiname und Markerinhalt. Visuell geprüft: [Export- und Aufbewahrungsregeln](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/audit-export-policy-final.png), [Rollenänderung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/role-audit-before-after.png), [Benutzeränderung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/user-audit-before-after.png), [Wartungsänderung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/maintenance-audit-before-after.png) und [SSH-Schlüsselverlauf](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/ssh-audit-history.png). Tests nutzten isolierte SQLite-Datenbanken und synthetische Browserdaten; keine produktiven Daten wurden exportiert oder geändert.

### F05 · Managed Hosts / Inventar

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 7/71 erfüllt.

**Anforderung:** Attention, Updates, letzte Verbindung und Owner optional als Spalten; Bulk-Aktionen mit Zielzusammenfassung und klarer Auswahlreichweite.

**Zusätzlicher Prüfkontext – Informationen:** Name, IP, OS, Online-Status und Tags sind da; Updatebedarf und letzte erfolgreiche Erhebung fehlen als direkte Listenspalten.

**Eingaben:** Suche, Status-/Tagfilter und Mehrfachauswahl sind passend. Speichern von Ansichten und anpassbare Spalten wären bei größeren Beständen wichtig.

**UI:** Saubere, kompakte Tabelle. Die lange Day-2-Erklärung wirkt wie Produkterläuterung statt Betriebsinformation.

**Abschlussnachweis (11. September):** Die kompakte Hostliste zeigt optional `Operating state`, `Last contact` und `Owner / team`. Operating state enthält getrennte OS-/Image-/Custom-Zahlen sowie sonstige Attention-Gründe; erfolgreiche Kontaktzeit besitzt absoluten Europe/Zurich-Tooltip und relative Anzeige. Owner ist ein persistiertes, auf 100 Zeichen begrenztes Host-Metadatenfeld, im Add/Edit-Dialog pflegbar und standardmäßig als optionale Spalte ausgeblendet. Spaltenauswahl wird im Browser und in gespeicherten benutzer-/umgebungsspezifischen Ansichten erhalten; ältere gespeicherte Ansichten werden mit ausgeblendetem Owner migriert. Die frühere lange Produkterklärung wurde durch die knappe Bestandszusammenfassung ersetzt.

**Bulk- und UI-Nachweis:** Die Sammelleiste listet konkrete Namen und IPs, unterscheidet Ziele auf dieser Seite, auf anderen Seiten und außerhalb aktueller Filter und erklärt, dass Aktionen die gesamte Auswahl verwenden. Nicht mehr vorhandene Ziele sperren Aktionen. Desktop und mobile Karten verwenden denselben Zustand und Owner. Visuell geprüft: [optionale Spalten und Zielzusammenfassung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/host-inventory-columns-bulk-final.png), [mobile Hostkarten](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/host-inventory-mobile-final.png). Reproduzierbar mit `verification/f05-closure-check.cjs` und tatsächlicher ServersPage.

**Funktionale Prüfung:** 37 Backendtests aus Hostrouten, Metadaten-Audit und Umgebungsintegrität bestanden, einschließlich Owner-Persistenz/-Grenze und atomarer Schreibpfade. Elf gezielte Frontendtests prüfen Auswahlreichweite, gespeicherte Ansichten einschließlich Altformat sowie Listen-Normalisierung. TypeScript erfolgreich. Browserdaten und Bulkziele waren synthetisch; keine Updates, Playbooks, Verschiebungen oder Löschungen ausgeführt.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 7, 71.

### F06 · Host hinzufügen / Metadaten

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 8/9 erfüllt.

**Anforderung:** Tag-Chips, strukturierte Services, sichtbarer Umgebungskontext, explizite Pflichtfelder und Teststatus mit Fehlerursache.

**Zusätzlicher Prüfkontext – Informationen:** Der Hinweis zum nur temporär verwendeten SSH-Passwort ist gut. Hostname, SSH-Ziel und Anzeigename könnten klarer unterschieden werden.

**Eingaben:** Port, User, Tags, Links und Mounts passen grundsätzlich. Kommagetrennte Tags/Services sowie das unter Advanced versteckte Environment sind fehleranfällig.

**UI:** Langer innerer Dialogscroll bei erweiterter Eingabe; Name und IP sind dagegen angenehm schlank.

**Abschlussnachweis (11. September):** Der Standardbereich zeigt die aktive Zielumgebung sichtbar und vor den Hostfeldern. `Display name` und `SSH address` sind sprachlich sowie als echte erforderliche Formularfelder getrennt; der optionale DNS-Hostname erklärt, dass SSH weiterhin die Adresse verwendet. Erweiterte Angaben bleiben in einem einklappbaren Bereich mit festem Footer. Services und Tags verwenden einzelne, ergänz- und löschbare Eingaben; Kommalisten werden beim Speichern normalisiert. Der Verbindungstest zeigt seinen laufenden Zustand, dauerhaften Erfolg oder die konkrete Fehlerursache direkt am Feld und verwirft Ergebnisse nach einer relevanten Eingabe-/Kontextänderung.

**Funktionale Prüfung:** `verification/f06-closure-check.cjs` rendert den tatsächlichen CreateServerDialog. Geprüft wurden Umgebung `Production`, erforderliche Display-/SSH-Felder, ein Fehler `Host key verification failed for 10.24.1.15`, erfolgreiche Wiederholung sowie strukturierte Service-/Tag-Eingaben. Visuell geprüft: [Grunddaten und konkrete Testursache](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/add-host-connection-error-final.png), [erweiterte Metadaten](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/add-host-metadata-final.png). TypeScript ist erfolgreich; die 32 unter F07 ausgeführten Host-Routentests enthalten Anlagevalidierung, Defaults, SSH-Port/-User, Link-/Mountpfade und atomare Persistenzwege. Die Browserverbindung war simuliert; kein Host angelegt und keine produktive SSH-Verbindung geöffnet.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 8, 9.

### F07 · Hostübersicht / System / Storage

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 10/11 erfüllt.

**Anforderung:** Kurze Verläufe, Erhebungszeit, klarer Metrikname für Latenz, korrekte Gesamtgesundheit und eindeutige Storage-Zustände.

**Zusätzlicher Prüfkontext – Informationen:** IPAM- und Proxmox-Links sind stark. Healthy trotz Image-Updates, API Latency ohne klare Bedeutung und reine Momentanwerte schwächen die Aussage.

**Eingaben:** Kopieren von IP/Hostname und gezieltes Refresh passen.

**UI:** Gute Abschnitte und Ressourcenbalken. Warnung und grüne Zusammenfassung widersprechen sich visuell.

**Abschlussnachweis (11. September):** Die Übersicht benennt die frühere unspezifische `API Latency` jetzt als `Shipyard API round-trip`, zeigt Messzeit sowie Agent-/SSH-Quelle und kennzeichnet zwischengespeicherte Werte während einer Aktualisierung. Jeder echte SSH- oder Agent-System-Snapshot wird atomar in einer pro Host auf 48 Einträge begrenzten Historie gespeichert. Die Übersicht visualisiert die letzten 24 CPU-, RAM- und Disk-Werte mit Warnschwelle, Zeitraum, Anzahl und Quelle. [Hostübersicht mit Verläufen](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/host-overview-trends-final.png).

**Storage- und Gesundheitsnachweis:** Mounts zeigen ausdrücklich `Mounted`, `Not mounted` oder `Mount status not reported`; ZFS-Pools zeigen ihren gemeldeten Zustand. Unbekannte Kapazität bleibt `—` und wird nicht als Null ausgegeben. Desktop und mobile Karten wurden visuell geprüft: [Storage-Tabelle](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/host-storage-states-final.png), [mobile Storage-Ansicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/host-storage-mobile-final.png). Die widerspruchsfreie Gesamtgesundheit und getrennten Updatequellen sind zusätzlich unter P1-02 abgenommen.

**Funktionale Prüfung:** `verification/f07-closure-check.cjs` rendert die vollständige ServerDetailPage mit tatsächlichem Controller und prüft Metrikname, Zeit, Quelle, Verlauf sowie alle Storage-Zustände auf Desktop und Mobile. 32 betroffene Backendtests bestanden; der neue Regressionstest prüft Route, Werte, Quelle und die feste Obergrenze von 48 Snapshots. TypeScript-Prüfung erfolgreich. Browser- und Hostdaten der UI-Abnahme sind synthetisch; keine Remoteabfrage oder Hoständerung wurde ausgeführt.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 10, 11.

### F08 · Docker / Workloads

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 12/13 erfüllt.

**Anforderung:** Update status als Spaltenname, Gründe für unbekannte Werte, Compose-Validierung und klare Trennung von Speichern und Starten.

**Zusätzlicher Prüfkontext – Informationen:** Image- und Laufzustand helfen; fehlende CPU-/RAM-Werte und Cannot check bleiben unerklärt.

**Eingaben:** Add Stack bietet nur Pfad und YAML. Es fehlen im sichtbaren Dialog Vorlage, Validierungsstatus und Erklärung der Save-Wirkung.

**UI:** Dichte, lesbare Tabelle, aber die Spalte Check for Updates benennt eine Aktion statt den angezeigten Status.

**Aktueller Nachweisstand:** Docker-Tabelle mit Update status, Image-Erklärungen und Lifecycle-Statusfarben im tatsächlichen Tab geprüft (`docker-image-help-review.html`, `docker-lifecycle-review.html`). ComposeTemplateButton befüllt nur leere Editoren; Vorlageninhalt besteht den echten lokalen Backendvalidator (`compose-template-review.html`). Sechs Backendtests prüfen Validierung, Pfade, Berechtigungen, file/copy ohne Start, Fehler und temporäre Dateien (`compose-write-route.test.js`, `compose-validation.test.js`). Controllerfixtures prüfen verspätetes Speichern/Laden, neuere Entwürfe und Hostzuordnung (`compose-save-race-review.html`, `compose-load-race-review.html`, `compose-host-drafts-review.html`, `compose-abandoned-load-review.html`). Browserdaten und Remote-Runner sind dabei simuliert.

**Abschlussnachweis (11. September):** Gebündelte Prüfung mit tatsächlicher ServerDetailPage und Controller bestätigt Add → Vorlage → Validate → Save; Schreibfehler erhält Pfad/YAML und Retry schließt; Edit-Ladefehler sperrt Save und Retry lädt den Inhalt; separater Start prüft Host/Verzeichnis/action up und zeigt erst nach Abschlussereignis Erfolg. Die frühere vollständige Edit-Prüfung belegt zusätzlich Änderung und Speichern. Screenshots unter verification: [Add/Validierung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/compose-add-final.png), [Speicherfehler](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/compose-save-error-final.png), [Ladefehler](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/compose-load-error-final.png), [Edit](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/compose-edit-final.png), [Startabschluss](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/compose-start-final.png). Sämtliche Bilder visuell geprüft.

**Status-/Metriknachweis:** [Docker-Tabelle](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/docker-status-final.png) zeigt Update status sowie Gründe und nächste Schritte für Cannot check, Check failed und Not checked. CPU-/RAM-Ausfälle zeigen No sample mit konkret benanntem fehlendem Docker-Messwert im Titel; gemessene Null bleibt Null. [Mobile Ansicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/docker-status-mobile-final.png) und [horizontal gescrollte Ansicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/docker-status-mobile-scrolled-final.png) geprüft: Tabelle scrollt innerhalb des Viewports, Seite läuft nicht über. Die mobile Darstellung bleibt eine horizontal scrollbare Tabelle.

**Prüfgrenze:** Browser-API/Websocket und Remote-Runner simuliert; echte lokale YAML-/Routenprüfungen vorhanden. Keine produktiven Compose-Dateien verändert oder Container gestartet. Diese Grenze lässt die im Original verlangte UI-/Validierungsverbesserung lokal abschließen; ein Produktionsrollout wird nicht behauptet. Reproduzierbare Prüfscripts: verification/f08-closure-check.cjs und f08-mobile-check.cjs (lokaler Vite-Port 5188).

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 12, 13.

### F09 · OS-Updates / Custom Update Tasks

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 14/15 erfüllt.

**Anforderung:** Letzte Prüfung, Paketdifferenzen, Rebootbedarf, Test-vor-Speichern, Timeout und Versionsvergleich verständlich darstellen.

**Zusätzlicher Prüfkontext – Informationen:** Der leere OS-Zustand ist verständlich, wird aber sprachlich nicht von Image-Updates getrennt. Custom Tasks erklären Ziel- und Ist-Version.

**Eingaben:** Script, GitHub Release und Output Trigger sind sinnvolle Typen. Freie SSH-Kommandos brauchen bessere Beispiele und überprüfbare Ausgaben.

**UI:** Kompakte Anzeige. Formulare wirken technisch und mehrere Labels sind im Accessibility-Baum nicht mit den Feldern verbunden.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 14, 15.

**Abschlussnachweis (11. September):** Die OS-Kataloganzeige nennt Quelle, letzten erfolgreichen Erhebungszeitpunkt, Veraltungsgrenze und getrennte Kataloge. `OsUpdateImpact` unterscheidet Reboot erforderlich, nicht erforderlich und unbekannt; `OsUpdatePreview` nennt den 90-Sekunden-Rahmen, führt nur eine Simulation aus und zeigt Installationen, Upgrades, Entfernungen, Ist-/Zielversionen sowie bekannte oder unbekannte Serviceauswirkungen. Browsernachweise: [Paketvorschau](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/os-preview-final.png) und [Reboot-/Versionszustände](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/package-impact-final.png).

**Custom-Task-Nachweis:** Der Dialog erläutert die Vergleichsregeln für Script/GitHub/Trigger, bietet konkrete Command-Beispiele und nennt 30 Sekunden pro SSH-Kommando beziehungsweise 15 Sekunden für Release-Abfragen. `Test check before saving` zeigt beobachtete und verglichene Version sowie das Ergebnis; nach einer Eingabeänderung ist die Vorschau sichtbar veraltet. Alle sichtbaren Labels sind im tatsächlichen Dialog mit ihren Feldern verbunden. Ein Speicherfehler erhält den Entwurf. Die Liste zeigt letzte erfolgreiche Prüfung, Quelle, Ist-/Zielversion und Veraltung. Browsernachweise: [Prüfdialog](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/custom-check-dialog-final.png) und [Aufgabenstatus](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/custom-update-status-final.png).

**Funktionale Prüfung:** `f09-closure-check.cjs` reproduziert Erfolgs- und Fehlerpfade im Browser. 22 aktuelle Backendtests aus `custom-updates-route`, `custom-updates-trigger`, `system-info-updates` und `update-catalog-metadata` bestanden. Sie belegen unter anderem Preview ohne Speicherung/Update-Ausführung, Inputvalidierung, geschützte Fehlerantworten, Vergleichssemantik, Rücksetzen veränderter Regeln, Erhalt des letzten erfolgreichen Ergebnisses, Remote-Zeitgrenzen und unveränderten Katalog/Verlauf. Browser- und SSH-Antworten sind simuliert beziehungsweise isoliert; keine produktiven Updates oder Custom-Kommandos wurden ausgeführt.

### F10 · Hostaktivität / Logs

**Status:** Lokal abgenommen. Originalanforderung aus Review-Screenshot 16 erfüllt.

**Anforderung:** Fehlergrund extrahieren, alle Runs direkt öffnen, nach Typ/Status/Zeitraum filtern und Zeitformat mit Operations vereinheitlichen.

**Zusätzlicher Prüfkontext – Informationen:** Start, Ende und Dauer sind stark. Fehlgeschlagene Läufe melden teils No error details were recorded; Aktionsnamen sind uneinheitlich.

**Eingaben:** Logs lassen sich bei Fehlern öffnen. Filter und Suche sind in dieser Ansicht nicht sichtbar.

**UI:** Viele Zeilen und Spalten ohne starke Fehlerpriorisierung.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 16.

**Abschlussnachweis (11. September):** `ServerOperationsTabs` zeigt lesbare Aktions- und Statusnamen, Start, Abschluss, Dauer sowie für jede manuelle und geplante Zeile einen direkten Logzugang. Fehlgeschlagene Zeilen extrahieren die relevante Fehlerzeile vor nachlaufender Bereinigung; wenn keine Ursache belegbar ist, fordert der Text zum vollständigen Log auf. Typ, Status, Volltext und inklusive Zürcher Kalendertage werden serverseitig vor der Pagination angewendet. Die Auswahl umfasst auch Queued, Cancelling und Skipped. [Desktopfilter](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/host-history-filters-final.png) und [390px-Ansicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/host-history-mobile-final.png) belegen Fehlerpriorisierung, vollständig sichtbare Filter und absolute/relative Zeit mit Europe/Zurich.

**Log- und Fehlerablauf:** Der Logdialog lädt den ausgewählten Lauf unabhängig von der aktuellen Listenseite über die nach Host und Quelle geschützte Einzelroute. Ein Aktualisierungsfehler erhält den letzten Inhalt und erklärt dies; Retry ersetzt ihn mit dem neuen Log. [Aktueller Dialog](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/host-history-log-final.png). Fehler beim Laden einer älteren Seite bieten zusätzlich Retry und Rückkehr zu den neuesten Läufen (`host-history-page-error-review.html`). Laufende/pending/queued/cancelling Listen und geöffnete Logs werden über ihre jeweils aktuelle Einzelabfrage weiter gepollt.

**Funktionale Prüfung:** `f10-closure-check.cjs` prüft Pagination, Typ, Status, Volltext, Zeitraum, Fehlerursache, Mobilansicht und Log-Fehler/Retry mit tatsächlichem Controller. 31 Backendtests aus `server-history-pagination`, `operations-route` und `history-date-range` bestanden, einschließlich beider Laufquellen, vollständiger Rechte-/Umgebungsbindung, älterer Treffer vor Pagination und direkter Einzelabfragen. Sechs Frontendtests für Fehlerextraktion, Filter und Aktionsnamen bestanden. Browserdaten und isolierte SQLite-Daten sind synthetisch; keine produktiven Läufe gestartet.

### F11 · Hostnotizen

**Status:** Lokal abgenommen.

**Abschlussnachweis:** Runbook-Vorlage, Markdown/Vorschau, Autor, Änderungsdatum, geöffnete Revision und Versionshistorie sind gemeinsam mit tatsächlichem Controller browsergeprüft (`verification/notes-full-controller-review.html`, Screenshot `notes-full-controller-current.png`). Speicherung und Konflikte sind sowohl über tatsächlichen Controller mit synthetischen Antworten (`notes-controller-review.html`) als auch echte HTTP-Routen/isolierte SQLite belegt: drei Tests in `server/test/server-notes-revisions.test.js` prüfen 409 ohne Überschreiben, Attribution, 100 Revisionen, Rechte/Umgebung und Audit-Rollback. Reloadfehler erhält Entwurf; erfolgreicher Retry übernimmt neuere Revision (`notes-reload-controller-review.html`). Verwerfen und SPA-Navigation sind mit vollständiger Komponente/Router und kontrollierten Bestätigungsantworten für Ablehnung/Zustimmung geprüft (`notes-discard-review.html`, `notes-leave-review.html`). Verspätete Lade- und Speicherantworten nach A→B und A→B→A erhalten neue Entwürfe (`notes-navigation-controller-review.html`, `notes-save-navigation-review.html`); QueryClient-Test schützt höhere Cache-Revisionen. `useUnsavedChanges` bindet Browser-Unload an denselben Dirty-Status. Native Browserdialogdarstellung/Tab-Schließen nicht automatisiert geprüft; kein Produktionsrollout oder Zugriff auf echte Hostnotizen.

**Anforderung:** Runbook-Vorlage, Autor, Änderungsdatum, Versionshistorie und Warnung vor ungespeicherten Änderungen.

**Zusätzlicher Prüfkontext – Informationen:** Markdown und Vorschau sind passend; im leeren Zustand fehlen konkrete Nutzungsbeispiele.

**Eingaben:** Edit/Preview ist vertraut. Speicher- und Konfliktverhalten wurde nicht getestet.

**UI:** Schlichte, ruhige Fläche.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 17.

### F12 · Dateibrowser / SSH-Terminal

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 18/19 erfüllt.

**Anforderung:** Sessiondauer/-ablauf, Audit-/Recording-Status, Vollbild, Suche und ein eindeutiger Transferfortschritt; versteckte Dateien optional ausblenden.

**Zusätzlicher Prüfkontext – Informationen:** Zielhost, User, Pfad, Dateigröße und Modus sind vorhanden. Terminal zeigt den verbundenen Root-Kontext klar.

**Eingaben:** Pfadnavigation und Upload sind verständlich; Befehle und Transfers wurden nicht ausgeführt.

**UI:** Terminal ist fokussiert. Numerische Unix-Modi und versteckte Dateien sind für erfahrene Admins passend, benötigen aber optional Hilfe.

**Abschlussnachweis (11. September):** Der Dateibrowser zeigt Zielpfad, Größe, lokale Änderungszeit und Unix-Modus. Suche gilt ausdrücklich nur für das aktuelle Verzeichnis; versteckte Dateien können ein-/ausgeblendet werden, Zähler nennen den Filterumfang. Eine aufklappbare Modushilfe erklärt Oktalziffern und Verzeichnis-Execute; jede Moduszelle besitzt dekodierten Tooltip und Screenreader-Text. [Dateifilter und Modushilfe](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/files-filter-mode-final.png).

**Terminalnachweis:** Das Terminal zeigt Zielhost/User, verbundene beziehungsweise abgeschlossene Sessiondauer, gemeldete Idle-/Maximaldauer und den Audit-/Recording-Umfang: Verbindungsmetadaten werden auditiert, Befehle/Ausgabe nicht aufgezeichnet. Lokale Puffersuche mit Vor/Zurück, Trefferzahl, Copy log und Expand/Restore sind geprüft. Nach Idle-Ablauf friert die Dauer ein, Eingabe/Ctrl+C ist gesperrt, der konkrete Grund und Hinweis zu möglicherweise weiterlaufender Remote-Arbeit bleiben sichtbar; Ausgabe bleibt such-/kopierbar. [Session, Audit, Suche und Vollbild](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/terminal-session-audit-search-final.png), [Ablaufzustand](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/terminal-expiry-final.png). JSON-ähnliche Ausgabe und über Paketgrenzen geteiltes UTF-8 werden als Nutzdaten erhalten.

**Transfernachweis:** Browserupload zeigt gesendete Bytes getrennt von der noch unbestätigten Zielschreibung. Abbruch hinterlässt Zielpfad, unbestätigtes Ergebnis und `Inspect destination folder` ([Abbruchhinweis](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/upload-canceled-notice.png)). Host-zu-Host-Transfer benennt, dass kein Bytefortschritt verfügbar ist, wartet auf Zielabschluss, bewahrt Eingaben/Fehler und sperrt verschwundene Ziele ([Transferfehler](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/files-transfer-error.png)). 26 Backendtests prüfen Pfade, Rechte, isoliertes SFTP, atomare Veröffentlichung, Größenlimit, Abbruchbereinigung, frühe Trennung und Terminal-Audit/-Limits. 28 Frontendtests prüfen API-Fortschritt/Abort, Suche, Trennung und Dateifilter. `verification/f12-closure-check.cjs` prüft die aktuellen Hauptansichten. Transport- und Browserdaten waren simuliert; keine Remote-Datei und kein SSH-Befehl ausgeführt.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 18, 19.

### F13 · Managed VMs / Vorlagen / Erstellung

**Status:** Lokal abgenommen; der geforderte Durchlauf auf einer realen Proxmox-Test-VM bleibt eine externe Betriebsabnahme.

**Anforderung:** Geführter Assistent mit Review, Vorlagenabhängigkeiten und IPAM-Auswahl; Planung, Apply, Drift und Wiederherstellung erst mit vorhandener Test-VM separat validieren.

**Zusätzlicher Prüfkontext – Informationen:** Compute, Storage, Netz, Zugriff und Pre-/Post-Workflows sind umfassend. Der leere Inventarbereich widerspricht begrifflich anderen Managed-Zählern.

**Eingaben:** Viele hilfreiche Defaults; MB und GB sind gemischt, Ubuntu-User wird beim Debian-Template vorgegeben, Clone attempts ist zu prominent.

**UI:** Ein großer Dialog trägt zu viele Entscheidungen auf einmal.

**Abschlussnachweis (11. September):** Die Erstellung ist in fünf Schritte mit abschließender Review-Ansicht gegliedert. Vorlagen, deren Abhängigkeiten, separates OS-Benutzerfeld, konsistente MiB/GiB-Hinweise, IPAM-Auswahl, Pre-/Post-Workflows und fortgeschrittene Clone-Optionen sind sichtbar, ohne den Hauptpfad zu überladen ([Review](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/vm-review.png), [IPAM-Auswahl](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/vm-ipam-selected.png), [Konfliktzustand](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/vm-draft-conflict.png)). Jede neue VM besitzt eine eigene OpenTofu-State-Grenze. Apply akzeptiert nur den gespeicherten Plan derselben VM und wird blockiert, sobald eine fremde Resource-Adresse enthalten ist oder die Konfiguration nach der Planung geändert wurde. Die Detailseite vereint Soll-/Ist-Daten, Plan, Apply, Drift, Laufhistorie und verschlüsselte State-Recovery; Restore erklärt, dass nur der Management-State zurückgesetzt wird, und verlangt danach einen neuen Planvergleich ([Plan, Drift und Recovery](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/managed-vm-recovery-final.png)). Der isolierte Integrationstest führte Plan, Apply, Drift und Restore mit einem lokalen OpenTofu-Testprozess aus; die komplette Backend-Suite bestand mit 898 Tests, die Frontend-Suite mit 302 Tests. `verification/f13-closure-check.cjs` prüfte den sichtbaren Ablauf und die exakte Restore-Bestätigung. Kein reales Proxmox-System wurde verändert. Die im Review ausdrücklich verlangte zusätzliche Betriebsabnahme muss deshalb später mit einer dafür freigegebenen, entbehrlichen Test-VM erfolgen; sie ist keine offene Implementierungslücke.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 20, 21, 22.

### F14 · Playbook-Inventar / YAML-Editor

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 23 und 24 erfüllt.

**Anforderung:** Read-only-Inspektion als Standard, explizit bearbeiten, strukturierte Metadaten, Diff/Revision und getestete Freigabestände.

**Zusätzlicher Prüfkontext – Informationen:** Lesbare Playbook-Namen, Dateinamen, Kategorie und History sind gut. Autor, letzte Änderung und freigegebene Version könnten prominenter sein.

**Eingaben:** YAML-Editor mit Syntaxprüfung ist angemessen für die Zielgruppe. Direktes Editieren beim Auswählen ist weniger sicher als eine klare Leseansicht.

**UI:** Zweispaltige Inventar-/Detailstruktur ist stimmig. Interne System-Playbooks erzeugen vermeidbares Rauschen.

**Abschlussnachweis (11. September):** Ein ausgewähltes Playbook öffnet in einer ausdrücklichen Read-only-Ansicht; Bearbeiten ist eine separate Aktion, Änderungen zeigen Diff und Inhaltsrevision, und Konflikte bewahren den lokalen Entwurf. Die Detailleiste zeigt jetzt Freigabestatus, letzten Autor, Änderungszeit sowie Freigebenden und Freigabezeit. `Approve revision` bindet die Freigabe serverseitig an den exakten SHA-256-Inhaltsstand; jede Speicherung oder Wiederherstellung erzeugt wieder einen Draft, eine veraltete Freigabe wird abgelehnt. Die Metadaten werden atomar in einer geschützten Begleitdatei geschrieben und bleiben in Anwendungsbackups erhalten. Interne System-Playbooks sind beim ersten Besuch eingeklappt. Der semantische Backendtest für Draft, Freigabe und Konflikt sowie 71 betroffene Frontendtests und TypeScript bestanden; der Browsercheck prüfte Read-only, Metadaten und Freigabe. Visuell geprüft: [Playbook-Freigabe](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/playbook-release-final.png). Browser- und Freigabedaten waren synthetisch.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 23, 24.

### F15 · Playbook Runs / Zielauswahl

**Status:** Lokal abgenommen. Originalanforderung aus Review-Screenshot 25 erfüllt.

**Anforderung:** Run-Assistent mit strukturierter Variableneingabe, deutlich markiertem localhost, sichtbarem Dry run und dauerhaft sichtbarer Zielzusammenfassung.

**Zusätzlicher Prüfkontext – Informationen:** Hostsuche, IP, Tags, Status und Zielvorschau sind gute Absicherungen. Output und Historie teilen sich eine sehr lange Seite.

**Eingaben:** JSON-Variablen sind technisch; localhost erscheint neben echten Hosts ohne gleichwertige Erläuterung des Ausführungsortes.

**UI:** Die Form ist lang, wichtige Run-Optionen liegen weit unten.

**Abschlussnachweis (11. September):** Der Run-Assistent zeigt Playbook, durchsuch- und filterbare Hosts, Auswahlumfang und Ausführungsmodus in einer zweispaltigen Ansicht neben dem Output. Die Hostsuche umfasst Namen, IP und Tags; Gruppen-/Tagfilter verändern eine bestehende Auswahl nicht. `localhost` erklärt direkt, dass die Ausführung im Shipyard-Runtime-Kontext statt auf einem Remotehost erfolgt. Dry run ist dauerhaft außerhalb der Expertenoptionen sichtbar und beschreibt Ansible Check Mode mit Diff. Die Zielvorschau bleibt bis zum Start im Formular. [Strukturierter Run-Assistent](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/playbook-run-structured-final.png).

**Variablen und Startfreigabe:** Laufbezogene Variablen werden als wiederholbare Schlüssel-/Typ-/Wertzeilen erfasst; Text, endliche Zahl, Boolean und JSON werden nativ übergeben. Leere oder ungültige Schlüssel, Duplikate, ungültige Zahlen und fehlerhaftes JSON verhindern die Review und nennen den betroffenen Schlüssel. Vor dem Start fasst ein eigener Dialog exaktes Playbook, Live/Dry run, Parallelität, vollständige Zielauswahl, geerbte Umgebungswerte, maskierte Secrets und Run-Overrides zusammen. [Startreview mit Hosts, Dry run und zusammengeführten Variablen](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/playbook-run-review-final.png).

**Funktionale Prüfung:** Sechs fokussierte Frontendtests bestanden für strukturierte Typkonvertierung/Fehler und die gemeinsame Zielauswahl; TypeScript und Scoped-Lint bestanden. Anschließend bestand die vollständige Frontend-Suite mit 67 Dateien und 302 Tests. `verification/f15-closure-check.cjs` prüft die tatsächliche `QuickRunTab`-Komponente. 16 Backendtests bestanden für Runnerübergabe, Typen, Secretmaskierung, Historie und stabile Zielidentitäten. Laufbeginn bleibt konten- und umgebungsgebunden im Sessionstatus, unbekannte Abschlusszustände werden weiter abgefragt und aktive Runs können kontrolliert abgebrochen werden. Browserantworten waren synthetisch; kein Remote-Playbook wurde gestartet.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 25.

### F16 · Variablen & Secrets

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 26 und 74 erfüllt.

**Anforderung:** Typen und Verwendungshinweise, sichere Secret-Erkennung, Änderungshistorie, Ablauf-/Rotationshinweise und klare Überschreibungsreihenfolge.

**Zusätzlicher Prüfkontext – Informationen:** Scope und Verschlüsselungsversprechen sind deutlich. Dieses Review bestätigt nicht deren technische Durchsetzung.

**Eingaben:** Key, Wert, Secret-Schalter und Beschreibung sind passend. Secret ist beim Anlegen nicht der Standard.

**UI:** Übersichtlich, aber leere Liste und offenes Formular stehen redundant untereinander.

**Abschlussnachweis (11. September):** Die Bestandsansicht trennt lesbare Variablen von maskierten, verschlüsselt gespeicherten Secrets und zeigt Typ, Beschreibung, letzten Wertwechsel sowie optionalen Rotationsstichtag. Überfällige Rotation ist ausdrücklich nur ein Hinweis; der Ablauf zum Rotieren an der Quelle und anschließenden Ersetzen des gespeicherten Werts wird erklärt. Das Formular öffnet nur auf Anforderung, bindet den Entwurf sichtbar an die Umgebung und legt neue Einträge restriktiv als Secret an. Text, Number, Boolean und JSON stehen für normale Variablen zur Verfügung; Secretwerte bleiben Text. Verdächtige Schlüssel oder Private-Key-Inhalte lösen beim bewussten Ausschalten des Secret-Schalters eine Warnung aus. [Inventar, Schutz- und Änderungshistorie](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/variables-inventory-history-final.png), [Typen, Verwendung und Überschreibung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/variables-input-guidance-final.png).

**Verwendung und Nachvollziehbarkeit:** Der Dialog zeigt die Jinja-Verwendung und die Reihenfolge: laufbezogene Werte überschreiben gleichnamige gespeicherte Umgebungsvariablen. Create, Update und Delete schreiben atomar eine umgebungsgebundene Historie mit stabiler ID/Key, Aktion, Benutzer, Zeitpunkt und geänderten Feldnamen. Werte und Beschreibungsinhalte werden dort nie gespeichert; gelöschte Schlüssel bleiben bis zur dokumentierten Grenze von 1.000 Einträgen nachvollziehbar. Metadatenänderungen bewahren den bisherigen Wert und dessen Zeitpunkt, ein tatsächlicher Werttausch aktualisiert den Zeitstempel. Fehlgeschlagene Saves behalten den Entwurf und die konkrete Ursache; erfolgreiche Saves und bestätigtes Verwerfen leeren den Secretentwurf.

**Technische Prüfung:** 24 aktuelle Backendtests bestanden für API-Validierung, Maskierung, native Typen, Historie, Umgebungsisolation/-konsolidierung, Migrationen und Streaming-Redaktion. Darin lief ein echtes lokal installiertes `ansible-playbook` gegen ein temporäres localhost-Playbook: native Zahlen/Booleans/JSON, Run-Override-Priorität und Umgebungstrennung wurden geprüft, bekannte synthetische Secrets blieben in Stream und Gesamtausgabe maskiert. Die Übergabe erfolgt über eine temporäre Datei mit privaten Rechten statt Prozessargumenten und wird nach normalem Erfolg/Fehler entfernt. `verification/f16-closure-check.cjs` prüft die aktuelle UI. Keine produktive Variable, kein echtes Secret und kein Remotehost wurden verändert. Transformierte/verschlüsselte Ableitungen eines Secrets können durch literale Redaktion nicht allgemein erkannt werden.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 26, 74.

### F17 · Schedules

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 27 und 28 erfüllt.

**Anforderung:** Gemeinsame Hostauswahl, nächste drei Läufe, Zone im Dialog, Retry-/Overlap-Regeln und Wartungsfensterbezug.

**Zusätzlicher Prüfkontext – Informationen:** Nächster Lauf samt Zone ist gut. Last run verwendet eine abweichende Uhrzeitdarstellung. Der vorhandene Name Weekly Updates gehört zu einem Daily-Zeitplan — eine Datenbenennung, kein nachgewiesener Schedulerfehler.

**Eingaben:** Presets plus Cron, Parallelität und Extra-Variablen passen. Die Zielauswahl ist schwächer durchsuchbar als bei Runs.

**UI:** Das neue Zeitplanformular ist schmal und lang; die nächsten Ausführungen sollten sichtbar zusammengefasst werden.

**Abschlussnachweis (11. September):** Der Zeitplandialog verwendet dieselbe durchsuchbare Hostlogik wie Ad-hoc-Runs: Name, Hostname, IP und Tags sind durchsuchbar, Status ist filterbar und eine Filteränderung verliert keine Auswahl. `All hosts`, konkrete Ziele, Ausschlüsse, künftig einbezogene Hosts und nicht mehr auflösbare gespeicherte Ziele werden ausdrücklich zusammengefasst. `localhost` ist als Ausführung im Shipyard-Runtime-Kontext gekennzeichnet. [Hostauswahl und Ausführungsvorschau](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/schedule-targets.png).

**Zeit- und Wartungsregeln:** Die nächsten drei Starts erscheinen bereits im Dialog mit Scheduler-Zeitzone und UTC-Offset. Für jeden Start nennt die Wartungsprüfung abgedeckte und nicht abgedeckte Ziele sowie Fenstername und Ende. Der Text stellt klar, dass Wartungsfenster Planungshilfe sind und Ausführungen nicht automatisch verhindern. Überlappende Vorkommen werden ohne Queue und ohne automatischen Retry übersprungen und dauerhaft als `skipped` in der paginierten, filterbaren Historie erfasst. [Wartungsabdeckung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/schedule-maintenance-coverage.png), `verification/history-skipped-filter.png` und `history-deleted-schedule.png`.

**Eingaben und Betriebszustand:** Custom-Cron blendet irrelevante Presets aus; ungültige Ausdrücke, Parallelität außerhalb 1–50 und Extra-Variablen außerhalb eines flachen JSON-Objekts werden feldnah abgewiesen. Create, Update, Toggle und Delete speichern Änderung und Audit atomar. Nach erfolgreichem Speichern, aber fehlgeschlagener Cron-Registrierung bleibt der Zeitplan sichtbar als `Saved but not registered`, startet nicht automatisch und bietet einen nachvollziehbaren Retry. [Validierungszustand](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/schedule-invalid-input.png), [Registrierungsfehler](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/schedule-registration-error.png) und `verification/schedule-registration-recovered.png`.

**Funktionale Prüfung:** 36 aktuelle Backendtests bestanden für Vorschau, Zeitzone, Wartungsfenster, transaktionale Änderungen, Paginierung, Debounce und Overlap-Historie. Neun Frontendtests bestanden für Wartungszuordnung, wiederkehrende Fenster und Grenzfälle. Die vier zentralen Screenshots wurden am 11. September visuell geprüft. Browserantworten waren synthetisch; es wurde kein produktiver Zeitplan angelegt oder ausgeführt.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 27, 28.

### F18 · Git Integration

**Status:** Lokal abgenommen. Originalanforderung aus Review-Screenshot 29 erfüllt.

**Anforderung:** Branch-Auswahl, letzte Revision/Sync, Konfliktstatus, schreibgeschützter Modus und bewusstes Opt-in für Auto-push.

**Zusätzlicher Prüfkontext – Informationen:** HTTPS-Token versus SSH-Key ist klar. Auto-pull und Auto-push stehen standardmäßig an; Branch-/Commit-Kontext fehlt im sichtbaren Formular.

**Eingaben:** Repository, Identität und Authentifizierung sind angemessen. Ein Verbindungstest und die Behandlung lokaler Änderungen sollten vor Connect erläutert werden.

**UI:** Saubere Form, aber wenig Unterstützung für kollaborative Freigabeprozesse.

**Abschlussnachweis (11. September):** Setup und Betrieb zeigen auswählbare/aktive Branches, Revision, geänderte Dateien, letzten erfolgreichen Pull und letzten Remotevergleich mit Europe/Zurich-Zeit. Der Setup-Test liest verfügbare/default Branches ohne Persistenz, unterscheidet fehlenden Branch von unerreichbarem Repository und bindet sein Ergebnis an URL, Credentialtyp und Branch. Pull importiert nur saubere Fast-forwards; lokale Änderungen, Divergenz und Konfliktdateien werden sichtbar erhalten und blockieren Synchronisierung/Publizieren. [Arbeitskopie mit Branch, Revision und Änderungen](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/git-working-copy.png), [Divergenz und Konflikt](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/git-conflicts.png).

**Schreibschutz und Freigabe:** Neue Verbindungen starten remote read-only und mit Auto-push aus. Read-only blockiert manuellen wie automatischen Push serverseitig vor Stage/Commit; Auto-push erfordert gespeichertes ausdrückliches Opt-in. Pull/Push sperren sich gegenseitig und zeigen operationseigene Fehler, Setup behält einen fehlgeschlagenen Initialsync sichtbar, Drafts überleben Hintergrund-Refresh und können verworfen werden. [Read-only Playbookkopf und persistenter Pullkonflikt](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/git-widget-readonly-error.png), [mobile Einstellungen](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/git-settings-390px.png), [wiederhergestelltes Sync-Feedback](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/git-feedback-recovered.png).

**Funktionale Prüfung:** 49 Backendtests bestanden für atomare Konfiguration/Audits, Connection Probe, Branch-/Logfehler, Opt-in, Read-only, lokale Änderungen, Fast-forward, Divergenz, Konflikte, Remote-Löschungen, Transportvalidierung und secret-freie HTTPS-Authentisierung. Zwei aktuelle Frontendtests prüfen Arbeitskopiezustände. Weitere tatsächliche GitTab-/PlaybooksPage-Fixtures decken Setupresultat, Draft/Discard, Hintergrundfehler/Retry, Disconnect, mobile Darstellung und read-only Widget ab; alle APIs sind synthetisch. Lokale Git-Tests verwenden temporäre Repositories. Kein produktives Repository verbunden, geändert oder gepusht.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 29.

### F19 · Infrastrukturübersicht / Baum

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 44/61 erfüllt.

**Anforderung:** Favoriten und gespeicherte Filter, klarer Einstieg zur Infrastrukturübersicht, konsistente Klickziele und flexible Master-/Detailbreite.

**Zusätzlicher Prüfkontext – Informationen:** Kapazitäten und Erreichbarkeit helfen. Externe-Host-Zähler, Managed-Status und Datastoreumfang sind nicht durchgängig gleich definiert.

**Eingaben:** Baumsuche und Aufklappen passen. Bei 19 VMs ist der Baum bereits lang und einzelne Zielnamen sind sehr klein.

**UI:** Konsistente Linien und Icons; die Plattformauswahl nimmt bei einer Plattform viel leere Fläche ein.

**Abschlussnachweis (11. September):** Der Baum besitzt konto- und umgebungsspezifische Favoriten sowie bis zu 20 benannte, gespeicherte Textfilter. Treffer öffnen vorübergehend eingeklappte Plattform-/Node-/Hostzweige und stellen den gespeicherten Zustand nach dem Löschen der Suche wieder her. Plattformen, Nodes, VMs/Container und Hosts haben eindeutige Ziele und kontextreiche Favoritenbezeichnungen. Ein Link im Baum führt bei veralteten oder teilweise fehlgeschlagenen Daten zur vollständigen Infrastrukturübersicht. Eine einzelne Plattform nutzt dort die volle Breite; mehrere behalten Master/Detail. Die Seitenleiste lässt sich zwischen 224 und 384 Pixeln ziehen und per Pfeiltasten/Home/End bedienen; fehlerhafte gespeicherte Breiten fallen auf 272 Pixel zurück.

**Prüfung:** 39 fokussierte Frontendtests und 38 Backendtests für Inventar, Identität, Kapazität und Routing bestanden; TypeScript bestand. Browserfixtures belegen Filterpersistenz und Scopewechsel, Favoritenretention/-navigation, aufgeklappte Suchtreffer, volle Einplattformbreite, zehn Gäste mit `View all`, direkte Nodelinks, automatische Refresh-Fertigstellung sowie Fehler/Retry. Visuell geprüft: [vollbreite Übersicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/infrastructure-overview-retained.png), [gespeicherter Baumfilter](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/tree-filter-restored.png), [Favorit](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/favorite-navigation-restored.png) und [390px-Übersicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/infrastructure-overview-390px.png). Browserantworten waren synthetisch; keine Plattform wurde verändert.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 61, 44.

### F20 · Plattform- und Nodeinformationen

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 44–46 und 51/52 erfüllt.

**Anforderung:** Configuration passend umbenennen oder echte Verbindungseinstellungen anbieten; Trends, Datenalter und vollständige Netz-/Storage-Abdeckung ergänzen.

**Zusätzlicher Prüfkontext – Informationen:** CPU, Memory, Uptime, Kernel und Bridges helfen. Configuration auf Plattformebene ist überwiegend eine zweite Inventarübersicht.

**Eingaben:** Navigation und Copy-/Drill-down-Pfade sind ausreichend; keine Konfigurationsänderung getestet.

**UI:** Ruhige Kartenstruktur, teils redundante Angaben und gemischtsprachige Bezeichnungen.

**Abschlussnachweis (11. September):** Der frühere irreführende Tab `Configuration` heißt auf Plattform und Node jetzt `Inventory`, weil er gelesene Verbindungs-, Netzwerk-, Storage- und Gastdaten enthält. Plattform- und Nodezustände unterscheiden Online, Offline und Unknown, zeigen Erhebungszeit und behalten nach fehlgeschlagenem Refresh das Alter samt Warnung. Das UI verfolgt laufende serverseitige Aktualisierungen bis zum Abschluss und bietet nach Fehlern Retry bei erhaltenen Altwerten. Kapazitäten unterscheiden gemessene Null von nicht verfügbar; kurze Uptime und dezimale Ressourcen bleiben korrekt.

**Netz und Storage:** Der Nodebestand zeigt standardmäßig Bridges und optional alle gemeldeten physischen NICs, Bonds und VLAN-Interfaces mit IPv4/IPv6, Gateways, Status, Quelle und letzter Prüfung. Leerer Bestand ist von fehlender API-Berechtigung unterscheidbar. Alle von Proxmox gemeldeten Datastores erscheinen mit Backend, Inhalt, Aktivität, Sharing, Kapazität und beobachtetem Trend. Nachweise: [Node-Netzinventar](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/network-ipv6-mobile.png), [Storage-Verlauf](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/storage-history-desktop.png), [Datenalter und Refreshwarnung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/infrastructure-overview-retained.png). Die gemeinsame F19–F22-Prüfung bestand mit 39 Frontend- und 38 Backendtests; TypeScript bestand. Keine echte Proxmox-Konfiguration wurde geändert.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 44, 45, 46, 51, 52.

### F21 · VM-/CT-Inventar und Adoption

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 47, 53, 57, 58 und 70 erfüllt.

**Anforderung:** Suche/Filter, klarer Adoption-Assistent, lesbare Fehlerursachen, stabile Namen, getrennte Host-/VM-Ansichten und Gefahrenmenü.

**Zusätzlicher Prüfkontext – Informationen:** Managementzustand, Ressourcen und Konfiguration sind vorhanden. Inventarstatus und Hoststatus werden im Baum vermischt; IP-/Disk-Werte fehlen ohne ausreichenden Grund.

**Eingaben:** Mehrfachauswahl und Actions sind passend. Import all orphaned virtual machines ist technisch und missverständlich benannt; Ausführung wurde nicht geprüft.

**UI:** Breite Tabellen ohne sichtbare Suche oder Statusfilter im VM-Tab. Destruktive Buttons sind auf Detailseiten sehr prominent.

**Abschlussnachweis (11. September):** VM-/CT-Tab und Baum verwenden dieselbe stabile Plattform-/Node-/Guest-Identität, getrennte Inventar-, Hostbetrieb- und deklarative Zustände sowie direkte Host-/VM-Ziele. Suche, Typ-/Status-/Managementfilter und mobile Karten decken den vollständigen Bestand ab. Einzeladoption erklärt, dass nur ein Shipyard-Hostdatensatz angelegt wird, ermittelt IPv4 kontrolliert, bindet Entwurf und Anfrage an Umgebung/Guest und zeigt Feld-, Pending-, Teil- und ungewisse Ergebnisse. Die Bulk-Adoption erfasst die exakten Ziele, verarbeitet sie nachvollziehbar einzeln und wiederholt ausschließlich bestätigte Fehlschläge; angenommene oder ungewisse Ziele werden nicht doppelt angelegt. Der missverständliche frühere Importname wurde durch `Adopt … guests as hosts` ersetzt.

**Betrieb und Prüfung:** `Force stop` liegt unter den erweiterten Power-Aktionen, verlangt `STOP <guest>` und zeigt den asynchronen, dauerhaft nachverfolgbaren Taskstatus. Fehlende IP-/Disk-/Agentwerte nennen Quelle und Grund. 39 Frontendtests und die relevanten Teile der 79 bestandenen Plattform-/IPAM-Backendtests prüfen Filtermodelle, Adoption, exakte QEMU/LXC-Ziele, Berechtigungen, Transaktionen, Kollisionen, ungewisse Antworten und Power-Tasks. Visuell geprüft: [Bulk-Adoption mit Einzelresultaten](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/bulk-adoption-results.png), [Operator-Adoption](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/adoption-operator.png), [Power-Ergebnis](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/guest-power-result.png) und `vm-identity-current.png`. Alle Remoteantworten waren simuliert; keine VM und kein Host wurden verändert.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 47, 53, 57, 58, 70.

### F22 · Datastores

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 48/54 erfüllt.

**Anforderung:** Alle relevanten Datastores anzeigen oder den Tab ZFS pools nennen; Health, Backend, Provisionierung, Reservierungen und Trend ergänzen.

**Zusätzlicher Prüfkontext – Informationen:** Used, Free, Capacity und Prozentwert sind gut. Der Tab heißt Datastores, zeigt aber ausdrücklich nur ZFS; der VM-Assistent bietet zusätzlich local-lvm an.

**Eingaben:** Keine Eingaben erforderlich.

**UI:** Saubere Tabelle, bei einem Eintrag viel ungenutzte Fläche.

**Abschlussnachweis (11. September):** Der Tab zeigt nicht mehr nur bevorzugte ZFS-Pools, sondern den vollständigen von Proxmox gemeldeten Bestand einschließlich directory, LVM/LVM-thin, ZFS und NFS sowie Einträge ohne Kapazitätsmessung. Suche umfasst Name, Node, Backend und Content; Statusfilter und Zähler definieren den sichtbaren Umfang. Jede Zeile nennt Backend, Aktivität, node-lokales oder geteiltes Provisioning, Contenttypen, Used/Free/Capacity, Prozentwert und beobachteten Verlauf. `Not reported` wird nicht als Null oder gesunder Leerstand ausgegeben. Die Überschrift erklärt Erhebung, Fünf-Minuten-Buckets, siebentägige Verdichtung, 48-Stunden-Rohgrenze und mögliche gemeinsame Backendkapazität. Acht Datastoretests und zwei Verlaufstests sind Teil der bestandenen 39 Frontendtests. Visuell geprüft: [vollständiges Datastore-Inventar](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/storage-history-desktop.png) und [gemischte Plattformübersicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/infrastructure-overview-retained.png). Daten waren synthetisch.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 48, 54.

### F23 · Proxmox-Updates

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 49 und 55 erfüllt.

**Anforderung:** Kompakte Beschreibungen, Release Notes, Rebootbedarf, Wartungsbezug und eine zusammenhängende Ergebnis-/Fehleransicht.

**Zusätzlicher Prüfkontext – Informationen:** Installed/Available/Origin sind nützlich. Lange Paketbeschreibungen ersetzen keine Information zu Reboot, Auswirkungen und Dringlichkeit.

**Eingaben:** Refresh catalog und Install sind eindeutig; der letzte Bestätigungsschritt wurde nicht ausgelöst.

**UI:** Die Paketliste ist sachlich, wichtige Betriebshinweise fehlen im sichtbaren Vorfeld.

**Abschlussnachweis (11. September):** Der Updatebereich fasst vor der Paketliste zusammen, dass ein vollständiges Upgrade Dienste neu starten und einen Reboot erfordern kann und dass Paketmetadaten nicht alle Maintainer-Script-Auswirkungen vorhersagen. Ein passendes aktives oder geplantes Wartungsfenster wird mit Change-Referenz, Zeitraum und direktem Link angezeigt; ohne Abdeckung erscheint ein ausdrücklicher Hinweis. Jedes Paket besitzt einen Link zu Release-/Paketinformationen. Annahme und Fehler bleiben als zusammenhängender Inline-Zustand mit Link zur Operations-Ansicht sichtbar. TypeScript, 34 Infrastruktur-Frontendtests und die 79 Proxmox-/IPAM-Backendtests bestanden; `verification/f23-closure-check.cjs` bestätigte Impact, Release-Link und Wartungsbezug im Browser. Visuell geprüft: [Proxmox-Paketupdates](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/proxmox-updates-final.png). Daten und Ausführungsergebnisse waren synthetisch; es wurde kein Update auf einem echten Node ausgeführt.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 49, 55.

### F24 · Snapshots und Infrastruktur-Tasks

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 50, 56, 59 und 60 erfüllt.

**Anforderung:** Restore oder Proxmox-Deep-Link, Schutzkennzeichnung, Retention und Kontext zu Konsistenz/RAM. Objektaktivität über Quellen hinweg vereinen.

**Zusätzlicher Prüfkontext – Informationen:** Snapshotname und Datum sowie aggregierte Sync-Ereignisse sind hilfreich. Die Tasks erklären ihren begrenzten Umfang, wirken aber gegenüber anderen Historien fragmentiert.

**Eingaben:** Snapshot erstellen/löschen sichtbar, Wiederherstellung nicht sichtbar. Keine Snapshotaktion ausgeführt.

**UI:** Klare Leerzustände, aber wenig Unterstützung beim entscheidenden Recovery-Ablauf.

**Abschlussnachweis (11. September):** Jede Snapshotzeile bietet bei passenden Rechten eine direkte Wiederherstellung. Der Dialog nennt Snapshot, Guest, Umgebung und Recovery-Zeit, erklärt Datenverlust und Dienstunterbrechung, empfiehlt einen separaten Wiederherstellungspunkt, verlangt den exakten Snapshotnamen und weist auf die Prüfung des Guests nach Restore hin. VM-Snapshots unterscheiden disk-only von optionalem RAM-Zustand; LXC bietet keinen falschen RAM-Schalter. Löschen besitzt dieselbe exakte Zielbindung. Eine allgemeine automatische Retention wird nicht behauptet; die Oberfläche nennt vorhandene Recovery-Punkte und ihre gespeicherten Zeiten.

**Aufgabenverlauf:** Create, Delete, Restore und Power-Aktionen werden nach Proxmox-Annahme als guestgebundene Tasks persistiert, paginiert und mit Request-/Prüfzeit, Status, Fehler und optionaler Task-ID wieder geöffnet. Nur ein abgefragtes Proxmox-Endergebnis gilt als Erfolg; unbekannte/fehlgeschlagene Statusabfragen bleiben sichtbar und können erneut geprüft werden. Guest- und Plattform-Audit nutzen dieselben stabilen IDs über Quellen hinweg. Die relevanten Teile der 79 Plattform-Backendtests sowie zwei Objektresultat- und Zeitdarstellungstests bestanden. Visuell geprüft: [Restore-Ergebnis](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/snapshot-restoration-result.png), [wiederöffnbarer Taskverlauf](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/snapshot-history-checked.png) und `snapshot-task-failed.png`. Kein echter Snapshot wurde erstellt, gelöscht oder wiederhergestellt.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 50, 56, 59, 60.

### F25 · IPAM / Präfixe / Adressinventar

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 39–42 erfüllt.

**Anforderung:** Korrekte Reservierungsdefaults, Präfix-Auslastung, Konflikte, Quelle/Alter dauerhaft sichtbar; IPv6/VRF nur entsprechend Zielmarkt ausbauen.

**Zusätzlicher Prüfkontext – Informationen:** Freie Intervalle, nächste freie IP, Gateway, MAC, Quelle und Hostlink sind besonders nützlich. Die Präfixliste selbst zeigt keine Auslastung.

**Eingaben:** Einzeladresse/Range und Präfix-CIDR passen. Reservierung startet als Active, IP-Beispiel stammt aus einem anderen Netz. IPv6 ist nicht sichtbar.

**UI:** Einer der stärksten Bereiche. Zwei Suchfelder auf der Startseite sollten ihre unterschiedlichen Bereiche deutlicher erklären.

**Abschlussnachweis (11. September):** Die Präfixliste und Detailansicht zeigen nutzbare, belegte/reservierte und freie Adressen, Prozentwert, freie Intervalle, nächste freie Adresse, Child-Präfixe und Konflikte. Suche unterscheidet globale Präfix-/Adresssuche von der Suche innerhalb des geöffneten Präfixes. Quelle und letzte Synchronisierung bleiben an beobachteten Adressen sichtbar; manuelle und externe Herkunft werden getrennt. Der Reservierungsdialog startet im gewählten Präfix als `Reserved`, übernimmt dessen nächste freie IP, Präfix/Gateway/Quelle und erklärt den Wechsel auf `Active`. Einzeladresse und Range prüfen Netz-, Broadcast-, Child-, Duplikat- und Bereichsgrenzen.

**Schreibpfade und Prüfung:** Dialoge binden Ziel und Umgebung beim Öffnen, sperren während Pending und bewahren Eingaben/Fehler. Bulk-Freigabe zeigt die exakten Adressen/Ranges, berichtet bestätigte Erfolge getrennt von Fehlschlägen und lässt nur fehlgeschlagene Ziele zur Wiederholung stehen. Präfix-, Reservierungs-, Range-, Device- und Löschänderungen speichern Daten und Audit atomar. 41 IPAM-Routentests sowie die abschließende gemeinsame 79-Test-Plattform/IPAM-Suite bestanden; vier Frontendtests prüfen Validierung und Teilresultate. Visuell geprüft: [Reservierungsstandard](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/reservation-default-current.png), [Bulk-Teilresultat](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/ipam-bulk-partial.png), `ipam-prefix-switch.png` und `ipam-prefix-draft-retained.png`. IPv6/VRF wurde gemäß bedingter Zielmarktanforderung nicht als eigenständiges Pflichtprojekt ergänzt. Keine produktive Adresse wurde geändert.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 39, 40, 41, 42.

### F26 · IPAM Sources

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 43/72 erfüllt.

**Anforderung:** Controller und Site als lesbare Felder, Sync-Differenz, Datenvorschau und Warnung bei unerwartet leerem Bestand.

**Zusätzlicher Prüfkontext – Informationen:** Verbindungsstatus, Testzeit, Synczeit, Intervall und Konflikte sind gut. Grün bei null beobachteten Adressen benötigt mehr Erklärung.

**Eingaben:** UniFi/pfSense, URL, Token und Site sind nachvollziehbar. Automatische Erkennung von URL-Varianten und ein klarer Testschritt würden helfen.

**UI:** Die Statuskarte ist gut gegliedert; die lange rohe API-URL ist visuell dominant.

**Abschlussnachweis (11. September):** Jede Quelle zeigt einen lesbaren Namen und Typ, den Endpoint gekürzt mit vollständigem Tooltip, bei UniFi das Site-Feld sowie bei pfSense den API-Pfad hinter erweiterten Optionen. Connection test und Synchronization sind getrennte Aktionen mit eigener Zeit, Status und Fehlerursache. Der Testbericht zeigt vor einem Import erkannte Datensätze, Treffer in IPAM, Adressen außerhalb der Präfixe und bis zu drei konkrete Lease-Beispiele mit Adresse, Hostname und MAC. Null Datensätze heißen ausdrücklich `No usable leases` statt gesunder grüner Bestand; außerhalb liegende Ergebnisse erhalten eine Warnung. Die Bestandskarte zeigt importierte, ignorierte und konfliktbehaftete Adressen; der Sync-Abschluss meldet Created, Updated, Released, Conflicts und Outside getrennt.

**Sicherheit und Prüfung:** URL, Token, Site/Pfad, TLS-Modus, Enabled und Intervall werden nach einer externen Antwort erneut mit der aktuellen Konfiguration verglichen; geänderte oder gelöschte Quellen dürfen veraltete Resultate weder importieren noch als Status speichern. Create/Update/Delete, erfolgreicher Sync und Fehlerstatus sind jeweils mit ihrem Audit atomar. Die 79 bestandenen Plattform/IPAM-Backendtests umfassen Verschlüsselung, Maskierung, leere/ungültige Antworten, Konflikte, Stale-Leases, Konfigurationsrennen, Teststatus und Rollback; die UI-Abläufe liegen in `ipam-source-dialog-review.html` und den aktuellen Networks-Komponenten. Keine externe Quelle wurde kontaktiert oder synchronisiert.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 43, 72.

### F27 · Proxmox Platform connections

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 62 und 63 erfüllt.

**Anforderung:** Test mit Rechtecheck vor Speichern, CA-Zertifikatsweg, Service-Account-Beispiel statt root, flache Navigation und konsistente Sprache.

**Zusätzlicher Prüfkontext – Informationen:** Endpoint, IPAM-Intervall und Last sync sind nützlich. Access configured sagt wenig über tatsächlich verfügbare Rechte aus.

**Eingaben:** Token, Public Key und TLS-Prüfung sind passend; Tokenformat und Mindestberechtigungen brauchen Hilfe. Keine Tokens eingegeben.

**UI:** Verschachtelte Dialoge und gemischte Sprache mindern den professionellen Eindruck.

**Abschlussnachweis (11. September):** Der flache Verbindungsdialog enthält nun einen eigenständigen read-only Test vor dem Speichern. Er prüft parallel Proxmox-Version, sichtbare Nodes und `/access/permissions`, zeigt Tokenidentität, Nodezahl, erkannte Rechte und fehlende empfohlene Inventarrechte; nach einer Änderung an Endpoint, Token oder TLS-Konfiguration wird Speichern wieder gesperrt, bis der aktuelle Entwurf erfolgreich getestet ist. Die Hilfe empfiehlt `shipyard@pve!automation` mit minimalen Audit-Rechten und nennt zusätzliche Rechte nur für gewünschte Aktionen. Private CAs können als PEM hinterlegt werden, werden wie Tokens verschlüsselt und an Node TLS übergeben; das Abschalten der Zertifikatsprüfung ist als Lab-Ausnahme gekennzeichnet. Übersichten nennen konkret `Token stored` plus TLS-/CA-Zustand statt `Access configured`. 41 Proxmox-/OpenTofu-Backendtests, 71 betroffene Frontendtests und TypeScript bestanden; der Browsercheck bestätigte Testsperre, Service-Account-Hilfe, CA-Feld und Rechtebericht. Visuell geprüft: [geprüfte Plattformverbindung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/proxmox-connection-test-final.png). Der Netzwerkzugriff war gemockt; kein echtes Proxmox-System wurde kontaktiert.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 62, 63.

### F28 · Appearance / persönliche Darstellung

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 30, 64 und 65 erfüllt.

**Anforderung:** Appearance als eigene persönliche Einstellung, zuverlässige Defaults, Kontrastprüfung und Priorität auf Typografie/Status statt neue Themes.

**Zusätzlicher Prüfkontext – Informationen:** Persönliches Theme versus globale Marke ist erklärt. White Label verspricht auch ein Icon; im geprüften Abschnitt sind Name/Farbe sichtbar.

**Eingaben:** Theme, Density, Appname und Farbe passen. Scope und unmittelbare beziehungsweise gespeicherte Wirkung sollten konsistent sein.

**UI:** Die aktuelle dunkle Farbwelt ist kohärent. Viele Theme-Optionen auf der Kontoseite gewichten Kosmetik stärker als Sessioninformationen.

**Abschlussnachweis (11. September):** Persönliche Darstellung liegt als eigener Bereich im Benutzerprofil nach Konto-, MFA- und Sessioninformationen. Sie erklärt den Browser-Scope und trennt ihn von globalem Branding in Administration. Standardmäßig werden vier kuratierte Themes gezeigt; die übrigen Varianten erscheinen erst über `More themes`. Theme und Dichte sind zusätzlich im Kontomenü sofort umschaltbar und werden lokal mit validierten Fallbacks gespeichert. [Persönliche Darstellung mit empfohlenen Vorgaben](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/personal-appearance-final.png).

**Globales Branding und Wirkung:** Installationstitel und Akzentfarbe nennen ihren globalen Scope und werden erst nach Save angewendet. Leerer Titel stellt den Shipyard-Fallback wieder her; ein sechsstelliger Hexwert ist Pflicht. Entwürfe überleben Hintergrundaktualisierungen, Save/Reset sperren sich gegenseitig und Fehler bleiben sichtbar. Der Text erklärt, dass die Akzentfarbe Browsericon/-chrome betrifft, während Typografie, Buttons und Statusfarben vom persönlichen Konsolentheme stammen. [Branding und persönliche Navigation](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/appearance-empty-name-save.png).

**Kontrast und Prüfung:** Alle 33 vorhandenen Presets erfüllen in 34 parametrisierten Prüfungen mindestens 4,5:1 für Haupt-/Sekundärtext, Links und tatsächliche Warning/Danger/Info-Badge-Mischungen auf Hintergrund und Karten; Fokusringe erfüllen mindestens 3:1. [Helles Statusbeispiel](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/contrast-ink-light.png), [dunkles Statusbeispiel](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/contrast-nord-dark.png). Zusammen mit Store- und UI-Vertragstests bestanden 63 Frontendtests; sechs Backendtests bestanden für atomare Settings-/Audit-Speicherung, Brandingvalidierung und Secret-freie Auditdaten. `verification/f28-closure-check.cjs` prüft den aktuellen Profilbereich. Dies ist eine Token-/Komponentenkontrastprüfung, keine Zertifizierung jeder denkbaren Inhaltskombination. Keine produktive Branding-Einstellung wurde geändert.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 30, 64, 65.

### F29 · SSH-Schlüsselverwaltung

**Status:** Lokal abgenommen. Originalanforderung aus Review-Screenshot 31 erfüllt; mehrere aktive Schlüssel pro Umgebung bleiben ein bewusst abgegrenzter Ausbau.

**Anforderung:** Fingerprint, Alter, Rotation, Verwendungsübersicht und separate Schutzstufe für Private-Key-Export; mehrere Schlüssel nach Umgebung als Ausbau prüfen.

**Zusätzlicher Prüfkontext – Informationen:** Public Key, Algorithmus, Status und manuelle Installationsanweisung sind hilfreich; Lebenszyklus und Reichweite bleiben wenig sichtbar.

**Eingaben:** Ziel, User, Port und Einmalpasswort passen. Distribute to all hosts braucht eine klare Ziel-/Folgenübersicht im späteren Ablauf.

**UI:** Mehrere lange Konfigurationsblöcke; kritische Export-/Importaktionen stehen neben Routineinformationen.

**Abschlussnachweis (11. September):** Die Hauptansicht zeigt den tatsächlich erkannten Algorithmus, OpenSSH-kompatiblen SHA-256-Fingerprint und den lokalen Registrierungs-/Austauschzeitpunkt. Der Text behauptet ausdrücklich kein ursprüngliches Schlüsselalter. Verwendungszuweisungen sind nach Umgebung an Host, Deployment oder VM-Vorlage gebunden und werden auditiert; sie beschreiben die beabsichtigte Nutzung, ohne daraus installierte Remote-Trust-Einträge abzuleiten. Entfernen einer Zuweisung wird nicht als Remote-Widerruf dargestellt. [Schlüsselidentität, Alter und Verwendungsübersicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/ssh-key-lifecycle-final.png).

**Verteilung und Rotation:** Einzelverteilung prüft User, Adresse und Port in einer Vorschau. `Distribute to all hosts` lädt zuerst die aktuelle Umgebungsliste, zeigt Anzahl, Namen und IPs und bleibt bei Ladefehlern gesperrt. [Zielumfang vor Verteilung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/ssh-distribute-scope-final.png). Der Austauschablauf validiert den Kandidaten ohne Aktivierung, zeigt bisherigen und neuen Fingerprint sowie den neuen Public Key zur vorbereitenden Remote-Vertrauensstellung. Aktivierung ist an die geprüfte aktive Key-ID und den Kandidatenfingerprint gebunden; veraltete Reviews liefern 409 und bewahren den aktiven Schlüssel. Der Dialog erklärt zentrale Auswirkung, Recovery-Kopie und dass Remote-`authorized_keys` weder automatisch verteilt noch widerrufen werden. [Austauschreview](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/ssh-import-review.png), [Public-Key-Vorbereitung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/ssh-import-public-key.png).

**Private-Key-Schutz und Prüfung:** Export benötigt das aktuelle Administratorkennwort und bei aktivierter MFA einen gültigen Code; eine optionale Dateipassphrase ist davon getrennt. Antworten verwenden `no-store`, Eingaben werden nach Versuch/Abbruch geleert, Fehler bleiben im Dialog und Auditdaten enthalten kein Schlüsselmaterial oder Credential. [Abgewiesener Export mit dauerhafter Ursache](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/ssh-export-credentials-error.png), [historische Fingerprints im Audit](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/ssh-audit-history.png). Sieben aktuelle fokussierte Backendtests bestanden für Export-Reauth, konkurrierende Autorisierungsänderung, RSA/ED25519-Metadaten, fehlerhafte Schlüssel, umgebungsgebundene Zuweisungen und Auditberechtigung; die umfangreicheren Importtests sind im Implementierungsprotokoll dokumentiert. `verification/f29-closure-check.cjs` prüft die aktuelle Hauptansicht und Zielvorschau. Alle Schlüssel/Antworten waren synthetisch; keine Remote-Verteilung, kein Import und kein Export erfolgte.

**Ausbauentscheidung:** Der aktuelle zentrale Schlüssel gilt für neue Shipyard-SSH-Verbindungen über Umgebungen hinweg. Mehrere aktive Schlüssel pro Umgebung würden Auswahlregeln in Runner, Terminal, Git, Export/Backup, Rotation und Recovery erfordern und werden nicht als kosmetische UI-Erweiterung behandelt. Vor diesem Ausbau sollte eine verlässliche Remote-Trust-/Rollout-Rückmeldung entstehen; die vorhandene Zuweisungsliste ist dafür keine Zustandsmessung.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 31.

### F30 · Benutzer, Rollen und Kontosicherheit

**Status:** Lokal abgenommen für lokale Konten, Rollen, Einladungen, MFA und Sessions. SSO bleibt ein ausdrücklich separater Enterprise-Ausbau.

**Anforderung:** Einladungen, restriktive Defaults, SSO/MFA-Policy, Sessions/Widerruf und Rights-Diff als Enterprise-Ausbau; keine Sicherheitswirkung aus dem UI allein ableiten.

**Zusätzlicher Prüfkontext – Informationen:** Rollen-Presets und Live preview sind gut. Die breite Built-in-Rolle User, rohe Null in der Benutzerzeile und fehlende sichtbare Sessionübersicht sind Schwächen.

**Eingaben:** Anlage ist einfach, aber initiales Passwort wird vom Admin gesetzt und User ist voreingestellt. Rollenformular ist sehr lang.

**UI:** Grundstruktur passt. Sensitive Rechte sollten besser gruppiert und ihre effektive Kombination leichter prüfbar sein.

**Abschlussnachweis (11. September):** Neue Konten verwenden standardmäßig eine 24 Stunden gültige Einmal-Einladung, über die Empfänger ihr Kennwort selbst wählen; nur der Tokenhash wird gespeichert und der Link wird einmal angezeigt. Erstellen, Annehmen und Widerrufen sind transaktional auditiert. Ablauf, Widerruf, geänderte/gelöschte Rolle, deaktivierter Aussteller, geänderte Aussteller-Sessionversion und belegter Benutzername sperren die Annahme mit nicht sensitiver Ursache. [Erstellte Einladung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/invitation-created.png), [Empfängeransicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/invitation-accept.png), `verification/invitation-revoked.png` und `invitation-expired.png`.

**Rollen und restriktive Vorgaben:** Anlegen beginnt ohne implizite Betriebsrolle; Speichern erfordert eine explizite Rolle mit geladenem, revisionsgebundenem effektivem Zugriff. Ressourcen werden über stabile IDs, Gruppen einschließlich Nachfahren, Playbooks und Plugins zusammengefasst; sensible Fähigkeiten erscheinen separat. Presets empfehlen anhand tatsächlicher Fähigkeiten und nicht anhand eines irreführenden Rollennamens. Änderungen zeigen Current → Selected für Ressourcen und Fähigkeiten und verlangen Zielrollenrevision sowie erwartete bisherige Rolle; konkurrierende Änderungen liefern 409 statt still zu überschreiben. [Restriktive Benutzeranlage](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/user-access-current.png), [Rights-Diff](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/role-access-changes.png), `verification/role-revision-conflict.png`.

**MFA und Sessions:** Die serverseitige MFA-Policy unterstützt `optional`, `admins` und `all`; unbekannte nicht leere Konfiguration erzwingt fail-safe MFA für alle. Betroffene Konten ohne Faktor erhalten ausschließlich einen zeitlich begrenzten Enrollmentzugang, keine übrigen HTTP-/WebSocketrechte. Die Administration zeigt Policy, geprüften Zeitpunkt, abgedeckte/registrierte/ausstehende Konten und ausgeschlossene deaktivierte Konten. [Policyübersicht und ausstehende Konten](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/mfa-policy-overview.png). Das Profil listet einzelne Sessions mit Client, IP, Anmeldung, letztem Kontakt und Ablauf; eigener oder fremder Einzelzugang kann widerrufen werden. HTTP und verbundene WebSockets verlieren damit den Zugriff, während möglicherweise bereits gestartete Remote-Arbeit ausdrücklich weiterlaufen kann. [Mobile Sessionübersicht](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/sessions-mobile.png), `verification/sessions-retry.png`.

**Funktionale Prüfung:** 41 aktuelle Backendtests bestanden für Sessionisolation/-widerruf, MFA-Policy und -Transaktionen, Rollenpreview/-revision, Benutzertransaktionen, Einladungen und explizite Rollenzuweisung. Die vollständige Frontend-Suite bestand mit 67 Dateien und 302 Tests. Die genannten Browserfixtures verwenden tatsächliche Komponenten mit synthetischem Transport. Keine produktiven Konten, Rollen, Einladungen, Faktoren oder Sessions wurden verändert.

**SSO-Entscheidung:** SSO ist derzeit nicht implementiert und wird nicht durch UI-Texte suggeriert. Eine Einführung benötigt einen gewählten OIDC/SAML-Provider, Claim-/Gruppenzuordnung, Break-glass-Konten, Logout-/Sessionregeln und Recovery; ohne diese Betriebsentscheidungen wäre ein generischer Schalter kein belastbares Enterprise-Feature. Die lokale MFA-/Sessiondurchsetzung bleibt davon unabhängig und serverseitig geprüft.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 32, 33, 34, 65, 73.

### F31 · Plugins

**Status:** Lokal abgenommen (Shipyard-Pluginverwaltung und Host-Schnittstelle).

**Anforderung:** Paket-/Versionsinventar, Quelle, Kompatibilität, Rechteumfang, Freigabe und Update-/Rollback-Status; aktive Pluginseiten separat prüfen.

**Zusätzlicher Prüfkontext – Informationen:** Pfad und volle Serverrechte sind ehrlich erklärt. Im geprüften System sind keine Plugins installiert.

**Eingaben:** Manuelles Ablegen auf dem Dateisystem und Reload sind keine geführte Unternehmensverwaltung.

**UI:** Der Leerzustand ist verständlich, wiederholt aber den Installationspfad.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 35.

**Geprüfte Teilnachweise (11. September):** Inventar-/Versionsvergleich und Rollbackhinweise in `frontend-next/src/routes/settings/tabs/plugins.tsx`; installierte/registrierte Versionen aus `server/services/plugin-loader.js`. Browser: `verification/plugin-package-status.png`, `plugin-enable-error.png`, `plugin-inventory-error.png` (synthetische Inventarantworten). Aktiver `PluginHostPage` mit tatsächlichem dynamisch geladenem lokalen Testmodul: Umgebungswechsel beendet alte Ansicht; alte Anfrage scheitert mit AbortError; neue Anfrage enthält production; Initialisierungsfehler entfernt alle Abonnements; Retry startet genau eine neue Instanz. Aktueller Screenshot `verification/plugin-lifecycle-current.png`, Fixture `plugin-lifecycle-fixture.html`, Modulserver `server/test/fixtures/plugin-browser-server.js`. 24 aktuelle Backendtests in plugin-ui, plugin-admin-actions und plugin-compatibility bestanden; einschließlich Rollenprüfung, Freigabe-Digestbindung, atomarem Audit und Versionsabweichung.

**Ergänzende Browserabnahme:** Tatsächlicher PluginsTab mit synthetischer Enable-API (zunächst verzögerter HTTP 409, anschließend Erfolg): Bestätigung und Abbruch während der Anfrage gesperrt; Fehler im weiterhin geöffneten Dialog; Retry erfolgreich, Dialog geschlossen und aktualisierter Schalter auf Enabled. Screenshots `verification/plugin-enable-server-error.png` und `plugin-enable-success.png`, Fixture `plugin-enable-review.html`. Screenshot des Fehlers visuell geprüft: Meldung und beide Aktionen vollständig lesbar. Zusätzlich 5 Tests für Plugin-Mount und umgebungsgebundene Anfragen bestanden.

**Geltungsbereich:** Die Nachweise betreffen Shipyards Pluginverwaltung und Host-Schnittstelle; im Originalsystem waren keine Drittanbieter-Plugins installiert. Aktive Hostseite separat mit lokalem Testmodul geprüft. Keine produktiven Plugin-Workflows oder automatischer Paketrollback behauptet; der manuelle Paket-/Datenwiederherstellungsweg ist ausdrücklich angezeigt.

### F32 · Benachrichtigungen

**Status:** Lokal abgenommen für vorhandene Webhook-/SMTP-Kanäle und ausführbare Ereignisse. Severity-/Teamrouting bleibt an ein künftiges Monitoring-/Ownershipmodell gebunden.

**Anforderung:** Kanäle benennen, Testfeedback und Zustellprotokoll, Severity-/Teamrouting, Deduplizierung und Wartungsunterdrückung.

**Abschlussnachweis (11. September):** Webhook und Email (SMTP) sind als getrennte globale Kanäle benannt. URL, TLS-Verhalten, SMTP-Port, Absender/Empfänger und geheime Werte werden validiert; URL-Änderung bewahrt ein vorhandenes Webhooksecret und SMTP-Änderung ein vorhandenes Kennwort, sofern Ersatz oder Entfernung nicht ausdrücklich gewählt wird. Entwürfe überleben Hintergrundaktualisierung und lassen sich verwerfen. Tests sind nur mit gespeicherter Konfiguration möglich und zeigen Anfragezeit, Annahme oder dauerhafte Fehler; Endpoint-Annahme wird nicht als menschlicher Empfang bezeichnet. [Webhooksecret bleibt erhalten](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/webhook-secret-preserved.png), [SMTP-Kennwort bleibt erhalten](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/smtp-password-preserved.png).

**Zustellung, Deduplizierung und Wartung:** Das globale Protokoll enthält Kanal, nicht sensitiven Zielhost, Ereignistitel, Zeitpunkt, Ergebnis, HTTP-Status und Dauer für höchstens 1.000 Versuche/30 Tage. Accepted, teilweise abgewiesene SMTP-Empfänger, Failed, Unknown, Duplicate suppressed und Maintenance suppressed sind getrennt. Identische nachweislich akzeptierte Ereignisse können pro Umgebung/Kanalkonfiguration für 1–60 Minuten unterdrückt werden; fehlgeschlagene/partielle Zustellung, veränderte Inhalte und Direkttests bleiben wiederholbar. Der Cache ist ausdrücklich prozesslokal und verliert sich beim Neustart. [Deduplizierung und Verlauf](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/notification-preferences.png).

Wartungsunterdrückung ist standardmäßig aus und greift nur, wenn alle über stabile IDs aufgezeichneten Zielhosts in ihrer Umgebung aktuell abgedeckt sind. Fehlende, fremde, ersetzte oder uneindeutige Ziele werden weiterhin gemeldet; Fensterschluss ist exklusiv und ein unterdrücktes Ereignis belegt keinen Dedupe-Slot. [Wartungsstatus im Zustellprotokoll](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/notification-maintenance.png). 37 aktuelle Backendtests bestanden für Transport/SSRF-Schutz, SMTP-Annahmestufen, Historie/Retention, Dedupe und Wartungsabdeckung. Die vollständige Frontend-Suite bestand mit 302 Tests. Alle Transportaufrufe waren gemockt; keine externe Nachricht oder produktive Einstellung wurde verändert.

**Routingentscheidung:** Die ausführbaren Quellen liefern derzeit Fehlerereignisse für Playbooks und Updates; das vorhandene Ressourcenmonitoring ist in diesem Build ausdrücklich inaktiv. Es gibt außerdem noch kein kanonisches Team-/Escalation-Ownershipmodell für Hosts und Deployments. Daher würde ein Severity-/Teamrouting-Formular aktuell Scheinsicherheit erzeugen. Vor diesem Ausbau müssen Eventseverity, Ressourceneigentümer, Kanalziele, Fallbacks und Zustellverantwortung serverseitig modelliert werden. Die UI zeigt den inaktiven Monitoring-Schalter entsprechend gesperrt und behauptet keine Alarmierung.

**Zusätzlicher Prüfkontext – Informationen:** Webhook, SMTP und Eventschalter sind klar. Zustellhistorie und nachweisbarer Status fehlen im sichtbaren Bereich.

**Eingaben:** Basisfelder reichen zum Start. Webhooktyp, SMTP-TLS-Modus, Empfängervalidierung und Testvoraussetzungen könnten deutlicher sein.

**UI:** Saubere Form, aber mehrere identisch beschriftete Save/Test-Buttons.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 36.

### F33 · Systembetrieb / Polling / Agent

**Status:** Lokal abgenommen. Originalanforderung aus Review-Screenshot 37 erfüllt; Agentaktivierung/-installation wurde nicht ausgeführt.

**Anforderung:** System Health, Polling und Runtime getrennt führen; letzte erfolgreiche Erhebung, Fehler, Queue und Agent-Verteilung zeigen. Agentaktivierung nicht getestet.

**Zusätzlicher Prüfkontext – Informationen:** Versionen, Intervall und SSH/Agent-Unterschied werden erklärt. Custom Updates sagt gleichzeitig run check commands und nothing is executed — sprachlich widersprüchlich.

**Eingaben:** Intervalle und Zone passen; Auswirkungen der Änderungen auf Last, Aktualität und aktive Abläufe fehlen.

**UI:** Lange Seite mit heterogenen Aufgaben von Binary-Installation bis Monitoring.

**Abschlussnachweis (11. September):** Die Systemseite trennt beobachteten Prozesszustand, gespeicherte Pollingkonfiguration und Agentverteilung in eigene Abschnitte. Runtime status aktualisiert alle 15 Sekunden und zeigt registrierte/laufende Schedules, ausstehenden Neustart sowie fünf Collector-Zustände: laufend, wartend, gestoppt oder trotz Aktivierung ohne Timer. Zeit und Prozess-/Global-Scope sind sichtbar; Timerstatus wird ausdrücklich nicht als erfolgreiche Erhebung oder Hostverbindung ausgegeben. [Runtime und Queuezustand](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/polling-runtime.png).

**Erhebungen und Fehler:** Jeder Collector bewahrt die zehn letzten prozesslokalen Zyklen mit Start, Abschluss und gemeldeter Fehlerzahl; laufende Zyklen und nie beobachtete Collectors sind verschieden. Overlap wird übersprungen statt gequeued. Die Hilfe erklärt Neustartverlust, mögliche leere Zielmengen und dass null gemeldete Fehler keine vollständige Aktualität aller Hosts beweisen. [Aktueller Lauf und Zyklushistorie](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/polling-cycle-history.png).

**Polling-Eingaben:** Intervalle akzeptieren nur ganze 1–9999 Minuten. Ungültige/leere Werte bleiben als Entwurf sichtbar und sperren Save; Hintergrundrefresh überschreibt keine Bearbeitung, Discard übernimmt den neuesten gespeicherten Stand. Die Wirkung erklärt Last/Aktualität, globalen Umfang, Rescheduling ohne Sofortlauf und dass Deaktivieren laufende Arbeit nicht abbricht. Custom Updates sagt konsistent: Release-/Check-Kommandos werden periodisch ausgeführt, Updatekommandos nicht. [Validierung und Auswirkung](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/polling-invalid-draft.png).

**Agentverteilung:** Die globale Übersicht umfasst alle Umgebungen und trennt konfigurierte Push-, Pull- und SSH-Modi vom aktuell gewählten Modus. Letzter Report, Zone, Runner-Version, Intervall sowie recent/overdue/never/invalid/future sind sichtbar und durchsuchbar. Ein deaktivierter globaler Agentmodus löscht die Konfiguration nicht und wählt SSH; Reportalter beweist ausdrücklich keine Live-Verbindung. [Agentverteilung und Berichtsfrische](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/agent-overview.png).

**Funktionale Prüfung:** 12 aktuelle Backendtests bestanden für strikte/atomare Pollingkonfiguration, Runtime-/Zyklusbeobachtung, Agentinventar und zeitzonenunabhängige Reportfrische. Die vollständige Frontend-Suite bestand mit 302 Tests. Konfiguration und Audit committen gemeinsam; Collector-Neustart erfolgt danach. Browserdaten waren synthetisch. Keine Agentaktivierung, Installation, SSH-Erhebung oder produktive Pollingänderung wurde ausgeführt.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 37.

### F34 · Danger Zone / Wiederherstellung

**Status:** Lokal implementiert und abgenommen. Produktionsrollout ist nicht Bestandteil dieses Nachweises.

**Anforderung:** Backup/Restore priorisieren, Datenumfang und betroffene Umgebung genau nennen, aktuelle Sicherung und geschützte Bestätigung im Ablauf verlangen.

**Zusätzlicher Prüfkontext – Informationen:** Folgen werden kurz genannt. Ob etwa Container data nur lokale Daten oder Remote-Daten meint, sollte eindeutig sein.

**Eingaben:** Keine destruktiven Dialoge oder Aktionen ausgeführt; Bestätigungsqualität nicht bewertet.

**UI:** Gefahr ist farblich deutlich, die Buttons stehen jedoch sehr direkt nebeneinander.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 38.

**Aktuelle Nachweise:** `server/routes/reset.js` erzwingt Phrase, Scope, aktuelle Administrator-Zugangsdaten und einmalige Backup-Freigabe; `reset-backup-proof.js` vergleicht den betroffenen Datenstand. Das Formular und synthetische Browser-Abläufe liegen in `frontend-next/src/routes/settings/tabs/danger.tsx` und den Artefakten `verification/reset-backup-review.html`, `reset-backup-reselect-required.png`, `reset-backup-success.png`. `server/cli/recovery-activation.js` und die Recovery-Services decken Plan, Staging, Aktivierung, Rollback, Schlüssel-/Mountprüfung und Bereinigung ab. `application-recovery-runtime.test.js` prüft die aktivierte vollständige App-Routing-Schicht in einem neuen Prozess; weitere Recovery-Tests prüfen Prozessabbrüche, Wiederholung und Originalerhalt. Abschließender Prüfstand: 864 Backend-Tests, 249 Frontend-Tests, TypeScript und temporärer Produktionsbuild bestanden. Externe Hosts/Controller und Hintergrundausführungen wurden nicht gestartet.

### F35 · Suche, Activity Center, Umgebungen und Hilfe

**Status:** Lokal abgenommen. Originalanforderungen aus Review-Screenshots 66–69 erfüllt.

**Anforderung:** Scope der Live-Zentrale benennen, Zähler vereinheitlichen, Plattform-Shortcuts, kontextuelle Dokumentation, Support-/Versionsinformationen.

**Zusätzlicher Prüfkontext – Informationen:** Command Palette ist schnell zugänglich. Activity Center meldet 0 recent trotz vorhandener Historie, ohne seinen Zeitraum/Session-Scope zu erklären. Help bietet nur GitHub und Issues.

**Eingaben:** Suche und Umgebungsanlage sind einfach. Die Palette könnte VM-/Node-/Präfixressourcen und Klartextnamen besser einbeziehen.

**UI:** Konsistenter Kopfbereich. Das macOS-Symbol ⌘K wird in dieser Linux-Sitzung angezeigt.

**Abschlussnachweis (11. September):** Die Command Palette verwendet plattformgerechte Ctrl-/Command-Hinweise und enthält berechtigungsgebundene Hosts, Playbooks, Plattformen, Nodes, VMs, Container sowie IPAM-Präfixe/-Adressen. Namen, Hostnamen, IPs, Tags, numerische VMIDs und Klartextbezeichnungen sind suchbar. Die vollständige autorisierte Host-/Playbookmenge wird zuerst bewertet und erst danach für die Darstellung begrenzt; dadurch sind späte Einträge erreichbar. Ein Playbooktreffer öffnet direkt die revisionsgebundene Read-only-Inspektion. `g i` öffnet Infrastruktur. [Suche nach Host 99 in großem Inventar](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/command-search-host-99.png), `verification/playbook-direct-link.png`.

**Live-Zentrale und Zähler:** Activity Center nennt direkt, dass es Liveereignisse dieses Browsers für das aktuelle Konto und die aktuelle Umgebung enthält, 30 Ereignisse bewahrt und höchstens 20 zeigt. Es verweist für die vollständige aufgezeichnete Historie auf Operations und setzt seinen Zähler daher nicht mit Serverhistorie gleich. Ressourcennamen werden aus dem aktuellen berechtigten Inventar aufgelöst; Fehler zeigen Ursache und Ziel, ohne rohe IDs als vermeintliche Namen auszugeben. Dashboard-Operationszähler stammt aus derselben Operationsabfrage und fällt bei deren Fehler auf unbekannt statt auf einen widersprüchlichen Legacyzähler zurück.

**Umgebungen und Hilfe:** Anlage, Rename und Delete zeigen Ziel, Abhängigkeiten und Konsolidierungswirkung; Backendtests erzwingen Umgebungsisolation, verhindern Scope-Bypass und rollen fehlgeschlagene Konsolidierung samt Audit zurück. Der lokale Shipyard operator guide öffnet passend zur aktuellen Route und deckt Operations/Wartung, VM-Definitionen, Infrastruktur, Playbooks, Benachrichtigungen, Runtime, Branding, Git und Plugins ab. Er enthält Frontendversion und konkrete Problemberichtsinformationen; auf der Benachrichtigungsseite steht die zugehörige Hilfe zuerst. [Kontextuelle Operatorhilfe](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/verification/context-help-notifications.png).

**Funktionale Prüfung:** 28 aktuelle Frontendtests bestanden für Suche, Infrastrukturtreffer, Plattformtasten, Berechtigungen und UI-Verträge; die vollständige Suite bestand mit 302 Tests. Elf Backendtests bestanden für Sammlungsscope, widersprüchliche IDs, Auditkontext, Editorgrenzen, Konsolidierung und Rollen-Scope. Browserdaten waren synthetisch; keine Umgebung oder Ressource wurde produktiv verändert.

**Erforderlicher Nachweis:** Jede genannte Verbesserung im aktuellen UI bzw. Ablauf nachvollziehen; bei Schreibaktionen Erfolg, Fehler und Zielbereich prüfen. Original-Screenshot-Nummern: 66, 67, 68, 69.

## Neue Nachweise zum laufenden F34-Arbeitsblock

`server/services/reset-backup-proof.js` implementiert den Vergleich authentifizierter Sicherungsinhalte mit den aktuell vom jeweiligen Reset betroffenen Daten und Playbook-Dateien. `server/test/reset-backup-proof.test.js` prüft veränderte Daten, falsche Passphrase, unvollständige Dateisicherung, Umgebungsabgrenzung und die Tabellen der Reset-Arten. HTTP-/UI-Anbindung und verbindliche Prüfung unmittelbar vor dem Reset fehlen noch; F34 bleibt unvollständig. Diese Teilimplementierung ersetzt keine Wiederherstellungsabnahme.

Die zweistufige Upload-/Prüf-API ist nun in `server/routes/reset-backup.js` eingebunden; kurzlebige, benutzer-/aktions-/bereichsgebundene Einmalfreigaben sind implementiert. DELETE-Guard und UI-Anbindung sind weiterhin offen.

Aktueller F34-Fortschritt: DELETE-Guard und Formularanbindung sind implementiert. Der Vergleich läuft vor Datenbanklöschung in einer unmittelbaren Transaktion, bei Dateien nochmals nach Staging vor Commit. Browser-Abnahme des neuen Ablaufs sowie Wiederherstellungsaktivierung/Rollback bleiben offen. Frühere Einträge oben beschreiben den damaligen Zwischenstand.

## Browser-Nachweis Reset-Formular

Der aktuelle `DangerTab` wurde am 11. September mit einer ausdrücklich synthetischen API im lokalen Vite-Browser geprüft. `verification/reset-backup-review.html` reproduziert den Ablauf ohne Live-Aufrufe. Nach Dateiauswahl und Prüfung werden Geheimfelder geleert und eine Einmalfreigabe angezeigt. Der erste synthetische Reset liefert einen Konflikt wegen geänderter Daten. Danach sind Freigabe und Dateiauswahl verworfen; auch ausgefüllte Geheimfelder aktivieren die Prüfung erst nach erneuter Dateiauswahl. Eine erneute Prüfung und Bestätigung endet erfolgreich.

Nachweise im ursprünglichen Artefaktverzeichnis: `verification/reset-backup-reselect-required.png`, `verification/reset-backup-success.png`. `reset-backup-stale.png` dokumentiert den zuerst beobachteten Fehlerzustand vor der Dateiauswahlkorrektur. Diese Fixtures bestätigen Komponentenverhalten; echte Archivprüfung/Reset-Ausführung sind separat durch Backend-Integrationstests belegt. Eine produktive oder vollständige Wiederherstellungsabnahme ist damit nicht behauptet.

F34-Aktivierung: Ein verifizierter, expliziter Zielplan ist mit `server/cli/recovery-activation.js plan` verfügbar. Datenbank-Overlay und verschachtelte/aliasierte Dateiwurzeln werden zusammengeführt; Aktivierung, dauerhaftes Rollback-Protokoll und Runtime-Abnahme sind weiterhin offen.

F34-Aktivierung: Zusätzlich ist `recovery-activation.js stage` implementiert. Verifizierte Kopien werden mit Datenbank-Overlay neben den Zielen abgelegt und mit Fortschrittsjournal synchronisiert; neun Plan-/Staging-Tests bestanden. Umschaltung, Wiederaufnahme nach Unterbrechung, Rollback und Runtime-Abnahme bleiben offen.

F34-Aktivierung: Backend-Funktionen für Umschaltung und Rollback sind implementiert; Originale und zurückgenommene neue Daten bleiben erhalten. Tests decken Fehler nach Umbenennung sowie einen tatsächlichen Kindprozessabbruch ab. CLI-Anbindung, Prozesssperre, Schlüsselprüfung und isolierte Runtime-Abnahme sind noch offen.

F34-Schlüsselprüfung: Die Aktivierungsfunktion prüft jetzt den ursprünglichen Anwendungsschlüssel am authentifizierten Archiv vor Zieländerungen. Acht Integrationstests mit verschlüsseltem Testwert bestanden. Keine positive Schlüsselbestätigung wird behauptet, wenn ein Archiv keine prüfbaren verschlüsselten Werte enthält. Prozesssperre, CLI-Anbindung und Runtime-Abnahme bleiben offen.

F13 aktueller Befund: Der VM-Assistent hat fünf Schritte und Review, aber noch keine IPAM-Auswahl. Katalog/Vorlagen/Playbooks und Speichern sind jetzt explizit an die Dialogumgebung gebunden. Lebenszyklus-Abnahme und übrige F13-Anforderungen bleiben offen.

F13 IPAM-Auswahl ist jetzt im Netzwerkschritt vorhanden und als tatsächliche Komponente mit synthetischer API browsergeprüft: aktuelle Adresse/Präfix/Gateway übernehmen, erschöpftes Präfix melden, vorhandene Werte erhalten. Keine automatische Reservierung; Lebenszyklus- und vollständige Assistenten-Abnahme bleiben offen.

F13 Entwürfe: Hintergrundaktualisierungen überschreiben den offenen VM-Entwurf nicht mehr. Beobachtete Konfigurationskonflikte sperren Speichern; Zielwechsel initialisieren eine neue Dialoginstanz. Browsernachweis: `verification/vm-draft-conflict.png`. Backend-Konfliktschutz und vollständige Lebenszyklus-Abnahme sind damit nicht belegt.

## F13 Lebenszyklus: Grenzen der vorhandenen Nachweise

Die aktuelle Prüfung von `server/test/opentofu-run-security.test.js` zeigt: Der Test schreibt ein Shell-Skript als simuliertes `tofu`-Programm. Geprüft werden gespeicherte Planbindung, Workspace-Sperre, Ausgabe, State-Sicherung/-Wiederherstellung und Wiederverwendungsschutz. Dies ist kein Nachweis einer tatsächlichen Proxmox-VM-Erstellung, Drift-Erkennung oder Gastwiederherstellung. F13 bleibt deshalb offen; eine isolierte reale Test-VM und der entsprechende Ausführungsrahmen wurden in dieser Arbeit nicht festgelegt. Andere Review-Punkte können unabhängig davon weiterbearbeitet werden.

F31 begonnen: Bei fehlgeschlagenem Plugin-Inventar-Refresh wurde neben dem Fehler weiterhin die zwischengespeicherte bedienbare Plugin-Liste angezeigt. Die Liste wird jetzt wie der Leerzustand nur bei erfolgreicher Inventarabfrage angezeigt. Weitere Plugin-Abnahme folgt.

F31: Installierte und registrierte Plugin-Versionen werden jetzt getrennt angezeigt, einschließlich abweichender/unlesbarer/fehlender Versionsangaben. Manueller Update-/Rollback-Weg und dessen Grenzen sind sichtbar. Sechs Loader/Admin-Tests bestanden; die Versionsanzeige ist ausdrücklich kein Integritätsnachweis. Browser- und aktive Plugin-Abnahme bleiben offen.

P1-02 Image-Aktualität: Dashboard und Host-Inventar liefern jetzt image_updates_stale anhand des konfigurierten Image-Prüfintervalls (Standard sechs Stunden, veraltet nach zwei Intervallen). Das Dashboard unterdrückt den gesunden Gesamtstatus auch bei veralteten leeren Image-Katalogen. Drei Backend-Integrationstests und TypeScript bestanden. Browsernachweis mit tatsächlicher Komponente und synthetischer API: verification/dashboard-image-stale-review.html und dashboard-image-stale-current.png im Review-Verzeichnis; frisch markierter Katalog stellt den gesunden Status wieder her. Kein Live-Aufruf. Gesamtabnahme P1-02 weiterhin offen.

P1-02 Host-Detail: Der gecachte Image-Endpunkt liefert Quelle, Prüfzeit und Veraltungsstatus. Die Docker-Ansicht zeigt diese Angaben und erklärt den separaten OS-Katalog; nach erfolgreicher Image-Prüfung wird die Metadatenabfrage erneut ausgelöst. Drei Backend-Tests einschließlich Vergleich der Prüfzeit und veraltetem Detailkatalog bestanden, TypeScript und gezieltes ESLint ebenfalls. Die neue Detailanzeige ist noch nicht browserabgenommen.

P1-02 Image-Leserechte korrigiert: Gecachte Ergebnisse erfordern canViewDocker und canViewUpdates statt canPullDocker. Integrationstest belegt Lesen ohne Ausführungsrecht (200), aktive Prüfung bleibt verboten (403), fehlende Ansichtsrechte ebenfalls 403. Browserprüfung der tatsächlichen Docker-Komponente mit synthetischem Controller zeigt Quelle, Zürcher Prüfzeit, relative Zeit und Veraltungshinweis für reine Leser ohne Prüfbutton. Nachweise: verification/image-detail-review.html und image-detail-current.png. Drei Backend-Tests und TypeScript bestanden; temporäre Frontend-Fixture entfernt.

Aktueller Gesamttest nach den Zeit-, Rollen-, Plugin- und Katalogänderungen: 864 Backend-Tests (18 Suites) und 258 Frontend-Tests (53 Dateien) bestanden, keine fehlgeschlagenen oder übersprungenen Backend-Tests. Produktionsbuild in /tmp/shipyard-review-current-build bestanden. Logs: /tmp/review-current-backend.log, /tmp/review-current-frontend.log, /tmp/review-current-build.log. Keine Bereitstellung; diese Prüfung ersetzt keine noch offene Feature-Abnahme. Nächster belegter P1-02-Restpunkt: Custom-Update-API liefert bisher keinen Veraltungsstatus; eine alte erfolgreiche Prüfung erscheint in der Detailansicht weiterhin als aktuell.

P1-02 Custom-Prüfungen: Listen-API liefert Quelle und Veraltung anhand poll_custom_updates_interval_min (Standard sechs Stunden, Altersschwelle zwölf Stunden). Detailansicht zeigt alte leere Ergebnisse nicht mehr als aktuell; bekannte Updates behalten ihren Warnstatus samt Hinweis auf erneute Prüfung. Sechs Routentests bestanden, einschließlich fehlender/frischer/alter Prüfzeit und Quellenangabe. Browserabnahme und Aggregation dieses Zustands im Gesamtdashboard stehen noch aus.

P1-02 Custom-Gesamtstatus: Host-Inventar und Dashboard melden fehlende/veraltete konfigurierte Custom-Prüfungen; keine Aufgaben ergibt keinen Veraltungshinweis. Backendtest bestätigt dies sowie frische Prüfungen und Rechtefilterung. Tatsächliches Dashboard mit synthetischen Daten im Browser geprüft: veraltete Custom-Prüfung unterdrückt gesunden Status, frische Prüfung stellt ihn wieder her. Nachweise: verification/dashboard-custom-stale-review.html und dashboard-custom-stale-current.png. Drei Integrationstests und TypeScript bestanden.

P1-02 Custom-Detail browserabgenommen: Tatsächliche ServerUpdatesTab-Komponente mit synthetischem Controller zeigt alte erfolgreiche Prüfung als Check missing or stale und bekannte Updates weiterhin als Update available mit Veraltungshinweis. Quelle und Prüfzeit sichtbar. Statusspalte nach visueller Prüfung von 17 auf 29 Prozent verbreitert; keine abgeschnittenen Statusangaben im geprüften Desktop-Layout. Nachweise verification/custom-detail-review.html und custom-detail-current.png. Temporärer Einstieg entfernt.

P1-02 Hostübersicht: Gemeinsame summarizeUpdates-Funktion berücksichtigt nun fehlende/veraltete Image-Prüfungen und veraltete Custom-Prüfungen aus dem Controller, jeweils nur bei entsprechenden Leserechten. Bekannte Updatezahlen bleiben neben den Aktualitätswarnungen sichtbar. Zehn Zusammenfassungstests bestanden, einschließlich leerer und nichtleerer Kataloge bei Veraltung.

P1-02 Custom-Abfragefehler: Controller gibt Lade-/Fehlerzustand und Retry weiter. Hostzusammenfassung behandelt beides als fehlende Prüfung; Detailtab zeigt expliziten Lade- bzw. Fehlerzustand statt einer leeren oder zwischengespeicherten bedienbaren Liste. Browser mit tatsächlicher Komponente und synthetischem Fehler samt vorhandenen Cacheeinträgen bestätigt Fehleranzeige und Retry, keine Taskliste. Nachweise verification/custom-error-review.html und custom-error-current.png. Der Retry-Netzwerkablauf wurde mit dieser statischen Fixture nicht getestet.

P1-02 Retry-Nachweis: Tatsächliche Custom-Detailkomponente mit React Query geprüft. Erste synthetische Abfrage scheitert, Klick auf Retry lädt eine lokale JSON-Antwort per HTTP und ersetzt den Fehler durch Reloaded check mit Update available, Quelle und Prüfzeit. Nachweise verification/custom-retry-review.html, custom-retry-data.json, custom-retry-current.png. Dies prüft die Komponenten-/Query-Verbindung; kein produktiver API- oder SSH-Aufruf. Temporäre Frontend-Dateien entfernt.

Custom-Tab Rechtezustand: Bei Ausführungs-/Bearbeitungsrecht ohne Leserecht hat die deaktivierte Query weiterhin isPending. Die Ansicht prüft nun zuerst das Leserecht und erklärt den fehlenden Zugriff statt dauerhaft Loading zu zeigen oder Cacheeinträge einzublenden. Browsernachweis mit synthetischer Rolle und vorhandenen Cacheeinträgen: verification/custom-no-access-review.html und custom-no-access-current.png. Kein Zugriff auf produktive Daten.

P1-03 konkreter Widerspruch behoben: VmObjectSummary leitete den Zustand bisher nur aus fleet_server_id ab, während Management & provisioning auch VM-Definitionen berücksichtigt. Die obere Zusammenfassung erhält jetzt den Zustand aus derselben erfolgreichen Kontextabfrage wie die Managementkarte und zeigt zusätzlich den verknüpften Hostnamen. Fehlender/fehlgeschlagener Kontext wird ausdrücklich angezeigt statt Inventory only zu behaupten. Browserabnahme dieser Änderung steht aus.

P1-03 VM-Detail browsergeprüft: Tatsächliche ProxmoxVmDetailPage mit synthetischen API-Antworten zeigt Example VM, Operations host name und Declared application. Obere Zusammenfassung und Managementkarte nennen identisch VM definition · host operations enabled. Hostlink zeigt /servers/host-fixture, Definitionslink /deployments/definition-fixture. Nachweise verification/vm-identity-review.html und vm-identity-current.png. Keine Navigation oder externe VM-Ausführung ausgelöst; übrige P1-03-Ansichten noch abzugleichen.

P1-03 Definitionsname ergänzt: VM-Managementkarte zeigt nun den definierten VM-Namen zusätzlich zum Workspace-Namen. Open definition hat eine zugängliche Beschriftung mit beiden Namen. Browser mit abweichenden Namen Example VM / Operations host name / declared-app-01 bestätigt die getrennte Zuordnung und Definitionsziel. Nachweis verification/vm-definition-identity-current.png; aktualisierte Fixture vm-identity-review.html.

P1-03 Host-Gegenrichtung: Managementkarte unterscheidet jetzt fehlendes Leserecht, laufende Abfrage, Abfragefehler mit Retry und erfolgreich bestätigte leere Beziehungen. Bisher wurden alle vier als nicht verknüpft dargestellt. Vorhandene Beziehungen zeigen zusätzlich vm.name neben Node und VM-ID. Controller reicht Queryzustände durch. Browserabnahme steht aus.

P1-03 Kontextberechtigung korrigiert: GET managed-servers/:serverId ist backendseitig ausdrücklich durch canViewServers und Host-Ressourcenfilter geschützt. Das Frontend verlangte fälschlich canViewDeployments/canManageDeployments und lud Beziehungen für reine Hostleser nicht. Controller verwendet jetzt canViewManagementRelationships aus canViewServers, entsprechend dem vorhandenen API-Vertrag. Keine Backend-Rechte erweitert.

P1-03 Host-Managementkarte browsergeprüft (Configuration-Tab): tatsächliche Komponente mit synthetischem Controller zeigt Example VM, Node pve001, VM-ID 101 und eindeutigen Inventarlink. Umschalten auf Fehler/Laden zeigt jeweils expliziten Zustand und keine Aussage nicht verknüpft. Nachweis verification/host-identity-review.html und host-identity-current.png. Fixture prüft Karte, nicht den vollständigen Controller oder die separate Management-mode-Zusammenfassung.

P1-03 Management-Kurzangaben vereinheitlicht: Hostübersicht und System & access verwenden jetzt denselben managementLabel-Helfer wie die VM-Seite und berücksichtigen Ladefehler, Laden und fehlende Kontextrechte. Ein vorhandener Host wird als Host operations enabled bezeichnet; eine zusätzliche Definition bleibt erkennbar. Legacy-API-Zuordnungen ohne kind gelten wie in der bestehenden Beziehungskarte als Definition, explizites inventory als Inventarbeziehung. Browserabnahme der Kurzangaben noch offen.

P1-03 Management-Kurzangabe browserbestätigt: Host Configuration zeigt bei einer Definitionsbeziehung VM definition · host operations enabled, konsistent mit der VM-Seite. Bei Fehler erscheint Management context unavailable zugleich mit dem Fehler der Beziehungskarte. Nachweis verification/host-management-review.html und host-management-current.png; tatsächliche Komponente, synthetischer Controller.

P1-03 Infrastrukturbaum: VM-Hauptlink führt bereits konsistent zum Inventar, separater Hostlink zum Hostbetrieb; aktive Hostpfade öffnen den zugehörigen Baumzweig. Ergänzt wurde der abweichende Hostname unter dem VM-Namen aus der bereits verfügbaren Hostliste. Tooltip und zugänglicher Hostlink benennen das konkrete Hostziel; bei nicht verfügbarem Namen dient die verknüpfte ID als Rückfall. Browserabnahme steht aus.

P1-03 Baum-Namensquelle korrigiert: Die lokale servers-Liste enthält absichtlich nur eigenständige Hosts. Die vorher ergänzte Namenssuche konnte verknüpfte Hosts deshalb nicht finden. Eine eigene hostNames-Map verwendet nun alle bereits geladenen Hosts der aktuellen Umgebung. VM-Zeilen und Hostlinks verwenden diese Map; der Baumfilter findet VM-/Node-Zweige auch über den verknüpften Hostnamen. Keine zusätzlichen Abfragen, keine Namen aus anderen Umgebungen. Browserabnahme weiterhin offen.

P1-03 Baum browsergeprüft: Tatsächlicher InfrastructureTree mit synthetischen API-Antworten zeigt Example VM und Host: Operations alias, getrennte Inventar-/Hostlinks mit richtigen IDs. Filter Operations alias erhält den Plattform-/Node-/VM-Zweig. Verknüpfter Host wird nicht zusätzlich als eigenständiger Host gezählt (Standalone hosts 0). Nachweise verification/tree-identity-review.html und tree-identity-current.png. Keine produktive Navigation oder Schreibaktion.

P1-03 Command Palette: Infrastruktur-Suchbegriffe enthalten jetzt verknüpfte Hostnamen aus der vorhandenen berechtigten Hostliste. Node-/VM-Ziele bleiben Inventarlinks. Ohne canViewServers werden keine Hostnamen beigesteuert. Drei Suchtests bestanden; zusätzlicher Fall prüft Hostalias für Node/VM, unverändertes VM-Ziel und fehlende Aliasübernahme ohne Hostliste.

P1-03 Suchtreffer erklären Alias: Node-/VM-Treffer zeigen den verknüpften Hostnamen nun auch im Beschreibungstext statt ihn nur unsichtbar als Suchwort zu verwenden. Drei Suchtests bestanden, einschließlich sichtbarer Hostbeschreibung. Gemeinsamer TypeScript- und ESLint-Lauf für die jüngsten Such-/Baum-/Detailänderungen zuvor bestanden.

P1-03 gemischter Baumfilter korrigiert: Ein direkter Node-/Hostalias-Treffer behält seine Kinder auch dann, wenn zugleich eine einzelne VM eines anderen Nodes passt. Zuvor ersetzte jede nichtleere direkte VM-Treffermenge die Kinder des passenden Nodes. Browserfall Operations trifft Operations node und Operations guest; Child VM unter erstem Node sowie zweite VM bleiben sichtbar. Nachweise verification/tree-mixed-review.html und tree-mixed-current.png.

P1-03 Node-Hostalias: Infrastrukturbaum zeigt abweichenden Hostnamen auch unter Hypervisor-Nodes. Getrennter Hostlink benennt Alias und Node. Browser bestätigt pve001 / Operations node und Ziel /servers/node-link; Nachweis verification/tree-node-current.png, reproduzierbar mit tree-mixed-review.html.

P1-03 Zählerumfang: Plattformzähler im Baum benennt VM/CT statt nur VM, da das Inventar auch LXC-Gäste enthält. Tooltip unterscheidet gesamtes Inventar von den durch den Filter angezeigten Gästen. Filterhinweis erklärt ausdrücklich den Umfang der Infrastrukturzähler; dadurch werden reduzierte Trefferzahlen nicht als Plattformgesamtbestand dargestellt.

P1-03 Zähler browserbestätigt: Plattform und Nodes bezeichnen Gäste als VM/CT. Filter Child reduziert zwei Gäste auf einen Gast und einen Node; Tooltip und sichtbarer Hinweis nennen Filterumfang. 320px-Baum visuell geprüft: Namen, Hostalias und Zähler lesbar. Nachweis verification/tree-count-current.png, reproduzierbar mit tree-mixed-review.html.

P1-03 API-Namensbefund: Adoptierte VM-Zuordnungen lieferten bisher den Hostnamen als vm.name, obwohl diese Namen abweichen können. Diese unbelegte Gleichsetzung ist entfernt; API liefert null, UI erklärt fehlenden Inventarnamen und bietet den vorhandenen Inventarlink, Node und VM-ID. Echte Inventarnamensübernahme bleibt offen; synthetische frühere Namensfixtures beweisen diese API-Lieferung nicht.

P1-03 Inventarname angebunden: Adoptierte Hostzuordnung liest den Namen aus dem gespeicherten Inventar der Quellumgebung. Verbindung, Node, VM-ID und Gasttyp müssen eindeutig passen; fehlende/defekte/mehrdeutige Snapshots liefern keinen erfundenen Namen. Zwei Helpertests bestanden. Kein Controlleraufruf oder Hintergrundrefresh ausgelöst. HTTP-Integration dieses neuen Namenspfads noch zu prüfen.

P1-03 HTTP-Namenspfad bestanden: managed-host-identity.test.js verwendet echte Express-Route, OpenTofu-Schema und isolierte SQLite. Host alias und Inventory VM bleiben getrennt, Verbindung und VM-ID stimmen; fehlender Snapshot ergibt null statt Hostalias. Verbindungsparser synthetisch, keine Controller-/Netzwerkoperation.

P1-03 Rechte im HTTP-Nachweis ergänzt: Eigene Rolle mit ausschließlich canViewServers und einem freigegebenen Host kann dessen Inventarnamen lesen (200), fremder Host bleibt 404, fehlendes Hostleserecht 403. Zusammen mit den Namenszuordnungstests drei Tests bestanden. Dies bestätigt den eingeschränkten Route-Vertrag für die Frontend-Kontextabfrage ohne Deployment-Rechte.

P1-03 verbleibender Vorschaukontext: Node-Vorschau kennt Hostadoption, aber keine Definitionsbeziehung. Fehlende Adoption wird deshalb jetzt als Host operations not enabled bezeichnet statt unbelegt Inventory only. Tabellenlink benennt Open host und zugänglich konkrete VM/CT-ID. Noch offen: vollständige Zustands-/Namensabnahme der Plattform-/Node-Inventarlisten und Definitionsansichten; bisherige Detail-/Baumnachweise decken diese nicht vollständig ab.

P1-03 Definitionsansicht: DeploymentDetail bietet nun Open inventory VM, wenn eine verfügbare Live-VM mit konkreter ID und Plattformendpoint vorliegt und Infrastrukturleserecht besteht. Node und ID stammen aus der beobachteten Ressource; reine unbereitgestellte Definitionen erhalten keinen geratenen VM-Link. Browser-/Zielabnahme noch offen.

P1-03 Inventarlink-Normalisierung: platformInventoryId bildet wie das Backend URL-Origin plus Pfad ohne abschließende Slashes. Zwei Tests bestätigen Root-, Reverse-Proxy- und API-Pfade sowie fehlende/ungültige Endpunkte. DeploymentDetail nutzt den getesteten Helfer. Browsernavigation weiterhin offen.

P1-03 Navigation browserbestätigt: tatsächliche DeploymentDetailPage → Open inventory VM → tatsächliche ProxmoxVmDetailPage → Open definition → ursprüngliche Definition. Plattformschlüssel mit URL-Encoding, Node pve001 und VM-ID 101 bleiben korrekt, abweichende Namen declared-app-01 und Example VM nachvollziehbar. Fixture verification/definition-navigation-review.html verwendet synthetische Antworten. Dabei beobachtet: Definitionsabfragen übergeben keinen expliziten Environment-Header; API-Vertrag hierfür gesondert prüfen.

Korrektur zum Definitions-Environment-Nachweis: apiFetch setzt X-Shipyard-Environment standardmäßig aus localStorage shipyard_environment. Fehlende explizite options.environmentId bedeutet daher nicht fehlenden Header. Die Navigationsfixture hatte nur useUi gesetzt und deshalb die erwartete Umgebung nicht gespeichert. Backend gleicht Ressourcen- und Requestumgebung ab. API-Tests für automatische sowie explizite Umgebungsbindung erneut bestanden; kein belegter Produktfehler aus diesem Fixture-Befund.

Definitionsansicht Live-Vergleich korrigiert: Fehlende oder fehlgeschlagene Live-Abfrage erscheint nicht mehr als None observed. Ladezustand, Fehler und unavailable sind ausdrücklich getrennt; veraltete Differenzliste bei Fehler verborgen. Driftplan erklärt fehlende/ladende Historie. Browsernachweis unavailable: verification/definition-unknown-review.html und definition-unknown-current.png.

Definitionsansicht Zustandsabfrage: Während stateQuery noch läuft, zeigt Isolation & drift ausdrücklich Loading independent VM state statt bereits grün Independent state. Browser mit tatsächlicher Seite und absichtlich ausstehender synthetischer Antwort bestätigt dies; Fixture verification/definition-state-loading-review.html.

Definitionsansicht fachlicher State-Fehler: State-Route liefert bei fehlendem Workspacepfad HTTP 200 mit error-Feld. UI berücksichtigt dieses Feld nun wie einen Queryfehler statt Independent state anzuzeigen. Browser mit synthetischer HTTP-200-Fehlerantwort bestätigt Fehlermeldung und Retry: verification/definition-state-error-review.html.

Definitionsansicht partieller Vergleich: Fehlende CPU-, RAM- und Bridgewerte erzeugen keine erfundenen Differenzen; fehlendes VLAN wird von explizit keinem VLAN unterschieden. Unvollständige relevante Live-Felder kennzeichnen Vergleich als partial, auch ohne bekannte Differenzen. Browser mit definition-navigation-review.html bestätigt Incomplete live data; comparison partial bei fehlenden VLAN-/IP-Werten. TypeScript bestanden.

Definitionsansicht Teilvergleich mit bekannten Abweichungen browserbestätigt: CPU 2→4 und RAM 1024→2048 werden als zwei konkrete Unterschiede angezeigt; fehlende Disk-/VLAN-/IP-Werte führen zusätzlich zu incomplete data und keiner erfundenen Diskabweichung. Nachweise verification/definition-differences-review.html und definition-differences-current.png.

Definitionshistorie Zeitfehler behoben: Laufende Vorgänge zeigten started_at unter Completed. Nun separate Started-/Completed-Spalten mit Timestamp. Browser bestätigt laufenden Plan: Started 11 Sept 2026 08:00 Europe/Zurich plus relative Zeit, Completed leer. Fixture verification/definition-running-time-review.html; synthetischer Lauf, kein Plan gestartet.

Definitionshistorie Logzugang ergänzt: View logs öffnet vorhandenen RunDetailsDialog über /opentofu/vms/:id/runs/:runId. Querykey unterscheidet VM und Workspace. Workspace-Abbruchaktion bleibt für diesen VM-Dialog verborgen, da kein entsprechender VM-Endpunkt vorhanden ist. Browserabnahme des Logabrufs noch offen.

Definitionshistorie Logdialog browserbestätigt: View logs für running-fixture lädt dessen VM-Laufdetails, zeigt plan success, Start 08:00 und Abschluss 08:01 Europe/Zurich sowie synthetische Ausgabe. Nachweise verification/definition-log-review.html und definition-log-current.png. Kein tatsächlicher Plan oder Controlleraufruf.

Logdialog Refresh-Fehler: Ausgabe war bereits durch Fehlermeldung ersetzt, aber Header/Planübersicht und Copy/Cancel konnten weiterhin alte Querydaten verwenden. run wird bei Queryfehler nun unverfügbar; Beschreibung erklärt Retry statt Loading, alte Status-/Planangaben verschwinden und Copy ist deaktiviert. Browserabnahme des Refresh-Fehlers noch offen.

Logdialog Refresh browserabgenommen: Erste Antwort zeigt Ausgabe, zweite synthetische HTTP-503-Antwort entfernt alten Erfolgsstatus/Ausgabe und deaktiviert Copy, erneuter Refresh stellt Ausgabe und Status wieder her. Nachweise verification/log-refresh-review.html und log-refresh-error-current.png. Tatsächlicher Dialog mit React Query, keine Live-Ausführung.

Aktueller Prüfstand: 15 betroffene Backendtests bestanden, TypeScript bestanden. Vollständiger Frontendlauf: 261 bestanden, ein veralteter Textvertrag erwartete den früheren Hostlink-Wortlaut. Nach Anpassung an den bereits browsergeprüften konkreten Host-/VM-Namen besteht die betroffene ui-refactor-contract-Datei erneut vollständig. Kein fachlicher Abschluss allein aus diesen Testzahlen.

Definitionsansicht Plansummen: Fehlende, ungültige oder unvollständige Planstatistik wird nicht mehr als vier Nullwerte interpretiert. Parser verlangt die vier nichtnegativen ganzzahligen Änderungszähler, die serverseitig summarizePlanJson liefert. Apply-Freigabe im UI verlangt lesbare Zusammenfassung zusätzlich zur Isolationsprüfung; unlesbare Driftstatistik wird nicht als keine Drift gewertet. Browserabnahme dieses Falls steht aus.

Plansummen-Prüfung ergänzt: Gemeinsamer Parser mit drei Verhaltenstests unterscheidet belegte Nulländerungen von fehlender Statistik, prüft jeden Änderungszähler einschließlich Löschung/Ersetzung gegen ungültige Werte und erhält gemischte Operationen. Alle drei Tests bestanden. Bei bestandener Isolation, aber ungültiger Statistik erklärt die Definitionsansicht nun ausdrücklich die Apply-Sperre und verweist auf Logs und einen neuen Plan. Browserabnahme weiterhin offen.

P1-03 Inventarumfang: Plattform-/Node-Vorschau, Übersicht und VM-Tabelle nennen die gemeinsam gezählten VMs und Container ausdrücklich. Sammelaktion benennt Hostbetrieb und konkrete Zahl statt orphaned; Tabellenstatus nutzt dieselben Running/Stopped-Begriffe wie die Vorschau. Browser mit tatsächlichen Komponenten und einer VM plus einem Container bestätigt zwei Inventarressourcen, eine ohne Hostbetrieb und ausschließlich diesen Container im Sammelaktionscallback. Screenshot verification/inventory-scope-current.png visuell geprüft; Fixture inventory-scope-review.html. TypeScript bestanden. Kein echter Hostzugriff; vollständige Namens-/Definitionszuordnung der Listen weiterhin offen.

P1-03 Inventarnavigation: VmTable unterdrückte Namenslinks bei fehlender connections-Metadatenliste, obwohl Plattform-/Node-/Gast-ID vorhanden sind und dieselbe Ressource in der Vorschau verlinkt ist. Namenslinks nutzen nun immer diese Inventaridentität; Hostdetails bleiben separate Aktion. Browser mit inventory-scope-review.html ohne connections bestätigt identische VM- und CT-Ziele in Vorschau/Tabelle sowie separates Hostdetails-Menü. Nachweis verification/inventory-links-current.png. Dies bestätigt Linkdarstellung, nicht vollständige Zielseitenabnahme.

P1-03 Quellidentität: infrastructure-summary verlor fleet_connection_id im Gegensatz zum Vollinventar. Zusammenfassung erhält nun die konkrete Adoptionsquelle sowohl beim Laden als auch Serialisieren. Verhaltenstest mit zwei gleichwertigen Verbindungen und Adoption ausschließlich über die zweite bestätigt Host-ID/Verbindungs-ID in frischer Antwort und Cache; nicht adoptierter Container bleibt ohne Zuordnung. Vier Tests in infrastructure-reachability.test.js bestanden. Frontend-Gesamtlauf vor dieser Backendänderung: 55 Dateien, 265 Tests bestanden (/tmp/review-inventory-frontend.log). Kein Live-Proxmox-Aufruf.

P1-03/P1-02 VM-Fallback im Browser: Bei synthetischem Vollinventar-HTTP-503 nutzt tatsächliche ProxmoxVmDetailPage die Zusammenfassung und fragt Kontext/Snapshots über die zweite, tatsächlich adoptierende Verbindung ab; Fixture weist jeden anderen Verbindungsaufruf ab. Host- und Definitionsnamen erscheinen korrekt. Zusätzlich fehlenden Fehlerhinweis behoben: Vollinventarfehler kennzeichnet nun zuvor geladene/Zusammenfassungsdaten sichtbar und bietet Try again. Nachweise verification/vm-source-fallback-review.html und vm-source-fallback-current.png. Kein Live-Proxmox-Zugriff.

VM-Inventarerholung browserbestätigt: Nach Freigabe erfolgreicher Antworten in vm-source-retry-review.html übernimmt das vorhandene automatische Polling die aktuelle VM (Refreshed application VM), entfernt den Vollinventarfehler und erhält Host-/Definitionsbeziehungen. Screenshot verification/vm-source-recovery-current.png. Der beabsichtigte manuelle Retry-Klick kam nach automatischer Erholung und fand keinen Button mehr; deshalb ausdrücklich Nachweis der automatischen Erholung, nicht des manuellen Retry. Synthetische Antworten, keine Live-Aktion.

VM-Vorgangsstatus: Gemeinsames isActiveRunStatus berücksichtigt queued/running/cancelling für Aktionssperren der Definitionsansicht und Polling im RunDetailsDialog. Zuvor endete Dialogpolling bei cancelling, bevor der endgültige Abbruchstatus ankam. Verhaltenstest bestätigt aktive und terminale Zustände; bestanden. Browserabnahme des vollständigen Statusübergangs noch offen.

Log-Abbruch browserabgenommen: Tatsächlicher RunDetailsDialog zeigt zunächst cancelling und übernimmt ohne Refreshklick interrupted samt Abschlusszeit und finaler Ausgabe nach Polling. Fixture verification/log-cancellation-review.html, Screenshot log-cancellation-current.png. Aktions-/Statusbezeichnungen in Dialog und Definitionshistorie anschließend zentral lesbar gemacht (Apply plan, Cancellation in progress, Interrupted); im Browser bestätigt. Testantworten synthetisch, kein tatsächlicher Abbruch ausgelöst. TypeScript-Prüfung bestanden.

Plansummen im Logdialog vereinheitlicht: RunDetailsDialog verwendet denselben validierenden Parser wie DeploymentDetail statt fehlende Änderungszähler auf null Änderungen zu setzen. Unvollständige Statistik zeigt ausdrücklichen Hinweis mit Logbezug. Browser mit tatsächlichem Dialog und synthetischem {create:0} bestätigt keine erfundenen Nullwerte für Update/Delete/Replace; verification/log-invalid-summary-review.html und log-invalid-summary-current.png. Aktive Läufe einschließlich queued/cancelling nennen bei leerer Ausgabe Waiting for output.

Driftanzeige korrigiert: Definitionsseite wertet den letzten Driftversuch aus statt rückwärts den letzten Erfolg zu suchen. Ein neuer fehlgeschlagener/laufender Check oder fehlende Statistik kann deshalb keinen alten sauberen Zustand als aktuell darstellen. Verhaltenstest bestätigt Fehler, laufend, unbekannte Statistik, Änderungen und noch nie geprüft; vier Planstatistiktests bestanden. API liefert Historie nach started_at DESC. Frontend-Gesamtlauf vor dieser letzten Änderung: 56 Dateien/266 Tests bestanden. Browserabnahme des Driftfalls offen.

Driftfehler browserabgenommen: Tatsächliche Definitionsseite mit neuem fehlgeschlagenem Driftcheck und älterem erfolgreichen Nulländerungsplan zeigt Latest check unsuccessful; review run logs. Historie erhält beide getrennten Ergebnisse samt Zeit und Logbuttons. verification/definition-drift-failure-review.html und definition-drift-failure-current.png. Synthetische Daten; keine reale Driftprüfung gestartet.

P2-01 Deploymentlaufzeit ergänzt: Definitionshistorie und RunDetailsDialog zeigen dieselbe berechnete Dauer. Gemeinsamer Helfer normalisiert SQLite-/ISO-Zeiten über parseApiDate, unterscheidet aktive Vorgänge von fehlenden Zeitdaten und verwirft negative/ungültige Intervalle. Zwei Status-/Dauertests bestanden. Browserlayout der zusätzlichen Spalte noch abnehmen.

P2-01 Laufzeit browserverglichen: Laufender Eintrag zeigt Running statt erfundener Abschlussdauer; Desktoplayout mit acht Spalten visuell lesbar. Abgeschlossener Eintrag mit SQLite-Start/ISO-Ende zeigt 1m 0s in Historie und zugehörigem Logdialog, gleiche Start-/Endzeiten. Nachweise verification/definition-duration-review.html, definition-duration-current.png und definition-duration-dialog.png. Synthetische Antworten. Schmale Darstellung noch offen.

Schmale Definitionshistorie: Unter md werden Läufe als Karten mit ausdrücklich beschriftetem Start, Abschluss, Dauer, Planstatistik, Isolationsprüfung und Logbutton angezeigt; Desktop behält Tabelle. 390px-Iframe mit tatsächlicher Seite bestätigt im Browserbaum sämtliche Angaben und 1m 0s; Fixture verification/definition-duration-narrow.html zusammen mit definition-duration-review.html. Vollständige visuelle Prüfung der Karte noch offen.

Mobile Laufkarte visuell abgenommen: Bei 390px sind Status, Start/Ende mit Zeitzone und relativem Alter, 1m 0s Dauer, Isolationshinweis und View logs ohne Abschneiden lesbar. Logbutton öffnet zugehörigen Dialog mit gleicher Dauer; Schließen kehrt zur Karte zurück. Screenshot verification/definition-duration-narrow-current.png visuell geprüft. Synthetische Fixture; kein tatsächlicher Lauf gestartet.

Isolationsstatus vereinheitlicht: Desktop und mobile Laufhistorie nutzen runIsolationLabel. Nur aktive Vorgänge ohne Ergebnis zeigen Pending; abgeschlossene/fehlgeschlagene Vorgänge ohne Prüfung zeigen Not recorded. Explizite Prüfergebnisse bleiben Passed/Blocked. Desktop-Spalte heißt entsprechend Isolation check. Drei Status-/Dauertests bestanden, einschließlich fehlender terminaler Prüfergebnisse.

Definitionshistorie paginiert: Zuvor nur erste 50 Läufe erreichbar. Nun Newer/Older runs mit Seiten-/Gesamtzahl, gesondertem Lade-/Fehlerzustand und VM-gebundener Seitenauswahl. Sicherheits-/Apply-/Driftzustand bleibt auf der separat weiter abgefragten neuesten Seite, unabhängig von angezeigter historischer Seite. Backendvertrag page/page_size/has_next vorhanden. Browserabnahme von Seitenwechsel und Fehlerfall noch offen.

Historienpagination browserbestätigt: Older runs wechselt von laufendem Apply auf älteren erfolgreichen Plan, Seite 2/2 und Endgrenze korrekt. Edit/Plan/Apply/Drift/Forget/Destroy bleiben gesperrt, da die neueste Seite weiterhin aktiven Apply meldet. Ergänzter Hinweis nennt aktiven Lauf und erklärt Sperren auch beim Betrachten älterer Historie; View active run öffnet dessen Dialog. Nachweise verification/definition-pagination-review.html und definition-pagination-current.png. Fehler-/Retrypfad der älteren Seite noch offen; kein realer Lauf gestartet.

Historienpagination Fehler/Retry browserabgenommen: Zweite Seite liefert synthetisch HTTP503; statt falscher leerer Liste erscheinen Fehler und Try again. Newer runs bleibt erreichbar, Older runs gesperrt, laufender aktueller Apply hält Aktionssperren. Try again lädt erfolgreich Seite 2/2 mit historischem Plan und Dauer. Nachweise verification/definition-pagination-error-review.html und definition-pagination-error-current.png.

Aktueller gemeinsamer Prüfstand nach Historienpagination/mobilem Layout: 56 Frontenddateien, 269 Tests bestanden; TypeScript bestanden. /tmp/review-pagination-frontend.log.

F11 asynchrone Hostbindung: Save-/Reload-Notizmutationen geben den beim Start erfassten Host mit der Antwort zurück. Cacheaktualisierung nutzt diesen Host; Entwurf/Baseline werden nur verändert, wenn er noch geöffnet ist. Dadurch kann eine verspätete Antwort nach Hostwechsel den neuen Entwurf nicht überschreiben. Browser-/Integrationstest dieses Rennfalls noch offen.

F11 Notizantworten zusätzlich an Seitenaufruf gebunden: Reiner Hostvergleich übersah A→B→A während ausstehender Anfrage. Pro Hostwechsel neue Referenz; Antwort verändert geöffneten Entwurf/Baseline nur bei identischem Aufruf. Fehler-Toast ebenfalls an Anfragekontext gebunden. Cache bleibt beim ursprünglichen Host. Integrationstest einschließlich Rückkehr zu A und Cache-Revisionsreihenfolge weiterhin offen.

F11 Cache-Revisionsschutz ergänzt: Save-/Reload-Mutationsantworten aktualisieren den Hostnotizcache nur, wenn keine höhere Revision vorhanden ist. QueryClient-Verhaltenstest prüft verspätete Revision 2 nach Revision 3 einschließlich Inhalt/Autor sowie anschließende Revision 4 und erstmalige Antwort. Vollständige Controller-/Browserabnahme weiterhin offen.

F11 tatsächlicher Controller browserbestätigt: notes-controller-review.html importiert useServerDetailController, React Query und Router; ausschließlich APIantworten/Websocket ersetzt, kleine Testoberfläche. Speichern erhöht geöffnete Revision 1→2, aktualisiert Cache und entfernt Dirty-Status. Simulierter paralleler Serveredit erzeugt HTTP409; geöffnete Revision 2 und My preserved draft bleiben erhalten, Unsaved changes und Fehlermeldung sichtbar. Dies ist Controllerintegration, keine Abnahme des vollständigen Notizlayouts oder der Navigationsrennen.

F11 Reload-Controllerintegration browserbestätigt: Nach simuliertem Serveredit liefert Reload HTTP503; Entwurf Draft retained after failure, Revision 1 und Dirty-Status bleiben erhalten. Erneuter Reload übernimmt Concurrent edit, Revision 2 und bereinigt Fehler/Dirty-Status. Fixture verification/notes-reload-controller-review.html verwendet tatsächlichen Controller und synthetische APIantworten. Bestätigung vor Entwurfsverwerfen gehört zur vollständigen UI und wurde hier nicht ersetzt oder als geprüft ausgegeben.

F11 Navigationsrennen mit tatsächlichem Controller browserbestätigt: Ausstehendes Reload von A, Wechsel nach B, neuer B-Entwurf, Freigabe der A-Antwort erhält B-Entwurf und Revision 10. Zweiter Ablauf A→B→A vor Antwort, neuer A-Entwurf, danach Freigabe erhält New visit A draft und Dirty-Status. Fixture verification/notes-navigation-controller-review.html; Router, Controller und React Query tatsächlich ausgeführt, APIantworten kontrolliert verzögert. Spezifischer Save-Rennfall und vollständige UI-Abnahme weiterhin offen.

F11 vollständige Notizkomponente plus tatsächlicher Controller browsergeprüft: Leerer Zustand bietet Runbook-Vorlage. Einfügen öffnet Markdown mit Owner/Escalation, Zweck/Abhängigkeiten, Prüfungen, Wiederherstellung und Referenzen sowie Vorschau; Dirty-Status sichtbar. Save notes übernimmt Revision 2/Autor Test operator, deaktiviert erneutes Speichern und aktualisiert Versionshistorie. Screenshot verification/notes-full-controller-current.png visuell geprüft; Fixture notes-full-controller-review.html. API-/Historienantworten synthetisch, Persistenz separat in Backendtests. Verwerfungs-/Navigationsbestätigung noch offen.

F11 Verwerfungszweige browsergeprüft: Vollständige Notizkomponente mit tatsächlichem Controller fragt vor Load saved version bei Dirty-Entwurf ausdrücklich nach Verwerfen. Kontrolliertes window.confirm=false erhält komplette Vorlage und Unsaved changes; true lädt gespeicherten Leerstand, deaktiviert Save und entfernt Dirty-Status. Fixture verification/notes-discard-review.html ersetzt ausschließlich Bestätigungsantwort/API; native Browserdialogdarstellung dadurch nicht geprüft.

F11 SPA-Navigationsschutz browserbestätigt: Vollständige Notizkomponente mit tatsächlichem Controller/Router fordert bei ungespeicherter Vorlage Leave this page and discard them? an. Kontrollierte Ablehnung erhält Seite und Vorlage; Zustimmung navigiert zum tatsächlichen Ziel. Fixture verification/notes-leave-review.html. Native Bestätigungsdarstellung und Browser-Tab-Schließen nicht durch diese Fixture geprüft; useUnsavedChanges setzt enableBeforeUnload ebenfalls aus Dirty-Status.

F11 abschließender Speicherrennfall browserbestätigt: Verzögerte Save-Antwort für A verändert weder neuen B-Entwurf noch neuen A-Entwurf nach A→B→A. Fixture notes-save-navigation-review.html verwendet tatsächlichen Controller/Router und kontrollierte Antworten.

F10 Typfilter ergänzt: Hosthistorie listet tatsächliche Aktionsarten aus geladenen Läufen mit actionLabel auf. Exakter Typfilter kombiniert sich mit Status/Text/Zeitraum; Logtext mit fremdem Aktionscode führt nicht zu falschen Typ-Treffern. Drei Filtertests bestanden. Browserabnahme des neuen Filters offen.

F10 Filter/Log-Integration browsergeprüft: Tatsächlicher Controller plus ServerOperationsTabs zeigt Typoptionen Reboot/System update. Typfilter ergibt 1/2, Kombination mit Success 0/2 samt passendem Leerzustand; Clear filters stellt 2/2 wieder her. Erfolgreicher Lauf öffnet Restart completed und 1m 0s. Im Dialog gefundenen rohen Aktionscode durch denselben actionLabel wie in Tabelle ersetzt. Fixture verification/history-controller-review.html, synthetische Historie.

F10 Fehlerauszug korrigiert: Letzte beliebige Logzeile war bisher Fehlerursache, auch Cleanup/Disconnected. historyFailureCause wählt nun letzte explizite Fehlermeldung nach Entfernung von Farbcodes; ohne erkennbaren Fehler verweist es auf vollständiges Log, leere Ausgabe bleibt ausdrücklich nicht aufgezeichnet. Tests für Fehler vor Cleanup, Ansible fatal, gewöhnliche Schlusszeile und Erfolg/Leerausgabe ergänzt. Browserabnahme des mehrzeiligen Falls offen.

F10 Fehlerauszug browserbestätigt: Mehrzeiliger fehlgeschlagener Systemupdate-Lauf zeigt ERROR: Package manager lock unavailable in Tabelle; nachfolgende Cleanup-/Disconnected-Zeilen werden nicht als Ursache ausgegeben. Open log enthält alle vier Zeilen unverändert, lesbaren Aktionsnamen und 2m 0s Dauer. Fixture verification/history-failure-controller-review.html, Screenshot history-failure-current.png. Tatsächlicher Controller/Komponente, synthetische Historie.

F10 laufende Logs: Historienquery aktualisiert sich alle drei Sekunden, solange aktive Status vorliegen. Geöffneter Dialog nutzt passende aktuelle Zeile aus ungefilterter Historie statt unveränderlicher Klickkopie; Auswahl ist an Host gebunden. Refresh log bietet manuelle Aktualisierung, Queryfehler kennzeichnet letzte geladene Ausgabe ausdrücklich. Browserabnahme des Übergangs und Fehlerfalls offen.

F10 Live-Log browserbestätigt: Geöffneter Hostlogdialog übernimmt ohne Refreshklick Restart in progress→Restart completed und Running→1m 0s aus automatischer Historienaktualisierung. Dialog ergänzt um expliziten Status, damit Abschlussdauer nicht allein Ergebnis suggeriert. Screenshot verification/history-live-completed-current.png und Fixture history-live-controller-review.html. Tatsächlicher Controller/Komponente, synthetischer Verlauf.

F10 Logrefresh-Fehler browserabgenommen: Refresh log mit synthetischem HTTP503 kennzeichnet sichtbare Ausgabe ausdrücklich als letzte geladene Version; Dialog bleibt verfügbar. Wiederholung lädt erfolgreich und entfernt Fehlerhinweis. Fixture verification/history-refresh-error-review.html verwendet tatsächlichen Controller/Komponente.

F10 Identitätskollision behoben: Manuelle/geplante Historie stammt aus unterschiedlichen Tabellen mit potenziell gleicher ID. Reactkeys und Auswahl des aktualisierten Logeintrags verwenden nun Quelle plus ID. Identitätstest ergänzt. Neuer offener Umfangsbefund: Backend liefert nur letzte 20 manuelle und 200 geplante Läufe; vollständiger Zugriff auf ältere Läufe benötigt paginierte API/UI, daher F10 weiter offen.

F10 paginierte Hosthistorien-API ergänzt: page-Parameter aktiviert items/pagination-Antwort ohne alte 20/200-Begrenzung; unveränderter Legacyaufruf behält Arrayformat. HTTP-/SQLite-Test mit 25 manuellen Läufen bestätigt beide Seiten ohne Duplikate, Gesamtzahl, Endgrenze und Fremdumgebungsschutz; bestanden. UI-Anbindung und gemischte manuelle/geplante Pagination sowie effiziente Datenbankpagination noch offen; aktuell werden Ergebnisse vor dem Schneiden zusammengeführt.

F10 gemischte API-Pagination geprüft: Einheitliche UTC-Normalisierung für SQLite-/ISO-Zeiten und Quell-/ID-Tiebreaker stabilisieren Sortierung. HTTP-/SQLite-Test verteilt drei manuelle und drei geplante Läufe mit identischem Zeitpunkt über drei Seiten, bestätigt wiederholbare Reihenfolge und keine Duplikate. Zwei Paginationtests bestanden. Erstes Testsetup mit Leerzeichen im Inventarnamen erfasste keinen gültigen Workflowzielnamen; auf gültigen Namen korrigiert. UI-Anbindung/effiziente DB-Pagination weiterhin offen.

F10 APIfilter vor Pagination ergänzt: action/status/search/from/to werden auf gesamte zugängliche Hosthistorie angewandt, Datumsgrenzen nach Europe/Zurich. Antwort liefert verfügbare Aktionen und ungefilterte Gesamtzahl. HTTP-/SQLite-Test findet gezielt älteren fehlgeschlagenen Reboot jenseits Legacygrenze und bestätigt UTC→lokalen Tageswechsel, Gesamtzahlen sowie umgekehrten Zeitraum HTTP400. Drei Paginationtests bestanden. UI-Anbindung und DB-Effizienz weiterhin offen.

F10 UI an paginierte API angebunden: Controller übergibt Seite/Typ/Status/Text/Datumsgrenzen, nutzt serverseitige Treffer-/Gesamtzahlen und zeigt gelieferte Seite direkt. Filter greifen dadurch auch auf ältere manuelle/geplante Läufe. Aktive Einträge auf angezeigter Seite bleiben gepollt. Browserabnahme mit paginiertem Antwortformat und Filterwechsel/Hostwechsel noch offen; frühere Arrayfixtures müssen dafür aktualisiert werden.

F10 Regressionslauf: 273 Frontendtests bestanden; ein Quelltextvertrag erwartete inzwischen extrahierte Fehlerauswertung noch inline. Auf Import der verhaltenstesteten Funktion angepasst; betroffene Vertragsdatei erneut prüfen. Neue Browserfixture host-pagination-controller-review.html mit 26 Läufen und älterem Reboot vorbereitet; Browserausführung steht aus.

F10 paginierte UI browserbestätigt: 26 Läufe ergeben Seite 1 mit 25 und Seite 2 mit älterem fehlgeschlagenem Reboot, Anzeige 26–26 of 26. Typfilter Reboot liefert denselben älteren Lauf als 1/26 und setzt Seite zurück. Beim Laden verschwanden Optionen kurz; gewählte Option bleibt nun zusätzlich erhalten, solange neue Optionsliste aussteht. Fixture verification/host-pagination-controller-review.html. Vollständige APIfilter separat HTTP-geprüft.

### F10 – Nachprüfung geplanter Logs und Speicherbedarf

Die Hosthistorie verwendete `scheduleHistory.getAll`, dessen Projektion keinen Loginhalt enthält. Geplante Logs fehlten deshalb im Ergebnis und konnten nicht über ihren Inhalt gefunden werden. Die Route lädt die Ausgaben jetzt nach der Hostzuordnung aus der jeweiligen Quelle. Beim Blättern werden nur die Ausgaben der sichtbaren Seite geladen; manuelle historische Metadaten werden ohne Ausgaben gelesen. Eine Textsuche prüft die Logs einzeln und bewahrt damit auch die bisherige Unicode-Suche. Die Metadaten aller passenden Läufe werden weiterhin im Speicher sortiert; dies ist keine vollständige SQL-Paginierung.

Nachweis: `node --test server/test/server-history-pagination.test.js` – 4 Tests bestanden. Der neue API-Test verwendet echte temporäre SQLite-Daten, prüft geplante Logausgaben mit und ohne Paginierung, eine Suche nach „überprüfung“ sowie den Ausschluss eines fremden Hostlogs. F10 bleibt bis zur vollständigen UI-Abnahme offen.

### F10 – Rückkehr nach fehlgeschlagenem Seitenwechsel

Die Fehleransicht bietet neben Retry bei älteren Seiten jetzt „Back to newest runs“. Während Laden/Fehler werden keine irreführenden Null-Trefferzahlen angezeigt. Die Seitenschalter haben zugängliche Namen und kennzeichnen die aktuelle Seite. Mit dem tatsächlichen Controller und der tatsächlichen Komponente im Browser geprüft: Seite 1 zeigt 1–25 von 26 Läufen, Seite 2 liefert im Fixture HTTP 503, die Fehleransicht nennt nicht verfügbare Zähler und bietet beide Aktionen. Die Rückkehr stellt Seite 1 mit korrekten Zählern und Laufzeilen wieder her. Reproduzierbares synthetisches Fixture: `verification/host-history-page-error-review.html`. TypeScript-Prüfung erfolgreich. Dies ist kein Nachweis gegen das produktive Backend.

### F10 – Einzelabfrage für geöffnete Logs

Der Logdialog lädt den ausgewählten Lauf jetzt über eine eigene, nach Host und Quelle identifizierte Abfrage. Aktualisieren und Polling aktiver Läufe hängen damit nicht mehr vom Ergebnis der aktuellen Listenseite ab. Fehler zeigen ausdrücklich den zuletzt geladenen Stand. Die neue Route schützt manuelle Läufe durch server_id und geplante Läufe durch Umgebung plus gespeicherte Zielhost-IDs; bestehende Hostzugangs- und Historienberechtigungsprüfungen gelten ebenfalls.

Nachweis: 5 Tests in `server/test/server-history-pagination.test.js` bestanden; der neue Test liest beide Quellen vor und nach Abschluss, prüft fremde Hosts/Umgebungen, fehlende IDs und ungültige Quellen. TypeScript bestanden. Eine erneute Browserprüfung des Dialogs mit diesem neuen API-Vertrag steht noch aus; ältere Dialogfixtures müssen dafür um die Einzelabfrage ergänzt werden.

### F10 – Browsernachweis für Einzelabfrage und Wiederholung

`verification/host-individual-log-review.html` verwendet den aktuellen Controller und Logdialog mit synthetischen API-Antworten. Im Browser öffnet „Open log“ den separat geladenen Inhalt „Latest individual log“ statt des Listeninhalts „Completed“. Ein Klick auf „Refresh log“ liefert HTTP 503: Der letzte Inhalt bleibt mit ausdrücklichem Fehlerhinweis sichtbar. Der nächste Klick lädt „Recovered individual log“ und entfernt den Fehlerhinweis. Der Dialog wurde als Screenshot visuell kontrolliert: Titel, lesbarer Aktionstyp, Dauer, Status, Aktualisierung und Logbereich sind sichtbar. Damit ist die zuvor offene Browserprüfung des Einzelabfrage-Vertrags für Laden/Fehler/Wiederholung erbracht. Aktives Polling mit dem neuen Vertrag und die vollständige F10-Abnahme sind dadurch noch nicht belegt.

### Frontend-Regression nach Hosthistorienänderungen

Die vollständige Frontend-Suite wurde nach der Einführung der Einzelabfrage ausgeführt: 59 Testdateien, 274 Tests bestanden (`vitest run --root frontend-next`; Ausgabe `/tmp/review-history-current-frontend.log`). Das belegt die vorhandenen Testfälle, nicht die vollständige Review-Abnahme. Anschließend wurden die bislang fehlenden Statusoptionen Queued, Cancelling und Skipped im Hosthistorienfilter ergänzt und Cancelling im gemeinsamen Statusformatter lesbar beschriftet; diese reine Auswahl-/Beschriftungsergänzung ist nicht Bestandteil des vorherigen Testlaufs.

### P2-01 – Mehrere betroffene Auditressourcen

AuditTableRow und AuditMobileRow zeigten bisher ausschließlich object_links[0]. Beide Ansichten verwenden jetzt eine gemeinsame Darstellung sämtlicher gelieferter Ressourcenlinks mit Objektart und umbrechendem Namen. Dadurch bleiben auch weitere betroffene Hosts und Definitionen direkt erreichbar. Vier Komponenten-Renderingtests in `features/operations/audit-result.test.tsx` bestanden, darunter je ein Mehrressourcentest für Tabelle und Mobilansicht mit Prüfung aller Namen und href-Ziele. Dies belegt nicht die Auflösung der Links im produktiven Backend oder die vollständige P2-01-Anforderung.

### P2-01 – Keine Ersatzobjektlinks in Löschereignissen

Die Audit-Linkauflösung ermittelt bei server.delete/server.deleted keine aktuellen Objekte mehr anhand historischer Namen. Sonst konnte ein späterer Host gleichen Namens fälschlich als Ziel des Löschereignisses erscheinen. Der gespeicherte historische Detailtext bleibt erhalten. Die API-Suite `server/test/audit-search-route.test.js` besteht einschließlich eines neuen Tests für beide Löschereignistypen bei gleichzeitig vorhandenem gleichnamigem Host. Das löst die irreführende Navigation; eine vollständige Prüfung aller historischen Ressourcenarten bleibt offen.

### P2-01 – Historische Löschereignisse und Ressourcenzugriff

Der Namensabgleich konnte nicht nur falsche Links erzeugen, sondern einem Benutzer mit Zugriff auf einen neuen gleichnamigen Host auch ein historisches Löschereignis zugänglich machen. Löschereignisse gelöschter Hosts werden deshalb für eingeschränkte Hostrollen nicht anhand überlebender Namen autorisiert; Rollen mit vollständigem Hostzugriff behalten den Zugriff. Der Regressionstest prüft Liste, Zähler und Export einer eingeschränkten Rolle sowie die unveränderte Administratorsicht. Alle elf API-Tests in `audit-search-route.test.js` bestanden. Auch IPAM-Präfixlöschereignisse erzeugen keinen Link auf ein später angelegtes Präfix gleicher CIDR; diese zusätzliche Linkregel ist bislang durch Codeprüfung belegt.

### P2-01 – Fehlerzusammenfassung statt letzter Aufräumzeile

Die Operations-Detail-API bevorzugt bei fehlgeschlagenen Läufen jetzt eine explizite Fehlermeldung und entfernt ANSI-Farbcodes aus der Zusammenfassung. Wenn das Log keinen erkennbaren Fehlergrund enthält, verweist die Zusammenfassung ausdrücklich auf das vollständige Log, statt Cleanup/Disconnected als Ergebnis auszugeben. Der Loginhalt selbst bleibt unverändert. Alle 18 Tests in `server/test/operations-route.test.js` bestanden; der neue API-Test prüft einen Fehler vor nachfolgenden Cleanup-Zeilen sowie den Fall ohne identifizierbaren Fehlergrund. Erfolgreiche Ergebniszusammenfassungen werden durch den bestehenden Detailtest weiterhin geprüft.

### P2-01 – Fehlende und widersprüchliche Laufzeiten

Operations-Details geben bei Abschluss vor Start keine künstliche Dauer von 0 Sekunden mehr aus. Fehlende oder ungültige Zeitwerte ergeben ebenfalls null; echte identische Start-/Endzeiten bleiben 0 Sekunden. In Seitenleiste und Ausführungsseite unterscheidet die Anzeige bei fehlender Dauer zwischen noch nicht abgeschlossenen Zuständen und „Not recorded“ bei abgeschlossenen Läufen. Der neue API-Test deckt alle vier Zeitfälle ab; alle 19 Operations-Routentests bestanden.

### P2-01 – Veraltete Detaildaten bei Abfragefehlern

Die Operations-Seitenleiste zeigt Ergebniszusammenfassung und Logs nach einem fehlgeschlagenen Nachladen nicht mehr neben dem Fehler als scheinbar aktuelle Daten. Die Ausführungsseite entfernt dabei auch den aus alten Daten gebildeten Titel-/Zielkontext. Pending und Cancelling werden in beiden Detailabfragen als aktive Zustände weiter abgefragt; auf der Ausführungsseite erhalten sie die aktive Statusdarstellung. Fehlende Abschlusszeit wird abhängig vom Zustand als noch ausstehend bzw. nicht aufgezeichnet beschrieben. Die Browser-Abnahme dieser konkreten Fehler- und Pollingfälle steht noch aus.

### P2-01 – Browsernachweis für fehlgeschlagenes Nachladen

Die aktuelle OperationExecutionPage wurde mit `verification/execution-refresh-error-review.html` geprüft. Nach erfolgreichem Laden waren Host, Name, Zeiten, 90s Dauer, Fehlerzusammenfassung und Log sichtbar. Eine gezielte erneute Abfrage mit HTTP 503 ersetzte Titel/Ziel durch den neutralen Detailkontext und zeigte Fehlermeldung plus „Try again“; alte Zusammenfassung und Log waren nicht mehr sichtbar. Nach Wiederherstellung und erneuter Abfrage erschienen die Ausführungsdaten wieder. Die Steuerknöpfe gehören ausschließlich zum synthetischen Fixture. Der Nachweis gilt für die Ausführungsseite, nicht automatisch für die separate Operations-Seitenleiste oder aktives Polling.

### P2-01 – Aktive Operations konsistent zählen und filtern

Pending und Cancelling fehlten im serverseitigen Aktiv-Zähler, Aktiv-Filter, Sortiervorrang und Statuston, obwohl die Detailansichten sie bereits weiter abfragen. Alle vier Stellen berücksichtigen diese Zustände jetzt. Die Operations-Liste beschriftet Pending, Cancelling und Cancelled lesbar. Alle 20 Operations-API-Tests bestanden. Der neue Test prüft zwei aktive Zustände neben einem neueren erfolgreichen Lauf: Aktiv-Zähler 2, Aktiv-Filter enthält beide, Statuston info und erfolgreiche Zeile trotz jüngerer Zeit nach den aktiven Zeilen.

### P1-01 / P2-01 – Gemeinsame Kalenderfilter für Operations und Hosthistorie

Der Operations-Zeitraumfilter verwendete die lokale Serverzeitzone, während die Oberfläche Europe/Zurich anzeigt. Operations und Hosthistorie verwenden jetzt gemeinsam `history-date-range.js`: inklusive Zürcher Kalendertage, unabhängig von der Serverzeitzone; ungültige Kalendertage und umgekehrte Bereiche werden abgewiesen. Zwei neue Hilfstests prüfen Kalendergültigkeit, UTC-/SQLite-Zeiten, Sommer-/Winterzeit und die Tagesgrenze am Sommerzeitwechsel. Zusammen mit 20 Operations- und fünf Hosthistorien-API-Tests bestanden 27 Tests. Die neue Operations-Tagesgrenze ist damit auf Hilfsebene belegt; ein eigener API-Grenzfall ist noch zu ergänzen.

### P1-01 / P2-01 – API-Tagesgrenzen und Filterfehler-Rückkehr

Der ergänzte Operations-API-Test erstellt Läufe direkt vor, auf und nach den Zürcher Tagesgrenzen. Für den 11. September werden ausschließlich 10. September 22:00 UTC bis vor 11. September 22:00 UTC ausgewählt; ungültige Tage und umgekehrte Bereiche ergeben HTTP 400. Alle 21 Operations-API-Tests bestanden. Die Datumsfilter nennen nun Europe/Zurich. Weil die Filterfelder bei Abfragefehlern ausgeblendet werden, bietet die Fehleransicht einen Knopf zum Zurücksetzen der Filter und zur ersten Seite. Die Browserprüfung dieser Rückkehr steht noch aus.

### P2-01 – Browserprüfung der Filterfehler-Rückkehr

Die aktuelle OperationsPage wurde über `verification/operations-filter-recovery-review.html` mit einem ungültigen Datum in der Route geöffnet. Das synthetische Backend antwortet bei gesetztem from-Parameter mit HTTP 400. Die Oberfläche zeigt Fehler und Rücksetzknopf; ein Klick entfernt den Datumsparameter aus dem Routerzustand, zeigt beide Fixture-Aufgaben und korrekte Zähler und stellt leere Datumsfelder mit Europe/Zurich-Beschriftung wieder her. Damit ist die zuvor offene Rückkehr im Browser nachvollzogen. Die Fixture-Reihenfolge ist statisch und kein Nachweis der serverseitigen Aktiv-Sortierung.

### P2-01 – Direkte Laufzugänge in jeder Operations-Zeile

Desktop-Aufgabentitel sind jetzt native Buttons statt ausschließlich klickbarer Tabellenzeilen. Desktop und Mobilkarten enthalten zusätzlich einen direkten „Open execution“-Link mit konkreter Lauf-ID und ausgewählter Umgebung. Der Klick auf diesen Link löst nicht zusätzlich die Zeilenauswahl aus. Im Browser mit der tatsächlichen OperationsPage und `verification/operations-time-review.html` wurden die benannten Buttons sowie die exakten Ziele host-1/host-2 mit environment=default bestätigt. Das Fixture enthält keine Zielroute; die vollständige Navigation und mobile Darstellung sind noch separat zu prüfen.

### P2-01 – Direkte Navigation zu unterschiedlichen Ausführungen

Mit `verification/operations-direct-navigation-review.html` wurden aktuelle OperationsPage und OperationExecutionPage gemeinsam im Router geprüft. „Open execution“ des abgeschlossenen Laufs öffnet host-1 mit Ausführungs-ID 1, 90s, passender Zusammenfassung und ausschließlich dessen Log. Nach „Back to operations“ öffnet der zweite Link host-2 mit ID 2 und dessen eigenem Log; Abschluss und Dauer zeigen „Pending completion“. Damit ist die direkte Desktop-Navigation einschließlich Rückkehr und Wechsel auf einen anderen Lauf mit synthetischen API-Antworten belegt. Die mobile Darstellung und vollständige P2-01-Abnahme bleiben offen.

### P2-01 / P2-05 – Mobile Laufnavigation und doppelte Rechtehinweise

In `verification/operations-direct-mobile-review.html` wurde die aktuelle Liste bei 390px Breite geprüft: beide Mobilkarten haben eigene Ausführungslinks; der erste öffnet die passende Ausführung host-1 mit ID 1, Dauer, Zusammenfassung und ihrem Log. Die Rückkehr zur Liste funktioniert. Im Screenshot wurde ein redundanter großer Wartungsrechtehinweis zusätzlich zum kompakten Statusfeld entdeckt. Der große Planungsblock wird ohne Wartungsleserecht jetzt ausgeblendet; der knappe Hinweis im Statusfeld bleibt erhalten. Der visuelle Vorher-/Nachher-Vergleich zeigt dadurch bereits die erste Aufgabenkarte im sichtbaren Bereich. Diese Prüfung nutzte synthetische Daten und eine schmale Iframe-Ansicht.


### P2-01 – Einzelzugang innerhalb von Synchronisierungsgruppen

Die gruppierten Operations liefern jetzt alle enthaltenen Lauf-IDs mit Zeitpunkt, nachdem die vorhandene Ressourcen-/Umgebungsprüfung angewendet wurde. Desktop und Mobilkarte bieten eine aufklappbare Liste der Einzelausführungen. Der bisherige Gruppenlink heißt ausdrücklich „Open latest execution“. Alle 22 Operations-API-Tests bestanden; der neue Test prüft drei sichtbare gruppierte Läufe, Ausschluss eines fremden Hosts und den direkten Logzugriff auf jeden enthaltenen Lauf. Die UI-Aufklappansicht ist noch im Browser zu prüfen.

### P2-01 – Browserprüfung der Gruppenlinks

Die Aufklappansicht wurde mit der aktuellen OperationsPage geprüft: „View all 2 executions“ zeigt beide konkreten Laufziele. Der Link zum älteren host-2 öffnet die tatsächliche OperationExecutionPage mit ID 2 und ausschließlich dessen Log. Das synthetische Fixture wurde anschließend bezüglich erfolgreicher Gruppenstatus und Gruppenzähler bereinigt; die beobachtete Navigation verwendete bereits dieselben Lauf-IDs und Ziele. Reproduktion: `verification/operations-group-navigation-review.html`. Der zugängliche Name des Hauptlinks nennt nun ebenso wie der sichtbare Text ausdrücklich die neueste Ausführung. Eine reale Backend-Gruppierung ist separat durch den API-Test belegt.


### P2-01 – Lesbare Operations-Aktionsnamen

Bekannte Deploymentaktionen Check drift und Import besitzen klare Beschreibungen. Unbekannte Codes werden in lesbare Wörter zerlegt; der ursprüngliche Code bleibt im API-Feld action und damit in der Suche/Detailkennung erhalten. Ressourcenbezeichner nach bekannten Aktionspräfixen bleiben unverändert. 23 Tests aus operation-display.test.js und operations-route.test.js bestanden. Zwei bisherige Erwartungen an rohe Anzeigecodes wurden an die beabsichtigten Labels angepasst; der Berechtigungstest prüft zusätzlich den erhaltenen Originalcode.

### P2-01 – Filter vor Synchronisierungsgruppierung

Die Operations-Route gruppierte bisher vor der Text-/Zeitraumfilterung. Dadurch konnte ein älterer passender Lauf verschwinden, wenn der neueste Lauf der Gruppe einen anderen Initiator oder einen anderen Zürcher Kalendertag hatte. Die Route filtert jetzt die zugelassenen Einzelläufe vor der Gruppierung. Der neue API-Test prüft sowohl die Suche nach dem älteren Initiator als auch einen Tagesfilter bei zwei Läufen desselben UTC-Tages auf unterschiedlichen Zürcher Tagen. Alle 23 Operations-API-Tests bestanden.

### P2-01 / P2-05 – Frontend-Regression und Host-Aktionsnamen

Nach den Operations-Navigations-/Gruppenänderungen bestand die vollständige Frontend-Suite mit 59 Dateien und 276 Tests. Anschließend wurde der gemeinsame Hosthistorien-Formatter für unbekannte Aktionscodes an die lesbare Darstellung angepasst. Playbook-Dateien erhalten eine Playbook-Beschriftung, behalten aber ihren vollständigen Pfad; Ressourcenbezeichner nach bekannten Präfixen bleiben ebenfalls unverändert. Der zusätzliche Test `history-labels.test.ts` besteht und prüft unbekannte Codes, einen Containerstapel mit Unterstrich und einen Playbookpfad. Der volle 276-Test-Lauf liegt zeitlich vor dieser letzten Formatteränderung.

### F04 – Vorher/Nachher für Hostmetadaten

Host-Metadatenänderungen schreiben jetzt strukturierte host-change-Audits für Name, Hostname, IP, SSH-Port/-Benutzer, Tags, Services, Dockerstatus, Umgebung und Gruppen-ID. Die bestehende Diffdarstellung akzeptiert dieses Format. Aktualisierung, automatische Gruppenzuordnung und Audit werden in einer SQLite-Transaktion gespeichert; ein Auditfehler rollt die Änderung zurück. Ressourcenlinks und Sichtbarkeit verwenden die stabile Host-ID statt des historischen Namens. 13 API-Tests bestanden, einschließlich erfolgreichem Diff, Rollback bei Auditfehler und Sichtbarkeit ausschließlich des berechtigten Hosts. Links/Mountkonfiguration sind von diesem Diff noch nicht abgedeckt; eine Browserprüfung des neuen Hostdiffs steht ebenfalls aus.

### F04 – Links und Mounts im Hostdiff

Der Hostmetadaten-Diff umfasst jetzt auch konfigurierte Links und Storage-Mounts. Ein zusätzlicher echter API-/SQLite-Test prüft beide Felder und bestätigt, dass wiederholtes Speichern identischer Werte keinen weiteren Audit-Datensatz erzeugt. Beide Hostmetadaten-API-Tests bestanden. Ein Renderingtest prüft außerdem den neuen host-change-Typ, erhaltenen Hostnamen und sichtbare Vorher-/Nachher-Werte einschließlich Mountpfad. Die Browserprüfung des aufgeklappten Diffs bleibt offen.

### F04 – Browserprüfung und lesbare Host-Diffwerte

`verification/host-audit-diff-review.html` rendert die tatsächliche AuditTableRow mit einem host-change-Datensatz. Der aufgeklappte Diff zeigt Hostname/ID, Name vorher/nachher sowie Links und Mounts. Beim ersten visuellen Vergleich störten rohe JSON-Arrays. Die gemeinsame Wertdarstellung formatiert Tags/Services jetzt als Liste, Links als Name: URL und Mounts als Name: Pfad; leere Listen heißen None. Unbekannte historische Strukturen bleiben unverändert. Der zweite Screenshot bestätigt die lesbaren Werte im aufgeklappten Diff. Neun Darstellungstests bestanden. Die Prüfung verwendet einen synthetischen Audit-Datensatz; Persistenz und Zugriff sind separat durch API-Tests geprüft.

### F04 – Host-Audit-Integration und Gruppentransaktion

14 bestehende/aktuelle Integrationsprüfungen in environment-integrity, environment-api-isolation, server-groups-route und server-metadata-audit bestanden mit der neuen Metadatentransaktion. Zusätzlich prüft ein neuer API-Test den Auditfehler bei automatischer Tag-Gruppenzuordnung: weder Tags noch Gruppen-ID bleiben zurück; der erfolgreiche Wiederholungsversuch speichert beide und nennt die Gruppenänderung im Diff. Alle drei Hostmetadaten-Audit-Tests bestanden. Damit ist das Rollback nicht nur für eine Namensänderung belegt.

### F04 – Atomare Hostlöschung mit Umgebungskontext

Hostlöschung, Bereinigung bestehender Inventarzuordnungstabellen und Audit werden jetzt gemeinsam transaktional gespeichert. Fehlende Integrationstabellen werden explizit erkannt; andere Datenbankfehler beim Bereinigen werden nicht mehr verschluckt. Der Audittext enthält historischen Namen und stabile Host-ID, der Datensatz die ursprüngliche Umgebung. Elf Tests aus server-metadata-audit und environment-integrity bestanden. Der neue Löschtest prüft Rollback bei Auditfehler und erfolgreiche Löschung samt korrektem Umgebungseintrag. Es wurden ausschließlich Hosts in temporären Testdatenbanken gelöscht.

### F04 / F06 – Atomare Hostanlage

Hostanlage, automatische Gruppenzuordnung und Audit werden jetzt in einer gemeinsamen Transaktion gespeichert. Der Auditdatensatz verwendet die ausgewählte Umgebung und enthält die neue Host-ID. Ein neuer API-Test erzwingt einen Auditfehler und bestätigt, dass kein Host zurückbleibt; anschließend gelingt derselbe Antrag mit HTTP 201 und korrekt zugeordnetem Audit. Zwölf Tests aus server-metadata-audit und environment-integrity bestanden. Die Prüfung verwendete ausschließlich temporäre Testdatenbanken.

### F04 – Stabile Zuordnung neuer Hostanlage-Ereignisse

Neue server.create/server.created-Audits mit server_id werden in Zugriff und Ressourcenlinks anhand dieser ID ausgewertet. Ein historischer Name beeinflusst die Zuordnung nicht mehr; ein nicht mehr vorhandener Host erzeugt auch bei wiederverwendetem Namen keinen Ersatzlink. Legacy-Ereignisse ohne ID behalten ihre bisherige Verarbeitung. Alle 13 Audit-Such-API-Tests bestanden. Der neue Test prüft sichtbare ID mit altem Namen, verborgene ID mit sichtbarem Namen und gelöschte ID mit wiederverwendetem Namen.

### F04 – Strukturierter Host-Diff im CSV-Export

Der Export erkennt host-change und füllt die Spalten Object ID, Object name und Changes zusätzlich zum unveränderten Originaldetail. Die Exporthilfe nennt jetzt auch Hoständerungen. Außerdem werden fehlende Ergebniswerte als unknown statt fälschlich als no exportiert; explizite Erfolge/Fehler bleiben yes/no. Die Audit-Export-/Suchtests bestanden einschließlich neuer Tests für den Host-Diff und alle sechs Ergebnisvarianten (fehlend, null, 0, false, 1, true).

### F04 / P2-05 – Auditfilter während des Nachladens

Aktive Aktionsfilterchips verwenden jetzt dieselbe lesbare Bezeichnung wie das Auswahlfeld. Ausgewählte Aktionen und Benutzer behalten eine passende Option, wenn die Metadaten beim Nachladen noch fehlen oder die gewählte Option nicht zurückliefern. Der Eintragszähler zeigt während der ersten Metadatenabfrage einen Ladehinweis statt 0 Einträge. Die Browserprüfung dieses spezifischen Ladezustands bleibt offen.

### F04 – Browsernachweis der Audit-Metadatenladezustände

Die tatsächliche AuditLogPanel wurde mit `verification/audit-filter-loading-review.html` und gezielt zurückgehaltener Metadatenantwort geprüft. Anfangs zeigt sie „Loading audit count…“ und deaktivierten Export. Nach Freigabe erscheinen 1 entry und die Aktion Host updated. Nach Auswahl bleibt Host updated während erneuten Ladens im Select und lesbar im Filterchip stehen. Auch wenn die folgende Antwort keine Aktionsoption enthält, bleiben Auswahl und Chip erhalten; der Zähler erholt sich. Die Steuerung erfolgt ausschließlich im synthetischen Fixture.

### F04 / P1-01 – Auditkalendertage einheitlich in Liste, Zähler und Export

Die gemeinsame Audit-Abfrage filtert jetzt nach Europe/Zurich; Liste, Metadatenzähler und CSV-Export teilen dieselbe Auswahl. Alle drei Endpunkte weisen ungültige Kalendertage und umgekehrte Bereiche zurück. Die Datumsfelder nennen ihre Zeitzone. Alle 14 Audit-Such-API-Tests bestanden. Der neue Grenztest prüft SQLite-/ISO-Zeitwerte unmittelbar vor/auf/nach einem Zürcher Tag und identische Auswahl in allen drei Endpunkten. Die Datumsauswahl erfolgt derzeit nach chargenweisem Laden der übrigen SQL-Treffer; eine SQL-Optimierung ist damit nicht belegt.

### Vollständige Backend-Regression nach Audit-/Operationsänderungen

Der in server/package.json hinterlegte Testbefehl wurde direkt ausgeführt (`node --test test/*.test.js` im Serververzeichnis; npm war im verfügbaren Laufzeitpfad nicht vorhanden). Ergebnis: 894 Tests, 18 Suites, alle bestanden, keine übersprungenen Tests; Laufzeit rund 54 Sekunden. Vollständige Ausgabe: `/tmp/review-current-full-backend.log`. Dies ist ein aktueller Regressionsnachweis für die vorhandenen Tests und ersetzt keine vollständige fachliche/visuelle Review-Abnahme.


### F04 – Mobile Host-Diffansicht

Die tatsächliche AuditMobileRow wurde bei 390px Breite in `verification/host-audit-mobile-review.html` mit dem Inhalt aus host-audit-mobile-content.html geprüft. Der Diff lässt sich öffnen; Name, Vorher-/Nachher-Werte, Actor, Zeit und Hostlink bleiben sichtbar. Ein zweiter visueller Durchgang mit langer Runbook-URL und langem Mountpfad bestätigt den vollständigen Zeilenumbruch ohne horizontales Abschneiden. Synthetische Daten, keine produktiven Änderungen.

### F04 – Exportgrenze und Aufbewahrung im Browser

Die aktuelle AuditLogPanel wurde mit `verification/audit-export-limit-review.html` auf 10.001 passende Einträge gesetzt. Nach Laden der Metadaten bleibt Export deaktiviert; die Oberfläche verlangt ausdrücklich eine Einschränkung auf maximal 10.000. Die aufgeklappte Policy nennt Filter-/Zugriffsumfang, vollständigen Export ohne stilles Abschneiden, strukturierte Diffs, Formelschutz und Bereinigung älterer Einträge beim Serverstart. Der Code in server/index.js ruft pruneOlderThan(90) beim Start auf und bestätigt diese zeitliche Einschränkung. Ein tatsächlicher Browserdownload ist damit noch nicht geprüft.

### F04 – Einheitlicher Umgebungskontext beim CSV-Download

Die Browserdownload-Funktion las den Umgebungsheader unabhängig von den gespeicherten Exportparametern aus localStorage. Der Auditexport übergibt jetzt seine ausgewählte Umgebung ausdrücklich, sodass URL und Header auch bei abweichender Browserauswahl übereinstimmen. Der neue Clienttest setzt absichtlich eine andere Browserumgebung und prüft angeforderte URL, Header und Download-Dateinamen. Die API-Clienttests bestanden. Ein tatsächlicher Browserdownload bleibt weiterhin offen; der Test verwendet einen simulierten Downloadanker.


### F04 – Browserprüfung des Exportfehlers

Die tatsächliche AuditLogPanel und apiDownload wurden mit verification/audit-download-error-review.html im lokalen Browser geprüft. Eine synthetische HTTP-503-Antwort erscheint als „Export temporarily unavailable; retry later.“; die Tabelle bleibt erhalten und Export ist anschließend wieder bedienbar. Die erfolgreiche Downloadfixture belegt bislang keine gespeicherte Datei: Im untersuchten Downloadordner war keine passende Datei nachweisbar. Ein vollständiger Browserdownload bleibt deshalb offen. Temporäre Einstiegseiten wurden nach Vergleich mit den erhaltenen Fixtures entfernt. Die aktuelle TypeScript-Prüfung bestand.

### P1-01 / P2-01 – Sync-Gruppen nach lokalem Kalendertag

Operations gruppierte erfolgreiche Syncs bisher nach UTC-Datum, obwohl Anzeige und Datumsfilter Europe/Zurich verwenden. Gruppierung und Filter nutzen jetzt dieselbe historyDay-Funktion. Ein echter Routentest mit isolierter SQLite prüft zwei Läufe desselben Zürcher Tages über die UTC-Mitternachtsgrenze und einen weiteren Lauf nach Zürcher Mitternacht: Nur die ersten beiden bilden eine Gruppe; der Tagesfilter liefert genau dieselbe Gruppe. 26 Tests aus operations-route und history-date-range bestanden; Ausgabe /tmp/review-sync-day-test.log.


### P2-03 – Unvollständige Plattformkapazität nicht als Leerlauf darstellen

Die Plattformübersicht addierte fehlende Node-Messwerte als null Verbrauch. CPU- und RAM-Aggregate setzen jetzt jeweils vollständige, endliche, nichtnegative Verbrauchswerte und positive Kapazitäten aller Nodes voraus. Ein fehlender CPU-Wert beeinträchtigt nicht die unabhängig vollständige RAM-Erhebung. Echte Nullnutzung und gebrochene CPU-Kerne bleiben erhalten. Die Übersicht nennt Proxmox node inventory als Quelle und erklärt die Vollständigkeitsbedingung; fehlende Kapazität erhält einen erklärenden Text statt eines isolierten Gedankenstrichs. Drei Tests in platform-capacity.test.ts bestanden. Eine visuelle Abnahme der geänderten Plattformansicht bleibt offen.


### P2-03 – Plattformkapazität im Desktop- und Mobilbrowser

Die tatsächliche InfrastructurePage wurde mit synthetischem fehlendem CPU-Messwert und echter RAM-Nullnutzung im lokalen Browser gerendert (verification/platform-missing-capacity-review.html). Desktop zeigt CPU Unavailable, Memory 0 %, den Grund, Proxmox als Quelle und die zurückliegende Erhebungszeit samt Refreshfehler. Dabei wurden die Kapazitätszeilen ausdrücklich mit CPU/Memory beschriftet. Die mobile Plattformkarte enthält nun ebenfalls beide Kapazitätswerte und die Quellen-/Vollständigkeitserklärung. Der Screenshot des 390px-Iframes (verification/platform-missing-capacity-mobile.html) wurde visuell geprüft: alle Angaben brechen lesbar um, einschließlich Fehlergrund und Zeit. Screenshots wurden im Tool angezeigt, für diesen Durchgang nicht als PNG-Dateien gespeichert. Die Fixtures sind erhalten, temporäre Einstiegseiten entfernt. Dies belegt die synthetische Darstellung, keine produktive Proxmox-Erhebung.


### P2-03 – Gemeinsame Vollständigkeitsprüfung in Plattform-/Node-Details

ObjectOverview verwendete ebenfalls Nullersatzwerte bei CPU/RAM. Die Plattform-/Node-Zusammenfassung nutzt jetzt dieselbe platformCapacity-Prüfung wie die Infrastrukturübersicht. Die Node-Tabelle berechnet CPU-Verbrauch ebenfalls über diese Prüfung. CapacityLine zeigt bei fehlenden/ungültigen Messwerten einen Grund und keinen Auslastungsbalken; echte Nullnutzung bleibt ein gültiger Messwert. Die Detailzusammenfassung nennt Proxmox inventory und den Aggregationsumfang. Die bestehende Modell-/Kapazitätssuite sowie TypeScript bestanden; ergänzende Renderingtests prüfen explizit fehlende Nutzung ohne NaN-/Nullbalken und echte Nullnutzung mit Balken. Eine aktuelle Browserprüfung dieser Detailansichten bleibt offen.


### P2-03 – Browservergleich der Detailzusammenfassungen und Nullzähler

verification/object-missing-capacity-review.html rendert die tatsächliche ObjectOverview für Plattform und einzelnen Node mit fehlender CPU, gemessener RAM-Nullnutzung und fehlendem Datastore. Beide zeigen CPU Unavailable mit Erklärung, Memory 0 B / 8.0 GB · 0 % und unbekannte Storagekapazität ohne Auslastungsbalken. Screenshot im Browser visuell geprüft (keine PNG-Datei gespeichert). Dabei fiel auf, dass ObjectInfo numerische Nullwerte durch einen Gedankenstrich ersetzte. Die gemeinsame Anzeige erhält jetzt 0; leere Zeichenketten bleiben Platzhalter. Ein Renderingtest prüft diesen Unterschied, und der zweite Browser-Screenshot bestätigt Host operations enabled: 0 in beiden Zusammenfassungen. Zehn Modell-/Renderingtests bestanden. Der Nachweis gilt für die tatsächliche Zusammenfassungskomponente mit synthetischen Daten, nicht für die vollständige Detailroute.


### P2-03 – Einheitliche Datastore-Auswahl in der Infrastrukturübersicht

Die Infrastrukturübersicht verwendet jetzt dieselbe preferredDatastores-Prüfung wie die Detailansichten; ihre bisherige lokale Variante prüfte nur positive Gesamtkapazität. Inaktive, deaktivierte oder unvollständig gemessene Stores werden dadurch nicht mehr als repräsentative Kapazität ausgewählt. Die Datastore-Liste nennt den Status und bei ungültiger Kapazität einen nächsten Prüfschritt in Proxmox. Browser-AX-Nachweis mit tatsächlicher InfrastructurePage und synthetischen Daten (verification/platform-storage-state-review.html): inaktives local-zfs wird als Inactive mit Capacity unavailable angezeigt; gültiges local wird repräsentativer Datastore; unreported nennt ebenfalls den Prüfschritt. Kein vollständiger visueller Screenshot-Nachweis für diesen Listenzustand.


### P2-03 – VM-Metriken validieren und fehlende Werte erklären

VmObjectSummary verwendet eine gemeinsame Prozentprüfung für CPU, Memory und Disk. Fehlende, negative, nichtendliche oder gegenüber der Gesamtkapazität inkonsistente Werte erscheinen nicht mehr als scheinbar gültige Prozentwerte. Gemessene Nullnutzung bleibt 0 %, CPU-Bruchteile bleiben erhalten. Gestoppte Gäste erhalten einen Hinweis auf nicht erwartete Live-Aktivität und gespeicherte Inventarwerte; bei anderen Zuständen nennt die Oberfläche Refresh und Prüfung von Guest/Node in Proxmox als nächsten Schritt. Der separate Hinweis zur Gastdateisystem-/Agentprüfung bleibt bestehen. Drei gezielte guest-metrics-Tests bestanden. Eine Browserabnahme der neuen Hinweise bleibt offen.


### P2-03 – VM-Detailroute mit gestoppten und laufenden Gästen

Die tatsächliche ProxmoxVmDetailPage wurde mit vm-missing-metrics-review.html und vm-running-metrics-review.html geprüft. Beide synthetischen Antworten enthalten fehlende CPU-/Diskwerte und gemessene RAM-Nullnutzung. Gestoppt: ausdrücklicher Hinweis auf den Betriebszustand und gespeicherte Inventarwerte. Laufend: Hinweis zur erneuten Erhebung und Prüfung von Guest/Node. Beide zeigen No sample für CPU/Disk und 0% für RAM. Der laufende Zustand wurde zusätzlich per Screenshot visuell geprüft; die Hinweise sind lesbar. Die Statusbeschriftung der Zusammenfassung verwendet jetzt denselben Formatter wie die Seitenüberschrift (Running/Stopped statt rohem running/stopped). Browserfixture-Nachweise, kein produktiver VM-Zugriff. Die Snapshotzeit im rechten Schutzblock ist im Screenshot gekürzt; dieser visuelle Restpunkt ist separat zu prüfen.


### P1-01 / P2-05 – Snapshotname und Zeit nicht abschneiden

VmProperty erlaubt jetzt Zeilenumbruch statt Ellipse für VM-Eigenschaften. Last snapshot trennt den vollständigen Namen und den Timestamp in eigene Zeilen. In der tatsächlichen ProxmoxVmDetailPage wurde ein langer synthetischer Snapshotname mit vm-snapshot-wrap-review.html geprüft: vollständiger Name, 9 Sept 2026, 20:00 (Europe/Zurich) und relatives Alter sind im Screenshot sichtbar. Der geprüfte Viewport zeigte den Schutzblock über die gesamte Zeile; die schmalere zweispaltige Desktopanordnung und Mobilansicht sind damit noch nicht visuell belegt. Kein produktiver Snapshotzugriff.


### P1-01 / P2-05 – Snapshotdaten bei 390 Pixel Breite

Die tatsächliche VM-Detailroute wurde im 390px-Iframe mit verification/vm-snapshot-mobile-review.html geöffnet. Der Schutzblock wurde in den sichtbaren Bereich gebracht und per Screenshot geprüft: before-production-database-migration-2026-09-09 bricht vollständig um; Datum, Uhrzeit, Europe/Zurich und relatives Alter bleiben sichtbar. RAM state und Snapshotanzahl passen ebenfalls in die Karte. Der Screenshot wurde im Tool angezeigt, nicht als PNG gespeichert. Die erhaltene Inhaltsfixture ist vm-snapshot-wrap-review.html.

### Vollständige Frontend-Regression nach den Metrikänderungen

62 Testdateien und 289 Tests bestanden im vollständigen Vitest-Lauf nach Plattform-/Node-Kapazitätsprüfung, Guest-Metriken, Nullwertanzeige und Snapshot-Umbruch. Vollständige Ausgabe: /tmp/review-metrics-full-frontend.log. Dieser Lauf belegt die bestehende Frontend-Suite; er ersetzt keine vollständige Review-Abnahme oder produktive VM-Prüfung.


### P2-03 – Nächste Schritte bei fehlender Image-Prüfbarkeit

ServerDockerTab ergänzt die vorhandenen Ergebniszustände: not_checkable erklärt den fehlenden lokalen Repository-Digest und verweist bei lokalen Builds auf Build-/Releasequelle; unknown erklärt den fehlenden verifizierten Registryvergleich und nennt Registryzugriff, Authentifizierung und Tag als Prüfpunkte statt eine Ursache zu behaupten. Noch nicht geprüfte Images erhalten je nach Berechtigung den Hinweis auf eigene Prüfung oder einen autorisierten Operator. Grundlage ist der tatsächliche Prüfpfad in server/playbooks/check-image-updates.yml (fehlender LOCAL-Digest bzw. unbekannter REMOTE-Vergleich). Die bestehende Quellen-/Zeitdarstellung oberhalb der Tabelle bleibt erhalten. Visuelle Abnahme der ergänzten Zeilentexte steht aus.


### P2-03 / P2-05 – Image-Hilfen im tatsächlichen Docker-Tab

verification/docker-image-help-review.html rendert ServerDockerTab mit synthetischem Controller und den Zuständen not_checkable, unknown und ungeprüft. Quelle, Erhebungszeit, unterschiedliche Erklärungen und der Berechtigungshinweis für einen Operator ohne Pullrecht sind im Browser bestätigt. Der erste Screenshot zeigte unerwünschte Umbrüche in kurzen Namen und CPU-Werten. Die Tabelle hält diese Werte jetzt zusammen und begrenzt die Hinweis-Spalte; der zweite Screenshot bestätigt die lesbare Zeilenanordnung. Keine echte Registryprüfung und keine Controller-Schreibaktion ausgeführt.


### P1-02 – Veraltete Image-Ergebnisse als historischen Stand kennzeichnen

ServerDockerTab stellte up_to_date/updated auch bei veraltetem oder unbekanntem Katalog unverändert als aktuell dar. Diese Zeilen heißen nun Previously up to date bzw. Previously updated, ohne aktuellen Erfolgsbadge. Der Hinweis verlangt eine erneute Prüfung; für fehlendes Pullrecht verweist er auf einen autorisierten Operator. Die tatsächliche Komponente wurde mit synthetischem stale:true-Katalog im Browser geprüft (verification/docker-stale-image-review.html): beide historischen Beschriftungen erscheinen zusammen mit dem übergeordneten Stale-Hinweis. Die abschließende Berechtigungsformulierung wurde danach ergänzt. Aktuelle Ergebnisse mit stale:false behalten ihre bestehende Darstellung.


### P1-02 – Image-Prüfabschluss ohne falschen Erfolg

Die Abschlussmeldung von checkImageMut verwendete ausschließlich die Zahl verfügbarer Updates und zeigte bei null Updates selbst dann Erfolg, wenn alle Ergebnisse unknown/not_checkable waren. imageCheckSummary zählt jetzt verifizierte und ungeklärte Ergebnisse getrennt. Leere Antworten, unbekannte Statuswerte und unprüfbare Ergebnisse erzeugen eine Warnung mit nächsten Schritten. Erfolg setzt ausschließlich verifizierte Ergebnisse ohne verfügbare Updates voraus. Drei gezielte Tests prüfen leere/unbekannte Ergebnisse, gemischte Zählung und den vollständig verifizierten Fall. Die Mutation verwendet die gemeinsame Zusammenfassung; eine Browserprüfung des tatsächlichen Abschluss-Toasts steht aus.


### P1-02 – Image-Prüfantwort an die ursprüngliche Hostansicht binden

checkImageMut schrieb Ergebnisse bislang ohne Ansichtsprüfung in den lokalen Zustand. Die Mutation merkt jetzt die konkrete Hostansicht vor dem Start. Nach Abschluss wird der Querycache des ursprünglichen Hosts invalidiert; lokale Imagewerte und Toast werden nur übernommen, wenn dieselbe Ansicht noch aktiv ist. Der Identitätsvergleich unterscheidet auch A→B→A von der ursprünglichen Ansicht. Fehler-Toast wird ebenfalls auf die ursprüngliche Ansicht beschränkt. Eine tatsächliche Controller-Raceprüfung mit verzögerter Antwort steht noch aus; diese Änderung ist daher noch nicht funktional abgenommen.


### P1-02 – Tatsächlicher Controller bei verzögerter Image-Prüfung

verification/image-check-navigation-review.html verwendet useServerDetailController mit echten React-Query-Mutationen und Routerwechseln; ausschließlich API-Antworten sind synthetisch. Ablauf A-Prüfung starten → B öffnen → A-Antwort freigeben: B behält b-cached und übernimmt kein a-delayed. Zweiter Ablauf A-Prüfung starten → B → A → alte Antwort freigeben: die neue A-Ansicht behält a-cached statt a-delayed. Beide Zustände im Browser-AX geprüft. Dies belegt die lokale Zustandsisolation einschließlich A→B→A; Toast-Unterdrückung und echter Registrylauf sind damit nicht separat abgenommen.


### P1-02 – OS-Prüfergebnis mit ursprünglicher Host-ID speichern

checkSystemUpdatesMut merkt sich jetzt die ursprüngliche Hostansicht und verwendet origin.host beim Schreiben des Paketkatalogs. Toasts erscheinen nur in derselben Ansicht. Der gemeinsame Ansichtsmarker heißt updateCheckView und wird auch für Imageprüfungen verwendet. Browsernachweis mit tatsächlichem useServerDetailController und verzögerter synthetischer API-Antwort (verification/os-check-navigation-review.html): A-Prüfung starten, B öffnen, A-Antwort freigeben – B behält b-cached-package statt a-delayed-package. Dieser Nachweis prüft Hostisolation, nicht die tatsächliche Paketabfrage über SSH.


### P1-02 – Prüfstatus beim Wechsel der Hostansicht zurücksetzen

Die React-Query-Mutationsbeobachter für Image- und OS-Prüfungen werden beim Hostwechsel zurückgesetzt. Das beendet keine Remoteprüfung; die an die ursprüngliche Host-ID gebundene Cacheaktualisierung bleibt erhalten. Browsernachweis mit tatsächlichem Controller (verification/os-check-state-review.html): A zeigt pending nach Start; B zeigt unmittelbar idle und behält idle nach Freigabe der alten A-Antwort. B-Paketdaten bleiben unverändert. Der Browsernachweis prüft den OS-Beobachter; beide Prüftypen verwenden denselben Reset-Effekt.


### P1-02 – Erzwungene OS-Prüfung benötigt bestätigten frischen Katalog

Die manuelle OS-Prüfung fordert include_meta=1 und force=1 an. Vor Übernahme prüft verifiedOsCheck jetzt die erwartete Update-Liste, einen lesbaren Erhebungszeitpunkt sowie stale:false und cached:false. Fehlende, veraltete oder strukturell ungültige Antworten laufen in den bestehenden Fehlerpfad statt zu einer grünen Null-Updates-Meldung. Eine explizit frische leere Liste bleibt gültig. Zwei Tests prüfen diesen Unterschied. Die erhaltenen OS-Navigationsfixtures wurden um die vom echten Endpunkt gelieferten Frischefelder ergänzt; die vorigen Browsernachweise lagen vor dieser zusätzlichen Validierung.


### P1-02 – OS-Prüfung: veraltete Antwort und erfolgreiche Wiederholung

Der tatsächliche useServerDetailController wurde mit verification/os-check-stale-response-review.html im Browser geprüft. Die verzögerte stale:true-Antwort führt zu error mit Erklärung; der vorhandene Katalog a-cached-package bleibt erhalten. Anschließend liefert derselbe Ablauf stale:false, cached:false und gültigen updated_at: Zustand success, Fehlermeldung entfernt, a-delayed-package wird übernommen. Die Fixture verwendet keine SSH-Verbindung; der Nachweis gilt für Clientvalidierung, Cacheerhalt und Wiederholung.


### P2-03 / P1-01 – Agentinstallation von Erreichbarkeit trennen

ServerOverviewTabs bezeichnet installed nicht mehr als Agent active, sondern ausdrücklich als installiert mit unbestätigter Erreichbarkeit. Der Agent-Tab in ServerOperationsTabs ersetzt den rohen lastSeen-String durch Timestamp mit absoluter Zeit, Zeitzone, relativer Zeit und Benutzer-Zeitformat. Ein fehlender Bericht heißt No agent report recorded; der Begleittext unterscheidet letzten Bericht von aktueller Verbindung. Die Zeitkarte erlaubt Zeilenumbruch. Die Browserabnahme dieser beiden tatsächlichen Tabs steht noch aus.


### P2-03 / P1-01 – Agent-Zeitkarte im tatsächlichen Tab

verification/host-agent-report-review.html rendert ServerOperationsTabs im Agent-Tab mit synthetischem Controller. SQLite-Zeit 2026-09-09 18:00:00 wird als 9 Sept 2026, 20:00 (Europe/Zurich) samt relativem Alter angezeigt. Der Screenshot bestätigt den vollständigen Umbruch in der schmalen Zeitkarte. Ein Fixturewechsel auf fehlendes lastSeen zeigt No agent report recorded. Keine Agentaktion wurde ausgelöst.


### P2-03 / P1-02 – Docker-Lifecycle und Healthcheck unterscheiden

ServerDockerTab leitete Statusfarben ausschließlich aus startsWith('Up') ab. Jetzt verwendet der gemeinsame containerStateTone reguläre Exited (0)-/Created-/Paused-Zustände neutral, explizite Exitfehler/Dead als Fehler und Restarting/unhealthy als Warnung. Ein laufender, unhealthy Container erhält damit keine grüne Gesundheitsdarstellung mehr. Statuswortlaut bleibt unverändert; fehlender Status heißt Status not reported. Zwei Tests prüfen reguläre Stopzustände, Fehler, Pause, Neustart, unhealthy und laufenden State-Fallback. Eine Browserprüfung dieser Statuskombinationen steht aus.


### P2-03 – Docker-Statusfarben im tatsächlichen Tab

verification/docker-lifecycle-review.html rendert ServerDockerTab mit sechs synthetischen Zuständen. Screenshot visuell geprüft: Exited (0) und Paused neutral, Exited (1) rot, unhealthy/Restarting als Warnung, healthy grün. Der regulär gestoppte Compose-Stack erhält ebenfalls eine neutrale Zusammenfassung. Anschließend wurde deren Beschriftung auf No running containers reported präzisiert und die Erkennung um den state=running-Fallback ergänzt. Fehlende Messwerte bleiben No sample. Keine Containeraktion ausgeführt.


### F08 – Minimale Vorlage im Add-Stack-Dialog

ServerDetailPage bietet im Add-Stack-Dialog Insert minimal template an. Der Button ist bei vorhandenem Inhalt, laufendem Laden oder Speichern deaktiviert, damit er keinen Entwurf überschreibt. Die Vorlage enthält einen app-Service, verlangt APP_IMAGE explizit per Compose-Pflichtvariable und erklärt die .env-Datei sowie die Wahl eines freigegebenen Tags/Digests. Ports, Volumes und weitere Variablen müssen an die Anwendung angepasst werden. Speichern und Starten bleiben getrennt; ComposeValidation prüft weiterhin die YAML-Struktur. Die tatsächliche Dialoginteraktion und Validierung der eingefügten Vorlage sind noch nicht abgenommen.


### F08 – Vorlageninhalt und Einfügeinteraktion geprüft

Der tatsächlich eingefügte YAML-Text wurde aus dem Quellcode extrahiert und mit server/utils/compose-validation.validateComposeContent geprüft: kein Fehler. Die Einfügeaktion liegt jetzt in ComposeTemplateButton; ServerDetailPage verwendet diese Komponente und schützt zusätzlich im State-Updater bereits vorhandenen Inhalt. Browserfixture compose-template-review.html bestätigt: leerer Editor → Insert minimal template → vollständiger Inhalt mit APP_IMAGE-Pflichtvariable, Einfügebutton deaktiviert, Validate YAML aktiviert. Die Browservalidierungsantwort der Fixture ist simuliert; die unabhängige Backend-Strukturprüfung verwendete den echten Validator. Der vollständige Add-Stack-Dialog samt Speichern bleibt separat abnahmebedürftig.


### F08 – Compose-Speicherabschluss an Host und Entwurf binden

saveComposeMut merkt sich die Hostansicht und das konkrete Dialogobjekt vor dem Speichern. Der Abschluss invalidiert den Dockerquery des ursprünglichen Hosts und schließt nur denselben Entwurf; ein inzwischen bearbeitetes oder neu geöffnetes Dialogobjekt bleibt erhalten. Toasts sind auf dieselbe Hostansicht beschränkt, der Mutationsbeobachter wird beim Hostwechsel zurückgesetzt. Eine Controller-Raceprüfung steht aus. Sechs aktuelle Backendtests aus compose-write-route und compose-validation bestanden: ungültige Inhalte/Pfade und fehlende Rechte blockieren Remoteoperationen; erfolgreiches Speichern ruft nur file/copy auf; Copyfehler registriert kein Projekt und temporäre Dateien werden entfernt. Die Tests verwenden temporäre SQLite und einen simulierten Ansible-Runner, keine echten Hostdateien. Ausgabe: /tmp/review-compose-save-current.log.


### F08 – Compose-Entwurf bei verzögertem Speichern erhalten

verification/compose-save-race-review.html verwendet den tatsächlichen useServerDetailController mit verzögerter synthetischer writeDockerCompose-Antwort. Geprüft: Entwurf öffnen, Save starten, Inhalt ändern, alte Antwort freigeben – open:true und neuer Inhalt bleiben erhalten. Anschließend denselben Entwurf ohne weitere Änderung speichern – open:false nach Abschluss. Kein echter Dateischreibzugriff. Die bisherige Quellprüfung zeigt keinen ausdrücklichen Reset des composeDialog beim Hostwechsel; dieser Zustand sowie verzögertes Laden bestehender Compose-Dateien müssen noch geprüft werden.


### F08 – Verzögerte Compose-Ladeantwort isolieren

openEditCompose bindet die Antwort jetzt an die konkrete Hostansicht und das beim Start erzeugte Dialogobjekt. Im tatsächlichen Controller mit synthetischer API (verification/compose-load-race-review.html) geprüft: altes Laden starten, neuen Add-Entwurf öffnen, alte Antwort freigeben – der neue Pfad/Inhalt bleiben erhalten. Zweiter Ablauf ohne zwischenzeitlichen Wechsel übernimmt den geladenen Inhalt und beendet loading. Ein bereits vorhandener Dialogentwurf beim Hostwechsel benötigt weiterhin eine eigene Zuordnung/Navigationprüfung; der neue Antwortschutz löst diesen separaten Zustand nicht.


### F08 – Compose-Entwürfe nach Host getrennt erhalten

Der Controller hält Compose-Dialogzustände jetzt pro Host-ID statt in einem gemeinsamen Objekt. Die tatsächliche Controllerfixture compose-host-drafts-review.html bestätigt A-Entwurf öffnen/bearbeiten → B: geschlossener leerer Dialog; Rückkehr A: ursprünglicher Pfad, neuer Inhalt und offener Zustand erhalten. Die Speicherung ist nur innerhalb der Lebensdauer des Controllers; kein persistenter Browserentwurf. Beim Verlassen noch laufende Ladeplatzhalter werden verworfen, da ihre Antworten ohnehin durch den Ansichtsvergleich zurückgewiesen werden. Dieser Ladeplatzhalter-Sonderfall ist noch nicht separat im Browser geprüft.


### F08 – Abgebrochenes Laden beim Hostwechsel und Frontend-Regression

Die tatsächliche Controllerfixture compose-abandoned-load-review.html bestätigt: A-Datei verzögert laden → B → alte Antwort freigeben → A; der Dialog ist geschlossen, leer und loading:false. Der verlassene Ladeplatzhalter bleibt nicht hängen. Die vollständige Frontend-Suite bestand anschließend mit 65 Dateien und 296 Tests; Ausgabe /tmp/review-compose-current-frontend.log. Dieser Testlauf ersetzt keine vollständige UI-/Workflowabnahme.


### F08 – Vollständiger Add-Stack-Dialog mit tatsächlichem Controller

verification/compose-full-dialog-review.html rendert ServerDetailPage einschließlich useServerDetailController; die API ist simuliert. Ablauf im Browser: Workloads → Add Stack → Vorlage einfügen → /opt/review-app eingeben → Validate YAML → Save. Validierungsstatus erscheint im Dialog, Einfügebutton sperrt sich bei Inhalt, der erfolgreiche Speicherabschluss schließt den Dialog. Screenshot vor Save visuell geprüft: Pfad, YAML, Validierungsumfang und Erklärung zur Trennung von Speichern/Starten sind vollständig sichtbar. Dieser Nachweis prüft den Erfolgsablauf im tatsächlichen Dialog, nicht einen echten Remote-Dateischreibvorgang. Fehlerpfad und Edit-Dialog sind weiter offen. Die synthetische Hostantwort lässt Status/IP absichtlich weg; „undefined“ in der Seitenbeschreibung ist dabei als zusätzlicher fehlender-Wert-Fall sichtbar geworden und noch zu beheben.


### F08 – Vollständiger Compose-Speicherfehler und Wiederholung

ServerDetailPage mit tatsächlichem Controller wurde über Workloads → Add Stack geprüft (verification/compose-full-save-error-review.html). Erster simulierter Schreibversuch schlägt mit permission denied fehl: Fehlermeldung erscheint im Dialog, /opt/review-app und vollständiges Vorlagen-YAML bleiben erhalten. Zweiter Save gelingt und schließt den Dialog. Keine Remote-Dateien wurden geschrieben. Zusätzlich wurde die Hostbeschreibung korrigiert: fehlende IP/Hostname erscheinen nicht mehr als JavaScript-Text undefined, sondern als Host address not reported; vorhandene Werte werden ohne leere Trennzeichen verbunden.


### F08 – Edit-Compose-Ziel und tatsächlicher Bearbeitungsablauf

Der Compose-Dialog nennt jetzt den Zielhost; im Edit-Modus zusätzlich den unveränderlichen Dateipfad. Browserprüfung mit vollständiger ServerDetailPage und tatsächlichem Controller (verification/compose-full-edit-review.html): Workloads → Actions for review-stack → Edit Compose lädt services/web mit example:latest. Dialog zeigt Image host und /opt/review-stack/docker-compose.yml. Änderung auf example:approved und Save schließen den Dialog nach simulierter erfolgreicher Antwort. Keine echte Datei wurde geschrieben. Die fehlende Hostadresse wird in derselben Seite nun korrekt als Host address not reported angezeigt.


### F08 – Fehlgeschlagenes Laden nicht als leeren Compose-Inhalt anbieten

ComposeDraft speichert jetzt loadError. Ein fehlgeschlagener Abruf oder eine Antwort ohne String-Inhalt zeigt im Edit-Dialog eine ausdrückliche Fehlermeldung und Retry loading statt eines leeren Editors. Save ist gesperrt; die Mutation weist den Aufruf zusätzlich während Laden/Fehler zurück. Eine neue Ladeanforderung ersetzt den Fehlerzustand. Damit wird ein Ladefehler nicht mehr mit einer erfolgreich geladenen leeren Datei verwechselt. Die Browserprüfung des vollständigen Retry-Ablaufs steht aus.


### F08 – Vollständiger Edit-Ladefehler und Retry im Browser

verification/compose-full-load-error-review.html rendert die vollständige ServerDetailPage mit tatsächlichem Controller. Workloads → Stackaktionen → Edit Compose: simuliertes permission denied erscheint mit Erklärung; kein Texteditor, Validate YAML und Save deaktiviert, Zielhost/Pfad bleiben sichtbar. Retry loading liefert beim zweiten Abruf den Dateiinhalt; Fehler verschwindet, Texteditor und Save werden verfügbar. Dieser Ablauf wurde im Browser-AX bestätigt. Keine produktive SSH-Verbindung und kein echter Dateizugriff.


### F08 / P2-04 – Wirkung von Compose up vor Ausführung erklären

Der tatsächliche Backendpfad verwendet compose up -d und kann damit bestehende Container anhand gespeicherter Änderungen neu erstellen. Das Stackmenü nennt die Aktion jetzt Start / apply changes mit sichtbarem Hinweis auf mögliche Neuerstellung. Der Speicherdialog erläutert diese Wirkung ebenfalls. Das Aufgabenfenster benennt den Zweck der Compose-Aktion und enthält Host sowie vollständiges Verzeichnis statt nur eines technischen Kommandos. Der Ausführungsmechanismus bleibt unverändert. Die neue Menü-/Aufgabendarstellung und der getrennte Startablauf sind noch im Browser zu prüfen.


### F08 / P2-04 – Separater Compose-Start im vollständigen UI

verification/compose-full-start-review.html rendert ServerDetailPage mit tatsächlichem Controller und simuliertem API-/Websockettransport. Das Stackmenü zeigt Start / apply changes mit dem Hinweis auf mögliche Neuerstellung. Auswahl ruft im Fixture ausschließlich Host a, /opt/review-stack und action up auf (abweichende Argumente würden fehlschlagen). Das Aufgabenfenster nennt Zweck, Host und Pfad; nach Annahme der Anfrage bleibt der normale Close-Button deaktiviert, kein Erfolg wird vor einem Abschlussereignis angezeigt. Der Abschlussereignis-Test steht noch aus: Der Fixture-Auslöser liegt hinter dem modalen Aufgabenfenster und wurde nicht betätigt.


### F08 – Compose-Abschlussereignis im vollständigen UI bestätigt

verification/compose-start-completion-review.html verwendet ServerDetailPage samt tatsächlichem Controller und eine zeitgesteuerte synthetische API-/Websocketantwort. Im Browser geprüft: Workloads → Stackaktionen → Start / apply changes zeigt zunächst ein laufendes Aufgabenfenster mit deaktiviertem Close. Nach update_output und erfolgreichem update_complete erscheinen Review stack started und Completed successfully.; Close wird aktiviert. Zweck, Host und Verzeichnis bleiben sichtbar. Der Nachweis bestätigt die Verarbeitung des Abschlussereignisses, keine echte Container-Ausführung. Browser-AX geprüft; kein neuer Screenshot gespeichert.


### P1-02 – Image-Aktualität erfordert gültige Erhebungszeit

ServerDockerTab verwendet nun imageCatalogFreshness für Kopfzeile und Containerergebnisse. stale:false allein reicht nicht mehr: Ohne gültigen Erhebungszeitpunkt erscheint keine Behauptung Within check interval, und frühere positive Containerergebnisse bleiben als historisch gekennzeichnet. Ungültige Zeitstrings werden wie fehlende Erhebungszeiten behandelt. Ein gezielter Test mit fehlendem/leerem/ungültigem Zeitpunkt, SQLite-/ISO-Zeit und explizitem bzw. fehlendem Veraltungsstatus bestand. Der Browsernachweis dieser Änderung steht noch aus.


### P1-02 – Fehlende Image-Erhebungszeit im Browser bestätigt

verification/docker-missing-time-review.html rendert den tatsächlichen ServerDockerTab mit synthetischem stale:false, updated_at:null und zwei früheren positiven Ergebnissen. Browser-AX und Screenshot visuell geprüft: Kopfzeile nennt fehlende Erhebungszeit und erforderliche Prüfung; die Zeilen zeigen Previously up to date beziehungsweise Previously updated mit erklärendem Hinweis. Kein Within check interval und keine aktuelle Erfolgsbehauptung. Texte bei Desktopbreite vollständig lesbar. Screenshot im Tool betrachtet, nicht als PNG gespeichert. TypeScript-Prüfung nach der Änderung erfolgreich.


### P1-02 – Hostübersicht berücksichtigt direkte Image-Ergebnisse

ServerOverviewTabs verwendet dieselbe imageCatalogFreshness-Prüfung wie die Dockeransicht: ungültige Zeitpunkte und nicht ausdrücklich bestätigte Aktualität verhindern eine positive Gesamtzusammenfassung. summarizeUpdates berücksichtigt zusätzlich die Anzahl direkt geladener update_available-Ergebnisse, damit neue Image-Funde auch vor Aktualisierung der Host-Attention sichtbar sind. Abweichende explizite Inventar-/Katalogzahlen werden erläutert; die höhere bekannte Zahl bleibt erhalten. Zwölf gezielte Tests zu Zusammenfassung und Aktualität sowie TypeScript bestanden. Der vollständige Browservergleich zwischen Hostübersicht und Dockeransicht für diese neue Zählerlogik steht noch aus.


### P1-02 – Image-Zähler über vollständige Hostansichten geprüft

Die direkte Zählung erfolgt nun pro geladenem Container mit derselben Namens-/Imageauflösung wie in ServerDockerTab. Dadurch zählen die zwei Cache-Schlüssel eines Ergebnisses nicht doppelt. verification/image-summary-navigation-review.html verwendet vollständige ServerDetailPage mit tatsächlichem Controller und synthetischen Antworten: ein Container mit Update, unter Containername und Image im Cache, Inventarzahl zwei. Browser-AX bestätigt in Overview ausdrücklich catalog 1, inventory 2; Workloads zeigt denselben Container web als Update available sowie Erhebungszeit und Quelle. Keine echte Registryprüfung. Screenshot für diesen Vergleich noch nicht gespeichert.


### P1-02 – Direkte Custom-Ergebnisse in Hosthealth

Die Hostübersicht berücksichtigt jetzt has_update und last_check_error aus den geladenen Custom-Aufgaben unabhängig von verzögerten Attention-Daten. Fehlende/ungültige letzte Prüfzeit oder nicht bestätigte Aktualität verhindern eine positive Zusammenfassung. Bekannte Custom-Zahlen bleiben erhalten; unterschiedliche explizite Inventar-/Katalogzahlen werden erklärt. Gezielte Summarytests decken direkte Updates, Fehler ohne Attention und abweichende Zahlen ab. TypeScript-Prüfung bestanden. Vollständige Custom-Browserprüfung bleibt offen.


### P1-02 – Custom-Fehler zwischen Übersicht und Updates verglichen

verification/custom-summary-navigation-review.html verwendet vollständige ServerDetailPage und tatsächlichen Controller mit synthetischen Custom-Daten: vorher bekanntes Update, veraltetes Ergebnis und fehlgeschlagener neuer Prüfversuch. Browser-AX bestätigt in Overview einen Custom-Updatezähler sowie Stale-/Fehlerhinweis; nach Wechsel zu Updates zeigt dieselbe Aufgabe Release check den konkreten Fehler, Versuch 11:00 Europe/Zurich, letzten Erfolg 10:00 und die SSH-Quelle samt Veraltungshinweis. Keine echte SSH-Prüfung. Kein Screenshot gespeichert.


### P1-02 – Custom-Detailstatus verlangt verifizierbare Prüfzeit

ServerUpdatesTab verwendet nun dieselbe Aktualitätsregel für Custom-Aufgaben wie die Übersicht. Fehlt eine gültige Prüfzeit oder die explizite Aktualität, wird kein positiver Status angezeigt. Vollständige Controllerfixture verification/custom-missing-time-navigation-review.html im Browser: Overview zeigt Custom check missing or stale; nach Wechsel zu Updates erscheint bei Release check Check missing or stale und Not checked yet trotz synthetischem stale:false. Browser-AX bestätigt, keine Remoteaktion, kein Screenshot gespeichert.


### P1-03 – Hostbeziehung in Plattform-/Node-Inventarliste sichtbar

VmTable in DetailPanels zeigt unter dem VM-Namen jetzt Inventory / Host operations not enabled oder einen direkten Hostlink mit Host operations enabled. Dies gilt für Desktoptabelle und mobile Karten, da beide dieselbe Namensdarstellung verwenden. Der VM-Name bleibt ein separates Ziel zur Inventar-VM. Browserprüfung steht aus. Abweichende Hostnamen und deklarative Zustände werden im aktuellen Vm-Datentyp noch nicht geliefert und bleiben offen; relevante Backendquellen sind infrastructure-summary.js und routes/platforms.js.


### P1-03 – Getrennte Inventar-/Hostziele in VmTable bestätigt

Bestehende Fixture verification/inventory-scope-review.html mit aktueller VmTable im Browser geprüft: Application VM besitzt sichtbar getrennte Links /infrastructure/platform/nodes/pve001/vms/101 und /servers/host-a. Nicht übernommener Service container zeigt Inventory / Host operations not enabled. Vorschau und vollständige Tabelle verwenden für dieselbe VM dieselben Linkziele. Browser-AX bestätigt; Zielseiten wurden in dieser Fixture nicht geöffnet. TypeScript für die Änderung zuvor erfolgreich.
