// RÜSO redesign — Inhalte & Assets (alle Bilder/Videos stammen von rueso.de)
const U = 'https://www.rueso.de/wp-content/uploads/';

export const IMG = {
  building: U + '2025/08/rueso_firmengebaeude_salzkotten.webp',
  entrance: U + '2026/04/bruederkankenghaus_eingangsbereich.webp',
  drone: U + '2026/04/klimaerlebniswelt-oerlinghausen_patrick-johannsen-fotografie_05_drohne-5.webp',
  foyer: U + '2026/04/klimaerlebniswelt-oerlinghausen_patrick-johannsen-fotografie_02_foyer-27.webp',
  exterior: U + '2026/04/klimaeebniswelt-oerlinghausen_patrick-johannsen-fotografie_01_exterior-49.webp',
  schule1: U + '2026/04/schule-fuer-pflege-und-gesundheit-paderborn-1.webp',
  schule2: U + '2026/04/schule-fuer-pflege-und-gesundheit-paderborn-2.webp',
  schule3: U + '2026/04/schule-fuer-pflege-und-gesundheit-paderborn-3.webp',
  schule6: U + '2026/04/schule-fuer-pflege-und-gesundheit-paderborn-6.webp',
  bobbertsInnen: U + '2026/04/bobberts_innen.webp',
  bobberts4: U + '2026/04/gaststaette-bobberts-4.webp',
  bobberts2: U + '2026/04/gaststaette-bobberts-2.webp',
  ponitz: U + '2026/04/ponitz-logistikzentrum-beitragsbild.webp',
  ponitz2: U + '2026/04/Ponitz-Logistikzentrum_02.webp',
  hausF7: U + '2026/04/bruederkrankenhaus-haus-f-7.webp',
  hausF1: U + '2026/04/bruederkrankenhaus-haus-f-1.webp',
  hausF3: U + '2026/04/bruederkrankenhaus-haus-f-3.webp',
  hausC2: U + '2026/04/bruederkrankenhaus-haus-c-2.webp',
  hausC1: U + '2026/04/bruederkrankenhaus-haus-c-1.webp',
  marsberg4: U + '2026/04/st-marien-hospital-marsberg-4.webp',
  ogs1: U + '2026/04/ogs-bad-wuennenberg-1.webp',
  albert5: U + '2026/04/albert-schweitzer-schule-osnabrueck-5.webp',
  albert7: U + '2026/04/albert-schweitzer-schule-osnabrueck-7.webp',
  bmw1: U + '2025/08/bmw-maisach001.webp',
  bmw2: U + '2025/08/bmw-maisach002.webp',
  kaufland3: U + '2026/04/kaufland-emsdetten-3.webp',
  inscene2: U + '2026/04/inscene-2.webp',
  fassade1: U + '2025/08/fassade-aluminium-vor-fensterfront.webp',
  fassade2: U + '2025/08/fassade-mit-aluminiumfenstern.webp',
  fassade3: U + '2025/08/fassade-modernes-gebaeude.webp',
  fensterKunde: U + '2025/08/kunde_steht_am_fenster.webp',
  fensterSchule: U + '2026/06/fenster_referenz_schule_pb.webp',
  team1: U + '2026/06/prosduktion_rueso_team_9928.webp',
  team2: U + '2026/06/prosduktion_rueso_team_9860.webp',
  team3: U + '2026/06/prosduktion_rueso_team_41.webp',
  machine1: U + '2026/06/produktion_rueso_maschine_171.webp',
  machine2: U + '2026/06/produktion_rueso_maschine_125.webp',
};

export const VIDEO = {
  company: U + '2026/04/header_rueso_hd.mp4',
  jobs: U + '2026/05/rueso_jobs_header.mp4',
  windows: U + '2025/08/film_alumiumfenster.mp4',
};

export const PARTNERS = [
  { name: 'Schüco', img: U + '2026/04/Schueco-1.webp', href: 'https://www.schueco.com/' },
  { name: 'WAREMA', img: U + '2026/04/warema-1.webp', href: 'https://www.warema.com/' },
  { name: 'dormakaba', img: U + '2026/04/dormakaba-1.webp', href: 'https://www.dormakaba.com/' },
  { name: 'GEZE', img: U + '2026/04/Geze-1.webp', href: 'https://www.geze.de/' },
  { name: 'GU', img: U + '2026/04/GU-1.webp', href: 'https://www.gu-automatic.de' },
  { name: 'ASSA ABLOY', img: U + '2026/06/assa-abloy-sw.webp', href: 'https://www.assaabloy.com' },
  { name: 'Horton', img: U + '2026/04/Horton-1.webp', href: 'https://www.hortondoors.com/' },
  { name: 'ROMA', img: U + '2026/06/Roma.webp', href: 'https://www.roma.de/' },
  { name: 'Somfy', img: U + '2026/04/somfy-1.webp', href: 'https://www.somfy.de/' },
  { name: 'PLONKA', img: U + '2026/04/plonka-1.webp', href: 'https://plonka.gmbh/' },
];

const REFS = [
  { key: 'ponitz', name: 'Neubau Logistikzentrum', place: 'Ponitz', client: 'List AG', img: IMG.ponitz, img2: IMG.ponitz2, tags: ['fassade', 'fenster', 'brandschutz'], systems: 'FW 50+SI · AWS/ADS 75.SI+ · ADS 80 FR 30', photo: 'LIST AG' },
  { key: 'hausf', name: 'Brüderkrankenhaus Haus F', place: 'Paderborn', client: 'Brüderkrankenhaus', img: IMG.hausF7, img2: IMG.hausF1, tags: ['fassade', 'fenster', 'brandschutz', 'tueren'], systems: 'FW 60+HI · AWS/ADS 75.SI+ · Firestop F90 · Karusselltür KTC2', photo: 'Architekten Naujack Rind Hof GmbH' },
  { key: 'hausc', name: 'Brüderkrankenhaus Haus C', place: 'Paderborn', client: 'Brüderkrankenhaus', img: IMG.hausC2, img2: IMG.hausC1, tags: ['fassade', 'fenster', 'brandschutz'], systems: 'FW 50+SI · AWS/ADS 75.SI+ · ADS 80 FR 30', photo: 'Architekten Naujack Rind Hof GmbH' },
  { key: 'klima', name: 'Klimaerlebniswelt Oerlinghausen', place: 'Oerlinghausen', client: 'Lippe Tourismus & Marketing GmbH', img: IMG.drone, img2: IMG.foyer, tags: ['fassade', 'fenster'], systems: 'FW 50+SI · AWS 90.SI+ · Schüco Integralmaster', photo: 'Patrick Johannsen Fotografie' },
  { key: 'bobberts', name: 'Gaststätte Bobberts', place: 'Paderborn', client: 'Gaststätte Bobberts', img: IMG.bobberts4, img2: IMG.bobberts2, tags: ['fassade', 'schiebe'], systems: 'FW 50+SI · Schiebeanlagen ASE 80 HI', photo: '' },
  { key: 'schule', name: 'Schule für Pflege und Gesundheit', place: 'Paderborn', client: 'Schule für Pflege und Gesundheit', img: IMG.schule2, img2: IMG.schule6, tags: ['fenster', 'brandschutz'], systems: 'AWS/ADS 75.SI+ · ADS 80 FR 30 · Raffstore AR80', photo: 'Architekten Naujack Rind Hof GmbH' },
  { key: 'marsberg', name: 'St. Marien-Hospital Marsberg', place: 'Marsberg', client: 'St. Marien-Hospital', img: IMG.marsberg4, img2: IMG.marsberg4, tags: ['fassade', 'fenster', 'schiebe'], systems: 'FW 50+HI · ASS 70.HI · AWS 70.HI', photo: '' },
  { key: 'ogs', name: 'OGS Bad Wünnenberg', place: 'Bad Wünnenberg', client: 'Offene Ganztagsschule', img: IMG.ogs1, img2: IMG.ogs1, tags: ['fenster', 'tueren'], systems: '', photo: '' },
  { key: 'albert', name: 'Albert Schweitzer Schule', place: 'Osnabrück', client: '', img: IMG.albert5, img2: IMG.albert7, tags: ['fassade', 'fenster'], systems: '', photo: '' },
  { key: 'bmw', name: 'BMW Empfangsgebäude', place: 'Maisach, München', client: 'BMW Zentrum', img: IMG.bmw1, img2: IMG.bmw2, tags: ['fassade', 'schiebe', 'fenster'], systems: 'FW 50+HI · ASS 70.HI · AWS 70.HI', photo: '' },
  { key: 'kaufland', name: 'Kaufland Emsdetten', place: 'Emsdetten', client: 'Kaufland', img: IMG.kaufland3, img2: IMG.kaufland3, tags: ['fassade', 'tueren'], systems: '', photo: '' },
  { key: 'inscene', name: 'InScene Jugendcafé', place: 'Paderborn', client: 'AWO', img: IMG.inscene2, img2: IMG.inscene2, tags: ['fenster', 'tueren'], systems: '', photo: '' },
];

const TAGS = {
  de: { fassade: 'Fassade', fenster: 'Fenster', tueren: 'Türen', brandschutz: 'Brandschutz', schiebe: 'Schiebeanlagen' },
  en: { fassade: 'Facade', fenster: 'Windows', tueren: 'Doors', brandschutz: 'Fire protection', schiebe: 'Sliding systems' },
};

const DE = {
  services: [
    { no: '01', title: 'Fassaden', text: 'Pfosten-Riegel-Fassaden aus Aluminium – praktisch unbegrenzter Spielraum für den Ideenreichtum der Architektur.', img: IMG.fassade3, href: 'RUESO-Fassaden.dc.html' },
    { no: '02', title: 'Fenster', text: 'Energieeffizient, langlebig, maßgeschneidert – für Wohnungsbau, Verwaltungsgebäude und öffentliche Einrichtungen.', img: IMG.fensterKunde, href: 'RUESO-Fenster.dc.html' },
    { no: '03', title: 'Objekt- & Automatiktüren', text: 'Robust, vielseitig und langlebig – Aluminiumtüren für die täglichen Anforderungen im Objektbau.', img: IMG.entrance, href: 'RUESO-Objekttueren.dc.html' },
    { no: '04', title: 'Brand- & Rauchschutz', text: 'Türen und Fenster, die im Brandfall zuverlässig schließen – geprüft, zugelassen, präzise montiert.', img: IMG.schule3, href: 'RUESO-Brandschutz.dc.html' },
    { no: '05', title: 'Schiebetüren', text: 'Großzügige Glasfronten, die die Grenze zwischen Innenraum und Natur verschwinden lassen.', img: IMG.bobberts4, href: 'RUESO-Schiebetueren.dc.html' },
    { no: '06', title: 'Schiebewände', text: 'Flexible Raumtrennung mit maximaler Transparenz – gefertigt im eigenen Werk in Salzkotten.', img: IMG.bobbertsInnen, href: 'RUESO-Schiebewaende.dc.html' },
  ],
  stages: [
    { no: '01', title: 'Konstruktion', text: 'Planung gemeinsam mit Architekten und Bauherren: CAD-Zeichnungen, technische Datenblätter und ein durchdachter Systembaukasten schaffen Planungssicherheit von Anfang an.', img: IMG.machine2, alt: 'Fertigungsmaschine im Werk Salzkotten' },
    { no: '02', title: 'Produktion', text: 'Alle Aluminium-Bauteile entstehen im eigenen Werk in Salzkotten – hohe Fertigungstiefe, kurze Wege und absolute Präzision, auch bei Sonderlösungen.', img: IMG.team1, alt: 'RÜSO Team in der Produktion' },
    { no: '03', title: 'Montage', text: 'Unser erfahrenes Montageteam sorgt für fachgerechte Umsetzung, termingerechte Abläufe und die reibungslose Koordination aller Gewerke.', img: IMG.fassade1, alt: 'Aluminiumfassade vor Fensterfront' },
  ],
  milestones: [
    { year: '1950', text: 'Gründung durch Franz Rüther Senior' },
    { year: '1978', text: 'Umfirmierung in RÜSO Kunststoffverarbeitung GmbH & Co. KG – Kunststoff- und Aluminiumelemente' },
    { year: '1984', text: 'Übernahme durch Siegfried und Gerhard Rüther' },
    { year: '1994', text: 'Neues Verwaltungsgebäude und Produktionshalle auf dem Nachbargelände' },
    { year: '2009', text: 'Ausgliederung des Aluminiumbaus in die neue RÜSO GmbH' },
    { year: '2015', text: 'Michael Rüther steigt in die Geschäftsführung ein' },
    { year: '2021', text: 'Übernahme durch die PLONKA GmbH – Michael Rüther bleibt Geschäftsführer' },
    { year: '2023', text: 'Verlegung des Unternehmenssitzes von Bad Wünnenberg nach Salzkotten' },
  ],
  faq: [
    { q: 'Für welche Projekte ist RÜSO der richtige Partner?', a: 'Eingangsbereiche, Fensterfronten, Glasfassaden und Brandschutzelemente für öffentliche Einrichtungen, Schulen, Krankenhäuser, Universitäten, Banken und Firmengebäude – im Wohnungsbau, im öffentlichen Sektor und im Gewerbebau, bundesweit.' },
    { q: 'Wo werden die Elemente gefertigt?', a: 'Alle Aluminium-Bauteile fertigen wir in unserem eigenen Werk in Salzkotten. Das garantiert gleichbleibend hohe Qualität, kurze Lieferwege und eine enge Abstimmung zwischen Planung, Fertigung und Montage.' },
    { q: 'Unterstützen Sie bereits in der Planungsphase?', a: 'Ja. Mit detaillierten CAD-Zeichnungen, technischen Datenblättern und einem durchdachten Systembaukasten begleiten wir Architekten, Planer und Bauherren von der ersten Idee bis zum fertigen Konzept.' },
    { q: 'Mit welchen Systemen arbeiten Sie?', a: 'Unter anderem mit Pfosten-Riegel-Fassaden FW 50+ und FW 60+, den Fenster- und Türsystemen AWS/ADS 75.SI+ und AWS 90.SI+, Schiebeanlagen ASE 80 HI und ASS 70.HI sowie Brand- und Rauchschutztüren ADS 80 FR 30 und ADS 65.NI SP.' },
    { q: 'Erfüllen Ihre Fenster die aktuellen Energiestandards?', a: 'Unsere Aluminiumfenster erfüllen die Vorgaben nach GEG (vormals EnEV) und erreichen exzellente Uw-Werte – ein wichtiges Argument für Förderprogramme und ESG-Anforderungen.' },
    { q: 'Ist zertifizierter Einbruchschutz möglich?', a: 'Auf Wunsch statten wir Fenster mit geprüften Sicherheitskomponenten nach RC2 oder RC3 aus – einbruchhemmende Beschläge, Sicherheitsverglasung und verdeckt liegende Verriegelungspunkte.' },
  ],
  jobs: [
    { title: 'Monteur (m/w/d)', sub: 'Fenster- und Fassadenkonstruktion', meta: ['Salzkotten + regionale Montagen', 'Vollzeit', 'unbefristet', 'ab sofort'], href: 'RUESO-Karriere.dc.html#bewerbung' },
    { title: 'Metallbauer (m/w/d)', sub: 'Fenster- und Fassadenkonstruktion', meta: ['Salzkotten', 'Vollzeit', 'keine Schichtarbeit', 'unbefristet', 'ab sofort'], href: 'RUESO-Karriere.dc.html#bewerbung' },
  ],
  filters: [
    { key: 'all', label: 'Alle' }, { key: 'fassade', label: 'Fassaden' }, { key: 'fenster', label: 'Fenster' }, { key: 'tueren', label: 'Türen' }, { key: 'brandschutz', label: 'Brandschutz' }, { key: 'schiebe', label: 'Schiebeanlagen' },
  ],
};

const EN = {
  services: [
    { no: '01', title: 'Facades', text: 'Aluminium curtain-wall facades – virtually unlimited freedom for architectural ideas.', img: IMG.fassade3, href: 'RUESO-Fassaden.dc.html' },
    { no: '02', title: 'Windows', text: 'Energy-efficient, durable, made to measure – for housing, administrative and public buildings.', img: IMG.fensterKunde, href: 'RUESO-Fenster.dc.html' },
    { no: '03', title: 'Entrance & automatic doors', text: 'Robust, versatile and long-lasting – aluminium doors for the daily demands of commercial buildings.', img: IMG.entrance, href: 'RUESO-Objekttueren.dc.html' },
    { no: '04', title: 'Fire & smoke protection', text: 'Doors and windows that close reliably in the event of fire – tested, approved, precisely installed.', img: IMG.schule3, href: 'RUESO-Brandschutz.dc.html' },
    { no: '05', title: 'Sliding doors', text: 'Generous glass fronts that dissolve the boundary between interior and nature.', img: IMG.bobberts4, href: 'RUESO-Schiebetueren.dc.html' },
    { no: '06', title: 'Sliding walls', text: 'Flexible room division with maximum transparency – manufactured in our own plant in Salzkotten.', img: IMG.bobbertsInnen, href: 'RUESO-Schiebewaende.dc.html' },
  ],
  stages: [
    { no: '01', title: 'Engineering', text: 'Planning together with architects and clients: CAD drawings, technical data sheets and a well-conceived system kit provide planning certainty from day one.', img: IMG.machine2, alt: 'Production machine at the Salzkotten plant' },
    { no: '02', title: 'Production', text: 'All aluminium components are made in our own plant in Salzkotten – high vertical integration, short distances and absolute precision, even for custom solutions.', img: IMG.team1, alt: 'RÜSO team in production' },
    { no: '03', title: 'Installation', text: 'Our experienced installation team ensures professional execution, on-schedule processes and smooth coordination of all trades.', img: IMG.fassade1, alt: 'Aluminium facade in front of window front' },
  ],
  milestones: [
    { year: '1950', text: 'Founded by Franz Rüther Senior' },
    { year: '1978', text: 'Renamed RÜSO Kunststoffverarbeitung GmbH & Co. KG – plastic and aluminium elements' },
    { year: '1984', text: 'Taken over by Siegfried and Gerhard Rüther' },
    { year: '1994', text: 'New administration building and production hall on the neighbouring site' },
    { year: '2009', text: 'Aluminium construction spun off into the new RÜSO GmbH' },
    { year: '2015', text: 'Michael Rüther joins the management' },
    { year: '2021', text: 'Acquired by PLONKA GmbH – Michael Rüther remains managing director' },
    { year: '2023', text: 'Headquarters relocated from Bad Wünnenberg to Salzkotten' },
  ],
  faq: [
    { q: 'Which projects is RÜSO the right partner for?', a: 'Entrance areas, window fronts, glass facades and fire-protection elements for public institutions, schools, hospitals, universities, banks and corporate buildings – in housing, the public sector and commercial construction, nationwide.' },
    { q: 'Where are the elements manufactured?', a: 'All aluminium components are produced in our own plant in Salzkotten. This guarantees consistently high quality, short delivery routes and close coordination between planning, production and installation.' },
    { q: 'Do you support us during the planning phase?', a: 'Yes. With detailed CAD drawings, technical data sheets and a well-conceived system kit, we accompany architects, planners and clients from the first idea to the finished concept.' },
    { q: 'Which systems do you work with?', a: 'Among others, FW 50+ and FW 60+ curtain-wall facades, the AWS/ADS 75.SI+ and AWS 90.SI+ window and door systems, ASE 80 HI and ASS 70.HI sliding systems, and ADS 80 FR 30 and ADS 65.NI SP fire and smoke protection doors.' },
    { q: 'Do your windows meet current energy standards?', a: 'Our aluminium windows comply with the German GEG (formerly EnEV) and achieve excellent Uw values – a strong argument for funding programmes and ESG requirements.' },
    { q: 'Is certified burglary protection available?', a: 'On request, we equip windows with tested security components to RC2 or RC3 – burglar-resistant fittings, safety glazing and concealed locking points.' },
  ],
  jobs: [
    { title: 'Installer (m/f/d)', sub: 'Window and facade construction', meta: ['Salzkotten + regional sites', 'Full-time', 'Permanent', 'Immediately'], href: 'RUESO-Karriere.dc.html#bewerbung' },
    { title: 'Metal worker (m/f/d)', sub: 'Window and facade construction', meta: ['Salzkotten', 'Full-time', 'No shift work', 'Permanent', 'Immediately'], href: 'RUESO-Karriere.dc.html#bewerbung' },
  ],
  filters: [
    { key: 'all', label: 'All' }, { key: 'fassade', label: 'Facades' }, { key: 'fenster', label: 'Windows' }, { key: 'tueren', label: 'Doors' }, { key: 'brandschutz', label: 'Fire protection' }, { key: 'schiebe', label: 'Sliding systems' },
  ],
};

const PAGES = {
  fassaden: {
    de: {
      features: [
        { no: '01', title: 'Planung & Beratung', text: 'Von der ersten Idee bis zum fertigen Konzept arbeiten wir eng mit Architekten, Planern und Bauherren zusammen. So entstehen Lösungen, die technisch präzise durchdacht und gestalterisch überzeugend sind.' },
        { no: '02', title: 'Individuelle Konstruktionen', text: 'Wir entwickeln maßgefertigte Aluminium-Fassaden, die sich exakt an die Anforderungen des Projekts anpassen und moderne Technik ebenso wie innovative Designlösungen integrieren.' },
        { no: '03', title: 'Energieeffizienz & Nachhaltigkeit', text: 'Durch den Einsatz moderner Wärmedämmtechnologien und langlebiger, vollständig recyclebarer Materialien schaffen wir Fassaden, die ökologisch und wirtschaftlich überzeugen.' },
        { no: '04', title: 'Montage & Projektabwicklung', text: 'Unser erfahrenes Montageteam sorgt für eine fachgerechte Umsetzung, termingerechte Abläufe und eine reibungslose Koordination aller Gewerke.' },
        { no: '05', title: 'Sanierung & Modernisierung', text: 'Wir werten bestehende Gebäude optisch und technisch auf und passen sie an aktuelle energetische und bauliche Standards an.' },
        { no: '06', title: 'Produktion in Ostwestfalen', text: 'Alle Aluminium-Bauteile fertigen wir in unserem eigenen Werk in Salzkotten. Das garantiert gleichbleibend hohe Qualität, kurze Lieferwege und eine enge Abstimmung zwischen Planung, Fertigung und Montage.' },
      ],
      advantages: ['Hohe Stabilität bei geringem Gewicht', 'Korrosionsbeständig und wetterfest', 'Flexible Gestaltungsmöglichkeiten für individuelle Architektur', 'Minimaler Wartungsaufwand', 'Nachhaltig und zu 100 % recyclebar'],
    },
    en: {
      features: [
        { no: '01', title: 'Planning & consulting', text: 'From the first idea to the finished concept, we work closely with architects, planners and clients – creating solutions that are technically precise and convincing in design.' },
        { no: '02', title: 'Custom constructions', text: 'We develop made-to-measure aluminium facades that adapt exactly to the requirements of the project and integrate modern technology as well as innovative design solutions.' },
        { no: '03', title: 'Energy efficiency & sustainability', text: 'Using modern thermal insulation technology and durable, fully recyclable materials, we create facades that convince both ecologically and economically.' },
        { no: '04', title: 'Installation & project management', text: 'Our experienced installation team ensures professional execution, on-schedule processes and smooth coordination of all trades.' },
        { no: '05', title: 'Refurbishment & modernisation', text: 'We upgrade existing buildings visually and technically and bring them up to current energy and construction standards.' },
        { no: '06', title: 'Production in East Westphalia', text: 'All aluminium components are made in our own plant in Salzkotten – guaranteeing consistent quality, short delivery routes and close coordination between planning, production and installation.' },
      ],
      advantages: ['High stability at low weight', 'Corrosion-resistant and weatherproof', 'Flexible design options for individual architecture', 'Minimal maintenance', 'Sustainable and 100 % recyclable'],
    },
  },
  fenster: {
    de: {
      features: [
        { no: '01', title: 'Planungssicherheit von Anfang an', text: 'Wir unterstützen Sie bereits in der Planungsphase. Mit detaillierten CAD-Zeichnungen, technischen Datenblättern und einem durchdachten Systembaukasten schaffen wir maximale Transparenz und Effizienz bei der Projektabwicklung.' },
        { no: '02', title: 'Hohe Qualität – eigene Fertigung', text: 'Alle Fenster werden in unserem Werk in Salzkotten gefertigt. So garantieren wir kurze Wege, hohe Fertigungstiefe und absolute Präzision – auch bei komplexen Anforderungen oder Sonderlösungen.' },
        { no: '03', title: 'Energieeffizient und förderfähig', text: 'Unsere Aluminiumfenster erfüllen die aktuellen Vorgaben nach GEG (vormals EnEV) und erreichen exzellente Uw-Werte. Damit tragen sie aktiv zur Energieeffizienz des Gesamtgebäudes bei – ein wichtiges Argument für Förderprogramme und ESG-Anforderungen.' },
        { no: '04', title: 'Designfreiheit – ohne Kompromisse bei der Technik', text: 'Ob schmale Ansichtsbreiten, große Glasflächen oder verdeckt liegende Beschläge: Unsere Systeme bieten maximale Gestaltungsfreiheit und lassen sich flexibel an architektonische Konzepte anpassen – auch bei denkmalgeschützten Objekten oder Sondermaßen.' },
        { no: '05', title: 'Zertifizierter Einbruchschutz', text: 'Unsere Aluminiumfenster sind auf Wunsch mit geprüften Sicherheitskomponenten nach RC2 oder RC3 ausgestattet – ideal für Objekte mit erhöhtem Schutzbedarf wie Schulen, Verwaltungsgebäude, Arztpraxen oder Wohnanlagen.' },
        { no: '06', title: 'Komfortlösungen für moderne Gebäude', text: 'Automatisierte Öffnungssysteme, verdeckt liegende Antriebe, integrierte Lüftung oder sensorbasierte Steuerungen: intelligente Lösungen für natürliche Belüftung, kontrolliertes Raumklima und barrierefreies Öffnen.' },
      ],
      advantages: ['GEG-konform mit exzellenten Uw-Werten', 'Einbruchschutz nach RC2 / RC3', 'Schmale Ansichtsbreiten, große Glasflächen', 'Verdeckt liegende Beschläge und Antriebe', 'Sondermaße und Denkmalschutz'],
    },
    en: {
      features: [
        { no: '01', title: 'Planning certainty from day one', text: 'We support you from the planning phase onwards. Detailed CAD drawings, technical data sheets and a well-conceived system kit create maximum transparency and efficiency in project execution.' },
        { no: '02', title: 'High quality – own production', text: 'All windows are manufactured in our plant in Salzkotten. This guarantees short distances, high vertical integration and absolute precision – even for complex requirements or custom solutions.' },
        { no: '03', title: 'Energy-efficient and eligible for funding', text: 'Our aluminium windows comply with the German GEG (formerly EnEV) and achieve excellent Uw values – actively contributing to the energy efficiency of the whole building and supporting funding and ESG requirements.' },
        { no: '04', title: 'Design freedom – without technical compromise', text: 'Slim face widths, large glass areas or concealed fittings: our systems offer maximum design freedom and adapt flexibly to architectural concepts – including listed buildings and special dimensions.' },
        { no: '05', title: 'Certified burglary protection', text: 'On request, our aluminium windows are equipped with tested security components to RC2 or RC3 – ideal for buildings with increased protection needs such as schools, offices, medical practices or housing.' },
        { no: '06', title: 'Comfort solutions for modern buildings', text: 'Automated opening systems, concealed drives, integrated ventilation or sensor-based controls: intelligent solutions for natural ventilation, controlled indoor climate and barrier-free opening.' },
      ],
      advantages: ['GEG-compliant with excellent Uw values', 'Burglary protection to RC2 / RC3', 'Slim face widths, large glass areas', 'Concealed fittings and drives', 'Special dimensions and listed buildings'],
    },
  },
};

PAGES.objekttueren = {
  de: {
    features: [
      { no: '01', title: 'Planung & Beratung', text: 'Mit jahrzehntelanger Erfahrung im Aluminium-Bau kennen wir die besonderen Anforderungen an Objekttüren in unterschiedlichsten Projekten. Dieses Know-how fließt von Beginn an in unsere Beratung ein – technisch fundiert und gestalterisch präzise, in enger Zusammenarbeit mit Architekten, Planern und Bauherren.' },
      { no: '02', title: 'Typische Einsatzbereiche', text: 'Büro- und Verwaltungsgebäude, Schulen, Kindergärten und Universitäten, Krankenhäuser und Pflegeeinrichtungen, Wohnungsbau und Mehrfamilienhäuser, öffentliche Gebäude und Einrichtungen sowie Produktionszentren.' },
      { no: '03', title: 'Leistungen im Detail', text: 'Individuelle Türlösungen aus Aluminium, Türen mit Brand- und Rauchschutzfunktion, Fluchttüren, einbruchhemmende Türsysteme, barrierefreie und komfortable Zugänge, Kombination mit Glas- und Fassadenelementen – Planung, Fertigung und Montage aus einer Hand.' },
      { no: '04', title: 'Sicherheit & Einbruchschutz', text: 'Objekttüren sind oft stark frequentiert und zugleich sicherheitsrelevant. RÜSO setzt auf geprüfte Systeme, die Einbruchsversuchen standhalten. Je nach Bedarf werden unterschiedliche Sicherheitsklassen realisiert – von der einfachen Zutrittskontrolle bis zu hochsicheren Türsystemen.' },
      { no: '05', title: 'Komfort & Funktion', text: 'Automatische Türantriebe, barrierefreie Schwellenlösungen und eine reibungslose Integration in Gebäudesteuerungen sorgen dafür, dass die Türen nicht nur funktional, sondern auch nutzerfreundlich sind.' },
      { no: '06', title: 'Produktion in Ostwestfalen', text: 'Durch die eigene Produktion in Salzkotten sichern wir eine gleichbleibend hohe Qualität und zuverlässige Umsetzung – kurze Wege zwischen Planung, Fertigung und Montage.' },
    ],
    advantages: ['Hohe Stabilität und Langlebigkeit – auch bei starker Frequentierung', 'Widerstandsfähig gegen Witterung und Korrosion', 'Flexible Gestaltungsmöglichkeiten in Form, Farbe und Verglasung', 'Optimal kombinierbar mit Fassaden- und Fenstersystemen', 'Erhöhte Sicherheit durch geprüfte Brand-, Rauch- und Einbruchschutzlösungen', 'Pflegeleicht und wartungsarm für den langfristigen Einsatz', 'Nachhaltig dank recyclingfähigem Werkstoff Aluminium'],
  },
  en: {
    features: [
      { no: '01', title: 'Planning & consulting', text: 'With decades of experience in aluminium construction, we know the specific requirements for entrance doors in a wide range of projects. This know-how informs our consulting from day one – technically sound and precise in design, in close cooperation with architects, planners and clients.' },
      { no: '02', title: 'Typical applications', text: 'Office and administrative buildings, schools, kindergartens and universities, hospitals and care facilities, housing and apartment buildings, public buildings and institutions as well as production centres.' },
      { no: '03', title: 'Services in detail', text: 'Custom aluminium door solutions, doors with fire and smoke protection function, escape doors, burglar-resistant door systems, barrier-free and convenient access, combination with glass and facade elements – planning, production and installation from a single source.' },
      { no: '04', title: 'Security & burglary protection', text: 'Entrance doors are often heavily used and security-relevant at the same time. RÜSO relies on tested systems that withstand break-in attempts. Depending on requirements, different security classes can be realised – from simple access control to high-security door systems.' },
      { no: '05', title: 'Comfort & function', text: 'Automatic door drives, barrier-free threshold solutions and smooth integration into building control systems ensure that the doors are not only functional but also user-friendly.' },
      { no: '06', title: 'Production in East Westphalia', text: 'Our own production in Salzkotten ensures consistently high quality and reliable execution – short distances between planning, production and installation.' },
    ],
    advantages: ['High stability and durability – even with heavy use', 'Resistant to weather and corrosion', 'Flexible design options in shape, colour and glazing', 'Ideally combinable with facade and window systems', 'Increased safety through tested fire, smoke and burglary protection', 'Easy-care and low-maintenance for long-term use', 'Sustainable thanks to recyclable aluminium'],
  },
};
PAGES.brandschutz = {
  de: {
    features: [
      { no: '01', title: 'Feuerwiderstandsklassen verständlich erklärt', text: 'Die Klassen werden nach DIN 4102 (europaweit DIN EN 13501-2) geregelt und geben an, wie lange ein Bauteil dem Feuer standhält. Brandschutztüren: T30 = 30 Minuten feuerhemmend, T60 = 60 Minuten hoch feuerhemmend, T90 = 90 Minuten feuerbeständig. Brandschutzverglasungen tragen die Kennung F, also F30 = 30 Minuten und F90 = 90 Minuten Schutz.' },
      { no: '02', title: 'Unser Leistungsspektrum', text: 'Wir fertigen und montieren Rauchschutztüren sowie Brandschutztüren für Innenanwendungen mit 30 und 90 Minuten Feuerwiderstand (T30 und T90) und Brandschutzverglasungen für Innenanwendungen mit 30 und 90 Minuten Feuerwiderstand (F30 und F90).' },
      { no: '03', title: 'Sicherheit und Vertrauen', text: 'Brandschutzelemente sorgen im Ernstfall dafür, dass Feuer und Rauch sich nicht unkontrolliert ausbreiten. So bleiben Flucht- und Rettungswege frei und alle Personen können das Gebäude sicher verlassen. Türen übernehmen dabei eine zentrale Rolle.' },
      { no: '04', title: 'Komfort & Funktion', text: 'Automatische Türantriebe, barrierefreie Schwellenlösungen und eine reibungslose Integration in Gebäudesteuerungen sorgen dafür, dass die Türen nicht nur funktional, sondern auch nutzerfreundlich sind.' },
      { no: '05', title: 'Kombinierbar mit weiteren Funktionen', text: 'Unsere Aluminium-Systeme lassen sich mit Schallschutz oder Einbruchhemmung kombinieren und fügen sich harmonisch in die Architektur ein – Sicherheit und Gestaltung in einem Element.' },
      { no: '06', title: 'Geprüfte Qualität aus einer Hand', text: 'Ob Brandschutz oder Rauchschutz – wir liefern geprüfte Qualität, präzise Fertigung und zuverlässige Montage. Als Partner von Architekten und öffentlichen Auftraggebern bieten wir Lösungen, die individuell geplant, technisch ausgereift und langlebig sind.' },
    ],
    advantages: ['Zertifizierte Sicherheit nach gültigen Normen und Vorschriften', 'Effektiver Feuer- und Rauchschutz für sichere Flucht- und Rettungswege', 'Hohe Stabilität und Langlebigkeit auch bei starker Beanspruchung', 'Gestalterische Vielfalt durch flexible Aluminium-Systeme', 'Kombinierbar mit Schallschutz oder Einbruchhemmung', 'Pflegeleicht und nachhaltig dank des Werkstoffs Aluminium'],
  },
  en: {
    features: [
      { no: '01', title: 'Fire resistance classes explained', text: 'The classes are regulated by DIN 4102 (Europe-wide DIN EN 13501-2) and state how long a component withstands fire. Fire doors: T30 = 30 minutes fire-retardant, T60 = 60 minutes highly fire-retardant, T90 = 90 minutes fire-resistant. Fire-protection glazing carries the letter F, i.e. F30 = 30 minutes and F90 = 90 minutes of protection.' },
      { no: '02', title: 'Our range of services', text: 'We manufacture and install smoke-protection doors and fire doors for interior use with 30 and 90 minutes of fire resistance (T30 and T90), as well as fire-protection glazing for interior use with 30 and 90 minutes of fire resistance (F30 and F90).' },
      { no: '03', title: 'Safety and trust', text: 'In an emergency, fire-protection elements ensure that fire and smoke do not spread uncontrollably. Escape and rescue routes remain clear and everyone can leave the building safely. Doors play a central role in this.' },
      { no: '04', title: 'Comfort & function', text: 'Automatic door drives, barrier-free threshold solutions and smooth integration into building control systems ensure that the doors are not only functional but also user-friendly.' },
      { no: '05', title: 'Combinable with further functions', text: 'Our aluminium systems can be combined with acoustic insulation or burglar resistance and blend harmoniously into the architecture – safety and design in a single element.' },
      { no: '06', title: 'Tested quality from a single source', text: 'Fire or smoke protection – we deliver tested quality, precise production and reliable installation. As a partner to architects and public clients, we offer solutions that are individually planned, technically mature and durable.' },
    ],
    advantages: ['Certified safety to applicable standards and regulations', 'Effective fire and smoke protection for safe escape routes', 'High stability and durability even under heavy use', 'Design variety through flexible aluminium systems', 'Combinable with acoustic insulation or burglar resistance', 'Easy-care and sustainable thanks to aluminium'],
  },
};
PAGES.schiebetueren = {
  de: {
    features: [
      { no: '01', title: 'Planung & Beratung', text: 'Wir stimmen jede Schiebetür-Lösung individuell mit Architekten, Planern und Bauherren ab und entwickeln Konzepte, die technisch durchdacht und gestalterisch überzeugend sind.' },
      { no: '02', title: 'Individuelle Konstruktionen', text: 'Unsere Aluminium-Schiebetüren werden nach Maß gefertigt und bieten flexible Gestaltungsmöglichkeiten für unterschiedlichste Gebäudetypologien – von Wohnkomplexen bis hin zu öffentlichen Einrichtungen.' },
      { no: '03', title: 'Energieeffizienz & Nachhaltigkeit', text: 'Dank moderner Dämmtechnologien und hochwertiger Materialien erfüllen unsere Systeme aktuelle Anforderungen an Wärmeschutz und Nachhaltigkeit.' },
      { no: '04', title: 'Produktion in Ostwestfalen', text: 'Die Fertigung erfolgt vollständig in unserem eigenen Werk in Ostwestfalen. So stellen wir gleichbleibend hohe Qualität, kurze Lieferwege und eine enge Verzahnung von Planung und Produktion sicher.' },
      { no: '05', title: 'Montage & Projektabwicklung', text: 'Unser geschultes Montageteam sorgt für eine präzise und termingerechte Umsetzung – von der ersten Abstimmung bis zur finalen Abnahme.' },
      { no: '06', title: 'Sanierung & Modernisierung', text: 'Wir integrieren neue Schiebetürsysteme auch in Bestandsgebäude, um Komfort, Barrierefreiheit und energetische Standards zu verbessern.' },
    ],
    advantages: ['Große Glasflächen für maximale Transparenz', 'Barrierefreie Übergänge und hoher Bedienkomfort', 'Langlebige, stabile und witterungsbeständige Systeme', 'Flexible Design- und Farbgestaltung', 'Energieeffizient und nachhaltig'],
  },
  en: {
    features: [
      { no: '01', title: 'Planning & consulting', text: 'We coordinate every sliding-door solution individually with architects, planners and clients and develop concepts that are technically well thought out and convincing in design.' },
      { no: '02', title: 'Custom constructions', text: 'Our aluminium sliding doors are made to measure and offer flexible design options for a wide variety of building types – from residential complexes to public institutions.' },
      { no: '03', title: 'Energy efficiency & sustainability', text: 'Thanks to modern insulation technology and high-quality materials, our systems meet current requirements for thermal insulation and sustainability.' },
      { no: '04', title: 'Production in East Westphalia', text: 'Production takes place entirely in our own plant in East Westphalia – ensuring consistently high quality, short delivery routes and close integration of planning and production.' },
      { no: '05', title: 'Installation & project management', text: 'Our trained installation team ensures precise, on-schedule execution – from the first coordination to final acceptance.' },
      { no: '06', title: 'Refurbishment & modernisation', text: 'We also integrate new sliding-door systems into existing buildings to improve comfort, accessibility and energy standards.' },
    ],
    advantages: ['Large glass areas for maximum transparency', 'Barrier-free transitions and high operating comfort', 'Durable, stable and weather-resistant systems', 'Flexible design and colour options', 'Energy-efficient and sustainable'],
  },
};
PAGES.schiebewaende = {
  de: {
    features: [
      { no: '01', title: 'Individuelle Schiebewände nach Maß', text: 'Die moderne Glastechnik ermöglicht es, komplette Wandflächen aus Glas zu gestalten. Im geschlossenen Zustand entstehen abgegrenzte und trotzdem transparente Räume. Ist die Schiebewand geöffnet, fallen die flach an der Seite zusammengeschobenen Glaselemente kaum auf.' },
      { no: '02', title: 'Vielfältige Einsatzmöglichkeiten', text: 'Schiebewände können als Bürotrennwand, im Ladenbau oder als Raumabtrennung in Hotels oder Ausstellungsräumen verwendet werden. Dank der hervorragenden Laufeigenschaften ist die Bedienung einfach und komfortabel.' },
      { no: '03', title: 'Türlösungen & Festverglasungen', text: 'Soll die Schiebewand nicht vollständig geöffnet werden, können unterschiedliche Türlösungen integriert werden. Auch Kombinationen mit Festverglasungen sind machbar.' },
      { no: '04', title: 'Funktion & Design', text: 'Kombination von Transparenz, Schallschutz und Stabilität – Glaswände und -schiebetüren, abgestimmt auf Raumkonzept und Anforderungen.' },
      { no: '05', title: 'Produktion in Ostwestfalen', text: 'Fertigung und Montage ausschließlich mit Aluminium-Systemen – präzise Handwerksarbeit und modernste Technik aus der Region.' },
      { no: '06', title: 'Vertrauen durch Erfahrung', text: 'Als Spezialist für Aluminium- und Glaskonstruktionen verbindet die RÜSO GmbH technisches Know-how mit gestalterischem Anspruch. So entstehen Lösungen, die nicht nur funktional, sondern auch architektonisch überzeugend sind.' },
    ],
    advantages: ['Lichtdurchflutete Räume mit offener Atmosphäre', 'Flexible Raumgestaltung bei maximaler Transparenz', 'Elegantes Design für moderne Architektur', 'Langlebige Materialien mit hoher Widerstandsfähigkeit', 'Optionaler Schallschutz für konzentriertes Arbeiten'],
  },
  en: {
    features: [
      { no: '01', title: 'Custom sliding walls made to measure', text: 'Modern glass technology makes it possible to design entire wall surfaces in glass. When closed, separate yet transparent rooms are created. When the sliding wall is open, the glass elements pushed flat to the side are barely noticeable.' },
      { no: '02', title: 'Versatile applications', text: 'Sliding walls can be used as office partitions, in shopfitting or as room dividers in hotels or exhibition spaces. Thanks to the excellent running properties, operation is simple and comfortable.' },
      { no: '03', title: 'Door solutions & fixed glazing', text: 'If the sliding wall is not to be opened completely, various door solutions can be integrated. Combinations with fixed glazing are also possible.' },
      { no: '04', title: 'Function & design', text: 'A combination of transparency, acoustic insulation and stability – glass walls and sliding doors tailored to the room concept and requirements.' },
      { no: '05', title: 'Production in East Westphalia', text: 'Production and installation exclusively with aluminium systems – precise craftsmanship and state-of-the-art technology from the region.' },
      { no: '06', title: 'Trust through experience', text: 'As a specialist in aluminium and glass constructions, RÜSO GmbH combines technical know-how with design ambition – creating solutions that are not only functional but also architecturally convincing.' },
    ],
    advantages: ['Light-flooded rooms with an open atmosphere', 'Flexible room design with maximum transparency', 'Elegant design for modern architecture', 'Durable materials with high resistance', 'Optional acoustic insulation for focused work'],
  },
};

export function getPage(key, lang) {
  const p = PAGES[key];
  const L = p ? p[lang === 'en' ? 'en' : 'de'] : { features: [], advantages: [] };
  return { ...L, advantages: L.advantages.map((t, i) => ({ no: String(i + 1).padStart(2, '0'), text: t })) };
}

export function getContent(lang) {
  const L = lang === 'en' ? EN : DE;
  const tags = TAGS[lang === 'en' ? 'en' : 'de'];
  const refs = REFS.map(r => ({ ...r, tagLabels: r.tags.map(t => tags[t]).join(' · '), tagList: r.tags.map(t => ({ label: tags[t] })) }));
  return { ...L, refs, refsHome: refs.filter(r => ['ponitz', 'hausf', 'klima', 'bobberts', 'schule', 'marsberg', 'bmw', 'albert'].includes(r.key)), partners: PARTNERS };
}
