# Shipyard · Produkt- und UI-Review · erneute Live-Prüfung

10. September 2026

Shipyard bietet einen sinnvollen, umfangreichen Funktionskern für den Infrastruktur-Betrieb. Die dunkle Oberfläche, Navigation, Tabellen und Statusfarben bilden eine professionelle Basis. Meine Enterprise-Einschätzung bleibt bei etwa 6,5 von 10: Die größten Lücken liegen in verlässlichen Informationen, sicheren Standardwerten und geführten Arbeitsabläufen. Ein neues Theme hätte deutlich weniger Nutzen als konsistente Zeiten, eindeutige Ressourcenbegriffe und verständliche Handlungsschritte.

## Prüfumfang

Erneute Live-Prüfung der angemeldeten Admin-Oberfläche unter https://shipyard/ am 10. September 2026. 67 neue Desktop-Screenshots erfassen Hauptseiten, die wesentlichen Tabs, repräsentative Host-/VM-/CT-Details und zentrale Dialoge. Die 35 Featurebewertungen bauen auf dem vorhandenen Review vom 9. September auf und wurden anhand der aktuellen Aufnahmen abgeglichen. 74 ältere Aufnahmen bleiben separat als datierte Ergänzung enthalten; sie sind keine neuen Screenshots. Neue Aufnahmen zeigen den sichtbaren Bildschirmausschnitt (1414 × 873), ältere Aufnahmen enthalten ergänzende Ganzseitenansichten. Nicht jede einzelne Ressourceninstanz und nicht jeder mögliche Dialogzustand wurde wiederholt.

Keine Infrastrukturaktionen, Formularspeicherungen, Neustarts, Updates, Löschungen, Testnachrichten oder Deployments ausgeführt. Der Dateibrowser wurde lesend geöffnet; das SSH-Terminal wurde bei dieser erneuten Prüfung nicht verbunden. Terminal-, Editor-, Rollen- und weitere Formularvertiefungen stammen teilweise aus dem separat gekennzeichneten Vorreview. Login/Onboarding, MFA-Aktivierung, Rollenisolierung, mobile Ansichten und vollständige Barrierefreiheit wurden nicht geprüft. Aktive Pluginseiten, Agentbetrieb und deklarative VM-Ausführungszustände sind mangels aktivierter bzw. vorhandener Instanzen nicht live bewertbar. Fehlende Funktionen bedeuten hier: in den geprüften Oberflächen nicht sichtbar oder auffindbar. Scores sind qualitative Einschätzungen und keine technische Sicherheitszertifizierung.

## Verhältnis zum Code

Die lokale Arbeitskopie enthält bereits umfangreiche Änderungen und entspricht erkennbar nicht vollständig der Live-Oberfläche. Beispiel: users-roles.tsx Zeile 296 startet die Rollenauswahl leer; Zeile 301 verlangt eine explizite Rolle. Live ist weiterhin User vorausgewählt. operations.tsx enthält bereits strukturierte resource_scope-Felder, während die Live-Wartungsmaske Freitext zeigt. Die Befunde bewerten daher die bereitgestellte App; lokal vorhandene Änderungen sind kein Nachweis einer produktiven Behebung. Dies ist ein UI-/Produktreview mit gezieltem Quellenabgleich, kein vollständiger Code- oder Security-Audit. In diesem Durchgang wurden keine Quellcodedateien geändert.

## Priorisierte Befunde

### P1-01 · Zeitangaben konsistent und mit Zeitzone anzeigen

**Beobachtung:** Derselbe Compose-Lauf vom 9. September erscheint in Operations um 19:35 und in der Hosthistorie um 21:35. Playbook Runs zeigt den geplanten Start 01:00, die Hosthistorie 03:00. IPAM-Sync erscheint in Plattform-Tasks am 9. September um 23:18 und unter Platform connections am 10. September um 01:18. Damit betrifft die Abweichung auch das Datum.

**Auswirkung:** Bei Fehleranalyse und Wartungsplanung lassen sich Ereignisse nicht zuverlässig zeitlich zuordnen.

**Verbesserung:** Alle Zeitangaben zentral nach derselben Benutzerzeitzone formatieren. Start, Ende und letzte Aktualisierung ausdrücklich unterscheiden. Zeitzone sichtbar oder per Tooltip ergänzen; absolute Zeit und relative Zeit kombinieren.

**Abnahme:** Ein identischer Lauf bzw. Sync hat in allen Ansichten dieselbe lokale Uhrzeit; UTC ist eindeutig gekennzeichnet.

Belege: [N02](screenshots/02-operations.png), [N08](screenshots/08-host-overview.png), [N12](screenshots/12-host-activity.png), [N20](screenshots/20-playbook-runs.png), [N22](screenshots/22-schedules.png), [N44](screenshots/44-platform-tasks.png), [N55](screenshots/55-platform-connections.png)

### P1-02 · Gesundheitszustand und Datenquellen widerspruchsfrei machen

**Beobachtung:** Das Dashboard nennt für pve001 3 OS-Updates, die Proxmox-Ansicht 5. Beide Quellen können unterschiedliche Kataloge haben; der Zusammenhang und Datenstand werden aber nicht ausreichend erklärt. Der im Vorreview beobachtete Konflikt Healthy trotz Image-Updates war heute mangels offener Image-Updates nicht erneut reproduzierbar.

**Auswirkung:** Grüne Zusammenfassungen vermitteln Sicherheit, obwohl Handlungsbedarf oder abweichende Daten vorliegen.

**Verbesserung:** OS-, Image- und Custom-Updates getrennt benennen und im Gesamthealth aggregieren. Quelle, Erhebungszeit und Veraltungsstatus anzeigen. Abweichende Updatekataloge erklären statt kommentarlos verschiedene Summen zu zeigen.

**Abnahme:** Quellen und Prüfzeitpunkte sind sichtbar. Unterschiedliche Updatezahlen werden erklärt; Gesamtstatus wird bei bekannten Image-, OS- und Custom-Updates konsistent berechnet und mit passenden Testfällen geprüft.

Belege: [N01](screenshots/01-dashboard.png), [N43](screenshots/43-platform-updates.png), [N48](screenshots/48-node-updates.png)

### P1-03 · Host, Inventar-VM und deklarativ verwaltete VM verständlich verbinden

**Beobachtung:** Managed VMs ist leer, die Plattform nennt 12 managed in Shipyard, die Umgebung 1 deployment. Infrastructure meldet 2 external hosts, der Baum 1 Standalone host. Dieselbe Ressource heißt als VM hr01-med-services02 und als Host hr01-media-hms. Die Details verlinken beide Objekte, aber Begriffe, Zähler und Baumklickziele bleiben uneinheitlich.

**Auswirkung:** Benutzer können nicht sicher vorhersagen, welches Objekt sie öffnen oder was eine Kennzahl zählt.

**Verbesserung:** Drei eindeutige Managementzustände verwenden: Inventar, Hostbetrieb aktiv, deklarativ verwaltet. In jeder Ansicht beide Namen und Beziehungen zeigen. Baumklicks konsistent halten; Host- und VM-Ansicht ausdrücklich umschaltbar machen. Zähler nach derselben Definition berechnen.

**Abnahme:** Jede Zahl hat einen eindeutigen Geltungsbereich; dieselbe Ressource bleibt über Navigation und Aktionen eindeutig identifizierbar.

Belege: [N15](screenshots/15-managed-vms.png), [N38](screenshots/38-platform.png), [N50](screenshots/50-vm-overview.png), [N54](screenshots/54-infrastructure.png), [N60](screenshots/60-environment-menu.png)

### P1-04 · Reservierungsformular mit passendem Standard öffnen

**Beobachtung:** Reserve address öffnet ein Formular mit Status Active und einem leeren IP-Feld, obwohl die Präfixseite bereits eine nächste freie Adresse kennt.

**Auswirkung:** Die naheliegende Eingabe erzeugt semantisch einen aktiven Datensatz statt der angekündigten Reservierung.

**Verbesserung:** Reserved vorauswählen und die nächste freie Adresse vorbefüllen. Präfix und Quelle im Formular zeigen; bei Wechsel auf Active die Bedeutung erklären.

**Abnahme:** Der Standardpfad einer Reservierung erzeugt eine Reservierung und bleibt im gewählten Präfix.

Belege: [N36](screenshots/36-prefix.png), [N37](screenshots/37-reserve-address.png)

### P1-05 · Standardrolle bei neuen Benutzern transparenter und restriktiver gestalten

**Beobachtung:** Add User wählt User vor. Laut Rollenansicht umfasst diese feste Rolle alle Server, Playbooks und Features. Der Name lässt diese Reichweite im Erstellungsformular nicht erkennen.

**Auswirkung:** Ein vermeintlich normaler Benutzer kann deutlich mehr operative Rechte erhalten als beabsichtigt.

**Verbesserung:** Viewer oder explizite Rollenauswahl als Standard. Effektive Ressourcen und sensible Fähigkeiten direkt im Benutzerformular zusammenfassen. Die bestehenden guten Rollen-Presets dort integrieren.

**Abnahme:** Vor dem Erstellen sind Umfang und sensible Fähigkeiten sichtbar; ein neuer Benutzer erhält nicht implizit umfassende Betriebsrechte.

Belege: [N28](screenshots/28-user-create.png), [N29](screenshots/29-roles.png)

### P2-01 · Technische Ereignisse in verständliche Aufgaben übersetzen

**Beobachtung:** Operations zeigt compose_up_hms, compose_pull_hms und lange vm-UUIDs; die ausgewählte Detailkarte wiederholt Tabellenfelder und führt zur Hostseite statt direkt zum Lauf. Activity Center nennt zwei unterschiedliche Vorgänge lediglich Server action. Die Hosthistorie mischt lesbare Titel und technische Codes.

**Auswirkung:** Die Aktivitätszentrale hilft zu wenig dabei, Ursache, Ergebnis und nächsten Schritt zu erkennen.

**Verbesserung:** Lesbare Aktionsnamen, stabile Ressourcennamen auch nach Löschung, Detail-Deep-Links zum konkreten Run, Laufzeit, Ergebniszusammenfassung und verlinkte Logs ergänzen.

**Abnahme:** Ein Benutzer kann aus einer Zeile direkt den betroffenen Lauf und dessen Ergebnis öffnen.

Belege: [N02](screenshots/02-operations.png), [N05](screenshots/05-audit.png), [N12](screenshots/12-host-activity.png), [N59](screenshots/59-activity-center.png)

### P2-02 · Große Formulare in prüfbare Schritte aufteilen

**Beobachtung:** VM-Konfiguration, erweiterte Hosteingabe, Zeitpläne und Rollen enthalten viele Felder in scrollenden Dialogen. Bei der VM stehen Clone attempts neben der Identität und ein Ubuntu-User als Vorgabe neben einem Debian-Template.

**Auswirkung:** Wichtige Entscheidungen gehen in Details unter; Standardwerte und versteckte Felder werden leicht übersehen.

**Verbesserung:** VM-Assistent: Vorlage → Ressourcen → Netzwerk/Zugriff → Automatisierung → Zusammenfassung. Expertenoptionen ausblenden, Vorlagenwerte ableiten, Einheiten vereinheitlichen, feldnahe Fehler und eine dauerhaft sichtbare Zusammenfassung ergänzen.

**Abnahme:** Vor dem Speichern sind Ziel, Ressourcenumfang, Netzwerk, Zugriff und ausgelöste Schritte auf einer Review-Seite sichtbar.

Belege: [N18](screenshots/18-vm-create-loaded.png), [N23](screenshots/23-schedule-create.png)

### P2-03 · Leere oder unbekannte Metriken erklärbar machen

**Beobachtung:** Container-CPU und Memory zeigen Striche; selbst gebaute Images Cannot check. VM-Disk und IP heißen teils Not reported bei konfiguriertem QEMU agent Enabled. Gestoppte VMs werden im Baum Unknown genannt. Grund, Erhebungszeit und nächste Maßnahme fehlen.

**Auswirkung:** Nicht verfügbar, nicht unterstützt, nicht abgefragt und tatsächlich null sind schwer auseinanderzuhalten.

**Verbesserung:** Explizite Zustände mit Grund, Datenquelle und Zeitpunkt. Agent konfiguriert von Agent erreichbar unterscheiden. Gestoppt nicht als Unknown darstellen. Dezimalwerte für CPU-Kerne und Details zur Image-Prüfbarkeit ergänzen.

**Abnahme:** Jede fehlende Metrik nennt einen Grund oder nächsten Schritt; Rundungen erzeugen keine widersprüchlichen Werte.

Belege: [N10](screenshots/10-host-workloads.png), [N41](screenshots/41-platform-vms.png), [N50](screenshots/50-vm-overview.png), [N51](screenshots/51-vm-configuration.png)

### P2-04 · Betriebseingriffe besser in Change-Prozesse einbetten

**Beobachtung:** Wartung erfasst Ressourcen und Owner als Freitext. Auf VM-Seiten ist Force stop ständig prominent. Snapshots bieten Erstellung und Löschung, aber keine sichtbare Wiederherstellung. Paketupdates zeigen lange Paketbeschreibungen statt eines kompakten Auswirkungsüberblicks.

**Auswirkung:** Die Werkzeuge sind vorhanden, aber der sichere Arbeitsablauf wird nicht ausreichend geführt.

**Verbesserung:** Ressourcen- und Teamauswahl, Konflikthinweise, Wartungsbezug und Change-Referenz ergänzen. Force stop in ein Gefahrenmenü verschieben. Snapshot-Restore anbieten oder klar zu Proxmox führen. Vor Updates Rebootbedarf und betroffene Dienste zusammenfassen.

**Abnahme:** Jeder kritische Ablauf erläutert Ziel, Auswirkungen und Wiederherstellungsmöglichkeiten; Ausführungsdialoge separat funktional testen.

Belege: [N04](screenshots/04-maintenance-form.png), [N48](screenshots/48-node-updates.png), [N50](screenshots/50-vm-overview.png), [N67](screenshots/67-container-snapshots.png)

### P2-05 · Sprache, Beschriftungen und Tabellenhierarchie vereinheitlichen

**Beobachtung:** Englische Seiten enthalten Anzeigename, API-Endpunkt, CPU-Modell und insgesamt. Status wechseln zwischen success, Success und Successful. Operations reserviert viel Platz für allgemeine Hinweise; viele wichtige Tabellenzeilen liegen erst unterhalb des sichtbaren Bereichs.

**Auswirkung:** Die Oberfläche wirkt weniger ausgereift und erfordert unnötiges Lesen und Scrollen.

**Verbesserung:** Eine konsequente UI-Sprache, gemeinsames Glossar und Statusvokabular. Kürzere Seitentexte, kompaktere Statusleisten, gut lesbare Sekundärtexte, konsistente Tabellenwerkzeuge und kontextbezogene Hilfe.

**Abnahme:** Keine gemischten Sprachen oder internen Aktionscodes im Standardpfad; Kernaufgaben sind im ersten Bildschirm sichtbar.

Belege: [N22](screenshots/22-schedules.png), [N39](screenshots/39-platform-configuration.png), [N46](screenshots/46-node-configuration.png), [N56](screenshots/56-proxmox-connect.png)

### P2-06 · Abgeschnittenen Verbindungsdialog reparieren

**Beobachtung:** Bei Desktopgröße 1414 × 873 überschreitet der Inhalt von Platform connections die Dialogbreite. Einleitung und Connect-Schaltfläche sind rechts abgeschnitten; die Aktionsspalte liegt außerhalb des sichtbaren Bereichs.

**Auswirkung:** Zentrale Verwaltungselemente sind schlecht auffindbar bzw. sichtbar unvollständig. Der Überlauf beeinträchtigt die Bedienbarkeit.

**Verbesserung:** Schrumpfbare Layout-Kinder (min-width:0), passende Dialogbreite und kontrolliertes Tabellen-Scrolling verwenden; Einleitung umbrechen. Verschachtelte Dialoge durch einen flachen Ablauf ersetzen.

**Abnahme:** Bei 1280, 1440 und 1920 Pixeln sowie 200% Zoom sind Dialogtitel, primäre Aktion und Schließen vollständig erreichbar; horizontales Scrolling ist auf die Tabelle beschränkt.

Belege: [N55](screenshots/55-platform-connections.png), [N56](screenshots/56-proxmox-connect.png)

### P2-07 · LXC-Informationen an den Ressourcentyp anpassen

**Beobachtung:** Die LXC-Detailseite verwendet Hardware & virtual machine und zeigt QEMU agent: Disabled, BIOS / machine: Proxmox default, Boot order und Cloud-Init user.

**Auswirkung:** Nicht anwendbare VM-Informationen sehen wie fehlende oder fehlerhafte Containerkonfiguration aus.

**Verbesserung:** Eigene Feldgruppen für LXC und QEMU: LXC-OS, Rootfs, Mounts, Netz, Privilegierung und passende Limits zeigen; VM-spezifische Felder ausblenden.

**Abnahme:** Eine LXC-Seite enthält keine QEMU-/BIOS-Defaults; unbekannt und nicht anwendbar sind unterscheidbar.

Belege: [N63](screenshots/63-container-overview.png), [N64](screenshots/64-container-configuration.png)

## Bewertung aller Features

1 = deutlich unzureichend, 2 = schwach, 3 = brauchbar mit Lücken, 4 = gut, 5 = sehr gut; null = nicht anwendbar / nicht ausreichend live prüfbar.

### Dashboard

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: —/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Sinnvoll als täglicher Einstieg: Handlungsbedarf vor Inventarmenge.

**Informationen:** Die fünf Statusgruppen und betroffenen Hosts sind nützlich. Schweregrad, Alter und Updatearten bleiben zu wenig differenziert.

**Eingaben:** Drill-downs sind passend; ein sichtbarer Zeitraum für Failed operations würde die Interpretation verbessern.

**UI:** Ruhige Gestaltung und klare Tabelle. Die Attention-Sektion wiederholt Überschriften und nutzt viel Fläche.

**Verbesserung:** Nach Dringlichkeit sortieren; Auswirkungen, Datenalter und direkt passende nächste Aktionen anbieten.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N01](screenshots/01-dashboard.png)

### Operations / Activity

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 4/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Die zentrale Sammlung von Host-, Deployment- und Playbook-Aktivitäten ist wertvoll.

**Informationen:** Zeit, Auslöser, Ziel und Status sind vorhanden. Technische Namen, UUID-Ziele und eine weitgehend redundante Detailkarte reduzieren den Nutzen.

**Eingaben:** Quelle, Status, Suchtext und Datumsbereich passen. Kalender und gespeicherte Filter wären hilfreicher als reine Texteingabe.

**UI:** Viel vertikaler Platz vor der eigentlichen Liste. Die rechte Detailansicht benötigt mehr relevante Inhalte.

**Verbesserung:** Konkrete Run-Links, Ergebniszusammenfassung, Dauer und Logs ergänzen; Statusleiste komprimieren.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N02](screenshots/02-operations.png)

### Wartungsplanung

Sinn / Nutzen: 4/5 · Informationen: 3/5 · Eingaben: 2/5 · UI: 4/5 · Enterprise-Wirkung: 2/5

**Nutzen:** Ein notwendiger Baustein für geplante Betriebsänderungen.

**Informationen:** Name, Zeit, Beschreibung, Owner und Ressourcen sind vorhanden; Auswirkungen sind nur Freitext.

**Eingaben:** Datumseingaben sind format- und zeitzonenbeschriftet, aber manuell. Nur vier Zeitzonen zur Auswahl; Ressourcen und Owner ohne echte Zuordnung.

**UI:** Der leere Zustand erklärt den nächsten Schritt gut. Das Formular ist überschaubar.

**Verbesserung:** Datum-/Zeitpicker mit Tastatureingabe, vollständige Zeitzonensuche, Ressourcen- und Teamauswahl, Wiederholung und Konflikthinweise.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N03](screenshots/03-maintenance.png), [N04](screenshots/04-maintenance-form.png)

### Audit Log

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Für Verantwortlichkeit und Fehleranalyse unverzichtbar.

**Informationen:** Actor, IP, Zeit, Status und Objektlinks sind hilfreich. Retention ist sichtbar. Technische Eventcodes und oft leere Objektfelder stören.

**Eingaben:** Filter nach Aktion, Benutzer, Status und Datum sowie Export sind passend. Volltext- und Objektfilter fehlen im sichtbaren Filterbereich.

**UI:** Die Tabelle ist nachvollziehbar, aber textlastig. Manche Informationen wiederholen sich.

**Verbesserung:** Änderungen als Vorher/Nachher-Diff zeigen, Ressourcen nach Löschung benennbar halten und Export-/Retention-Regeln transparent machen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N05](screenshots/05-audit.png)

### Managed Hosts / Inventar

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 4/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Kernfunktion für den täglichen Hostbetrieb.

**Informationen:** Name, IP, OS, Online-Status und Tags sind da; Updatebedarf und letzte erfolgreiche Erhebung fehlen als direkte Listenspalten.

**Eingaben:** Suche, Status-/Tagfilter und Mehrfachauswahl sind passend. Speichern von Ansichten und anpassbare Spalten wären bei größeren Beständen wichtig.

**UI:** Saubere, kompakte Tabelle. Die lange Day-2-Erklärung wirkt wie Produkterläuterung statt Betriebsinformation.

**Verbesserung:** Attention, Updates, letzte Verbindung und Owner optional als Spalten; Bulk-Aktionen mit Zielzusammenfassung und klarer Auswahlreichweite.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N06](screenshots/06-hosts.png)

### Host hinzufügen / Metadaten

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Sinnvolle Minimalanlage plus Expertenfelder.

**Informationen:** Der Hinweis zum nur temporär verwendeten SSH-Passwort ist gut. Hostname, SSH-Ziel und Anzeigename könnten klarer unterschieden werden.

**Eingaben:** Port, User, Tags, Links und Mounts passen grundsätzlich. Kommagetrennte Tags/Services sowie das unter Advanced versteckte Environment sind fehleranfällig.

**UI:** Langer innerer Dialogscroll bei erweiterter Eingabe; Name und IP sind dagegen angenehm schlank.

**Verbesserung:** Tag-Chips, strukturierte Services, sichtbarer Umgebungskontext, explizite Pflichtfelder und Teststatus mit Fehlerursache.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N07](screenshots/07-host-create.png)

### Hostübersicht / System / Storage

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: —/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Die Trennung von Live-Übersicht und statischen Systemdaten ist sinnvoll.

**Informationen:** IPAM- und Proxmox-Links sind nützlich. Aktuell zeigt der Host RAM-Warnung und Updates: Healthy; Image-Updates waren bei dieser Aufnahme nicht offen. Der ältere Konflikt zwischen Healthy und Image-Updates ist heute somit nicht erneut reproduziert. API Latency bleibt ohne klare fachliche Bedeutung; Zeitpunkt und Trends fehlen.

**Eingaben:** Kopieren von IP/Hostname und gezieltes Refresh passen.

**UI:** Gute Abschnitte und Ressourcenbalken. Die aktuelle RAM-Warnung und der getrennte Updatezustand sind fachlich vereinbar; ein allgemeiner Gesamtstatus sollte den Warnzustand eindeutig zusammenfassen.

**Verbesserung:** Kurze Verläufe, Erhebungszeit, klarer Metrikname für Latenz, korrekte Gesamtgesundheit und eindeutige Storage-Zustände.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N08](screenshots/08-host-overview.png), [N09](screenshots/09-host-system.png)

### Docker / Workloads

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 2/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Container nach Compose-Stacks gruppieren und Logs/Restart direkt erreichbar machen ist praktisch.

**Informationen:** Image- und Laufzustand helfen. CPU und Memory zeigen bei allen sichtbaren Containern Striche; selbst gebaute Images melden Cannot check ohne erklärten nächsten Schritt. Der Spaltenname Check for Updates benennt eine Aktion statt den angezeigten Zustand.

**Eingaben:** Add Stack bietet nur Pfad und YAML. Es fehlen im sichtbaren Dialog Vorlage, Validierungsstatus und Erklärung der Save-Wirkung.

**UI:** Dichte, lesbare Tabelle, aber die Spalte Check for Updates benennt eine Aktion statt den angezeigten Status.

**Verbesserung:** Update status als Spaltenname, Gründe für unbekannte Werte, Compose-Validierung und klare Trennung von Speichern und Starten.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N10](screenshots/10-host-workloads.png)

### OS-Updates / Custom Update Tasks

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Standardpakete und eigene Anwendungen gemeinsam betreiben zu können ist sinnvoll.

**Informationen:** Der leere OS-Zustand ist verständlich, wird aber sprachlich nicht von Image-Updates getrennt. Custom Tasks erklären Ziel- und Ist-Version.

**Eingaben:** Script, GitHub Release und Output Trigger sind sinnvolle Typen. Freie SSH-Kommandos brauchen bessere Beispiele und überprüfbare Ausgaben.

**UI:** Kompakte Anzeige. Formulare wirken technisch und mehrere Labels sind im Accessibility-Baum nicht mit den Feldern verbunden.

**Verbesserung:** Letzte Prüfung, Paketdifferenzen, Rebootbedarf, Test-vor-Speichern, Timeout und Versionsvergleich verständlich darstellen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N11](screenshots/11-host-updates.png)

### Hostaktivität / Logs

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 2/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Eine lokale Betriebshistorie ist ein guter Kontextanker.

**Informationen:** Start, Ende und Dauer sind stark. Fehlgeschlagene Läufe melden teils No error details were recorded; Aktionsnamen sind uneinheitlich.

**Eingaben:** Logs lassen sich bei Fehlern öffnen. Filter und Suche sind in dieser Ansicht nicht sichtbar.

**UI:** Viele Zeilen und Spalten ohne starke Fehlerpriorisierung.

**Verbesserung:** Fehlergrund extrahieren, alle Runs direkt öffnen, nach Typ/Status/Zeitraum filtern und Zeitformat mit Operations vereinheitlichen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N12](screenshots/12-host-activity.png)

### Hostnotizen

Sinn / Nutzen: 4/5 · Informationen: 3/5 · Eingaben: 4/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Nützlich für Runbooks, Verantwortliche und Besonderheiten vor Ort.

**Informationen:** Markdown und Vorschau sind passend; im leeren Zustand fehlen konkrete Nutzungsbeispiele.

**Eingaben:** Edit/Preview ist vertraut. Speicher- und Konfliktverhalten wurde nicht getestet.

**UI:** Schlichte, ruhige Fläche.

**Verbesserung:** Runbook-Vorlage, Autor, Änderungsdatum, Versionshistorie und Warnung vor ungespeicherten Änderungen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N13](screenshots/13-host-notes.png)

### Dateibrowser / SSH-Terminal

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: 4/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Schneller Zugriff ohne Werkzeugwechsel ist für Operatoren sehr wertvoll.

**Informationen:** Zielhost, User, Pfad, Dateigröße und Modus sind vorhanden. Terminal zeigt den verbundenen Root-Kontext klar.

**Eingaben:** Pfadnavigation und Upload sind verständlich; Befehle und Transfers wurden nicht ausgeführt.

**UI:** Terminal ist fokussiert. Numerische Unix-Modi und versteckte Dateien sind für erfahrene Admins passend, benötigen aber optional Hilfe.

**Verbesserung:** Sessiondauer/-ablauf, Audit-/Recording-Status, Vollbild, Suche und ein eindeutiger Transferfortschritt; versteckte Dateien optional ausblenden.

Nachweis: Dateibrowser aktuell aufgenommen; Terminal selbst nur im Vorreview vom 9. September, diesmal nicht verbunden.

Aktuell: [N14](screenshots/14-host-access.png)

### Managed VMs / Vorlagen / Erstellung

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Deklarative VM-Erstellung mit isoliertem Zustand und Vorlagen ist ein starkes Produktmerkmal.

**Informationen:** Compute, Storage, Netz, Zugriff und Pre-/Post-Workflows sind umfassend. Der leere Inventarbereich widerspricht begrifflich anderen Managed-Zählern.

**Eingaben:** Viele hilfreiche Defaults; MB und GB sind gemischt, Ubuntu-User wird beim Debian-Template vorgegeben, Clone attempts ist zu prominent.

**UI:** Ein großer Dialog trägt zu viele Entscheidungen auf einmal.

**Verbesserung:** Geführter Assistent mit Review, Vorlagenabhängigkeiten und IPAM-Auswahl; Planung, Apply, Drift und Wiederherstellung erst mit vorhandener Test-VM separat validieren.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N15](screenshots/15-managed-vms.png), [N16](screenshots/16-vm-create.png), [N18](screenshots/18-vm-create-loaded.png)

### Playbook-Inventar / YAML-Editor

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: 4/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Kategorisierte wiederverwendbare Automatisierung ist sinnvoll und gut integriert.

**Informationen:** Lesbare Playbook-Namen, Dateinamen, Kategorie und History sind gut. Autor, letzte Änderung und freigegebene Version könnten prominenter sein.

**Eingaben:** YAML-Editor mit Syntaxprüfung ist angemessen für die Zielgruppe. Direktes Editieren beim Auswählen ist weniger sicher als eine klare Leseansicht.

**UI:** Zweispaltige Inventar-/Detailstruktur ist stimmig. Interne System-Playbooks erzeugen vermeidbares Rauschen.

**Verbesserung:** Read-only-Inspektion als Standard, explizit bearbeiten, strukturierte Metadaten, Diff/Revision und getestete Freigabestände.

Nachweis: Inventar aktuell; YAML-Editor und seine Bedienung ergänzend aus dem Vorreview vom 9. September.

Aktuell: [N19](screenshots/19-playbooks.png)

### Playbook Runs / Zielauswahl

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Ad-hoc-Ausführung und Historie schließen den Betriebsablauf sinnvoll zusammen.

**Informationen:** Hostsuche, IP, Tags, Status und Zielvorschau sind gute Absicherungen. Output und Historie teilen sich eine sehr lange Seite.

**Eingaben:** JSON-Variablen sind technisch; localhost erscheint neben echten Hosts ohne gleichwertige Erläuterung des Ausführungsortes.

**UI:** Die Form ist lang, wichtige Run-Optionen liegen weit unten.

**Verbesserung:** Run-Assistent mit strukturierter Variableneingabe, deutlich markiertem localhost, sichtbarem Dry run und dauerhaft sichtbarer Zielzusammenfassung.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N20](screenshots/20-playbook-runs.png)

### Variablen & Secrets

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: 4/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Umgebungsspezifische Konfiguration und maskierte Secrets sind notwendig.

**Informationen:** Scope und Verschlüsselungsversprechen sind deutlich. Dieses Review bestätigt nicht deren technische Durchsetzung.

**Eingaben:** Key, Wert, Secret-Schalter und Beschreibung sind passend. Secret ist beim Anlegen nicht der Standard.

**UI:** Übersichtlich, aber leere Liste und offenes Formular stehen redundant untereinander.

**Verbesserung:** Typen und Verwendungshinweise, sichere Secret-Erkennung, Änderungshistorie, Ablauf-/Rotationshinweise und klare Überschreibungsreihenfolge.

Nachweis: Variablenübersicht aktuell; Eingabedialog ergänzend aus dem Vorreview vom 9. September.

Aktuell: [N21](screenshots/21-variables.png)

### Schedules

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Wiederkehrende Automatisierung mit Zielauswahl und Dry run ist sehr sinnvoll.

**Informationen:** Nächster Lauf samt Zone ist gut. Last run verwendet eine abweichende Uhrzeitdarstellung. Der vorhandene Name Weekly Updates gehört zu einem Daily-Zeitplan — eine Datenbenennung, kein nachgewiesener Schedulerfehler.

**Eingaben:** Presets plus Cron, Parallelität und Extra-Variablen passen. Die Zielauswahl ist schwächer durchsuchbar als bei Runs.

**UI:** Das neue Zeitplanformular ist schmal und lang; die nächsten Ausführungen sollten sichtbar zusammengefasst werden.

**Verbesserung:** Gemeinsame Hostauswahl, nächste drei Läufe, Zone im Dialog, Retry-/Overlap-Regeln und Wartungsfensterbezug.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N22](screenshots/22-schedules.png), [N23](screenshots/23-schedule-create.png)

### Git Integration

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 3/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Versionierte Playbooks sind für Teamarbeit wichtig.

**Informationen:** HTTPS-Token versus SSH-Key ist klar. Auto-pull und Auto-push stehen standardmäßig an; Branch-/Commit-Kontext fehlt im sichtbaren Formular.

**Eingaben:** Repository, Identität und Authentifizierung sind angemessen. Ein Verbindungstest und die Behandlung lokaler Änderungen sollten vor Connect erläutert werden.

**UI:** Saubere Form, aber wenig Unterstützung für kollaborative Freigabeprozesse.

**Verbesserung:** Branch-Auswahl, letzte Revision/Sync, Konfliktstatus, schreibgeschützter Modus und bewusstes Opt-in für Auto-push.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N24](screenshots/24-git-settings.png)

### Infrastrukturübersicht / Baum

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Plattform, Node und Gast hierarchisch zu verbinden ist fachlich richtig.

**Informationen:** Kapazitäten und Erreichbarkeit helfen. Externe-Host-Zähler, Managed-Status und Datastoreumfang sind nicht durchgängig gleich definiert.

**Eingaben:** Baumsuche und Aufklappen passen. Bei 19 VMs ist der Baum bereits lang und einzelne Zielnamen sind sehr klein.

**UI:** Konsistente Linien und Icons; die Plattformauswahl nimmt bei einer Plattform viel leere Fläche ein.

**Verbesserung:** Favoriten und gespeicherte Filter, klarer Einstieg zur Infrastrukturübersicht, konsistente Klickziele und flexible Master-/Detailbreite.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N54](screenshots/54-infrastructure.png)

### Plattform- und Nodeinformationen

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: —/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Statische Hardware und aktuelle Kapazität sind gut getrennt.

**Informationen:** CPU, Memory, Uptime, Kernel und Bridges helfen. Configuration auf Plattformebene ist überwiegend eine zweite Inventarübersicht.

**Eingaben:** Navigation und Copy-/Drill-down-Pfade sind ausreichend; keine Konfigurationsänderung getestet.

**UI:** Ruhige Kartenstruktur, teils redundante Angaben und gemischtsprachige Bezeichnungen.

**Verbesserung:** Configuration passend umbenennen oder echte Verbindungseinstellungen anbieten; Trends, Datenalter und vollständige Netz-/Storage-Abdeckung ergänzen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N38](screenshots/38-platform.png), [N39](screenshots/39-platform-configuration.png), [N40](screenshots/40-platform-nodes.png), [N45](screenshots/45-node.png), [N46](screenshots/46-node-configuration.png)

### VM-/CT-Inventar und Adoption

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Vorhandene VMs sichtbar machen und gezielt als Hosts übernehmen ist sinnvoll.

**Informationen:** Managementzustand und Ressourcen sind vorhanden. Gestoppte VMs heißen im Baum Unknown; IP und Disk fehlen teilweise. LXC-Details zeigen dieselben VM-Felder wie BIOS, Boot order, Cloud-Init und QEMU agent, obwohl diese Darstellung zum Ressourcentyp nicht passt.

**Eingaben:** Mehrfachauswahl und Actions sind passend. Import all orphaned virtual machines ist technisch und missverständlich benannt; Ausführung wurde nicht geprüft.

**UI:** Breite Tabellen ohne sichtbare Suche oder Statusfilter im VM-Tab. Destruktive Buttons sind auf Detailseiten sehr prominent.

**Verbesserung:** Suche/Filter, klarer Adoption-Assistent, lesbare Fehlerursachen, stabile Namen, getrennte Host-/VM-Ansichten und Gefahrenmenü. LXC und QEMU getrennt modellieren: nur anwendbare Felder anzeigen und fehlende Daten nicht als deaktivierte VM-Funktion darstellen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N41](screenshots/41-platform-vms.png), [N50](screenshots/50-vm-overview.png), [N51](screenshots/51-vm-configuration.png), [N63](screenshots/63-container-overview.png), [N64](screenshots/64-container-configuration.png), [N65](screenshots/65-vm-not-adopted.png), [N66](screenshots/66-vm-inventory-overview.png)

### Datastores

Sinn / Nutzen: 4/5 · Informationen: 3/5 · Eingaben: —/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Kapazitätsprüfung vor VM-Erstellung ist notwendig.

**Informationen:** Used, Free, Capacity und Prozentwert sind gut. Der Tab heißt Datastores, zeigt aber ausdrücklich nur ZFS; der VM-Assistent bietet zusätzlich local-lvm an.

**Eingaben:** Keine Eingaben erforderlich.

**UI:** Saubere Tabelle, bei einem Eintrag viel ungenutzte Fläche.

**Verbesserung:** Alle relevanten Datastores anzeigen oder den Tab ZFS pools nennen; Health, Backend, Provisionierung, Reservierungen und Trend ergänzen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N42](screenshots/42-platform-storage.png), [N47](screenshots/47-node-storage.png)

### Proxmox-Updates

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Updates im Plattformkontext planen zu können ist sehr sinnvoll.

**Informationen:** Installed/Available/Origin sind nützlich. Lange Paketbeschreibungen ersetzen keine Information zu Reboot, Auswirkungen und Dringlichkeit.

**Eingaben:** Refresh catalog und Install sind eindeutig; der letzte Bestätigungsschritt wurde nicht ausgelöst.

**UI:** Die Paketliste ist sachlich, wichtige Betriebshinweise fehlen im sichtbaren Vorfeld.

**Verbesserung:** Kompakte Beschreibungen, Release Notes, Rebootbedarf, Wartungsbezug und eine zusammenhängende Ergebnis-/Fehleransicht.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N43](screenshots/43-platform-updates.png), [N48](screenshots/48-node-updates.png)

### Snapshots und Infrastruktur-Tasks

Sinn / Nutzen: 4/5 · Informationen: 3/5 · Eingaben: 2/5 · UI: 4/5 · Enterprise-Wirkung: 2/5

**Nutzen:** Snapshots und nachvollziehbare Aktionen sind wichtig für Betriebssicherheit.

**Informationen:** Snapshotname und Datum sowie aggregierte Sync-Ereignisse sind hilfreich. Die Tasks erklären ihren begrenzten Umfang, wirken aber gegenüber anderen Historien fragmentiert.

**Eingaben:** Snapshot erstellen/löschen sichtbar, Wiederherstellung nicht sichtbar. Keine Snapshotaktion ausgeführt.

**UI:** Klare Leerzustände, aber wenig Unterstützung beim entscheidenden Recovery-Ablauf.

**Verbesserung:** Restore oder Proxmox-Deep-Link, Schutzkennzeichnung, Retention und Kontext zu Konsistenz/RAM. Objektaktivität über Quellen hinweg vereinen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N44](screenshots/44-platform-tasks.png), [N49](screenshots/49-node-tasks.png), [N52](screenshots/52-vm-snapshots.png), [N53](screenshots/53-vm-tasks.png), [N67](screenshots/67-container-snapshots.png)

### IPAM / Präfixe / Adressinventar

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: 3/5 · UI: 4/5 · Enterprise-Wirkung: 4/5

**Nutzen:** Sehr sinnvoller Zusammenhang aus Adressraum, Reservierungen und Hostzuordnung.

**Informationen:** Freie Intervalle, nächste freie IP, Gateway, MAC, Quelle und Hostlink sind besonders nützlich. Die Präfixliste selbst zeigt keine Auslastung.

**Eingaben:** Einzeladresse/Range und Präfix-CIDR passen. Reservierung startet als Active, IP-Beispiel stammt aus einem anderen Netz. IPv6 ist nicht sichtbar.

**UI:** Einer der stärksten Bereiche. Zwei Suchfelder auf der Startseite sollten ihre unterschiedlichen Bereiche deutlicher erklären.

**Verbesserung:** Korrekte Reservierungsdefaults, Präfix-Auslastung, Konflikte, Quelle/Alter dauerhaft sichtbar; IPv6/VRF nur entsprechend Zielmarkt ausbauen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N35](screenshots/35-ipam.png), [N36](screenshots/36-prefix.png), [N37](screenshots/37-reserve-address.png)

### IPAM Sources

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: 4/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Automatischer Import verhindert manuelle Doppelpflege.

**Informationen:** Verbindungsstatus, Testzeit, Synczeit, Intervall und Konflikte sind gut. Grün bei null beobachteten Adressen benötigt mehr Erklärung.

**Eingaben:** UniFi/pfSense, URL, Token und Site sind nachvollziehbar. Automatische Erkennung von URL-Varianten und ein klarer Testschritt würden helfen.

**UI:** Die Statuskarte ist gut gegliedert; die lange rohe API-URL ist visuell dominant.

**Verbesserung:** Controller und Site als lesbare Felder, Sync-Differenz, Datenvorschau und Warnung bei unerwartet leerem Bestand.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N34](screenshots/34-ipam-sources.png)

### Proxmox Platform connections

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: 3/5 · UI: 2/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Wiederverwendbare umgebungsbezogene Verbindungen sind richtig modelliert.

**Informationen:** Endpoint, IPAM-Intervall und Last sync sind nützlich. Access configured sagt wenig über tatsächlich verfügbare Rechte aus.

**Eingaben:** Token, Public Key und TLS-Prüfung sind passend; Tokenformat und Mindestberechtigungen brauchen Hilfe. Keine Tokens eingegeben.

**UI:** Der Dialog Platform connections schneidet bei 1414 × 873 rechts Text, Connect-Schaltfläche und Aktionsspalte ab. Danach öffnet sich ein zweiter Dialog. Sprachmischung und dieser Überlauf schwächen den Enterprise-Eindruck deutlich.

**Verbesserung:** Zuerst den horizontalen Überlauf beheben: Dialogbreite begrenzen, Kinder schrumpfbar machen und Tabelle gezielt scrollbar halten. Danach Verbindungen in eine eigene Seite oder einen flachen Dialog führen; Rechtecheck, CA-Zertifikatsweg und Service-Account-Beispiel ergänzen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N55](screenshots/55-platform-connections.png), [N56](screenshots/56-proxmox-connect.png)

### Appearance / persönliche Darstellung

Sinn / Nutzen: 3/5 · Informationen: 3/5 · Eingaben: 4/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Branding und persönliche Darstellung sind sinnvoll, aber nachrangig gegenüber Betriebskonsistenz.

**Informationen:** Persönliches Theme versus globale Marke ist erklärt. White Label verspricht auch ein Icon; im geprüften Abschnitt sind Name/Farbe sichtbar.

**Eingaben:** Theme, Density, Appname und Farbe passen. Scope und unmittelbare beziehungsweise gespeicherte Wirkung sollten konsistent sein.

**UI:** Die aktuelle dunkle Farbwelt ist kohärent. Viele Theme-Optionen auf der Kontoseite gewichten Kosmetik stärker als Sessioninformationen.

**Verbesserung:** Appearance als eigene persönliche Einstellung, zuverlässige Defaults, Kontrastprüfung und Priorität auf Typografie/Status statt neue Themes.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N25](screenshots/25-appearance.png), [N57](screenshots/57-profile-menu.png), [N58](screenshots/58-profile.png)

### SSH-Schlüsselverwaltung

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Zentraler Schlüssel mit Verteilung vereinfacht den Betrieb.

**Informationen:** Public Key, Algorithmus, Status und manuelle Installationsanweisung sind hilfreich; Lebenszyklus und Reichweite bleiben wenig sichtbar.

**Eingaben:** Ziel, User, Port und Einmalpasswort passen. Distribute to all hosts braucht eine klare Ziel-/Folgenübersicht im späteren Ablauf.

**UI:** Mehrere lange Konfigurationsblöcke; kritische Export-/Importaktionen stehen neben Routineinformationen.

**Verbesserung:** Fingerprint, Alter, Rotation, Verwendungsübersicht und separate Schutzstufe für Private-Key-Export; mehrere Schlüssel nach Umgebung als Ausbau prüfen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N26](screenshots/26-ssh.png)

### Benutzer, Rollen und Kontosicherheit

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Granulare Rollen, Ressourcen-Scope und 2FA sind notwendige Enterprise-Bausteine.

**Informationen:** Rollen-Presets und Live preview sind gut. Die breite Built-in-Rolle User, rohe Null in der Benutzerzeile und fehlende sichtbare Sessionübersicht sind Schwächen.

**Eingaben:** Anlage ist einfach, aber initiales Passwort wird vom Admin gesetzt und User ist voreingestellt. Rollenformular ist sehr lang.

**UI:** Grundstruktur passt. Sensitive Rechte sollten besser gruppiert und ihre effektive Kombination leichter prüfbar sein.

**Verbesserung:** Einladungen, restriktive Defaults, SSO/MFA-Policy, Sessions/Widerruf und Rights-Diff als Enterprise-Ausbau; keine Sicherheitswirkung aus dem UI allein ableiten.

Nachweis: Benutzerformular, Rollenübersicht und Konto aktuell; ausführlicher Rollen-Editor ergänzend aus dem Vorreview vom 9. September.

Aktuell: [N27](screenshots/27-users.png), [N28](screenshots/28-user-create.png), [N29](screenshots/29-roles.png), [N58](screenshots/58-profile.png)

### Plugins

Sinn / Nutzen: 3/5 · Informationen: 3/5 · Eingaben: 1/5 · UI: 3/5 · Enterprise-Wirkung: 2/5

**Nutzen:** Erweiterbarkeit ist für Spezialfälle nützlich, aktuell aber eher ein Entwicklermechanismus.

**Informationen:** Pfad und volle Serverrechte sind ehrlich erklärt. Im geprüften System sind keine Plugins installiert.

**Eingaben:** Manuelles Ablegen auf dem Dateisystem und Reload sind keine geführte Unternehmensverwaltung.

**UI:** Der Leerzustand ist verständlich, wiederholt aber den Installationspfad.

**Verbesserung:** Paket-/Versionsinventar, Quelle, Kompatibilität, Rechteumfang, Freigabe und Update-/Rollback-Status; aktive Pluginseiten separat prüfen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N30](screenshots/30-plugins.png)

### Benachrichtigungen

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 3/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Fehlerbenachrichtigungen außerhalb der Konsole sind für den Betrieb wesentlich. Die angebotenen Ereignistypen müssen zum tatsächlich aktiven Funktionsumfang passen.

**Informationen:** Webhook, SMTP und Eventschalter sind klar. Zustellhistorie und nachweisbarer Status fehlen im sichtbaren Bereich.

**Eingaben:** Basisfelder reichen zum Start. Webhooktyp, SMTP-TLS-Modus, Empfängervalidierung und Testvoraussetzungen könnten deutlicher sein.

**UI:** Saubere Form, aber mehrere identisch beschriftete Save/Test-Buttons.

**Verbesserung:** Kanäle benennen, Testfeedback und Zustellprotokoll, Severity-/Teamrouting, Deduplizierung und Wartungsunterdrückung.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N31](screenshots/31-notifications.png)

### Systembetrieb / Polling / Agent

Sinn / Nutzen: 5/5 · Informationen: 4/5 · Eingaben: 3/5 · UI: 3/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Laufzeitstatus und Pollingsteuerung sind sinnvoll.

**Informationen:** Versionen, Intervall und SSH/Agent-Unterschied werden erklärt. Custom Updates sagt gleichzeitig run check commands und nothing is executed — sprachlich widersprüchlich.

**Eingaben:** Intervalle und Zone passen; Auswirkungen der Änderungen auf Last, Aktualität und aktive Abläufe fehlen.

**UI:** Lange Seite mit heterogenen Aufgaben von Binary-Installation über Polling bis Agentkonfiguration.

**Verbesserung:** System Health, Polling und Runtime getrennt führen; letzte erfolgreiche Erhebung, Fehler, Queue und Agent-Verteilung zeigen. Agentaktivierung nicht getestet.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N32](screenshots/32-system-settings.png)

### Danger Zone / Wiederherstellung

Sinn / Nutzen: 2/5 · Informationen: 3/5 · Eingaben: —/5 · UI: 3/5 · Enterprise-Wirkung: 2/5

**Nutzen:** Gezielte Bereinigung kann nötig sein; fünf globale Resetfunktionen sind kein primärer Enterprise-Mehrwert.

**Informationen:** Folgen werden kurz genannt. Ob etwa Container data nur lokale Daten oder Remote-Daten meint, sollte eindeutig sein.

**Eingaben:** Keine destruktiven Dialoge oder Aktionen ausgeführt; Bestätigungsqualität nicht bewertet.

**UI:** Gefahr ist farblich deutlich, die Buttons stehen jedoch sehr direkt nebeneinander.

**Verbesserung:** Backup/Restore priorisieren, Datenumfang und betroffene Umgebung genau nennen, aktuelle Sicherung und geschützte Bestätigung im Ablauf verlangen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N33](screenshots/33-danger-zone.png)

### Suche, Activity Center, Umgebungen und Hilfe

Sinn / Nutzen: 5/5 · Informationen: 3/5 · Eingaben: 4/5 · UI: 4/5 · Enterprise-Wirkung: 3/5

**Nutzen:** Globale Navigation und Umgebungskontext sind zentrale Produktfunktionen.

**Informationen:** Command Palette und Umgebungskontext sind gut zugänglich. Activity Center zeigt jetzt 2 recent mit generischem Server action; der Zeitraum bleibt unklar. Die Umgebung meldet 1 deployment trotz leerer Managed-VM-Liste. Help enthält nur GitHub und Issues; im Linux-Kontext steht weiterhin ⌘K.

**Eingaben:** Suche und Umgebungsanlage sind einfach. Die Palette könnte VM-/Node-/Präfixressourcen und Klartextnamen besser einbeziehen.

**UI:** Konsistenter Kopfbereich. Das macOS-Symbol ⌘K wird in dieser Linux-Sitzung angezeigt.

**Verbesserung:** Scope der Live-Zentrale benennen, Zähler vereinheitlichen, Plattform-Shortcuts, kontextuelle Dokumentation, Support-/Versionsinformationen.

Nachweis: Neue Live-Aufnahmen; ergänzende Detailzustände im Vorreview vom 9. September.

Aktuell: [N59](screenshots/59-activity-center.png), [N60](screenshots/60-environment-menu.png), [N61](screenshots/61-search.png), [N62](screenshots/62-help.png)

## Empfohlene Reihenfolge

### P1 · Vertrauen und Standardwerte

- Zeitformat und Zeitzone über alle Ansichten vereinheitlichen.

- Host-, VM- und Deployment-Zähler sowie Updatequellen eindeutig definieren.

- Reservierungsdefault auf Reserved setzen und nächste freie IP vorfüllen.

- Neue Benutzer erst nach bewusster Rollenwahl anlegen; effektive Rechte zeigen.

### P2 · Tägliche Bedienung

- Dialogüberlauf beheben; VM-, Zeitplan- und Rollenformulare in prüfbare Schritte gliedern.

- Operations direkt mit konkreten Runs und Logs verknüpfen.

- Unbekannte Metriken erklären, gestoppte Ressourcen korrekt kennzeichnen und LXC-Felder bereinigen.

- Sprache, Statusvokabular, Tabellenfilter und Aktionshierarchie vereinheitlichen.

### Enterprise-Ausbau · nach Zielkunden priorisieren

- Wartungsfenster mit echten Ressourcen, Zuständigkeit, Konflikten und Change-Referenz verbinden.

- Einladungen, MFA-Policy, SSO und Sessionverwaltung anhand konkreter Kundenanforderungen planen.

- Zustellhistorie, Routing und Wartungsunterdrückung für Benachrichtigungen; sichere Wiederherstellung und nachvollziehbare Releases ausbauen.

- Vor Produktionsfreigabe: lokale Änderungen gegen den Live-Stand abgleichen sowie Rechte, Fehlerfälle, mobile Ansichten und Tastaturbedienung separat testen.
