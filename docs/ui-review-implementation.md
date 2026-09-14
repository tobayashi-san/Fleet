# UI review implementation tracking

Aktuelle priorisierte Restliste und vollständige Abnahmeanforderungen: [Review-Abschlussmatrix](ui-review-closure.md).

Source: [Archived review data](https://github.com/tobayashi-san/Shipyard/blob/0e6490dfb646cce5a05dfda54755f0feaa3635f6/artifacts/ui-review-2026-09-09/report/review.json).

Historical record: evidence links point to a fixed Git revision. See the
[documentation index](README.md#historical-review-records) for archive access.

Status: in progress. No item is complete until implementation and verification evidence are recorded.

## Prioritized findings

### P1-01: Zeitangaben konsistent und mit Zeitzone anzeigen

- [ ] Alle Zeitangaben zentral nach derselben Benutzerzeitzone formatieren. Start, Ende und letzte Aktualisierung ausdrücklich unterscheiden. Zeitzone sichtbar oder per Tooltip ergänzen; absolute Zeit und relative Zeit kombinieren.

Acceptance: Ein identischer Lauf bzw. Sync hat in allen Ansichten dieselbe lokale Uhrzeit; UTC ist eindeutig gekennzeichnet.

### P1-02: Gesundheitszustand und Datenquellen widerspruchsfrei machen

- [ ] OS-, Image- und Custom-Updates getrennt benennen und im Gesamthealth aggregieren. Quelle, Erhebungszeit und Veraltungsstatus anzeigen. Abweichende Updatekataloge erklären statt kommentarlos verschiedene Summen zu zeigen.

Acceptance: Image-Updates führen nicht zu einer pauschalen grünen Update-Zusammenfassung; Abweichungen zwischen Inventaren sind nachvollziehbar.

### P1-03: Host, Inventar-VM und deklarativ verwaltete VM verständlich verbinden

- [ ] Drei eindeutige Managementzustände verwenden: Inventar, Hostbetrieb aktiv, deklarativ verwaltet. In jeder Ansicht beide Namen und Beziehungen zeigen. Baumklicks konsistent halten; Host- und VM-Ansicht ausdrücklich umschaltbar machen. Zähler nach derselben Definition berechnen.

Acceptance: Jede Zahl hat einen eindeutigen Geltungsbereich; dieselbe Ressource bleibt über Navigation und Aktionen eindeutig identifizierbar.

### P1-04: Reservierungsformular mit passendem Standard öffnen

- [ ] Reserved vorauswählen und die nächste freie Adresse vorbefüllen. Präfix und Quelle im Formular zeigen; bei Wechsel auf Active die Bedeutung erklären.

Acceptance: Der Standardpfad einer Reservierung erzeugt eine Reservierung und bleibt im gewählten Präfix.

### P1-05: Standardrolle bei neuen Benutzern transparenter und restriktiver gestalten

- [ ] Viewer oder explizite Rollenauswahl als Standard. Effektive Ressourcen und sensible Fähigkeiten direkt im Benutzerformular zusammenfassen. Die bestehenden guten Rollen-Presets dort integrieren.

Acceptance: Vor dem Erstellen sind Umfang und sensible Fähigkeiten sichtbar; ein neuer Benutzer erhält nicht implizit umfassende Betriebsrechte.

### P2-01: Technische Ereignisse in verständliche Aufgaben übersetzen

- [ ] Lesbare Aktionsnamen, stabile Ressourcennamen auch nach Löschung, Detail-Deep-Links zum konkreten Run, Laufzeit, Ergebniszusammenfassung und verlinkte Logs ergänzen.

Acceptance: Ein Benutzer kann aus einer Zeile direkt den betroffenen Lauf und dessen Ergebnis öffnen.

### P2-02: Große Formulare in prüfbare Schritte aufteilen

- [ ] VM-Assistent: Vorlage → Ressourcen → Netzwerk/Zugriff → Automatisierung → Zusammenfassung. Expertenoptionen ausblenden, Vorlagenwerte ableiten, Einheiten vereinheitlichen, feldnahe Fehler und eine dauerhaft sichtbare Zusammenfassung ergänzen.

Acceptance: Vor dem Speichern sind Ziel, Ressourcenumfang, Netzwerk, Zugriff und ausgelöste Schritte auf einer Review-Seite sichtbar.

### P2-03: Leere oder unbekannte Metriken erklärbar machen

- [ ] Explizite Zustände mit Grund, Datenquelle und Zeitpunkt. Agent konfiguriert von Agent erreichbar unterscheiden. Gestoppt nicht als Unknown darstellen. Dezimalwerte für CPU-Kerne und Details zur Image-Prüfbarkeit ergänzen.

Acceptance: Jede fehlende Metrik nennt einen Grund oder nächsten Schritt; Rundungen erzeugen keine widersprüchlichen Werte.

### P2-04: Betriebseingriffe besser in Change-Prozesse einbetten

- [ ] Ressourcen- und Teamauswahl, Konflikthinweise, Wartungsbezug und Change-Referenz ergänzen. Force stop in ein Gefahrenmenü verschieben. Snapshot-Restore anbieten oder klar zu Proxmox führen. Vor Updates Rebootbedarf und betroffene Dienste zusammenfassen.

Acceptance: Jeder kritische Ablauf erläutert Ziel, Auswirkungen und Wiederherstellungsmöglichkeiten; Ausführungsdialoge separat funktional testen.

### P2-05: Sprache, Beschriftungen und Tabellenhierarchie vereinheitlichen

- [ ] Eine konsequente UI-Sprache, gemeinsames Glossar und Statusvokabular. Kürzere Seitentexte, kompaktere Statusleisten, gut lesbare Sekundärtexte, konsistente Tabellenwerkzeuge und kontextbezogene Hilfe.

Acceptance: Keine gemischten Sprachen oder internen Aktionscodes im Standardpfad; Kernaufgaben sind im ersten Bildschirm sichtbar.

## Full feature review scope

### F01: Dashboard

- [ ] Nach Dringlichkeit sortieren; Auswirkungen, Datenalter und direkt passende nächste Aktionen anbieten.

Information: Die fünf Statusgruppen und betroffenen Hosts sind nützlich. Schweregrad, Alter und Updatearten bleiben zu wenig differenziert.

Inputs: Drill-downs sind passend; ein sichtbarer Zeitraum für Failed operations würde die Interpretation verbessern.

UI: Ruhige Gestaltung und klare Tabelle. Die Attention-Sektion wiederholt Überschriften und nutzt viel Fläche.

### F02: Operations / Activity

- [ ] Konkrete Run-Links, Ergebniszusammenfassung, Dauer und Logs ergänzen; Statusleiste komprimieren.

Information: Zeit, Auslöser, Ziel und Status sind vorhanden. Technische Namen, UUID-Ziele und eine weitgehend redundante Detailkarte reduzieren den Nutzen.

Inputs: Quelle, Status, Suchtext und Datumsbereich passen. Kalender und gespeicherte Filter wären hilfreicher als reine Texteingabe.

UI: Viel vertikaler Platz vor der eigentlichen Liste. Die rechte Detailansicht benötigt mehr relevante Inhalte.

### F03: Wartungsplanung

- [ ] Datum-/Zeitpicker mit Tastatureingabe, vollständige Zeitzonensuche, Ressourcen- und Teamauswahl, Wiederholung und Konflikthinweise.

Information: Name, Zeit, Beschreibung, Owner und Ressourcen sind vorhanden; Auswirkungen sind nur Freitext.

Inputs: Datumseingaben sind format- und zeitzonenbeschriftet, aber manuell. Nur vier Zeitzonen zur Auswahl; Ressourcen und Owner ohne echte Zuordnung.

UI: Der leere Zustand erklärt den nächsten Schritt gut. Das Formular ist überschaubar.

### F04: Audit Log

- [ ] Änderungen als Vorher/Nachher-Diff zeigen, Ressourcen nach Löschung benennbar halten und Export-/Retention-Regeln transparent machen.

Information: Actor, IP, Zeit, Status und Objektlinks sind hilfreich. Retention ist sichtbar. Technische Eventcodes und oft leere Objektfelder stören.

Inputs: Filter nach Aktion, Benutzer, Status und Datum sowie Export sind passend. Volltext- und Objektfilter fehlen im sichtbaren Filterbereich.

UI: Die Tabelle ist nachvollziehbar, aber textlastig. Manche Informationen wiederholen sich.

### F05: Managed Hosts / Inventar

- [ ] Attention, Updates, letzte Verbindung und Owner optional als Spalten; Bulk-Aktionen mit Zielzusammenfassung und klarer Auswahlreichweite.

Information: Name, IP, OS, Online-Status und Tags sind da; Updatebedarf und letzte erfolgreiche Erhebung fehlen als direkte Listenspalten.

Inputs: Suche, Status-/Tagfilter und Mehrfachauswahl sind passend. Speichern von Ansichten und anpassbare Spalten wären bei größeren Beständen wichtig.

UI: Saubere, kompakte Tabelle. Die lange Day-2-Erklärung wirkt wie Produkterläuterung statt Betriebsinformation.

### F06: Host hinzufügen / Metadaten

- [ ] Tag-Chips, strukturierte Services, sichtbarer Umgebungskontext, explizite Pflichtfelder und Teststatus mit Fehlerursache.

Information: Der Hinweis zum nur temporär verwendeten SSH-Passwort ist gut. Hostname, SSH-Ziel und Anzeigename könnten klarer unterschieden werden.

Inputs: Port, User, Tags, Links und Mounts passen grundsätzlich. Kommagetrennte Tags/Services sowie das unter Advanced versteckte Environment sind fehleranfällig.

UI: Langer innerer Dialogscroll bei erweiterter Eingabe; Name und IP sind dagegen angenehm schlank.

### F07: Hostübersicht / System / Storage

- [ ] Kurze Verläufe, Erhebungszeit, klarer Metrikname für Latenz, korrekte Gesamtgesundheit und eindeutige Storage-Zustände.

Information: IPAM- und Proxmox-Links sind stark. Healthy trotz Image-Updates, API Latency ohne klare Bedeutung und reine Momentanwerte schwächen die Aussage.

Inputs: Kopieren von IP/Hostname und gezieltes Refresh passen.

UI: Gute Abschnitte und Ressourcenbalken. Warnung und grüne Zusammenfassung widersprechen sich visuell.

### F08: Docker / Workloads

- [ ] Update status als Spaltenname, Gründe für unbekannte Werte, Compose-Validierung und klare Trennung von Speichern und Starten.

Information: Image- und Laufzustand helfen; fehlende CPU-/RAM-Werte und Cannot check bleiben unerklärt.

Inputs: Add Stack bietet nur Pfad und YAML. Es fehlen im sichtbaren Dialog Vorlage, Validierungsstatus und Erklärung der Save-Wirkung.

UI: Dichte, lesbare Tabelle, aber die Spalte Check for Updates benennt eine Aktion statt den angezeigten Status.

### F09: OS-Updates / Custom Update Tasks

- [ ] Letzte Prüfung, Paketdifferenzen, Rebootbedarf, Test-vor-Speichern, Timeout und Versionsvergleich verständlich darstellen.

Information: Der leere OS-Zustand ist verständlich, wird aber sprachlich nicht von Image-Updates getrennt. Custom Tasks erklären Ziel- und Ist-Version.

Inputs: Script, GitHub Release und Output Trigger sind sinnvolle Typen. Freie SSH-Kommandos brauchen bessere Beispiele und überprüfbare Ausgaben.

UI: Kompakte Anzeige. Formulare wirken technisch und mehrere Labels sind im Accessibility-Baum nicht mit den Feldern verbunden.

### F10: Hostaktivität / Logs

- [ ] Fehlergrund extrahieren, alle Runs direkt öffnen, nach Typ/Status/Zeitraum filtern und Zeitformat mit Operations vereinheitlichen.

Information: Start, Ende und Dauer sind stark. Fehlgeschlagene Läufe melden teils No error details were recorded; Aktionsnamen sind uneinheitlich.

Inputs: Logs lassen sich bei Fehlern öffnen. Filter und Suche sind in dieser Ansicht nicht sichtbar.

UI: Viele Zeilen und Spalten ohne starke Fehlerpriorisierung.

### F11: Hostnotizen

- [ ] Runbook-Vorlage, Autor, Änderungsdatum, Versionshistorie und Warnung vor ungespeicherten Änderungen.

Information: Markdown und Vorschau sind passend; im leeren Zustand fehlen konkrete Nutzungsbeispiele.

Inputs: Edit/Preview ist vertraut. Speicher- und Konfliktverhalten wurde nicht getestet.

UI: Schlichte, ruhige Fläche.

### F12: Dateibrowser / SSH-Terminal

- [ ] Sessiondauer/-ablauf, Audit-/Recording-Status, Vollbild, Suche und ein eindeutiger Transferfortschritt; versteckte Dateien optional ausblenden.

Information: Zielhost, User, Pfad, Dateigröße und Modus sind vorhanden. Terminal zeigt den verbundenen Root-Kontext klar.

Inputs: Pfadnavigation und Upload sind verständlich; Befehle und Transfers wurden nicht ausgeführt.

UI: Terminal ist fokussiert. Numerische Unix-Modi und versteckte Dateien sind für erfahrene Admins passend, benötigen aber optional Hilfe.

### F13: Managed VMs / Vorlagen / Erstellung

- [ ] Geführter Assistent mit Review, Vorlagenabhängigkeiten und IPAM-Auswahl; Planung, Apply, Drift und Wiederherstellung erst mit vorhandener Test-VM separat validieren.

Information: Compute, Storage, Netz, Zugriff und Pre-/Post-Workflows sind umfassend. Der leere Inventarbereich widerspricht begrifflich anderen Managed-Zählern.

Inputs: Viele hilfreiche Defaults; MB und GB sind gemischt, Ubuntu-User wird beim Debian-Template vorgegeben, Clone attempts ist zu prominent.

UI: Ein großer Dialog trägt zu viele Entscheidungen auf einmal.

### F14: Playbook-Inventar / YAML-Editor

- [ ] Read-only-Inspektion als Standard, explizit bearbeiten, strukturierte Metadaten, Diff/Revision und getestete Freigabestände.

Information: Lesbare Playbook-Namen, Dateinamen, Kategorie und History sind gut. Autor, letzte Änderung und freigegebene Version könnten prominenter sein.

Inputs: YAML-Editor mit Syntaxprüfung ist angemessen für die Zielgruppe. Direktes Editieren beim Auswählen ist weniger sicher als eine klare Leseansicht.

UI: Zweispaltige Inventar-/Detailstruktur ist stimmig. Interne System-Playbooks erzeugen vermeidbares Rauschen.

### F15: Playbook Runs / Zielauswahl

- [ ] Run-Assistent mit strukturierter Variableneingabe, deutlich markiertem localhost, sichtbarem Dry run und dauerhaft sichtbarer Zielzusammenfassung.

Information: Hostsuche, IP, Tags, Status und Zielvorschau sind gute Absicherungen. Output und Historie teilen sich eine sehr lange Seite.

Inputs: JSON-Variablen sind technisch; localhost erscheint neben echten Hosts ohne gleichwertige Erläuterung des Ausführungsortes.

UI: Die Form ist lang, wichtige Run-Optionen liegen weit unten.

### F16: Variablen & Secrets

- [ ] Typen und Verwendungshinweise, sichere Secret-Erkennung, Änderungshistorie, Ablauf-/Rotationshinweise und klare Überschreibungsreihenfolge.

Information: Scope und Verschlüsselungsversprechen sind deutlich. Dieses Review bestätigt nicht deren technische Durchsetzung.

Inputs: Key, Wert, Secret-Schalter und Beschreibung sind passend. Secret ist beim Anlegen nicht der Standard.

UI: Übersichtlich, aber leere Liste und offenes Formular stehen redundant untereinander.

### F17: Schedules

- [ ] Gemeinsame Hostauswahl, nächste drei Läufe, Zone im Dialog, Retry-/Overlap-Regeln und Wartungsfensterbezug.

Information: Nächster Lauf samt Zone ist gut. Last run verwendet eine abweichende Uhrzeitdarstellung. Der vorhandene Name Weekly Updates gehört zu einem Daily-Zeitplan — eine Datenbenennung, kein nachgewiesener Schedulerfehler.

Inputs: Presets plus Cron, Parallelität und Extra-Variablen passen. Die Zielauswahl ist schwächer durchsuchbar als bei Runs.

UI: Das neue Zeitplanformular ist schmal und lang; die nächsten Ausführungen sollten sichtbar zusammengefasst werden.

### F18: Git Integration

- [ ] Branch-Auswahl, letzte Revision/Sync, Konfliktstatus, schreibgeschützter Modus und bewusstes Opt-in für Auto-push.

Information: HTTPS-Token versus SSH-Key ist klar. Auto-pull und Auto-push stehen standardmäßig an; Branch-/Commit-Kontext fehlt im sichtbaren Formular.

Inputs: Repository, Identität und Authentifizierung sind angemessen. Ein Verbindungstest und die Behandlung lokaler Änderungen sollten vor Connect erläutert werden.

UI: Saubere Form, aber wenig Unterstützung für kollaborative Freigabeprozesse.

### F19: Infrastrukturübersicht / Baum

- [ ] Favoriten und gespeicherte Filter, klarer Einstieg zur Infrastrukturübersicht, konsistente Klickziele und flexible Master-/Detailbreite.

Information: Kapazitäten und Erreichbarkeit helfen. Externe-Host-Zähler, Managed-Status und Datastoreumfang sind nicht durchgängig gleich definiert.

Inputs: Baumsuche und Aufklappen passen. Bei 19 VMs ist der Baum bereits lang und einzelne Zielnamen sind sehr klein.

UI: Konsistente Linien und Icons; die Plattformauswahl nimmt bei einer Plattform viel leere Fläche ein.

### F20: Plattform- und Nodeinformationen

- [ ] Configuration passend umbenennen oder echte Verbindungseinstellungen anbieten; Trends, Datenalter und vollständige Netz-/Storage-Abdeckung ergänzen.

Information: CPU, Memory, Uptime, Kernel und Bridges helfen. Configuration auf Plattformebene ist überwiegend eine zweite Inventarübersicht.

Inputs: Navigation und Copy-/Drill-down-Pfade sind ausreichend; keine Konfigurationsänderung getestet.

UI: Ruhige Kartenstruktur, teils redundante Angaben und gemischtsprachige Bezeichnungen.

### F21: VM-/CT-Inventar und Adoption

- [ ] Suche/Filter, klarer Adoption-Assistent, lesbare Fehlerursachen, stabile Namen, getrennte Host-/VM-Ansichten und Gefahrenmenü.

Information: Managementzustand, Ressourcen und Konfiguration sind vorhanden. Inventarstatus und Hoststatus werden im Baum vermischt; IP-/Disk-Werte fehlen ohne ausreichenden Grund.

Inputs: Mehrfachauswahl und Actions sind passend. Import all orphaned virtual machines ist technisch und missverständlich benannt; Ausführung wurde nicht geprüft.

UI: Breite Tabellen ohne sichtbare Suche oder Statusfilter im VM-Tab. Destruktive Buttons sind auf Detailseiten sehr prominent.

### F22: Datastores

- [ ] Alle relevanten Datastores anzeigen oder den Tab ZFS pools nennen; Health, Backend, Provisionierung, Reservierungen und Trend ergänzen.

Information: Used, Free, Capacity und Prozentwert sind gut. Der Tab heißt Datastores, zeigt aber ausdrücklich nur ZFS; der VM-Assistent bietet zusätzlich local-lvm an.

Inputs: Keine Eingaben erforderlich.

UI: Saubere Tabelle, bei einem Eintrag viel ungenutzte Fläche.

### F23: Proxmox-Updates

- [ ] Kompakte Beschreibungen, Release Notes, Rebootbedarf, Wartungsbezug und eine zusammenhängende Ergebnis-/Fehleransicht.

Information: Installed/Available/Origin sind nützlich. Lange Paketbeschreibungen ersetzen keine Information zu Reboot, Auswirkungen und Dringlichkeit.

Inputs: Refresh catalog und Install sind eindeutig; der letzte Bestätigungsschritt wurde nicht ausgelöst.

UI: Die Paketliste ist sachlich, wichtige Betriebshinweise fehlen im sichtbaren Vorfeld.

### F24: Snapshots und Infrastruktur-Tasks

- [ ] Restore oder Proxmox-Deep-Link, Schutzkennzeichnung, Retention und Kontext zu Konsistenz/RAM. Objektaktivität über Quellen hinweg vereinen.

Information: Snapshotname und Datum sowie aggregierte Sync-Ereignisse sind hilfreich. Die Tasks erklären ihren begrenzten Umfang, wirken aber gegenüber anderen Historien fragmentiert.

Inputs: Snapshot erstellen/löschen sichtbar, Wiederherstellung nicht sichtbar. Keine Snapshotaktion ausgeführt.

UI: Klare Leerzustände, aber wenig Unterstützung beim entscheidenden Recovery-Ablauf.

### F25: IPAM / Präfixe / Adressinventar

- [ ] Korrekte Reservierungsdefaults, Präfix-Auslastung, Konflikte, Quelle/Alter dauerhaft sichtbar; IPv6/VRF nur entsprechend Zielmarkt ausbauen.

Information: Freie Intervalle, nächste freie IP, Gateway, MAC, Quelle und Hostlink sind besonders nützlich. Die Präfixliste selbst zeigt keine Auslastung.

Inputs: Einzeladresse/Range und Präfix-CIDR passen. Reservierung startet als Active, IP-Beispiel stammt aus einem anderen Netz. IPv6 ist nicht sichtbar.

UI: Einer der stärksten Bereiche. Zwei Suchfelder auf der Startseite sollten ihre unterschiedlichen Bereiche deutlicher erklären.

### F26: IPAM Sources

- [ ] Controller und Site als lesbare Felder, Sync-Differenz, Datenvorschau und Warnung bei unerwartet leerem Bestand.

Information: Verbindungsstatus, Testzeit, Synczeit, Intervall und Konflikte sind gut. Grün bei null beobachteten Adressen benötigt mehr Erklärung.

Inputs: UniFi/pfSense, URL, Token und Site sind nachvollziehbar. Automatische Erkennung von URL-Varianten und ein klarer Testschritt würden helfen.

UI: Die Statuskarte ist gut gegliedert; die lange rohe API-URL ist visuell dominant.

### F27: Proxmox Platform connections

- [ ] Test mit Rechtecheck vor Speichern, CA-Zertifikatsweg, Service-Account-Beispiel statt root, flache Navigation und konsistente Sprache.

Information: Endpoint, IPAM-Intervall und Last sync sind nützlich. Access configured sagt wenig über tatsächlich verfügbare Rechte aus.

Inputs: Token, Public Key und TLS-Prüfung sind passend; Tokenformat und Mindestberechtigungen brauchen Hilfe. Keine Tokens eingegeben.

UI: Verschachtelte Dialoge und gemischte Sprache mindern den professionellen Eindruck.

### F28: Appearance / persönliche Darstellung

- [ ] Appearance als eigene persönliche Einstellung, zuverlässige Defaults, Kontrastprüfung und Priorität auf Typografie/Status statt neue Themes.

Information: Persönliches Theme versus globale Marke ist erklärt. White Label verspricht auch ein Icon; im geprüften Abschnitt sind Name/Farbe sichtbar.

Inputs: Theme, Density, Appname und Farbe passen. Scope und unmittelbare beziehungsweise gespeicherte Wirkung sollten konsistent sein.

UI: Die aktuelle dunkle Farbwelt ist kohärent. Viele Theme-Optionen auf der Kontoseite gewichten Kosmetik stärker als Sessioninformationen.

### F29: SSH-Schlüsselverwaltung

- [ ] Fingerprint, Alter, Rotation, Verwendungsübersicht und separate Schutzstufe für Private-Key-Export; mehrere Schlüssel nach Umgebung als Ausbau prüfen.

Information: Public Key, Algorithmus, Status und manuelle Installationsanweisung sind hilfreich; Lebenszyklus und Reichweite bleiben wenig sichtbar.

Inputs: Ziel, User, Port und Einmalpasswort passen. Distribute to all hosts braucht eine klare Ziel-/Folgenübersicht im späteren Ablauf.

UI: Mehrere lange Konfigurationsblöcke; kritische Export-/Importaktionen stehen neben Routineinformationen.

### F30: Benutzer, Rollen und Kontosicherheit

- [ ] Einladungen, restriktive Defaults, SSO/MFA-Policy, Sessions/Widerruf und Rights-Diff als Enterprise-Ausbau; keine Sicherheitswirkung aus dem UI allein ableiten.

Information: Rollen-Presets und Live preview sind gut. Die breite Built-in-Rolle User, rohe Null in der Benutzerzeile und fehlende sichtbare Sessionübersicht sind Schwächen.

Inputs: Anlage ist einfach, aber initiales Passwort wird vom Admin gesetzt und User ist voreingestellt. Rollenformular ist sehr lang.

UI: Grundstruktur passt. Sensitive Rechte sollten besser gruppiert und ihre effektive Kombination leichter prüfbar sein.

### F31: Plugins

- [ ] Paket-/Versionsinventar, Quelle, Kompatibilität, Rechteumfang, Freigabe und Update-/Rollback-Status; aktive Pluginseiten separat prüfen.

Information: Pfad und volle Serverrechte sind ehrlich erklärt. Im geprüften System sind keine Plugins installiert.

Inputs: Manuelles Ablegen auf dem Dateisystem und Reload sind keine geführte Unternehmensverwaltung.

UI: Der Leerzustand ist verständlich, wiederholt aber den Installationspfad.

### F32: Benachrichtigungen

- [ ] Kanäle benennen, Testfeedback und Zustellprotokoll, Severity-/Teamrouting, Deduplizierung und Wartungsunterdrückung.

Information: Webhook, SMTP und Eventschalter sind klar. Zustellhistorie und nachweisbarer Status fehlen im sichtbaren Bereich.

Inputs: Basisfelder reichen zum Start. Webhooktyp, SMTP-TLS-Modus, Empfängervalidierung und Testvoraussetzungen könnten deutlicher sein.

UI: Saubere Form, aber mehrere identisch beschriftete Save/Test-Buttons.

### F33: Systembetrieb / Polling / Agent

- [ ] System Health, Polling und Runtime getrennt führen; letzte erfolgreiche Erhebung, Fehler, Queue und Agent-Verteilung zeigen. Agentaktivierung nicht getestet.

Information: Versionen, Intervall und SSH/Agent-Unterschied werden erklärt. Custom Updates sagt gleichzeitig run check commands und nothing is executed — sprachlich widersprüchlich.

Inputs: Intervalle und Zone passen; Auswirkungen der Änderungen auf Last, Aktualität und aktive Abläufe fehlen.

UI: Lange Seite mit heterogenen Aufgaben von Binary-Installation bis Monitoring.

### F34: Danger Zone / Wiederherstellung

- [x] Backup/Restore priorisieren, Datenumfang und betroffene Umgebung genau nennen, aktuelle Sicherung und geschützte Bestätigung im Ablauf verlangen.

Information: Folgen werden kurz genannt. Ob etwa Container data nur lokale Daten oder Remote-Daten meint, sollte eindeutig sein.

Inputs: Keine destruktiven Dialoge oder Aktionen ausgeführt; Bestätigungsqualität nicht bewertet.

UI: Gefahr ist farblich deutlich, die Buttons stehen jedoch sehr direkt nebeneinander.

### F35: Suche, Activity Center, Umgebungen und Hilfe

- [ ] Scope der Live-Zentrale benennen, Zähler vereinheitlichen, Plattform-Shortcuts, kontextuelle Dokumentation, Support-/Versionsinformationen.

Information: Command Palette ist schnell zugänglich. Activity Center meldet 0 recent trotz vorhandener Historie, ohne seinen Zeitraum/Session-Scope zu erklären. Help bietet nur GitHub und Issues.

Inputs: Suche und Umgebungsanlage sind einfach. Die Palette könnte VM-/Node-/Präfixressourcen und Klartextnamen besser einbeziehen.

UI: Konsistenter Kopfbereich. Das macOS-Symbol ⌘K wird in dieser Linux-Sitzung angezeigt.

## Roadmap requirements

### Zuerst: Vertrauen und Fehlbedienung

- [ ] Zeitformat und Zeitzone über alle Ansichten vereinheitlichen.

- [ ] Statusaggregation, Datenalter und Ressourcenzähler korrigieren.

- [ ] Reservierungsdefault und Benutzerrollenstandard überarbeiten.

- [ ] Ressourcenbeziehungen und Namen in Navigation und Listen eindeutig machen.

### Danach: tägliche Abläufe verkürzen

- [ ] VM-Erstellung und große Formulare in geführte Schritte überführen.

- [ ] Operations mit konkreten Run-Links, Logs und Ergebniszusammenfassung ausbauen.

- [ ] Tabellen mit Suche, Filtern, verständlichen Spalten und gespeicherten Ansichten standardisieren.

- [ ] Eine UI-Sprache und ein Status-/Aktionsglossar durchsetzen.

### Anschließend: Enterprise-Betrieb ausbauen

- [ ] SSO, MFA-Richtlinien, Einladungen und Sessionverwaltung gegen reale Kundenanforderungen priorisieren.

- [ ] Wartung und kritische Aktionen mit Freigaben, Verantwortlichen und Change-Referenzen verbinden.

- [ ] Backup/Restore, Snapshot-Recovery und Integrations-Zustellhistorie vervollständigen.

- [ ] Historische Metriken, Datenqualitätsindikatoren und konkrete Runbooks ergänzen.

## Implementation evidence — first pass, 2026-09-09

Progress, not completion of the review:

- P1-01: Added shared API timestamp parsing for SQLite UTC strings, ISO UTC and explicit offsets. Removed view-specific `Z` appending. All shared absolute timestamps display the configured Europe/Zurich zone. Browser timezone preference, relative/absolute presentation and live visual verification remain open.
- P1-02: Host summary aggregates OS, image and custom update signals; missing OS data no longer displays healthy. OS tab explicitly scopes package status. Catalog freshness and reconciliation across Proxmox/host data remain open.
- P1-04: Reservation entry points select Reserved, populate next free address and reset stale form values; prefix/manual-source context and Active explanation added. Browser workflow verification remains open.
- P1-05: New users require explicit role selection; effective resource and sensitive capability summary added. Role API provides the actual runtime permission resolution so system defaults and legacy migration are reflected. Further form usability and browser verification remain open.
- P2-05: Corrected German fragments in English infrastructure UI and misleading custom-check wording. Full glossary/table/help work remains open.

Verification completed:

- Frontend: 13 suites / 100 tests passed after timestamp and catalog changes.
- Frontend TypeScript check passed, including effective-role preview changes.
- Frontend lint passed before the final effective-role preview addition.
- Vite production build passed before the final effective-role preview addition.
- Backend permission suites: 30 tests passed.
- New role-preview route test passed: API preview equals runtime permissions, legacy grants preserved, explicit denial not widened.
- No production deployment or live browser verification of these changes yet. Production screenshots in the original report describe the pre-change application.

## Implementation evidence — VM wizard, 2026-09-09

- P2-02 / F09: Replaced the large VM form with five steps: template/identity, resources, network/access, automation, review. Explicit final save, persistent capacity summary, back/direct navigation retain values. Clone attempts are under advanced compute. RAM/disk units are MiB/GiB with RAM conversion. Removed the guessed Ubuntu login; saved templates still supply configuration. Field validation covers names, integer resource values, VLANs, IPv4/prefix/gateway, login and pre-deploy host. An empty optional gateway now passes validation.
- Accessible field labels and described errors also work for compound input/datalist fields. VM definition saving remains separate from plan/apply.
- Verification: 104 frontend tests passed, including four new semantic validation tests. TypeScript and scoped lint passed before the last compound-label adjustment; subsequent TypeScript recheck launched. Browser checked all five steps against deterministic local catalog fixtures, missing-login validation and review details; no live VM created. Screenshots: `artifacts/ui-review-2026-09-09/verification/vm-network.png` and `vm-review.png`.
- Remaining for this point: narrow viewport, saved-template/edit scenarios, real backend save round-trip, backend validation parity and non-VM large forms. The wizard is not production-deployed.

Follow-up checks: final TypeScript check and scoped deployment lint passed after compound-label adjustment. Production build rerun with the project-local Vite command; see completion output for result.

## Implementation evidence — operations and metrics, 2026-09-09

- P2-01 / F02: Operations now present readable known host/deployment action names while preserving the original identifier. Selecting a task loads the exact execution's result line, log, start/completion and duration in place. Grouped syncs resolve their latest execution. The previous generic details link is accurately labelled Open resource. Host history now also labels compose image pulls.
- New GET /operations/:id/details reuses environment/resource filtering and requires host-history permission for host logs. Responses bound output to the last 200,000 characters and explicitly report truncation. UTC duration handles mixed SQLite/ISO timestamp formats. Remaining: permanent resource identity after deletion (current history cascades), deep-linkable selection and live UI verification.
- P2-03: Infrastructure CPU cores display two decimals; stopped/paused tree entries have explicit accessible labels. Docker missing metrics show No sample with collection explanation. Uncheckable images explain the absent local repository digest, matching the check playbook's not_checkable branch. Remaining: freshness/source metadata, guest-agent reachability distinction, historical metrics and live visual verification.
- Verification: 104 frontend tests, full frontend lint and TypeScript passed. Operations route suite: 10 tests passed, covering exact logs, UTC duration, resource isolation, output bounding and denial of logs to update-only users. No production deployment in this pass.

## Implementation evidence — resource model, 2026-09-09

- P1-03: VM definitions now name the declarative list and navigation, with an explicit explanation that adopting a host does not create a definition. Inventory counts use Host operations enabled rather than conflating SSH adoption with declarative management.
- Infrastructure overview and tree share platformHostIds, including both node and guest links; linked hypervisors no longer inflate standalone host counts.
- VM tree primary links consistently open inventory details regardless of host adoption; the separate labelled host-operations link opens the associated host.
- Environment selector now displays vm_definition_count, calculated from isolated VM rows in the selected environment, matching the VM definition list. The legacy workspace count remains available separately for API compatibility. Empty and shared legacy workspaces are excluded from the new count.
- VM context exposes definition_id for isolated VMs, and the provisioning link uses it instead of incorrectly routing to the internal workspace ID. Context shows a readable management state and retains associated host names.
- Verification: 106 frontend tests, TypeScript and full frontend lint passed. Environment integrity and Proxmox platform suites: 18 tests passed. New tests cover host/node deduplication, management states and definition counts with empty/legacy/isolated workspaces.
- Remaining: targeted context-link test, live navigation/visual verification, consistent relationships in host-side identity panels and handling unavailable/restricted relationship data. Not production-deployed.

## Implementation evidence — maintenance and interventions, 2026-09-09

- P2-04 / F03: Maintenance windows now persist structured host IDs and a change reference using additive, idempotent schema updates. Server-side validation checks type, duplicate IDs and permitted environment/resource scope. UI provides searchable host checkboxes, existing-owner suggestions, explicit environment-wide semantics for empty selection, impact notes and IANA timezone selection.
- Overlap warnings compare both time and resource scope, exclude the edited window and allow intentional overlaps; adjacent time windows are not conflicts. Failed overlap/host queries are shown explicitly.
- VM force stop moved into Advanced power actions; destructive confirmation is retained. Snapshot UI provides the configured Proxmox console link and the target node/VM recovery path instead of leaving restore unexplained.
- Verification: 108 frontend tests, full lint and TypeScript passed. Maintenance/environment-isolation suites: 6 tests passed, including structured fields round-trip, duplicate normalization and cross-environment rejection. Migration suite plus earlier maintenance tests: 8 passed, confirming idempotent upgrade behavior.
- Remaining: approval/reviewer lifecycle, structured team ownership, maintenance links on actual actions, update impact/reboot previews, saved scopes with deleted hosts, narrow viewport/browser QA and production deployment. Direct snapshot rollback is intentionally still performed in Proxmox; the review's alternative of a clear recovery link is implemented but awaits browser verification.

## Implementation evidence — search and guidance, 2026-09-09

- F35 / P2-05: Command search includes permission-gated infrastructure summary results for platforms, nodes, VMs and containers, with names, numeric VM IDs and encoded inventory links. Loading failures participate in the existing retry UI. Added g i infrastructure shortcut and platform-appropriate Ctrl/Command labels.
- Activity Center explicitly states its browser/account/environment scope, retention (30 events) and displayed limit (20). Empty/completed copy no longer suggests a complete server history.
- Help menu opens a local contextual operator guide covering operations, VM definitions, inventory, IPAM, hosts, playbooks and administration, with frontend build version and useful problem-report details. Keyboard help ignores contenteditable fields.
- Verification: 110 frontend tests, TypeScript and full lint passed; search tests cover stable encoded links, identifiers and keyboard platforms. Production build launched. Remaining: browser interaction/visual QA, keyboard discovery documentation, search scale/pagination and broader support workflows. No production deployment.

## Implementation evidence — SSH and notification feedback, 2026-09-09

- F29: Assignment targets load on entry instead of displaying a perpetual loading placeholder for an unstarted focus-triggered request. Environment changes reset selection; assigning is disabled during refresh, errors or invalid selection. Copy distinguishes intended assignments from actual remote authorization and explains that removal does not revoke remote trust.
- SSH metadata reports actual algorithm, OpenSSH-compatible SHA-256 public fingerprint and local registration time (explicitly not original creation age). The old hard-coded ED25519 label is removed.
- F32: Webhook/SMTP tests require saved nonempty configuration; status, timestamp and errors remain visible in the form. Successful settings saves reset prior test feedback so it is not attributed to the new configuration. No external notification was sent by this review work.
- SSH service supports an isolated key directory. SSH-manager tests now use a temporary directory instead of clearing application data/ssh.
- Verification: 110 frontend tests and full lint passed; final TypeScript passed after notification status reset. SSH-manager and metadata suites: 10 tests passed; metadata verified independently against ssh-keygen for RSA/ED25519.
- Remaining: browser verification, planned rotation flow, export reauthentication, environment-specific multiple keys, persistent delivery history, severity/team routing, deduplication and maintenance suppression. Not production-deployed.

## Implementation evidence — persistent notification history, 2026-09-09

- F32: Automatic and test webhook/SMTP calls now record bounded delivery metadata: channel, destination hostname, title, accepted/failed state, HTTP status and duration. Message bodies, credentials and webhook paths are excluded. Unconfigured channels do not create attempts; test endpoints reject missing saved configuration rather than reporting success without sending.
- Administrator-only paginated history is visible in Notifications, refreshes periodically and distinguishes endpoint acceptance from human receipt. Queries show the latest 30 days; inserts prune expired records and retain at most 1,000 attempts. Channel scope is explicitly global, matching existing settings.
- Verification: 23 notifier tests passed (all external traffic mocked/blocked), including accepted/failed metadata, exclusion of secrets/message bodies, no-op channels, history authorization, pagination and expiry. Six migration tests passed during schema implementation. Frontend: 110 tests, TypeScript and full lint passed.
- Remaining: SMTP acceptance/error mock coverage, browser QA, severity/team routing, deduplication, maintenance suppression and production deployment. Historical delivery data starts after this feature is deployed.

## Implementation evidence — SMTP outcomes and plugin inventory, 2026-09-09

- F32: SMTP now checks Nodemailer's accepted/rejected recipient lists. Partial rejection is recorded separately and the test endpoint returns a failure instead of incorrectly reporting complete success. Delivery UI shows partial rejection explicitly. Mocked tests cover accepted, partial, fully rejected and transport-error outcomes without logging recipient addresses or error secrets. Retention is verified with >1,000 records and expired entries.
- F31: Plugin inventory exposes ID, installed version, local source, runtime registration state and existing SHA-256 allowlist trust/policy. Enable confirmation shows digest/trust and actual process privilege scope. Copy explains that disabling access does not unload already registered code; no sandbox guarantee is implied. Switches have accessible plugin-specific labels.
- Verification: 25 notifier tests passed with no actual notification transport. 110 frontend tests, TypeScript and full frontend lint passed for the plugin UI changes. Remaining: browser QA, installed-plugin workflow checks, source provenance/compatibility declarations, updates/rollback, routing/deduplication/suppression. No deployment.

## Implementation evidence — update catalog freshness, 2026-09-09

- P1-02 / F09: Opt-in OS catalog API metadata exposes source, last successful collection, cached status and expiry after two configured polling intervals (minimum two minutes). Legacy callers retain the array response. Forced failures preserve the last successful timestamp and return an error.
- Host update view distinguishes host SSH package catalogs from Proxmox and image catalogs. A stale empty OS catalog is flagged for refresh instead of a green summary.
- Verification: two isolated API tests passed for stale/fresh metadata, legacy response shape and failed forced checks; 111 frontend tests, TypeScript, full frontend lint and git diff --check passed.
- Remaining: browser verification, freshness progression while a view remains open, source metadata across dashboard and Proxmox, image/custom collection state and production deployment.

## Implementation evidence — Git synchronization, 2026-09-09

- F18: Auto-push now requires an explicit stored opt-in, including new setup. Existing explicit settings remain respected. Initial setup exposes branch selection and explains local-edit handling; connected view displays actual branch, commit, changed files and last successful pull, refreshed every 30 seconds.
- Pull no longer runs hard reset or clean. Local runtime edits are synchronized into the workspace and block pull/checkout; divergent commits block fast-forward rather than being discarded. Successful import alone updates last-pull timestamp. Setup reports initial synchronization failure separately from saving configuration.
- Git service accepts isolated workspace/playbook paths for tests. Porcelain status parsing preserves leading status whitespace and uses NUL separators so modified filenames are not truncated.
- Verification: 21 Git tests passed, including real temporary local repositories for runtime edit preservation, blocked branch switches, successful remote fast-forward and preservation of divergent commits. No network remote or project playbook directory was modified. 111 frontend tests and full frontend lint passed; final TypeScript and changed-file lint passed after type fixes.
- Remaining: browser QA, read-only mode, connection test before saving, explicit conflict-resolution workflow, initial import with existing local playbooks, remote deletion propagation and synchronization concurrency review. No production deployment.

## Implementation evidence — Git remote read-only, 2026-09-09

- F18: Added explicit remote read-only mode, enabled by default in new setup. It blocks manual and automatic pushes at service level before staging/committing, while allowing pull and local edits. UI explains this scope and recommends a repository credential with matching permissions. Existing connections retain their stored behavior.
- Admin-only settings/config APIs validate boolean input, expose the mode and disable stored auto-push when read-only is enabled. Disabling read-only does not restore auto-push implicitly. Direct push returns 409 while protected. Disconnect clears mode and obsolete last-pull timestamp.
- Verification: 23 Git tests passed, including direct/automatic publishing guards, unchanged local HEAD, boolean validation, viewer rejection and settings round-trip. TypeScript and changed-file lint passed. Browser fixture verified changed files, correct commit/time, blocked pull/checkout, read-only toggle, save prerequisite for publishing and auto-push remaining off. Screenshot: verification/git-working-copy.png; reproducible source fixture: verification/git-fixture.html. Fixture network responses are mocked; no real settings or repositories were changed.
- Remaining Git work: connection test before save, initial import handling, conflict-resolution guidance/workflow, remote deletions, synchronization concurrency and complete live/narrow-viewport QA. Goal remains incomplete and no production deployment occurred.

## Implementation evidence — Git connection test, 2026-09-09

- F18: Setup offers a read-access test before saving, showing available/default branches, selected-branch existence and check time. Results are shown only while their submitted URL, credential mode/content and branch match the current form, avoiding stale success after edits.
- Admin-only POST test endpoint runs ls-remote in an ephemeral directory without saving settings or fetching into the active workspace. Timeout and output limits apply; temporary keys/directories are removed on success/failure. HTTPS credentials use a process environment header, not command arguments; transport failures return a bounded generic message rather than potentially secret-bearing stderr. SSH requires an already trusted server host key.
- Verification: four isolated tests passed for branch parsing, missing branch, transport failure, cleanup, input validation, admin authorization and preservation of existing configuration. Final tests mock command execution. TypeScript and changed-file lint passed; git diff --check clean.
- Remaining: browser checks of setup/test feedback, initial import and conflict handling, synchronization concurrency, remote deletion propagation and live deployment. No actual repository connection was configured.

## Implementation evidence — host notes, 2026-09-09

- F11: Replaced delayed autosave with explicit save, visible dirty/saving/error states and navigation/unload protection. Background query changes no longer silently overwrite the draft. Loading the latest saved version confirms discarding a dirty draft. Added a runbook template for empty notes and accessible Markdown input with matching 5,000-character limit.
- Notes API returns revision, author and saved timestamp. Writes require the observed revision (428 if missing); a transactional comparison rejects stale drafts with 409. Existing content is retained as original revision on the first edit; the latest 100 versions are retained and viewable under the existing host/notes access guards. History displays author/time/content without executing stored markup.
- Verification: isolated API test proves original-content retention, attribution, stale-write rejection, missing-version rejection, type/length validation and successful merged revision. Six migration tests, 111 frontend tests, TypeScript and changed-area lint passed. No real host notes were changed.
- Remaining: browser QA of navigation, simultaneous editors and history; dedicated retention/access regression coverage. Frontend/backend must be deployed together because writes now require a revision. No production deployment.

## Implementation evidence — note history access and inventory semantics, 2026-09-09

- F11: Additional API regression test performs 102 saves and verifies exactly the latest 100 revisions remain. It verifies history denial without note capability, outside the allowed host list and outside the selected environment. Both note suites pass.
- P2-03 / F21: VM detail labels IPv4 as configured data rather than a discovered current guest address. QEMU-agent configuration explicitly does not assert reachability; null/LXC configuration no longer falsely displays Disabled. Usage is labelled inventory data, CPU retains a decimal, missing samples do not imply zero, and absent guest filesystem metrics link conceptually to guest/agent checks or host Storage.
- Verification: TypeScript and changed-file lint passed; git diff --check clean. Remaining: browser verification, actual guest-agent reachability/collection timestamps and consistent missing-data reasons across all inventory tables. These explanatory changes do not implement a new live agent probe. No deployment.

## Implementation evidence — playbook inspection mode, 2026-09-09

- F14: Selecting an existing playbook opens CodeMirror with readOnly and editable=false, with an explicit Edit playbook action. New files start editable; editing is disabled during save and for users without edit capability. Saved content returns to inspection mode.
- Users with view permission can now open file contents; history restore controls are hidden without edit permission. API permissions already enforce view versus edit. Added dirty-draft guards for route/unload navigation, closing, changing files and creating a new file. Background content refresh does not replace an active edit.
- Verification: 111 existing frontend tests, TypeScript, playbook-area lint and git diff --check passed. These regression checks do not prove browser interaction; editor/viewer/dirty-navigation browser QA remains required.
- Remaining: browser validation, author/version metadata, diff and release approval workflow, internal-playbook visibility default and server-side concurrent edit protection. No deployment.

## Verification evidence — playbook browser review, 2026-09-09

- Local browser fixture verified default read-only presentation, explicit Edit action, editable YAML, dirty badge, save and return to read-only with persisted mock content. Changing the fixture profile to view-only still permits file selection while edit/save/delete/run actions disappear.
- Browser inspection found the CodeMirror content textbox was unnamed despite its named wrapper. Added contentAttributes with aria-label and aria-readonly; subsequent DOM inspection confirmed the actual textbox is labelled.
- Screenshot: verification/playbook-reader.png. Fixture source: verification/playbooks-fixture.html. No real playbook execution or modification occurred. TypeScript, changed-file lint and git diff --check passed.
- Still unverified: confirmation-dialog accept/cancel and route/unload behavior, browser backend round-trip, narrow viewport and concurrent edits. Do not infer those from the mocked save test.

## Implementation evidence — playbook content revisions, 2026-09-09

- F14: Playbook reads expose SHA-256 content revision and filesystem modification time. Save requires the observed revision; missing revision returns 428 and stale content/new-file collisions return 409 before rotating backups or changing files. Comparison/write remain synchronous within the request before Git synchronization. Existing bundled content is also compared before an override is written.
- Editor retains its base revision while editing, displays it, sends null for new files and shows save errors without clearing the draft. History restore is unavailable while a dirty draft exists; successful restore refreshes its base. API and frontend must be deployed together for the new save contract.
- Verification: isolated API test covers create/read, successful replacement, missing/stale revision, filename collision, preservation of current content and backup. TypeScript and changed-file lint passed. Test files are in a temporary playbook directory and no remote Git action is configured.
- Remaining: full browser conflict resolution, restore/delete concurrency and coordination with Git/external filesystem writers. The SHA comparison is not an OS-wide file lock. No production deployment.

## Implementation evidence — playbook change preview, 2026-09-09

- F14: Dirty playbooks offer an expandable line comparison against the content opened for editing, including saved/draft line numbers, additions/removals, sign labels and counts. Text renders as React text, without HTML interpretation.
- Comparison preserves complete text and newline differences. A bounded LCS comparison falls back to an explicitly labelled replacement block for large edits; the rendered preview caps at 2,000 lines and explicitly directs users to review the complete editor text.
- Verification: nine tests passed for reconstructing both versions, additions/deletions, repeated lines, CRLF/final-newline differences, matching context and the large-edit fallback. TypeScript, changed-area lint and git diff --check passed.
- Remaining: visual/keyboard verification of expanded diff, integration with release approval and full review completion. No deployment.

## Implementation evidence — host history filtering, 2026-09-09

- F10: Added text search across raw/readable actions, playbook names, actors and available output, combined with status and inclusive date filters. Date boundaries use Europe/Zurich, explicitly labelled next to date inputs. Filtering occurs before pagination, resets its page and keeps clear-filter controls available when there are no matches.
- Scope/count copy makes clear this searches loaded host history rather than a complete archive. Loading/failure states are distinguished from empty/no-match states with retry. Both mobile and desktop rows open logs for successful and failed runs.
- Verification: two tests cover combined matching, unknown dates and UTC-to-Zurich day boundaries in summer/winter. TypeScript, changed-area lint and git diff --check passed.
- Remaining: browser visual/filter/pagination checks, complete server-side history pagination and permanent per-run URLs. No deployment.

## Implementation evidence — variable and secret input, 2026-09-09

- F16: New variables default to Secret. Credential-like key names or private-key content produce guidance when deliberately stored as plaintext. Copy distinguishes masking/storage protection from runtime use and advises against printing secrets. It documents string values, Jinja references and run-specific overrides, matching ansible-runner's merge order.
- Variable drafts track their originating environment and cannot be saved after an environment switch. Navigation, replacement and cancellation protect changed drafts. Key/value limits and key-format feedback match the API; unchanged drafts cannot be saved.
- API rejects nonboolean secret flags instead of silently treating values such as the string true as plaintext. Isolated test verifies create/update rejection, masked create/list responses and keeping an existing encrypted value when editing metadata.
- Verification: API test, TypeScript, changed-file lint and git diff --check passed. No real variable or secret was modified.
- Remaining: browser checks, variable change history, expiration/rotation metadata and typed-value support. No production deployment.

## Implementation evidence — variable change history, 2026-09-09

- F16: Transactional variable create/update/delete journaling records environment, stable variable ID/key, action, actor, time and changed-field names. Neither values nor description contents are stored. Deleted-variable entries survive, with a cap of 1,000 events per environment.
- Environment-scoped history endpoint requires variable-view permission and environment access; paginated UI lists 25 entries and explains retention and collection start. Mutations invalidate its cache.
- Verification: three variable API tests passed, covering secret input/masking, metadata-only history, authorization, environment separation, deletion retention, 1,000-event cap and pagination. Six migration tests, TypeScript, changed-file lint and git diff --check passed. No real secrets modified.
- Remaining: browser verification, rotation/expiry metadata, typed variables and wider review completion. No deployment.

## Integration verification — combined worktree, 2026-09-09

- Complete frontend check: 122 tests in 19 files passed, TypeScript passed, full src lint passed and Vite production build succeeded (1,967 modules). This confirms bundle/compile integration, not live browser completeness or deployment.
- Combined selected backend regression run: 95 tests passed across variable/notes/playbook revisions, Git sync/probe, update metadata, roles, operations, maintenance, notification history, SSH, environment integrity and migrations. These are the reviewed isolated suites, not the entire server suite.
- Integration fix: environment consolidation now moves variable_change_events with variables instead of losing them through parent deletion. The target environment's 1,000-entry retention cap applies. Extended environment test asserts that a historical event still exists in default after consolidation; all five environment tests passed after this fix.
- Full objective remains incomplete: outstanding feature requirements and browser/live verification are still recorded above. No production deployment occurred.

## Implementation evidence — secret rotation guidance, 2026-09-09

- F16: Secret rows show last stored-value update and optional rotation due date, with an explicit Overdue label after the Zurich calendar date. Form explains source-side rotation followed by replacing the stored value, and that the advisory date neither sends notifications nor revokes credentials/blocks jobs.
- Schema version 9 adds rotation_due and value_updated_at after the legacy variable-table migration; unknown historical value dates remain null. API validates real YYYY-MM-DD dates, preserves metadata if omitted and records due-date changes without values. Metadata-only edits preserve the stored-value timestamp; value replacements update it.
- Verification: four variable tests and six migration tests passed, including impossible dates, metadata round-trip, keeping the old value timestamp, replacement timestamp, cleared due date and value exclusion from history. TypeScript, changed-file lint and git diff --check passed.
- Remaining: browser verification and typed-variable support; external credential rotation is an operator action, not implemented as an automatic integration. No production deployment.

## Implementation evidence — typed variables, 2026-09-09

- F16: Added Text, Number, Boolean and JSON variable types, with multiline JSON input and persistent API validation feedback. Schema version 10 defaults existing rows to string; execution conversion returns native numbers/booleans/JSON while preserving legacy text. Run-specific override precedence is unchanged.
- API validates finite numbers, strict true/false and valid JSON (including rejection of non-finite nested numbers). Type changes are journalled. Secrets explicitly remain text values to preserve existing masking semantics; switching a field to Secret resets its type to text.
- Verification: five variable integration tests passed, including native execution values, text compatibility, type changes and invalid/unsupported inputs. Six migration tests passed during implementation; TypeScript, changed-file lint and git diff --check passed. No playbooks were executed.
- Remaining: browser validation of the expanded variables form, end-to-end Ansible serialization check and the other review requirements. No deployment.

## Implementation evidence — schedule preview and DST correction, 2026-09-09

- F17: Schedule form previews the next three runs with scheduler timezone and UTC offset. Preview updates after a short input debounce, reports invalid expressions and explains paused/overlap behavior. Custom-cron mode hides irrelevant preset selectors; preset selectors gain accessible labels.
- Testing exposed node-cron 4.2.1's getNextMatch skipping from March 2026 to January 2027 across DST. Added bounded calendar candidate enumeration verified with node-cron's own matcher. Both preview and registered user schedules use it, including nonexistent/repeated local hours. Uses stopped temporary tasks for preview and destroys them; registered schedules install the corrected matcher before start.
- Verification: nine scheduler/preview tests passed, covering timezone, auth, no saved schedule, task cleanup, registered matcher consistency, spring/autumn DST, every-minute schedules, invalid/impossible expressions and polling debounce. TypeScript and schedule-area lint passed. No playbook was executed by these preview tests.
- Remaining: browser/form QA, broader calendar/rare-timezone runtime verification, scheduler overlap/retry/maintenance product controls and the wider review scope. Current preview search horizon is 13 years, reported if it cannot find three occurrences. No deployment.

## Implementation evidence — schedule target selection, 2026-09-09

- F17: Schedule target selection now searches names, hostnames, IPs and tags, filters status and displays IP/status per host. Filtering preserves checked hosts/exclusions. A current target summary expands the full list, explains future-host inclusion for all mode and flags saved targets/exclusions missing from the current inventory.
- Localhost is labelled as execution inside the Shipyard runtime. Switching all-host mode resets its explicit confirmation. Ad-hoc Runs and Schedules now share matching logic rather than maintaining separate search semantics.
- Verification: two tests passed for combined search/group/tag/status, preserved hidden selections, dynamic exclusions, localhost and missing saved targets. TypeScript, playbook-area lint and git diff --check passed.
- Remaining: browser interaction/visual QA, consolidated reusable selection component, retry/overlap controls and maintenance-window linkage. No deployment.

### Schedule dialog browser verification and layout

- Verified the real ScheduleDialog component with isolated fixture responses: selecting web-01 and filtering by the database tag preserves web-01 in the target preview while showing only db-01 in the list.
- Desktop visual QA exposed excessive scrolling in the narrow dialog. Expanded the dialog to two responsive sections (workflow/targets and timing/execution), with a scrolling body and persistent header/save footer. At the inspected 1414 × 873 viewport, target selection, timing, next executions, extra variables, dry run, concurrency and save are visible together. Narrow viewport visual QA remains outstanding.
- Verified custom cron mode replaces preset selectors with the labelled cron textbox. Corrected singular target count wording.
- Screenshots: `artifacts/ui-review-2026-09-09/verification/schedule-targets.png` and `schedule-cron.png`; reproducible fixture: `schedule-fixture.html` (serve from frontend-next root). Preview dates are mocked; scheduler date correctness is covered by the separate backend tests, not these screenshots. No schedule was saved or executed.
- Validation: target-host unit tests 2/2, scoped ESLint and application TypeScript check passed.
- Remaining schedule work includes narrow viewport QA, missing-target removal, form dirty-state protection and calendar validation before persistence, plus the broader review requirements tracked above.

### Calendar validation before schedule persistence

- Create, cron updates and reactivation now validate that the actual scheduler matcher can find a future execution within its 13-year search horizon before writing the schedule. Impossible dates return 400 with an actionable calendar error; malformed update values are also rejected. Five- and six-field API expressions remain supported, including sparse leap-day schedules. Temporary validation tasks are always destroyed.
- Legacy invalid schedules remain pausable and renamable so users can recover them. API errors remain visible in the schedule footer with the draft preserved. Unavailable saved targets/exclusions can now be explicitly removed from the draft.
- Validation: 9 schedule preview/API tests passed, including rejected creation without a row, rejected update without partial changes, rejected reactivation, legacy pause, task cleanup, leap days and seconds syntax. Scoped frontend ESLint and application TypeScript passed. The new draft-removal button and persistent error need browser interaction QA.
- Full review implementation remains active; schedule dirty-state protection, narrow viewport verification and broader workflow/change controls are still outstanding.

### Schedule draft lifecycle and loss protection

- Schedule dialogs now mount only for an open editing session, preventing stale initial data and retained new-schedule drafts on reopen. The initial draft baseline stays stable across query refreshes. Search/status filters are excluded from dirty-state detection; all persisted fields and target selections are included.
- Closing a dirty dialog asks before discarding, closing while a save is pending is prevented, and the existing shared navigation/browser-unload guard now covers schedule drafts. Successful save clears the guard. The footer identifies unsaved changes.
- The draft captures its original environment and blocks saving after an environment switch, with a visible explanation.
- Validation: application TypeScript, scoped ESLint and git diff whitespace checks passed. Browser confirmation acceptance/cancellation, reopened drafts and environment-switch interaction remain to be verified; the unit suite does not establish those UI behaviors.

### Schedule discard lifecycle browser evidence

- Replaced native close confirmation with the shared ConfirmDialog. Browser QA now renders the actual SchedulesTab under its router and query providers with isolated API fixtures.
- Verified: enter `Unsaved maintenance draft`, click close, see discard dialog; Cancel preserves the exact name; close again and Discard closes the editor; New Schedule then has an empty name and zero selected targets. No real schedule was saved or executed.
- Screenshot: `artifacts/ui-review-2026-09-09/verification/schedule-discard.png`. Updated schedule-fixture.html exercises the real parent dialog lifecycle.
- Route navigation/browser-unload and environment-switch interaction remain outside this verification; narrow viewport and other previously documented review requirements are still open.

### Compose editor validation and save semantics

- Compose writes now reject invalid YAML, duplicate keys, non-mapping services/configurations, invalid service names, malformed include collections and files over 1 MiB before creating a temporary file or invoking the remote runner. Errors include parser line/column without echoing potentially secret YAML content. Standard mappings, anchors/extensions and include-based configurations remain accepted. This is basic structural validation, not full Compose schema/runtime validation.
- The editor explains that save writes the file and does not start/recreate workloads; runtime compatibility and referenced files remain part of the explicit start operation. API errors remain visible, and path/content labels are connected to their inputs. Docker table heading now says Update status.
- Validation: 2 focused validation tests passed, covering accepted forms, invalid structures, malformed/duplicate YAML, size and secret-free errors; scoped ESLint and application TypeScript passed. Full route/remote-write behavior and editor interaction remain to be verified with mocks/browser fixtures. No host files were written.

### Compose write API verification

- Added isolated database/API tests with a mocked Ansible runner. Invalid YAML, invalid service structure, invalid path types, relative paths, protected directories and unauthorized roles trigger no runner call. Valid content performs exactly file+copy operations, preserves environment scope and registers the project only after success. A failed copy registers no project. Temporary files are mode 0600 and removed on success/failure.
- Hardened path validation to require an actual string and an absolute directory, eliminating coercion of array inputs and ambiguous relative destination paths.
- Validation: all 7 Compose validation/write/API tests passed. No remote connection or real host file mutation occurred. The complete editor browser workflow and remaining Compose usability requirements (templates and explicit preflight UI) still need work.

### Explicit Compose preflight

- Added permission- and host-scoped POST compose/validate, sharing the exact local validator used by save. It performs no remote operation and returns only a bounded result/scope or sanitized error.
- Compose editor now offers Validate YAML with pending, success, error and changed-content states. A result is displayed as current only for its submitted host/content snapshot, including when content changes during an in-flight request. Copy explicitly distinguishes local syntax/basic structure from runtime Compose compatibility and external dependencies. Save retains authoritative validation independently.
- Validation: all 8 Compose unit/API tests passed, including explicit preflight with zero runner calls and denied-role coverage; application TypeScript and scoped ESLint passed. Interactive browser verification of preflight states remains outstanding.

### Compose preflight browser verification

- Exercised the actual ComposeValidation component with manually released mocked responses. Verified initial unvalidated state, edit while request is pending followed by late success (still requests revalidation), successful validation of the current content, and a persistent API error including line/column.
- Screenshot: verification/compose-validation.png; reproducible fixture: verification/compose-fixture.html. This proves component state handling with controlled responses, not the full host-detail dialog or runtime Compose compatibility. No host commands or writes were performed.

### File browser navigation and permission help

- Added filename filtering scoped explicitly to the current directory, optional dotfile/dot-directory/symlink hiding (existing show-all default preserved), clear filters and shown/total/hidden counts. Directory navigation resets the text query; folders retain first position and numeric names sort naturally. Empty directories and filtered-out listings now have distinct messages.
- Added expandable octal-mode help plus decoded owner/group/others and special-bit labels on each mode. Binary size units corrected to KiB/MiB/GiB/TiB. Existing upload bar now exposes progressbar semantics and percentage to assistive technology.
- Validation: 2 focused tests passed for filtering/sorting/nonmutation and mode decoding including special/unknown modes; application TypeScript and scoped ESLint passed. Browser interaction QA and transfer/session requirements remain outstanding.

### File browser UI evidence

- Actual ServerFilesTab with read-only profile and five mocked entries: hiding dotfiles plus searching .env gives a distinct zero-match state; enabling hidden files reveals only .env. Clear filters and case-insensitive REPORT search returns report2.txt before report10.txt, with accurate counts, binary sizes and decoded accessible mode labels. Visually inspected desktop table.
- Screenshot: verification/files-search.png; fixture: verification/files-fixture.html. No file downloads, transfers or remote requests occurred.
- Fixed path input fallback to use null (initial value) rather than an empty string; an empty editing value no longer falls back to the resolved directory in code. Browser fill-empty did not establish this interaction reliably, so keyboard-clear verification remains open. Full transfer/session behavior and narrow viewport QA remain outstanding.

### File transfer progress semantics

- Upload percentage now explicitly measures browser-to-Shipyard bytes. At 100%, the dialog states that the destination write is still awaiting confirmation; success is emitted only after the API acknowledges the remote write. Progress uses floor/clamping and ignores late callbacks after settlement.
- Upload target/overwrite and host-to-host target/overwrite controls are disabled while pending. Host transfers show an honest in-progress state explaining that byte progress is unavailable, rather than inventing percentages.
- Verified against the streaming backend: response 201 follows awaited SSH upload/transfer completion. Frontend API tests 8/8 pass, including a 100% browser upload followed by destination failure and ignored post-settlement progress. TypeScript passed. Full transfer dialog/browser execution remains to be checked with controlled fixtures.

### Terminal session visibility

- Terminal now displays elapsed connected time starting at the SSH ready message and freezes it on error/closure. Expand/restore increases the overlay to the available viewport; the existing ResizeObserver adjusts terminal dimensions without changing the connection effect dependencies.
- Inspected server/ws/ssh-terminal.js: there is currently no session-event/output recording or application idle/duration expiry. The UI now states these limits explicitly in expandable policy help and explains local-buffer copying. This is transparent status, not implementation of audit recording or expiry controls.
- Scoped ESLint and application TypeScript passed. Browser verification with a simulated WebSocket, recording/expiry implementation and terminal search remain outstanding. No SSH session was opened for this change.

### Terminal session audit metadata

- Added terminal.connect, terminal.connect_failed and terminal.disconnect audit events with shared session UUID, captured host/name/user/environment, actor/IP and connected duration. Close/error paths deduplicate events; shell readiness after a closed browser is discarded. Reasons are bounded codes, and terminal input/output/raw errors are not accepted by the audit helper.
- SSH ready handshake now confirms sessionAudit to the frontend. Policy copy reflects this confirmation, retaining an explicit unconfirmed state for older backends. This supersedes the prior statement that session events are never recorded; commands/output remain unrecorded. No idle/maximum-duration enforcement was added yet.
- Validation: 2 helper tests cover duplicate lifecycle callbacks, stable renamed-host context, elapsed time and failure metadata without raw error data. TypeScript and scoped ESLint passed. Full mocked WebSocket/SSH integration and browser verification remain required; no real SSH session opened.

### Terminal WebSocket/SSH audit integration

- Tested the actual terminal handler with real isolated database/auth tokens and simulated SSH/WebSocket transports. Ready+close yields exactly connect/disconnect records; browser close before shell callback yields one failure and disposes the late shell; SSH errors produce one failure and close both transports. Commands and output are relayed but absent from audit rows.
- Fixed environment scoping: WebSocket audit writes explicitly supply the host environment, avoiding implicit default scope outside HTTP request context. Tests use a non-default environment. Guarded late ready/error callbacks against sending on a closed browser connection.
- Validation: all 5 terminal helper/integration tests passed. No network SSH connection occurred. Browser session controls and expiry configuration remain outstanding.

### Terminal browser session persistence

- Browser-tested actual SshTerminal/xterm with a simulated WebSocket. Found that replacing the host metadata object reconnected SSH. Changed the connection effect from the entire server object to the primitive server ID and SSH user actually used by the effect.
- Verified a metadata refresh increased connection count before the fix but left it unchanged after the fix. Expand/restore also retained the connection; elapsed duration continued and the server-confirmed audit policy displayed correctly. Screenshot: verification/terminal-session.png; fixture: verification/terminal-fixture.html.
- No real SSH connection or command execution. Session expiry, terminal search, theme-change behavior and broader review requirements remain open.

### Terminal theme switching without reconnect

- Removed visual theme from SSH session setup dependencies; theme changes update the existing xterm options instead. A theme reference also provides the latest colors when lazy terminal initialization completes.
- Browser fixture verified dark→light→dark: connection count remained exactly 1, buffer text remained present and elapsed connected time continued. Visually inspected the light terminal. Screenshot: verification/terminal-light.png; updated terminal fixture includes an explicit theme toggle. No real SSH connection occurred.
- Terminal search and expiry configuration remain outstanding.

### Local terminal buffer search

- Added literal, case-sensitive previous/next search with cyclic match selection, scroll-to-match, match counts and no-result status. Scope is explicitly the local xterm buffer (5,000 scrollback lines), with no SSH input sent. Clear resets the search cursor.
- Search joins soft-wrapped rows while preserving hard line boundaries and maps UTF-16 string positions to terminal-cell coordinates, including wide/combining characters. Each search reads the current buffer.
- Validation: 2 tests passed for wrapped/nonwrapped matching and Unicode coordinate mapping; application TypeScript passed. Browser search interaction and session expiry controls remain outstanding.

### Terminal search browser verification

- Actual xterm fixture verified literal query `o` yields seven matches; Next moved 1→2, Previous moved 2→1 and then wrapped 1→7. Selection is visibly highlighted. A missing query displays No matches in the current buffer. Simulated connection count remained 1. Screenshot: verification/terminal-search.png. No remote SSH connection or terminal command input occurred.

- Integration check after terminal/file/Compose changes: complete frontend suite passed 129 tests across 22 files; Vite production build passed (1,971 modules, 6.79 seconds). This does not establish completion of the remaining product requirements.

### Enforced terminal session limits

- New ready sessions receive server-side idle/max timers: defaults 30 minutes without input and 480 minutes total, configured with SHIPYARD_TERMINAL_IDLE_MINUTES and SHIPYARD_TERMINAL_MAX_MINUTES (0 disables, integer range 0–10080; invalid values fall back). Documented in .env.example. No deployment occurred.
- Nonempty terminal input resets only idle time; output/resize cannot prolong it. Expiry records a bounded audit reason, sends a closed reason and disconnects shell/WebSocket. Timers are canceled on connection cleanup and callbacks deduplicate expiry.
- Ready metadata includes effective limits. UI shows them and explains interruption of foreground work; older servers without limits report an unknown policy rather than an invented guarantee. Expiry reason is printed in the terminal.
- Validation: 7 terminal tests passed, including deterministic timer reset/expiry/cleanup and existing simulated transport audit cases; application TypeScript and scoped ESLint passed. Full transport-level expiry and browser policy/closure verification remain outstanding.

### Terminal expiry end-to-end layers

- Real terminal handler with mocked clock and SSH/WebSocket transports: idle expiry ignores ongoing output, resize and empty input; closes both transports and records idle_timeout exactly once. Regular nonempty input keeps idle alive but cannot exceed the eight-hour maximum; duration_limit closes and audits exactly once. All 9 terminal tests passed.
- Browser fixture confirms server-reported 30/480-minute limits, disconnected state, frozen connected duration and visible idle-expiry reason in xterm. Screenshot: verification/terminal-expiry.png. This combines transport integration and UI fixture evidence; no real SSH connection or deployment occurred.

### Audit full-text search

- Added submitted text search across action, actor, IP and stored detail/resource text. Query parameters flow through list, metadata count and export; existing permission/environment filtering still applies. Search is limited to 200 characters at the API and wildcard characters are escaped for literal matching.
- UI query keys include the applied search, pagination resets, active search has a removable chip, and clear-all resets both draft and applied search. Search is submitted deliberately rather than querying on every keystroke.
- Validation: 11 audit query tests passed, including detail/user/IP searches, literal wildcards, combined status filters and environment isolation; scoped ESLint and application TypeScript passed. Full HTTP list/meta/export and browser search verification remain outstanding. Object-specific filtering/diffs and other audit review requirements remain open.

### Audit search HTTP parity and terminal scope

- Isolated HTTP/database tests verify 30 permitted search hits paginate 25+5, metadata reports 30, and CSV exports exactly those rows. Inaccessible hosts, their actor metadata and another environment do not leak; denied capabilities and malformed/oversized queries reject consistently across list/meta/export.
- Fixed terminal audit visibility for scoped operators: recognized lifecycle actions use the stable server_id field, allowing renamed-host history while rejecting hidden IDs even if the saved display name resembles a permitted host.
- Validation: all 14 audit query/HTTP tests passed. No external calls or live audit mutations. Browser search verification and the broader audit feature requirements remain outstanding.

### Audit search browser and action labels

- Browser-tested actual AuditLogPanel with isolated query fixtures: submitted CHG-42 filters two rows to one, displays the active chip and correct count, and Reset filters clears search text and restores both rows. Screenshot: verification/audit-search.png; fixture: verification/audit-fixture.html.
- Corrected singular entry count. Added shared readable audit action labels for host/user/role/terminal/file events and a readable separator fallback; raw event codes remain available as tooltips. Applied labels to desktop/mobile rows and action options.
- This verifies UI state with mocked data, complementing the earlier HTTP search tests. Broader audit diff/object-filter requirements remain open.

### Audit export completeness and retention disclosure

- Removed silent 10,000-row export truncation. The API rejects larger matching sets with exact matching/limit metadata and a narrow-filters message. UI disables known oversized exports, explains the limit, shows pending state and retains API errors (including races where matches grow after metadata fetch).
- Export requests explicitly include current environment; export audit writes also explicitly retain that environment. Added policy help explaining applied-filter/access scope and actual startup-only cleanup of entries older than 90 days. No retention deletions or live exports performed.
- Validation: 4 audit HTTP tests passed, including an isolated 10,001-row rejection alongside normal export parity; application TypeScript and scoped ESLint passed. Browser policy/error interaction remains to be verified.

### Audit export browser states

- Actual AuditLogPanel with simulated responses: an API-side increase to 10,001 matches displays the persistent error; a known 10,001 count disables Export and shows filter guidance.
- Found and fixed stale export errors after filter changes. Export mutation now captures the submitted filter/environment snapshot; error rendering is scoped to that snapshot, including responses arriving after filter changes. Browser verified the original error appears, then disappears after applying CHG-42 while the new single result/export button is available.
- Fixture: verification/audit-export-fixture.html. No real export/download or audit mutation.

### Host creation environment and structured lists

- Moved the environment selector out of Advanced into the basic host form so the destination is visible before creation. Existing environment error/retry states remain available.
- Replaced comma-only tags and services fields with individually editable, removable entries. Parent draft receives every edit immediately; save trims, splits pasted comma lists, removes empty entries and deduplicates while retaining order. Fixed the create-form reset to initialize the new service array correctly.
- Validation: normalization test passed; scoped ESLint passed. Application TypeScript passed after fixing the reset. Full host-dialog browser verification remains outstanding. These changes are local and have not been deployed.

### Host connection-test input integrity

- IP, SSH user, port and password edits invalidate pending and completed connection tests. A generation guard ignores both late success and error responses; reset, close and unmount also invalidate requests. Stale requests no longer show success or error toasts for another draft.
- Removed silent SSH-port clamping/defaulting from save and test. The form requires an integer from 1 through 65535, explains invalid ports and disables connection testing until valid.
- Validation: application TypeScript and scoped ESLint passed. Added an isolated delayed-success fixture at verification/host-form-fixture.html. CUA refused the local fixture URL with ERR_BLOCKED_BY_CLIENT, so race/close/reopen browser verification is still outstanding. No live SSH connections or host mutations were performed.

### Host form browser verification

- The initial local URL rejection was traced to Vite filesystem serving scope. Serving a temporary copy inside frontend-next resolved it; the temporary file was removed after verification.
- Actual CreateServerDialog with mocked, eight-second connection responses: changed IP during testing; late success remained hidden. A fresh test without edits displayed Connection successful. Changing SSH port to 0 removed that success, disabled Test and displayed the integer/range error.
- Confirmed environment selection is visible with Advanced collapsed. Expanded metadata, added a tag and typed production into its individually editable field. Close/reopen and late error paths still need browser coverage; no real host was saved or contacted.

### Structured input focus and frontend regression checks

- Tags/services now focus newly added inputs and move focus to an adjacent entry or Add after removal. Enter adds an entry without submitting the parent form; IME composition is excluded. Associated labels target actual controls, help text describes the group and remove controls have visible keyboard focus.
- Browser verified Add tag focuses Tag 1 and removing the final tag focuses Add tag. This revealed and corrected the Add button accessible name being replaced by its associated field label. Enter and IME paths are implemented but not browser-verified.
- All 131 frontend tests across 23 files passed, application TypeScript passed and scoped ESLint passed. No live API mutations.

### Inventory operating state and broken filter repair

- Found that inventory update/attention filters referenced counters absent from GET /servers. List and detail now share a cached operating-state builder with canonical attention, permitted update counters and cache metadata. No SSH work is triggered. Unchecked OS/image inventories return null rather than a false zero. The attention filter now uses canonical requiresAttention, including resource pressure and permitted failures.
- Added desktop operating-state and last-contact columns, and operating state on mobile cards. Counts separate OS, images and custom updates; missing cache is labeled Not checked. Last contact exposes the centralized absolute time/timezone through its tooltip. Adjustable columns and browser layout verification remain outstanding.
- Validation: five backend tests passed, including real isolated HTTP/database assertions for list/detail parity, phased-update exclusion, empty-cache semantics, scoped host access, feature-permission omission and environment filtering. Scoped frontend ESLint passed.

### Inventory reasons, column controls and browser evidence

- Operating state now names resource pressure (including percent), host reachability, reboot, active alerts and recent failures instead of displaying only a generic badge. Update counts remain separate and clearly typed.
- Resource options can hide/show operating state and last-contact columns. Browser preferences persist locally with storage-failure fallback; table column spans follow visible columns. Mobile operating state stays visible.
- Actual ServersPage with isolated API fixtures and a memory router: three hosts initially; Needs attention retains CPU-pressure and update hosts; combined Updates available leaves only the update host. Reset restores all three. Hide/show operating state updates header and row cells correctly. Screenshot: verification/inventory-operating-state.png; fixture: verification/inventory-fixture.html. Desktop visual inspection prompted separating badges and counters into rows.
- Application TypeScript and scoped ESLint passed. Column persistence across reload, narrow-screen layout, complete customizable columns and saved views remain outstanding. No real backend or host actions.

### Saved host views

- Added named browser-local views for search, status, tag/group filters, attention/update filters, grouping, sort and operating columns. View storage keys include user identity and environment; changing either remounts the chooser. Applying clears bulk selection and resets pagination. Host data remains subject to normal API permission checks.
- Explicit save, apply, update-from-current and delete actions; case-insensitive duplicate names reject with guidance, names are limited to 60 characters and each scope to 20 views. Malformed stored entries are ignored and write failures show an error rather than pretending to save.
- Validation: two tests passed covering typed persisted-data rejection, limits and collision-free user/environment keys. Application TypeScript and scoped ESLint passed. Browser tested saving CPU search, changing to Update, restoring CPU; duplicate-name rejection; updating the saved view to Update and restoring it; deletion removed the saved choice. Fixture: verification/inventory-fixture.html. Reload persistence and environment switching still require browser checks. This does not yet provide server-synced/shared views.

### Saved-view scope persistence and update-check timestamps

- Browser evidence with actual ServersPage and controlled profile/environment changes: saved Persistence check in default; staging had no saved view; returning to default restored it; switching to Bob hid it; a new page load under the original account loaded the saved view again. This verifies browser-local persistence and chooser separation, not server-side synchronization.
- Added metadata-preserving OS update cache reads. Inventory/detail now return updates_checked_at only with update permission; absent or malformed cache remains unknown. OS and image counters expose their separate cached check timestamps with the shared timezone formatter; missing timestamps are explicitly described. Custom counts point to individual checks in host details.
- Extended isolated inventory HTTP test passes timestamp presence/absence and permission omission. Application TypeScript passed. Fixture updated at verification/inventory-fixture.html. Full mobile/touch presentation of timestamp details remains open.

### Host draft lifecycle protection

- Fixed background prop refreshes resetting an open host draft: form defaults now initialize only on the transition to open. A canonical initial snapshot tracks all fields, including lists, Docker and password, for dirty-state comparison.
- Cancel, Escape/outside close requests and the close icon use a discard dialog for dirty forms; pending saves cannot close through these paths. Browser unload warns for unsaved changes. Active environment or target-host changes preserve the draft but block save/test until the original context returns or the form is reopened; pending connection-test results are invalidated too.
- Browser fixture rerenders parent props every second: draft survived, Keep editing retained input, Discard changes closed, and reopening initialized a clean form. TypeScript and scoped ESLint passed before the final context-test invalidation addition. Environment-switch and unload browser paths remain unverified. Fixture: verification/host-form-fixture.html. No live host saves or connections.

### Host creation target environment integrity

- Found that selecting a different creation environment contradicted the globally injected request header and was rejected by environment middleware. Added an explicit request-target option used by host creation, new-host connection testing and initial key installation. Header and body now agree without changing navigation/global environment.
- Existing-host environment is read-only with explanatory text: this form does not support a safe move of dependent resources. Changing the creation environment also invalidates prior connection tests. Backend context-mismatch protection remains unchanged.
- Validation: all nine API-client tests passed, including explicit target for all three requests and unchanged default scope afterward. Two isolated inventory HTTP/database tests passed, including creation in staging through real environment middleware and a conflicting header/body request rejected with 409. Scoped ESLint passed. No live creation, SSH connection or key installation.

### SSH port validation at the API boundary

- Shared strict port parser now validates host create/edit/import and pre-save connection testing. Only omitted values default to 22; supplied values must be integer numbers or digit strings in 1..65535. Invalid values return actionable errors before persistence or SSH testing.
- CSV parsing no longer turns malformed ports into 22 or truncates partial numeric strings. Empty CSV cells retain the import default; nonempty invalid values reach API validation unchanged.
- Three isolated HTTP/database tests passed, including invalid values across all four paths, unchanged stored port after rejected edits, valid boundaries and import error reporting. No real host connections.

### Custom update comparison and failed-check integrity

- Fixed failed SSH/GitHub checks being recorded as fresh successes with stale values. Nonzero/empty version-command output, failed release lookups and missing release tags now reject before version/timestamp persistence. Prior successful data stays unchanged. Empty trigger output remains a valid non-match.
- Trigger comparisons preserve leading v and use trimmed, case-sensitive exact text. Inactive latest_command fields no longer execute for GitHub/trigger types. Version comparisons retain existing text inequality semantics, now explained in the form (including older/downgrade strings).
- Associated custom-task labels with field IDs and displayed last successful check including timezone in the task table.
- Six isolated mocked-SSH/fetch tests passed: matching/nonmatching triggers, script/GitHub versions, leading-v trigger and inactive command, failed and empty current-version output preserving the entire previous row. TypeScript passed. Browser form verification, pre-save execution preview, explicit timeouts and persisted failure state remain outstanding. No real commands or GitHub requests executed.

### Persistent custom-check failures

- Schema v11 adds last attempt and sanitized last-error metadata without changing historical successful version data. Failed scheduled/manual checks persist these fields; successful checks clear the error. Command output and exception detail are not stored in the user-facing error.
- Custom update status now prioritizes Check failed over older up-to-date/update badges and shows attempt and last successful check separately. Manual check invalidates its query on both success and failure so persisted errors appear immediately.
- Validation: six custom-check tests passed including failure persistence, retained versions/success timestamp, no output echo and successful recovery. TypeScript passed. Migration tests exposed an early missing-table error; adjusted the additive migration to defer missing-table reporting to central schema validation. Browser failure/recovery layout remains outstanding.

### Custom-check failures in aggregate health

- Canonical host attention now includes permitted failed custom-check counts. Both inventory/detail and dashboard supply this state; host list, overview reasons and dashboard badges label it explicitly. A failed custom check prevents a green update summary even when zero OS updates are known. Dashboard custom-task metadata includes sanitized failure and attempt information.
- Permissions remain enforced before querying/including custom failure counts. Eight backend attention/inventory tests and six frontend summary tests passed. Extended actual HTTP inventory test verifies failure reason count and omission for a restricted role. Application TypeScript passed. Dashboard/browser failure propagation still needs visual verification.

### Custom-check configuration and late-result protection

- API create/edit require a nonblank installed/output command, a desired-version command for script checks and nonblank trigger output. Scheduler rejects incomplete legacy configurations instead of recording a misleading successful comparison. Form explains requirements and result reset.
- Changing type or check-source fields transactionally clears version, update, success and error state. Name/update-command-only edits preserve check history. Success/failure writes use a database condition matching the checked rule snapshot, so an old in-flight check cannot overwrite a newly edited rule.
- Ten isolated custom-update API/scheduler tests passed, including input requirements, unchanged results after rename, reset after rule change and ignored late success/failure. No real SSH commands. Browser validation and pre-save preview remain open.

### Custom-update preview before save

- Extracted non-persisting check execution from scheduled check persistence. Added a rate-limited preview endpoint requiring both edit and run capabilities plus host access. It validates the draft, runs only active check commands/release lookup and returns observed/desired values and comparison result. The update command is omitted from execution input.
- Added Test check before saving to the custom-task dialog. Explanation states that commands run on the host and must be read-only; task/update execution is separate. Results/errors are tied to host/environment/draft snapshots so edits mark results stale.
- Seven scheduler tests and four API tests passed; preview tests verify exact check commands, normalized outputs, unchanged database rows on success/failure and sanitized error response. TypeScript and scoped ESLint passed before adding environment to the UI snapshot. Browser preview and explicit SSH execution timeout remain outstanding. All commands/network calls were mocked.

### Preview browser states and SSH check deadlines

- Browser verified actual preview component: editing during a pending response hides the old result and asks for a new check; fresh success shows observed/desired values; subsequent failure replaces success with an error. Added explicit result-snapshot equality. Fixture: verification/custom-preview-fixture.html.
- Custom SSH checks now request a 30-second per-command deadline; timeout rejects, sends TERM and destroys only that channel, preserving the pooled connection. Late-created channels are also stopped. GitHub lookup retains its 15-second limit; preview explains both. These limits do not guarantee termination of detached remote descendants.
- Four deterministic channel-deadline tests cover stalled/successful/late channels and timeout-vs-close resolution ordering. Seven scheduler tests passed. All SSH execution was mocked. Full dialog layout and real transport integration remain to verify.

### Complete custom-update dialog layout

- Extracted CustomUpdateDialog for direct integration verification. Input/preview area scrolls within 90vh while heading, save/cancel and persistent API error remain outside the scroll area. Commands use multiline editors; required inputs and field lengths are enforced before form submission. Pending saves disable editing and closing. New dialog sessions reset old mutation errors.
- Browser tested the actual dialog with scripted version preview and simulated save failure: observed/desired output rendered, the draft stayed intact and error/actions remained visible. Screenshot: verification/custom-dialog.png; fixture: verification/custom-dialog-fixture.html. Full narrow-screen and dirty-navigation coverage remains outstanding. Scoped ESLint and application TypeScript passed.

### Custom-update draft protection

- Shared draft normalization tracks every editable custom-task field. Dirty task drafts now join the route/unload guard; closing the dialog offers Keep editing/Discard changes. Saved mutation and preview are disabled when host or environment no longer matches the opening context, and save also checks this condition before API calls.
- Browser verified edited name remains after Keep editing and explicit Discard closes the dialog. Unit test covers all fields, defaults and unchanged/reverted values. Scoped ESLint and application TypeScript passed. Full controller environment-switch and route-navigation browser checks remain outstanding.

### Custom-update audit trail

- Added audit events for create/edit/delete and manual check/preview success or failure. Entries record actor/environment, stable host/task IDs, task display name and changed field names. Commands, version output and exception details are excluded. CRUD events join the audit Changes filter; readable action labels are provided.
- Scoped audit authorization uses the stable host ID for these known event types, allowing deleted-task history while protecting unrelated hosts.
- Nine API/audit tests and three display tests passed. HTTP tests verify create/update/delete events, changed-field attribution, command omission and allowed/denied host scope. Existing audit pagination/export tests still pass. No real operations or audit mutations outside isolated test databases.

### Audit resource links and escaped task names

- Terminal and custom-update events now resolve their host links by canonical `server_id`, with the current host label and current environment. Historical task/host names are not interpreted as additional resource references. A deleted task can still link to its host; a deleted host remains plain text.
- Audit detail rendering decodes JSON-escaped quoted values, preserving quotes, backslashes and newlines in task names without splitting embedded `key=value` text into unrelated fields.
- Verification: audit-search route suite 5/5 (stable ID after historical name, all five custom event types, deleted host and environment scope); full frontend suite 138/138 across 25 files; TypeScript no-emit check and Vite production build passed. Tests use isolated SQLite; no live host actions. Browser verification of this incremental audit change remains open.

### OS package differences and update impact

- Available package rows now show installed → available versions, including deferred packages. Apt's reported installed version is retained exactly; the Arch adapter preserves the version already present in `checkupdates`. Older caches and sources without that field explicitly show “Installed version not reported”. No extra remote command is introduced.
- The update tab and existing execution confirmation summarize available/deferred counts and the host's reported reboot state. Unknown remains unknown; a currently absent reboot flag is not a prediction about the upcoming update. The UI states that affected services are not supplied by the catalog, and confirmation explains that execution resolves actual package changes later.
- Verification: system-info update suite 3/3 with mocked SSH, frontend suite 138/138, project-reference-aware TypeScript check (`tsc -b --noEmit`) passed. Browser inspection of the real display components at 900px and 340px widths: `verification/package-impact.png`; reproducible isolated fixture: `verification/package-impact-fixture.html`. No live updates executed.
- Remaining scope: service-impact detection and distro-complete installed-version collection are not implemented by this increment; full update-page and confirmation-flow browser QA remains required. This component screenshot is not a live application screenshot.

### OS catalog: collection failures and fully deferred updates

- Apt list and upgrade simulation now capture command status before formatting, so pipeline success cannot hide package-manager failures. The remote check fixes `LC_ALL=C` to make parsed package output deterministic.
- The parser distinguishes an explicitly empty successful apt plan from a source with no simulation. All listed packages can therefore correctly be held back; the update tab shows a neutral explanation instead of its green empty-list state.
- Verification: 6/6 targeted backend tests (collection plus catalog metadata), including executing the generated shell script with fake package-manager executables under an isolated PATH. Covers list failure, simulation failure, metadata refresh failure, empty list, empty simulation, and a populated simulation. Project-aware TypeScript check passed. No real package manager or remote host operation ran.
- Follow-up found during inspection: collection currently simulates `apt-get -s upgrade`, whereas `server/playbooks/update.yml` requests `upgrade: full` plus autoremove. The preview/execution mismatch and additional/removal impact need resolution before the overall impact-preview requirement can be considered complete. Other distro adapters still require equivalent failure-status checks.

### Full-upgrade preview with package additions/removals

- Debian/Ubuntu execution now explicitly sets `force_apt_get: yes` alongside the existing full upgrade/autoremove policy. The collector simulates `apt-get dist-upgrade --auto-remove` with the same dpkg configuration options. This resolves the previous `upgrade` versus `full` mismatch and removes resolver ambiguity when aptitude is installed. Verified against Ansible's official apt module documentation and implementation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/apt_module.html and https://github.com/ansible/ansible/blob/devel/lib/ansible/modules/apt.py . No update playbook was executed.
- Added fresh scoped/rate-limited GET `/servers/:id/updates/preview`: structured package upgrades, new installations and removals with versions and timestamp. No catalog/history writes. Unsupported distro plans return null, not a misleading empty supported plan. Malformed recognized install records fail instead of silently dropping changes.
- Update tab has a dedicated preview button, counts and a scrollable version table with explicit removal labels; host/environment changes and failed retries cannot present an old response as current. Explains metadata refresh, no package mutation and point-in-time nature.
- Verification: 8/8 targeted backend tests covering shell collection, parsing, API permissions, missing hosts and unchanged cache/history; project TypeScript check passed. Actual preview component checked in isolated browser fixture with mocked API, then failed retry verified to hide the old plan. Screenshot `verification/os-preview.png`, fixture `verification/os-preview-fixture.html`.
- Remaining: preview-context switch/slow-response browser cases, full host-page integration/mobile QA, deployed/customized copies of update.yml, service impacts and non-apt plan adapters. The change is local and has not been deployed or exercised against live package managers.

### Update preview context isolation and deadline

- Host/environment changes now remount the preview session. An in-flight request from the previous context cannot populate the new view, block its preview button, or reappear when returning to the old context. API requests explicitly carry the captured environment.
- Preview SSH command uses the existing channel deadline helper at 90 seconds. The client request retains its 120-second budget; the command deadline starts after SSH connection acquisition and is not an end-to-end connection timeout. Channel cleanup is best effort, not a guarantee for independently detached remote descendants.
- Verification: 10/10 backend collector/deadline tests, 10/10 API client tests and `tsc -b --noEmit` passed. Isolated browser fixture `verification/os-context-fixture.html` ran actual component with deferred responses: start A, switch B, start B, finish A (no plan shown), finish B (only B shown), return A (no old plan); repeat with default→stage→default (no old plan). Pending old request does not disable new-context preview. No live SSH or package changes.

### Package-owned service hints in the OS update preview

- Apt preview now reads installed file ownership for each changed package, within the existing 90-second command deadline. It reports direct systemd system service definitions and SysV init scripts; duplicates are removed, user units/docs excluded. This extra query only runs for explicit previews.
- The UI maps potential service impact to each package, distinguishing no directly owned definitions from unavailable file metadata. It explicitly avoids promising restart/active-state detection or complete impact coverage through shared libraries, maintainer scripts and new package contents. File-list limits checked against Debian's dpkg-query manual: https://manpages.debian.org/trixie/dpkg/dpkg-query.1.en.html .
- Verification: 11/11 backend tests across ownership, generated shell collector and API/cache tests; TypeScript project check passed. Tests execute only fake package-manager commands in isolated PATH, including malformed package-token exclusion, new-package query failure, duplicate/system/user unit filtering and full generated preview parsing. Actual frontend component rendered with all three ownership states; screenshot `verification/service-impact.png`, fixture `verification/service-impact-fixture.html`. No live package query or mutation.
- This improves the requested service-impact summary but does not establish active processes, indirect library dependencies, future package scripts or non-apt distro impact. Full host-page/mobile verification and remaining review scope stay open.

### Host bulk selection scope and deletion target snapshot

- Page-level select/deselect now adds/removes only that page's IDs, preserving selected hosts on other pages and outside current filters. Checkbox labels name their page/filter scope. Bulk bar expands to all selected host names/IPs with on-page, other-page and excluded-by-filter counts; missing targets are called out.
- Bulk deletion captures host IDs/names/IPs and environment when opened, shows that list in the existing confirmation, refuses a changed environment and sends explicit environment headers. Successful deletions are removed from selection while failed IDs remain selectable for retry. Selection, bulk folder and playbook/deletion dialogs reset on environment change.
- Verification: 12/12 targeted selection/API tests and TypeScript project check passed. Actual ServersPage fixture with mocked inventory: select CPU + Update, search CPU, verify one outside filter and both confirmation targets; cancel, deselect page, verify hidden Update remains selected. Environment-toggle fixture cleared selection, but it only supplies Default in getEnvironments so it is not proof of a sustained second-environment UI. No delete request executed. Screenshot `verification/bulk-selection.png`; fixture `verification/bulk-selection-fixture.html`.
- Remaining: frozen target summaries for update/move actions, partial-delete retry UI verification, sustained environment switch and full pagination/grouped/mobile QA. Bulk actions as a whole are not yet marked complete.

### Fixed target summaries for bulk updates and folder moves

- Update and move buttons now open target snapshots with host names/IPs, captured environment and (for moves) captured destination. Execution uses the captured IDs; environment changes close the dialog and runtime guards refuse mismatches. Move completion reports the submitted count and clears only that request's selected IDs.
- Fixed a capability mismatch: selected updates previously used the general Ansible/playbook API despite being offered under canRunUpdates. They now use the update route with explicit server_ids. It validates 1–500 IDs and rejects unavailable/unauthorized mixed sets atomically before starting work. Omitted server_ids retains the existing all-permitted-host behavior using explicit resolved names. Audit rows now retain the environment.
- Verification: 3/3 new isolated selected-update route tests, with runner mocked and no post-update remote refresh; covers update-only role, malformed IDs, partially forbidden/other-environment targets, explicit all-host resolution, execution environment and audit environment. Frontend suite 141/141 and project TypeScript check passed. Actual ServersPage fixture shows both selected targets in update confirmation after filtering one out; screenshot `verification/bulk-update-targets.png`; browser confirmation cancelled without any action request.
- Remaining: move-dialog browser execution and partial failures, approved target preview vs host metadata changes during execution, large target pagination/mobile QA, and remaining original review requirements. No real updates, moves or deletions were performed.

### Bulk deletion partial-result handling

- Added an in-page result panel with completion time, success/failure totals, failed host names/IPs and per-host errors. It remains until dismissed, another batch starts or environment changes. Selecting available failed hosts only adjusts selection; deletion still requires the reviewed confirmation.
- Requests now use four workers rather than one unbounded Promise.allSettled per selected host, preserving reviewed target order and one outcome per target. Successfully deleted IDs leave the selection; failed ones remain.
- Verification: TypeScript project check and three targeted selection/batch tests passed. Actual ServersPage browser fixture overrides the delete API and blocks unexpected fetches: one successful deletion removed its in-memory inventory row, one failure stayed selected and appeared with its reason. Deselect + Select available failed hosts selected only the failed target. Screenshot `verification/bulk-delete-partial.png`, fixture `verification/bulk-failure-fixture.html`. No live delete or other external mutation.
- Remaining: move action browser verification, cross-environment in-flight batch completion, all-failure/all-success and large/mobile result states. Overall review still open.

### Bulk move permissions, stable errors and audit scope

- Bulk folder controls now require canEditServers, matching the backend. Confirmation rechecks that capability. Missing selected folders disable submission instead of appearing as “No folder”; destination remains captured for review. Failed moves keep an in-page dismissible error until the next attempt/environment change.
- Bulk move audit records now include target names and their environment so authorized scoped audit readers can see their own moves. The endpoint already validates all hosts/folder permissions and environment before its transaction; new tests establish that rejected mixed requests leave every assignment unchanged.
- Verification: 3/3 isolated bulk-move route tests (mixed/unknown/forbidden targets, forbidden/missing/other-environment destinations, successful exact-set move, root removal, scoped audit visibility and stage audit); 33/33 API/UI contract tests; project TypeScript check and production build passed. All database mutations were inside a temporary test database; no live host move.
- Browser execution of the move form, large/mobile states and remaining review requirements remain open. Production build is validation, not deployment.

### Browser verification: bulk move retry, permissions and inventory header

- Actual ServersPage flow verified with mocked move API: select CPU + Update, choose Target folder using the real select, confirm both names/IPs; simulated failure leaves the destination/selection and persistent error; retry confirmation succeeds, only those two inventory rows show Target folder, the third stays ungrouped, and selection/error clear. Screenshot `verification/bulk-move-error.png`; reproducible fixture `verification/bulk-move-fixture.html`. All mutations were in-memory fixture data.
- Browser role switch to a read-only profile removes move/update/delete controls while a selection exists. This verifies the UI capability gate, complementing the prior backend authorization tests.
- Addressed original inventory-copy feedback: removed the long Day-2 product explanation from the header. Operational counts remain, and result counts now include non-search filters. Browser offline filter showed zero results without search text. This revealed a raw `common.clear` key in the empty state; added the missing common translation, used Reset filters in this context, and broadened its help text to all active filters.
- Verification: project TypeScript check passed for the header change; 26/26 language/UI contract tests passed after copy fixes. Remaining: responsive/grouped/large-inventory QA, cross-environment in-flight operations and other review features. No live host moves.

### Mobile inventory parity and 375px visual check

- Confirmed there was already a separate mobile filter control; kept a single control and gave it a visible label/filter count. The original desktop control remains hidden on mobile.
- Mobile cards now honor saved operating-state/contact visibility options. Last contact uses the same relative timestamp as desktop, including online hosts, with an absolute timezone tooltip and explicit unknown state. Long IPv6 addresses wrap in a two-column layout at narrow widths. The page-selection label states “This page” or “All matching hosts”.
- Actual ServersPage rendered inside a 375px iframe with mocked inventory, a full IPv6 address and known/unknown contact timestamps. Visible cards/filter fit the frame without horizontal content loss. Screenshot `verification/mobile-inventory-375.png`; fixtures `verification/mobile-inventory-review.html` and `verification/mobile-inventory-content.html` (copy both into frontend-next to reproduce). This is an iframe viewport check, not a real-device/touch test or proof for every mobile workflow.
- Verification: project TypeScript check and all 142 frontend tests across 27 files passed. Remaining: mobile interaction/column toggles, grouped/large inventories, other viewport sizes and original review scope.

### Grouped inventory: valid row groups and explicit subtree selection

- Removed nested tbody elements from recursive folder rendering: each folder is now a sibling row group inside a keyed Fragment. Expansion is a named native button with aria-expanded, retaining the existing row click behavior.
- Folder checkbox explicitly selects matching hosts in the folder and subfolders. It preserves unrelated selections, reports mixed selection, disables empty subtrees and shows selected counts even when collapsed. Fixed shared checkbox auto-margins for this inline group header.
- Verification: 26/26 selection/UI contract tests and project TypeScript check passed. Actual grouped ServersPage fixture: select an ungrouped host, add parent subtree, collapse/expand, deselect child subtree, verify parent mixed state and unchanged ungrouped selection. Pressing Enter on the parent expansion button collapsed it while retaining selection. Browser accessibility tree shows sibling row groups. Screenshot `verification/group-selection.png`; fixture `verification/group-selection-fixture.html`.
- Remaining: larger/deeper folders, mobile grouping and other original review requirements. No host mutations executed.

### Folder administration capability/scope alignment

- Folder creation now follows canEditServers rather than canAddServers. Root creation is offered only with complete inventory scope; assigned folders support subfolder creation. Visible ancestor folders no longer imply administrative menus.
- Move destinations and parent options are restricted to administered folders. Parent cycle exclusion still uses the complete tree, retaining an existing parent for metadata-only edits. Root remains available for existing folder moves as allowed by the backend. Empty-name/missing-required-parent submission is disabled.
- Verification: 25/25 scope/UI contract tests and project TypeScript check passed. Actual grouped ServersPage fixture used an edit-enabled, add-host-disabled role assigned only to Child folder: Parent folder had no menu; Child folder offered Create subfolder/Edit folder; the create dialog's only parent option was Child folder, with no root option. Fixture `verification/folder-scope-fixture.html`; no save performed. The fixture deliberately supplies a broad inventory and is not evidence of backend host visibility filtering.
- Remaining: group-dialog pending/error/draft handling and creation-followup scope need investigation: backend folder administration is explicitly assigned, so a newly created subfolder is not automatically covered by the existing parent assignment. Original review scope remains open.

### Folder dialog: preserve failed drafts and block duplicate submissions

- Dialog awaits mutation success before closing. Failed saves retain name, color and parent with an inline alert. Pending saves disable fields, Cancel and Submit; a synchronous ref guards duplicate calls and dismissal. Draft initialization occurs only on opening, so background query refreshes do not overwrite edits.
- Capture the opening environment and pass it explicitly through create/update/parent API requests. Context changes block submission; opening environment is React state to ensure the warning updates when reopening.
- Verification: project TypeScript check and all 145 frontend tests across 28 files passed. Actual ServersPage with mocked create API showed disabled pending controls, retained draft after failure and dialog closure after successful retry. Screenshot `verification/folder-save-error.png`; reproducible fixture `verification/folder-save-fixture.html`. No live folder mutation performed.
- Remaining: metadata and parent edits still use two requests and can partially succeed; newly created folder scope, navigation-away draft protection and broader review requirements remain open.

### Atomic folder metadata and hierarchy edits

- Folder edit submits name/color/parent in one environment-bound request. Backend validates destination permissions, environment, self-parenting and descendant cycles before a database transaction writes either part. Metadata-only callers retain their parent; explicit null moves to root. Keeping the current ancestor is permitted for an editor assigned only to the child. The existing parent-only route reuses move validation.
- Verification: 7 isolated backend tests passed (4 folder edit, 3 bulk move). Invalid target, denied destination, cross-environment parent and descendant/self cycles preserve the complete original row. A SQLite trigger injected failure during the parent write and proved metadata rollback. Valid moves/root placement and metadata-only compatibility passed. Project TypeScript check and 34 API/UI contract tests passed; API coverage verifies one request with explicit null parent and captured environment.
- No live changes executed. Newly created folder scope, navigation-away draft protection and the remaining original review requirements are still open.

### Dashboard urgency order and critical-host consistency

- Dashboard now orders canonical critical hosts before warning hosts, with natural name/ID tie breaks. A critical host can no longer be hidden behind six alphabetically earlier update warnings. The ordering is explained above the table. Host names are native links with visible keyboard focus.
- Browser fixture exposed a separate discrepancy: the status bar counted only alert records and showed zero beside a critical RAM host. It now counts hosts with canonical critical state and is explicitly labeled Critical hosts. Permission-filtered backend state remains authoritative. Unknown data is not converted into a healthy status by the priority helper.
- Mobile already used the shared reason component through an alias; removed that unnecessary alias, without claiming a new mobile reason feature.
- Verification: 3 priority regression cases, full 149 frontend tests across 29 files and project TypeScript passed. Real DashboardPage with eight warnings and a critical RAM host shows Critical hosts=1 and the critical host first in the six-row queue. Screenshot `verification/dashboard-priority.png`; fixture `verification/dashboard-priority-fixture.html`. No live changes.
- Remaining: critical counter currently opens the broader attention inventory; exact severity drill-down, failed-operation count scope/fallback, data age/next actions, responsive verification and wider review scope remain open.

### Critical-host drill-down and saved severity filters

- Dashboard Critical hosts now links to `/servers?severity=critical`. Router accepts critical/warning; inventory filters the canonical attention severity. The filter has a visible selector, removable chip, count and reset handling. Saved views retain severity while older saved views remain valid; corrupt severity values are rejected.
- An explicit severity route entry clears stale local search/tag/status/folder/update filters so the destination does not silently hide hosts counted by the dashboard. Users can narrow further after arrival.
- Verification: project TypeScript and 26 saved-view/UI contract tests passed. Actual ServersPage fixture starts with stale search/tag/offline/missing-folder preferences: critical scope shows exactly CPU host; selecting warning shows Update host and excludes CPU host; Reset filters restores all three. Screenshot `verification/severity-filter.png`, fixture `verification/severity-filter-fixture.html`. No live mutations.
- Remaining: full cross-page integration with real data, other dashboard drill-down persistence semantics, failed-operation scope/fallback, and original review requirements.

### Dashboard failure count uses the Operations source exclusively

- Removed fallback to dashboard.summary.failedOperations: that aggregate counts a limited host-only history with different acknowledgement semantics. Missing/failed Operations data now renders unknown and an actionable error even when an old successful count or host summary is cached. The card is hidden without Operations access.
- Label now states Unacknowledged failures with All retained history, matching the scoped Operations endpoint rather than implying a recent time window. Requests capture the environment, poll every 30 seconds and participate in manual refresh.
- Verification: actual DashboardPage fixture supplies Operations count 2 and contradictory legacy summary 999. Success shows 2; refetch failure shows a dash and error (neither cached 2 nor 999); recovery restores 2 and removes the error. Screenshot `verification/dashboard-counts-error.png`; fixture `verification/dashboard-counts-fixture.html`. TypeScript and 23 UI contract tests passed. Manual refresh wiring inspected; no live host refresh or notification sent.
- Remaining: running-task counter source consistency, full permission/retention integration and the broader review scope.

### Complete active-operation counter

- Active operations uses counts.active from the same scoped Operations response as unacknowledged failures, replacing the truncated recent-host-history count. Running and queued states are explicitly labeled; the card is hidden without Operations permission. Missing/error counts show unknown. Positive counts prevent a healthy summary, as do unavailable counts when access is enabled.
- Verification: 11 isolated Operations route tests passed. New regression creates 12 visible running/queued host executions plus a hidden host; failed-scope/page-size-1 dashboard request still returns active=12, matching active-list total while returning zero failed rows. This proves counts precede scope/pagination and respect host access. Actual dashboard fixture with empty recentHistory shows 12 active operations; refetch failure produces unknown for both counters and the shared error. Screenshot `verification/dashboard-active.png`; fixture `verification/dashboard-active-fixture.html`. Project TypeScript and 23 UI contract tests passed; the contract's expected error title was updated to cover both counters.
- Remaining: broader source-specific integration, healthy-summary visual scenarios, other review requirements and deployment verification. No live operations executed.

### Stable execution pages from dashboard and Operations

- Added `/operations/executions/$id` under the Operations permission gate. It resolves an exact execution through the existing scoped details endpoint independently of list pagination/filters, displays source/target/initiator, local zoned start/end, duration, result summary and bounded log output, and polls running/queued executions. Failed requests show retry feedback without rendering stale execution content.
- Desktop/mobile dashboard task labels link to the exact host history ID. Operations detail cards also offer Open execution page. Missing IDs remain plain labels. Unknown statuses use neutral styling. Requests capture the selected environment and cache by environment/execution.
- Verification: actual DashboardPage → click System update → actual OperationExecutionPage for host-42 shows the matching target, error, 90-second duration and output. Screenshot `verification/execution-details.png`; fixture `verification/execution-link-fixture.html`. TypeScript, 23 UI contract tests and 11 isolated Operations route tests passed, including exact logs, other-host/environment rejection and output truncation. No live operation executed.
- Remaining: broader source-specific/browser coverage, mobile viewport, retained names after resource deletion, environment-preserving shared URLs and the full original review scope.

### Environment-bound execution URLs

- Dashboard and Operations execution links now include the environment query parameter. The execution route validates the parameter and the detail request/cache use that environment instead of a later global selection. Legacy links without the parameter retain selected-environment behavior.
- Execution context is visible by environment name. When it differs from the console, the page explains the difference and offers an explicit switch only for a discoverable environment; it does not silently change the console. Back-link wording makes current-context navigation clear. Environment access remains enforced by backend middleware.
- Verification: actual execution page fixture opens a Staging link while Default is selected. Mock transport rejects any wrong environment header; the Staging execution loads with the mismatch notice. Explicit switch removes that notice and preserves the execution. Screenshot `verification/execution-environment.png`; fixture `verification/execution-environment-fixture.html`. TypeScript, all 150 frontend tests (29 files), and 16 isolated environment/Operations tests passed. No live changes.
- Remaining: invalid/deleted-environment browser states, wider source/mobile coverage, retained resource names after deletion and other original review requirements.

### Preserve host execution evidence after deletion

- Schema version 12 removes the host-delete cascade from update_history and adds server_name_snapshot. The transactional legacy-table migration backfills names from existing hosts, preserves output/timestamps/environment and restores indexes. New execution creation captures the current name and still refuses nonexistent hosts. Historical name remains stable after rename.
- Operations lists/details retain deleted-host executions only for complete host scope plus the existing feature/log permissions. Restricted host assignments do not become archive access. Deleted-host rows have no live host link and are labeled in list/detail views. Dashboard history also prefers recorded names.
- Verification: 28 isolated migration/Operations/environment/selected-update tests passed. Migration test starts from the legacy cascade schema, runs twice, deletes the host and verifies retained name/output and foreign-key integrity. API regression renames and deletes a host, verifies original name/log for admin and 404 for a formerly assigned restricted viewer; strengthened 12-test Operations suite passed separately. Project TypeScript passed. All deletion/migration tests use temporary/in-memory databases; production schema untouched.
- Previously cascaded history cannot be recovered; legacy backfill records the name available at migration, not an unknowable execution-time name. Remaining: deleted deployments/workflows, browser archive presentation, retention controls and broader review requirements.

### Dashboard history scope and log minimization

- Removed name-as-ID permission fallback from dashboard history. Complete host scope can view retained records; restricted history is selected by actual permitted IDs in SQL before the 500-row limit. This prevents both ID/name collisions and unrelated history crowding out the permitted host's records.
- Dashboard history selects metadata explicitly and never returns execution output. Host-history/update visibility is required; audit or schedule access alone does not grant host history. Detailed logs remain behind the existing host-history endpoint checks.
- Verification: 17 isolated scope/Operations/inventory tests passed, followed by 6 dashboard tests including the added audit-only role case. Regression covers an authorized host deliberately named after a deleted host's ID, omission of private output for restricted/admin summaries, retained-name visibility for full scope, and one old permitted execution surviving 501 newer hidden executions. Updated an older exact custom-task response assertion for already-supported last_attempted_at/last_check_error fields; command-exclusion assertions remain intact. No live data changed.
- Remaining: legacy aggregate failed count is still capped but is no longer consumed by the dashboard UI; retained deployment/workflow metadata, browser archive presentation and wider review scope remain open.

### Historical workflow context and dry-run visibility

- Confirmed schedule_history already snapshots schedule name, playbook and target expression and survives schedule deletion. Operations now exposes recorded playbook/check_mode plus whether a formerly linked schedule has been deleted. Both embedded and standalone execution details show Dry run/Execution and the deleted-schedule notice; ad-hoc executions are not incorrectly labeled deleted.
- Verification: 13 isolated Operations tests and TypeScript passed. New end-to-end API test records a dry run, edits schedule name/playbook/targets, deletes the schedule and confirms original metadata, actor, output and dry-run flag; a manual run has no deleted-schedule flag. Actual execution-page fixture renders the original name, Dry run, update.yml and Schedule deleted with output. Screenshot `verification/workflow-history.png`; fixture `verification/workflow-history-fixture.html`. No real schedule or host changed.
- Remaining: immutable resolved host identity for workflow permission checks, retained deployment metadata, broader review scope. Historical target strings are still evaluated against current inventory for restricted-role access; this is not claimed as resolved by the metadata display work.

### Immutable workflow host identity for historical access

- Schema 13 adds target_server_ids. New workflow history captures unique resolved inventory IDs in the execution environment, preserving original target text for display. Ambiguous/missing/localhost targets are not guessed. Legacy rows remain null because today's matching name cannot prove an earlier identity.
- Shared history-scope check is used by Operations, schedule-history list/detail and cancellation authorization. Restricted roles require access to every recorded current host ID and the playbook; complete host scope can still inspect legacy/deleted-target history. Host-local activity matches recorded IDs within its environment, so rename retains association and name reuse cannot inherit it.
- Verification: initial 26 isolated scope/migration/Operations/selected-update tests passed; expanded Operations suite 14 passed, migration suite 9 passed, and 2 targeted existing security regressions passed. API regression verifies rename access, retained original IDs, replacement-host denial across Operations/details/history list and local host history. Legacy migration runs twice and preserves output without inferring IDs from a replacement hostname. No live execution, cancellation or database migration performed.
- Compatibility: restricted roles cannot view legacy history lacking reliable IDs; complete-scope roles retain it. Remaining: UI explanation for legacy identity coverage, snapshotting deployment identity, cancellation-specific integration, pruning/filter-before-limit behavior and original review scope.

### Workflow retention and permission-before-limit

- Workflow list applies access filtering before the requested result limit; host-local workflow history applies recorded host-ID association before its 200-row limit. Both scan metadata only within the selected environment, so newer unrelated runs cannot hide an older permitted execution.
- Cleanup now ranks terminal runs independently by environment and keeps the latest 200 by completion/start time. Running, queued and unrecognized states are excluded from deletion; ties are deterministic. UI states the automatic-cleanup policy. Cleanup remains invoked after scheduled execution, as before; this is not a new timed retention service.
- Verification: 16 isolated Operations/retention tests and project TypeScript passed. API regression places 201 hidden runs ahead of a permitted run and verifies both limit=1 workflow results and host-local history retain it. Retention fixture covers 205 terminal runs in each of two environments plus 250 active runs and an unknown state: exactly 10 terminal rows removed, 200 retained per environment, all active/unknown rows preserved, second cleanup deletes zero. No real history pruned.
- Remaining: user-configurable retention, pagination beyond current presentation limits, high-volume query optimization and broader review scope.

### Playbook history uses the shared execution page

- Replaced the history-specific output modal and polling state with environment-bound native links to the common execution page. Late modal requests can no longer resurrect or overwrite a newer selection. The common page provides keyed request state, errors, time/duration and logs.
- History labels queued/unknown/cancelled distinctly rather than classifying every non-running/non-success state as Failed. Queued entries participate in refresh polling. Schedule filter has an accessible name and resets on environment change. Cancel request receives the environment captured by the clicked row; completion invalidates that environment's history cache.
- Verification: TypeScript and 35 API/UI contract tests passed, including explicit environment header on cancellation. Actual HistoryTab fixture displays Queued and Unknown and the workflow-42/default link opens the actual execution page with corresponding workflow name and output. Screenshot `verification/history-execution-links.png`; fixture `verification/history-execution-link-fixture.html`. No live cancellation or execution performed.
- Remaining: cancellation confirmation workflow, live-run end-to-end and mobile coverage, legacy identity explanation and broader review scope.

### Reviewed playbook cancellation

- Shared CancelRunDialog replaces immediate cancellation in quick-run and history actions. A read-only, canRunPlaybooks-protected preview resolves the exact run and recorded target scope without exposing output or requiring log-view rights. Confirmation shows run name/playbook/targets/start/environment and explains no rollback and possible continuing remote work.
- Captured target/environment, context-change blocking, fresh-preview gating, synchronous duplicate guard, pending dismissal protection and inline errors keep the confirmation stable. Completion reports Cancellation requested and invalidates target-environment histories/Operations; it does not claim the remote work has stopped.
- Verification: TypeScript, 35 frontend API/UI contract tests and 16 isolated Operations tests passed. Preview regression verifies allowed run-only role, denied target/role, no private output and no status mutation. Actual HistoryTab browser fixture opens review, retains target/error after simulated failure, disables controls on retry and closes after simulated acceptance. Screenshot `verification/cancel-run-error.png`; fixture `verification/cancel-run-fixture.html`. No real cancellation performed.
- Remaining: live-run termination semantics, quick-run environment restoration race, full responsive/accessibility coverage and other original review requirements.

### Quick-run environment lifecycle isolation

- QuickRunTab now mounts an independent session per environment: draft/selection/output/run controls cannot carry into another environment. Polling captures the run environment, avoids overlapping requests and ignores responses after unmount. Run WebSocket subscription is disposed on unmount; a late run-start response preserves only its own environment's marker and does not subscribe or populate another session.
- Start and history-read API helpers accept explicit environment context. Queued/pending runs remain tracked; unknown states and transport errors do not erase the marker and now show feedback. Only known terminal states clear it.
- Verification: TypeScript and 36 API/UI contract tests passed. Actual QuickRunTab fixture starts a deferred Default run status, switches to Stage, then delivers an old success/output: Stage stays idle with no old output. Returning to Default restores the marker, displays current queued-run output, retains cancellation availability and excludes stale output. Screenshot `verification/quick-run-context.png`; fixture `verification/quick-run-context-fixture.html`. No run submitted or cancelled.
- Remaining: returning to the original environment before a delayed run-start response completes, per-user marker isolation, run-only roles without history access, broader live/reconnect/mobile verification and original review scope.

### Active-run ownership per account

- Active quick-run marker keys now include immutable profile ID and environment using collision-free JSON encoding. Sessions remount on account changes as well as environment changes. Profile loading/error/missing identity blocks mounting a run session; usernames are not used as ownership identity.
- Legacy environment-only markers are not resumed because their owner cannot be established. They do not affect backend runs; existing runs remain in the authorized history.
- Verification: TypeScript and 24 key/UI contract tests passed. Actual QuickRunTab fixture uses two different account IDs with the same username, a delayed first-account response and a legacy marker. Second account remains idle without cancellation or old output; return to the first account restores its own queued run and current output. Fixture `verification/quick-run-account-fixture.html`. No real login, run or cancellation performed.
- Remaining: delayed run-start response across rapid context return, centralized session/logout cache behavior, run-only status access and wider original review scope.

### Pending playbook starts survive context return

- A per-account/environment in-memory start tracker preserves pending requests across component remounts and prevents a second concurrent submission in the same context. Returning before acceptance shows Starting… with the run button disabled; acceptance supplies the run ID to the current session and resumes status polling. Browser storage failure after acceptance preserves the accepted ID in memory instead of reporting a failed start.
- Verification: three tracker tests passed (subscriber replacement/duplicate guard, failed request/retry, storage failure after acceptance); project TypeScript passed. Actual QuickRunTab fixture switches Default → Stage → Default during a deferred tracker request, displays Starting…, then transitions to Running with Accepted run output and Cancel run after mocked acceptance. The fixture invokes the shared tracker directly, not the actual submission form/API. Screenshot `verification/quick-run-pending.png`; fixture `verification/quick-run-pending-fixture.html`. No live execution performed.
- Remaining: pending starts across full browser reload, server-side idempotency and ambiguous network failures, run-only status permissions, wider live/responsive verification and other original review requirements.

### Playbook status without workflow-log permissions

- Quick-run polling now uses an environment-bound execution-status endpoint requiring run permission plus the recorded playbook/host scope. It returns status/times without output when workflow-history permission is absent. The UI explains the restricted output and displays the execution state through completion; it no longer depends on general history access to stop tracking a completed run.
- Manual-playbook WebSocket events now require the same workflow-history permission as persisted output. Persisted workflow events use recorded host IDs and require access to every target and the playbook, preventing partial-target or reused-name access to combined logs. No user roles are expanded.
- Verification: 27 isolated Operations/WebSocket tests and 13 frontend API tests passed; project TypeScript passed. Tests cover run-only status, denied history/log events, admin output, mixed targets, disallowed playbook, absent run capability, terminal status and host rename/deletion/reuse. Actual QuickRunTab fixture with mocked status API displays running and restricted-output explanation, then success with Run enabled and cancellation removed. Fixture directly seeds the start tracker rather than submitting a playbook. Screenshot `verification/quick-run-status.png`; fixture `verification/quick-run-status-fixture.html`. Existing quick-run fixtures now mock the new status helper. No live execution or deployment.
- Remaining: full end-to-end restricted-role execution/reference-data loading, queued schedule events without persisted run IDs, live reconnect/mobile coverage and the other original review requirements.

### Maintenance calendar/time picker and timezone search

- Maintenance start/end now use native calendar/time controls with keyboard entry, converting the entered wall time in the selected IANA zone into UTC. Inputs handle both native input and change events. Invalid local times retain their draft, show an accessible error and block form submission instead of silently reverting on blur.
- Added city/timezone filtering across the runtime-supported IANA list, including space matching for names such as New York. The selected zone stays available while filtering. The UI explicitly explains that changing zone preserves the instant and updates displayed wall time.
- Verification: 12 date/time utility tests passed, including Zurich summer conversion, Kathmandu fractional offset, invalid dates and Zurich DST gap; TypeScript passed. Actual maintenance-dialog browser fixture rejects 29 March 2026 02:30 Zurich and blocks a changed-name save, then accepts 03:30, changes to New York 28 March 21:30 and saves the same 01:30Z start. Native calendar affordances and form layout visually inspected. Screenshot `verification/maintenance-picker-invalid.png`; reproducible fixture `verification/maintenance-picker-fixture.html` mocks all reads/writes. No real maintenance window changed.
- Remaining for F03: structured team ownership, recurrence, ambiguous autumn DST-time choice, context/draft protection, resource-scope lifecycle and full mobile/accessibility coverage. Timezone inventory follows browser Intl support; no new timezone database is bundled.

### Maintenance draft and environment protection

- Maintenance editor captures its opening environment and initial row. Reference queries and save body/header explicitly use that environment; context changes freeze editing/saving and explain returning or discarding. Background data cannot replace the open draft.
- Changed form values trigger a discard confirmation on close and a navigation/unload guard. Search filters do not mark the maintenance draft edited. Pending saves block dismissal/navigation, disable inputs and use an immediate ref guard against duplicate submission. Failed saves retain editable values and show an alert; successful saves invalidate the original environment and close the editor.
- Verification: project TypeScript passed. Actual dialog fixture verifies close → Keep editing preserves the name, Default → Stage blocks editing/saving, return → simulated failure preserves the draft, retry disables controls and rejects close, successful deferred response closes. Captured requests carry Default in both header and body despite a different stored global environment. Screenshot `verification/maintenance-draft-pending.png`; fixture `verification/maintenance-draft-fixture.html`. Reads/writes mocked; no real maintenance change. Calendar fixture updated with router context required by the navigation guard.
- Remaining: full browser-navigation/unload and account-switch coverage, concurrent-edit version checks, recurrence, structured ownership and wider original review requirements.

### Finite daily/weekly maintenance recurrence

- New-window form supports daily/weekly repetition with 2–52 occurrences, including the first. Server-calculated preview lists each date in the selected zone and same-scope conflicts; overlapping occurrences within the proposed set are flagged too. Saving is gated on successful current preview. UI explicitly states finite independent windows and individual edit/delete behavior.
- Shared server expansion preserves local start time and elapsed duration across DST. Nonexistent or ambiguous later local starts reject the proposal with the occurrence number; it never silently shifts/skips them. Preview is read-only and conflict details require maintenance-view rights. Creation expands afresh and inserts all occurrences in one transaction; existing single-window response compatibility is retained. Audit records the count.
- Verification: six isolated maintenance API tests and TypeScript passed. Coverage includes spring-transition UTC shift with constant Zurich wall time, preview without writes, persisted dates matching preview, existing/planned conflicts, adjacent non-overlap, excessive count, spring gap/autumn duplication rejection and injected second-insert failure rolling back the complete set. Actual new-dialog fixture displays three weekly 09:00 windows across DST, a named conflict, and sends frequency/count plus captured environment on mocked save. Screenshot `verification/maintenance-repeat.png`; fixture `verification/maintenance-repeat-fixture.html`. No real maintenance created.
- Remaining: linked series-wide editing/cancellation, monthly/custom and open-ended recurrence, structured team ownership, expanded permission/race/mobile checks and the other original review requirements. This implementation deliberately creates a finite set of independently managed windows; no background recurring scheduler or automatic system operation is installed.

### Maintenance preview permissions and unavailable targets

- Added full middleware/API verification for maintenance repetition: missing edit permission, hidden hosts, mismatched header/body environments and inaccessible environments are rejected. Preview returns no existing conflict names/IDs without maintenance-view permission; permitted repeated creation still preserves exact host/environment scope.
- Editor identifies selected host IDs absent from a successful current host lookup and blocks save until they are removed or access is restored. Removal is explicit, preserves other selections and marks the draft edited. A visible note explains the existing entire-environment meaning when the final selection is removed.
- Verification: seven isolated maintenance tests and TypeScript passed. Actual dialog fixture shows one unavailable and one retained host with Save disabled; removing only the unavailable ID enables save and captured request contains only retained-host. The fixture deliberately returns a save error to demonstrate selection preservation. Screenshot `verification/maintenance-missing-host.png`; fixture `verification/maintenance-missing-host-fixture.html`. No live data changed.
- Remaining: explicit whole-environment scope selection instead of empty-list semantics, target-refresh/account-change edge cases, structured team ownership, series lifecycle and other original review requirements.

### Explicit maintenance scope selection

- New drafts default to Selected hosts and require at least one selection. Entire environment is an explicit radio choice; removing the final selected/unavailable host no longer expands the draft. Switching modes preserves the selection for switching back, while preview/save send only the chosen scope's IDs. Existing empty-scope windows reopen as Entire environment.
- API validates explicit resource_scope in preview/create/update: selected cannot be empty; environment cannot include IDs; unknown modes are rejected. Existing API clients omitting resource_scope retain legacy behavior, and stored resource_ids remain backward-compatible. UI always sends the explicit field.
- Verification: eight isolated maintenance API tests and TypeScript passed. Tests prove rejected empty selected updates preserve stored IDs and explicit environment creation succeeds. Actual dialog fixture removes an unavailable host and unchecks the remaining host: Selected hosts stays active, error appears, Save stays disabled. Choosing Entire environment permits the mocked request with resource_scope=environment and empty IDs. Screenshot `verification/maintenance-empty-scope.png`; uses `verification/maintenance-missing-host-fixture.html`. No live changes.
- Remaining: migration/deprecation of implicit scope for legacy API clients, series-wide lifecycle, structured ownership and other original review requirements.

### Integrated frontend verification after maintenance scope changes

- Ran the complete frontend Vitest suite against the current worktree: 158 tests in 31 files passed, covering the accumulated review changes rather than only maintenance-specific helpers.
- Project-reference TypeScript check (`tsc -b --noEmit`), full-source ESLint (`eslint src --max-warnings=0`) and production `vite build` passed. Build transformed 1,989 modules and generated the execution-detail route plus all existing page chunks. The environment has no npm executable, so bundled Node and the repository's local tool binaries were invoked directly; no dependencies changed.
- This verifies compilation, lint and covered regressions. It does not establish complete requirements coverage, production behavior, exhaustive accessibility, all roles, or deployment. The goal remains incomplete; the outstanding per-feature requirements above still apply. No deployment or live mutation performed.

### Configurable duplicate notification suppression

- Added an administrator setting from disabled (default) to 60 minutes. Identical accepted notifications in the same known environment and channel/configuration share a bounded in-memory cache; only SHA-256 keys and timing/pending state are retained there. Changed content, outcome, environment, destination/credentials or configured interval uses a separate key. Calls without environment context bypass suppression.
- Concurrent identical arrivals wait for the original result. Only complete acceptance creates the suppression window; rejection, partial delivery and thrown errors remain eligible for later attempts. This does not add automatic retries. Direct channel tests bypass suppression. Delivery history records suppressed events distinctly without message bodies or endpoint secrets, and the UI explains the policy and restart reset.
- Verification: 30 isolated notifier/deduper tests, project TypeScript and changed-file ESLint passed. Coverage includes time expiry, simultaneous duplicates, failure/partial retry eligibility, disabled/unknown-context bypass, environment separation, changed content, direct-test bypass, history status and admin-only setting validation. All transport calls mocked; no external messages sent and no production settings changed.
- Remaining: browser verification of the setting/history, persistent or multi-process dedupe, propagating explicit environment to all background callers, aggregated duplicate counts, severity/team routing, maintenance suppression and other original review requirements. Cache is process-local and bounded to 1,000 identities; a restart or eviction can allow another notification.

### Execution failure notifications and explicit environment context

- Manual playbooks, single-host updates and bulk updates now notify on a failed runner result as well as a thrown exception. Scheduled playbooks now apply the existing playbook-failure notification preference to both paths. Every call captures the execution environment explicitly, enabling environment-separated dedupe without relying on request-local context after asynchronous work.
- Success, cancellation and disabled event preferences produce no failure notification. Single/bulk update persisted status now preserves cancellation. Normal failure messages direct users to history without copying raw runner output into channels; exception messages retain the existing behavior. Monitoring remains disabled by the current resource-alerts compatibility module and was not re-enabled.
- Verification: 34 combined isolated execution-notification/notifier/deduper tests passed. Four execution fixtures each cover failed result, exception, success, cancellation and disabled notifications (20 scenarios); assertions check exact environment, single emission and absence of raw fixture output. Tests use temporary SQLite, mocked runner/system-info/Git/notifier and inert cron tasks, with no SSH, actual scheduling or external messages.
- Remaining: browser verification of dedupe controls/history, persistent/multi-process dedupe, channel routing/maintenance suppression, cancellation status presentation in all live consumers and the remaining original review requirements.

### Notification settings failure states and browser verification

- Initial load failure now shows a retry state instead of blank/default channel forms. Refresh failure with cached settings preserves forms but disables changes until retry succeeds. Preference writes disable competing event toggles and display pending/inline failure feedback.
- Delivery history distinguishes accepted, suppressed, failed and unknown status; unknown values no longer appear accepted. Monitoring's retained preference is disabled and explicitly described as inactive, matching the current no-op resource-alerts implementation.
- Verification: project TypeScript and changed-file ESLint passed. Actual NotificationsTab fixture verifies initial load error → retry; rejected 5-minute save leaves Disabled selected with inline error; deferred retry disables preference controls; simulated acceptance/refetch selects 5 minutes. History displays accepted/suppressed/failed/unknown independently. Screenshot `verification/notification-preferences.png`; fixture `verification/notification-preferences-fixture.html`. API/transport mocked; no real settings or messages changed.
- Remaining: full cached-refresh error/dirty-channel interaction and mobile coverage, durable/multi-process dedupe, routing, maintenance suppression and wider original review scope.

### Opt-in maintenance notification suppression

- Added a disabled-by-default administrator policy to suppress host-related notifications only when every recorded target host is currently covered by active maintenance in its own environment. Coverage can span active windows; window end is exclusive. Unknown, missing, foreign-environment or invalid targets and malformed/unavailable coverage fall through to normal delivery. Entire-environment windows cover current hosts; scope notes are not interpreted.
- Execution callers now pass immutable host IDs recorded before running. Notification dedupe keys also include these IDs so replacement hosts cannot inherit suppression from identically named former hosts. Maintenance suppression is logged separately and does not populate dedupe state, allowing an immediate post-window event. Direct channel tests bypass the policy.
- Verification: 37 isolated notification/execution/policy tests and TypeScript passed. Coverage includes whole/partial/combined scopes, start/end boundaries, foreign/missing/replaced hosts, malformed coverage, channel-test bypass, post-window delivery, explicit target IDs from all four execution paths and admin boolean validation. Actual NotificationsTab fixture shows failed save retaining disabled policy, pending controls, accepted save selecting the switch and Maintenance suppressed history status. Screenshot `verification/notification-maintenance.png`; fixture `verification/notification-maintenance-fixture.html`. All delivery and runner calls mocked; no real notifications/settings/maintenance changed.
- Remaining: policy UX for individual windows, durable/multi-process dedupe, severity/team routing, broad mobile/accessibility coverage and other original review requirements.

### Consistent cancelled/unknown live completion status

- Host-action completion events now carry explicit status, including cancellation, matching persisted results for updates/reboot/container/Compose actions. Custom-command completion also declares its known success/failure status. Bulk completion carries the same status.
- Shared frontend completion normalization gives explicit status precedence over the legacy success boolean. Quick-run, template-run output and host-action controller distinguish cancelled, failed and unknown. Quick-run retains polling/marker on an unknown completion rather than dropping tracking. Action dialog displays neutral cancellation/unknown messages and does not imply completed changes were rolled back.
- Verification: four isolated execution/API tests (20 notification scenarios, extended to assert cancelled completion events), two status-normalization tests and TypeScript passed. Actual ActionRunDialog fixture renders cancellation from status=cancelled/success=false, then unknown with a history-check message; Close remains available. Screenshot `verification/cancelled-action.png`; fixture `verification/cancelled-action-fixture.html`. No live execution/cancellation.
- Remaining: full live-event/reconnect verification for each action, template-run lifecycle isolation, early events before a returned history ID, history-navigation convenience and wider review scope.

### Platform-connection dialog overflow and resource-specific LXC configuration

- Follow-up live review on 10 September produced new evidence of the connection dialog clipping its introduction, primary action and table actions (`artifacts/ui-review-2026-09-10/screenshots/55-platform-connections.png`), plus LXC pages displaying BIOS/QEMU/Cloud-Init defaults (`64-container-configuration.png`). This is progress through new evidence; the live app remains different from the local worktree.
- Both Infrastructure and Managed VMs now use a shared PlatformConnectionsDialog. A minmax(0,1fr) grid track constrains intrinsic table width; the card/header children can shrink, descriptive text wraps, and the primary action stays outside the table scroll area. The table has a named focusable scroll region, keeping its off-screen action menu reachable by keyboard. Wide dialogs have room for all columns.
- LXC configuration now uses container-specific headings, cores without virtual sockets, root filesystem/mount points and explicit architecture, privilege, CPU-time and swap-limit facts. QEMU-only BIOS/agent/boot/Cloud-Init fields are omitted for LXC. The API exposes only these allowlisted container facts; unknown metadata stays null/Not reported, zero swap and unlimited CPU remain distinguishable. QEMU presentation retains its guest-agent reachability caveat.
- Verification: 13 isolated platform API tests passed with mocked Proxmox transport and temporary database, including LXC projection and QEMU credential exclusion. Three rendering tests cover LXC, absent metadata and QEMU; TypeScript and changed-file ESLint passed. Four pre-existing early-action event tests also passed, without claiming full controller lifecycle verification.
- Browser fixture renders the actual shared dialog/card and configuration component, with network calls rejected. At 1414px viewport the wide dialog shows all columns. At a forced 600px dialog width, header, Connect and Close stay visible; Tab reaches the table and action menu, and Enter opens Edit/Remove. No edit/delete/network request was triggered. LXC screenshot verifies Unprivileged, 0 MB swap, 1.5 CPU cores and mount points without VM-only fields. Evidence: `verification/platform-connections-wide.png`, `platform-connections-narrow.png`, `platform-connections-actions.png`, `lxc-configuration.png`, and `platform-review-fixture.html` in the original review artifact directory.
- Remaining: real viewport/mobile and 200% zoom checks, a flatter connection-edit flow, complete route/API integration verification and all remaining original review requirements. No deployment or live infrastructure mutation performed.


### Flat connection editing and preserved drafts

- Infrastructure and Managed VMs hide the connections list while editing or confirming removal, preserving the list-open state so closing the child returns to the list. The connection form captures its environment and connection at opening, no longer resets draft fields on refreshed connection objects, and refuses saving in a changed environment/connection context. Writes and query invalidation target the captured environment.
- Dirty dismissal offers Keep editing / Discard changes inside the same dialog. Failed saves display an inline error with the retained draft. Pending requests lock inputs and dismissal; an immediate submission guard prevents overlapping writes. Added aria-busy and a live saving status explaining the temporary close lock. Successful writes close only a still-mounted editor.
- Verification: TypeScript project check and ESLint for the three affected components/routes passed. Isolated browser fixture uses actual list-dialog and editor components with a representative parent switching between them. Verified draft retention after replacing connection data, dirty cancel/keep/discard, rejected save with preserved inputs, changed-environment lock and restoration, exact environment in request body/header, deferred-save input/close lock, and return to the list after success/discard. Newly opened editor uses refreshed data. All fetch calls are intercepted and unexpected requests rejected; no live platform mutation.
- Evidence in original review verification directory: connection-flow-fixture.html, connection-save-error.png, connection-context-change.png, connection-save-pending.png. Pending screenshot is a scrolled viewport; it is not a full-page or mobile layout proof.
- Remaining: complete route integration (fixture uses a representative parent), delete lifecycle, account-switch and concurrent-editor conflict handling, navigation/unload dialog verification, mobile/zoom accessibility and the broader original review requirements. Goal remains open.


### Platform connection input contract

- Replaced silent name truncation and IPAM interval clamping/parseInt coercion with explicit HTTP 400 validation. Names must contain 1–80 trimmed characters; supplied text fields must be strings, boolean settings must be actual booleans, and intervals must be whole minutes from 5 through 1440. Decimal digit strings remain accepted for interval callers. Responses identify the invalid field without echoing its value. Existing HTTPS/embedded-credential endpoint validation remains in place.
- Updates with a body environment differing from the stored connection now return 409 before writing. Existing capability and header-environment middleware still applies. Omitted update fields retain existing settings; empty edit secrets retain stored encrypted credentials. The frontend enforces the 80-character name and integer interval constraints, and omits a disabled interval so an empty disabled field cannot become zero on save.
- Verification: 15 isolated platform API tests passed with mocked Proxmox requests and temporary SQLite. New tests cover rejected field types/length/ranges, exact unchanged database rows after rejected updates, environment mismatch, rejected create without insertion, default interval, both interval bounds, partial-update preservation and encrypted-token retention/no token in responses. Project TypeScript and component ESLint passed. No live platform operations or deployment performed.
- Remaining: field-local frontend error association, connection test/rights discovery, trusted-CA guidance, delete lifecycle and broader review requirements.


### Field-associated connection errors

- ApiError now retains an optional bounded identifier from structured API error responses, while discarding unrelated response data and ignoring malformed field/message metadata. Existing consumers retain their status/message behavior.
- The connection editor associates API errors with the corresponding control via aria-invalid and aria-describedby, displays a field-local message and focuses the field after rejection. A changed context or discard confirmation prevents focus transfer. Editing resets the stale error; inputs remain preserved. Unknown/global errors remain in the form alert. Endpoint validation and missing create-token errors now identify their fields at the API.
- Verification: 19 frontend API tests and 15 isolated platform API tests passed, including malformed error metadata, HTTPS/embedded-credential rejection with unchanged database state and missing-token field identity. TypeScript and changed-file ESLint passed. Actual-editor browser fixture confirms rejected endpoint focuses the endpoint input, shows local/global messages and preserves the value; correction clears the messages. Fixture transport is intercepted; no live request. Evidence: verification/connection-field-fixture.html and connection-field-error.png.
- Remaining: complete screen-reader/mobile/zoom coverage, browser coverage of every field and all wider review requirements.


### Platform connection removal lifecycle

- Replaced the auto-closing generic confirmation in both Infrastructure and Managed VMs with a dedicated shared removal dialog. It identifies the captured connection, endpoint and environment, explains that Proxmox guests/data are not deleted, and mentions deployment/adopted-host dependency protection. A rejection remains inline and retryable; only success closes via the parent callback.
- DELETE uses the captured environment explicitly. Changed environment/selection prevents a new request. Pending deletion disables buttons and dismissal, blocks navigation and exposes a status message. An immediate ref guard prevents overlapping clicks; successful invalidation targets the original environment and callbacks are suppressed after unmount.
- Verification: TypeScript and changed-file ESLint passed. Actual-component browser fixture verifies conflict remains open, changed environment disables removal, restoring context allows retry, deferred request keeps the dialog open after Close, and success returns to the list. Evidence: verification/connection-removal-fixture.html, connection-removal-error.png and connection-removal-pending.png. All transport intercepted; no live deletion.
- API coverage now includes existing adopted-host protection, permission denial with explicitly false canManageDeploymentPlatforms, successful unused-connection deletion, missing-record response and absence of Proxmox transport during deletion. The existing test role previously inherited platform management through legacy canManageDeployments; the fixture now explicitly excludes it rather than assuming its name implied restrictions.
- Remaining: complete route integration, deployment dependency/concurrency cases, account-switch handling and full navigation/assistive-technology coverage, plus the remaining original review scope.


### Atomic connection removal and audit trail

- Dependency reads and connection deletion now run under BEGIN IMMEDIATE, acquiring SQLite's write lock before checking deployments and adopted hosts. Busy/locked errors return a retryable conflict message. Successful removal writes a named audit event in the same transaction with an explicitly captured environment; audit failure rolls back deletion. Names and IDs are JSON-quoted to preserve spaces/quotes in structured audit details. No endpoint/token/key is recorded. Audit UI labels the event Platform connection removed.
- Verification: 17 isolated platform API tests and four audit-display tests passed, plus project TypeScript and changed-file ESLint. Added real deployment dependency rejection, a competing SQLite connection holding a write lock, retry after lock release, rollback after an injected audit failure (including rollback of its inserted audit row), and success audit content/environment checks. Tests use temporary SQLite and mocked Proxmox transport; no live changes.
- This proves the covered removal transaction and lock-conflict paths. It does not prove every producer of connection references is safe against stale validation before a later insert; schema-level reference integrity and complete concurrent creation/adoption coverage remain open, along with the wider review requirements.


### Atomic adoption after remote discovery

- Host adoption now revalidates the captured connection after asynchronous Proxmox discovery under an immediate SQLite write transaction. Removed connections and changed endpoint/environment/token/TLS configuration reject the stale result with a conflict. Folder availability/environment, existing guest mapping and name/IP collisions are checked under the same lock.
- Host creation, optional folder assignment, Proxmox mapping and explicitly scoped audit write commit together. In particular, adopting the same guest with a different host name/IP no longer creates an orphan host before a uniqueness failure. Audit names are quoted; credentials are never included. Lock contention returns a retryable conflict.
- Verification: 20 isolated platform API tests passed. New cases cover duplicate adoption with different name/IP and unchanged host count; deletion, endpoint change and credential rotation during the mocked inventory response; and an injected post-insert audit failure rolling back hosts, mappings and audit rows. Existing QEMU/LXC successful adoption and permission tests still pass. Temporary SQLite and mocked HTTPS only; no live imports or remote actions.
- Remaining: folder/concurrent-adoption stress cases, other reference producers (workspace/isolated-VM creation), full schema integrity and all wider review requirements.


### Single-host adoption form lifecycle

- Single-guest adoption now captures environment/connection/guest identity when opened and retains drafts through inventory-name refreshes. Queries, adoption and optional SSH-key installation explicitly use the captured environment. Changed guest/environment disables submission. Pending work locks controls/dismissal and has an announced progress message; an immediate guard prevents duplicate submission. Dirty closing/navigation asks before discarding inputs.
- Delayed automatic IP discovery no longer overwrites an edited or deliberately cleared IP. Explicitly requesting another IP read permits its suggestion again. API failure remains visible with preserved inputs. Labels are associated with controls; SSH port uses native integer/range validation. The description distinguishes creating a Shipyard host record from Proxmox resources and explains the optional guest SSH-key modification.
- Verification: project TypeScript and component ESLint passed. Actual component browser fixture verifies typed host/IP survive a delayed discovery response and refreshed guest name, rejected adoption remains open, environment switching blocks submission, pending inputs/close are locked, exact target/environment reach the mocked API and success closes to inventory. Evidence: verification/adoption-flow-fixture.html, adoption-error.png, adoption-pending.png. All requests intercepted, no live adoption/key installation. TypeScript was rerun after the final description/explicit-IP-read adjustment.
- Remaining: browser verification of explicit IP reread, dirty-navigation confirmation, optional-key partial success, full route/account/mobile coverage, bulk-adoption per-target results and the wider original review scope.


### Per-target bulk adoption results

- Replaced the bulk dialog's parallel fire-and-close summary with a captured, deduplicated guest selection and sequential per-target progress. Each VM/CT retains identity, status, error and successful host link. The dialog remains open after completion. Pending/rejected targets can be continued; successful and uncertain targets are never resubmitted by the batch helper.
- Only explicit validation/access/conflict HTTP responses count as rejected. Timeouts, transport failures, server errors and malformed success bodies count as uncertain because a host might have been created. The UI explains the required inventory check. Environment/connection changes block new starts; an in-progress batch finishes its current request and leaves unsubmitted rows pending. Requests use the captured environment, pending work locks closing/navigation, and folder selection/native SSH port constraints remain visible.
- Verification: three batch tests cover mixed outcomes, retry exclusion, stopped submission after context change and uncertain malformed/server failures. TypeScript and changed-file ESLint passed. Actual-component browser fixture confirms one adopted, one rejected and one uncertain guest; Continue submits only the rejected guest, then shows two host links and the remaining uncertain outcome with no further submit button. Evidence: verification/bulk-adoption-fixture.html, bulk-adoption-results.png, bulk-adoption-retry.png. All transport mocked; no live host changes.
- Remaining: full route integration, pending/context-switch browser scenarios, durable result recovery across close/reload, explicit reconciliation of uncertain outcomes, large-selection/mobile/accessibility checks and the wider review requirements.


### Visible adoption / SSH-key partial success

- Successful single-host adoption followed by an unsuccessful/unconfirmed SSH-key installation now stays visible in a result panel. It names the created host, explains the remaining SSH work, links to the created host in the original environment and removes the adoption form/submit action. Closing this completed result does not warn about unsaved inputs.
- The key step now requires explicit success=true; HTTP 200 with success=false or missing success no longer produces a false success toast. The temporary password is cleared from form state after the key attempt. No automatic re-adoption or key retry is performed.
- Verification: TypeScript and component ESLint passed. Actual-component browser fixture returns a created host and then HTTP 200/success=false for key installation, checks the exact environment/host ID, rejects duplicate adoption, and confirms the persistent partial-result panel, correct host URL, absence of adoption/password controls and clean Close to inventory. Evidence: verification/adoption-partial-fixture.html and adoption-partial-result.png. All transport mocked; no real passwords, SSH or host creation.
- Remaining: HTTP-error/timeout and fully successful key-install browser variants, role-aware availability of the admin-only key step, durable result recovery and the wider original review requirements.


### Role-aware optional SSH installation

- Single-host adoption now matches the existing adminOnly SSH-deploy endpoint: only a successfully loaded admin profile exposes the temporary-password input. Operators can continue adoption without key installation, and pending/failed profile reads explain why the optional step is unavailable. Failed reads offer retry.
- Losing verified admin access clears the password and removes the field. The key step rechecks current permission/mounted state after asynchronous adoption, preventing the follow-up SSH request if that access disappeared; an already-created host becomes a visible partial result. Backend authorization remains authoritative and unchanged.
- Verification: TypeScript and component ESLint passed. Actual-component browser fixture starts as operator, switches to admin to enter a fixture password, revokes access, verifies the field disappears, restores admin and verifies the password remains blank, then adopts as operator without the key step. Evidence: verification/adoption-permissions-fixture.html and adoption-operator.png. Query profiles and all API responses are mocked; no real permissions or hosts changed.
- Remaining: profile-error and pending-key permission-change browser variants, complete account-identity isolation, live role integration and wider original review requirements.


### Combined regression verification after adoption/connection changes

- Full frontend suite initially exposed an obsolete source-text assertion expecting a VM-only configuration error title. Replaced that assertion with rendered component coverage for both QEMU and LXC errors, including error detail/retry and absence of misleading empty facts. A separate rendering case verifies an unconfigured platform connection is explained distinctly from an API failure. The first new fixture incorrectly combined unavailable=true with a request error; corrected it to the actual request-failure state after inspecting component precedence.
- Final verification: all 179 frontend tests across 35 files passed. All 37 selected backend tests across opentofu-core-route, opentofu-platform-actions, opentofu-proxmox and opentofu-run-security passed (temporary databases/workspaces and mocked/fake execution). These include integrated routing, capabilities/environment scope, isolated VM state, saved-plan execution boundaries and current adoption/connection regressions.
- Project TypeScript, full frontend ESLint with zero warnings and Vite production build passed. Build output is isolated at /tmp/shipyard-review-build-20260910; production frontend dist was not replaced and nothing was deployed.
- This verifies the covered regression contracts and build, not all original review requirements or the deployed runtime. Live rollout, complete feature/role/responsive acceptance and the documented remaining implementation work remain open.


### Resource-aware snapshot creation

- Extracted snapshot creation into a captured-target dialog with explicit environment requests, retained drafts on rejection, pending submission/dismissal/navigation guards and accepted-task feedback. Proxmox acceptance is not presented as completed snapshot creation. Uncertain transport/server errors disable resubmission and explain checking Proxmox tasks first.
- VM memory inclusion is now selectable (existing API callers keep the prior include-memory default). LXC has no memory checkbox and sends no vmstate to Proxmox. API rejects explicit LXC memory inclusion and malformed memory/description inputs rather than silently truncating description. Reserved snapshot name current is rejected. The UI explains storage support and the difference from an independent backup. Fixed the VM audit invalidation key to include its environment, matching the query.
- Verification: 21 isolated platform API tests passed, including VM disk-only payload, legacy RAM default, LXC exclusion, reserved/malformed names, long description and nonboolean memory without remote submission. TypeScript and changed-file ESLint passed. Actual LXC-dialog fixture verifies no memory control, preserved name after conflict, corrected retry, and accepted task ID with explicit not-yet-confirmed wording. Evidence: verification/snapshot-create-fixture.html and snapshot-request-accepted.png. All requests mocked; no real snapshots.
- Remaining: VM checkbox, uncertain/pending/context-switch browser cases, task-completion tracking and restoration/retention workflows, other snapshot/power dialog lifecycles and all wider review requirements.


### Snapshot task tracking

- Added durable proxmox_guest_tasks records for accepted snapshot task IDs, bound to connection, environment, endpoint, node and guest. The read-only status route only accepts recorded tasks for the requested guest, checks the current platform still matches and projects running/succeeded/failed/unknown plus bounded exit status. Arbitrary task IDs are not forwarded to Proxmox.
- Snapshot creation now polls a running accepted task every three seconds, stops automatic polling on terminal/unknown outcomes, offers retry for failed/unknown status reads and invalidates the original snapshot views on terminal status. Unknown/missing exit status is never treated as success. Closing explicitly leaves the Proxmox task running.
- Verification: 22 isolated platform API tests passed. Status cases cover running, OK completion, explicit failure, missing/unknown status, untracked/wrong-guest IDs, unauthorized access and changed endpoint without forwarding a status request. TypeScript and component ESLint passed. Actual-dialog browser fixture verifies accepted request → status fetch error → manual status retry → running → polled failure with Storage is full. Evidence: verification/snapshot-status-fixture.html and snapshot-task-failed.png. All transport mocked; no live tasks.
- Remaining: persisted-task listing/reopening after closing, retention and orphan lifecycle, full restart/role/browser success coverage, delete/power task tracking, snapshot restoration and the wider review scope.


### Reopenable snapshot request history

- Added a guest-scoped, paginated persisted-task listing (20 per page). It projects only task/action/snapshot/status/timestamps, performs no Proxmox calls and excludes credentials, endpoint metadata and other guests. The snapshot tab now shows these requests below the current snapshots, in a bounded scroll area.
- Each request exposes the last check timestamp, stored outcome, optional error and expandable task ID. Check status reads only that task and refreshes the registry list; a failed read preserves the stored result and explicitly labels it as historical. Creation/terminal status invalidates the matching task-history query.
- Verification: 23 isolated platform API tests passed, including pagination without overlap, wrong-guest exclusion, metadata exclusion, permissions, invalid offset and persistence through a separate reopened SQLite connection. TypeScript and changed-file ESLint passed. Actual history-component fixture verifies failed status read, successful retry with a new last-checked timestamp, and pagination from 1–20 to 21–21 of 21. Evidence: verification/snapshot-history-fixture.html and snapshot-history-checked.png. No live Proxmox calls or mutations.
- Remaining: whole-app restart/route integration, task retention and orphan lifecycle, deletion/power tracking, restore workflow and wider original review requirements.


### Snapshot deletion with tracked result

- Replaced the auto-closing generic delete confirmation with a captured-target snapshot dialog. It names the guest/environment/recovery point, requires an exact snapshot-name confirmation, preserves the confirmation and error after rejection, locks pending controls/dismissal/navigation and does not repeat uncertain requests.
- Accepted deletions are persisted as snapshot_delete tasks and use the same extracted GuestTaskProgress component as creation. Only a Proxmox task result establishes completion; failures/unknown status remain distinct. Snapshot request history labels creation versus deletion. The result stays visible until closed.
- Verification: 24 isolated platform API tests passed, including persisted deletion task identity/action and subsequent OK completion. TypeScript and changed-file ESLint passed. Actual deletion-dialog fixture verifies initially disabled submission, exact-name confirmation, retained input after a guest-lock conflict, retry, and confirmed task success with no remaining deletion action. Evidence: verification/snapshot-delete-fixture.html and snapshot-deletion-result.png. No live snapshots deleted.
- Remaining: pending/uncertain/context-change browser variants, fuller keyboard/role integration, task retention, power actions and the wider original review requirements.


### Guest power actions with explicit target confirmation and tracked results

- Replaced generic power confirmations with a captured guest/environment/action dialog. Start, graceful shutdown, restart and force stop describe service impact, retain rejection errors, guard pending dismissal/navigation and prevent repetition after uncertain responses. Force stop requires typing STOP followed by the exact guest name. The API independently rechecks the current inventory name before dispatching force stop; missing or stale confirmation is rejected without a remote power request.
- Accepted power task IDs are persisted with the guest scope and power action, then tracked through GuestTaskProgress. The persisted history now labels snapshot and power requests individually as Guest requests. It still appears under the snapshot tab; broader information architecture remains open.
- Verification: all 25 isolated platform API tests and 23 frontend contract tests passed; TypeScript and changed-file ESLint passed. The actual force-stop component browser fixture verifies disabled initial submission, exact typed confirmation, retained confirmation after a 409 guest-lock response, retry and confirmed task success without a remaining submit button. Evidence: verification/guest-power-fixture.html and guest-power-result.png. Every fixture request is mocked; no live guest was stopped or otherwise changed.
- Remaining: browser variants for other power actions, pending/uncertain/context changes, complete route/role integration, task retention/orphan lifecycle, live rollout and the wider original review requirements. No deployment performed.


### In-app snapshot restoration

- Added Restore beside each snapshot for users with edit and power capabilities. The captured-target dialog names the snapshot, guest, environment and recovery timestamp in Europe/Zurich; describes discarded changes/service interruption; requires exact snapshot-name confirmation; retains rejected inputs and blocks repeated uncertain submissions. Accepted restoration uses persisted task tracking and remains visible until closed.
- The backend independently resolves the guest and requires edit/power authorization, verifies the current guest name and the selected snapshot timestamp against the current Proxmox list, rejects absent/replaced recovery points and dispatches the resource-specific QEMU/LXC rollback. It records snapshot_restore in the guest task registry and audit. No additional guest start operation is sent. The check is preflight validation, not an atomic lock against changes made directly in Proxmox during dispatch.
- API behavior checked against the applied upstream Proxmox QEMU/LXC rollback changes: https://lore.proxmox.com/pve-devel/20220914083054.1277527-4-s.hanreich@proxmox.com/T/ .
- Verification: all 26 isolated platform API tests passed, covering stale name/time, missing snapshot, read-only denial, QEMU/LXC rollback paths, one mutation per request and persisted task identity. TypeScript and changed-file ESLint passed. Actual-component browser fixture verifies initially disabled Restore, retained input after a 409, retry and confirmed restoration result. Evidence: verification/snapshot-restore-fixture.html and snapshot-restoration-result.png. All requests are mocked; no live restoration and no deployment.
- Remaining: direct-Proxmox concurrent-change integration, actual storage/backend restoration acceptance, application health verification after restore, additional pending/uncertain/context/role browser cases, independent backup/restore and retention workflows, and the wider review requirements.


### Guest tasks navigation and environment-bound detail queries

- Moved persisted guest requests from Snapshots to Tasks. Tasks is discoverable independently of canViewAudit; viewing requests requires canViewServers and the backend retains its existing infrastructure/environment checks. The separately labeled Audit activity card remains restricted to canViewAudit and explains that a recorded audit event is not proof of Proxmox completion. Missing connection/access is explained inline.
- Snapshot, configuration and context query keys/invalidation now include environmentId. Detail, audit, inventory, summary and manual-refresh fetches explicitly use the captured environment. The browser fixture initially exposed the omitted inventory request header; fixed it and verified the actual route thereafter. A Tasks deep link also exposed a false no-address statement before configuration was fetched; it now says Configuration not loaded.
- Verification: TypeScript and 23 frontend contract tests passed. Actual full-route browser fixture uses an operator with view-server/infrastructure access and no audit capability: direct #tab=tasks opens the registry, status check works, audit content is absent, and Snapshots no longer contains the registry. The fixture rejects unexpected API calls (including audit) and wrong environment headers. Screenshot: verification/guest-tasks-operator.png; fixture: verification/guest-tasks-route-fixture.html. No live requests or deployment.
- Remaining: full role matrix and environment-switch browser cases, audit filtering accuracy/pagination, task retention/orphan lifecycle and wider original review requirements.


### Exact guest audit identity and pagination

- Replaced client-side substring matching against the newest 100 global events with a guest-scoped audit endpoint and 20-event pagination. New power/snapshot/adoption events are atomically linked to connection, environment, node and VM ID through proxmox_guest_audit. Names, prefix IDs, other connections and nodes no longer determine membership. The shared audit writer now returns its inserted ID; existing callers remain compatible. Audit retention deletes the linked reference via ON DELETE CASCADE.
- The endpoint requires audit permission and the existing infrastructure/connection environment middleware; reads use SQLite without contacting Proxmox. The UI resets pagination for a different target/environment, keeps the Overview preview on the newest page and distinguishes the structured guest history from older events still available in Operations Audit. Legacy ambiguous records are not assigned speculatively.
- Verification: all 27 platform API tests, 5 central audit search/export tests and 23 frontend contract tests passed. TypeScript and route ESLint passed. Tests cover exact guest identity, similar IDs, other nodes/connections/environments, unlinked legacy events, pagination without overlap, unavailable guest inventory, denied audit permission, invalid offset and cascading retention cleanup. Actual route browser fixture verifies 20 events on page one and only event 21 on page two with disabled Next. Evidence: verification/guest-audit-route-fixture.html and guest-audit-page-two.png. All transport mocked; no deployment.
- Remaining: lifecycle of reused guest IDs, deeper field-level visibility integration, broad live/role acceptance and wider original review requirements.


### Strict guest identity and adoption inputs

- Guest IDs now require a canonical positive safe integer, shared by guest action paths, guest-IP discovery and adoption. Numeric prefixes such as 101suffix/101.5 no longer resolve to guest 101. The route guard also protects recorded task/audit reads and rejects malformed node names before dispatch.
- Adoption now uses the existing strict SSH port parser: only omission defaults to 22; supplied null, zero, fractions or text suffixes reject. Host and SSH user names must be strings within 100 characters rather than silently truncating, blank SSH users reject, and IP/folder/node fields reject coerced objects/arrays. The name/user inputs expose matching maxlength limits.
- Verification: all 29 isolated platform API tests passed. New tests exercise malformed IDs across configuration, tasks, audit, power and guest-IP routes, plus 14 invalid adoption input variants, asserting no Proxmox calls or new hosts. The first test run used an incorrect guest-IP route name; corrected to the actual /guest-ip endpoint and reran successfully. TypeScript, changed-component ESLint and diff whitespace checks passed. No live mutation or deployment.
- Remaining: broader input/accessibility acceptance, caller migration where external clients relied on coercion, and wider original review requirements.


### Combined regression verification after guest lifecycle and audit changes

- Full frontend suite: 179 tests across 35 files passed, including configuration rendering, language/theme contracts, API parsing, adoption batching, selection and shared infrastructure models. Full frontend ESLint passed with --max-warnings 0.
- Combined isolated backend suite: 46 tests passed across opentofu-core-route, opentofu-platform-actions, opentofu-proxmox and opentofu-run-security. This verifies integrated routing/capabilities/environment boundaries together with the newly added guest task, snapshot restore, exact audit identity and strict input cases; all remote execution is mocked or isolated.
- Vite production build passed (2001 modules). Output remains isolated at /tmp/shipyard-review-build-20260910; the existing scratch directory was not emptied, so old unreferenced assets may remain there. Production dist and the live app were not updated.
- No regressions were found by these checks. They do not prove complete review acceptance, actual Proxmox restoration, every role/responsive path or deployment readiness. Original prioritized findings and feature acceptance criteria remain active; broad remaining work includes identity/session controls, change processes, maintenance lifecycle, independent backup/restore, plugin rollback, Git conflict/import lifecycle and live acceptance.


### Maintenance concurrent-edit protection

- Maintenance responses now include a content revision covering identity, schedule, owner, scope and change information. Updates require that revision and compare it inside an immediate SQLite transaction before changing the row and writing its audit event. Stale/missing revisions return 409; the browser retains its draft and explains reopening current values. Existing rows need no schema migration.
- Creation, update and deletion audit events now explicitly use the window environment. The prior test looked in the default audit environment; corrected it to verify the intended environment.
- Verification: all 9 maintenance route tests, TypeScript and Operations ESLint passed. New coverage verifies two editors cannot overwrite newer ownership, missing revisions reject, list/create/update revisions agree and a reviewed latest revision succeeds. Actual dialog fixture verifies the original revision is sent and the owner draft remains after 409. Evidence: verification/maintenance-revision-fixture.html and maintenance-version-conflict.png. All transport mocked; no live maintenance changes or deployment.
- Remaining: richer conflict comparison/merge UI, deletion concurrency, series ownership/lifecycle and wider review requirements. API clients must obtain and send the revision when editing.


### Maintenance deletion conflicts and per-window outcomes

- Deleting a maintenance window now requires its reviewed revision and compares it inside an immediate transaction. Deletion and its audit entry commit together; audit persistence failure rolls back deletion. Missing/stale confirmation returns 409.
- Single and bulk deletion share a captured-selection/environment dialog. It lists exact names, explains maintenance suppression, blocks pending dismissal/navigation, sends revisions sequentially, retains per-window success/conflict/unknown results and does not repeat the batch from its result screen. Bulk successes are removed from the selected set. An environment switch stops remaining submissions.
- Verification: all 10 maintenance route tests, TypeScript and changed-file ESLint passed. Tests cover stale/missing deletion revisions, audit rollback and success with the current revision. Actual browser fixture verifies two selected windows produce one Removed result and one retained conflict with no remaining submit action. Evidence: verification/maintenance-delete-fixture.html and maintenance-delete-partial.png. All requests mocked; no live deletion or deployment.
- Remaining: pending/environment-change/uncertain browser variants, durable batch reconciliation, series lifecycle and the wider review requirements. Delete API callers must send the revision returned by list/create/update.


### Atomic maintenance creation and exact text inputs

- Creating a single maintenance window or finite recurrence now commits its rows and audit record inside one immediate transaction. An audit failure rolls back every occurrence, preventing an error response from concealing an already-created series.
- Name, owner, change reference, description, impact notes and timezone reject nontext/oversized values instead of coercing or truncating them. Preview, creation and update share the validation. Frontend name/owner/description/impact controls now use matching length limits; change reference already did.
- Verification: all 12 maintenance API tests passed, including audit failure across a three-occurrence series followed by successful retry, invalid types and overlength fields across preview/create/update, unchanged stored values after rejection, and exact accepted length boundaries. TypeScript and Operations ESLint passed. No live changes or deployment.
- Remaining: maintenance series identity/edit/cancellation workflows, ownership assignment beyond free text, richer revision conflict reconciliation and wider original review requirements.


### Persistent maintenance series identity and upcoming selection

- New finite recurrences persist a shared series ID, original occurrence index/count and frequency through additive maintenance columns. Single windows and legacy rows remain ungrouped; existing ambiguous schedules are not inferred from names. Editing one occurrence preserves its series identity; deleting a member does not renumber the original plan. Revision calculation includes series metadata.
- Desktop/mobile rows show frequency and original occurrence position. Managers can select upcoming members of the exact series/environment for the existing reviewed bulk-deletion flow; active/past occurrences and other series are excluded. The editor explicitly states that editing affects only the selected occurrence.
- Verification: 13 maintenance API tests passed, including stable metadata through individual edit/delete and rejection of client-supplied series reassignment by preserving authoritative metadata. TypeScript, changed-file ESLint and the new selection test passed. The test covers other environments/series and the active-time boundary. Actual browser fixture selects only two future members, leaves a past member/another series unselected and shows exactly the two members in deletion confirmation; no deletion submitted. Evidence: verification/maintenance-series-fixture.html and maintenance-series-selection.png. No deployment.
- Remaining: coordinated series editing/cancellation history, structured ownership, legacy grouping decisions and wider original review requirements.


### Maintenance host-scope authorization

- Entire-environment maintenance (including legacy omitted scope with no IDs) now requires unrestricted host scope. Selected-host windows still require access to each host. Updates/deletes independently verify control of the existing scope, preventing a restricted editor from narrowing or removing another team's broad window.
- Listing projects can_edit per window. Actions, checkboxes, select-all and upcoming-series selection exclude windows outside management scope. The editor disables entire-environment selection unless the profile verifies unrestricted host access and explains the requirement.
- Verification: 14 maintenance API tests, TypeScript and Operations ESLint passed. New coverage exercises restricted create/preview, broad and mixed-scope update/delete denial, allowed own-host deletion and per-row editability. Actual dialog browser fixture shows its allowed host selected and Entire environment disabled with explanatory text; no mutation submitted. Evidence: verification/maintenance-scope-permissions-fixture.html and maintenance-restricted-scope.png. No live changes or deployment.
- Remaining: broader permission-change/race and full-page role fixtures, series lifecycle and wider review requirements. Maintenance view capability still controls visibility of schedules; this change limits mutations.


### Review maintenance conflicts without losing the draft

- A stale-version response now blocks resubmission and offers a fresh, read-only comparison within the same editor. Name, ownership, change reference, schedule, timezone, scope, impact and description appear beside the retained draft, with differences highlighted. Missing windows/read errors leave the draft intact; lost scope permission prevents accepting the fetched version.
- Explicitly choosing Use my draft against this version updates only the revision baseline, not the draft or stored window. The user then saves the complete reviewed replacement; another concurrent edit still produces a new conflict. No automatic overwrite or silent field merge.
- Verification: TypeScript and actual-component browser fixture passed: conflict disables Save, current owner and draft owner appear side by side, explicit review accepts the latest revision, and the subsequent request retains the draft owner and closes on success. Evidence: verification/maintenance-conflict-review-fixture.html and maintenance-conflict-comparison.png. All requests mocked; no live edit or deployment.
- Remaining: field-by-field merge choices, missing/read-error/permission-revocation browser variants and wider review requirements.


### Maintenance and notification regression verification

- Full frontend suite passed: 180 tests across 36 files after the maintenance version, deletion, series, scope and conflict-review changes. Combined maintenance, notification-maintenance and execution-notifications checks passed all 19 tests before the boundary correction. All notification execution transports remain mocked.
- Inspection identified differing end-boundary semantics: maintenance state remained active at exactly ends_at while suppression already stopped. State now uses the same start-inclusive/end-exclusive interval as notification coverage. A route-level test freezes the clock at the exact end and verifies create/list report completed, suppression is false then and true one millisecond earlier.
- No deployment or live maintenance changes. These checks cover the exercised contracts; wider review acceptance, series cancellation/history and remaining identity/change-process work remain open.


### Maintenance cancellation with retained history

- Scheduled or active maintenance can now be cancelled individually or through selected upcoming series members. A required bounded reason, actor and timestamp remain on the retained window. Cancellation checks current revision and host/environment capabilities and commits with its audit record atomically. Completed/already-cancelled windows cannot be cancelled again; cancelled windows cannot be edited into active ones.
- Cancellation uses the existing captured-selection lifecycle with per-window results and pending/context guards. Overview rows show cancellation details and a distinct Cancelled status. Cancelled windows are excluded from recurrence conflicts, client overlap hints, upcoming-series selection and notification suppression; running jobs are unaffected. Additive database fields preserve existing windows.
- Verification: 17 combined maintenance/suppression tests, 28 frontend tests, TypeScript and changed-file ESLint passed. New API coverage verifies required reason/revision, rollback on audit failure, retained list/history metadata, disabled editability, suppression ending, conflict exclusion and rejection of repeated cancellation. Frontend tests verify cancelled overlap/series exclusions. Actual browser fixture verifies required reason, one cancelled result and one retained 409 conflict. Evidence: verification/maintenance-cancel-fixture.html and maintenance-cancel-results.png. All requests mocked; no live cancellation or deployment.
- Remaining: richer series-wide editing, structured team ownership, additional cancellation role/browser cases and wider review requirements.


### Guest audit wording distinguishes acceptance from completion

- Guest audit rows now show Request accepted for accepted asynchronous power/snapshot operations, Request failed for explicit failures and Unknown for absent or invalid success metadata. They no longer display Successful merely because an API request was accepted. Actual completion remains in the Proxmox task registry. Desktop/mobile share the same presentation helper.
- Added readable shared audit names for snapshot creation/restoration/deletion, power requests, adoption and maintenance create/update/cancel/delete. Power labels distinguish start, shutdown, restart and force stop from their parsed action field. Other successful audit records use Recorded.
- Verification: TypeScript, changed-file ESLint and 28 frontend tests passed, including acceptance/failure/missing-status cases. Actual guest-route browser fixture shows Forced guest stop requested with Request accepted under Audit result while the separate task registry retains its actual outcome. Evidence: verification/guest-audit-labels-fixture.html and guest-audit-acceptance.png. No live actions or deployment.
- Remaining: status vocabulary consistency across other activity surfaces and wider original review requirements.


### Consistent central audit outcomes on desktop and mobile

- Central AuditLogPanel now uses the same event presentation as guest history: readable request names, explicit Request accepted/Request failed, Unknown for missing status, and Recorded for other successful audit records. Desktop/mobile no longer differ between Successful and OK or interpret an absent status as failure.
- Verification: 7 focused tests passed, including actual rendered desktop/mobile rows with accepted, failed and missing snapshot-restoration outcomes; TypeScript and changed-file ESLint passed. An initial shell call used root-relative paths from the frontend directory and made no edits; corrected the working directory and reran the checks against the new files. No deployment.
- Remaining: other activity surfaces and wider original review requirements.


### Platform and node audit outcomes

- RecentObjectTasks and ObjectTasksCard now share request acceptance/failure/unknown presentation with guest and central audit views. Shared task labels retain IPAM grouping while using readable action labels elsewhere; Proxmox package-catalog refresh is explicitly a request, not confirmed completion.
- Periodic audit grouping now requires explicit true/1 success. Unknown records remain separate rather than being collapsed into a successful synchronization group.
- Verification: 11 focused tests initially passed across presentation/model/audit helpers, followed by all 5 model tests after adding the unknown-grouping regression (12 distinct tests across the three files). Rendered component tests cover both recent and complete task cards for accepted, failed and missing results. TypeScript and changed-file ESLint passed. No live actions or deployment.
- Remaining: exact platform/node audit identity filtering and broader original review acceptance.

### Exact platform and node audit matching

- Replaced free-text substring matching in tasksForObject with an exact, unique source_id match against the platform's connections and exact node identity for node history. Display names, incidental text, prefix node names, foreign connections and ambiguous duplicate identity fields cannot establish ownership. Renaming a connection preserves matching through its stable ID.
- Guest audit, package catalog refresh and IPAM sync producers now record the stable source ID; guest events also consistently record their node. Catalog refresh and IPAM sync explicitly persist the source environment. The object audit request captures environment_id explicitly.
- Legacy events without identity remain in central Operations audit rather than being guessed into an object history. Both object cards explain that the source is the latest 300 loaded audit records; the empty state no longer claims that the object has never had tasks.
- Verification: 8 frontend model/render tests and 39 backend platform/Proxmox tests passed. After adding guest producer assertions, all 29 platform-route tests passed again. Final TypeScript and changed-file ESLint passed. Remote Proxmox behavior was mocked; no infrastructure actions or deployment.
- Remaining: server-side paginated platform/node audit history beyond the 300-record window, legacy event identity migration only where authoritative provenance exists, and the wider original review acceptance criteria. This change does not establish overall review completion.

### Server-paginated platform and node history

- Added indexed proxmox_object_audit identities and an atomic writer shared by guest actions, node catalog refresh and IPAM synchronization. Existing authoritative proxmox_guest_audit references are copied idempotently on schema initialization; ambiguous legacy free text is not migrated.
- New connection audit endpoint filters by the source environment, same-endpoint connection aliases and optional exact node before counting and paginating 20 records. It requires audit plus infrastructure access and does not depend on live Proxmox availability or usable credentials. Explicit mismatching environment queries are rejected. Object references cascade when audit retention removes their event.
- InfrastructureDetailPage now reads this endpoint with captured environment in both query and header. Query keys and page state include the object and environment; changing context starts at page one. Previous/next controls expose totals, loading boundaries and the last page. The summary explicitly identifies itself as a preview; Tasks shows the entire page without client-side filtering/grouping discarding entries.
- Verification: 44 backend tests across platform routes, Proxmox, core and run security passed; 8 frontend model/render tests, TypeScript and changed-file ESLint passed. New route regression retrieves exactly 25 linked records over two pages despite 310 unrelated records, includes same-platform aliases, excludes other nodes/sources/environments, rejects missing capabilities and malformed input, verifies no network requests and checks cascade cleanup. A failed object-link insert rolls back its audit event. An initial test exposed reliance on outer environment middleware; the endpoint now rejects mismatching explicit queries itself and the regression passes.
- Actual route browser fixture verified Tasks page two contains events 21–25 and disables Next. Evidence: verification/object-audit-fixture.html and verification/object-audit-page-two.png. The first fixture launch lacked the environment localStorage setup; corrected the isolated fixture and verified the completed flow. Vite was stopped and the temporary frontend fixture removed. No live actions or deployment.
- Remaining: unlinked historical catalog/IPAM text remains in central audit, full browser coverage of node/context/permission transitions and wider original review acceptance. No overall completion claim.

### Preserve object history during environment consolidation

- Environment removal consolidates Proxmox guest audit references, platform/node audit references and persisted guest tasks into default alongside the audit events and their connections. Previously these new tables retained the deleted environment and could disappear from scoped queries even though the connection remained.
- Consolidation audit now runs inside the same transaction as resource movement and environment deletion, with explicit default scope. An audit failure rolls back the entire operation instead of returning an error after a committed deletion.
- Verification: all 6 environment-integrity tests passed. The consolidation regression checks both audit-reference tables, the linked event and the running guest task retain their identities and end in default. A simulated post-insert audit error verifies the environment and host remain in their original scope and no success audit survives. Tests use an isolated temporary database; no real environment was changed.
- Review scope rechecked against the original acceptance and feature list; outstanding requirements remain, including broader workflow, identity, trend, collaboration and end-to-end verification work. Overall completion remains unproven.

### Environment name validation and feedback

- Create/rename now accept only actual strings with 1–80 trimmed characters. Oversized values are rejected rather than silently truncated; objects/numbers cannot become environment names. Duplicate names produce a field-specific 409 for both creation and renaming; unexpected storage failures remain server errors.
- Shell forms use matching required/maximum-length limits, show request errors inline, preserve failed drafts and guard pending submission. Rename cannot be dismissed while saving and clears a previous target's mutation error when opened. Environment actions remain visible on small screens and are revealed on keyboard focus on desktop.
- Verification: all 7 environment-integrity tests passed, including invalid types, empty/oversized values, accepted 80-character boundary and duplicate rename preserving the original row. TypeScript and AppShell ESLint passed. One attempted CSS edit initially used the root-relative path from the frontend working directory, changed nothing, and was corrected. No live mutations or deployment. Wider review acceptance remains open.

### Keep environment consolidation feedback visible

- Environment consolidation now opts out of ConfirmDialog's immediate close. Success closes the captured target dialog; failures remain visible inline with the entered confirmation retained. Opening another target resets prior errors. The dialog shows Target environment instead of potentially misleading active-navigation context.
- Shared confirmation supports optional deferred close/error/target context while preserving existing callers' immediate-close default. Pending operations block dismissal/input and duplicate submission.
- Verification: TypeScript and changed-file ESLint passed. Isolated browser fixture using the actual ConfirmDialog, API helper and mutation verifies a mocked 409 leaves Staging visible while Production is active; the explicit retry succeeds and the dialog disappears. Evidence: verification/environment-confirm-fixture.html. All fetches intercepted; no real environment mutation. Temporary frontend fixture removed and Vite stopped.
- Remaining: broader environment concurrency/revision protection and other original review requirements. Overall goal remains open.

### Full regression verification and current operator guidance

- Ran the complete frontend suite: 189 tests across 38 files passed. Ran the complete backend suite with four workers: initially 593/595 passed. Both failures were stale test contracts: Compose rejection now returns actionable path guidance, and note writes require a loaded revision.
- Updated the existing Compose security regression to recognize the specific path guidance while additionally asserting zero SSH executions for rejected injection/system/traversal paths. Updated the server notes integration test to read the current revision, reject missing revision with 428, save successfully, reject stale overwrite with 409 and confirm the saved text/revision survive.
- Final complete backend run: 595 tests, 18 suites, all passed, zero skipped/cancelled. One intervening invocation used a root-relative test glob that matched zero tests; that result was discarded, and the corrected full run explicitly verified all 595 tests.
- Production Vite build succeeded in a temporary output directory (/tmp/shipyard-review-build-20260910-current), without replacing production dist or deploying. ContextHelp ESLint passed. Operator guidance now describes the implemented snapshot restore and its asynchronous task result, maintenance cancellation and individual recurrence edits instead of directing every restore to an external console.
- These checks verify the current tested contracts and build; they do not establish all review acceptance, live rollout, all roles, mobile/accessibility coverage or outstanding enterprise features. Overall goal remains active.

### Datastore inventory includes active non-ZFS backends

- Removed the Proxmox inventory's ZFS-only filter. Active directory, LVM/thin, network and other reported backends are returned for both node and platform, matching the broader storage choices available to VM creation. Inactive stores remain outside this explicitly active inventory.
- Platform tab counts, datastore list and configuration preview now use all reported stores. Datastore card and operational labels no longer claim every backend is ZFS. Missing backend type is Not reported rather than an invented zfspool value. The list explains that entries may share underlying capacity.
- Preserved the separate summary preference for ZFS pools so exposing directory/LVM entries does not automatically sum them with their backing pool. Primary datastore label is type-neutral; summary capacity explicitly identifies its selected subset.
- Verification: 32 platform API tests passed, including mixed ZFS/LVM/directory inventory, unknown type and inactive filtering; 7 frontend model/render tests passed, including mixed backend display and preserving summary preference. TypeScript and changed-file ESLint passed before the final unused-import cleanup. No live operations or deployment.
- Remaining: inactive-store view, data quality/health and temporal metrics, physical capacity deduplication across shared storage, provisioning/reservation depth and broader review scope. This change addresses inventory coverage without claiming all datastore requirements complete.

### Datastore health distinguishes missing capacity from zero usage

- Live Proxmox storage inventory now exposes capacity_reported, rejecting absent/empty/nonfinite used values, nonpositive/nonfinite totals and inconsistent negative/over-total use. This preserves the distinction previously lost through numeric fallback to zero.
- Shared datastore capacity classification drives the list and platform health. Missing/inconsistent data appears as Not reported/unknown capacity; a platform with absent nodes/stores or unknown storage metrics cannot claim Ready for operation. Normal storage reads below 85% utilization rather than a broad healthy claim. Invalid storage is excluded from summary capacity selection.
- Verification: 32 platform API tests passed with missing usage explicitly checked. Eight focused frontend tests passed, followed by all three datastore tests after adding an actual PlatformOperatingState render asserting incomplete data is not Ready/healthy (nine distinct tests including the six detail-model tests). TypeScript and changed-file ESLint passed before that final test-only addition. No live operations or deployment.
- Remaining: collection failure reasons, inactive stores, data timestamps and trends, shared-capacity accounting and wider review requirements.

### Storage collection status and timestamp

- Each live node storage request now records datastores_status and datastores_checked_at. A valid empty response is available; rejected requests and invalid payloads are unavailable. No raw infrastructure error or credentials are exposed.
- Node/platform datastore cards show per-node source status and a consistently formatted last-attempt timestamp. Missing/failed collection explains refresh/connectivity/storage-permission checks and does not claim a successful empty inventory. Platform readiness also requires complete storage collection metadata.
- Verification: 33 platform route tests passed, including empty arrays, malformed payloads and mocked HTTP 403; 10 frontend tests passed, including rendered failure versus valid-empty wording and timezone. TypeScript and changed-file ESLint passed. No infrastructure mutations or deployment.
- Remaining: inactive storage visibility, historical trends, cross-node/shared capacity accounting, richer provisioning/reservation data, full live/responsive validation and other original review requirements. Overall goal stays active.

### Inactive and disabled datastore visibility

- Proxmox inventory now retains reported inactive storage entries and exposes explicit active/enabled metadata. Unknown status remains null rather than being inferred active; unreported enablement does not override an explicit active result.
- Desktop and mobile datastore views label Active, Inactive, Disabled or Status not reported. Inactive, disabled and explicitly unknown-active stores cannot contribute to available summary capacity; utilization/free-space presentation no longer presents them as usable storage. Backend labels and counts therefore describe the complete reported inventory, superseding the earlier active-only limitation.
- Verification: 33 platform API tests and 11 frontend model/render tests passed. Tests include retaining the inactive API row, accurate active flags, separate disabled/unknown labels and exclusion from preferred capacity. TypeScript and changed-file ESLint passed. No live operations or deployment.
- Remaining: shared physical-capacity accounting, historical trends and richer provisioning/reservation metadata, plus broader original review acceptance and live/responsive coverage.

### Storage operational summary separates disabled and failed states

- Platform status now separates intentionally disabled stores from inactive stores, unknown capacity and high utilization. A disabled store alone does not make otherwise available storage unhealthy; no active usable storage is explicitly identified. Inactive non-disabled stores require review and offer a connectivity check.
- Summary lists all relevant counts instead of showing only the first category. A known fault/high-utilization condition retains its review count when collection or capacity data is also incomplete; missing data no longer hides known problems behind a generic incomplete label.
- Verification: all six datastore model/render tests passed, including normal-plus-disabled, normal-plus-inactive and high-utilization-plus-missing-data combinations. TypeScript and changed-file ESLint passed. No live actions or deployment. Wider datastore and original review requirements remain open.

### Datastore content and sharing metadata

- Storage inventory now carries Proxmox's configured content types and explicit shared flag. Content lists are trimmed/deduplicated; omitted metadata stays unknown. UI translates known types into VM disks, container filesystems, ISO images, backups, templates and snippets while preserving unfamiliar future types.
- Desktop/mobile show content and sharing alongside operational status, helping distinguish backup/ISO storage from VM disk destinations. Shared metadata is descriptive and does not claim physical-capacity deduplication.
- Verification: 33 platform API tests and seven datastore frontend tests passed; TypeScript/changed-file ESLint passed. Actual DatastoresCard browser fixture at desktop width verified readable nine-column layout, active shared/local rows, inactive storage and unknown fields. Evidence: verification/storage-review-fixture.html and storage-review-desktop.png. Temporary frontend fixture removed and Vite stopped. No live operations or deployment.
- Remaining: physical capacity accounting, trends, provisioning/reservations, mobile and wider live validation, and other original review requirements.

### Datastore search and operational filters

- Datastore cards now offer case-insensitive text search across name, node, backend and readable content types, combined with explicit Active/Inactive/Disabled/unknown status selection. Visible/total counts, Clear filters and a distinct no-match state keep the current scope apparent. Full inventory and capacity summaries remain unchanged by list filtering.
- Verification: eight datastore tests passed, covering combined filters, normalized input, content labels, disabled precedence and no inventory mutation. TypeScript and changed-file ESLint passed. Actual browser fixture combined VM disks + Inactive to show only offline-lvm (1 of 4) and then restored all four entries via Clear filters. Reused verification/storage-review-fixture.html; no real API calls. Temporary frontend copy removed and Vite stopped.
- Remaining: persistent saved views, broader inventory/metric work and other original review acceptance. No deployment or overall completion claim.

### Observed datastore utilization history

- Added persistent, source-scoped storage observations keyed by environment, platform endpoint, node, datastore and five-minute bucket. Only valid active/non-disabled capacity samples are recorded; newer observations replace the same bucket. Refresh removes observations older than seven days. Each inventory response includes up to 48 recent chronological observations per reported store.
- Datastore desktop/mobile views show a point plot, actual observation time range, sample count and percentage-point change. Sparse samples are not joined by lines or filled with zero values; no/single observations have explicit states. The UI explains that data comes from successful inventory refreshes, not continuous background monitoring.
- Environment consolidation merges history transactionally, preserving the newer sample on collisions. Source isolation, bucket replacement, invalid sample exclusion, age cleanup, response limit and consolidation collision behavior are covered.
- Verification: 41 backend tests passed across platform routes, environment integrity and the new history module; after adding consolidation assertions, all eight history/environment tests passed again. Nine frontend tests passed after fixing an SVG title React warning. TypeScript and changed-file ESLint passed before final text/layout refinements. Browser fixture verified observed history and corrected broken numeric-unit wrapping. Evidence: verification/storage-history-fixture.html and storage-history-desktop.png. Temporary frontend fixture removed and Vite stopped. No live infrastructure operations or deployment.
- Remaining: background collection policy, history range selection beyond the last 48 observations, physical shared-capacity accounting, provisioning/reservations and the rest of the original review. This is observed inventory history, not continuous monitoring or complete enterprise acceptance.

### Storage history integration and architecture verification

- Full frontend regression passed: 198 tests in 40 files. Initial full backend regression passed 597/598; the architecture test correctly caught the OpenTofu entry point exceeding its 2000-line bound after storage additions.
- Extracted storage response normalization, collection status and history enrichment into collectStorageResults in the storage-history module. The entry point is now 1978 lines and delegates the cohesive storage work rather than relaxing the architecture gate.
- Added storage-history.js to the explicitly scoped backend checkJs configuration; that typecheck passed. The existing typecheck did not previously include the new module and was not treated as proof of its coverage.
- Verification after refactoring: all 37 targeted architecture/storage/platform tests passed. Final full backend run passed all 598 tests in 18 suites, zero skipped/cancelled. No production build replacement, live action or deployment. Full original review completion remains unproven.

### Seven-day observed storage trend

- Inventory history now additionally returns hourly mean utilization across the retained seven-day observations. SQL averages each observation's percentage, not used/total averages, so changing capacity does not distort the mean. Hours with no observation are absent.
- Datastore history selector switches between the last 48 raw observations and seven-day hourly means. Both mobile and desktop use the selected series; charts/labels distinguish observed hours and hourly means from individual samples. This makes retained older observations visible beyond the recent 48-point window.
- Verification: 35 backend storage/platform tests and 10 frontend history/datastore tests passed. New aggregation test uses unequal capacities and confirms a 50% mean rather than the incorrect weighted ratio; missing hours remain gaps. Rendered history test confirms selected hourly data, labels and delta. Backend scoped typecheck, frontend TypeScript and changed-file ESLint passed. No live actions or deployment.
- Remaining: collection scheduling policy, large-inventory/on-demand history performance, physical capacity accounting, broader responsive/live verification and other original review requirements. Overall goal remains active.

### Node network collection quality

- Node inventory records network_status and network_checked_at. Rejected or malformed network responses are unavailable; a valid empty bridge response is available. Node configuration distinguishes these states and provides a connectivity/permission next step instead of presenting failed collection as no configured bridges.
- Verification: 37 platform/architecture tests passed, including HTTP 200 empty versus HTTP 403 network responses and timestamp presence. Actual NodeConfiguration render test passed for distinct empty/failure messages and timezone. TypeScript and changed-file ESLint passed before the final test-only addition. No live infrastructure actions or deployment.
- Remaining: broader network coverage and metrics, additional responsive/live validation and outstanding original review requirements. Overall goal remains active.

### Bridge field quality

- Bridge active state now preserves missing values as unknown instead of false. Unreported backend/type is no longer invented. IPv4 prefixes must be explicit integers from 0 through 32; null, empty and invalid input do not become /0.
- Desktop/mobile bridge rows show Not reported for unknown status/type and append a prefix only when valid, preventing legacy absent fields from rendering /undefined. Explicit inactive and /0 remain correctly distinguishable from missing values.
- Verification: 38 platform/architecture tests and two rendered network tests passed; TypeScript and changed-file ESLint passed. Cases cover absent fields, explicit zero/false, numeric string prefixes and invalid ranges. No live actions or deployment. Wider network and original review requirements remain open.

### Broader node network inventory

- Proxmox node payload now preserves all reported interfaces (physical NICs, bonds, VLAN interfaces and bridges) in network_interfaces while retaining the bridge-only default list. Node configuration offers an accessible Include other interfaces toggle with a visible count, keeping the familiar default and making the broader inventory inspectable.
- Actual browser fixture verified one bridge by default and all four interfaces after toggling, with Active/Inactive/Not reported states intact. Stable checkbox accessible name added. During this check the neighboring storage count was corrected to reported/Not reported rather than calling inactive or unknown inventory available.
- Verification: 39 platform/architecture tests and two rendered network tests passed; TypeScript and changed-file ESLint passed before final label/count refinements, followed by the two render tests again. Fixture: verification/network-inventory-fixture.html. Temporary frontend file removed and Vite stopped. No live actions or deployment.
- Remaining: richer network relationship/IPv6 details, responsive validation and other original review requirements. Overall goal remains open.

### IPv6 interface inventory

- Node interface projection now includes IPv6 address, prefix and gateway. Missing values remain null; IPv6 prefixes must be explicit integers in 0–128. Desktop/mobile network rows display IPv6 separately from IPv4 and retain unknown labels for missing metadata.
- Verification: 39 platform/architecture tests passed; after adding /128 and invalid /129 assertions, all 36 platform route tests passed again. Three rendered network tests passed, including IPv6 address/gateway in both desktop/mobile markup. TypeScript and changed-file ESLint passed before the final backend test-only addition. No live actions or deployment.
- Remaining: richer network relationships and metrics, responsive/live validation and other original review acceptance. Overall goal remains active.

### IPv6 responsive verification and address labels

- Desktop network rows now explicitly label IPv4 alongside IPv6; mobile gateway labels identify their family. IPv4 and IPv6 use the shared address formatter, preserving unknown prefixes. Address/gateway table cells allow long values to wrap.
- Actual NodeConfiguration fixture checked long IPv6 addresses at a 390×844 viewport. The mobile card keeps both address families and gateways inside its bounds; the browser viewport was restored afterward. Evidence: verification/network-responsive-fixture.html and network-ipv6-mobile.png.
- Three network render tests, TypeScript and changed-file ESLint passed. Temporary frontend fixture removed and Vite stopped; no live actions or deployment. This verifies this component/breakpoint, not app-wide mobile or accessibility completion. Other original review requirements remain open.

### Account session visibility and targeted revocation

- Full sign-in tokens now carry a persisted session ID. The profile lists up to 100 active sign-ins with client, IP address, sign-in/last-seen/expiry times and a current-session marker. Users can revoke an individual session, including their own; another account's sessions cannot be listed or revoked.
- Revocation and its audit entry commit together. Revoked sessions immediately fail HTTP authentication and notify connected WebSockets to close; open sockets also revalidate every 30 seconds for expiry/account invalidation. The SSH close handler closes its stream and connection; this does not claim termination of detached remote jobs.
- Existing JWTs without a session ID retain their original expiry during migration. The profile explicitly explains that these older sessions are not listed and can be invalidated through a password change. Session tracking is not SSO, organization-wide MFA policy, or SSH step-up authentication; those original requirements remain open.
- Verification: 32 focused backend authentication/session/WebSocket tests passed, including real login-issued IDs, owner isolation, selected-session HTTP rejection, immediate WebSocket closure, automatic expiry revalidation, listener cleanup, self-revocation, legacy token-version invalidation and audit rollback. Frontend TypeScript and changed-file ESLint passed. Browser fixture verifies a failed revoke leaves the session visible and a successful retry removes only its target. Evidence: verification/sessions-fixture.html and sessions-retry.png.
- No live accounts were changed and no deployment performed. Broad backend regression is being checked separately; overall review goal remains active.
- Broad regression found and fixed an authentication write-lock interaction: last-seen telemetry now writes only after 60 seconds and tolerates SQLite writer contention without bypassing required session validity reads. All 608 backend tests passed after this fix. An additional dedicated writer-contention test then passed with all seven session tests, verifying delayed telemetry resumes after the lock is released.
- Follow-up still needed: integrate server-side invalidation with the existing header/command-palette sign-out controls, which currently clear local tokens only; verify the profile across mobile layouts and account-policy flows. Targeted revocation is verified, not the entire account-security feature.

### Regular sign-out revokes server access

- Header and command-palette sign-out now use a shared POST /auth/logout workflow. The local token is cleared after server revocation succeeds (or the server already rejects it as unauthorized). Network/server failures preserve retry capability and show an error; the pending state prevents repeated activation within each control.
- Legacy JWTs without a tracked session ID can now also be individually revoked. Only their SHA-256 fingerprint is persisted as a revoked session entry through the token expiry; neither raw tokens nor an account-wide invalidation are required. HTTP and live WebSocket checks use the same fingerprint. Existing unrevoked legacy tokens retain migration behavior.
- Logout audit and revocation are transactional. Tests prove failed audit writes preserve legacy access for retry, while successful sign-out blocks its HTTP/WebSocket access and leaves another sign-in valid.
- Verification: 36 focused backend tests and four frontend sign-out tests passed; changed-file ESLint passed. TypeScript and the full backend regression were also started for the combined change; results recorded below. No live accounts changed and no deployment.
- Combined verification completed: frontend TypeScript and all 612 backend tests passed. Remaining account-security scope includes responsive/profile verification, SSO/invitations, MFA policies and SSH step-up; overall original review goal remains active.

### Session list pagination and mobile layout

- Replaced the silent 100-session ceiling with 20-row pages and an account-scoped total. Current session is first; remaining rows use stable sign-in-time/id ordering rather than changing last-seen values. Offsets reject negative, fractional, nonnumeric and unsafe integer values. Deleting the last row on a later page returns to the preceding page.
- Mobile session rows place actions beneath metadata and wrap IPv6/client strings. Revocation shows the targeted pending state. Legacy-session guidance now explains that regular sign-out revokes the current legacy token while password change invalidates older sign-ins collectively.
- Verification: all 11 session backend tests passed, including 25 distinct sign-ins across two pages, current-session priority and invalid offsets. TypeScript and changed-file ESLint passed. Actual browser fixture at 390×844 verified long unbroken client text and full IPv6 addresses remain inside the card; viewport restored, temporary fixture removed and Vite stopped. Evidence: verification/sessions-mobile-fixture.html and sessions-mobile.png. This is component-level responsive evidence, not app-wide responsive completion.
- No deployment or live account changes. Other original review requirements remain open.

### Git merge-conflict preservation and visibility

- Git status now detects unmerged index entries before synchronization hooks or runtime-file copies. While conflicts exist it reports the affected paths and preserves the working tree/index, instead of allowing the status refresh to replace conflict markers with runtime copies.
- Commit, push, pull and branch-switch flows refuse synchronization with MERGE_CONFLICT while unmerged entries remain. The settings UI lists conflict files, explains manual resolve/abort in the Git workspace, and blocks publishing. Ordinary dirty-file advice no longer suggests committing/pushing an unresolved merge.
- Verification: 24 Git preservation/validation tests passed. The new test creates an actual conflicting merge in a temporary local repository and verifies unchanged HEAD, index stages, conflict bytes and runtime content across status/commit/push/pull/checkout. TypeScript and changed-file ESLint passed before a final conflict-message refinement; TypeScript rerun for that refinement. No network repository or live configuration changed.
- Remaining Git review work: richer divergence/remote state and browser validation of conflict presentation. No deployment; the overall review remains in progress.

### Git cached remote comparison and automatic conflict guard

- Working-copy status now compares HEAD with the configured remote-tracking branch and reports aligned/ahead/behind/diverged/unavailable with explicit commit counts. Successful fetch time is separate from successful pull time. Remote comparison requires matching repository provenance, and the UI explains that cached refs are not a live remote check.
- Extracted the actual Git status/conflict presentation into GitSyncState. Browser fixture confirms divergence counts, timezone-labelled fetch time, conflict filenames and resolve/abort guidance. Evidence: verification/git-state-fixture.html and git-conflicts.png.
- Found an independent autoPush implementation that still staged conflicts: added the same pre-synchronization guard and extended the real conflicting-repository test to cover it. All 24 Git tests passed, including aligned/divergent comparisons and auto-push preservation. Two frontend rendering tests, TypeScript and changed-file ESLint passed; final backend-only provenance/autoPush changes were followed by the Git tests again.
- Temporary frontend fixture removed and Vite stopped. No live repository writes or deployment. Other original review requirements remain open.

### Explicit Git remote refresh

- Added an admin-only Check remote action backed by POST /playbooks-git/fetch. It fetches/prunes remote references without merging, importing runtime files, staging, committing or publishing. The UI refreshes comparison/branches, shows pending/failure state, and avoids overlapping its manual pull/push/checkout controls.
- Pull uses the same fetch implementation. Successful fetch provenance/time updates only on success; deleted remote branches are pruned so their stale refs no longer appear aligned. Remote refresh remains available during local conflicts because it does not modify working files or index stages.
- Verification: initial 26 Git tests passed, with real local-repository checks for unchanged HEAD/index/runtime/workspace files, behind-state detection and conflict-safe pruning. TypeScript and changed-file ESLint passed. Additional route test covers non-admin denial, failed-fetch timestamp preservation and successful retry; full backend suite running for the combined changes.
- No live repository operations or deployment. Browser interaction with the new refresh button and remaining review requirements still need verification.
- Combined regression completed: all 617 backend tests passed, including the new remote-check route authorization/failure/retry test. Overall goal remains active.

### Git remote-refresh browser verification

- Rendered the actual GitTab with router/query providers and controlled responses. First Check remote returned 502: the inline failure appeared while old comparison/time remained. Retrying succeeded: error cleared and comparison changed from aligned/zero to three remote-only commits with a newer timezone-labelled fetch time. Remote read-only continued to disable push/auto-push.
- Removed the duplicate No commits yet summary above the existing empty state. Switching to the already active/configured branch is disabled. Browser accessibility inspection after hot reload verified both refinements.
- Evidence: verification/git-refresh-fixture.html and git-refresh.png. The screenshot captures successful refresh before the final small label/button refinements; their browser verification is recorded above. Changed-file ESLint passed and TypeScript rerun. Temporary fixture removed and Vite stopped. No real remote requests, imports, commits or pushes; overall review goal remains open.

### Reset scope and typed confirmation

- All reset endpoints now require an action-specific confirmation phrase and an explicit scope independently of the UI. Host/schedule resets bind to the request environment; shared playbook/account/combined resets require all-environments scope. Admin authorization remains required.
- Danger Zone captures the environment when confirmation opens, displays actual destructive scope, requires typing the phrase and preserves input/error after failure. API reset helpers now require confirmation arguments. The existing incomplete factory-reset implementation is labelled Combined reset with its actual retained-data limitation rather than promising a full database wipe.
- Verification: three isolated backend tests cover all five actions' missing/wrong phrases, wrong scopes, non-admin denial and actual host deletion isolated to the selected temporary environment. TypeScript and DangerTab ESLint passed; TypeScript rerun after updating API helpers. Browser fixture verifies disabled initial action, enabled exact phrase and retained target/input after a simulated 409. Evidence: verification/reset-fixture.html and reset-confirmation.png. No live reset occurred; temporary fixture removed and Vite stopped.
- This does not satisfy the independent backup/restore requirement: current UI warns to have a tested external backup but does not verify one. Backup creation/restore, fresh reauthentication, broader reset atomicity/scheduler cleanup and complete reset scope remain open. No deployment; original goal remains active.

### Encrypted database backup foundation

- Added database-backup service and create/verify CLI using SQLite online backup, pre-encryption integrity checking, streaming AES-256-GCM with authenticated format header, random salt/nonce and scrypt-derived passphrase keys. Output is published atomically without replacing existing files; private temporary snapshots are removed afterward.
- Scope is explicitly database-only across all environments. docs/database-backup.md documents separate recovery requirements for original SHIPYARD_KEY_SECRET, deployment configuration, playbooks/plugins/Git and infrastructure state files, and remote workload data. No complete application backup/restore claim is made.
- Six isolated tests passed: committed WAL snapshot consistency and independent verification, ciphertext tampering/wrong password/truncation rejection, existing-file preservation, weak-password rejection, CLI verification without secret output, read-only CLI creation and unsupported-database rejection/cleanup. Test backups contain only synthetic data in temporary directories; no production data was backed up or changed.
- Remaining: full filesystem packaging and consistency, application UI/retention, verified recovery orchestration, fresh authorization and binding backups to destructive actions. Overall original review goal remains active; no deployment.

### Verified database restore to a new file

- Added restore CLI/service for encrypted database archives. Authentication and SQLite integrity verification precede publication to a new destination. Existing files/symlinks and SQLite sidecars are refused; destination remains absent on failed decryption. Private staging files are cleaned up and output is mode 0600.
- Restored user token versions advance and tracked sessions/pending MFA enrollments are removed, preventing reuse of saved versioned sessions. The configured running database, archive and application process are untouched. Documentation distinguishes file restoration from activating a recovered deployment and explains original keys/files, matching version and avoiding duplicate connected schedulers.
- All ten isolated backup/restore tests passed, including round-trip content, session invalidation, source preservation, CLI restore, wrong-passphrase rejection, no overwrite, sidecar refusal and temporary-file cleanup. Only synthetic temporary databases were restored; no live data or deployment changed.
- Remaining: full filesystem archive/consistency, coordinated activation and rollback, application UI, retention and validated backup requirements before destructive actions. Overall review objective remains active.

### Admin database-backup export

- Added a database-backup card before reset actions. It explains all-environment/database-only scope and separately required files/keys; requires scope acknowledgement, account password, optional active MFA code and matching archive passphrases. Secret inputs clear after every attempt and are not retained as React Query mutation variables.
- Admin export endpoint independently enforces scope, password, enabled MFA, passphrase bounds, rate limiting and one in-flight export. It rechecks account/session authorization before download, logs only archive scope/size, sends no-store attachments and removes its temporary encrypted archive afterward. The binary-download helper supports POST bodies so credentials do not appear in URLs.
- Fourteen focused backend backup/export tests passed after correcting an undersized synthetic MFA key. They cover permission/password/scope/MFA denial, successful MFA export, independent archive verification and secret-free audit metadata. Twenty API-client tests passed, including POST download body placement and object-URL cleanup. TypeScript and changed-file ESLint passed before the final test-only addition/backend MFA exception handling.
- First full backend pass had 633/634 passing with only the undersized MFA test key failing; corrected full regression is running. Browser validation of the new form, full filesystem backup/restore, retention and binding a current tested backup to reset remain open. No live credentials/accounts/archives or deployment changed.
- Corrected combined regression completed: all 634 backend tests passed. Overall original review goal remains active.

### Backup form browser validation and narrow layout

- Actual DatabaseBackupCard fixture verified disabled initial export, mismatched-passphrase feedback, exact-match activation with scope acknowledgement, and a simulated MFA rejection. After failure all four secret/code fields were empty, export was disabled again and the retry explanation remained visible.
- Checked 390×844 and 320×844 layouts. The 320-pixel check found a clipped download label; allowing the button to wrap and use available width fixed it. Rechecked the actual browser after the change. Evidence: verification/backup-form-fixture.html, backup-form-error.png and backup-form-mobile.png.
- TypeScript and component ESLint passed. All requests were synthetic; no account secret, live export or production data was used. Viewport restored, temporary frontend fixture removed and Vite stopped. Successful-download UI acceptance and full system recovery remain open; overall goal remains active.

### Recovery acceptance with the real Shipyard schema

- Added a separate-process recovery probe using the real schema/migration/seed and HTTP/WebSocket authentication modules. It restores two environments, a host, the admin role, encrypted SMTP configuration and enabled MFA from an archive created with synthetic data.
- The recovered database decrypts stored configuration with the original application key, rejects the pre-backup tracked token over HTTP and WebSocket, and permits a fresh password-plus-MFA login. Pending MFA enrollment is cleared. The source database retains its original token version.
- A second probe with the wrong application key confirms that the archive passphrase alone cannot recover encrypted settings or complete MFA login. No scheduler, actual app listener, remote client or live credentials are started/used.
- All 16 focused backup/export/recovery tests passed after correcting the probe's pending-secret accessor. This strengthens database recovery evidence; it does not prove full filesystem recovery, production activation or end-to-end application behavior. Those original requirements remain open. No deployment.

### Application recovery file staging

- Added recovery-root discovery for persistent data, configured playbooks/plugins/SSH/Git/state-backup locations, registered OpenTofu workspace paths and configured TLS files. Explicit configured/workspace roots are required; absent optional defaults are reported in the manifest.
- Private staging copies regular files with SHA-256/size/mode metadata, preserves empty directories and safe relative internal links, excludes caller-specified database/sidecar paths, rejects links escaping roots and special files, and refuses existing/in-source destinations. Detected file/directory changes abort and remove partial staging.
- Five isolated filesystem tests passed, including exact content/hash/link preservation, required/optional missing paths, overwrite/recursion refusal, configured/workspace path discovery and a real file append during streaming that triggers cleanup. No production paths were read or copied.
- This is an internal, unencrypted staging primitive, not an export endpoint or a completed system archive. Writers must be stopped for cross-file consistency. Still required: combine it with the consistent DB snapshot, encrypt/publish and verify the complete package, restore safely, handle configured symlink roots and coordinate activation/rollback. Overall review goal remains active.

### Encrypted application package creation and verification

- Combined consistent encrypted DB backup and recovery-file staging into a distinct authenticated application archive. Generic encryption framing was factored from the DB implementation without changing the DB archive magic/format. Creation requires an offline precondition, refuses destinations within source roots, excludes raw DB/sidecars and rejects observed database writes during capture.
- Added streaming framed-file packaging with per-file SHA-256, bounded metadata and a new-directory-only unpacker. Verification rejects traversal, duplicate paths, escaping links, symlink parents, checksums/truncation/trailing bytes; it independently verifies the embedded SQLite archive. Original manifest source paths are descriptive and never used as extraction destinations.
- CLI creates/verifies offline packages; docs/application-backup.md states captured paths, missing/default behavior, space requirements and external key/deployment/workload dependencies. The UI remains database-only. No claim of application activation or complete remote workload backup.
- All 26 focused backup/export/recovery/file/package tests passed, including encrypted package/CLI verification and abort on a database write during capture. Full backend regression is running after the encryption refactor. Synthetic local fixtures only; no production files captured or deployment changed.
- Remaining: application-package restoration and target review, configured symlink root handling, complete recovery acceptance, coordinated activation/rollback and UI/retention. Overall original goal remains active.
- Combined regression completed: all 646 backend tests passed, including existing DB backup/export compatibility after the shared encryption refactor. Goal remains active.

### Application-package restore preparation

- Added application restore service/CLI that verifies outer authentication, frame hashes, top-level manifest and exact file-manifest membership before preparing a new private recovery directory. Manifest root lists, file sizes/hashes/link targets and included/absent roots must agree; unknown, duplicate, missing or contradictory members are refused.
- Preparation restores the database with versioned-session invalidation, moves file roots into the new directory and writes a source-to-prepared-path review plan plus READY marker. Original paths are never used as destinations; existing recovery directories remain untouched. Ordinary failures remove newly owned partial output. Documentation explains interrupted preparations and remaining activation/rollback requirements.
- All 23 focused application/file/database tests passed. New cases cover actual restored file/database content, unchanged original playbooks, excluded raw DB sidecars, existing destination preservation, wrong-password cleanup, an authenticated but contradictory manifest and CLI restore. Full backend regression was also run for the changed package reader/verification flow.
- No live package or production file was restored. Root symlink support, coordinated activation/rollback, complete application recovery acceptance and UI remain open; overall original goal remains active.
- Combined regression completed: all 649 backend tests passed. No deployment; overall review remains in progress.

### Configured recovery root aliases

- Recovery staging now resolves explicitly configured root paths, allowing directory aliases and TLS file links while recording both configured source and resolved source. Nested links still obey the existing within-root policy. Retargeting a configured root during capture aborts and removes staging.
- Destination recursion checks use physical parent/source paths, including application-package creation. Database snapshot exclusions resolve the actual DB filename before deriving sidecar exclusions, preventing raw DB/WAL copies through aliases. Package manifest validation compares resolved-source metadata when present and remains compatible with earlier manifests lacking it.
- Seventeen focused recovery-file/application tests passed, including configured directory/file links, physical-path recursion refusal, aliased file exclusions, a root retarget during capture and a complete package/restore using an aliased SQLite connection. Source state files survive; raw SQLite files are absent from recovered file roots, and both paths are present in the review plan.
- Only synthetic temporary files were used. No live archive, restore or deployment. Coordinated activation/rollback, wider recovery acceptance and remaining review requirements stay open.

### Schedule reset stops future execution and rolls back failed deletions

- Environment-scoped schedule reset now commits schedule deletion, run-history deletion and its explicitly scoped audit entry in one SQLite transaction. Cron tasks are unregistered only after commit, so a failed history/audit write leaves both persisted schedules and their registered jobs intact.
- Scheduler callbacks recheck persisted existence/enabled state before broadcasting, creating history or starting work. This also prevents an already queued callback from starting a deleted/disabled schedule. The reset dialog explicitly states that already running work is not cancelled.
- Three new isolated regression cases cover real cron registration/removal and environment isolation, injected history/audit failures with retry, and queued callbacks after deletion/disabling. Full backend regression: 656 tests passed, zero failures; frontend TypeScript and changed-component ESLint passed.
- Synthetic temporary database and non-executed fixture schedules only. No live reset or deployment. This closes the scoped schedule-reset execution gap, not the outstanding combined-reset atomicity, backup preconditions or full application recovery requirements. Overall review goal remains active.

### Account and host resets preserve state on failed writes

- Account reset now puts user deletion (including cascaded sessions), legacy credential removal, stored signing-secret rotation, onboarding/MFA settings and its audit entry in one SQLite transaction. Host reset now includes its explicitly environment-scoped audit entry in the same transaction as host/inventory deletion.
- New temporary-database tests inject failures at credential deletion, late MFA-setting insertion and audit insertion, then compare complete users/sessions/settings/audit state and confirm continued authenticated access. Successful account reset removes accounts/sessions, preserves host records and attributes its audit entry to the former administrator. Tokens remain denied even with an unchanged external signing key and a recreated username.
- A host-reset regression verifies complete host/inventory rollback on audit failure and successful retry. All 46 reset/authentication/WebSocket regression tests passed. No frontend change in this step; no live resets, credentials or deployment used.
- Combined reset still spans database and filesystem operations and needs separate recovery/atomicity work. Fresh authorization, backup preconditions, full application recovery and other original review requirements remain open; overall goal stays active.

### Playbook staging and combined reset transaction

- Playbook reset now stages root-level user YAML files in a private directory before committing its audit/database work. Ordinary staging or transaction failures restore originals without overwriting a replacement file. Symlink/special playbook entries are refused before mutation. A post-commit cleanup error returns success plus an explicit warning, which the UI preserves and shows before any setup navigation.
- Combined reset now includes all its database changes, account/appearance changes, schedule history and accurate audit description in one transaction. It restores staged playbooks on database failure and unregisters all removed cron jobs after success. Reset and Ansible runner now honor the same configured playbook root as the editor/Git integration.
- Five new temporary-directory cases cover partial file-move failure, audit rollback/retry, combined-reset late failure and cross-environment success, private cleanup failure, and linked-file refusal. All 664 backend regression tests passed; frontend TypeScript and changed-component ESLint passed.
- Documented scope and manual interruption handling in docs/reset-recovery.md. Normal exception recovery is verified; process-crash atomicity/durable recovery journal is not implemented or claimed. Fresh authorization, backup preconditions and full application recovery remain open. No live resets, remote execution or deployment; original goal remains active.

### Fresh password and MFA authorization before every reset

- All five reset endpoints now require the current administrator password after phrase/scope validation, with the existing shared reset rate limit applied before password work. Enabled MFA requires a valid current authenticator code. After asynchronous password comparison, current role/disabled status, password hash, token version and tracked-session revocation are rechecked before any destructive work.
- Reset UI and typed API helpers send credentials in the request body. The UI requires a password, explains conditional MFA and clears password/code after every attempt or cancellation. Secrets remain local component state rather than mutation-cache variables.
- Four new isolated cases cover absent credentials for every reset action, wrong password, missing/malformed/valid MFA and role/password/token-version/session changes during comparison. Existing rollback/reset fixtures now supply real synthetic password hashes. All 668 backend tests passed; TypeScript and changed-file ESLint passed.
- Actual DangerTab browser fixture verified that a correct phrase alone leaves reset disabled, synthetic credentials enable it, and simulated rejection leaves both secret fields empty, the error visible and reset disabled. Evidence: verification/reset-credentials-fixture.html and reset-credentials-error.png. No actual reset request left the fixture; no live credentials used. Temporary Vite fixture removed.
- Recent verified-backup binding, durable interruption recovery and broader application recovery remain open. No deployment; overall original review goal stays active.

### Journaled recovery of interrupted playbook resets

- Staged resets now persist and fsync a private filename/hash journal before file moves. A journal-hash commit marker is written in the same SQLite transaction as the reset, bound to a persistent database identity. New playbook/combined resets refuse outstanding staging directories instead of proceeding over ambiguous leftovers.
- Added an explicit offline recovery CLI using the original database. Uncommitted operations restore checked files without overwriting replacements; committed operations clean staging only. Journals survive until staged-file cleanup finishes, and empty final directories can be cleaned on retry. Changed commit journals, mismatched databases and conflicting files fail closed.
- Six new isolated recovery cases include real child-process exits before commit, after commit and after final journal cleanup; conflict preservation and retry; changed journals/CLI offline requirement; and rejection of a different database. All 24 reset tests and the full 674-test backend regression passed.
- Updated docs/reset-recovery.md with invocation, original-database requirement and limits. This proves process-exit recovery at the tested boundaries, not power-loss atomicity, external-writer coordination or correctness with an older copy of the same database. Legacy invalid/missing journals still need manual review. No live reset/recovery or deployment.
- Recent verified-backup binding, complete application activation/rollback and the remaining original review scope stay open; overall goal remains active.

### Actionable UI for interrupted reset recovery

- Pending playbook staging and failed rollback now produce a typed recovery-required conflict (HTTP 409 with field=recovery), with a safe instruction to preserve files, stop writers and run offline recovery. Internal server paths are not exposed. Post-commit cleanup warnings direct administrators to the same procedure and explicitly discourage repeating the reset.
- The affected Danger Zone row replaces its confirmation/retry controls with persistent recovery guidance. Password/code still clear in the existing finally handler. Normal retryable errors retain their previous behavior.
- Two new route cases verify both affected reset endpoints leave state/audit untouched when recovery is pending, and that failed rollback retains staged originals that the offline procedure can recover. All 26 reset tests passed after the final warning change; frontend TypeScript and changed-component ESLint passed.
- Actual DangerTab browser fixture confirmed the recovery explanation replaces the form and its execute button. Evidence: verification/reset-recovery-fixture.html and reset-recovery-guidance.png. Requests and credentials were synthetic; no live reset, recovery or deployment. Overall review goal remains active with backup binding and wider recovery/product requirements still open.

### User role reassignment shows effective access changes

- Editing a user's role now displays the current-versus-selected effective access: administrator status, host/group selections, playbook/plugin selections and changed capability grants. Comparison normalizes order, duplicates and numeric/string identifiers, detects same-count selection changes and respects full administrator access even when individual stored flags differ.
- Creating/reassigning an account requires available effective permission details; changing access is disabled when either role cannot be compared. Profile-only edits keep their existing path. Resource identifiers are explicitly identified as such; friendly-name resolution and comparison while editing a shared role itself remain separate follow-up work.
- Four focused comparison/rendering tests passed, including same-count changes, normalization, full-access revocation and unavailable-data handling. TypeScript and changed-file ESLint passed. Actual UsersRolesTab browser fixture showed added terminal/update rights and widened host/playbook scope, then disabled Save for an unavailable role. No save or real account change occurred.
- Evidence: verification/role-access-fixture.html, role-access-changes.png and role-access-unavailable.png. Temporary frontend fixture removed. No deployment; broader F30 enterprise requirements and the original full review goal remain active.

### Shared role editing compares access and preserves explicit denials

- Shared-role editing now initializes from backend-resolved effective permissions and shows saved-versus-proposed scope/capability changes plus the number of assigned users, including disabled accounts. User inventory load failures participate in the existing reference-data retry state. Saving an existing role without effective permission details is blocked.
- Fixed a privilege-widening editor bug: the legacy canManageDeployments umbrella previously re-enabled explicitly false granular deployment rights. The editor now uses the backend's resolved booleans and persists explicit grants. The migration-only umbrella is excluded from human-facing rights diffs because enforcement uses granular rights.
- Custom-role list summaries now use effective scopes. Missing permission details show an unavailable message rather than falsely claiming all hosts/playbooks/plugins.
- Five focused frontend tests passed, including explicit denial under the legacy umbrella. TypeScript and changed-file ESLint passed after the final list fix. Actual role editor fixture started with no effective changes, showed Apply deployment plans unchecked, and displayed the deliberate terminal grant with one assigned user; no role was saved. Evidence: verification/role-edit-fixture.html and shared-role-access-changes.png.
- No live permission changes or deployment. Friendly resource names, concurrent role-edit protection and broader enterprise identity requirements remain open alongside the original review scope.

### Reviewed role revisions prevent stale permission overwrites

- Role responses include a content revision covering identity, name, persisted permissions and built-in status. PUT/DELETE now require that revision (428 if absent, 409 if stale), check it under an immediate SQLite transaction, and commit the role change together with its audit entry. Assigned-role and built-in restrictions remain enforced.
- Frontend edit/delete requests send the reviewed revision. Edit conflicts retain the unsaved draft, refresh the underlying role inventory and disable repeat Save until the dialog is reopened; the error remains outside the long scrolling form. Delete conflicts refresh inventory and close the stale confirmation. External API clients must also send the revision returned by GET /roles.
- Three new isolated route tests cover stale/missing edit/delete revisions, fresh reload/delete, audit rollback and assigned-role protection. Full backend regression: 679 tests passed. TypeScript and changed-file ESLint passed after the final error-layout adjustment.
- Actual role editor fixture returned a simulated revision conflict: draft text survived, Save was disabled, the error was visible above the footer, and cancelling exposed the refreshed remote role name. Evidence: verification/role-conflict-fixture.html and role-revision-conflict.png. No actual role or permission changed; temporary fixture removed.
- No deployment. Concurrent changes to a role during user assignment, friendly resource labels and wider enterprise identity/recovery requirements remain open; original review goal stays active.

### User assignment is bound to the reviewed role

- Account creation now requires an explicit valid role and its roleRevision; the backend no longer silently defaults missing roles to broad User access. The selected role is checked before password hashing and again inside the creation/audit transaction after hashing.
- Role changes on existing accounts require expectedRole plus the destination roleRevision. Current-user role comparison, selected-role revision verification, token-version increment, account update and audit commit run in one immediate transaction. Profile-only changes keep their existing path; self-demotion and last-active-admin checks remain enforced.
- Frontend user forms send the role binding, preserve selections on conflict, refresh user/role inventories and block repeated saving until reopening. Browser validation caught and corrected a camel-case error-field identifier discarded by the API client: the conflict now uses role_revision.
- Four new isolated cases cover missing/stale roles, role mutation during hashing, stale current/destination roles, audit rollback including token revocation, successful assignment and profile-only edit. Full backend regression passed 683 tests before the final error-field correction; all four focused assignment tests passed afterward. Final TypeScript and changed-file ESLint passed.
- Actual user-form fixture validates both expectedRole and roleRevision in the request, then returns a synthetic conflict. Final browser state retained Operator selection and disabled Save. Evidence: verification/assignment-conflict-fixture.html and user-role-conflict.png. No real account or permission changed; no deployment. Other original review requirements remain open.

### Atomic account security actions

- Account enable/disable, session revocation, password reset, MFA removal and account deletion now commit their database changes together with the audit entry in an immediate transaction. An audit failure rolls back account fields, token versions and cascading session deletion.
- The acting administrator is revalidated inside account mutation transactions, including account creation after asynchronous password hashing. Password reset also rechecks the target after hashing and rejects a deleted target or a changed token version. Self-disable/delete and last-active-administrator protections run under the same transaction.
- Three new isolated tests cover rollback and successful retry for all six actions, administrator suspension during hashing, and target modification/deletion during hashing. Existing security and assignment checks passed; the final full backend suite passed all 686 tests. Scoped git diff whitespace validation passed.
- Tests use temporary databases and synthetic password hashing. No live account changes or deployment occurred. This does not establish immediate WebSocket disconnection; existing session revalidation applies. Verified-backup binding, complete recovery activation/rollback and the remaining original review requirements remain open.

### Named resources in access-change previews

- Shared role editing and user role reassignment now resolve host/group/plugin names from the existing inventories and show playbook filenames. Identifiers remain alongside names to distinguish same-name resources; unresolved selections remain explicit rather than disappearing.
- Both forms share environment-scoped inventory queries. Resources outside the selected environment or unavailable inventories retain a clearly marked identifier fallback. The comparison still detects same-count and same-name selection changes and preserves normalized identifier semantics.
- Seven focused comparison/rendering tests passed, including duplicate names, all four resource kinds, unresolved identifiers and HTML escaping. Frontend TypeScript, changed-file ESLint and scoped whitespace checks passed. Long identifiers can wrap anywhere in the preview.
- No browser visual verification or deployment in this increment; live appearance and cross-environment naming remain unverified. This is further progress on role-review clarity, not completion of the entire review.

### Browser verification and persistent user-dialog actions

- Browser verification of the actual UsersRolesTab revealed that expanded access changes pushed the user dialog actions below the viewport. The form body now scrolls independently; title, actions and mutation errors remain outside the scrolling area. Errors use an alert role.
- A synthetic inventory fixture confirmed the group name Operations team and its stored identifier appear together during reassignment. A simulated failed save preserves the selected role and shows the error above visible Cancel/Save buttons. No real API writes were made.
- Evidence: verification/named-access-fixture.html, named-access-changes.png and user-dialog-error-footer.png, captured at 1280×720. TypeScript, changed-file ESLint and all seven focused access-comparison tests passed. The temporary frontend fixture was removed.
- This verifies the desktop user-assignment dialog only; shared-role/mobile appearance, live deployment and the wider review remain open.

### Concrete resource scope before creating an account

- Replaced the user form's count-only effective-access summary with a reusable named resource summary. New accounts and unchanged role selections now show specific host/group, playbook and plugin selections alongside sensitive capabilities. Administrator access and unavailable permission details retain explicit separate states.
- Three additional rendering tests cover concrete names across resource kinds, explicit sensitive grants, missing permission data and full administrator scope. All ten comparison/summary tests, TypeScript and changed-file ESLint passed.
- Actual UsersRolesTab browser fixture confirmed Create is disabled before role selection, and selecting Viewer shows Operations team, inspect.yml and no sensitive grants. Screenshot: verification/new-user-resource-summary.png; fixture: verification/named-access-fixture.html. No account creation was performed. Temporary frontend fixture removed.
- Local implementation only. Mobile/shared-role verification, wider role preset integration and remaining review scope remain open.

### Role preset guidance during account creation

- Added an optional preset chooser to account creation. Viewer, Operator, Maintainer and Power user describe their purpose and offer existing roles whose effective granted capabilities match exactly. Selecting a suggestion only selects that role; it does not alter shared permissions. Resource scope remains explicitly reviewed in the summary.
- Matching rejects unknown permission details, administrator/full access and additional capability grants, including future grants not in the current preset. It ignores the migration-only deployment umbrella. Roles with narrower resource selections can match the capability preset and show their actual selections below.
- Missing matches explain that the role must be created from the preset in Role Management. Corrected Operator wording from approved playbooks to selected playbooks because this preset does not establish an approval workflow.
- All eleven focused tests, TypeScript and changed-file ESLint passed. New coverage checks exact grants, excess/unknown grants, full access, unavailable permissions and resource-scope independence. Browser verification of the new preset chooser remains pending; no deployment or real role changes. Overall review remains active.

### Browser evidence for capability-based preset selection

- Verified the actual account-creation dialog with two synthetic roles: Inventory observer has exactly the Viewer preset grants with restricted resources; Viewer has those grants plus terminal access. The chooser offers only Inventory observer, demonstrating that matching is based on permissions rather than the displayed name.
- Clicking the recommendation selected the correct role in the normal role selector and exposed Operations team, inspect.yml and no sensitive grants. Unmatched presets explained the Role Management path; Create/Cancel remained visible with the expanded guide and summary.
- Evidence: verification/preset-review-fixture.html and preset-role-selection.png at 1280×720. No account was created and no shared role changed. The temporary frontend fixture was removed. This closes the pending desktop preset interaction check; mobile verification, live rollout and the remaining original review requirements stay open.

### Historical role changes in the audit log

- Role creation, update and deletion now record structured before/after effective-permission changes and the persisted role name/identifier. Update snapshots are captured inside the same transaction as the mutation; deletion captures the state before removing the role. The migration-only deployment umbrella is excluded from the human-facing diff.
- Audit Log recognizes these versioned records and renders an expandable Before/After list without querying a currently existing role. Legacy or malformed records retain the existing detail renderer. Role creation and its audit entry now commit atomically, matching edit/delete guarantees.
- Two additional backend cases verify retained names and permission/scope changes after deletion, and rollback of creation when the audit write fails. All 688 backend tests passed. Two new frontend cases cover historical rendering/escaping and malformed/legacy fallback; all 30 targeted audit/contract tests, TypeScript and changed-file ESLint passed.
- No live roles changed or deployment. Browser visual verification of the new audit diff remains pending. This supplies role-event diffs only; user-event and other resource-event diff coverage and the remaining original review scope stay open.

### Readable role audit scopes and browser evidence

- Browser inspection of the actual AuditTableRow and AuditMobileRow exposed raw JSON resource scopes in the new diff. Known host/group and playbook/plugin selections now render as labeled lists; all-scope values use resource-specific language. Unknown historical shapes remain verbatim, preserving evidence.
- A new formatting case covers comma-containing identifiers, empty selections and malformed/future values. All eight targeted audit tests, TypeScript and changed-file ESLint passed.
- Browser evidence: verification/role-audit-fixture.html and role-audit-before-after.png. Both expanded components show before/after name, terminal and host changes; a 320-pixel-wide card wraps a long identifier. A legacy text record remains readable. This is component-level desktop/constrained-width evidence, not a whole-page mobile acceptance test.
- No production writes or deployment; temporary fixture removed. Additional event-type diffs and the wider original review remain open.

### Historical account changes without credential disclosure

- All administrator account mutation routes now emit structured user-change audit records in their existing transactions. Snapshots explicitly allow only username, display name, email, role name/identifier, account status and MFA enabled state. Deleted accounts retain their last username and identifier. Password reset and explicit session revocation record descriptive events rather than credential values.
- The existing expandable audit diff accepts versioned user-change records as well as role-change records. This keeps historical rendering independent of current user/role inventories and preserves legacy fallback behavior.
- Added an end-to-end isolated account lifecycle case checking creation, rename/reassignment, suspension, MFA removal, password replacement and deletion, plus an assertion excluding test passwords, hashes and MFA secrets from all stored audit details. Existing mutation rollback tests remain green. Full backend: 689 tests passed. Nine targeted frontend audit tests, TypeScript, changed-file ESLint and whitespace checks passed.
- No production account changes or deployment. Browser evidence for user-specific records remains pending; other resource-event diffs and the rest of the original review remain open.

### User audit browser evidence and explicit action labels

- Added explicit human-readable labels for account enable/disable, password reset, MFA removal and session revocation, replacing the generic event-code fallback for these routes.
- Actual AuditTableRow/AuditMobileRow fixture verified expanded password/session and MFA transitions with a historical account identity. The 320-pixel-wide card wraps the identifier and keeps the changes readable. Evidence: verification/user-audit-fixture.html and user-audit-before-after.png.
- All nine targeted audit tests, TypeScript and changed-file ESLint passed. Label tests now cover all five security actions. No live account mutations or deployment; temporary fixture removed. This completes the pending user-record component rendering check, not the full-page mobile/live or remaining original review scope.

### Audit export preserves change evidence and treats formulas as text

- CSV exports retain the original six columns and append Object ID, Object name and Changes for recognized role/user change records. Original structured Details remain included; historical changes are readable outside the application. Legacy/unrecognized records leave the added columns empty.
- All CSV cells neutralize spreadsheet-formula prefixes, including leading whitespace/control characters; quoting still preserves delimiters, quotes and multiline values. Export help explains the extra evidence columns and text handling.
- Export auditing now happens before download headers/body are sent. An audit failure returns an ordinary error rather than delivering an unrecorded download or attempting a second response after success.
- Added two serialization cases and a route failure case; full backend regression passed all 692 tests, including existing scoped search/export and size-limit checks. Frontend TypeScript, changed-file ESLint and whitespace checks passed. No real audit export or deployment was performed. Full spreadsheet-client import and browser wording verification remain unverified; broader review scope remains open.

### Maintenance history survives edits, cancellation and deletion

- Maintenance creation/update/cancellation/deletion now write versioned before/after audit records within their existing transactions. Explicit fields include UTC start/end, timezone, owner, change reference, impact, description, named hosts with IDs, series metadata and cancellation metadata. Creation emits a record for each persisted occurrence.
- The shared audit detail renderer and CSV historical columns now accept maintenance-change records; export guidance includes maintenance. Historical host labels and window identity are preserved in the audit payload rather than resolved when reading it.
- An isolated lifecycle test verifies change reference/time edits, cancellation reason and preserved host/name evidence after deletion. An export case verifies maintenance historical columns, and a rendering case verifies UTC and cancellation details. Full backend: 694 tests passed. Five audit renderer tests, TypeScript (before the final test/help-text additions), final changed-file ESLint and whitespace checks passed.
- No real maintenance changes or deployment. Browser verification of maintenance-specific records remains pending. Additional event-type coverage and the remaining original review requirements remain open.

### Host-scoped maintenance audit visibility

- Maintenance audit payloads now store explicit environment, all-host scope and the union of before/after host IDs. Host-restricted readers must currently access every referenced host; environment-wide or missing/unrecognized scopes are denied. Text and names do not establish authorization.
- Account/role event text can no longer accidentally establish host-scoped visibility through legacy server-reference matching. Existing full/all-host audit access is unchanged.
- A route case verifies accessible list/count/export, hidden prior-resource and environment-wide changes, mismatched environment metadata, missing scope, misleading account/role text and visibility after a host rename. All 24 focused maintenance/audit tests and the complete 695-test backend suite passed. Whitespace validation passed.
- Added docs/audit-log.md describing snapshots, access behavior, legacy limits, export format and retention. No production changes or deployment. Maintenance browser rendering and broader original review scope remain open.

### Consistent maintenance audit times and browser verification

- Maintenance audit start/end/cancellation instants now use the shared Europe/Zurich formatter with seconds. UI headings no longer incorrectly label converted values as UTC; original UTC values remain in tooltips and unchanged exports. Non-date and unrecognized values are preserved.
- All 18 targeted date/audit rendering tests passed, including winter/summer offsets and non-date preservation. TypeScript, changed-file ESLint and whitespace checks passed.
- Browser fixture using actual AuditTableRow and a 320-pixel AuditMobileRow confirms the changed end time (12:00 to 13:30 Europe/Zurich), change reference and named host transitions are readable. Evidence: verification/maintenance-audit-fixture.html and maintenance-audit-before-after.png. Legacy text remains visible. Temporary frontend fixture removed; no live changes or deployment.
- This verifies maintenance audit components, not whole-page mobile acceptance or completion of all original review requirements. Overall goal remains active.

### Reauthentication for SSH private-key export (F29)

- Private-key export now requires the administrator's current password and, when enabled, a valid authenticator code before reading key material. The existing reset credential checks were extracted into a reusable administrator-credential middleware while preserving reset behavior and concurrent authorization/session rechecks.
- Export has a dedicated ten-attempt/15-minute limiter with export-specific messaging. Successful key responses use Cache-Control: no-store. Export audit details contain no password, code, passphrase or key material.
- The export dialog distinguishes account password, MFA code and optional file passphrase; account password is required. Sensitive values clear after an attempt or cancellation, and close/cancel is blocked while export is pending. Removed a duplicate Enter-key submission path.
- Two new route cases use a synthetic key exporter and temporary database to verify missing/wrong password, missing/invalid MFA, valid export, no-store, absence of secrets in audit and administrator suspension during password verification. All 697 backend tests passed, including reset regression. TypeScript, changed-file ESLint, 23 frontend contract tests and whitespace checks passed.
- No actual private key was read/exported and no deployment occurred. Browser verification of the expanded dialog remains pending; broader SSH lifecycle and the remaining original review scope remain open. External API clients must now provide password and optional code alongside passphrase.

### SSH export dialog verification and persistent errors

- Actual SshTab browser testing confirmed account password, MFA code and file passphrase are sent separately and clear after a rejected export. Replaced transient toast-only export errors with a persistent in-dialog alert; local passphrase mismatch uses the same location. Removed duplicated explanatory text while retaining the explicit unprotected-export explanation.
- Browser fixture validates synthetic request fields and returns an expired-code error. The error remains visible above a disabled Export button with all fields empty. Entering a new password, cancelling and reopening clears both the password and prior error.
- Evidence: verification/ssh-export-fixture.html and ssh-export-credentials-error.png. TypeScript, changed-file ESLint and all 23 frontend contract tests passed. No real key was read or exported; temporary frontend fixture removed.
- This verifies the desktop export failure/cancel paths. Whole-page mobile checks, broader key lifecycle and remaining original review scope stay open; no deployment.

### Failed SSH imports preserve the active key

- Review of key replacement uncovered a destructive validation order: repeated imports wrote to the active fixed filename before validating the candidate. Imports now validate and optionally decrypt/re-encrypt in a unique owner-private candidate directory. Existing key files remain untouched until the new database record and import audit commit together.
- Failed validation, passphrase removal, encryption or audit/database commit removes only the owned candidate directory. Old managed key files are removed after commit; external paths retain their existing protection. Consumers use the recorded private-key path, and the passphrase-removal test now resolves that path rather than assuming a fixed filename.
- New cases cover same-name invalid reimport, audit rollback, candidate cleanup and encrypted-at-rest key preservation under a wrong passphrase. All ten SSH-manager tests and the complete 699-test backend suite passed. Whitespace validation passed. Test keys/directories were synthetic; no live key was imported or replaced.
- This proves ordinary failure rollback, not power-loss/process-crash recovery or coordinated remote key rotation. Replacement impact/identity review, full lifecycle handling and remaining original review scope stay open; no deployment.

### Review and bind SSH key replacement before activation

- Added a read-only import preview endpoint that validates a candidate in a private temporary directory, returns current/candidate public identities, removes candidate files and sets no-store. Input is bounded to 64 KiB; preview/import use the bounded key-operation limiter.
- Import requires the reviewed active key ID (explicit null when absent) and candidate fingerprint. Both are checked inside the replacement transaction before changing the database; stale/current or changed-candidate identities fail with 409 and preserve active material. Missing bindings fail with 428.
- The import dialog now separates Preview from Replace/Activate, displays both fingerprints and explains central-key impact, remote trust preparation, recovery copy and the absence of automatic remote distribution/revocation. Errors clear sensitive passphrase and invalidate the preview. Removed duplicate Enter submission; pending work blocks dismissal.
- A new isolated route case verifies preview leaves active state/files unchanged, rejects both stale identities, accepts a fresh review and rejects reuse after activation. Full backend: 700 tests passed. TypeScript, changed-file ESLint, 23 frontend contract tests and whitespace checks passed. Added docs/ssh-key-import.md with the API flow and limitations.
- Only synthetic keys in temporary directories were used. No live import/deployment. Browser verification of the replacement review, coordinated rotation/recovery and remaining review requirements stay open.

### Browser verification of SSH replacement review

- Exported the import dialog for direct component verification and applied destructive styling only when replacing an existing key. Initial activation retains ordinary primary styling.
- Browser fixture confirmed current/candidate fingerprints and central-key impact warnings, then validated expectedKeyId/expectedFingerprint in the simulated activation request. A 409 conflict clears the passphrase, removes the stale review and returns to Preview key with an inline error. A new preview restores the review; the final Replace key button is visibly critical.
- Evidence: verification/ssh-import-fixture.html, ssh-import-review.png and ssh-import-conflict.png. TypeScript, changed-file ESLint and 23 frontend contract tests passed. All inputs and responses were synthetic; no real key import. Temporary frontend fixture removed.
- This verifies desktop dialog behavior. File-picker integration, whole-page mobile, coordinated remote rotation and remaining original review scope stay open; no deployment.

### Prepare remote trust from the candidate public key

- Import preview now returns the derived public key alongside its fingerprint. The dialog exposes it in a read-only preparation field with a copy action, without activating the key or contacting hosts. Clipboard failure leaves a manual selection/copy fallback.
- Backend verification compares the candidate public key with the generated fixture's public key and still checks unchanged active state and candidate cleanup. All eleven targeted SSH manager/import tests passed. Final TypeScript, changed-file ESLint and 23 frontend contract tests passed.
- Browser inspection exposed a clipped footer when the preparation section was expanded. The form body now scrolls independently of the title/actions. Final evidence: verification/ssh-import-public-key.png and updated ssh-import-fixture.html. The public value and all three actions are visible at 1280×720. Clipboard integration itself was not exercised.
- Temporary frontend fixture removed. No real keys, remote authorized_keys or deployment changed. Coordinated remote rotation and remaining original review scope remain open.

### Historical SSH key identities in audit and export

- Successful key import now records old/new key IDs, names, algorithms and fingerprints in its replacement transaction. Snapshot fields are explicitly selected; private keys, passphrases and internal paths are not copied. The callback receives the actual active record inside the transaction rather than relying on the preview.
- The existing structured audit renderer and historical CSV columns accept ssh-key-change records. Import/export have explicit readable action labels and appear in the default change-focused audit view. Export help and audit/import docs describe the additional coverage.
- Extended the real synthetic-key route case to verify previous/new fingerprints and IDs. Added export/focus cases and a frontend historical-fingerprint rendering case. Full backend: 702 tests passed. Twelve targeted frontend audit tests, TypeScript, changed-file ESLint and whitespace checks passed.
- No real key changes or deployment. SSH-specific audit browser rendering and broader key lifecycle/review requirements remain open.

### Browser evidence for SSH key audit history

- Verified the actual AuditTableRow and a 320-pixel AuditMobileRow with a synthetic key replacement record. Old/new key IDs and long fingerprints remain fully readable; the narrow card wraps without clipping. The legacy export detail and explicit import/export action names still render correctly.
- Evidence: verification/ssh-audit-fixture.html and ssh-audit-history.png. This was a read-only component fixture with synthetic public identifiers and no key material. No live export/import, backend changes or deployment; temporary frontend fixture removed.
- This closes the pending SSH-specific audit component rendering check. Whole-page mobile checks, coordinated rotation and the remaining original review scope are still open.

### Ansible variable values no longer travel in process arguments

- Review of F16 execution found stored secrets included directly in ansible-playbook's JSON -e argument. The runner now writes merged variables into a unique 0700 temporary directory with a 0600 JSON file and passes only @file to Ansible. Finally cleanup removes the directory on completion or ordinary failure while preserving SSH-key/inventory cleanup.
- Expanded the runner test to inspect the actual temporary file during the mocked spawn: secrets are absent from argv, permissions are private, values match and files disappear afterward. A new failure case confirms native number/boolean/JSON values, run-specific override precedence and cleanup after a spawn error.
- All eight runner tests and the complete 703-test backend suite passed. Whitespace validation passed. No actual playbook or remote command ran; tests use mocked process execution and temporary data.
- This verifies the serialized Ansible input boundary, not a real Ansible execution. Process-crash residue handling, complete output redaction and remaining F16/browser/full-review scope remain open; no deployment.

### Secret masking across process-output boundaries

- Replaced per-chunk literal replacement with separate streaming redactors for stdout/stderr. Possible secret prefixes are retained until enough text arrives; longer overlapping secrets take precedence. Remaining ordinary text flushes when the process finishes or rejects. Final result strings use the same matching behavior.
- The runner includes effective string overrides of stored secret keys in its masking set. Child pipes use UTF-8 stream decoding to avoid independently decoding partial multibyte characters.
- New helper cases exercise every split position, character-by-character Unicode, regex-like characters, duplicate/empty entries and overlapping prefixes. A runner case interleaves stdout/stderr fragments containing both stored and overridden values and checks live/final output equality. All eleven targeted cases and the complete 706-test backend suite passed. Whitespace checks passed; no real playbook/remote execution.
- This masks literal known secret strings, not arbitrary encodings, transformations or all data a playbook might expose. Process-crash temporary-file handling and the remaining F16/full-review scope stay open; no deployment.

### Variable draft lifecycle and browser verification

- F16: Prevented a pending save from closing a replacement draft: Add/Edit entry points and the form fieldset are disabled during saving, with a visible Saving state. Failed saves retain the draft; opening another draft resets previous mutation feedback.
- Successful saves and confirmed cancellation clear the component's draft fields, including the secret value. This is React state cleanup, not a claim of secure browser-memory erasure.
- Browser verification used the actual VarsTab with a local synthetic fetch fixture: secret-on default, masked stored value and overdue advisory, disabled pending inputs, delayed 409 with persistent inline feedback, successful retry and empty follow-up draft, and multiline JSON selection. Screenshots: verification/variables-save-error.png and verification/variables-json-input.png; reproducible fixture: verification/variables-review-fixture.html.
- TypeScript project check and targeted ESLint passed. No production variables or infrastructure were changed. Full F16 end-to-end execution and the remaining review requirements remain open.

### Real Ansible verification of variable transport

- F16: Added server/test/integration/ansible-variables.test.js and the server test:ansible-integration script. This starts the installed ansible-playbook binary through the production runner against implicit localhost, with connection: local, gather_facts: false and only built-in assert/debug tasks. Database, encryption key, playbook, configuration and SSH directory are temporary synthetic fixtures; no real credentials or remote inventory are used.
- The playbook asserts native number, Boolean, JSON mapping/nested Boolean and text types, explicit run override precedence and exclusion of another environment's variable. It deliberately emits synthetic stored and overridden secrets, then checks that both streamed and collected output contain masks and no known credential text.
- Verification: the actual integration test passed (1 passed, 0 skipped), closing the previously missing real-Ansible transport check. The focused variable API/runner/redaction suite also passed. This does not prove every browser workflow, transformed-secret redaction, process-crash cleanup or completion of the full review.
- Run from repository root: node --test server/test/integration/ansible-variables.test.js. Requires ansible-playbook on PATH; missing installation is explicitly reported as skipped and must not be counted as verified integration coverage.

### Structured variables and visible safeguards for ad-hoc runs, 2026-09-11

- F15: Replaced the raw JSON extra-variable field with repeatable key/type/value rows. Text, finite number, Boolean and JSON values are converted to native values; invalid keys, duplicates, invalid numbers and malformed JSON stop the review with a field-area explanation naming the affected key.
- `localhost` now states that execution occurs inside the Shipyard runtime. Dry run moved out of collapsed advanced options and explains Ansible check mode/diff. The persistent target preview and final review continue to show exact hosts, live-versus-dry-run mode, concurrency, inherited variables, masked inherited secrets and run-specific overrides before execution.
- Verification: six focused frontend tests passed, including the new parser tests and shared target selection utilities. TypeScript and scoped ESLint passed. The actual `QuickRunTab` fixture verified two targets including localhost, a typed number, visible Dry run and the merged review dialog. Screenshots: `verification/playbook-run-structured-final.png` and `playbook-run-review-final.png`; fixture/check: `f15-run-fixture.html` and `f15-closure-check.cjs`. Sixteen focused backend tests passed for runner input, variable masking/types/history and workflow target identity. All browser/controller data were synthetic; no playbook was launched on a remote host.

### Schedule maintenance planning context

- F17: The next-three-start preview now checks maintenance coverage for the selected current inventory hosts. Each start shows covered/total targets, uncovered host names, matching window names/end times and unresolved targets such as localhost. Matching uses stable host IDs, the draft environment, inclusive start/exclusive end, and excludes cancelled windows. Multiple windows combine without double-counting hosts.
- Permission-gated maintenance reads expose loading, unavailable/error/retry and last-checked states. The preview is hidden after an environment switch so another environment's inventory cannot be assessed against the draft windows. Copy distinguishes start coverage from full-duration coverage and explains that maintenance does not gate or stop schedule execution; future dynamic inventory can change coverage.
- Clarified current scheduler behavior: overlap skips the occurrence for that same schedule without queuing, and failed runs have no automatic retry.
- Verification: three focused coverage tests, TypeScript project check and changed-file ESLint passed. Actual component browser fixture verified 1/2 coverage followed by two uncovered starts, with named windows and uncovered hosts. Evidence: verification/schedule-maintenance-fixture.html and schedule-maintenance-coverage.png. No live schedule/window mutation or deployment. Configurable execution policies and complete end-to-end schedule verification remain open.

### Durable history for overlapping schedule occurrences

- F17: An occurrence skipped because the same schedule is already running now records a terminal `skipped` workflow-history entry with explicit no-queue/no-retry explanation, scheduled target identities, environment and dry-run context. The entry is written transactionally and emits a separate schedule_skipped event. It does not change last_run/last_status or the active execution.
- Skipped occurrences participate in the existing per-environment 200-terminal-entry retention policy. Workflow history, execution detail and operations show the readable Skipped label with neutral status styling.
- Verification: a controlled scheduler callback test holds one mocked execution active, triggers another occurrence, checks durable history and that only one run starts, then injects a history write failure to verify rollback and successful completion of the original execution. Retention coverage now includes skipped rows. Full backend suite: 707 passed; TypeScript and changed-file ESLint passed. No real schedule or remote execution; configurable retry/overlap policies and remaining review work stay open.

### Reachable retained workflow history and status filtering

- F17/workflow history: Replaced the UI's fixed newest-100 slice with 25-row server pagination and a status filter including Skipped. Existing non-paged array consumers remain compatible. Authorization precedes status filtering, counting and slicing; equal timestamps use rowid as a deterministic tie-breaker. Invalid pages/statuses are rejected.
- Filter/environment changes reset the page; shrinking retention bounds clamp an out-of-range page. Idle history refreshes every 15 seconds to discover new occurrences; visible active rows keep the existing 2-second cadence. Retention copy explicitly includes skipped occurrences.
- Verification: new API tests navigate all 130 permitted skipped rows despite 30 newer restricted rows, exclude another environment, verify tied timestamps without duplicate rows, filtered totals, legacy arrays and invalid parameters. Full backend suite 709 passed; TypeScript and targeted ESLint passed. Actual HistoryTab fixture confirms page two contains only row 26 and filtering Skipped resets to page one with one result. Evidence: verification/history-pagination-fixture.html and history-skipped-filter.png. Pagination is a live view, not an immutable snapshot while new rows arrive. No production mutations/deployment; full review remains open.

### Transactional schedule mutations and audit history

- F17/change traceability: Create, update, toggle and delete now commit their persisted schedule change together with the audit entry. Cron reload/unregister occurs only after that transaction succeeds. An audit failure no longer leaves a changed/deleted schedule or prematurely destroys its cron registration.
- New route tests inject audit-trigger failures for all four actions, verify creation leaves no row/runtime reload, and verify update/toggle/delete preserve the full original row and real cron next-run registration. Successful toggle/delete remain functional and audited. Full backend suite: 711 passed.
- This addresses database/audit atomicity. Failure of cron registration after a successful database commit still needs separate runtime reconciliation and user-visible status; the full review remains open. Tests use isolated SQLite and far-future cron registrations with no remote execution or deployment.

### Saved schedule registration status and recovery

- F17: Schedule responses now distinguish paused, registered and unregistered runtime state. A registration exception after committed create/update/toggle returns the saved resource with its unregistered state instead of a generic write failure. Server-side errors remain logged. Registration removes stale destroyed map entries before attempting replacement.
- The list shows an enabled but unregistered schedule as saved/not automatic and offers a permission-checked retry. Retry is scope-checked, audited, rejects paused schedules and is idempotent for an already registered schedule; persistent failure returns a descriptive 503. UI retains retry errors inline.
- Controlled real-cron tests fail task.start after validation: creation remains saved, list reports unregistered, retry failure does not duplicate rows, restoring task.start permits recovery, repeated retry preserves registration, and paused retry is rejected. Full backend suite 712 passed; TypeScript and changed-file ESLint passed. Browser verification of this new warning/recovery control remains open. No live cron mutation or deployment.

### Browser verification of registration recovery

- F17: Actual SchedulesTab fixture now verifies the saved/unregistered row, disabled Retrying state, persistent 503 feedback and successful retry replacing the warning with the next scheduled time. Screenshots: verification/schedule-registration-error.png and schedule-registration-recovered.png; fixture: verification/schedule-registration-fixture.html.
- Fixed contradictory Next run pending text for known unregistered schedules. Retry requests and cache invalidation now capture their original environment; inline errors are matched to both schedule ID and environment.
- TypeScript and targeted ESLint passed. The browser used synthetic responses only; no live schedule registration was changed. Other review requirements remain open.

### Maintenance preview identity and access failure handling

- F17: Maintenance coverage no longer chooses the first of multiple inventory hosts with the same execution name. Ambiguous names and explicitly foreign-environment hosts remain unresolved, including under environment-wide windows.
- Profile loading, profile retrieval failure and missing maintenance permission are now distinct states. Failed access checks hide coverage and cached checked-time information and offer a retry instead of incorrectly claiming permission denial.
- Verification: four coverage tests, TypeScript and targeted ESLint passed. Actual component fixture confirms profile 503 shows only access-failure guidance, then retry loads the expected 1/2 coverage. Evidence: verification/maintenance-access-fixture.html and maintenance-access-error.png. Synthetic browser transport only; no production changes. Full review remains open.

### Historical schedule filters survive deletion

- Workflow-history filter options now come from all retained, authorized entries before current status/schedule filtering. Deleted schedules remain selectable by their stored historical names and are marked deleted in both filter and row. Duplicate names include short IDs for disambiguation; full IDs remain available as option titles. This removes dependence on the current schedules list for historical navigation.
- New API coverage creates/deletes a schedule, verifies retained filtering and verifies that an inaccessible playbook's schedule name is absent even from filter metadata. Three targeted pagination/history tests, TypeScript and ESLint passed. Actual HistoryTab fixture confirms selecting the deleted schedule and its row marker; verification/history-deleted-fixture.html and history-deleted-schedule.png.
- No production changes. Filter options intentionally describe retained authorized history; schedules without retained visible runs are not listed. Full review remains open.

### Explicit schedule input validation

- F17: Schedule create/update APIs reject non-integer, out-of-range or nonnumeric parallel-host settings instead of silently clamping/coercing them. Optional extra variables must be an object, not falsy scalar/null input; numbers must be finite.
- Schedule form preserves entered parallelism for validation rather than silently rewriting it. Its pre-submit extra-variable check now matches the API's flat string/finite-number/Boolean object and 4,096-character bound. Both errors remain inline in the dialog.
- Verification: four schedule-route tests passed, including invalid inputs on create and update, unchanged stored parallelism after rejection, and successful valid boundary/typed-value update. TypeScript and targeted ESLint passed. Browser verification of these new invalid-input cases remains open; no production mutations. Full review remains open.

### Browser validation of schedule input errors

- Actual ScheduleDialog fixture confirms a 1.5 parallel-host value is retained and blocked by native step validation. Added onInvalid feedback so the persistent dialog error also explains the 1–50 integer requirement; aria-invalid and associated range help identify the field.
- Correcting parallelism then submitting a nested JSON object keeps the input and displays the flat-object/type/size explanation in the fixed footer. Fixture rejects any write with a distinct unexpected-write error; the observed feedback was client validation. Evidence: verification/schedule-input-fixture.html and schedule-invalid-input.png.
- TypeScript and targeted ESLint passed. No production schedule writes. Full review remains open.

### Verify encrypted database archive before export

- F34: Database export now authenticates/decrypts the completed encrypted archive and checks SQLite integrity before revalidating the user's authorization, auditing success or starting download. Successful responses identify the server verification in a header; UI copy distinguishes this from verifying the downloaded copy.
- Failure injection confirms verification errors return no attachment/verification header, write no success audit and remove the temporary archive. The test accommodates the existing asynchronous download-cleanup busy window rather than treating an in-progress prior cleanup as verification failure.
- Verification: all 15 database-backup/service/export tests passed, including independent decryption of the actual downloaded archive, wrong-key/corruption checks and restore safeguards. TypeScript and targeted ESLint passed. Database-only scope is unchanged. Reset-to-backup binding and complete application activation/rollback remain open; no production backup or reset performed.

### Verify completed application archive before publication

- F34: Application backup creation now runs the complete archive verifier against the temporary encrypted output before its exclusive publication link. The check authenticates outer encryption, verifies packaged files/manifests and checks the embedded encrypted database. Successful create/CLI results include verified:true.
- The shared encrypted-snapshot writer accepts an optional pre-publication verifier; ordinary database snapshot consumers retain their current behavior. Existing destination protection and temporary cleanup remain in the same finally boundary.
- Verification: 20 application/database backup tests passed. New failure injection corrupts the outer authentication tag after encryption and verifies rejection, absence of the destination archive and cleanup. Existing independent verification and prepared-restore tests still pass. Documented extra temporary-space requirements. No live backup/restore, activation or deployment; backup binding and complete activation/rollback remain open.

### Verify prepared recovery against its authenticated archive

- F34: Added verifyPreparedApplicationRecovery and CLI verify-prepared. It prepares an independent private restore from the original authenticated archive, then compares the target tree's member set, file bytes, links and restrictive staging permissions. Database, plan and READY are included; local manifests alone are not trusted as the comparison baseline. The requested prepared tree remains read-only.
- Verification: all 11 application-backup tests passed. New cases modify the database, plan, marker and playbook, add an unexpected member, replace a file with an external symlink and loosen file permissions. Each is rejected; unmodified preparation and the actual CLI pass. Temporary comparison data is cleaned. Documented additional disk space and point-in-time/unchanged-files limitation.
- No live recovery or activation. Original deployment keys/configuration, coordinated activation/rollback and reset backup binding remain open; full review remains open.

### Verify preserved application key against archived database values

- F34: Added application-backup CLI verify-key and a read-only core database key verifier. Authenticated archive extraction precedes AES-GCM checks of encrypted settings, variables, schedule extra variables and user TOTP fields. Decrypted bytes are not returned/logged; output contains scope/count/result only. No ciphertext yields keyVerified:false rather than a false positive.
- Verification: 13 key/application-backup tests passed. Coverage includes correct/wrong/missing keys, mixed-key values, malformed ciphertext, unchanged source database bytes and the real CLI against an encrypted application archive with no plaintext/key leakage in output.
- Documented exact scope: encrypted files, plugin-specific encryption and external configuration remain separate. No production archive or credentials accessed. Coordinated activation/rollback, reset backup binding and full review completion remain open.

### Verify managed SSH archive encryption with the preserved application key

- F34: verify-key now also authenticates regular .enc files in the authenticated archive's included ssh root. It reports checkedSshFiles and sshRootIncluded alongside database counts. Database success cannot mask an SSH ciphertext/key failure; missing SSH roots do not produce file evidence. Shared AES-GCM authentication discards plaintext buffers and returns no decrypted content.
- Verification: all 14 key/application-backup tests passed. Synthetic archives verify a matching managed SSH file and reject a mixed-key archive where database values authenticate but SSH ciphertext does not. Read-only archive verification remains separate from actual SSH key syntax, remote access and activation checks. No production keys accessed.
- Updated recovery documentation. Activation/rollback, reset backup binding and the rest of the full review remain open.

### Combined regression checkpoint after schedule and recovery changes

- Current working tree: complete backend suite 720/720 passed, complete frontend Vitest suite 231/231 passed across 46 files, TypeScript project build check passed, and Vite production build passed into /tmp/shipyard-review-build-20260910. The normal production dist/deployment was not replaced.
- The separate real-local-Ansible variable integration also passed (1/1, no skip). This test uses only local assert/debug tasks and synthetic values.
- These results establish regression/build evidence for the current implementation. They do not close outstanding feature requirements, mobile/live acceptance, complete application activation/rollback, or verified-backup binding for resets. The original 35-feature/full-review objective remains active.

### User invitations with recipient-owned passwords

- F30: Added durable 24-hour, single-use invitations. Only token hashes are stored; tokens are returned once and excluded from listing/audit. Creation and acceptance are transactional with audit; acceptance rechecks expiry, revocation, username availability, issuer status/token version and the reviewed role revision after password hashing. Concurrent acceptance creates only one account.
- User creation defaults to a link invitation with the existing explicit role selection and effective-access review. Direct password creation remains selectable. The result shows a copyable link and explicit private-sharing/no-email/expiry guidance. Pending invitations can be listed and revoked. Pending user mutations disable editing and closing; form fields now have associated labels.
- Public /invite uses a fragment token and a rate-limited POST preview showing only username, display name, role name and expiry. Recipients choose and confirm their password; success clears password fields and removes the URL fragment, then links to sign-in without silently replacing any existing login session. Invalid/expired/access-changed invitations have explicit error guidance.
- Verification: five focused API tests passed, covering one-time/hash/audit behavior, expiry/revocation/role changes, transactional audit failure, issuer invalidation, concurrent acceptance, duplicate pending invitations and minimal non-consuming public preview. TypeScript, changed-file ESLint and all 231 frontend tests passed.
- Browser fixtures using actual components and synthetic transport verified required role selection, access preview, invitation creation without an administrator password, result link, recipient context, mismatched-password rejection and successful acceptance with URL cleanup. Evidence: verification/invitation-admin-fixture.html, invitation-fixture.html, invitation-created.png, invitation-accept.png and invitation-accepted.png. Browser clipboard/revocation/error/reload/mobile and full HTTP-to-browser integration remain to be checked. No real user invitations, emails or production changes were made. The full review remains open.
- Combined backend regression after the invitation preview/UI changes: 725/725 tests passed, no failures or skips. This verifies the backend suite and does not substitute for the outstanding browser/integration checks above.

### Invitation validity is visible before password entry

- F30: Centralized invitation validity checks for administrator listing, recipient preview and acceptance. Open invitations invalidated by issuer status/session-version changes, changed/deleted roles or a claimed username now expose a non-secret status/reason to administrators. The list explains why acceptance is blocked and offers revocation before replacement. Recipient preview now rejects a claimed username before requesting a password. List responses are no-store.
- Corrected the session-related explanatory copy: revoking all issuer sessions invalidates invitations through token-version changes; an ordinary individual-session revocation is not claimed to do so. Revocation buttons show Revoking while pending.
- Verification: six focused API tests passed, including shared status/preview checks for role, issuer and username invalidation and transition to revoked. TypeScript and targeted ESLint passed. Actual-component browser fixtures verified the invalid-role explanation, persistent failed-revocation feedback, successful retry refreshing to an empty list, and expired-link guidance with no password fields.
- Evidence: verification/invitation-status-fixture.html, invitation-expired-fixture.html, invitation-revoke-error.png, invitation-revoked.png and invitation-expired.png. Synthetic transport only; clipboard, mobile and full HTTP/browser integration checks remain open. No production changes. Broader F30 requirements (including SSO/MFA policy) and the full review remain open.

### Revalidate live SSH terminal resource access

- F30/terminal access: WebSocket authentication now accepts an optional resource authorization check, applied initially and during its existing 30-second revalidation. SSH terminals re-read the user, role permissions, host existence and host environment/scope. Disabled accounts, removed terminal capability and moved/inaccessible hosts can no longer keep an idle terminal indefinitely authorized.
- SSH also checks current authorization immediately before forwarding input/resize and at both SSH readiness boundaries. Failed checks stop session timers, close the shell/connection and reject the input; audit records the metadata-only access_revoked reason. Session-related WebSocket close codes receive the same audit reason.
- Targeted terminal/session/WebSocket/audit suite: 31 tests passed before adding the final shared-role regression. New cases exercise disabled-account input rejection, host environment change before late shell readiness and idle permission revalidation. Added a separate shared-role edit case that leaves token_version unchanged. Tests use the real terminal handler, temporary SQLite and a synthetic SSH transport; no remote commands or production permission changes.
- Resource changes for an idle connection are detected on the 30-second interval; new input and shell readiness check immediately. This does not cancel remote work already started before revocation. Full review remains open.
- Full backend regression including the shared-role edit test: 730/730 passed, no failures or skips.

### Explain terminal disconnects without losing local output

- Terminal UI now keeps a visible disconnect explanation and next step for expired/revoked sign-in (4001), denied host/role access (4003), missing host (4004), abnormal transport closure (1006) and ordinary session completion. Specific server error/idle/duration explanations survive the subsequent generic close event. No raw WebSocket reason is rendered as terminal escape content.
- Disconnected terminals disable stdin, cursor blinking and Ctrl+C. Elapsed time is labelled Session duration after closure. Existing output remains searchable/copyable; copying reports success or a usable failure message instead of an unhandled rejection. Guidance explains that previously started remote work may continue and should be checked before repetition.
- Four focused disconnect/search tests passed; TypeScript passed. Browser fixture with the actual xterm component and synthetic WebSocket verifies denied-access guidance, disabled Ctrl+C, stopped duration, retained output search (1/1 match) and Selection copied feedback. Evidence: verification/terminal-disconnect-fixture.html and terminal-access-revoked.png. No remote connection or production changes; full review remains open.
- Final frontend regression: 233/233 tests across 47 files passed; changed-file ESLint passed.

### Make MFA enrollment transitions safe before adding policy enforcement

- F30 prerequisite: TOTP setup rejects an already enabled factor instead of allowing a logged-in session to replace it through a new pending secret. QR rendering completes before pending-state mutation; a render failure leaves the previous setup intact. After rendering, authorization and the pending setup are rechecked to reject revoked sessions or concurrent setup changes.
- Setup, confirm and disable commit their MFA state and audit entry together. Confirmation/disabling also include token-version rotation and replacement tracked-session creation in the transaction. Audit failure leaves existing factors, pending setup and sessions unchanged. Sensitive responses use no-store. Disabling revalidates session and password-hash identity after asynchronous password verification.
- Password login now reloads account/MFA state after password verification, rejects a changed credential/session generation, and cannot issue password-only access based on an obsolete pre-verification MFA snapshot.
- Four focused MFA transition tests passed before the final login-race test was added. Tests use temporary SQLite, real TOTP codes and controlled QR/password-verification failures; no actual account security settings changed. The full backend regression includes the new login-race case.
- This establishes safer enrollment transitions; it does not implement the still-open mandatory MFA policy, its configuration/enrollment UI or SSO. The full review remains open.
- Full backend regression: 735/735 tests passed, no failures or skips, including the five new MFA transition/login tests.

### Deployment MFA policy and restricted enrollment

- F30: Added SHIPYARD_MFA_POLICY with optional (default), admins and all modes. Unknown nonempty values enforce all. No production policy was changed. Deployment configuration and recovery limitations are documented in docs/mfa-policy.md and .env.example; a settings editor remains absent.
- Password-verified accounts covered by policy and lacking MFA receive a ten-minute, tracked enrollment token. Only MFA status/setup/confirm and logout are accessible; other protected HTTP routes and all WebSockets reject enrollment access. An enrollment token stays restricted if policy is relaxed. Existing ordinary sessions are checked against policy on each request; enabled-MFA accounts need a token recording second-factor verification. Existing password-only tokens must reauthenticate.
- Confirmation issues a full MFA-marked session after real TOTP verification and invalidates the previous token generation. Self-service factor disabling is blocked for affected accounts; existing administrator recovery remains possible but the recovered account must re-enroll. Invalid-format authenticator codes now return validation failure rather than an otplib exception/500.
- Login directs enrollment-required accounts to /mfa-enrollment; API enrollment-required responses also direct existing sessions there. The public layout provides QR/manual setup, six-digit confirmation, errors and a return to sign-in. Profile identifies required MFA and disables self-service removal.
- Verification: full backend suite 738/738 passed. New policy tests cover admin-only scope, real-code enrollment, forbidden API/profile/session/WebSocket access, stale token invalidation, policy changes, unknown configuration, logout and legacy sessions without MFA proof. TypeScript and changed-file ESLint passed. Browser fixture with the actual enrollment page verifies preparation, QR rendering and persistent invalid-code feedback. Evidence: verification/mfa-enrollment-fixture.html and mfa-enrollment-error.png.
- End-to-end browser login/enrollment success, expiry/reload/mobile, configuration UX, recovery acceptance and broader SSO remain open. Synthetic fixtures only; no deployment or live authentication changes. The full review remains open.
- Full frontend regression: 233/233 tests across 47 files passed.

### Resume MFA setup and verify real HTTP/browser enrollment

- Reopening an unfinished TOTP setup now returns the same pending secret/URI instead of silently replacing an authenticator entry already scanned by the user. QR rendering and concurrent-state checks remain intact; repeated preparation does not duplicate the setup audit. Active MFA still cannot be replaced through setup.
- Enrollment page clears the displayed QR/key and entered code on a 401, disables further setup interaction and explains reauthentication. Production's central unauthorized handler also redirects to login. Updated copy explains resuming unfinished enrollment.
- Nine focused MFA policy/transaction tests passed, including a new resumption test that confirms the originally scanned code remains usable and audit count is unchanged.
- Real local HTTP/browser acceptance used the production LoginPage and MfaEnrollmentPage, production auth routes and middleware, a synthetic account in a temporary SQLite database, and an authenticator code derived from the displayed test key. Password sign-in navigated to restricted enrollment; real QR setup and real TOTP confirmation navigated to a page that successfully called a protected API and checked the token's MFA proof. No fetch mock was used. The final workspace page was a minimal acceptance probe, not the complete application dashboard.
- Evidence: server/test/fixtures/mfa-browser-server.js, verification/mfa-flow-fixture.html and mfa-http-browser-success.png. Harness binds localhost only, loads no workers or remote infrastructure and removes its temporary database at shutdown. No production credentials, accounts, policy or deployment changed. Expiry/reload/mobile browser coverage and broader review work remain open.
- Final TypeScript and changed-file ESLint checks passed.

### Administrator MFA policy and enrollment overview

- F30: User management now shows the effective server-managed MFA policy, covered active accounts, enrolled covered accounts, missing enrollment, optional accounts and excluded disabled-account count. A collapsible list identifies accounts requiring setup. Manual refresh, 30-second polling and checked-time make the snapshot explicit; user mutations invalidate this users-prefixed query.
- Unknown policy configuration is explicitly reported with its effective all-account requirement. Management help identifies the environment variable, restart requirement, existing-session impact and administrator recovery behavior. This is policy visibility, not a browser configuration editor.
- The no-store API is administrator-only, revalidates current administrator authorization and returns only minimal account identifiers/names/role for missing enrollment. Loading/error states do not present cached counts as freshly verified compliance.
- Verification: four policy API tests passed, including scope counts, disabled exclusion, minimal missing-account data, malformed-config indication and denial to non-administrators. TypeScript and changed-file ESLint passed. Actual-component browser fixture verifies counts, configuration warning and expanded account list. Evidence: verification/mfa-overview-fixture.html and mfa-policy-overview.png. Synthetic data only; no production account or policy changes. Full review remains open.

### Report plugin reload failures and persist access changes atomically

- F31: Plugin reload returns loaded count, failed package IDs/errors and completion time. Partial failure now reports success:false and writes a failed audit result instead of claiming all plugins reloaded. UI retains the summary and failed IDs, distinguishes registration from workflow validation and explicitly identifies absent automatic rollback. Request failures and access-toggle errors stay visible.
- Enable/disable settings and their audit event now commit in one SQLite transaction. Audit failure preserves prior access state. Concurrent UI toggles are disabled while a toggle is pending. Inventory read failures have a read-only retry rather than requiring a code reload.
- Plugin rows now give package information the available width with controls in a compact right column, avoiding long metadata compressed into a 220px label. Empty-state copy describes the next step instead of repeating the installation path.
- Verification: 13 plugin action/UI backend tests passed. New cases inject audit failures for both enable and disable and verify partial registration failure followed by a successful reload. TypeScript and targeted ESLint passed before the final layout-only class change. Actual PluginsTab browser fixture verifies the 1-loaded/1-failed summary and improved layout. Evidence: verification/plugin-reload-fixture.html and plugin-reload-partial-failure.png.
- No actual plugin was installed/reloaded. Tests load only synthetic temporary manifests/code. Package update/rollback orchestration, runtime side-effect rollback, compatibility enforcement and active third-party page acceptance remain open. Full review remains open.

### Declared plugin runtime compatibility is checked before execution

- F31: Added optional manifest.engines.node and manifest.engines.shipyard semantic-version ranges. Both declared requirements must match; malformed declarations or mismatches block loading before backend code is required. Missing declarations remain compatible with old packaging but are explicitly unverified in the inventory. Standard prerelease exclusion is retained, not silently widened.
- Loaded and failed inventory entries include runtime versions and checked requirements. Plugin settings distinguish missing declarations, matching ranges, incompatibility and invalid declarations; passing requirements still does not claim workflow verification.
- Promoted the already locked/installed semver 6.3.1 package to an explicit runtime dependency, updating package and root lock dependency metadata without changing the resolved package. Documented manifest syntax, prerelease behavior and interaction with digest allowlisting in plugin-template/README.md.
- Focused compatibility/plugin action/UI tests passed (17 total), including a real loader test proving incompatible backend code is not executed. TypeScript and targeted ESLint passed. Browser fixture verifies unverified legacy packaging, a blocked Node mismatch, a matching Shipyard prerelease range and disabled access control. Evidence: verification/plugin-compatibility-fixture.html and plugin-version-incompatible.png. No live plugins or deployment changed. Package update/rollback and broader review requirements remain open.
- Full backend regression: 746/746 tests passed, no failures or skips.

### Plugin reload replaces package-owned CommonJS dependencies

- F31: Reproduced a mixed-version runtime: rewriting a plugin to version 2.0 and reloading updated its manifest/entry point but retained version 1.0 nested JavaScript and JSON imports. The new regression failed with both old values before the fix.
- Loader now clears all CommonJS cache entries under the canonical plugin directory before registration, including package-local dependencies and JSON. It removes retained child references from surviving module-cache entries. Directory boundaries prevent evicting similarly prefixed neighboring plugins. Compatibility/trust checks still precede this step.
- Updated plugin documentation with exact reload scope and limits: shared dependencies, active requests, timers/listeners/connections and dynamic ESM state are not a rollback or guaranteed unload. Controlled restarts remain necessary for persistent plugin state.
- Tests use synthetic temporary plugin files only; no live plugin reload or deployment. Package update/rollback orchestration and remaining review requirements stay open.
- Verification: 18 focused plugin compatibility/action/UI tests passed. After moving cache cleanup outside the index.js existence check, all four action tests passed again, including removal of the old cache when a package no longer has a backend entry point. Neighbor cache identity remains unchanged.

### Package approval digest includes dependencies and rejects hidden linked code

- F31: Replaced the digest that skipped node_modules, .bundle-version and symlinks with package-files-v2. It hashes a deterministic, unambiguous list of all regular package file paths/content hashes, including installed dependencies and installation metadata. Symlinks and special files reject loading instead of silently disappearing from approval coverage. File reads use O_NOFOLLOW and compare size/timestamps before/after each streamed read.
- Trust metadata and UI identify digest scheme/scope. Documentation explicitly requires review/regeneration of existing allowlist entries and identifies snapshot/concurrent-write, mutable-data and sandbox limits. This change deliberately invalidates legacy allowlist hashes; no live allowlist was changed.
- Added a read-only digest CLI (server/cli/plugin-digest.js) so operators can inspect a candidate without registering/executing it. Package documentation explains its usage and that hashing is not approval.
- Verification: package digest tests cover dependency/metadata changes and symlink rejection. A real loader test under enforce policy loads the approved package, blocks registration after a dependency change and loads only after a reviewed new digest is supplied. CLI output matches service hashing without executing a throwing package entry point. Four final digest/enforcement tests passed; the preceding 20-test plugin digest/action/compatibility/UI suite also passed. TypeScript and targeted ESLint passed.
- Tests used isolated synthetic packages only. Continuous integrity monitoring, immutable execution snapshots, update/rollback orchestration and full review completion remain open; no production deployment.

### Block frontend delivery for rejected plugins and linked assets

- F31: Plugin UI resolution now requires a successfully loaded package, not merely its persisted enabled flag. A rejected package cannot continue publishing ui.js or imported assets. Tests explicitly initialize the plugin loader before exercising ordinary asset delivery, matching production startup.
- Entry-point and asset resolution use lstat checks on the package/entry file and every asset path component. Post-load substitutions with linked files, linked asset directories or a linked ui.js return 404 instead of exposing private package files.
- Failed single-package reload now also blocks its retained API router, prevents re-enabling access and reports the failure in inventory until a successful retry. Persisted access preference remains intact for recovery. This does not undo plugin side effects or constitute package rollback.
- Focused plugin UI/action/trust suite: 18 passed before adding the final single-reload recovery case. Synthetic test packages only. Tests cover failed registration with enabled state and three post-load symlink substitutions. Documentation clarifies successful-load requirements and the need to avoid concurrent package writes; immutable package serving remains separate work. No live plugin or deployment changes. Full review remains open.
- Full backend regression including single-reload failure/recovery: 754/754 tests passed, no failures or skips.

### Bind plugin access approval to reviewed package contents

- F31: Enable API requires the reviewed digest/scheme. Under the same transaction as settings/audit it checks the currently loaded package, rehashes the on-disk package and, for enforce mode, rechecks the configured approval allowlist. Missing metadata returns 428; stale loaded contents, changed files or removed approval return 409. Disabled access does not require review metadata.
- The UI submits the digest/scheme captured by the confirmation target; unavailable metadata produces actionable reload guidance. Successful audit entries include the reviewed scheme and digest. Existing error feedback remains persistent.
- Focused plugin action/trust tests passed: missing review, stale digest, edited files, stale review after reload, successful reviewed activation and audit identity. Existing audit rollback tests now provide explicit package review. No actual plugin access or allowlist was changed. This is a point-in-time access approval, not continuous integrity or package rollback. Full review remains open.
- Added explicit coverage that removing an enforce-mode allowlist entry blocks a later activation review even when package bytes still match. The trust test passed. The legacy plugin-list activation button now links to the central package review instead of attempting unreviewed activation. Changed-file ESLint passed.
- Final TypeScript project check passed after updating the legacy activation entry point.

### Validate plugin display metadata and derive real UI availability

- F31: Manifest name/version/description/author and sidebar label/icon now have explicit text/type/length checks before registration. Root values must be objects. Invalid display metadata produces a readable inventory failure with a safe directory-name fallback rather than passing objects/arrays to React labels. No invalid package code executes.
- Inventory derives hasUi from the successfully loaded package's UI resolver and overrides any manifest claim. Failed packages report false. Sidebar and command palette exclude backend-only packages; settings explain that there is no web interface and omit the existing Open action.
- Verification: 21 focused plugin UI/action tests passed. New cases cover misleading manifest UI flags, backend-only and frontend-only packages, five malformed display declarations and non-execution of invalid packages. Existing loaded-asset and access-review tests remain green. No production plugin or deployment changes; full review remains open.
- TypeScript and changed-file ESLint passed.

### Isolate asynchronous plugin UI mounting and cleanup

- F31/active plugin pages: Extracted a mount lifecycle that suppresses late readiness/errors after disposal and calls unmount once after an in-flight mount settles. Failed mounts clean up immediately after settling. The page gives each attempt a separate DOM container and detaches it on navigation, preventing late plugin writes from reusing a newer page's host element.
- Host-managed WebSocket subscriptions are tracked, removed on failure/navigation, and late registrations ignored. Context now exposes an AbortSignal for cooperative plugin cleanup. Plugin-owned resources and never-settling mounts still require the plugin to honor that signal/cleanup contract.
- Error state now has a Retry loading plugin action. Existing background-query behavior stays unchanged; no automatic remount on inventory refresh was added.
- Three focused lifecycle tests cover delayed completion after disposal, import completion after navigation without mounting, and mount rejection with exactly-once cleanup. Final TypeScript passed. Browser acceptance of the host lifecycle and environment-switch behavior remains open; no live plugin was loaded or changed. Full review remains open.
- Full frontend regression: 236/236 tests across 48 files passed; targeted ESLint passed.

### Bind plugin view requests to their original environment

- F31: Environment changes now dispose/remount plugin views. Context includes environmentId; generic/plugin-specific requests capture that environment and use a signal combining caller cancellation with host disposal. Calls after disposal fail before fetch. Server-state refresh explicitly selects the original environment.
- Legacy named API helpers are guarded against calls from a disposed view or changed environment while preserving their existing explicit arguments. Old view navigation, confirmations and toast callbacks are ignored. This does not undo server-side work already accepted before cancellation.
- Five focused request/lifecycle tests passed, including attempted environment override, no dispatch after disposal and independent caller/host cancellation. Targeted ESLint passed. Browser host/environment-switch acceptance is still pending and remains part of the full review. No production calls or plugin changes were performed.
- Final TypeScript project check passed.

### Browser acceptance of plugin lifecycle and environment switching

- Exercised the actual PluginHostPage and dynamically imported synthetic plugin module in a local browser. The fixture exposes lifecycle events and wraps the real ws.subscribe cleanup to count active host subscriptions; API responses are synthetic and show the environment header received.
- Verified default-environment mount/request, switching to production, abort+unmount of the old instance, new production mount, exactly one remaining subscription, rejection of an old-context request with AbortError before fetch, and a new request carrying production.
- Injected a mount failure after subscription registration. The browser showed the persistent error and retry action, abort/unmount events, and zero active subscriptions. Retry cleared the error and mounted a fresh instance with exactly one subscription.
- Evidence: server/test/fixtures/plugin-browser-server.js, plugin-lifecycle-ui.mjs, verification/plugin-lifecycle-fixture.html, plugin-environment-lifecycle.png, plugin-mount-error.png and plugin-mount-retry.png. The static fixture server binds localhost only and runs no infrastructure operations. This closes the previously pending browser checks for environment switching and failure/retry cleanup; real third-party plugin acceptance, mobile behavior and the broader review remain open. No production changes.


### Close active plugin views when access becomes unavailable

- F31: PluginHostPage now waits for successful inventory verification before importing a plugin UI. Disabled, missing, failed-load and backend-only packages display a specific explanation; inventory failures provide a read-only retry. The inventory refreshes every 30 seconds while the page is active. Unchanged allowed access does not remount the plugin.
- A transition away from allowed access runs the existing abort, subscription cleanup, container removal and unmount lifecycle. Recovered access mounts a fresh instance. Detection depends on inventory refresh/focus or invalidation, not a pushed immediate revocation notification; server-side authorization remains necessary.
- Actual-component local browser acceptance verified disable -> zero subscriptions, abort/unmount and removed plugin DOM; stale-context requests reject with AbortError; re-enable -> one fresh subscription. A synthetic inventory 503 also disposed the view, retained the explanatory error after manual retry, and recovered to one instance after the inventory succeeded. Evidence: verification/plugin-access-fixture.html, plugin-access-disabled.png and plugin-access-error.png. APIs and plugin code were synthetic; no production changes.
- TypeScript, changed-file ESLint and five focused plugin lifecycle/request tests passed. The full review remains open.


### Git history timestamps and delimiter-safe metadata

- P1-01 / Git history: getLog now emits the absolute ISO author timestamp with offset instead of Git's relative age string. The current frontend formats it through formatDateTime and explicitly labels it Authored, preserving the distinction from synchronization time.
- Replaced pipe field separators in git log output with NUL separators. A commit subject or author containing pipes previously shifted/truncated the displayed message, author and date. The new isolated local-repository regression reproduced the truncated subject before the fix and verifies the complete subject, author, exact offset timestamp and pagination afterward.
- Verification: all 11 Git history/preservation tests passed, including existing conflict and workspace-preservation checks. TypeScript and changed-file ESLint passed. Tests use temporary local repositories only; no remote fetch or production changes. Full timestamp/feature acceptance remains open.


### Recover system configuration reads without misleading defaults

- F33: Polling configuration now handles read failures before its missing-draft loading branch. Initial API failures previously left a permanent skeleton. Errors now expose QueryErrorState with read-only retry.
- Scheduler timezone and Agent controls wait for the shared settings query and show explicit retryable failures instead of permitting edits against fallback defaults when stored settings are unknown. Hooks remain unconditional and saved values populate after successful recovery.
- Actual SystemTab browser fixture verified initial settings/polling 503 responses, visible section-specific errors, repeated failed polling retry, and recovery to UTC, four 60-minute pollers and the enabled agent state from synthetic responses. No save/install/toggle was performed. Evidence: verification/system-error-fixture.html and system-settings-load-error.png.
- TypeScript and changed-file ESLint passed. Full system health/queue/agent distribution acceptance remains open; no production changes.


### Validate polling inputs and commit configuration with audit

- F33: Polling updates now require recognized sections containing a boolean enabled flag and a numeric whole-minute interval from 1 to 9999. Unknown fields, empty bodies, malformed sections, strings, fractions and out-of-range intervals are rejected before any settings write or scheduler restart. Top-level partial updates preserve omitted sections.
- Configuration and audit now share one database transaction. An injected audit insertion failure preserves all prior settings and does not restart polling. Successful commits restart polling afterward. This does not provide rollback for an unexpected runtime failure inside restartPolling.
- Polling inputs retain an empty draft instead of immediately restoring the old value; invalid values display feedback and disable save. Server save failures remain visible in the form.
- Three isolated route tests passed, covering malformed input, authorization, audit rollback, exact minimum/maximum interval persistence and unchanged omitted sections. The malformed fractional input failed against the previous implementation before the fix. TypeScript and changed-file ESLint passed. No live polling configuration changed; full review remains open.
- Full backend regression: 760/760 passed with no failures or skips. The additional final boundary/unknown-field coverage was then verified in the focused three-test polling suite.


### Preserve polling drafts and explain operational impact

- F33: Polling drafts are now independent from refreshed query data. Background refresh no longer replaces user edits. Unsaved changes participate in the existing navigation/unload guard; Discard polling changes adopts the latest loaded configuration. Save is disabled for unchanged or invalid values, and inputs are locked while saving. Successful submission updates the cached snapshot before clearing the draft.
- The form identifies global scope and explains load/freshness tradeoffs, rescheduling without immediate collection, and that disabling future checks does not cancel existing work. These statements were checked against scheduler restart/setup behavior. Save polling settings is explicitly named.
- Browser acceptance with actual SystemTab: changed 60 to 75, injected refreshed 90-minute settings and verified the draft stayed 75; emptied the input and verified error feedback plus disabled save; discarded and verified all four fields adopted 90. No save request or infrastructure operation executed. Evidence: verification/polling-draft-fixture.html and polling-invalid-draft.png. Updated prior system error fixture to include router context for the unsaved-change guard.
- TypeScript and changed-file ESLint passed. Cross-administrator revision conflict protection is not provided by this draft-preservation change. Full review remains open.
- Full frontend regression: 238/238 tests across 49 files passed.


### Separate observed scheduler runtime from polling configuration

- F33: Added administrator-only, no-store polling-status endpoint showing process-local registered/running schedule counts, pending polling restart, and enabled/configured interval/timer/running state for all five collectors, including IPAM source checks. Reads do not start collection.
- System settings now lead with a distinct Runtime status section, refreshing every 15 seconds and on manual request. Enabled collectors with missing timers are explicit, running work is distinguished from future scheduling, and observation time uses the central zoned format. Copy identifies process/global scope, overlap behavior and IPAM per-source intervals. It explicitly avoids treating timer state as evidence of successful collection.
- Two isolated tests passed: configured-but-unscheduled state, debounced restart state, scheduled/disabled timer differences, stopped timers, admin-only API and no-store response. No collectors or remote operations run in these tests. TypeScript and changed-file ESLint passed. Browser evidence with the actual component covers running, stopped, waiting, missing timer and pending restart: verification/polling-runtime-fixture.html and polling-runtime.png.
- Per-cycle completion/error history and agent distribution remain open, as does the full review. No production changes.


### Observe collection cycles and recent reported failures

- F33: All five polling loops now record process-local cycle start/completion and reported-error count, retaining the latest ten completed cycles per collector. Existing overlap guards remain unchanged. Host/check exceptions, invalid image reports, overdue push-agent reports, rejected outer tasks and aggregate exceptions contribute to counts; IPAM uses its settled source results. Raw error output and credentials are not exposed.
- Runtime table displays current start and expandable recent completions with zoned times/error counts. Never-observed cycles are explicit. Retention/reset and empty-target limitations are explained; zero reported errors is not presented as proof that all hosts have fresh data.
- Four focused tests passed: bounded/copied per-collector observations, runtime timer state, endpoint authorization, actual IPAM empty-cycle completion and injected aggregate database failure retained in history. TypeScript and changed-file ESLint passed. Actual-component browser fixture verifies current start, prior failures and expanded history. Evidence: verification/polling-runtime-fixture.html and polling-cycle-history.png.
- Observations are process-local and not durable event history or per-host diagnostic details. Agent distribution and broader review acceptance remain open. Synthetic fixtures only; no production changes.
- Full backend regression: 765/765 passed without failures or skips.


### Agent distribution and report recency

- F33: Added a no-store administrator inventory of managed hosts across environments with configured SSH/push/pull distribution, mode selected by the global agent flag, report-recency counts and minimal per-host metadata. SQLite UTC timestamps are normalized explicitly; missing, overdue and invalid/future timestamps are distinguished. No agent credentials or service URLs are returned.
- System settings show a searchable, 50-row paginated agent overview, last report with timezone, runner version and interval. The disabled global flag does not erase configured-agent counts. Scope, 30-second refresh, ten-interval recency threshold and SSH fallback limitations are explained. Mode selection and recent reports do not claim live connectivity.
- Two isolated tests passed covering counts, global-disabled selection, UTC normalization, missing/invalid/future reports, administrator restriction and credential exclusion. Final TypeScript and changed-file ESLint passed. Actual-component browser fixture verifies SSH/push/pull rows, global-disabled guidance and filtering to the overdue host. Evidence: verification/agent-overview-fixture.html and agent-overview.png.
- No live agent was enabled, installed or changed. Large-list pagination and complete system-page mobile acceptance remain to be verified; the full review stays open.


### Unify agent timestamp interpretation in runtime and dashboard

- P1-01/P1-02/F33: Scheduler, dashboard and agent overview now share agentReportStatus. SQLite timestamps without an offset are interpreted as UTC rather than the server's local timezone; future and malformed timestamps cannot produce a healthy agent state. Existing three-interval warning and ten-interval overdue boundaries are preserved.
- The pull-agent scheduler rereads persisted agent metadata after fetching a report, avoiding a decision based on its pre-request snapshot. Missing report failures now contribute to the cycle observation. Never-reported push agents retain SSH fallback; invalid/overdue timestamps are reported offline.
- Seven focused tests passed. New subprocess tests compare identical recency results under UTC, Europe/Zurich and America/New_York. Boundary tests cover exact three/ten-interval thresholds, missing data and invalid/future timestamps; existing overview/runtime API tests remain green. No live collection or agent changes. The full review remains open.
- Full backend regression: 769/769 passed. A subsequent additional dashboard-route test also passed, proving a future SQLite agent timestamp yields failed rather than healthy and is returned as normalized UTC.


### Preserve and validate scheduler timezone drafts

- F33: Scheduler timezone now uses an independent draft with navigation/unload protection, explicit discard, disabled unchanged/invalid saves and locked controls during submission. Background settings refresh cannot overwrite an edited timezone. Successful submission updates the cached saved value before clearing the draft.
- Field feedback validates the timezone with the browser timezone implementation; server validation remains authoritative. The form names the save action, shows old/new timezone and explains the cross-environment cron-time interpretation and daylight-saving implications. Save failures remain visible.
- TypeScript and changed-file ESLint passed. Actual SystemTab browser fixture verified Invalid/Zone rejection, editing UTC to Europe/Zurich, refreshing stored settings to Europe/Berlin while retaining the draft, and discarding to the latest Europe/Berlin value with disabled save. No settings save performed. Evidence: verification/timezone-draft-fixture.html and timezone-draft.png. Other new runtime endpoints are intentionally unmocked in this fixture and show independent read errors. Full review remains open.


### Reliable global-branding drafts and explicit preference scope

- F28: Clearing an existing app name now submits an empty string, allowing the server to restore the Shipyard fallback. Previously undefined omitted the field and retained the old name. Branding drafts no longer get overwritten by background settings refresh. Save/reset are mutually disabled while pending; successful operations update cache and clear drafts.
- Added loading/read-error recovery, persistent save/reset errors, six-digit color validation, app-name length limit and explicit discard. The native color picker retains a valid fallback while the text draft is invalid. Global name/color copy identifies saved all-user scope and no longer promises an absent icon input. Navigation preference copy identifies immediate browser-local scope.
- TypeScript and changed-file ESLint passed. Actual AppearanceTab browser fixture verifies empty-name draft surviving external settings refresh, invalid color feedback and disabled save, followed by a synthetic successful request containing exactly appName:"" and accentColor:"#3b82f6". Evidence: verification/appearance-draft-fixture.html and appearance-empty-name-save.png. No production branding changed. Full contrast/theme acceptance and the broader review remain open.


### Extend contrast coverage to secondary surfaces and tinted status badges

- F28/P2-05: Extended theme tests beyond base surfaces to muted text on muted/card surfaces, primary links on background/cards, and actual alpha-composited warning/danger/info badge fills on background/card surfaces. New checks reproduced insufficient contrast in four muted-text presets and multiple tinted status combinations.
- Adjusted muted text in Mint, One Dark, Solarized Light and Ayu; shared dark warning/danger and light warning/info values; and affected dark-theme info values. All 33 presets now pass the expanded tested pairings at 4.5:1, with existing focus-ring checks retained. This is bounded token/pair coverage, not certification of every rendered page or custom opacity override.
- Global branding help now explains that the accent is used for browser icon/chrome while console buttons/text/status use the personal theme, matching applyWhiteLabel/applyTheme behavior.
- Full frontend regression 238/238 passed across 49 files; TypeScript and changed-file ESLint passed. Actual StatusBadge/Button browser fixture visually checked Nord Dark and Ink Light on card/muted surfaces. Evidence: verification/contrast-fixture.html, contrast-nord-dark.png and contrast-ink-light.png. Full page-by-page review acceptance remains open; no deployment.


### Persist settings atomically after complete existing validation

- F28/F30/F32/F33: Moved late logo, scheduler timezone, agent and notification validation before any database mutation. A failed request previously could retain earlier branding writes; the new regression reproduced this against the old route. App-name type/length and six-digit-or-empty accent validation now match the branding form contract.
- Settings writes (including encrypted webhook/SMTP secrets) and a settings audit entry now execute in one SQLite transaction. Audit records recognized field names only, never submitted values. Scheduler reload occurs after successful commit, not during validation or an uncommitted transaction. Existing field-specific behavior for unrelated settings is preserved.
- Focused initial tests passed for late validation failures, injected audit failure rollback, deferred scheduler reload and clearing the saved name. Further regression includes invalid branding inputs and secret-value exclusion. Runtime scheduler-reload failure after a committed save still cannot roll back external registration side effects; this change guarantees database/audit atomicity. No production changes; full review remains open.
- Full backend regression: 773/773 passed, including all three new settings transaction/validation/secret-audit tests.


### Validate notification connection inputs and explain TLS behavior

- F32: SMTP ports now require integer numbers or digit strings in 1..65535 before any settings write. Removed parseInt truncation/default substitution. Webhook input must be bounded text and, when nonempty, an HTTP(S) URL without embedded username/password; empty still disables the channel and surrounding whitespace is normalized. Delivery's existing network restrictions remain unchanged.
- SMTP form adds required/min/max/step validation for port, native multiple-email validation for its documented comma-separated recipient list, and accurate implicit-TLS/STARTTLS-when-offered help. Both channel forms retain server save errors visibly. This does not change transport TLS policy or certify recipient deliverability.
- All 33 settings/notifier tests passed. New cases cover malformed/zero/negative/fractional/oversized ports, no partial branding writes, exact accepted boundary values, rejected URL schemes/credentials, normalized URL and channel clearing. TypeScript and changed-file ESLint passed. No notifications were sent and no live settings changed. Full review remains open.


### Preserve webhook secrets when editing channel URLs

- F32: Fixed a credential corruption path: the form previously resubmitted the masked secret when saving a changed URL. Unchanged secrets are now omitted, replacements are explicit and removal has a separate action plus pending-removal notice. The backend also treats the legacy mask sentinel as unchanged.
- Webhook URL/secret drafts survive background settings refresh, can be discarded, and lock during save/test. The cache stores only a presence mask after saving, never the replacement secret. Save/test buttons now identify webhook versus email channels.
- Five settings route tests passed, including exact persisted-secret preservation after URL-only and legacy-mask updates, explicit replacement and removal. Final TypeScript and changed-file ESLint passed. Actual NotificationsTab browser fixture verified an edited URL survives external refresh and submits only webhookUrl, with no secret field. Evidence: verification/webhook-secret-fixture.html and webhook-secret-preserved.png. No test message was sent.
- SMTP draft preservation and wider channel acceptance remain open. Synthetic local APIs only; no live channel changes. Full review remains open.


### Preserve SMTP drafts and manage password changes explicitly

- F32: SMTP connection drafts no longer follow background settings refresh while being edited. Discard adopts the latest saved values; save/test lock inputs and each other. Successful submission updates safe cached metadata before resetting the draft.
- Added a password-presence boolean to settings. Unchanged passwords are omitted, replacement/removal are explicit, and a removal warning appears before saving. Neither the plaintext password nor its ciphertext is exposed by the settings response or cached by the form.
- Six settings tests passed, including SMTP presence metadata, secret exclusion, omission preserving the stored password and explicit clearing. TypeScript and changed-file ESLint passed. Actual NotificationsTab browser fixture verified changed SMTP host surviving external refresh, a saved request without smtpPass, and explicit pending-removal feedback with tests disabled until saved. Evidence: verification/smtp-draft-fixture.html and smtp-password-preserved.png.
- No test email was sent and no live settings were changed. Full notification/review acceptance remains open.


### Contextual administration help and mobile entry point

- F35: Added route-specific guidance for notification channels, system runtime, global branding, Git synchronization and plugin administration. Precise route matching precedes broad administration help. Content reflects current saved-versus-draft behavior, explicit secret handling, cycle-history scope, Git import/publish differences and plugin approval limits.
- Added Guide for this page to the mobile profile menu, closing that menu before opening the existing accessible guide dialog. Previously the desktop help menu was hidden on small screens with only repository/issue links retained in the profile menu.
- TypeScript and changed-file ESLint passed. Actual ContextHelp browser fixture at /settings/notifications verifies that notification guidance is expanded first and other topics remain collapsible, with build/reporting instructions retained. Evidence: verification/context-help-fixture.html and context-help-notifications.png. Full mobile-menu interaction remains to be accepted; the full review stays open.


### Search complete host/playbook inventories before limiting results

- F35: Command palette previously rendered only the first 30 hosts/20 playbooks, leaving later entries outside cmdk's searchable set. It now scores the complete authorized inventory with cmdk's own defaultFilter, sorts matches and only then limits rendering. Initial empty search remains bounded. Current capability checks also gate cached host/playbook result rendering.
- Empty results show Searching resources while reference queries are in flight. The g-prefix shortcut clears its pending timer on effect cleanup.
- Two focused tests passed for host name/IP beyond item 30, playbook beyond item 20 and no-match queries. TypeScript and changed-file ESLint passed. Actual CommandPalette browser fixture with 100 hosts found Host 99 first and selecting it navigated to /servers/host-99. Evidence: verification/command-search-fixture.html and command-search-host-99.png. No live resources accessed or modified; full review remains open.


### Open playbook search results directly in read-only inspection

- F35: Playbook command results now link to /playbooks?file=<encoded filename>#tab=templates. The page reads the requested file and initializes a keyed TemplatesTab in read-only editor mode, loading content through the existing authorized endpoint. The filename field is initialized alongside selection.
- New-playbook requests are associated with the requested-file context so a previously issued create action does not replace a newly opened search result. Existing route draft blocking and editor permission gates remain in use. This change provides incoming file links; selection changes inside the library are not yet written back to the URL.
- TypeScript and changed-file ESLint passed. Actual PlaybooksPage browser fixture with a file query opens automation-59.yml directly, showing its content, revision, initialized filename and read-only state. Evidence: verification/playbook-link-fixture.html and playbook-direct-link.png. API responses were synthetic; no playbook run, edit or Git operation performed. Full review remains open.


### Consume playbook creation requests before navigation remounts

- F35: A previously handled New Playbook request could replay when returning to its original file query because the keyed editor remounted with the historical request still present. TemplatesTab now acknowledges each consumed request; the page clears it and assigns monotonically increasing IDs to subsequent actions. Cancelled discard confirmations also consume the attempted action rather than replaying it later.
- TypeScript and changed-file ESLint passed. Actual-component local browser verification covered creating/cancelling, switching to another file and returning to the original read-only file, then creating again and repeating creation without a file switch. Evidence: verification/playbook-request-fixture.html and playbook-request-return.png. Synthetic fixture automatically accepts discard confirmations; this does not constitute native-dialog acceptance coverage. No save or run occurred.
- Previous full frontend checkpoint: 240/240 tests across 50 files passed. Full review acceptance remains open; no deployment.


### Distinguish unavailable notes from an empty runbook

- F11/P2-03: Notes now show a loading state until a baseline for the current host exists and a retryable error when initial loading fails. Editing is unavailable before that baseline, preventing a pre-load draft from being overwritten by initial hydration. A background read error retains the initialized draft and displays a separate warning.
- Markdown and template insertion lock during save/reload. This prevents typing during an explicit reload from being silently replaced by its response. Reload errors persist next to the retained draft instead of appearing only as a toast.
- TypeScript and changed-file ESLint passed. Both isolated notes API tests passed, covering stale-write rejection, original-content retention, author attribution, 100-version retention and host/capability/environment access. These API tests do not prove frontend loading/reload interactions; browser acceptance for those states remains open. No production changes or deployment.


### Associate note attribution with the opened revision

- F11: The draft baseline now retains the complete loaded revision metadata, including author and timestamp. The UI labels this as the opened version; background query updates cannot incorrectly attribute an older draft to the latest author/revision. A differing server revision is shown separately with explicit load/copy guidance. Initial hydration, successful save and explicit reload all update the baseline metadata together with its revision.
- Load saved version is available to note readers as well as editors, under the existing view access gate; save/template actions remain edit-only. Reload progress is visible. This resolves the otherwise unusable refresh guidance for read-only users.
- TypeScript and changed-file ESLint passed. Browser verification of concurrent revision changes and read-only refresh remains open. No live note changes or deployment.


### Browser-check note availability and version presentation

- F11: Actual ServerOperationsTabs rendered in a local component fixture: loading displays no empty-note/editor UI; failed load exposes Retry; retry presents a viewer-only state with opened revision 1/Alice while server revision 2 is identified separately. Viewer can invoke Load saved version without save/edit controls. Pending reload disables its button and shows progress; simulated failure retains original content and a persistent error. Supplying resolved revision 2 updates attribution/content and removes the mismatch notice. Screenshot: verification/notes-opened-revision.png; reproducible fixture: verification/notes-review-fixture.html.
- Visually inspected the resolved state. Fixture supplies controller state and simulated mutations, so it verifies component rendering/actions, not actual controller/query concurrency, API transport, native discard confirmation or complete end-to-end notes acceptance. No live notes changed.


### Audit note revision changes atomically

- F11/F04: Successful note writes now add a central server.notes_update audit entry inside the existing note/revision/retention transaction. It retains host ID/name and old/new revision numbers with actor and host environment, excluding note contents. The UI names the event Host notes updated.
- Three notes API tests passed. New fault injection aborts audit insertion and verifies the original content, revision zero and empty revision history survive unchanged; after removing the fault, save succeeds and audit identifies the host/revision transition without private content. Five audit-display tests and changed-file ESLint passed. No live notes changed; full review acceptance remains open.


### Complete regression checkpoint after notes and navigation changes

- Full current backend suite: 777/777 tests passed, no failures or skips (18 suites). Full frontend suite: 240/240 tests passed across 50 files. TypeScript passed. Logs: /tmp/review-current-backend.log and /tmp/review-current-frontend.log.
- Initial frontend run exposed one obsolete source-text assertion requiring the old create-request counter expression. Removed that implementation-specific assertion and its unused source read; remaining contract checks remain. The new creation-request behavior has the preceding actual-component browser evidence (cancel, file switch/return, repeated creation).
- These regression results do not close the pending end-to-end, mobile or full feature acceptance requirements. No deployment.


### Surface note audits under stable host scope

- F04/F11: Added server.notes_update to the default change focus and canonical host-ID authorization/link handling. Previously the new event was absent from changes and its quoted historical name could not be scoped reliably for restricted readers. Existing host links now open #tab=notes. Historical names are retained in details, while accessible current names label the link.
- Nine audit route tests passed. New case verifies default change focus, visible-versus-hidden host IDs, direct notes links and consistent scoped list/count/export behavior even when the recorded name differs from the current host name. No production changes; full review acceptance remains open.


### Retain transfer failures beside their inputs

- F12: Upload and cross-host transfer dialogs now retain mutation errors in an accessible alert, in addition to existing toasts. Opening a new upload/transfer clears the previous mutation error so it is not attributed to another file. Input values remain available for correction after a failed request.
- Transfer submission now requires a successfully loaded target inventory containing the chosen host, distinct from the source. A stale selection cannot remain submit-enabled after a target-list failure/removal. Existing server authorization remains authoritative.
- TypeScript and changed-file ESLint passed. Browser/error-transport verification remains open; no live upload or transfer occurred. Full review remains open.


### Browser-check failed file transfers and removed destinations

- F12: Actual ServerFilesTab with simulated HTTP responses verified destination selection/default absolute path, a failed POST retaining form inputs and persistent error, then refreshed target inventory removing that host and disabling submission. Added explicit selected-destination-unavailable guidance; it appears alongside the retained path and failure. Evidence: verification/files-transfer-fixture.html and files-transfer-error.png.
- TypeScript and changed-file ESLint passed. Synthetic responses only, no real file transfer. Upload transport/cancellation and successful remote-transfer acceptance remain open.


### Verify upload transport and staged-file cancellation contracts

- F12: Inspected apiUploadFile, the upload route, SSH uploadStream and their existing tests. Current focused checks pass: 20 API client tests and 14 file-transfer tests. Specific coverage proves AbortSignal aborts the browser request, 100% browser progress does not resolve before the HTTP result, late destination failure propagates, post-settlement progress is ignored, and interrupted SSH streams remove the staged file and dispose their isolated connection.
- The route observes aborted requests/closed responses once streaming setup is complete; SSH staging occurs beside the destination before rename. These are simulated transport/SFTP tests, not an actual browser-to-host cancellation test. Early disconnect during the preliminary existence check and cancellation at final rename remain unverified and must not be presented as guaranteed rollback. No live file operations.


### Stop uploads disconnected during SSH preflight

- F12: Upload route now checks disconnected request/response state before remote existence probing and again after that awaited probe, before piping request bytes or invoking uploadStream. Previously the aborted/close events could fire before streaming listeners were installed, allowing the handler to start work for an already-disconnected browser.
- A regression invokes the actual upload handler with simulated request/response events during the asynchronous existence probe. It failed against the prior code (uploadStream called once) and passes after the fix, verifying no piping, no upload start and no lingering abort/close listeners. All 15 file-transfer tests pass.
- This proves the early-preflight race using controlled transport events. Final-rename cancellation and real browser-to-SSH acceptance remain separate/open; no live upload occurred.


### Make upload cancellation outcome explicit

- F12: Canceling an active upload now retains a visible notice with its destination path, distinguishing browser cancellation from an unconfirmed destination result. It explains that an already-completed remote write cannot be undone by canceling. Inspect destination folder navigates to the target parent and refreshes file queries; the notice is dismissible. Canceling an unsubmitted upload dialog does not create the notice.
- Starting another upload remains disabled until the prior mutation settles, including after its dialog closes, preventing a new dialog from being mixed with callbacks from the previous request. File-selection handling enforces the same pending guard.
- TypeScript and changed-file ESLint passed. Browser cancellation/notice interaction remains to be verified. No live file operations; full review remains open.


### Browser-check upload cancellation feedback

- F12: Actual ServerFilesTab and apiUploadFile exercised in-browser with generated File selection and a controlled XMLHttpRequest. At 100% the dialog remains pending with explicit destination-write acknowledgement text and locked inputs. Cancel aborts the simulated request, closes the dialog, leaves the destination-unconfirmed notice, and makes Upload available again after settlement. Inspect destination folder and Dismiss were exercised.
- Evidence: verification/upload-cancel-fixture.html and upload-canceled-notice.png. This fixture replaces file-picker selection and network transport; no live file was selected or sent. It proves component/client feedback, not remote rollback or final-rename cancellation. Full review remains open.


### Preserve JSON terminal output and separate control frames

- F12: Terminal previously discarded any valid JSON object received as raw output. Unknown JSON now falls through to xterm. New clients request output=json-v1; server wraps stdout/stderr in explicit output frames, decoded without interpreting their contents as control messages. Thus application JSON containing type:error cannot set the connection offline. Clients without the format request retain the prior server wire format. New frontend with an older server still has the legacy ambiguity for control-shaped raw JSON; deploy the matching server/frontend for complete protection.
- Actual-terminal browser fixture visually verifies ordinary JSON and an application type field remain visible while ready establishes connected status. Screenshot: verification/terminal-json-output.png; fixture: verification/terminal-json-fixture.html. Ten terminal-session tests pass, including stdout and stderr output frames carrying control-shaped JSON without closing the session. TypeScript and changed-file ESLint passed. No real SSH connection; complete review remains open.


### Preserve UTF-8 across terminal chunk boundaries

- F12: Replaced independent per-chunk UTF-8 conversion with separate streaming StringDecoders for stdout/stderr; remaining decoder output is flushed on shell close. This prevents valid multibyte characters split by SSH packet boundaries from becoming replacement characters. Both negotiated and legacy output paths use the decoded text.
- New actual-handler regression interleaves stdout/stderr with split umlauts and a split four-byte emoji. It reproduced replacement-character corruption before the fix and verifies exact resulting output after it. All 11 terminal-session tests passed. No live SSH session; full review acceptance remains open.


### Browser-verify framed output versus terminal lifecycle

- F12: Actual SshTerminal/xterm browser fixture receives output frames containing JSON with type:error and Unicode. Visual inspection confirms literal content is rendered and status remains connected. A separate closed/idle_timeout control frame switches to disconnected, freezes session duration and disables Ctrl+C, retaining searchable/copyable output and the precise expiry reason.
- Evidence: verification/terminal-frame-fixture.html and terminal-framed-output.png. Controlled WebSocket fixture only; no SSH host or remote command involved. The fixture's legacy close stub omits CloseEvent data; the inspected expiry state comes from the explicit closed control frame. Full transport/browser integration and overall review acceptance remain open.


### Align the playbook Git shortcut with connection policy

- F18: Playbook Git widget now names pending configuration loading, disables actions without a configured repository, labels remote read-only mode and disables publishing in that mode. Pull and push lock each other while pending. Icon controls have explicit accessible names and pending/error feedback remains visible. Successful pull refreshes Git config/status and playbook inventory; push refreshes status.
- TypeScript and changed-file ESLint passed. Browser acceptance of these widget states remains open. Server policy enforcement is unchanged; no remote Git operation or deployment occurred.


### Browser-check read-only Git shortcut and persistent pull errors

- F18: Actual PlaybooksPage fixture with a configured read-only remote shows branch/mode, exposes the named pull control and disables the named push control with an explanatory tooltip. A simulated HTTP 409 pull conflict remains visible in the widget after the request.
- Evidence: verification/git-widget-fixture.html and git-widget-readonly-error.png. All HTTP responses are synthetic; no external repository or Git operation was accessed. Loading and simultaneous-operation browser checks, plus full feature acceptance, remain open.


### Keep Git shortcut feedback tied to the latest operation

- F18: Replaced combined historical pull/push mutation errors with one operation-error state cleared at the start of either action. A failed prior pull can no longer remain displayed after a later push attempt succeeds, or mask a newer push error. Both successful actions now invalidate the commit-history query as well as their existing status queries.
- TypeScript and changed-file ESLint passed. Browser verification of sequential pull/push feedback remains open. No external Git operations; full review acceptance remains open.


### Browser-check sequential Git feedback and pending controls

- F18: Actual PlaybooksPage fixture exercised a failing pull followed by delayed successful push. The old pull error clears when push starts, both action buttons disable, pending text identifies push, and success restores both controls without stale error text. Evidence: verification/git-feedback-fixture.html and git-feedback-recovered.png.
- Simulated API responses only. This confirms shortcut UI behavior; it does not perform or validate external Git publishing. Full review acceptance remains open.


### Regression and production-build checkpoint after terminal and Git fixes

- Full backend: 781/781 tests pass across 18 suites, no failures/skips. Full frontend: 240/240 tests pass across 50 files. Production Vite build succeeds into /tmp/shipyard-review-terminal-git-build; the live/dist artifact is untouched. Only build warning concerns the deliberately external output directory not being emptied automatically.
- Logs: /tmp/review-terminal-git-backend.log, /tmp/review-terminal-git-frontend.log, /tmp/review-terminal-git-build.log. These results validate automated regression/build coverage, not the remaining whole-app, mobile, external workflow or requirement-by-requirement acceptance. No deployment.


### Preserve Git automation settings drafts during refresh

- F18: Git dashboard synchronization toggles now derive from saved configuration until edited, then retain an independent draft across background refresh. Removed effect-based overwriting of auto-pull, auto-push and remote-read-only fields. Discard adopts the latest stored configuration; successful save updates cache before clearing the draft.
- Toggles lock while saving and save failures remain visible next to the controls. Read-only still forces auto-push off through functional draft updates. Existing navigation guard remains.
- TypeScript and changed-file ESLint passed. Browser refresh/save/discard acceptance and credential-draft handling remain open; no Git settings saved on a live server. Full review remains open.


### Keep credential-method drafts stable during configuration refresh

- F18: Git credential method now follows configuration only until explicitly selected or credential input begins. Removed refresh-effect resetting of the selected method. Input pins its method, so a background config change cannot redirect the pending draft to another credential type. Discard clears token/key drafts and returns to current configuration.
- Credential method controls and fields lock while saving; failures persist beside the form. TypeScript and changed-file ESLint passed. Browser verification and compatibility of switching credential method with the stored remote URL remain to be reviewed; no credentials saved or remote Git calls made. Full review remains open.


### Match Git credentials to the repository transport

- F18: Credential updates now reject SSH credentials for HTTP(S) remotes and HTTP credentials for SSH remotes before touching either stored credential. Shared backend SSH recognition accepts validated SCP-style URLs with arbitrary usernames, correcting buildEnv's former git@-only detection.
- Dashboard derives transport from the remote URL rather than whichever credential happens to be present; incompatible method controls/submission are disabled and the URL requirement is explained. This does not implement an in-place remote-URL migration flow.
- 18 validation/credential tests and 14 connection/preservation tests passed. New regression verifies mismatch leaves existing token/key intact and deploy@example.test:path is recognized as SSH. TypeScript and changed-file ESLint passed. No live credentials or remote operations changed; complete review remains open.


### Roll back rejected Git configuration requests completely

- F18: PUT Git config now wraps its database changes in one transaction. Credential-method validation failures propagate out of that transaction before producing HTTP 400; earlier username/automation/read-only writes no longer remain after an overall rejected request. Unexpected database errors retain the centralized server-error path.
- New isolated route regression passes: a request changing identity/read-only/auto-pull plus incompatible credentials returns 400 with all original settings intact, and a subsequent valid request persists normally. This establishes database atomicity, not rollback of external Git commands. No live settings changed; full review remains open.


### Browser-check Git draft preservation and discard

- F18: Actual GitTab with memory router and controlled query data: enabling auto-pull retains the draft when refreshed stored config changes read-only to false; discard adopts latest auto-pull=false/read-only=false and disables Save Settings. HTTPS remote disables the incompatible SSH method. A synthetic credential input enables save/discard, remains dirty through refresh and discard returns controls to disabled. No credential save performed.
- Evidence: verification/git-draft-fixture.html and git-draft-discarded.png. This proves local draft/discard behavior against controlled query refresh, not remote Git connectivity or completed credential rotation. Full review acceptance remains open.


### Audit Git configuration and automation policy atomically

- F18/F04: Both Git settings/config routes now write audit entries in the same transaction as settings. Entries include submitted recognized field names and before/after effective auto-pull/auto-push/read-only booleans; credential and identity values are excluded. Git update events are included in the default change focus and have readable UI names.
- Two isolated Git configuration tests pass, including injected audit failure rolling back both endpoints and successful token update audit excluding the token. Five audit-display tests pass. No live credentials/settings changed. Full review acceptance remains open.


### Render Git policy changes as a before/after comparison

- F04/F18: Git configuration/settings audit rows now show changed auto-pull, auto-push and read-only rules in a labeled Before/After table. Credential-only updates explicitly state that automation policy is unchanged. Submitted field names and collapsible raw details remain available. Malformed or incomplete boolean snapshots fall back to original detail rendering. Interpretation is restricted to the two Git update action types.
- Six audit-display tests pass, including changed-only output, unchanged policy and malformed snapshot fallback. TypeScript and changed-file ESLint passed. Browser/table visual acceptance remains open; full review remains open.


### Visually verify Git audit comparisons

- F04/F18: Actual AuditLogPanel browser fixture verifies readable event names, changed auto-pull/read-only before/after values and the unchanged-policy message for credential-only updates. Initial visual inspection exposed touching Before/After values; added table cell spacing and a bounded minimum width, then visually rechecked the corrected layout.
- Evidence: verification/git-audit-fixture.html and git-audit-comparison.png. Synthetic rows only; desktop visual check, not a complete responsive acceptance. Full review remains open.


### Correct narrow audit card layout

- F04: Rendered actual AuditLogPanel in a 390px iframe viewport. The mobile card truncated the action and constrained details beside its status badge. Moved details below the header into full-width, horizontally scrollable containment and allowed action text wrapping. Rechecked visually: full action labels, clearly separated before/after values, retained status and metadata.
- Evidence: verification/git-audit-narrow-fixture.html (loads git-audit-fixture.html) and git-audit-390px.png. Changed-file ESLint passed. This verifies this responsive view at 390px, not all app mobile workflows or touch-device behavior. Full review remains open.


### Inspect Git settings at a narrow viewport

- F18: Actual GitTab rendered inside a 390px iframe viewport, inspecting top, middle and lower sections. Remote/status text wraps; credential controls, branch choice, manual synchronization, automation switches and Save/Discard stay within the form width. No additional layout defect observed in these states.
- Evidence: verification/git-settings-narrow-fixture.html with git-draft-narrow-fixture.html and git-settings-390px.png. Fixture scroll positioning is synthetic and data is mocked. This is a responsive layout inspection, not mobile-device/touch or all validation/error-state acceptance. Full review remains open.


### Retain mounted Git forms when background configuration refresh fails

- F18: GitTab previously replaced the complete dashboard/setup with QueryErrorState on any query error, unmounting and losing local drafts even when cached configuration remained available. Initial load failure still shows the standalone error; background failure now displays a warning/retry above the stable keyed form using its last loaded configuration.
- TypeScript and changed-file ESLint passed. Browser reproduction of a failed refresh with an active draft remains to be verified. No live Git settings changed; full review acceptance remains open.


### Browser-check drafts across failed Git refresh and retry

- F18: Actual GitTab fixture edited auto-pull, triggered a failed configuration refetch and then used Try again for a successful refetch. The error appears above the mounted form; auto-pull remains edited and Save/Discard remain enabled both during the error and after successful retry.
- Evidence: verification/git-refresh-error-fixture.html and git-refresh-draft-retained.png. Controlled network responses only, no saved setting or external repository operation. Full review acceptance remains open.


### Keep global Git audits outside inferred host scope

- F04/F18: Git audit actions now explicitly bypass text-based host attribution: host-restricted readers cannot gain visibility from a server= or target= fragment in details, and global Git rows do not generate inferred host links. Existing unrestricted/all-host audit access is preserved.
- Ten audit route tests passed. New case verifies scoped list/count/export exclusion and administrator visibility under change focus without a misleading object link. No live audit/configuration changes; full review acceptance remains open.


### Validate Git commit identities before configuration changes

- F18: Setup and configuration routes reject non-string, oversized, control-character and angle-bracket author identities with HTTP 400. Email addresses require a single non-whitespace local/domain pair while retaining local addresses such as shipyard@localhost. Empty optional identities retain defaults; accepted values are trimmed. Setup inputs now expose matching maximum lengths (200/254).
- Three isolated Git configuration route tests pass. New regression checks invalid values against both endpoints, unchanged existing settings, and that setup is never invoked for rejected input. Unicode author names, local domains and empty defaults remain accepted. No live settings or repository operations changed. Full review acceptance remains open.


### Apply credential validation to legacy Git configuration calls

- F18: Configuration requests without credentialMode now infer the method from the submitted token/key and use the same credential updater as the current UI. Removed direct token storage that bypassed remote transport checks. Key-only requests are no longer silently ignored. Non-string credentials and mixed nonempty token/key submissions are rejected before credential writes.
- 22 Git route/service tests passed. Added route coverage for legacy transport mismatch, malformed keys, ambiguous credentials, atomic preservation of existing credentials/settings and valid token/key rotation. No live credentials changed. Full review remains open.
- Full backend checkpoint: 787/787 tests across 18 suites passed (review-git-input-backend.log). The final explicit-null credential-mode handling also passed the four isolated configuration route tests. This does not establish live Git acceptance or completion of other review areas.


### Validate credentials before initial Git setup or connection probes

- F18: Shared credential validation now runs before setup writes any settings or touches its workspace. It rejects non-text/oversized credentials, mixed token/key input and credentials incompatible with the remote transport. Credential updates apply the same size limits. Connection probes now reject SSH keys for HTTP remotes before creating temporary files or launching Git, rather than silently ignoring the supplied key.
- 28 targeted Git setup/configuration/probe tests passed. New regressions verify invalid setup input preserves the full previous configuration and a mismatched probe does not execute Git. This does not provide rollback after an otherwise valid setup encounters an external Git failure. No live connection or credentials changed; full review remains open.


### Keep initial Git synchronization failures visible after connecting

- F18: GitTab retains an unsuccessful initial synchronization result above the dashboard after setup switches to the configured view. The dismissible message explicitly describes the initial attempt and directs the user to review branch/local changes and retry Pull. Previously the result appeared only in a transient toast.
- Setup request failures now also render beside the form. A disabled fieldset prevents editing or duplicate submission while setup runs; whitespace-only repository input cannot submit. The warning is retained for the mounted Git tab, not persisted across navigation/reload. Browser acceptance of this transition remains open; no live setup performed.


### Browser-check the initial Git synchronization result

- F18: Actual GitTab with a simulated delayed setup response successfully switches to the dashboard and retains the initial-sync failure message. Visual inspection found that the scroll position stayed at the former submit button, hiding the result above the viewport. Added programmatic focus to the new warning; repeated the flow and confirmed the message is immediately visible without manual scrolling.
- Evidence: verification/git-setup-result-fixture.html and git-initial-sync-warning.png. Local controlled responses only; no live repository/settings changed. Pending-state input locking and setup HTTP-error presentation still need dedicated browser verification. Full review remains open.


### Match Git help text to optional synchronization and identity defaults

- F18: Replaced the setup description's unconditional automatic-sync promise with explicit separate auto-pull/auto-push controls. Auto-pull help now describes an attempted pull and calls out unavailable remotes/local changes. Removed the unconditional secure-storage claim from token help; it now states the observable masked-form behavior.
- Author name/email hints and placeholders now show the actual server defaults (Shipyard and shipyard@localhost). Removed stale wording claiming SSH always uses an existing Shipyard key. JSON syntax validated and values checked against current Git configuration/autoPull implementation. Full review remains open.


### Align Git history navigation with the page returned by the server

- F18: Git history range and Previous/Next now use pagination.page returned by the backend, which clamps an out-of-range request after history shrinks. Previously the range and navigation continued from the stale requested page. Navigation is disabled during fetches. Query failures use the shared accessible retry state.
- Commit messages now wrap instead of irretrievably truncating, and author/date metadata can wrap at narrow widths. Current server getLog clamping inspected; browser acceptance of shrinking history and long commit content remains open. Full review remains open.


### Distinguish empty Git history from repository failures

- F18: getLog now propagates commit-count and history-read failures instead of returning a successful empty history. An unborn branch is still empty when symbolic HEAD points to an absent branch reference; invalid/damaged references produce a load error. Git command results retain exit codes for this distinction.
- Two real local-repository tests passed, including an unborn branch and a deliberately damaged reference with restoration in finally. Existing delimiter/absolute-date test remains green. No remote operations or live repository changes. Full review remains open.


### Report unavailable Git status and branch inventories accurately

- F18: Branch-list command failures now propagate instead of returning empty arrays. Working-copy status propagates failed runtime-to-workspace copies and failed branch/status commands instead of presenting incomplete changes as clean. Detached HEAD is named explicitly instead of being labeled main.
- 14 local Git history/preservation tests passed. Added real-repository cases for malformed config, detached checkout, and a runtime YAML path that cannot be copied. Fixtures restore local state in finally; no live repositories changed. Full review remains open.


### Prevent switching to a Git branch missing from the refreshed inventory

- F18: Removed the invented main/configured-branch inventory fallback while branches load. A selected branch absent from the returned inventory now appears as unavailable and cannot be submitted. Branch selection locks during inventory refresh, checkout, pull and push; switching requires membership in the loaded inventory. Pending checkout names its destination.
- Existing branch/status error states already provide retry and suppress the corresponding successful view. Browser verification of removed-branch selection remains open; no live checkout performed. Full review remains open.


### Refresh imported playbooks after Git settings operations

- F18/F14: Successful Pull and branch checkout in Git settings now invalidate the playbook inventory, individual playbook queries and branch inventory in addition to existing Git status/history/config refresh. This prevents navigating back to cached pre-import files and ensures newly tracked branches appear after checkout.
- Query keys checked against PlaybookTemplates and run/schedule consumers. Browser acceptance across settings-to-editor navigation remains open; no live import/checkout performed. Full review remains open.


### Remove tracked playbooks deleted by a successful Git import

- F18/F14: Pull and checkout capture the tracked top-level YAML filenames before changing the workspace. After successful import, runtime copies of those files are removed when absent from the resulting workspace. Previously remote deletions remained executable locally and could be copied back into Git by a subsequent status check. Backup filenames and files outside the prior tracked set are not deletion candidates.
- 11 real local Git preservation tests passed, including a remote add/import/delete/import sequence proving removal of the obsolete runtime playbook while retaining a local backup. Existing local-edit/conflict protections remain green. No live repositories changed. Full review remains open.


### Verify imports when the target branch has no playbook directory

- F18/F14: Added a real local-repository checkout regression: switching to a branch with the entire playbooks directory removed clears previously tracked runtime files, retains a backup, and a subsequent status call neither reports phantom changes nor recreates deleted files. Switching back restores the source branch's playbooks.
- All 44 tests in server/test/git-*.test.js passed. This covers the tested local import/deletion paths, not concurrent live edits or full UI acceptance. Full review remains open.


### Preserve Git configuration when disconnect fails

- F18: Disconnect clears its settings in one database transaction. A later write failure no longer leaves the URL/token partially cleared. The confirmation dialog stays open during the request and on failure, displays the error, blocks duplicate submission/dismissal while pending, and closes on success.
- Five isolated configuration route tests passed, including an injected credential-write failure proving URL/token rollback and a subsequent successful disconnect. No live disconnect performed. Browser dialog acceptance remains open; full review remains open.


### Audit Git disconnection atomically

- F18/F04: Successful disconnect writes a readable Git audit event in the same transaction as clearing configuration. The event records the actor and retention of the local workspace without URL/token/key values. Added the action to default change focus and its frontend display label; existing global Git scope handling applies.
- 16 configuration/audit-route tests passed. New injected audit failure preserves URL/token; successful retry produces the secret-free actor-attributed event. No live audit or connection changes. Full review remains open.


### Avoid embedding HTTPS tokens in Git remote configuration

- F18: Git commands now receive HTTPS authentication through process-local Git configuration (http.extraHeader), with credential helpers disabled. Setup/fetch/push paths set origin to the credential-free configured URL instead of embedding the token in the URL/command arguments.
- All 47 Git tests passed. New transport regression captures command arguments/environment and verifies the clean remote URL and temporary authentication header. Previously persisted credential-bearing remotes are rewritten by the next remote-setting operation; immediate cleanup on disconnect of an untouched legacy workspace remains open. No live credentials/repositories changed. Full review remains open.


### Clear legacy Git connection artifacts on disconnect

- F18: Disconnect first removes the local remote.origin configuration and clears its temporary SSH key, then clears database settings with the existing atomic audit transaction. Local inspection/removal failures stop before database clearing. This removes tokens previously embedded in origin URLs without removing local files, commits or remote data. Updated confirmation copy to describe retention and credential/config removal.
- 11 local Git/configuration tests passed, including a legacy token URL, retained commit/file contents and repeat cleanup without an origin. If the subsequent database transaction fails, database settings remain but origin has already been removed; the next fetch/push recreates it from saved settings. No cross-filesystem/database rollback is claimed. No live connection changed. Full review remains open.


### Stop Git transport when updating origin fails

- F18: Fetch, manual push and automatic push now check setRemote's result before issuing network commands. Previously they could continue using an old origin after both URL update and remote creation failed. Returned/logged errors describe the configuration failure without forwarding remote output.
- All 49 Git tests passed. New injected failure verifies fetch is never launched and the last successful fetch timestamp remains unchanged. Manual/automatic push guards inspected in code; no live Git operation performed. Full review remains open.


### Distinguish zero usage from unavailable infrastructure measurements

- F19/F20: Infrastructure byte display now renders measured zero as 0 B. RAM/disk percentages no longer replace absent used-capacity values with zero; nonfinite/negative usage or invalid capacity renders unavailable. This prevents unknown measurements appearing as healthy empty resources.
- Inspected overview loading/error/empty branches: query failures already have separate retry panels and initial empty state requires both queries to succeed. Visual acceptance of measurement states remains open. Full review remains open.


### Apply measurement semantics to infrastructure details and host tables

- F19/F20: Detail byte/percentage formatters now distinguish zero from missing/invalid data. Shared uptime formatting rejects negative/nonfinite measurements and shows minutes below one hour. Overview host tables preserve absent used-capacity values rather than synthesizing zero; capacity rows reject invalid usage.
- Added formatter coverage for zero, unavailable/invalid capacity, and short uptime. Browser validation across all consumers remains open. Full review remains open.


### Show the complete reported datastore inventory in platform preview

- F19/F22: PlatformPreview's datastore list now uses all reported stores instead of the preferred-capacity subset, which hid non-ZFS stores whenever ZFS was present and omitted stores without capacity. Rows identify node and type. The single capacity-summary store remains selected by the existing preference but is explicitly identified as representative with its node.
- Current selection/list code inspected. Browser acceptance with mixed datastore types remains open; full review remains open.


### Complete drill-down navigation from platform preview

- F19/F21: Node rows now link directly to node details, matching guest-row navigation. Guest previews with more than eight entries expose a View all link with the full and remaining counts, opening the platform VM/container tab instead of silently truncating the inventory.
- Route destinations and tab hash checked against InfrastructureTree, ClusterDetail and useUrlTab. Browser navigation acceptance remains open. Full review remains open.


### Use full platform-preview width when only one connection exists

- F19: The desktop platform overview omits the redundant selection column for a single platform and lets its preview span the panel. Multiple platforms retain their selector/detail layout. The single-platform view also drops the selector-driven minimum height.
- This directly addresses the review's empty platform-selection space. Responsive visual acceptance remains open. Full review remains open.


### Preserve reported status labels in infrastructure preview

- F19/F20: Platform badges preserve non-online status labels rather than labeling every alternative Offline. Platform/node dots reserve red for explicit offline status and use neutral color for unknown states. Node rows now include a textual status, so reachability is not conveyed by color alone.
- Uses existing shared statusLabel formatter. Backend node records can report unknown; platform aggregation semantics remain to be checked separately. Browser visual acceptance remains open. Full review remains open.


### Preserve unknown platform reachability in summary data

- F19/F20: Summary aggregation now reports unknown when there are no node observations or when all non-online observations include unknown states. Offline requires a nonempty set of explicitly offline nodes. Any online node still establishes platform reachability; individual node statuses retain partial-failure detail.
- Regression covers empty, unknown, mixed offline/unknown, all-offline and reachable mixed-node cases. One test passed. Full review remains open.


### Preserve partial infrastructure refresh warnings

- F19/F20: Infrastructure summary serialization now includes warnings, and the partial-refresh path passes them through when retaining cached platform data. Previously the overview's warning UI received no warning after this fallback and could appear fully refreshed.
- Two summary tests passed. New regression verifies warning preservation through refresh serialization and subsequent cached responses. It does not prove individual retained-platform collection timestamps; those remain open. Full review remains open.


### Track collection time and failed refresh per platform

- F19/F20: Successful platform collection records collected_at. Summary serialization preserves that value; retained platforms keep the old timestamp and receive stale=true after a failed refresh. Desktop preview and compact platform rows display collection time and a retained-data warning. Legacy snapshots without a timestamp show an unknown date rather than inventing one.
- Three summary tests passed, including retention of an old timestamp through an actual failed group request and summary serialization. Visual acceptance remains open. Full review remains open.


### Follow server-side infrastructure refresh to completion

- F19/F20: Overview queries now poll every two seconds while the server reports refreshing, otherwise every 30 seconds. The refresh control includes server-side activity and a status message explains that prior observations remain visible. Previously the stale-while-revalidate response had no follow-up polling, so completed server refreshes could remain unseen until another user action.
- Query interval uses the response flag without enabling background-tab polling. Browser timing/error-recovery acceptance remains open. Full review remains open.


### Integrated verification after Git and infrastructure corrections

- Full frontend suite: 242/242 tests in 50 files passed. Vite production build completed successfully in /tmp/shipyard-review-infrastructure-build, preserving the existing production output. These checks include existing infrastructure detail/datastore tests but do not substitute for outstanding browser acceptance of overview changes.
- Full review remains open.
- Full backend suite: 802/802 tests in 18 suites passed (review-infrastructure-backend.log). No deployment or live configuration changes performed.


### Visually verify the revised platform overview

- F19/F20/F22: Actual InfrastructurePage rendered with a controlled single-platform response, unknown node state, ten guests, ZFS/directory/NFS stores, zero usage and missing capacity. Desktop screenshot confirms full-width preview, visible retained-data warning and collection timestamp, all three stores with node/type, and distinct zero/unknown capacity. Accessibility tree confirms node detail URL and View all URL with tab=vms and remaining count.
- Evidence: verification/infrastructure-overview-fixture.html and infrastructure-overview-retained.png. Synthetic responses; destination pages were not exercised in this fixture. Responsive and timed refresh acceptance remain open. Full review remains open.


### Inspect platform overview at 390px width

- F19/F20: Actual InfrastructurePage rendered within a 390px iframe. Refresh/actions, warning, unknown status, long hyphenated platform name and retained collection timestamp remain readable inside the compact card with no observed horizontal overflow. Desktop-only details remain behind the platform link as designed.
- Evidence: verification/infrastructure-narrow-fixture.html, infrastructure-overview-narrow-source.html and infrastructure-overview-390px.png. Simulated data and iframe viewport; no device/touch or destination-page acceptance claimed. Full review remains open.


### Browser-check automatic refresh completion

- F19/F20: Actual InfrastructurePage received two refreshing responses followed by a completed response. Without clicking Refresh, the page replaced the platform name/status/collection timestamp, removed the pending message and stale warning, and re-enabled Refresh. Confirms follow-up polling for this successful transition.
- Evidence: verification/infrastructure-refresh-fixture.html and infrastructure-refresh-completed.png. Controlled responses and visible local tab; network-error recovery and real Proxmox timing remain outside this check. Full review remains open.


### Recover controls after a failed background infrastructure request

- F19/F20: Cached refreshing=true no longer keeps the main refresh button disabled or displays an active-server-refresh message after the next query fails. Failed queries fall back to the normal poll interval. Existing data remains visible with the error/retry panel.
- Actual InfrastructurePage fixture verified pending → HTTP 503 → enabled Refresh and Try again → updated data and cleared error. Evidence: verification/infrastructure-refresh-error-fixture.html and infrastructure-refresh-error.png. TypeScript and changed-file ESLint passed. Controlled responses only; full review remains open.


### Add named saved filters to the infrastructure tree

- F19: Added a Saved filters section with explicit name, save/replace, apply and delete controls. Up to 20 text filters persist in local browser storage scoped by username and environment. Scope changes reset the active search and load that scope's saved filters. Storage errors are surfaced; malformed stored entries are ignored.
- This implements named saved text filters; object favorites are a separate outstanding requirement. Browser persistence, account/environment switching and visual acceptance remain open. Full review remains open.


### Browser-check named tree-filter persistence

- F19: Actual InfrastructureTree fixture saved a named Application 9 filter, reopened the page in another tab, found the saved entry and applied it. Search text and name were restored, Replace saved filter appeared and the tree showed only the matching guest. Deleted the fixture entry through the UI afterward.
- Evidence: verification/tree-filters-fixture.html and tree-filter-restored.png. Synthetic account/data; account/environment isolation and storage-failure acceptance remain open. Full review remains open.


### Browser-check saved-filter account and environment separation

- F19: Actual InfrastructureTree with three synthetic account/environment filter stores: switching A/A to A/B cleared active search and loaded only A/B's filter; switching to B/A loaded only B/A's filter. Existing tree data remained available after the search reset.
- Evidence: verification/tree-filter-scope-fixture.html and tree-filter-account-scope.png. Test controls update the local UI store/query profile; this verifies component scope behavior, not a real authentication session switch. Full review remains open.


### Add infrastructure object favorites

- F19: Added Favorites with add/remove-current-resource, direct navigation and removal controls. Supports inventory hosts (including adopted hosts), platforms, nodes and guests. Stores up to 50 paths per account/environment in this browser; labels and visible entries resolve from current inventory rather than persisting object names. Unavailable entries can be cleared explicitly.
- Separate component guards against displaying a prior scope's stored paths during scope changes. Storage write failures show an error. Browser persistence/navigation/access-change acceptance remains open. Full review remains open.


### Retain unavailable favorites while inventory is incomplete

- F19: Unavailable-favorite cleanup now requires successful, idle host loading and (when permitted) a completed infrastructure response without warnings or retained stale platforms. Pending/failed/partial inventory shows a retention explanation instead of offering to erase unresolved paths. Added an explicit 50-favorite limit message.
- Favorite visibility still resolves only against returned resources. This guard avoids interpreting temporarily absent inventory as permanent removal; browser acceptance remains open. Full review remains open.


### Browser-check favorite retention during incomplete inventory

- F19: Actual InfrastructureFavorites added the current resource, hid it during an empty incomplete inventory with a retention explanation and no cleanup control, then restored its link/count when inventory returned. Remove-current and per-item removal controls appeared; fixture favorite removed through the UI afterward.
- Evidence: verification/favorites-review-fixture.html and favorites-restored.png. Component uses controlled resource props/current path; this does not establish integrated tree navigation or real authorization changes. Full review remains open.


### Disambiguate infrastructure favorites by resource context

- F19: Favorite entries now show resource type and identifying context below the name: host address/id, node platform, and guest type/id/node/platform. Remove controls include that context in their accessible names. Display metadata still resolves from the current inventory and is not persisted alongside paths.
- This avoids indistinguishable same-name favorites across resource types/platforms. Visual acceptance of long context labels remains open. Full review remains open.


### Verify favorite navigation through the infrastructure tree

- F19: Actual InfrastructureTree with TanStack routes opened a platform, saved it as a favorite, navigated to the overview, then returned via the favorite link. Current-resource action correctly changed from disabled on the overview to Remove current favorite on the platform route. Fixture entry removed afterward.
- Evidence: verification/favorite-navigation-fixture.html and favorite-navigation-restored.png. Route destination bodies are fixture markers; actual platform-detail loading and real-session persistence are not covered. Full review remains open.


### Explain stale and filtered infrastructure tree states

- F19: Tree shows a concise link to overview details when summary warnings or stale platforms are present. A search excluding all existing platforms now reports no filter matches instead of offering Connect Proxmox as though no infrastructure existed.
- Uses the same summary warning/stale fields as the overview. Browser acceptance of these tree states remains open. Full review remains open.


### Reveal tree matches inside collapsed branches

- F19: Active text filters temporarily expand platform, node and host-folder branches without modifying saved collapsed state. Collapse controls are disabled during filtering and a short explanation tells users that clearing the filter restores their layout. Previously matching guests/hosts could remain hidden behind collapsed ancestors.
- Browser verification of collapse → filter → clear remains open. Full review remains open.


### Browser-check search expansion and restore tree layout

- F19: Closed a platform in actual InfrastructureTree, searched for a guest and confirmed its platform/node expanded with the matching guest visible. Clearing search restored the closed platform. A no-match query correctly showed the dedicated empty-filter message.
- Browser inspection exposed the stale-data link inside the uppercase heading flex row; moved it below the heading and visually verified readable wrapping. Evidence: existing tree-filters-fixture.html and tree-no-matches.png. Changed-file ESLint passed. Full review remains open.


### Make sidebar resizing keyboard accessible and cancel-safe

- F19: Existing sidebar resize handle now exposes separator orientation/current/min/max width, supports ArrowLeft/ArrowRight in 16px steps and Home/End bounds, and shows keyboard focus. Pointer-cancel and component-unmount remove drag listeners. Missing stored width now uses the intended 272px default instead of converting null to zero and clamping to 224px.
- Browser keyboard/drag cancellation acceptance remains open. Full review remains open.


### Normalize persisted and requested sidebar widths consistently

- F19: Sidebar width loading and updates now share validation: missing/blank/non-numeric/nonfinite values use 272px; valid numbers round to pixels and clamp to 224–384px. Prevents NaN state from reaching layout or being persisted by the setter.
- Added preference regression coverage for malformed values, defaults, rounding and bounds. Browser resize acceptance remains open. Full review remains open.


### Connect favorite navigation to the mobile sidebar and explain empty host searches

- F19: InfrastructureFavorites accepts and invokes the tree navigation callback on resource links. Sidebar already supplies onMobileClose; favorite navigation now follows the same dismissal path as other tree links.
- Host filtering uses one shared predicate for row visibility and no-match detection. Existing standalone hosts excluded by search produce an explicit no-match status instead of a blank list.
- Changed-file ESLint and full frontend TypeScript check passed. Browser fixture with the actual InfrastructureTree and router confirmed favorite navigation from overview to platform invokes the callback; screenshot: verification/favorite-mobile-navigation.png; reproducible fixture: verification/favorite-mobile-review.html. Synthetic inventory and callback indicator verify propagation, not a live mobile-session acceptance. Fixture favorite removed afterward.
- Previous sidebar validation regression run also confirmed 6/6 store tests. Full review remains open.


### Reject inconsistent overlapping roots in application recovery packages

- F34: Application packages can contain the same physical files through nested roots (data/ssh) and configured aliases. Added shared-content comparison after capture and during authenticated archive verification, before restore preparation. Divergent content, links, member types or staging permissions reject the package even if every individual member has a valid checksum.
- Creation refuses publication if a file changes between separate root copies. Restore refuses divergent packages before creating the recovery destination. Original paths remain untouched. This strengthens snapshot consistency but does not replace stopping writers or provide activation/rollback.
- Existing application/file tests: 21 passed. Three new integration tests initially failed because the synthetic database lacked required schema tables; corrected fixture now passes all three: overlapping/aliased round trip, injected between-copy mutation with no published archive, and authenticated internally divergent package with no restore destination. Logs: /tmp/recovery-root-consistency.log and /tmp/recovery-root-consistency-focused.log. No live backup or restore performed.
- Updated docs/application-backup.md with overlap validation and its scope. Coordinated activation/rollback, current-backup binding to reset, and complete F34 acceptance remain open.


### Make database recovery instructions accessible from the backup form

- F34: Added expandable in-product guidance with exact database CLI verify/restore syntax, hidden passphrase entry, new-file destination requirements, separate preparation/activation steps, original-key and file dependencies, and reference to the full application-package procedure. No restore action is performed by the page.
- Passphrase byte length is now visible. Inputs above 1024 UTF-8 bytes show an associated invalid-field state and explicit error instead of only disabling export.
- Full frontend TypeScript and changed-component ESLint passed. Actual DatabaseBackupCard fixture verified 350 multibyte characters produce the 1050-byte error and disabled submit, and verified the expanded guide. Desktop and 390px iframe visual checks show wrapped prose and independently scrolling command blocks. Evidence: verification/backup-guide.png and backup-guide-narrow.png; source fixture backup-form-fixture.html, narrow wrapper backup-guide-narrow.html (serve source at /backup-guide-review.html). No live export or restore executed.
- Current-backup binding and coordinated activation/rollback remain open; this completes guidance/feedback changes only, not full F34 acceptance.


### Serialize Danger Zone actions and retain pending scope

- F34: DangerTab now shares a synchronous in-flight guard across its reset rows. During an outstanding request all other reset launch/submit controls are disabled; the guard also prevents same-tick repeated submissions. The request validates confirmation/password before acquiring it and releases it in finally.
- Replaced the pending ellipsis with the action name, captured target environment (or global scope), and a clear note that leaving the page does not cancel the operation.
- Full frontend TypeScript and changed-file ESLint passed. Actual DangerTab fixture with a deferred synthetic request confirmed all four neighboring actions disabled, captured environment displayed, and error completion restored controls while clearing credentials and requiring password re-entry. Evidence: verification/reset-pending-review.html and reset-pending.png. No real reset performed.
- This guard applies to one mounted settings page, not cross-tab/server concurrency. Current verified-backup binding and full F34 acceptance remain open.


### Report post-commit scheduler cleanup failures truthfully

- F34: Schedule and combined resets now attempt unregistering every deleted schedule, retain any failures as a warning, and return committed success rather than HTTP 500 after irreversible database changes. Combined reset preserves both file-staging and scheduler warnings when both occur. The existing UI displays warnings and avoids automatic setup navigation.
- Warning directs administrators to restart Shipyard to clear remaining registrations and not repeat the reset. Scheduler callbacks already re-read persisted schedules before starting; existing deletion/disabled callback regression remains passing. This does not stop already started runs or guarantee cleanup succeeds.
- All 14 targeted schedule/playbook/auth reset tests passed. New injected-failure tests cover continued job cleanup, persisted deletions/history removal, and combined simultaneous file/scheduler warnings. Synthetic temporary databases/files only; no live reset. Log: /tmp/reset-cleanup-outcomes.log.
- Server handlers perform their mutation stages synchronously after credential revalidation; no additional process-local concurrency lock added. Current-backup binding and full review acceptance remain open.


### Preserve and validate IPAM reservation drafts across pending and conflict states

- P1-04/F25: Address/range reservation controls and kind switching are disabled while saving; dialog closure is guarded during the request. Form submission also checks pending state and current validation rather than relying only on button disablement. Saving status identifies the prefix. Failed validation cannot reuse cached valid data.
- Create failures remain inline with the draft preserved, and trigger availability revalidation. New reservation entry points clear previous mutation errors. Removed unrelated fixed 10.20.10.* placeholders from reservation forms.
- Browser fixture with actual NetworkDetailPage confirmed Reserved default, next free 192.0.2.1 within 192.0.2.0/24, explicit Manual source, disabled pending controls, and retained draft after simulated concurrent reservation failure. Revalidation then displayed Already reserved and disabled resubmit. Evidence: verification/reservation-review.html, reservation-pending.png and reservation-conflict.png. Synthetic API only; real backend successful reservation acceptance remains open.
- Full frontend TypeScript and changed-file ESLint passed after the final revalidation change. Full F25/review completion remains open.


### Preserve partial IPAM bulk-release outcomes and target environment

- F25: Bulk release waits for all requests with allSettled, reports confirmed successes separately from failures, refreshes inventory even for partial success, and retains only failed targets for review/retry. Confirmation stays open with address/range-specific errors. The target list is captured on opening rather than recomputed from background-updated table rows.
- Browser inspection exposed active-environment labeling for a prefix belonging to another environment. Dialog now captures the prefix environment and the helper passes it explicitly in every DELETE request.
- Two regression tests passed for delayed success after early failure, encoded endpoints, explicit environment, range labels and unknown-error guidance. Changed-file ESLint passed. Actual NetworkDetailPage synthetic fixture confirmed two targets become one after partial success, inline failure identifies the remaining address, and target environment is Default despite another globally selected fixture environment. Evidence: verification/ipam-bulk-review.html and ipam-bulk-partial.png. No live allocation released.
- Full review remains open; helper tests and fixture do not prove remote transactional batch behavior (requests remain individual operations).


### Bind individual IPAM mutations and choice lists to the prefix environment

- F25: Reservation validation/create, range create, address/range deletion, address/device-name/prefix updates, prefix deletion and Proxmox sync explicitly use the loaded prefix environment. Host/connection choice query keys, URL parameters and headers now use that environment too; validation cache keys include it.
- Individual release and prefix-delete confirmation dialogs show the target environment, remain open on failure, and expose mutation errors inline. Successful address/range deletion closes the dialog; opening a new target clears prior errors.
- Actual NetworkDetailPage fixture verifies a DELETE header matches the Default prefix environment despite a different global fixture environment. Failed release retained its target/error; opening another target cleared the old error; successful release closed the dialog and refreshed the list to one remaining address. Evidence: verification/ipam-single-review.html and ipam-single-error.png. Synthetic transport only; no live mutation.
- Full review remains open; navigation across prefixes while edit dialogs are open and wider environment-switch acceptance still require verification.


### Isolate network detail state by prefix ID

- F25: NetworkDetailPage now mounts its stateful content with the route prefix ID as key. Switching prefix resets dialogs, drafts, selections and local mutation state instead of carrying an old reservation/edit target into another network. Existing requests are not cancelled by remounting.
- Full frontend TypeScript and changed-file ESLint passed. Actual page/router fixture opened a reservation in 192.0.2.0/24, entered a distinct hostname, navigated to 198.51.100.0/24, and confirmed the dialog closed. Opening a new reservation showed 198.51.100.1, Reserved, and an empty hostname.
- Evidence: verification/ipam-prefix-switch.html and ipam-prefix-switch.png. The screenshot's validation sentence came from an initially fixed synthetic API message; the fixture was corrected afterward to return the current prefix in that sentence. The test establishes local draft isolation, not live allocation validation or pending-operation cancellation. Full review remains open.


### Full regression checkpoint after recovery, reset and IPAM improvements

- Initial frontend suite identified a missing IPAM translation and a stale tree contract expecting collapsed search matches. Routed reservation-progress and bulk-release feedback through the translation catalog, including the unknown-failure helper. Updated the existing tree contract to require temporary search expansion while retaining saved collapse-state logic.
- Final full frontend suite: 246/246 tests across 51 files passed (/tmp/review-current-frontend-final.log). Full backend suite: 807/807 tests across 18 suites passed (/tmp/review-current-backend.log). Final frontend TypeScript, changed-file ESLint and whitespace checks passed.
- Final Vite build succeeded in /tmp/shipyard-review-current-build (/tmp/review-current-build-final.log). No production dist replacement or deployment. These regressions verify covered behavior; they do not close outstanding review acceptance, backup/reset binding or coordinated recovery activation. Goal remains active.


### Preserve prefix editor drafts when query data refreshes

- F25: Prefix editor mounts only when opened and initializes normalized editable values once. Background changes to counts/observations do not reset the draft. Changes to editable fields are detected against the opening baseline, retain the draft, show guidance and disable saving until the editor is reopened. This is a client-observed conflict guard, not server-side compare-and-swap.
- Pending save disables fields and dismissal; submission handler guards pending/conflicting state. Save failures appear inline and opening a new editor clears prior errors.
- Full TypeScript and changed-file ESLint passed. Actual NetworkDetailPage fixture injected a query-cache update while an edited name was present: the unsaved name remained, conflict guidance appeared, and Save prefix became disabled. Evidence: verification/ipam-edit-refresh.html and ipam-prefix-draft-retained.png. Synthetic cache refresh only, no live prefix changes. Full review remains open.


### Validate VLAN before numeric conversion and require paired DHCP endpoints

- F25: Shared prefix input validation now guards both create and edit submissions and their buttons. Non-numeric VLAN input can no longer become NaN and serialize as null, unintentionally clearing a VLAN. Valid VLANs are decimal integers 1–4094 or empty; surrounding whitespace is trimmed consistently.
- DHCP start/end must both be populated or both empty. Inline translated messages explain correction. Usable-address, ordering, gateway and child-prefix conflicts remain authoritative server validations; this helper does not claim to cover them.
- Five targeted form/language tests passed, including malformed VLANs, exponent/hex/fraction/range rejection, empty/trimmed valid inputs and paired DHCP endpoints. No live prefix changed. Full review remains open.


### Verify reservation defaults against the real API and make creation atomic

- P1-04/F25: Added a real Express/auth/environment-middleware flow using an isolated SQLite database: prefix detail supplies next free address after its gateway, validation accepts it, Reserved/manual persists and appears in allocations, and next free advances. Duplicate, out-of-prefix, network and broadcast writes are rejected without adding records.
- Inspection found reservation insert and audit were separate writes. Wrapped them in one SQLite transaction. Injected audit failure now returns failure with no reservation retained; retry succeeds. This covers single-address creation, not every IPAM mutation.
- All 20 IPAM route tests passed (/tmp/ipam-reservation-acceptance.log). Tests use temporary databases and synthetic addresses; no live reservation created. Combined with earlier actual-component browser evidence this strengthens the original reservation-default acceptance; full review remains open.


### Make core IPAM changes and their audit records atomic

- F25: Added transactions around prefix create/update/status, reservation update, device-name set/remove and range creation. Moved prefix deletion audit into its existing multi-table transaction. Individual address/range release now includes audit in the deletion transaction while preserving not-found behavior.
- Added nine real API failure/retry subtests under the production auth/environment middleware order. An injected action-specific audit failure leaves complete snapshots of prefixes, reservations, ranges, device names and audit log unchanged; retry succeeds with one new matching audit entry. Prefix-deletion coverage includes remaining range data.
- All 30 IPAM tests passed (/tmp/ipam-core-atomicity.log), as did JavaScript syntax and diff whitespace checks. Temporary database and synthetic resources only; no live mutation. Source configuration/synchronization atomicity is separate and remains to be reviewed. Full review goal remains open.


### Make IPAM source configuration and deletion audit atomic

- F26: Source create/update transactions now include their audit records and return the saved summary only after commit. Source deletion includes audit within the existing observation removal/reservation reconciliation transaction.
- Added production-order API failure/retry tests for create, token/name update and deletion with a real synthetic source observation/imported reservation. Audit failure preserves complete source, observation, reservation, conflict and audit snapshots. Retry succeeds with exactly one audit entry; responses continue excluding tokens.
- All 34 IPAM tests passed (/tmp/ipam-source-atomicity.log). Syntax and whitespace checks passed. No external controller contacted and no live source changed. Async test/sync workflows remain separate review work; full goal remains open.


### Make IPAM source sync outcomes atomic with inventory changes

- F26: Success audit now commits inside the import/reconciliation/source-status transaction. If it fails, imported changes and success timestamps roll back. Failure status and failure audit now share their own transaction, avoiding unaudited status changes when both logging paths fail.
- Added a real HTTP test-controller flow: initial lease sync, changed source payload, success-audit failure retaining prior reservation/observation/conflict snapshots, complete audit failure preserving source status, and successful retry creating the replacement/removing the old lease.
- All 35 IPAM tests passed (/tmp/ipam-sync-atomicity.log); whitespace checks passed. Only loopback test-controller requests and temporary database writes occurred. Concurrent source edits/deletion during external fetch and connection-test outcome handling remain separate review work. Full review remains open.


### Discard IPAM sync responses for changed source configurations

- F26: After external fetch and before error-status persistence, source configuration is reloaded and compared across environment, type, name, endpoint, token, site/path, TLS mode, enabled and sync policy fields. Missing or changed sources reject with a typed conflict, without importing old observations or overwriting current status. Mutable observation timestamps are intentionally excluded.
- Four deferred loopback-controller tests cover changed credentials/name, disable, delete and failing controller response after configuration change. Each verifies HTTP 409, unchanged post-edit source state and no imported reservation/observation. Existing scheduler selects complete source records and uses the same guard.
- All 40 IPAM tests passed (/tmp/ipam-source-race.log); whitespace check passed. No live controller/source used. This compares current values, not an immutable historical revision; authorization changes during fetch and source-test outcomes remain separate review work. Full review remains open.


### Guard IPAM connection-test results against stale configuration and audit failure

- F26: Connection tests recheck source configuration after the external response and before recording failures. Changed/deleted sources return a 409 conflict without overwriting current state. Shared guidance identifies connection test versus synchronization.
- Success status/audit and failure status/audit each commit atomically. If recording the failure itself fails, the endpoint explicitly returns 500 with retry guidance instead of leaving an unhandled asynchronous error.
- Added loopback-controller regression for success-audit failure, total audit failure, successful retry, and deactivation during a held response. All 41 IPAM tests passed (/tmp/ipam-connection-outcomes.log); whitespace check passed. No live controller or configuration changes. Full review remains open.


## Reset backup content verification — 2026-09-11

Added `server/services/reset-backup-proof.js` as the backend archive comparison primitive for F34. It authenticates and integrity-checks the supplied database/application archive, then compares the current data removed by the selected reset with the archived data. Host and schedule comparisons use the selected environment; account resets include users/settings, and combined resets also include operation acknowledgements. Playbook and combined resets require an application archive containing the playbooks root and compare the exact top-level YAML files removed by the existing reset implementation. Audit activity and unrelated environments do not invalidate scoped comparisons. A returned fingerprint must be rechecked immediately before mutation.

This is not yet wired into HTTP reset authorization or the UI. It does not issue a user-bound, expiring, single-use authorization receipt. Those integrations, upload limits and temporary-file cleanup, post-authentication freshness checks, and the final transactional reset guard remain required. No existing reset behavior has been advertised as protected by this primitive. Recovery activation/rollback remains open.


## Reset backup upload API — 2026-09-11

The reset router now exposes a two-step archive verification API. `POST /api/reset/:action/backup` requires current administrator password/MFA, archive passphrase, format and explicit reset scope. It returns an opaque five-minute upload ID. `PUT /api/reset/:action/backup/:id` streams the encrypted archive into a private temporary file (1 GiB maximum, two-minute upload timeout), verifies its contents against reset data, and rechecks administrator identity/session after the asynchronous work. Only one verification runs at a time. Temporary files are removed afterward, and expired in-memory entries are removed by unreferenced timers.

Successful verification returns a five-minute, single-use approval bound to the current authorization header/account, action and scope. Password hash, token version and MFA-enabled state are checked again when consuming the approval. Neither the archive passphrase nor the internal data fingerprint is returned. The API is implemented in `server/routes/reset-backup.js`; ticket expiration and ownership logic are in `server/services/reset-backup-tickets.js`.

Still required: the DELETE handlers must consume this approval and compare its fingerprint inside the final reset transaction; playbook staging needs the corresponding guard before moving files. The danger UI still needs file selection/upload, verification feedback and approval submission. Therefore current resets are not yet gated by these new approvals. Full recovery activation and rollback remain open.


## Mandatory reset backup approval and form integration — 2026-09-11

Every supported DELETE reset now requires the single-use backup approval after phrase/scope and fresh password/MFA verification. The approval fingerprint is compared again inside an immediate SQLite transaction before database deletion. Playbook resets check current files before staging and recheck the staged YAML contents plus database data inside the commit transaction. Missing/expired/used approvals and changed data return an actionable backup error. Existing interrupted-reset recovery handling and rollback remain in place. Internal reset journal identity/commit bookkeeping is excluded from the backup comparison because creating that journal must not invalidate the approved payload.

The host fingerprint now also covers cascading agent configuration/metrics, alert settings/alerts, note revisions and IPAM reservations whose host link is cleared. The danger form includes archive selection, archive type/passphrase, upload verification, expiration feedback and approval submission; password/MFA/passphrase are cleared after verification and approvals after reset attempts. Binary API uploads now preserve Blob bytes rather than JSON-serializing them. Original application keys and off-server archives remain separate recovery requirements.

Verification: the reset regression suite exercises actual encrypted archive creation/upload before successful resets; new tests reject absent approvals across all actions and reject/reject replay after a new host is added following verification. Frontend typecheck and changed-file lint passed. A browser walkthrough of the new complete UI and full recovery activation/rollback are still pending; this does not close F34.


## Reset form browser walkthrough — 2026-09-11

Actual DangerTab rendered in localhost fixture `artifacts/ui-review-2026-09-09/verification/reset-backup-review.html`; fetch responses are synthetic. Exercised archive selection, binary upload, approval feedback, cleared credentials, stale-data rejection, reselect/reverify and successful retry. Found and fixed stale React File state after the busy phase unmounted the file input: reset completion now clears the file, and opening a new confirmation clears previous file/passphrase state. Verified that re-entering credentials alone keeps Verify disabled until a new file is selected. Evidence: `reset-backup-reselect-required.png` and `reset-backup-success.png`. No production endpoint or data was changed. Recovery activation/rollback is the next outstanding F34 implementation block.


## Recovery activation destination planning — 2026-09-11

Added `server/services/recovery-activation-plan.js` and the read-only `server/cli/recovery-activation.js plan` command. Planning authenticates prepared recovery contents again, requires all included roots to be explicitly mapped, preserves nesting/alias relationships, collapses redundant root operations and places the recovered database as an explicit overlay when its target lies within a recovered root. It rejects source archive/prepared-directory replacement, archived-file collisions, filesystem-root targets and target symlinks. This accounts for the real deployment's separate Docker data/workspace volumes, playbook/plugin mounts and configurable paths; it does not automatically map container paths onto the host.

The implementation remains `planned-not-activated`: durable staging, activation/rollback journal, restart/failure recovery and runtime acceptance are still outstanding. No production target has been changed. Integration tests use actual encrypted archive creation and prepared restore, including CLI execution, rather than hand-edited recovery metadata.


## Recovery sibling staging and durable progress journal — 2026-09-11

`server/services/recovery-activation-stage.js` and `recovery-activation.js stage` now stage verified root/database payloads beside each target, keeping existing data untouched. Exclusive private directories, source-copy comparisons, database overlays, fsync of payloads/directories and atomic journal replacement establish a staged-not-activated result. Ordinary failure cleans only directories exclusively created by the current call; incomplete cleanup preserves the progress journal. Tests cover a real encrypted archive/restore, both file and directory targets, restored session version increment, original target preservation, existing-journal refusal and failure on a later copy. Nine combined planner/staging tests passed.

Still required for F34: interrupted-process journal validation/recovery, actual target switching, retained old targets and durable rollback, encryption-key/runtime acceptance. No live activation or filesystem reconfiguration was performed. This staging primitive does not claim completed recovery.


## Recovery switch and rollback backend — 2026-09-11

Added `server/services/recovery-activation-switch.js`. Activation rederives the target plan from the verified prepared archive, validates journal paths, compares staged payloads including the database overlay, and records payload identities before starting. Each original is renamed to the private staging area's `previous` path before its recovered payload is installed. Intent is durably journaled before each rename; both containing directories are synchronized afterward. Ordinary switch failure attempts rollback. Rollback checks all current/original identities before starting and preserves withdrawn recovered payloads, including subsequent data, under `withdrawn`; original files/directories are restored. A completed rollback is repeatable.

Tests exercise real archive/restore/staging, successful multi-target switching, post-activation file preservation on rollback, failure thrown after an actual payload rename, and a child process exiting immediately after a payload rename followed by rollback in the parent process. Modified payloads are rejected before moving original targets. Journals now use unique atomic-write temporary filenames so an interrupted old temporary write does not prevent a later journal write.

These backend functions are not yet exposed as activation/rollback CLI commands. Cross-process exclusion and stale-lock handling, original encryption-key checks, mounted-target handling and isolated application runtime acceptance remain required before F34 can be closed. Only temporary test directories were switched.


## Activation application-key gate — 2026-09-11

Activation now calls the existing authenticated application-archive key verifier before comparing/moving staged targets. Callers must supply `applicationKey`; absent or incorrect keys fail before target mutation. Verification covers supported encrypted core database values and managed SSH `.enc` files included in the archive. The result and journal retain only counts/scope/verification status, never the key or plaintext. An archive with no ciphertext cannot positively establish key identity and continues to report `keyVerified:false`; this is not represented as proof of decryption capability. Rollback does not require the new deployment's application key to restore the preserved original files.

Eight staging/switch integration tests passed, now with an encrypted synthetic credential in the archived database. Tests assert a matching key succeeds without exposing it and missing/wrong keys leave targets and the staged journal unchanged. CLI activation/rollback exposure, cross-process exclusion, mounted-target checks and runtime acceptance remain outstanding. Host `flock` availability and usage were inspected as a candidate for process exclusion; no lock implementation or deployment dependency change was made in this step.


## Locked operator activation/rollback CLI — 2026-09-11

The public `recovery-activation.js` now runs its internal worker under util-linux flock, serializing plan/stage/activate/rollback within one host filesystem namespace. The stable root directory inode is the advisory lock object; no PID-file cleanup is needed. Conflicts exit 75 and signals are forwarded to the worker. The worker adds activate/rollback dispatch and receives archive/application secrets through environment variables, not command arguments. Docker's runtime dependency list explicitly includes util-linux; no image was built or deployed in this step.

Sixteen planner/staging/switch/CLI/lock tests passed. The lock test holds an isolated directory inode in a separate process, verifies exclusion, kills the holder and verifies immediate reuse without stale files. The command-flow integration exercises stage, activate and rollback through the same flock launcher/internal CLI with an isolated lock inode to avoid interfering with other test commands. Public plan CLI behavior is independently covered using the standard host lock. Root-directory locking is deliberately host/namespace-local and is not claimed as distributed protection across containers/hosts or a lock against application writers.

Remaining F34 work: mounted-target preflight, isolated application runtime recovery acceptance, interrupted-staging cleanup workflow and final operator-flow review. Production files and service configuration remain unchanged.


## Mount preflight and isolated recovered application probe — 2026-09-11

`server/services/recovery-mounts.js` reads Linux mountinfo, decodes escaped paths, and rejects a target that is itself mounted or contains nested mounts. Staging checks targets before allocation; switching checks both target/staging paths and rechecks each source/destination before rename. Cleanup also refuses mounted staging material. Missing/malformed inventory fails closed. Twelve mount/staging/switch tests passed, including read-only inspection of the real /proc mount.

`application-recovery-runtime.test.js` creates an actual full-schema encrypted application archive, restores and activates database plus playbooks, then starts a fresh process using `createApp` and all normal routing/middleware. It checks health, rejection of the old session, fresh login, scoped restored host inventory, recovered playbook content and decryption of a stored SMTP credential. After that process exits, rollback restores the original target data/playbook files. Workers, SSH, external controllers and scheduled execution are intentionally not started; this is a local recovered-route runtime test, not live infrastructure acceptance. Interrupted-staging cleanup and final F34 operator-flow review remain open.


## F34 local acceptance and broad regression checkpoint — 2026-09-11

Interrupted staging cleanup is implemented through the locked `cleanup-staging` CLI action. Exclusive staging directories receive ownership markers before copying. Cleanup validates archive-derived mappings, original target identities, state and recognized entries; it refuses activation/rollback history. Payload deletion precedes marker removal so cleanup can resume after a process exit. Tests kill separate processes during preparation and cleanup, then confirm repeated cleanup and original preservation.

F34's explicit review requirement is locally accepted: prioritized backup/recovery path, explicit affected data/environment, matching current backup and protected confirmation. CLI recovery and the actual application route stack have been exercised in isolated test directories/processes; no production activity is inferred from these tests. Full regression checkpoint: 864/864 backend tests (18 suites), 249/249 frontend tests (52 files), frontend TypeScript and temporary production build passed. Logs: `/tmp/review-recovery-backend-full.log`, `/tmp/review-recovery-frontend-full.log`, `/tmp/review-recovery-typecheck.log`, `/tmp/review-recovery-build.log`; build output `/tmp/shipyard-review-recovery-build`. The remaining 34 feature areas and prioritized findings still require their own closure evidence; the overall goal is not complete.


## F13 VM assistant audit: environment binding — 2026-09-11

The current VmFormDialog has five steps, a final review and per-step validation, but its static-address step has no IPAM selection. This remains a concrete F13 gap. Catalog/template/playbook requests and VM/template writes previously relied on the global environment header even though the dialog receives an environmentId. These requests now pass the dialog environment explicitly; catalog/playbook caches are separated by environment. This addresses request targeting, not the separate unresolved lifetime of drafts when dialog props/background VM data change.

Remaining F13 acceptance: IPAM selection, template dependencies/defaults under current catalog, draft/context lifetime, end-to-end plan/apply/drift/recovery evidence. Existing run-security tests prove saved-plan binding and per-VM resource targeting, not a complete real VM lifecycle. No controller calls, VM creation or infrastructure changes performed in this audit.


## F13 IPAM selection in VM network step — 2026-09-11

Added VmIpamSelection to the network step, keyed by the dialog environment. It lists current prefixes from that explicit environment and fetches the selected prefix again when the user chooses its next available address. Address, prefix length and gateway populate static VM fields; bridge/VLAN are displayed for review rather than silently overriding Proxmox/SDN selections. Errors and empty prefixes leave manual entry available. Selection does not claim to reserve an address or apply the VM. Late results after unmount are ignored.

Actual component browser fixture `verification/vm-ipam-review.html` returns a stale list suggestion .2, then a fresh detail .3, then no free address. Verified .3 is copied with /24 and gateway, while the exhausted-prefix retry shows an error and preserves existing values. Screenshot: `verification/vm-ipam-selected.png`. Responses are synthetic and no real IPAM/VM writes occurred. Full wizard flow, draft lifecycle and actual VM lifecycle acceptance remain open.


## F13 VM draft lifetime and observed configuration conflicts — 2026-09-11

VmFormDialog now mounts a fresh content instance per open/environment/connection/workspace/VM identity. Initial form/workflow state is captured once, removing the effect that reset all edits whenever a refreshed initialVm object arrived. Normalized editable VM fields/workflows are compared with the opening baseline; an observed remote configuration change preserves the draft and disables saving with an inline explanation. Metadata outside the editable baseline does not trigger this guard. Old mutation callbacks cannot close a newly opened dialog; query invalidation still runs. Duplicate submit while a save is pending is blocked.

Actual VmFormDialog fixture `verification/vm-draft-review.html` changes the backing VM name after user input. Browser evidence `verification/vm-draft-conflict.png` shows Review retaining `retained-user-draft`, the conflict explanation and disabled Update VM definition. TypeScript and component lint passed. This is client-observed conflict detection, not a backend revision/CAS guarantee against changes that have not reached the browser. No VM changes were sent to a live controller.


## F13 evidence boundary and F31 inventory error state — 2026-09-11

Inspected OpenTofu run-security tests: the executable is a generated shell fixture, so their plan/apply/state assertions cannot close real VM lifecycle acceptance. Retained F13 as open and moved to independently actionable F31 work. Plugin inventory rendering now requires !isError as well as loaded data; failed refetches no longer present cached plugin action rows alongside the error. Full plugin package/update/rollback and active-page acceptance remains open.


## F31 installed versus registered package version — 2026-09-11

Plugin inventory now reads the current on-disk manifest separately from the registered runtime manifest. It returns installed/registered versions, observation time and explicit same-version/reload-required/unreadable/version-unavailable states. The UI distinguishes matching labels from verified package integrity and identifies a changed package before reload. This is manifest-version comparison, not continuous full-content hashing or update availability from a package registry.

Settings documents the existing manual package update/rollback procedure: retain reviewed previous package and data backup, stop the server when restoring a previous package, then restart and verify workflows. It explicitly says that no automatic rollback copy is retained and code rollback does not undo data migrations. No automatic updater or rollback engine has been added or implied.

Six plugin-admin tests passed. Extended the real loader test to replace its installed manifest without reload and assert the registered version stays unchanged while inventory reports the new installed version, then unreadable JSON, then matching labels after restoration. Complete F31 browser/active-plugin acceptance remains open.

### 2026-09-11 – Plugin-Inventar und Freigabefehler (F31, Teilabnahme)

- Installierte und zuletzt registrierte Paketversion werden getrennt angezeigt; Abweichungen fordern zur Paketprüfung vor Reload auf. Manuelles Rollback und die separate Datenwiederherstellung sind erklärt.
- Fehlgeschlagene Inventarabfragen blenden zwischengespeicherte Plugin-Aktionen aus und bieten Wiederholen an.
- Freigabedialog bleibt bis zum erfolgreichen Enable geöffnet, sperrt Bestätigung/Abbruch während der Anfrage und zeigt Fehler im Dialog; erneutes Öffnen entfernt alte Aktionsfehler.
- Browsernachweis mit tatsächlichem PluginsTab und synthetischen Antworten: Versionsabweichung 2.0.0/1.0.0; fehlende Review-Metadaten lassen Dialog mit Fehler und erneut bedienbarer Bestätigung offen; Inventar-503 entfernt beide Plugin-Schalter. Screenshots: `verification/plugin-package-status.png`, `verification/plugin-enable-error.png`, `verification/plugin-inventory-error.png`; reproduzierbare Fixture `verification/plugin-package-review.html` unter artifacts/ui-review-2026-09-09. Keine Live-Pluginänderung.
- F31 bleibt bis zur vollständigen Abnahme einschließlich aktiver Pluginseite offen.

### 2026-09-11 – F31 lokale Abnahme abgeschlossen

Freigabe im tatsächlichen PluginsTab mit synthetischer API im Browser geprüft: verzögerte Antwort sperrt Bestätigung/Abbruch, HTTP 409 hält den Dialog mit verständlichem Fehler offen, erneuter erfolgreicher Versuch schließt ihn und aktualisiert den Enabled-Status. Screenshots und Fixture in der Abschlussmatrix unter F31. Aktive Plugin-Hostseite separat mit lokalem dynamischem Modul geprüft: Umgebungsbindung, veraltete Anfragen, Cleanup und Retry. 24 Backendtests und 5 Frontendtests bestanden. Der Abnahmestatus umfasst Shipyards Verwaltung und Host-Schnittstelle; keine produktiven Drittanbieter-Workflows und kein automatischer Paketrollback.

### 2026-09-11 – P1-04 Reservierungsstandard lokal abgenommen

Aktueller Browser bestätigt Reserved, nächste freie IP, sichtbares Präfix/Quelle und Active-Erklärung. Verzögerte synthetische Reservierung sperrt Eingaben; HTTP 409 erhält den Entwurf und zeigt nach erneuter Validierung die bereits reservierte Adresse mit gesperrtem Speichern. Screenshots `verification/reservation-default-current.png` und `reservation-conflict-current.png`. 41 aktuelle IPAM-Routentests bestanden, darunter tatsächliche Speicherung und Allokationsabfrage im Zielpräfix, nächste freie Adresse sowie Konflikt-/Präfixgrenzen. Abschlussmatrix enthält die konkreten Nachweise; keine produktive Datenänderung.

### 2026-09-11 – P1-05 Benutzerstandard lokal abgenommen

Explizite Rollenauswahl ohne vorausgewählte Betriebsrechte im aktuellen Dialog bestätigt. Preset-Empfehlungen berücksichtigen tatsächliche Fähigkeiten statt Rollennamen; Ressourcen und Terminalrecht sind vor dem Speichern sichtbar. Aktuelle isolierte Backendtests für direkte Rollenzuweisung und Einladungen: 10 bestanden. Nachweise, Screenshot und aktualisierte dialogbezogene Fixture in der Abschlussmatrix. Keine produktiven Konten angelegt.

### 2026-09-11 – P1-01 Zeitangaben, weitere Abweichungen behoben

Backup-Freigabeablauf in DangerTab verwendet jetzt formatDateTime mit Datum und expliziter gemeinsamer Zeitzone statt browserlokalem toLocaleTimeString. Historyfilter verwendet die zentrale DISPLAY_TIME_ZONE-Konstante. ActivityCenter kennzeichnet relative Zeiten als Started/Finished und bietet im Tooltip den absoluten Start sowie gegebenenfalls das Ende einschließlich Zeitzone an. Zuvor stand nur eine unbeschriftete relative Zeit. 14 Datums-/Historyfiltertests bestanden; TypeScript und ESLint geprüft. P1-01 bleibt offen: aktuelle Browserprüfung dieser Änderungen und Vergleich identischer Ereignisse in allen betroffenen Ansichten folgen.

### 2026-09-11 – P1-01 Empfangszeit korrekt benannt

Quellenvergleich zeigt: ActivityCenter setzt startedAt/completedAt bei WebSocket-Empfang mittels Date.now(); dies sind keine vom Server gemeldeten Ausführungszeiten. Die im vorigen Schritt ergänzten Start/Ende-Beschriftungen wurden daher korrigiert: Observed/Completion received, Tooltip First observed in this browser/Completion received mit gemeinsamer absoluter Zeit. Laufhistorie verwendet dagegen den gespeicherten started_at über den gemeinsamen Formatter. P1-01 bleibt offen: Ereigniszeiten dürfen beim ansichtsübergreifenden Vergleich nicht mit Empfangszeiten gleichgesetzt werden.

### 2026-09-11 – P1-01 Endzeit in Laufhistorie

PlaybookHistory zeigt die vorhandene completed_at zusätzlich zum Start als ausdrücklich beschriftete Endzeit. HistoryEntry-Typ ergänzt; beide Zeitpunkte verwenden denselben zentralen Formatter wie die Ausführungsdetails. Fehlende Endzeiten werden nicht erfunden. TypeScript und ESLint bestanden. Browservergleich bleibt Teil der offenen P1-01-Abnahme.

### 2026-09-11 – P1-01 Browservergleich Laufhistorie/Ausführungsdetails

Tatsächliche HistoryTab und OperationExecutionPage über den Ausführungslink geprüft. Derselbe Testlauf 42 erhält in der Liste SQLite-Zeiten ohne Zone (2026-09-09 18:00:00 / 18:01:30), in Details äquivalente ISO-UTC-Werte. Beide zeigen Start 9 Sept 2026, 20:00 und Ende 20:01 (Europe/Zurich), Details zusätzlich Dauer 90s. Screenshots `verification/history-time-list.png` und `history-time-detail.png`; reproduzierbare Fixture `history-time-review.html`. API-Antworten synthetisch, keine Ausführung gestartet. Diese zwei Ansichten sind verglichen; P1-01 bleibt für die übrigen ursprünglichen Ansichten offen.

### 2026-09-11 – P1-01 Proxmox-Sync und Hostdauer UTC-normalisiert

Proxmox-Übersicht lastSyncLabel wandelte SQLite-Zeiten vor formatDateTime mit new Date in Browser-Ortszeit um. Jetzt parseApiDate mit UTC-Normalisierung und explizitem Last synchronized. Hosthistorie berechnet Dauer ebenfalls mit parseApiDate, damit gemischte SQLite-/ISO-Werte oder ein DST-Übergang nicht ortszeitabhängig werden. TypeScript/ESLint bestanden; 12 zentrale Datumstests auch unter TZ=America/Los_Angeles bestanden. Aktuelle Browserabnahme der Proxmox-Syncanzeige bleibt offen.

### 2026-09-11 – P1-01 Proxmox-Sync Browsernachweis

Tatsächliche ProxmoxConnectionsCard zeigt für zwei äquivalente Zeitwerte (SQLite 2026-09-09 18:00:00 und ISO 2026-09-09T18:00:00Z) identisch Last synchronized: 9 Sept 2026, 20:00 (Europe/Zurich). Screenshot verification/sync-time-current.png und Fixture sync-time-review.html. Kein Sync ausgelöst; lokale Testdaten. Abschlussmatrix benennt verbleibende Originalansichten ausdrücklich.

### 2026-09-11 – P1-01 Operations-Listenzeit eindeutig

Operations-Backend bildet time aus completed_at oder started_at. Desktoptabelle und mobile Liste zeigten diesen wechselnden Zeitpunkt zuvor ohne Unterscheidung. Beide kennzeichnen nun Completed bzw. Started, konsistent mit dem Detailpanel. Quellenprüfung weiterer Originalansichten: GuestTaskHistory unterscheidet Requested/Last checked mit formatDateTime, Benutzerliste Last login mit gemeinsamem Formatter, Snapshotzeiten verwenden Sekunden→Millisekunden und gemeinsamen Formatter. Diese Quellenprüfung ersetzt keine vollständige Browserabnahme. TypeScript/ESLint geprüft.

### 2026-09-11 – P1-01 Infrastruktur-Taskzeit Browsernachweis

Tatsächliche GuestTaskHistory mit festgelegten Testdaten geprüft: Requested 9 Sept 2026, 20:00 und Last checked 20:01, beide Europe/Zurich. Anfrage als SQLite-UTC ohne Zone, Prüfung als ISO-UTC. Beschriftung behauptet keine Proxmox-Abschlusszeit. Screenshot verification/task-time-current.png und Fixture task-time-review.html. Kein Check-status-Aufruf oder Infrastrukturvorgang ausgelöst.

### 2026-09-11 – P1-01 Kontosicherheitszeiten Browsernachweis

Aktuelle UsersRolesTab mit gültiger MFA-Policy-Antwort geprüft. Last login (SQLite UTC ohne Zone) und MFA Checked (numerischer UTC-Zeitpunkt) zeigen beide 9 Sept 2026, 20:00 (Europe/Zurich); Bedeutung ist separat beschriftet. Screenshot verification/account-time-current.png, Fixture account-time-review.html. Ausschließlich synthetische Daten, keine Kontoaktion. Abschlussmatrix aktualisiert.

### 2026-09-11 – P1-01 Operations-Liste Browsernachweis

Aktuelle OperationsPage mit zwei synthetischen Vorgängen geprüft. Laufender ISO-UTC-Vorgang zeigt Started 9 Sept 2026, 20:00; abgeschlossener SQLite-UTC-Vorgang zeigt Completed 20:01, beide Europe/Zurich. Screenshot verification/operations-time-current.png und Fixture operations-time-review.html. Keine Operations-Aktion ausgeführt. Nebenbefund für spätere Prüfung: Konto ohne Wartungsansicht erhält im Kontextkasten dennoch No maintenance scheduled; fehlender Zugriff darf nicht als leere Planung dargestellt werden.

### 2026-09-11 – Fehlender Wartungszugriff nicht als leere Planung

OperationsContext erhält die tatsächliche canViewMaintenance-Berechtigung. Ohne Leserecht zeigt er Not available und erklärt die fehlende Einsicht; zuvor stand fälschlich None scheduled. Browser mit Rolle ohne Wartungsrecht bestätigt die korrigierte Anzeige, Operationsdaten bleiben sichtbar. Screenshot verification/maintenance-access-unavailable.png; reproduzierbar über operations-time-review.html. TypeScript/ESLint geprüft.

### 2026-09-11 – P1-01 Hosthistorie Browsernachweis

Tatsächliche ServerOperationsTabs mit synthetischem Controller: Start/Ende aus gemischten SQLite-/ISO-UTC-Werten zeigen 20:00/20:01 Europe/Zurich und 1m 30s Dauer. Screenshot host-time-current.png, Fixture host-time-review.html. Mobile Ansicht ergänzt fehlende Completed-Zeile und explizite Started-Beschriftung; schmale Browserprüfung noch offen. TypeScript bestanden.

### 2026-09-11 – Schmale Hostzeit-Abnahme

Aktuelle Hosthistorie bei 390px Inhaltsbreite im Browser geprüft und Screenshot visuell gelesen. Started/Completed, Europe/Zurich, Dauer 1m 30s und Open log bleiben vollständig sichtbar; Zeitzone bricht sauber um. Nachweise verification/host-time-narrow.png und host-time-narrow.html mit host-time-review.html. Keine Live-Datenänderung.

### 2026-09-11 – P1-01 Snapshot-Zeitvergleich

Tatsächliche ProxmoxVmDetailPage: Übersicht Last snapshot und Snapshots-Tab zeigen denselben Test-Snapshot mit 9 Sept 2026, 20:00 (Europe/Zurich), aus Epoch-Sekunden für 18:00Z. Screenshot verification/snapshot-time-current.png, Fixture snapshot-time-review.html. Kontext-API außerhalb dieser Prüfung liefert absichtlich Fehler; kein Restore, Snapshot- oder Controller-Schreibzugriff. Absolute Zeitvergleiche der Originalansichten dokumentiert; P1-01 bleibt für relative/absolute Kombination und 12h-Konsistenz offen.

### 2026-09-11 – P1-01 gemeinsame Uhrzeitpräferenz

formatDateTime berücksichtigt nun dieselbe gespeicherte timeFormat-Einstellung wie die Hostansichten. Zuvor konnte ein bestehendes 12h-Profil im Host 12-Stunden-Zeiten, in Operations jedoch 24-Stunden-Zeiten sehen. Gemeinsamer Standard bleibt 24h; explizite Formatteroptionen bleiben möglich. 14 Datumstests bestanden, einschließlich gespeicherter 12h-Präferenz, äquivalenter SQLite-/ISO-Zeiten, explizitem Override und gesperrtem LocalStorage. ESLint bestanden. Browservergleich der 12h-Präferenz sowie relative Zeitkombination bleiben offen.

### 2026-09-11 – 12h-Browservergleich und relative Zeitkomponente

HistoryTab und OperationExecutionPage mit gespeicherter 12h-Präferenz im Browser identisch: 08:00 pm/08:01 pm Europe/Zurich. Screenshot verification/history-clock-12h.png, Fixture history-clock-review.html. Vorige lokale Clock-Einstellung über Fixture-Button wiederhergestellt. Gemeinsame Timestamp-Komponente ergänzt absolute sichtbare Zeit um relatives Alter mit minütlicher Aktualisierung und semantischem time/dateTime. Zunächst in Laufhistorie und Ausführungsdetails integriert. Browserabnahme der relativen Darstellung und übrige Originalansichten bleiben offen.

### 2026-09-11 – Relative/absolute Zeit im Browser

HistoryTab und Ausführungsdetails zeigen im aktuellen Browser denselben absoluten Zeitpunkt mit Europe/Zurich und ergänzend 2 days ago. Screenshot verification/history-relative-current.png; bestehende history-time-review.html reproduziert beide Ansichten. Timestamp außerdem in Operations-Listen-/Detailzeit und GuestTaskHistory integriert; dortige erneute Layoutprüfung steht aus. P1-01 bleibt bis zur vollständigen Umsetzung/Abnahme offen.

### 2026-09-11 – Operations relative Zeit bei 390px korrigiert

Browserprüfung reproduzierte abgeschnittene Zeitangaben und verdrängten Hostnamen durch nebeneinander angeordnete, nicht schrumpfende Zeitzeile. Mobile Operations-Karten zeigen Ziel und Zeit jetzt untereinander mit Umbruch. Nach Korrektur visuell bei 390px bestätigt: Hostname, Started/Completed, exakte Zeit/Zeitzone und relatives Alter vollständig lesbar. Screenshot verification/operations-relative-narrow.png, Fixture operations-time-narrow.html mit operations-time-review.html. Reine Layoutkorrektur, keine Operations-Aktion ausgeführt.

### 2026-09-11 – Gemeinsame relative Zeit in Hosthistorie

Hosthistorie verwendet für Start/Abschluss nun Timestamp einschließlich relativer Angabe; explizite bestehende hour12-Präferenz bleibt erhalten. Vier Komponententests prüfen UTC-Normalisierung/Alter, Zukunftszeiten, fehlende Werte und 12h-Override. TypeScript bestanden. Die Tests prüfen die Darstellung, nicht den Browser-Timerlebenszyklus; aktualisierte schmale Hostansicht bleibt visuell abzunehmen.

### 2026-09-11 – Relative Zeiten Host/Tasks visuell abgenommen

Hosthistorie mit gemeinsamer Timestamp-Komponente bei 390px visuell geprüft: exakte Zeiten, Zeitzone, relatives Alter, Dauer und Logaktion passen vollständig. Screenshot verification/host-relative-narrow.png. GuestTaskHistory zeigt Requested und Last checked jeweils mit exakter Zeit plus relativem Alter; Screenshot verification/task-relative-current.png. Bestehende Fixtures host-time-narrow.html/host-time-review.html und task-time-review.html reproduzieren die aktuellen Komponenten. Keine API-Schreibaktion.

### 2026-09-11 – Relative Zeit für Sync, Snapshot und Login

Proxmox-Verbindungsübersicht, Snapshotliste/-übersicht und letzter Login in der Benutzerliste verwenden jetzt die gemeinsame Timestamp-Komponente. Exakte Zeit/Zeitzone bleiben sichtbar; relatives Alter ergänzt die Information. Snapshot-Epoch 0 wird dabei als gültiger Zeitpunkt behandelt statt als fehlender Wert. TypeScript und ESLint bestanden. Aktuelle Layoutabnahme dieser drei Ansichten steht noch aus.

### 2026-09-11 – P1-01 lokale Zeitabnahme abgeschlossen

Sync-, Snapshot- und Loginanzeige mit relativem Alter im aktuellen Browser geprüft und Screenshots visuell gelesen: vollständig lesbar. Abschlussmatrix enthält zusammengeführte Nachweise für ursprüngliche Ansichten, UTC-Normalisierung, Clock-Präferenz, klare Zeitbedeutungen sowie relative/absolute Kombination. P1-01 lokal abgenommen; übriger Review bleibt aktiv.

### 2026-09-11 – P1-02 Updatezahlen neben Warnungen erhalten

Host-Updatezusammenfassung kehrte bei Neustartbedarf oder fehlgeschlagenem Custom-Check vorzeitig zurück und verbarg vorhandene OS-/Image-/Custom-Zahlen. Jetzt bleiben bekannte Zahlen sichtbar, Warnungen folgen ergänzend; Warnstatus bleibt erhalten. Sieben fokussierte Summarytests bestanden, einschließlich gemischter Kataloge mit beiden Warnungen. Aktuelle Backend-/Browserabnahme des gesamten P1-02 weiterhin offen.

### 2026-09-11 – P1-02 Veralteten Katalog trotz Updatezahlen kennzeichnen

Ein vorhandener Updatezähler ließ die Zusammenfassung vor der stale-Prüfung zurückkehren. Der Veraltungshinweis ist jetzt Teil der ergänzenden Warnungen und bleibt neben bekannten Zahlen sowie Neustartbedarf sichtbar. Acht Summarytests bestanden, einschließlich stale + zwei OS-Updates + Reboot required. P1-02 bleibt für ansichtsübergreifende Zähl-/Quellen- und Browserabnahme offen.

### 2026-09-11 – P1-02 OS-Quellenabweichung sichtbar

Unterschiedliche OS-Katalog-/Inventarzähler wurden per Maximum zusammengefasst, ohne Abweichung zu erklären. Summary nennt nun beide Werte und Refresh-Hinweis zusätzlich zum konservativen Höchstwert. Neun Summarytests bestanden. Tatsächliche SummaryField-Komponente im Browser mit Images-only, abweichenden OS-Zahlen und gemischten veralteten Katalogen/Warnungen bei 342px Breite geprüft: alle Hinweise sichtbar, Warnfarbe statt Healthy. Screenshot verification/update-summary-current.png; Fixture update-summary-review.html. Vollständige Dashboard-/Host-Datenflussabnahme bleibt offen.

### 2026-09-11 – P1-02 Dashboard-/Inventar-Datenvertrag korrigiert

Neuer Vergleich im bestehenden inventory-route-Test reproduzierte fehlendes updates_checked_at im Dashboard. Dashboard liest jetzt denselben Cache samt Metadaten wie die Hostliste; unbekannter OS-Cache liefert null statt irreführender 0. Isolierte HTTP-/SQLite-Prüfung vergleicht OS-/Image-/Custom-Zähler, OS-/Image-Prüfzeiten und vollständigen Attention-Zustand zwischen Dashboard und Hostliste; Hostdetail-Attention ebenfalls identisch. Unbekannter Cache in beiden Ansichten null. Sechs Tests in server-inventory-state und dashboard-update-overview bestanden. Frontenddarstellung fehlender Dashboard-Katalogdaten noch prüfen.

### 2026-09-11 – P1-02 Unbekannte Dashboard-Kataloge anzeigen

Frontendtyp akzeptiert null für Updatezähler. Dashboard zählt Hosts mit fehlenden sichtbaren OS-/Image-Katalogdaten, zeigt einen expliziten Hinweis auf unvollständige Prüfungen und kennzeichnet den Gesamtwert als gemeldete Ergebnisse. HealthySummary erscheint nicht mehr, solange diese Daten fehlen. Berechtigungen werden berücksichtigt; nicht einsehbare Kataloge werden nicht als fehlende Prüfung gezählt. TypeScript/ESLint geprüft; Browserabnahme folgt.

### 2026-09-11 – P1-02 Unbekannter Dashboard-Katalog Browserabnahme

Tatsächliche DashboardPage mit online Host, null OS-/Image-Katalog und leerem Attention-Zustand: keine HealthySummary, stattdessen Incomplete checks für einen Host und ausdrücklich nur gemeldete Updatezahlen. Nach synthetischem Wechsel auf bekannte leere Kataloge erscheint HealthySummary. Screenshot verification/dashboard-unknown-current.png, Fixture dashboard-unknown-review.html. Keine Hostprüfung/SSH gestartet. Veraltungs- und Prüfzeitdarstellung im Dashboard bleibt separat zu prüfen.

### 2026-09-11 – P1-02 OS-Katalogalter zwischen Ansichten vereinheitlicht

Neue gemeinsame updateCatalogAge-Auswertung für Update-Metadatenroute, Hostinventar und Dashboard. Dashboard liefert updates_stale und unterdrückt HealthySummary auch bei veraltetem OS-Cache; Hinweis nennt fehlende oder veraltete Prüfungen. UTC-Normalisierung akzeptiert SQLite-Werte ohne Zone und explizite ISO-Offsets. Bestehende Routentests prüfen frischen/alten Cache, Dashboard-/Inventarvergleich und erzwungene Refresh-Ergebnisse; alle bestanden. Browserabnahme des veralteten Dashboard-Zustands bleibt offen.
