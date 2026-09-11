# Shipyard · Produkt- und UI-Review

9. September 2026

Shipyard hat einen sinnvollen Funktionskern für den Infrastruktur-Betrieb und bereits eine konsistente, professionelle Grundgestaltung. Der größte Reifegewinn liegt jetzt in verlässlichen Statusinformationen, einem verständlichen Ressourcenmodell und geführten Arbeitsabläufen. Mein Gesamteindruck: etwa 6,5 von 10 für Enterprise-Wirkung — ein leistungsfähiges Administratorenwerkzeug, dessen Produktführung noch nicht durchgängig auf dem Niveau einer ausgereiften Unternehmenskonsole liegt.

## Umfang und Grenzen

Live-Prüfung der angemeldeten Admin-Oberfläche unter https://shipyard/. Erfasst wurden erreichbare Seitentypen, Tabs, zentrale Formulare und globale Menüs. Host-, VM- und Präfixdetails wurden an repräsentativen vorhandenen Ressourcen geprüft; nicht jede einzelne Ressourceninstanz wurde identisch wiederholt. Desktop, vorhandenes Tokyo-Night-Theme; kein vollständiger Responsive- oder Accessibility-Test. Die Scores sind fachliche Einschätzungen, keine Messwerte oder Zertifizierung.

Keine Deployments, Updates, Neustarts, Löschungen, Konfigurationsänderungen oder Formularspeicherungen ausgeführt. Das SSH-Terminal wurde zum Prüfen der Oberfläche geöffnet und wieder geschlossen, ohne Befehle einzugeben. Login/Onboarding und der vollständige 2FA-Aktivierungsablauf wurden nicht durchlaufen. Agent ist deaktiviert, Plugins und verwaltete OpenTofu-VMs sind nicht vorhanden: deren aktive Detail- und Ausführungszustände sind daher nicht live bewertet. Aussagen zu fehlenden Funktionen bedeuten: in den geprüften Oberflächen nicht vorhanden oder nicht auffindbar. Backend-Validierung, tatsächliche Ausführung und Rechteisolierung waren nicht Gegenstand dieses UI-Reviews.

## Bewertungsmaßstab

1 = deutlich unzureichend, 2 = schwach, 3 = brauchbar mit Lücken, 4 = gut, 5 = sehr gut; null = nicht anwendbar / nicht ausreichend live prüfbar.

| Bereich | Nutzen | Infos | Eingaben | UI | Enterprise |

|---|---:|---:|---:|---:|---:|

| Dashboard | 5 | 3 | — | 4 | 3 |

| Operations / Activity | 5 | 3 | 4 | 3 | 3 |

| Wartungsplanung | 4 | 3 | 2 | 4 | 2 |

| Audit Log | 5 | 4 | 3 | 3 | 3 |

| Managed Hosts / Inventar | 5 | 3 | 4 | 4 | 3 |

| Host hinzufügen / Metadaten | 5 | 4 | 3 | 3 | 3 |

| Hostübersicht / System / Storage | 5 | 3 | — | 4 | 3 |

| Docker / Workloads | 5 | 3 | 2 | 3 | 3 |

| OS-Updates / Custom Update Tasks | 5 | 3 | 3 | 3 | 3 |

| Hostaktivität / Logs | 5 | 3 | 2 | 3 | 3 |

| Hostnotizen | 4 | 3 | 4 | 4 | 3 |

| Dateibrowser / SSH-Terminal | 5 | 4 | 4 | 4 | 3 |

| Managed VMs / Vorlagen / Erstellung | 5 | 3 | 3 | 3 | 3 |

| Playbook-Inventar / YAML-Editor | 5 | 4 | 4 | 4 | 3 |

| Playbook Runs / Zielauswahl | 5 | 4 | 3 | 3 | 3 |

| Variablen & Secrets | 5 | 4 | 4 | 4 | 3 |

| Schedules | 5 | 3 | 3 | 3 | 3 |

| Git Integration | 5 | 3 | 3 | 4 | 3 |

| Infrastrukturübersicht / Baum | 5 | 3 | 3 | 3 | 3 |

| Plattform- und Nodeinformationen | 5 | 4 | — | 4 | 3 |

| VM-/CT-Inventar und Adoption | 5 | 3 | 3 | 3 | 3 |

| Datastores | 4 | 3 | — | 4 | 3 |

| Proxmox-Updates | 5 | 3 | 3 | 3 | 3 |

| Snapshots und Infrastruktur-Tasks | 4 | 3 | 2 | 4 | 2 |

| IPAM / Präfixe / Adressinventar | 5 | 4 | 3 | 4 | 4 |

| IPAM Sources | 5 | 4 | 4 | 4 | 3 |

| Proxmox Platform connections | 5 | 4 | 3 | 3 | 3 |

| Appearance / persönliche Darstellung | 3 | 3 | 4 | 4 | 3 |

| SSH-Schlüsselverwaltung | 5 | 4 | 3 | 3 | 3 |

| Benutzer, Rollen und Kontosicherheit | 5 | 3 | 3 | 3 | 3 |

| Plugins | 3 | 3 | 1 | 3 | 2 |

| Benachrichtigungen | 5 | 3 | 3 | 4 | 3 |

| Systembetrieb / Polling / Agent | 5 | 4 | 3 | 3 | 3 |

| Danger Zone / Wiederherstellung | 2 | 3 | — | 3 | 2 |

| Suche, Activity Center, Umgebungen und Hilfe | 5 | 3 | 4 | 4 | 3 |

## Priorisierte Befunde

### P1-01 · Zeitangaben konsistent und mit Zeitzone anzeigen

**Beobachtung:** Der geplante Lauf vom 9. September erscheint in Runs mit Start 01:00, in der Host-Historie mit Start 03:00. Auch Last sync der Plattform wird an einer Stelle mit 18:30 und in Platform connections mit 20:30 angezeigt. Start- und Abschlusszeit erklären die zweistündige Differenz nicht.

**Auswirkung:** Bei Fehleranalyse und Wartungsplanung lassen sich Ereignisse nicht zuverlässig zeitlich zuordnen.

**Verbesserung:** Alle Zeitangaben zentral nach derselben Benutzerzeitzone formatieren. Start, Ende und letzte Aktualisierung ausdrücklich unterscheiden. Zeitzone sichtbar oder per Tooltip ergänzen; absolute Zeit und relative Zeit kombinieren.

**Abnahme:** Ein identischer Lauf bzw. Sync hat in allen Ansichten dieselbe lokale Uhrzeit; UTC ist eindeutig gekennzeichnet.

[Bild 02](screenshots/02-operations-activity.png) · [Bild 16](screenshots/16-host-activity.png) · [Bild 25](screenshots/25-playbook-run-form.png) · [Bild 27](screenshots/27-schedules.png) · [Bild 32](screenshots/32-settings-users.png) · [Bild 50](screenshots/50-platform-tasks.png) · [Bild 62](screenshots/62-platform-connections.png)

### P1-02 · Gesundheitszustand und Datenquellen widerspruchsfrei machen

**Beobachtung:** Bei hr01-media-hms warnt die Übersicht vor zwei Container-Image-Updates, während daneben Updates: Healthy steht. Das Dashboard nennt für pve001 drei OS-Updates; die Proxmox-Seite nennt fünf. Unterschiedliche Quellen oder Aktualisierungszeiten werden an diesen Kennzahlen nicht erklärt.

**Auswirkung:** Grüne Zusammenfassungen vermitteln Sicherheit, obwohl Handlungsbedarf oder abweichende Daten vorliegen.

**Verbesserung:** OS-, Image- und Custom-Updates getrennt benennen und im Gesamthealth aggregieren. Quelle, Erhebungszeit und Veraltungsstatus anzeigen. Abweichende Updatekataloge erklären statt kommentarlos verschiedene Summen zu zeigen.

**Abnahme:** Image-Updates führen nicht zu einer pauschalen grünen Update-Zusammenfassung; Abweichungen zwischen Inventaren sind nachvollziehbar.

[Bild 01](screenshots/01-dashboard.png) · [Bild 10](screenshots/10-host-overview.png) · [Bild 14](screenshots/14-host-updates.png) · [Bild 49](screenshots/49-platform-updates.png) · [Bild 55](screenshots/55-node-updates.png)

### P1-03 · Host, Inventar-VM und deklarativ verwaltete VM verständlich verbinden

**Beobachtung:** Managed VMs ist leer, die Plattform zeigt zwölf Managed in Shipyard, und die Umgebungsauswahl meldet ein Deployment. Die Infrastrukturübersicht nennt zwei external hosts, der Baum nur einen Standalone host. Ein Baumklick auf eine übernommene VM führt zu einem Host, das kleine Nachbaricon zur Proxmox-VM; bei VM 111 unterscheiden sich zudem die Namen hr01-med-services02 und hr01-media-hms.

**Auswirkung:** Benutzer können nicht sicher vorhersagen, welches Objekt sie öffnen oder was eine Kennzahl zählt.

**Verbesserung:** Drei eindeutige Managementzustände verwenden: Inventar, Hostbetrieb aktiv, deklarativ verwaltet. In jeder Ansicht beide Namen und Beziehungen zeigen. Baumklicks konsistent halten; Host- und VM-Ansicht ausdrücklich umschaltbar machen. Zähler nach derselben Definition berechnen.

**Abnahme:** Jede Zahl hat einen eindeutigen Geltungsbereich; dieselbe Ressource bleibt über Navigation und Aktionen eindeutig identifizierbar.

[Bild 20](screenshots/20-managed-vms.png) · [Bild 44](screenshots/44-infrastructure-platform.png) · [Bild 47](screenshots/47-platform-vms.png) · [Bild 61](screenshots/61-infrastructure-overview.png) · [Bild 68](screenshots/68-environment-menu.png) · [Bild 70](screenshots/70-container-overview.png)

### P1-04 · Reservierungsformular mit passendem Standard öffnen

**Beobachtung:** Reserve address öffnet ein Formular mit Status Active und einem leeren IP-Feld, obwohl die Präfixseite bereits eine nächste freie Adresse kennt.

**Auswirkung:** Die naheliegende Eingabe erzeugt semantisch einen aktiven Datensatz statt der angekündigten Reservierung.

**Verbesserung:** Reserved vorauswählen und die nächste freie Adresse vorbefüllen. Präfix und Quelle im Formular zeigen; bei Wechsel auf Active die Bedeutung erklären.

**Abnahme:** Der Standardpfad einer Reservierung erzeugt eine Reservierung und bleibt im gewählten Präfix.

[Bild 41](screenshots/41-ipam-prefix-detail.png) · [Bild 42](screenshots/42-ipam-reservation-form.png)

### P1-05 · Standardrolle bei neuen Benutzern transparenter und restriktiver gestalten

**Beobachtung:** Add User wählt User vor. Laut Rollenansicht umfasst diese feste Rolle alle Server, Playbooks und Features. Der Name lässt diese Reichweite im Erstellungsformular nicht erkennen.

**Auswirkung:** Ein vermeintlich normaler Benutzer kann deutlich mehr operative Rechte erhalten als beabsichtigt.

**Verbesserung:** Viewer oder explizite Rollenauswahl als Standard. Effektive Ressourcen und sensible Fähigkeiten direkt im Benutzerformular zusammenfassen. Die bestehenden guten Rollen-Presets dort integrieren.

**Abnahme:** Vor dem Erstellen sind Umfang und sensible Fähigkeiten sichtbar; ein neuer Benutzer erhält nicht implizit umfassende Betriebsrechte.

[Bild 33](screenshots/33-settings-roles.png) · [Bild 34](screenshots/34-role-form.png) · [Bild 73](screenshots/73-user-form.png)

### P2-01 · Technische Ereignisse in verständliche Aufgaben übersetzen

**Beobachtung:** In Listen stehen system_update, compose_pull_hms, apply und lange vm-UUIDs. Die Detailkarte wiederholt überwiegend die Tabellenfelder, Open details führt bei einem Workflow zur allgemeinen Playbooks-Seite.

**Auswirkung:** Die Aktivitätszentrale hilft zu wenig dabei, Ursache, Ergebnis und nächsten Schritt zu erkennen.

**Verbesserung:** Lesbare Aktionsnamen, stabile Ressourcennamen auch nach Löschung, Detail-Deep-Links zum konkreten Run, Laufzeit, Ergebniszusammenfassung und verlinkte Logs ergänzen.

**Abnahme:** Ein Benutzer kann aus einer Zeile direkt den betroffenen Lauf und dessen Ergebnis öffnen.

[Bild 02](screenshots/02-operations-activity.png) · [Bild 05](screenshots/05-audit.png) · [Bild 16](screenshots/16-host-activity.png) · [Bild 50](screenshots/50-platform-tasks.png)

### P2-02 · Große Formulare in prüfbare Schritte aufteilen

**Beobachtung:** VM-Konfiguration, erweiterte Hosteingabe, Zeitpläne und Rollen enthalten viele Felder in scrollenden Dialogen. Bei der VM stehen Clone attempts neben der Identität und ein Ubuntu-User als Vorgabe neben einem Debian-Template.

**Auswirkung:** Wichtige Entscheidungen gehen in Details unter; Standardwerte und versteckte Felder werden leicht übersehen.

**Verbesserung:** VM-Assistent: Vorlage → Ressourcen → Netzwerk/Zugriff → Automatisierung → Zusammenfassung. Expertenoptionen ausblenden, Vorlagenwerte ableiten, Einheiten vereinheitlichen, feldnahe Fehler und eine dauerhaft sichtbare Zusammenfassung ergänzen.

**Abnahme:** Vor dem Speichern sind Ziel, Ressourcenumfang, Netzwerk, Zugriff und ausgelöste Schritte auf einer Review-Seite sichtbar.

[Bild 09](screenshots/09-add-host-advanced.png) · [Bild 22](screenshots/22-create-vm-configuration.png) · [Bild 28](screenshots/28-schedule-form.png) · [Bild 34](screenshots/34-role-form.png)

### P2-03 · Leere oder unbekannte Metriken erklärbar machen

**Beobachtung:** Container-CPU und -Memory zeigen durchgehend Striche. Selbst gebaute Images melden Cannot check ohne sichtbare Lösung. VM-Disk und IP sind teilweise Not reported, obwohl QEMU agent Enabled angezeigt wird. Im Baum heißen gestoppte VMs Unknown; CPU-Auslastung wird an einer Stelle auf 0 von 20 Kernen gerundet.

**Auswirkung:** Nicht verfügbar, nicht unterstützt, nicht abgefragt und tatsächlich null sind schwer auseinanderzuhalten.

**Verbesserung:** Explizite Zustände mit Grund, Datenquelle und Zeitpunkt. Agent konfiguriert von Agent erreichbar unterscheiden. Gestoppt nicht als Unknown darstellen. Dezimalwerte für CPU-Kerne und Details zur Image-Prüfbarkeit ergänzen.

**Abnahme:** Jede fehlende Metrik nennt einen Grund oder nächsten Schritt; Rundungen erzeugen keine widersprüchlichen Werte.

[Bild 12](screenshots/12-host-workloads.png) · [Bild 44](screenshots/44-infrastructure-platform.png) · [Bild 47](screenshots/47-platform-vms.png) · [Bild 57](screenshots/57-vm-overview.png) · [Bild 58](screenshots/58-vm-configuration.png)

### P2-04 · Betriebseingriffe besser in Change-Prozesse einbetten

**Beobachtung:** Wartung erfasst Ressourcen und Owner als Freitext. Auf VM-Seiten ist Force stop ständig prominent. Snapshots bieten Erstellung und Löschung, aber keine sichtbare Wiederherstellung. Paketupdates zeigen lange Paketbeschreibungen statt eines kompakten Auswirkungsüberblicks.

**Auswirkung:** Die Werkzeuge sind vorhanden, aber der sichere Arbeitsablauf wird nicht ausreichend geführt.

**Verbesserung:** Ressourcen- und Teamauswahl, Konflikthinweise, Wartungsbezug und Change-Referenz ergänzen. Force stop in ein Gefahrenmenü verschieben. Snapshot-Restore anbieten oder klar zu Proxmox führen. Vor Updates Rebootbedarf und betroffene Dienste zusammenfassen.

**Abnahme:** Jeder kritische Ablauf erläutert Ziel, Auswirkungen und Wiederherstellungsmöglichkeiten; Ausführungsdialoge separat funktional testen.

[Bild 04](screenshots/04-maintenance-form.png) · [Bild 55](screenshots/55-node-updates.png) · [Bild 57](screenshots/57-vm-overview.png) · [Bild 59](screenshots/59-vm-snapshots.png)

### P2-05 · Sprache, Beschriftungen und Tabellenhierarchie vereinheitlichen

**Beobachtung:** Englische Seiten enthalten Anzeigename, API-Endpunkt, CPU-Modell und insgesamt. Status wechseln zwischen success, Success und Successful. Operations reserviert viel Platz für allgemeine Hinweise; viele wichtige Tabellenzeilen liegen erst unterhalb des sichtbaren Bereichs.

**Auswirkung:** Die Oberfläche wirkt weniger ausgereift und erfordert unnötiges Lesen und Scrollen.

**Verbesserung:** Eine konsequente UI-Sprache, gemeinsames Glossar und Statusvokabular. Kürzere Seitentexte, kompaktere Statusleisten, gut lesbare Sekundärtexte, konsistente Tabellenwerkzeuge und kontextbezogene Hilfe.

**Abnahme:** Keine gemischten Sprachen oder internen Aktionscodes im Standardpfad; Kernaufgaben sind im ersten Bildschirm sichtbar.

[Bild 02](screenshots/02-operations-activity.png) · [Bild 07](screenshots/07-managed-hosts.png) · [Bild 45](screenshots/45-platform-configuration.png) · [Bild 52](screenshots/52-node-configuration.png) · [Bild 63](screenshots/63-platform-connect-form.png) · [Bild 65](screenshots/65-profile-account.png)

## Bewertung aller Funktionsbereiche

### Dashboard

**Sinn:** Sinnvoll als täglicher Einstieg: Handlungsbedarf vor Inventarmenge.

**Informationen:** Die fünf Statusgruppen und betroffenen Hosts sind nützlich. Schweregrad, Alter und Updatearten bleiben zu wenig differenziert.

**Eingaben:** Drill-downs sind passend; ein sichtbarer Zeitraum für Failed operations würde die Interpretation verbessern.

**UI:** Ruhige Gestaltung und klare Tabelle. Die Attention-Sektion wiederholt Überschriften und nutzt viel Fläche.

**Verbesserung:** Nach Dringlichkeit sortieren; Auswirkungen, Datenalter und direkt passende nächste Aktionen anbieten.

[Bild 01](screenshots/01-dashboard.png)

### Operations / Activity

**Sinn:** Die zentrale Sammlung von Host-, Deployment- und Playbook-Aktivitäten ist wertvoll.

**Informationen:** Zeit, Auslöser, Ziel und Status sind vorhanden. Technische Namen, UUID-Ziele und eine weitgehend redundante Detailkarte reduzieren den Nutzen.

**Eingaben:** Quelle, Status, Suchtext und Datumsbereich passen. Kalender und gespeicherte Filter wären hilfreicher als reine Texteingabe.

**UI:** Viel vertikaler Platz vor der eigentlichen Liste. Die rechte Detailansicht benötigt mehr relevante Inhalte.

**Verbesserung:** Konkrete Run-Links, Ergebniszusammenfassung, Dauer und Logs ergänzen; Statusleiste komprimieren.

[Bild 02](screenshots/02-operations-activity.png)

### Wartungsplanung

**Sinn:** Ein notwendiger Baustein für geplante Betriebsänderungen.

**Informationen:** Name, Zeit, Beschreibung, Owner und Ressourcen sind vorhanden; Auswirkungen sind nur Freitext.

**Eingaben:** Datumseingaben sind format- und zeitzonenbeschriftet, aber manuell. Nur vier Zeitzonen zur Auswahl; Ressourcen und Owner ohne echte Zuordnung.

**UI:** Der leere Zustand erklärt den nächsten Schritt gut. Das Formular ist überschaubar.

**Verbesserung:** Datum-/Zeitpicker mit Tastatureingabe, vollständige Zeitzonensuche, Ressourcen- und Teamauswahl, Wiederholung und Konflikthinweise.

[Bild 03](screenshots/03-maintenance.png) · [Bild 04](screenshots/04-maintenance-form.png)

### Audit Log

**Sinn:** Für Verantwortlichkeit und Fehleranalyse unverzichtbar.

**Informationen:** Actor, IP, Zeit, Status und Objektlinks sind hilfreich. Retention ist sichtbar. Technische Eventcodes und oft leere Objektfelder stören.

**Eingaben:** Filter nach Aktion, Benutzer, Status und Datum sowie Export sind passend. Volltext- und Objektfilter fehlen im sichtbaren Filterbereich.

**UI:** Die Tabelle ist nachvollziehbar, aber textlastig. Manche Informationen wiederholen sich.

**Verbesserung:** Änderungen als Vorher/Nachher-Diff zeigen, Ressourcen nach Löschung benennbar halten und Export-/Retention-Regeln transparent machen.

[Bild 05](screenshots/05-audit.png) · [Bild 06](screenshots/06-audit-filter.png)

### Managed Hosts / Inventar

**Sinn:** Kernfunktion für den täglichen Hostbetrieb.

**Informationen:** Name, IP, OS, Online-Status und Tags sind da; Updatebedarf und letzte erfolgreiche Erhebung fehlen als direkte Listenspalten.

**Eingaben:** Suche, Status-/Tagfilter und Mehrfachauswahl sind passend. Speichern von Ansichten und anpassbare Spalten wären bei größeren Beständen wichtig.

**UI:** Saubere, kompakte Tabelle. Die lange Day-2-Erklärung wirkt wie Produkterläuterung statt Betriebsinformation.

**Verbesserung:** Attention, Updates, letzte Verbindung und Owner optional als Spalten; Bulk-Aktionen mit Zielzusammenfassung und klarer Auswahlreichweite.

[Bild 07](screenshots/07-managed-hosts.png) · [Bild 71](screenshots/71-host-filters.png)

### Host hinzufügen / Metadaten

**Sinn:** Sinnvolle Minimalanlage plus Expertenfelder.

**Informationen:** Der Hinweis zum nur temporär verwendeten SSH-Passwort ist gut. Hostname, SSH-Ziel und Anzeigename könnten klarer unterschieden werden.

**Eingaben:** Port, User, Tags, Links und Mounts passen grundsätzlich. Kommagetrennte Tags/Services sowie das unter Advanced versteckte Environment sind fehleranfällig.

**UI:** Langer innerer Dialogscroll bei erweiterter Eingabe; Name und IP sind dagegen angenehm schlank.

**Verbesserung:** Tag-Chips, strukturierte Services, sichtbarer Umgebungskontext, explizite Pflichtfelder und Teststatus mit Fehlerursache.

[Bild 08](screenshots/08-add-host-form.png) · [Bild 09](screenshots/09-add-host-advanced.png)

### Hostübersicht / System / Storage

**Sinn:** Die Trennung von Live-Übersicht und statischen Systemdaten ist sinnvoll.

**Informationen:** IPAM- und Proxmox-Links sind stark. Healthy trotz Image-Updates, API Latency ohne klare Bedeutung und reine Momentanwerte schwächen die Aussage.

**Eingaben:** Kopieren von IP/Hostname und gezieltes Refresh passen.

**UI:** Gute Abschnitte und Ressourcenbalken. Warnung und grüne Zusammenfassung widersprechen sich visuell.

**Verbesserung:** Kurze Verläufe, Erhebungszeit, klarer Metrikname für Latenz, korrekte Gesamtgesundheit und eindeutige Storage-Zustände.

[Bild 10](screenshots/10-host-overview.png) · [Bild 11](screenshots/11-host-system.png)

### Docker / Workloads

**Sinn:** Container nach Compose-Stacks gruppieren und Logs/Restart direkt erreichbar machen ist praktisch.

**Informationen:** Image- und Laufzustand helfen; fehlende CPU-/RAM-Werte und Cannot check bleiben unerklärt.

**Eingaben:** Add Stack bietet nur Pfad und YAML. Es fehlen im sichtbaren Dialog Vorlage, Validierungsstatus und Erklärung der Save-Wirkung.

**UI:** Dichte, lesbare Tabelle, aber die Spalte Check for Updates benennt eine Aktion statt den angezeigten Status.

**Verbesserung:** Update status als Spaltenname, Gründe für unbekannte Werte, Compose-Validierung und klare Trennung von Speichern und Starten.

[Bild 12](screenshots/12-host-workloads.png) · [Bild 13](screenshots/13-docker-stack-form.png)

### OS-Updates / Custom Update Tasks

**Sinn:** Standardpakete und eigene Anwendungen gemeinsam betreiben zu können ist sinnvoll.

**Informationen:** Der leere OS-Zustand ist verständlich, wird aber sprachlich nicht von Image-Updates getrennt. Custom Tasks erklären Ziel- und Ist-Version.

**Eingaben:** Script, GitHub Release und Output Trigger sind sinnvolle Typen. Freie SSH-Kommandos brauchen bessere Beispiele und überprüfbare Ausgaben.

**UI:** Kompakte Anzeige. Formulare wirken technisch und mehrere Labels sind im Accessibility-Baum nicht mit den Feldern verbunden.

**Verbesserung:** Letzte Prüfung, Paketdifferenzen, Rebootbedarf, Test-vor-Speichern, Timeout und Versionsvergleich verständlich darstellen.

[Bild 14](screenshots/14-host-updates.png) · [Bild 15](screenshots/15-custom-update-form.png)

### Hostaktivität / Logs

**Sinn:** Eine lokale Betriebshistorie ist ein guter Kontextanker.

**Informationen:** Start, Ende und Dauer sind stark. Fehlgeschlagene Läufe melden teils No error details were recorded; Aktionsnamen sind uneinheitlich.

**Eingaben:** Logs lassen sich bei Fehlern öffnen. Filter und Suche sind in dieser Ansicht nicht sichtbar.

**UI:** Viele Zeilen und Spalten ohne starke Fehlerpriorisierung.

**Verbesserung:** Fehlergrund extrahieren, alle Runs direkt öffnen, nach Typ/Status/Zeitraum filtern und Zeitformat mit Operations vereinheitlichen.

[Bild 16](screenshots/16-host-activity.png)

### Hostnotizen

**Sinn:** Nützlich für Runbooks, Verantwortliche und Besonderheiten vor Ort.

**Informationen:** Markdown und Vorschau sind passend; im leeren Zustand fehlen konkrete Nutzungsbeispiele.

**Eingaben:** Edit/Preview ist vertraut. Speicher- und Konfliktverhalten wurde nicht getestet.

**UI:** Schlichte, ruhige Fläche.

**Verbesserung:** Runbook-Vorlage, Autor, Änderungsdatum, Versionshistorie und Warnung vor ungespeicherten Änderungen.

[Bild 17](screenshots/17-host-notes.png)

### Dateibrowser / SSH-Terminal

**Sinn:** Schneller Zugriff ohne Werkzeugwechsel ist für Operatoren sehr wertvoll.

**Informationen:** Zielhost, User, Pfad, Dateigröße und Modus sind vorhanden. Terminal zeigt den verbundenen Root-Kontext klar.

**Eingaben:** Pfadnavigation und Upload sind verständlich; Befehle und Transfers wurden nicht ausgeführt.

**UI:** Terminal ist fokussiert. Numerische Unix-Modi und versteckte Dateien sind für erfahrene Admins passend, benötigen aber optional Hilfe.

**Verbesserung:** Sessiondauer/-ablauf, Audit-/Recording-Status, Vollbild, Suche und ein eindeutiger Transferfortschritt; versteckte Dateien optional ausblenden.

[Bild 18](screenshots/18-host-access.png) · [Bild 19](screenshots/19-host-terminal.png)

### Managed VMs / Vorlagen / Erstellung

**Sinn:** Deklarative VM-Erstellung mit isoliertem Zustand und Vorlagen ist ein starkes Produktmerkmal.

**Informationen:** Compute, Storage, Netz, Zugriff und Pre-/Post-Workflows sind umfassend. Der leere Inventarbereich widerspricht begrifflich anderen Managed-Zählern.

**Eingaben:** Viele hilfreiche Defaults; MB und GB sind gemischt, Ubuntu-User wird beim Debian-Template vorgegeben, Clone attempts ist zu prominent.

**UI:** Ein großer Dialog trägt zu viele Entscheidungen auf einmal.

**Verbesserung:** Geführter Assistent mit Review, Vorlagenabhängigkeiten und IPAM-Auswahl; Planung, Apply, Drift und Wiederherstellung erst mit vorhandener Test-VM separat validieren.

[Bild 20](screenshots/20-managed-vms.png) · [Bild 21](screenshots/21-create-vm-form.png) · [Bild 22](screenshots/22-create-vm-configuration.png)

### Playbook-Inventar / YAML-Editor

**Sinn:** Kategorisierte wiederverwendbare Automatisierung ist sinnvoll und gut integriert.

**Informationen:** Lesbare Playbook-Namen, Dateinamen, Kategorie und History sind gut. Autor, letzte Änderung und freigegebene Version könnten prominenter sein.

**Eingaben:** YAML-Editor mit Syntaxprüfung ist angemessen für die Zielgruppe. Direktes Editieren beim Auswählen ist weniger sicher als eine klare Leseansicht.

**UI:** Zweispaltige Inventar-/Detailstruktur ist stimmig. Interne System-Playbooks erzeugen vermeidbares Rauschen.

**Verbesserung:** Read-only-Inspektion als Standard, explizit bearbeiten, strukturierte Metadaten, Diff/Revision und getestete Freigabestände.

[Bild 23](screenshots/23-playbooks.png) · [Bild 24](screenshots/24-playbook-editor.png)

### Playbook Runs / Zielauswahl

**Sinn:** Ad-hoc-Ausführung und Historie schließen den Betriebsablauf sinnvoll zusammen.

**Informationen:** Hostsuche, IP, Tags, Status und Zielvorschau sind gute Absicherungen. Output und Historie teilen sich eine sehr lange Seite.

**Eingaben:** JSON-Variablen sind technisch; localhost erscheint neben echten Hosts ohne gleichwertige Erläuterung des Ausführungsortes.

**UI:** Die Form ist lang, wichtige Run-Optionen liegen weit unten.

**Verbesserung:** Run-Assistent mit strukturierter Variableneingabe, deutlich markiertem localhost, sichtbarem Dry run und dauerhaft sichtbarer Zielzusammenfassung.

[Bild 25](screenshots/25-playbook-run-form.png)

### Variablen & Secrets

**Sinn:** Umgebungsspezifische Konfiguration und maskierte Secrets sind notwendig.

**Informationen:** Scope und Verschlüsselungsversprechen sind deutlich. Dieses Review bestätigt nicht deren technische Durchsetzung.

**Eingaben:** Key, Wert, Secret-Schalter und Beschreibung sind passend. Secret ist beim Anlegen nicht der Standard.

**UI:** Übersichtlich, aber leere Liste und offenes Formular stehen redundant untereinander.

**Verbesserung:** Typen und Verwendungshinweise, sichere Secret-Erkennung, Änderungshistorie, Ablauf-/Rotationshinweise und klare Überschreibungsreihenfolge.

[Bild 26](screenshots/26-variables-secrets.png) · [Bild 74](screenshots/74-variable-form.png)

### Schedules

**Sinn:** Wiederkehrende Automatisierung mit Zielauswahl und Dry run ist sehr sinnvoll.

**Informationen:** Nächster Lauf samt Zone ist gut. Last run verwendet eine abweichende Uhrzeitdarstellung. Der vorhandene Name Weekly Updates gehört zu einem Daily-Zeitplan — eine Datenbenennung, kein nachgewiesener Schedulerfehler.

**Eingaben:** Presets plus Cron, Parallelität und Extra-Variablen passen. Die Zielauswahl ist schwächer durchsuchbar als bei Runs.

**UI:** Das neue Zeitplanformular ist schmal und lang; die nächsten Ausführungen sollten sichtbar zusammengefasst werden.

**Verbesserung:** Gemeinsame Hostauswahl, nächste drei Läufe, Zone im Dialog, Retry-/Overlap-Regeln und Wartungsfensterbezug.

[Bild 27](screenshots/27-schedules.png) · [Bild 28](screenshots/28-schedule-form.png)

### Git Integration

**Sinn:** Versionierte Playbooks sind für Teamarbeit wichtig.

**Informationen:** HTTPS-Token versus SSH-Key ist klar. Auto-pull und Auto-push stehen standardmäßig an; Branch-/Commit-Kontext fehlt im sichtbaren Formular.

**Eingaben:** Repository, Identität und Authentifizierung sind angemessen. Ein Verbindungstest und die Behandlung lokaler Änderungen sollten vor Connect erläutert werden.

**UI:** Saubere Form, aber wenig Unterstützung für kollaborative Freigabeprozesse.

**Verbesserung:** Branch-Auswahl, letzte Revision/Sync, Konfliktstatus, schreibgeschützter Modus und bewusstes Opt-in für Auto-push.

[Bild 29](screenshots/29-git-settings.png)

### Infrastrukturübersicht / Baum

**Sinn:** Plattform, Node und Gast hierarchisch zu verbinden ist fachlich richtig.

**Informationen:** Kapazitäten und Erreichbarkeit helfen. Externe-Host-Zähler, Managed-Status und Datastoreumfang sind nicht durchgängig gleich definiert.

**Eingaben:** Baumsuche und Aufklappen passen. Bei 19 VMs ist der Baum bereits lang und einzelne Zielnamen sind sehr klein.

**UI:** Konsistente Linien und Icons; die Plattformauswahl nimmt bei einer Plattform viel leere Fläche ein.

**Verbesserung:** Favoriten und gespeicherte Filter, klarer Einstieg zur Infrastrukturübersicht, konsistente Klickziele und flexible Master-/Detailbreite.

[Bild 61](screenshots/61-infrastructure-overview.png) · [Bild 44](screenshots/44-infrastructure-platform.png)

### Plattform- und Nodeinformationen

**Sinn:** Statische Hardware und aktuelle Kapazität sind gut getrennt.

**Informationen:** CPU, Memory, Uptime, Kernel und Bridges helfen. Configuration auf Plattformebene ist überwiegend eine zweite Inventarübersicht.

**Eingaben:** Navigation und Copy-/Drill-down-Pfade sind ausreichend; keine Konfigurationsänderung getestet.

**UI:** Ruhige Kartenstruktur, teils redundante Angaben und gemischtsprachige Bezeichnungen.

**Verbesserung:** Configuration passend umbenennen oder echte Verbindungseinstellungen anbieten; Trends, Datenalter und vollständige Netz-/Storage-Abdeckung ergänzen.

[Bild 44](screenshots/44-infrastructure-platform.png) · [Bild 45](screenshots/45-platform-configuration.png) · [Bild 46](screenshots/46-platform-nodes.png) · [Bild 51](screenshots/51-node-overview.png) · [Bild 52](screenshots/52-node-configuration.png)

### VM-/CT-Inventar und Adoption

**Sinn:** Vorhandene VMs sichtbar machen und gezielt als Hosts übernehmen ist sinnvoll.

**Informationen:** Managementzustand, Ressourcen und Konfiguration sind vorhanden. Inventarstatus und Hoststatus werden im Baum vermischt; IP-/Disk-Werte fehlen ohne ausreichenden Grund.

**Eingaben:** Mehrfachauswahl und Actions sind passend. Import all orphaned virtual machines ist technisch und missverständlich benannt; Ausführung wurde nicht geprüft.

**UI:** Breite Tabellen ohne sichtbare Suche oder Statusfilter im VM-Tab. Destruktive Buttons sind auf Detailseiten sehr prominent.

**Verbesserung:** Suche/Filter, klarer Adoption-Assistent, lesbare Fehlerursachen, stabile Namen, getrennte Host-/VM-Ansichten und Gefahrenmenü.

[Bild 47](screenshots/47-platform-vms.png) · [Bild 53](screenshots/53-node-vms.png) · [Bild 57](screenshots/57-vm-overview.png) · [Bild 58](screenshots/58-vm-configuration.png) · [Bild 70](screenshots/70-container-overview.png)

### Datastores

**Sinn:** Kapazitätsprüfung vor VM-Erstellung ist notwendig.

**Informationen:** Used, Free, Capacity und Prozentwert sind gut. Der Tab heißt Datastores, zeigt aber ausdrücklich nur ZFS; der VM-Assistent bietet zusätzlich local-lvm an.

**Eingaben:** Keine Eingaben erforderlich.

**UI:** Saubere Tabelle, bei einem Eintrag viel ungenutzte Fläche.

**Verbesserung:** Alle relevanten Datastores anzeigen oder den Tab ZFS pools nennen; Health, Backend, Provisionierung, Reservierungen und Trend ergänzen.

[Bild 48](screenshots/48-platform-datastores.png) · [Bild 54](screenshots/54-node-datastores.png)

### Proxmox-Updates

**Sinn:** Updates im Plattformkontext planen zu können ist sehr sinnvoll.

**Informationen:** Installed/Available/Origin sind nützlich. Lange Paketbeschreibungen ersetzen keine Information zu Reboot, Auswirkungen und Dringlichkeit.

**Eingaben:** Refresh catalog und Install sind eindeutig; der letzte Bestätigungsschritt wurde nicht ausgelöst.

**UI:** Die Paketliste ist sachlich, wichtige Betriebshinweise fehlen im sichtbaren Vorfeld.

**Verbesserung:** Kompakte Beschreibungen, Release Notes, Rebootbedarf, Wartungsbezug und eine zusammenhängende Ergebnis-/Fehleransicht.

[Bild 49](screenshots/49-platform-updates.png) · [Bild 55](screenshots/55-node-updates.png)

### Snapshots und Infrastruktur-Tasks

**Sinn:** Snapshots und nachvollziehbare Aktionen sind wichtig für Betriebssicherheit.

**Informationen:** Snapshotname und Datum sowie aggregierte Sync-Ereignisse sind hilfreich. Die Tasks erklären ihren begrenzten Umfang, wirken aber gegenüber anderen Historien fragmentiert.

**Eingaben:** Snapshot erstellen/löschen sichtbar, Wiederherstellung nicht sichtbar. Keine Snapshotaktion ausgeführt.

**UI:** Klare Leerzustände, aber wenig Unterstützung beim entscheidenden Recovery-Ablauf.

**Verbesserung:** Restore oder Proxmox-Deep-Link, Schutzkennzeichnung, Retention und Kontext zu Konsistenz/RAM. Objektaktivität über Quellen hinweg vereinen.

[Bild 50](screenshots/50-platform-tasks.png) · [Bild 56](screenshots/56-node-tasks.png) · [Bild 59](screenshots/59-vm-snapshots.png) · [Bild 60](screenshots/60-vm-tasks.png)

### IPAM / Präfixe / Adressinventar

**Sinn:** Sehr sinnvoller Zusammenhang aus Adressraum, Reservierungen und Hostzuordnung.

**Informationen:** Freie Intervalle, nächste freie IP, Gateway, MAC, Quelle und Hostlink sind besonders nützlich. Die Präfixliste selbst zeigt keine Auslastung.

**Eingaben:** Einzeladresse/Range und Präfix-CIDR passen. Reservierung startet als Active, IP-Beispiel stammt aus einem anderen Netz. IPv6 ist nicht sichtbar.

**UI:** Einer der stärksten Bereiche. Zwei Suchfelder auf der Startseite sollten ihre unterschiedlichen Bereiche deutlicher erklären.

**Verbesserung:** Korrekte Reservierungsdefaults, Präfix-Auslastung, Konflikte, Quelle/Alter dauerhaft sichtbar; IPv6/VRF nur entsprechend Zielmarkt ausbauen.

[Bild 39](screenshots/39-ipam-prefixes.png) · [Bild 40](screenshots/40-ipam-prefix-form.png) · [Bild 41](screenshots/41-ipam-prefix-detail.png) · [Bild 42](screenshots/42-ipam-reservation-form.png)

### IPAM Sources

**Sinn:** Automatischer Import verhindert manuelle Doppelpflege.

**Informationen:** Verbindungsstatus, Testzeit, Synczeit, Intervall und Konflikte sind gut. Grün bei null beobachteten Adressen benötigt mehr Erklärung.

**Eingaben:** UniFi/pfSense, URL, Token und Site sind nachvollziehbar. Automatische Erkennung von URL-Varianten und ein klarer Testschritt würden helfen.

**UI:** Die Statuskarte ist gut gegliedert; die lange rohe API-URL ist visuell dominant.

**Verbesserung:** Controller und Site als lesbare Felder, Sync-Differenz, Datenvorschau und Warnung bei unerwartet leerem Bestand.

[Bild 43](screenshots/43-ipam-sources.png) · [Bild 72](screenshots/72-ipam-source-form.png)

### Proxmox Platform connections

**Sinn:** Wiederverwendbare umgebungsbezogene Verbindungen sind richtig modelliert.

**Informationen:** Endpoint, IPAM-Intervall und Last sync sind nützlich. Access configured sagt wenig über tatsächlich verfügbare Rechte aus.

**Eingaben:** Token, Public Key und TLS-Prüfung sind passend; Tokenformat und Mindestberechtigungen brauchen Hilfe. Keine Tokens eingegeben.

**UI:** Verschachtelte Dialoge und gemischte Sprache mindern den professionellen Eindruck.

**Verbesserung:** Test mit Rechtecheck vor Speichern, CA-Zertifikatsweg, Service-Account-Beispiel statt root, flache Navigation und konsistente Sprache.

[Bild 62](screenshots/62-platform-connections.png) · [Bild 63](screenshots/63-platform-connect-form.png)

### Appearance / persönliche Darstellung

**Sinn:** Branding und persönliche Darstellung sind sinnvoll, aber nachrangig gegenüber Betriebskonsistenz.

**Informationen:** Persönliches Theme versus globale Marke ist erklärt. White Label verspricht auch ein Icon; im geprüften Abschnitt sind Name/Farbe sichtbar.

**Eingaben:** Theme, Density, Appname und Farbe passen. Scope und unmittelbare beziehungsweise gespeicherte Wirkung sollten konsistent sein.

**UI:** Die aktuelle dunkle Farbwelt ist kohärent. Viele Theme-Optionen auf der Kontoseite gewichten Kosmetik stärker als Sessioninformationen.

**Verbesserung:** Appearance als eigene persönliche Einstellung, zuverlässige Defaults, Kontrastprüfung und Priorität auf Typografie/Status statt neue Themes.

[Bild 30](screenshots/30-settings-appearance.png) · [Bild 64](screenshots/64-profile-menu.png) · [Bild 65](screenshots/65-profile-account.png)

### SSH-Schlüsselverwaltung

**Sinn:** Zentraler Schlüssel mit Verteilung vereinfacht den Betrieb.

**Informationen:** Public Key, Algorithmus, Status und manuelle Installationsanweisung sind hilfreich; Lebenszyklus und Reichweite bleiben wenig sichtbar.

**Eingaben:** Ziel, User, Port und Einmalpasswort passen. Distribute to all hosts braucht eine klare Ziel-/Folgenübersicht im späteren Ablauf.

**UI:** Mehrere lange Konfigurationsblöcke; kritische Export-/Importaktionen stehen neben Routineinformationen.

**Verbesserung:** Fingerprint, Alter, Rotation, Verwendungsübersicht und separate Schutzstufe für Private-Key-Export; mehrere Schlüssel nach Umgebung als Ausbau prüfen.

[Bild 31](screenshots/31-settings-ssh.png)

### Benutzer, Rollen und Kontosicherheit

**Sinn:** Granulare Rollen, Ressourcen-Scope und 2FA sind notwendige Enterprise-Bausteine.

**Informationen:** Rollen-Presets und Live preview sind gut. Die breite Built-in-Rolle User, rohe Null in der Benutzerzeile und fehlende sichtbare Sessionübersicht sind Schwächen.

**Eingaben:** Anlage ist einfach, aber initiales Passwort wird vom Admin gesetzt und User ist voreingestellt. Rollenformular ist sehr lang.

**UI:** Grundstruktur passt. Sensitive Rechte sollten besser gruppiert und ihre effektive Kombination leichter prüfbar sein.

**Verbesserung:** Einladungen, restriktive Defaults, SSO/MFA-Policy, Sessions/Widerruf und Rights-Diff als Enterprise-Ausbau; keine Sicherheitswirkung aus dem UI allein ableiten.

[Bild 32](screenshots/32-settings-users.png) · [Bild 33](screenshots/33-settings-roles.png) · [Bild 34](screenshots/34-role-form.png) · [Bild 65](screenshots/65-profile-account.png) · [Bild 73](screenshots/73-user-form.png)

### Plugins

**Sinn:** Erweiterbarkeit ist für Spezialfälle nützlich, aktuell aber eher ein Entwicklermechanismus.

**Informationen:** Pfad und volle Serverrechte sind ehrlich erklärt. Im geprüften System sind keine Plugins installiert.

**Eingaben:** Manuelles Ablegen auf dem Dateisystem und Reload sind keine geführte Unternehmensverwaltung.

**UI:** Der Leerzustand ist verständlich, wiederholt aber den Installationspfad.

**Verbesserung:** Paket-/Versionsinventar, Quelle, Kompatibilität, Rechteumfang, Freigabe und Update-/Rollback-Status; aktive Pluginseiten separat prüfen.

[Bild 35](screenshots/35-settings-plugins.png)

### Benachrichtigungen

**Sinn:** Fehler und Monitoring-Ereignisse müssen außerhalb der App ankommen.

**Informationen:** Webhook, SMTP und Eventschalter sind klar. Zustellhistorie und nachweisbarer Status fehlen im sichtbaren Bereich.

**Eingaben:** Basisfelder reichen zum Start. Webhooktyp, SMTP-TLS-Modus, Empfängervalidierung und Testvoraussetzungen könnten deutlicher sein.

**UI:** Saubere Form, aber mehrere identisch beschriftete Save/Test-Buttons.

**Verbesserung:** Kanäle benennen, Testfeedback und Zustellprotokoll, Severity-/Teamrouting, Deduplizierung und Wartungsunterdrückung.

[Bild 36](screenshots/36-settings-notifications.png)

### Systembetrieb / Polling / Agent

**Sinn:** Laufzeitstatus und Pollingsteuerung sind sinnvoll.

**Informationen:** Versionen, Intervall und SSH/Agent-Unterschied werden erklärt. Custom Updates sagt gleichzeitig run check commands und nothing is executed — sprachlich widersprüchlich.

**Eingaben:** Intervalle und Zone passen; Auswirkungen der Änderungen auf Last, Aktualität und aktive Abläufe fehlen.

**UI:** Lange Seite mit heterogenen Aufgaben von Binary-Installation bis Monitoring.

**Verbesserung:** System Health, Polling und Runtime getrennt führen; letzte erfolgreiche Erhebung, Fehler, Queue und Agent-Verteilung zeigen. Agentaktivierung nicht getestet.

[Bild 37](screenshots/37-settings-system.png)

### Danger Zone / Wiederherstellung

**Sinn:** Gezielte Bereinigung kann nötig sein; fünf globale Resetfunktionen sind kein primärer Enterprise-Mehrwert.

**Informationen:** Folgen werden kurz genannt. Ob etwa Container data nur lokale Daten oder Remote-Daten meint, sollte eindeutig sein.

**Eingaben:** Keine destruktiven Dialoge oder Aktionen ausgeführt; Bestätigungsqualität nicht bewertet.

**UI:** Gefahr ist farblich deutlich, die Buttons stehen jedoch sehr direkt nebeneinander.

**Verbesserung:** Backup/Restore priorisieren, Datenumfang und betroffene Umgebung genau nennen, aktuelle Sicherung und geschützte Bestätigung im Ablauf verlangen.

[Bild 38](screenshots/38-settings-danger.png)

### Suche, Activity Center, Umgebungen und Hilfe

**Sinn:** Globale Navigation und Umgebungskontext sind zentrale Produktfunktionen.

**Informationen:** Command Palette ist schnell zugänglich. Activity Center meldet 0 recent trotz vorhandener Historie, ohne seinen Zeitraum/Session-Scope zu erklären. Help bietet nur GitHub und Issues.

**Eingaben:** Suche und Umgebungsanlage sind einfach. Die Palette könnte VM-/Node-/Präfixressourcen und Klartextnamen besser einbeziehen.

**UI:** Konsistenter Kopfbereich. Das macOS-Symbol ⌘K wird in dieser Linux-Sitzung angezeigt.

**Verbesserung:** Scope der Live-Zentrale benennen, Zähler vereinheitlichen, Plattform-Shortcuts, kontextuelle Dokumentation, Support-/Versionsinformationen.

[Bild 66](screenshots/66-activity-center.png) · [Bild 67](screenshots/67-command-search.png) · [Bild 68](screenshots/68-environment-menu.png) · [Bild 69](screenshots/69-help-menu.png)

## Reihenfolge der Umsetzung

### Zuerst: Vertrauen und Fehlbedienung

- Zeitformat und Zeitzone über alle Ansichten vereinheitlichen.

- Statusaggregation, Datenalter und Ressourcenzähler korrigieren.

- Reservierungsdefault und Benutzerrollenstandard überarbeiten.

- Ressourcenbeziehungen und Namen in Navigation und Listen eindeutig machen.

### Danach: tägliche Abläufe verkürzen

- VM-Erstellung und große Formulare in geführte Schritte überführen.

- Operations mit konkreten Run-Links, Logs und Ergebniszusammenfassung ausbauen.

- Tabellen mit Suche, Filtern, verständlichen Spalten und gespeicherten Ansichten standardisieren.

- Eine UI-Sprache und ein Status-/Aktionsglossar durchsetzen.

### Anschließend: Enterprise-Betrieb ausbauen

- SSO, MFA-Richtlinien, Einladungen und Sessionverwaltung gegen reale Kundenanforderungen priorisieren.

- Wartung und kritische Aktionen mit Freigaben, Verantwortlichen und Change-Referenzen verbinden.

- Backup/Restore, Snapshot-Recovery und Integrations-Zustellhistorie vervollständigen.

- Historische Metriken, Datenqualitätsindikatoren und konkrete Runbooks ergänzen.

## Screenshot-Inventar

- [01 · dashboard](screenshots/01-dashboard.png) — `https://shipyard/`

- [02 · operations-activity](screenshots/02-operations-activity.png) — `https://shipyard/operations?section=tasks`

- [03 · maintenance](screenshots/03-maintenance.png) — `https://shipyard/operations?section=maintenance`

- [04 · maintenance-form](screenshots/04-maintenance-form.png) — `https://shipyard/operations?section=maintenance`

- [05 · audit](screenshots/05-audit.png) — `https://shipyard/operations?section=audit`

- [06 · audit-filter](screenshots/06-audit-filter.png) — `https://shipyard/operations?section=audit`

- [07 · managed-hosts](screenshots/07-managed-hosts.png) — `https://shipyard/servers`

- [08 · add-host-form](screenshots/08-add-host-form.png) — `https://shipyard/servers`

- [09 · add-host-advanced](screenshots/09-add-host-advanced.png) — `https://shipyard/servers`

- [10 · host-overview](screenshots/10-host-overview.png) — `https://shipyard/servers/a104c583-8f7e-4b44-90c8-52b5b9f7096d`

- [11 · host-system](screenshots/11-host-system.png) — `https://shipyard/servers/a104c583-8f7e-4b44-90c8-52b5b9f7096d#tab=configuration`

- [12 · host-workloads](screenshots/12-host-workloads.png) — `https://shipyard/servers/a104c583-8f7e-4b44-90c8-52b5b9f7096d#tab=docker`

- [13 · docker-stack-form](screenshots/13-docker-stack-form.png) — `https://shipyard/servers/a104c583-8f7e-4b44-90c8-52b5b9f7096d#tab=docker`

- [14 · host-updates](screenshots/14-host-updates.png) — `https://shipyard/servers/a104c583-8f7e-4b44-90c8-52b5b9f7096d#tab=updates`

- [15 · custom-update-form](screenshots/15-custom-update-form.png) — `https://shipyard/servers/a104c583-8f7e-4b44-90c8-52b5b9f7096d#tab=updates`

- [16 · host-activity](screenshots/16-host-activity.png) — `https://shipyard/servers/a104c583-8f7e-4b44-90c8-52b5b9f7096d#tab=history`

- [17 · host-notes](screenshots/17-host-notes.png) — `https://shipyard/servers/a104c583-8f7e-4b44-90c8-52b5b9f7096d#tab=notes`

- [18 · host-access](screenshots/18-host-access.png) — `https://shipyard/servers/a104c583-8f7e-4b44-90c8-52b5b9f7096d#tab=access`

- [19 · host-terminal](screenshots/19-host-terminal.png) — `https://shipyard/servers/a104c583-8f7e-4b44-90c8-52b5b9f7096d#tab=access`

- [20 · managed-vms](screenshots/20-managed-vms.png) — `https://shipyard/deployments`

- [21 · create-vm-form](screenshots/21-create-vm-form.png) — `https://shipyard/deployments`

- [22 · create-vm-configuration](screenshots/22-create-vm-configuration.png) — `https://shipyard/deployments`

- [23 · playbooks](screenshots/23-playbooks.png) — `https://shipyard/playbooks`

- [24 · playbook-editor](screenshots/24-playbook-editor.png) — `https://shipyard/playbooks`

- [25 · playbook-run-form](screenshots/25-playbook-run-form.png) — `https://shipyard/playbooks#tab=runs`

- [26 · variables-secrets](screenshots/26-variables-secrets.png) — `https://shipyard/playbooks#tab=vars`

- [27 · schedules](screenshots/27-schedules.png) — `https://shipyard/playbooks#tab=schedules`

- [28 · schedule-form](screenshots/28-schedule-form.png) — `https://shipyard/playbooks#tab=schedules`

- [29 · git-settings](screenshots/29-git-settings.png) — `https://shipyard/settings/git`

- [30 · settings-appearance](screenshots/30-settings-appearance.png) — `https://shipyard/settings/appearance`

- [31 · settings-ssh](screenshots/31-settings-ssh.png) — `https://shipyard/settings/ssh`

- [32 · settings-users](screenshots/32-settings-users.png) — `https://shipyard/settings/users-roles`

- [33 · settings-roles](screenshots/33-settings-roles.png) — `https://shipyard/settings/users-roles#tab=roles`

- [34 · role-form](screenshots/34-role-form.png) — `https://shipyard/settings/users-roles#tab=roles`

- [35 · settings-plugins](screenshots/35-settings-plugins.png) — `https://shipyard/settings/plugins`

- [36 · settings-notifications](screenshots/36-settings-notifications.png) — `https://shipyard/settings/notifications`

- [37 · settings-system](screenshots/37-settings-system.png) — `https://shipyard/settings/system`

- [38 · settings-danger](screenshots/38-settings-danger.png) — `https://shipyard/settings/danger`

- [39 · ipam-prefixes](screenshots/39-ipam-prefixes.png) — `https://shipyard/networks`

- [40 · ipam-prefix-form](screenshots/40-ipam-prefix-form.png) — `https://shipyard/networks`

- [41 · ipam-prefix-detail](screenshots/41-ipam-prefix-detail.png) — `https://shipyard/networks/215a4e87-d1a0-4cea-8be2-a16226cddd19`

- [42 · ipam-reservation-form](screenshots/42-ipam-reservation-form.png) — `https://shipyard/networks/215a4e87-d1a0-4cea-8be2-a16226cddd19`

- [43 · ipam-sources](screenshots/43-ipam-sources.png) — `https://shipyard/networks/sources`

- [44 · infrastructure-platform](screenshots/44-infrastructure-platform.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006`

- [45 · platform-configuration](screenshots/45-platform-configuration.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006#tab=configuration`

- [46 · platform-nodes](screenshots/46-platform-nodes.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006#tab=nodes`

- [47 · platform-vms](screenshots/47-platform-vms.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006#tab=vms`

- [48 · platform-datastores](screenshots/48-platform-datastores.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006#tab=datastores`

- [49 · platform-updates](screenshots/49-platform-updates.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006#tab=updates`

- [50 · platform-tasks](screenshots/50-platform-tasks.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006#tab=tasks`

- [51 · node-overview](screenshots/51-node-overview.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006/nodes/pve001`

- [52 · node-configuration](screenshots/52-node-configuration.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006/nodes/pve001#tab=configuration`

- [53 · node-vms](screenshots/53-node-vms.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006/nodes/pve001#tab=vms`

- [54 · node-datastores](screenshots/54-node-datastores.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006/nodes/pve001#tab=datastores`

- [55 · node-updates](screenshots/55-node-updates.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006/nodes/pve001#tab=updates`

- [56 · node-tasks](screenshots/56-node-tasks.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006/nodes/pve001#tab=tasks`

- [57 · vm-overview](screenshots/57-vm-overview.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006/nodes/pve001/vms/100`

- [58 · vm-configuration](screenshots/58-vm-configuration.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006/nodes/pve001/vms/100#tab=configuration`

- [59 · vm-snapshots](screenshots/59-vm-snapshots.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006/nodes/pve001/vms/100#tab=snapshots`

- [60 · vm-tasks](screenshots/60-vm-tasks.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006/nodes/pve001/vms/100#tab=tasks`

- [61 · infrastructure-overview](screenshots/61-infrastructure-overview.png) — `https://shipyard/infrastructure`

- [62 · platform-connections](screenshots/62-platform-connections.png) — `https://shipyard/infrastructure`

- [63 · platform-connect-form](screenshots/63-platform-connect-form.png) — `https://shipyard/infrastructure`

- [64 · profile-menu](screenshots/64-profile-menu.png) — `https://shipyard/profile`

- [65 · profile-account](screenshots/65-profile-account.png) — `https://shipyard/profile`

- [66 · activity-center](screenshots/66-activity-center.png) — `https://shipyard/profile`

- [67 · command-search](screenshots/67-command-search.png) — `https://shipyard/profile`

- [68 · environment-menu](screenshots/68-environment-menu.png) — `https://shipyard/profile`

- [69 · help-menu](screenshots/69-help-menu.png) — `https://shipyard/profile`

- [70 · container-overview](screenshots/70-container-overview.png) — `https://shipyard/infrastructure/https%3A%2F%2F10.77.10.10%3A8006/nodes/pve001/vms/101`

- [71 · host-filters](screenshots/71-host-filters.png) — `https://shipyard/servers`

- [72 · ipam-source-form](screenshots/72-ipam-source-form.png) — `https://shipyard/networks/sources`

- [73 · user-form](screenshots/73-user-form.png) — `https://shipyard/settings/users-roles`

- [74 · variable-form](screenshots/74-variable-form.png) — `https://shipyard/playbooks#tab=vars`