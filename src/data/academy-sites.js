// Static data for Surlink Academy section
// Contains curated educational institutions, universities, and training centers

const academySites = {
  universidades: [
    {
      id: 'udelar',
      name: 'Universidad de la República',
      url: 'https://udelar.edu.uy',
      domain: 'udelar.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=udelar.edu.uy&sz=128',
      description: 'Principal universidad pública del país. Coordina enseñanza, investigación y extensión a nivel nacional. Educación gratuita y de excelencia en todas las áreas del conocimiento.',
      phone: '+598 2408 2566 / 2400 1918',
      address: 'Av. 18 de Julio 1824, Montevideo',
      category: 'universidades',
      featured: true
    },
    {
      id: 'ort',
      name: 'Universidad ORT Uruguay',
      url: 'https://www.ort.edu.uy',
      domain: 'ort.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=ort.edu.uy&sz=128',
      description: 'Universidad privada con enfoque en tecnología, negocios e innovación. Programas de grado y posgrado con reconocimiento internacional.',
      phone: '+598 2902 1505',
      address: 'Cuareim 1451, Montevideo',
      category: 'universidades',
      featured: true
    },
    {
      id: 'ucu',
      name: 'Universidad Católica del Uruguay',
      url: 'https://ucu.edu.uy',
      domain: 'ucu.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=ucu.edu.uy&sz=128',
      description: 'Institución privada con tradición académica centenaria. Carreras en humanidades, derecho, ingeniería, psicología y más.',
      phone: '+598 2487 2717',
      address: 'Av. 8 de Octubre 2738, Montevideo',
      category: 'universidades',
      featured: true
    },
    {
      id: 'um',
      name: 'Universidad de Montevideo',
      url: 'https://um.edu.uy',
      domain: 'um.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=um.edu.uy&sz=128',
      description: 'Universidad privada enfocada en formación integral con programas de negocios, derecho, ingeniería y comunicación.',
      phone: '+598 2707 2771',
      address: 'Prudencio de Pena 2440, Montevideo',
      category: 'universidades',
      featured: false
    },
    {
      id: 'ucudal',
      name: 'Universidad de la Empresa (UDE)',
      url: 'https://www.ude.edu.uy',
      domain: 'ude.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=ude.edu.uy&sz=128',
      description: 'Universidad especializada en negocios, emprendimiento y gestión empresarial con modalidades flexibles.',
      phone: '+598 2623 0707',
      address: 'Soriano 959, Montevideo',
      category: 'universidades',
      featured: false
    },
    {
      id: 'utec',
      name: 'Universidad Tecnológica (UTEC)',
      url: 'https://utec.edu.uy',
      domain: 'utec.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=utec.edu.uy&sz=128',
      description: 'Universidad pública gratuita de perfil tecnológico, orientada a investigación e innovación con sedes en el interior del país.',
      phone: '+598 2603 8832',
      address: 'Av. Italia 6201, Edificio Los Robles (LATU), Montevideo',
      category: 'universidades',
      featured: false
    },
    {
      id: 'claeh',
      name: 'Universidad CLAEH',
      url: 'https://universidad.claeh.edu.uy',
      domain: 'claeh.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=claeh.edu.uy&sz=128',
      description: 'Centro Latinoamericano de Economía Humana. Universidad privada fundada en 1957 con facultades de Medicina, Derecho, Cultura, Educación, Psicología y Gestión de Salud. Programas de grado, posgrado y educación continua.',
      phone: '+598 2900 7194',
      address: 'Zelmar Michelini 1220, Montevideo',
      category: 'universidades',
      featured: true
    },
    {
      id: 'unifa',
      name: 'Universidad Francisco de Asís (UNIFA)',
      url: 'https://unifa.edu.uy',
      domain: 'unifa.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=unifa.edu.uy&sz=128',
      description: 'Universidad privada con sede en Maldonado. Oferta académica en expansión orientada al desarrollo regional.',
      phone: 'Ver sitio web',
      address: 'Maldonado',
      category: 'universidades',
      featured: false
    },
    {
      id: 'iuacj',
      name: 'Instituto Universitario ACJ',
      url: 'https://www.iuacj.edu.uy',
      domain: 'iuacj.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=iuacj.edu.uy&sz=128',
      description: 'Instituto universitario de la Asociación Cristiana de Jóvenes. Formación en deporte, gestión y áreas afines.',
      phone: '+598 2408 9922 / +598 94 059 045',
      address: 'Colonia 1870 piso 6, Montevideo',
      category: 'universidades',
      featured: false
    },
    {
      id: 'iusur',
      name: 'Instituto Universitario Sudamericano (IUSUR)',
      url: 'https://iusur.edu.uy',
      domain: 'iusur.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=iusur.edu.uy&sz=128',
      description: 'Instituto universitario reconocido con carreras en áreas de gestión, tecnología y salud.',
      phone: '+598 2401 0888',
      address: 'Colonia 1616 piso 4, Montevideo',
      category: 'universidades',
      featured: false
    },
    {
      id: 'cediiap',
      name: 'Instituto Universitario CEDIIAP',
      url: 'https://www.cediiap.edu.uy',
      domain: 'cediiap.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=cediiap.edu.uy&sz=128',
      description: 'Centro de Docencia, Investigación e Información en Aprendizaje, fundado en 1995. Ofrece Licenciaturas en Psicomotricidad, Psicopedagogía y especializaciones en dificultades de aprendizaje.',
      phone: 'Ver sitio web',
      address: 'Juan Carlos Dighiero 2464, Montevideo',
      category: 'universidades',
      featured: false
    },
    {
      id: 'upe',
      name: 'Instituto Universitario Punta del Este (UPE)',
      url: 'https://www.upe.edu.uy',
      domain: 'upe.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=upe.edu.uy&sz=128',
      description: 'Instituto Politécnico con sedes en varios departamentos del interior (Maldonado, Durazno, Treinta y Tres, Melo, Rivera). Ofrece carreras técnicas y terciarias orientadas al desarrollo regional.',
      phone: '+598 42 48 26 48',
      address: 'Br. Artigas y E. Sader, Maldonado',
      category: 'universidades',
      featured: false
    }
  ],
  institutos: [
    {
      id: 'bios',
      name: 'Instituto BIOS',
      url: 'https://www.biosportal.com',
      domain: 'biosportal.com',
      logo: 'https://www.google.com/s2/favicons?domain=biosportal.com&sz=128',
      description: 'Instituto con escuelas de Sistemas, Negocios, Diseño y otras. Carreras técnicas, cursos y programas ejecutivos. Formación práctica en management, tecnología y liderazgo.',
      phone: '+598 2710 0157 / WhatsApp 093 639 326',
      address: 'Bvar. España 2472, Montevideo',
      category: 'institutos',
      featured: true
    },
    {
      id: 'centro-diseno',
      name: 'Centro de Diseño - UDELAR',
      url: 'https://www.centrodediseno.edu.uy',
      domain: 'centrodediseno.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=centrodediseno.edu.uy&sz=128',
      description: 'Formación universitaria en diseño gráfico, industrial y textil con enfoque en creatividad e innovación.',
      phone: '+598 2408 8976',
      address: 'Av. 18 de Julio 1824, Montevideo',
      category: 'institutos',
      featured: false
    },
    {
      id: 'utuprofesional',
      name: 'UTU - Educación Técnico Profesional (ANEP)',
      url: 'https://www.utu.edu.uy',
      domain: 'utu.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=utu.edu.uy&sz=128',
      description: 'Dirección General de Educación Técnico Profesional. Oferta técnica y tecnológica de nivel medio y terciario en todo el país. Formación profesional básica y superior en oficios, tecnología, gastronomía y más.',
      phone: '+598 2410 7971 / 0800 8155',
      address: 'San Salvador 1674, Montevideo',
      category: 'institutos',
      featured: true
    },
    {
      id: 'esden',
      name: 'ESDEN - Escuela de Negocios',
      url: 'https://www.esden.uy',
      domain: 'esden.uy',
      logo: 'https://www.google.com/s2/favicons?domain=esden.uy&sz=128',
      description: 'Institución especializada en formación empresarial y emprendimiento con programas ejecutivos y diplomados.',
      phone: '+598 2916 8600',
      address: 'Mercedes 1617, Montevideo',
      category: 'institutos',
      featured: false
    },
    {
      id: 'ipa',
      name: 'Instituto de Profesores Artigas',
      url: 'https://www.ipa.edu.uy',
      domain: 'ipa.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=ipa.edu.uy&sz=128',
      description: 'Formación de profesores de educación secundaria en todas las disciplinas. Institución pública referente en docencia.',
      phone: '+598 2203 5755',
      address: 'Av. Gral Rondeau 1509, Montevideo',
      category: 'institutos',
      featured: false
    },
    {
      id: 'cfe',
      name: 'Consejo de Formación en Educación (CFE - ANEP)',
      url: 'https://www.cfe.edu.uy',
      domain: 'cfe.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=cfe.edu.uy&sz=128',
      description: 'Organismo de ANEP encargado de la formación de maestros y profesores en Uruguay. Coordina IPA (Instituto de Profesores Artigas), INET (Instituto Normal de Enseñanza Técnica), IPES, IFD y 6 CeRP (Centros Regionales de Profesores) en todo el país.',
      phone: '+598 2900 5876',
      address: 'Río Negro 1039, Montevideo',
      category: 'institutos',
      featured: true
    },
    {
      id: 'inefop',
      name: 'INEFOP - Instituto Nacional de Empleo y Formación Profesional',
      url: 'https://www.inefop.uy',
      domain: 'inefop.uy',
      logo: 'https://www.google.com/s2/favicons?domain=inefop.uy&sz=128',
      description: 'Organismo público que brinda capacitación gratuita a personas y empresas para mejorar la empleabilidad. Cursos y certificaciones en diversas áreas laborales.',
      phone: '+598 091 730 967',
      address: 'Misiones 1352 esq. Sarandí, Montevideo',
      category: 'institutos',
      featured: true
    },
    {
      id: 'kolping',
      name: 'Instituto Kolping Uruguay',
      url: 'https://www.kolping.org.uy',
      domain: 'kolping.org.uy',
      logo: 'https://www.google.com/s2/favicons?domain=kolping.org.uy&sz=128',
      description: 'Centro de capacitación en hotelería, gastronomía, turismo y empresa. Integra la red internacional Kolping con formación profesional de calidad.',
      phone: '+598 2486 0060 (opción 2)',
      address: 'Bvar. Artigas 2714, Montevideo',
      category: 'institutos',
      featured: false
    },
    {
      id: 'declamacion',
      name: 'Escuela Nacional de Declamación',
      url: 'https://www.declamacion.edu.uy',
      domain: 'declamacion.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=declamacion.edu.uy&sz=128',
      description: 'Escuela de arte público que ofrece formación en declamación, oratoria, locución, periodismo, dicción, teatro y guitarra.',
      phone: '+598 2401 7533',
      address: 'José E. Rodó 1712, Montevideo',
      category: 'institutos',
      featured: false
    },
    {
      id: 'almamater',
      name: 'Escuelas de Capacitación Técnica Alma Mater',
      url: 'Ver sitio web',
      domain: '',
      logo: 'https://www.google.com/s2/favicons?domain=google.com&sz=128',
      description: 'Instituto técnico privado de capacitación profesional con formación en diversas áreas técnicas.',
      phone: '+598 2900 4765',
      address: 'Carlos Quijano 1290, Montevideo',
      category: 'institutos',
      featured: false
    },
    {
      id: 'idecas',
      name: 'Escuela de Enfermería IDECAS',
      url: 'https://www.idecas.edu.uy',
      domain: 'idecas.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=idecas.edu.uy&sz=128',
      description: 'Instituto de salud privado con capacitación técnica en enfermería, habilitada por M.S.P. y registrada en el M.E.C.',
      phone: '+598 2401 1446',
      address: 'Av. 8 de Octubre 2295 A, Montevideo',
      category: 'institutos',
      featured: false
    },
    {
      id: 'escuelamapa',
      name: 'Escuela Ma-Pa',
      url: 'https://www.escuelamapa.edu.uy',
      domain: 'escuelamapa.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=escuelamapa.edu.uy&sz=128',
      description: 'Instituto técnico privado de formación profesional. Fundada en 1971, ofrece más de 120 carreras cortas y oficios en diversas áreas técnicas.',
      phone: '+598 2409 1515',
      address: 'Colonia 2268, Montevideo',
      category: 'institutos',
      featured: false
    },
    {
      id: 'euci',
      name: 'Escuela E.U.C.I.',
      url: 'Ver sitio web',
      domain: '',
      logo: 'https://www.google.com/s2/favicons?domain=google.com&sz=128',
      description: 'Instituto técnico privado de capacitación profesional.',
      phone: '+598 2481 1117 / 2481 1517',
      address: 'Av. 8 de Octubre 3332, Montevideo',
      category: 'institutos',
      featured: false
    },
    {
      id: 'hoteleriagastronomica',
      name: 'Escuela Superior de Gastronomía, Hotelería y Turismo',
      url: 'https://hoteleriaenlinea.wixsite.com/eshgt',
      domain: 'hoteleriaenlinea.wixsite.com',
      logo: 'https://www.google.com/s2/favicons?domain=hoteleriaenlinea.wixsite.com&sz=128',
      description: 'Institución de DGETP-UTU especializada en hotelería, gastronomía y turismo. Ofrece cursos auxiliares, técnicos y terciarios con alojamiento para estudiantes del interior.',
      phone: '+598 2902 9056',
      address: 'Florida 1475, Montevideo',
      category: 'institutos',
      featured: false
    },
    {
      id: 'altagastronomia',
      name: 'Instituto de Alta Gastronomía Beatriz Marino',
      url: 'http://www.bmarino.com.uy',
      domain: 'bmarino.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=bmarino.com.uy&sz=128',
      description: 'Instituto técnico privado especializado en formación culinaria y alta gastronomía. Cursos profesionales y recreativos dirigidos por Beatriz Marino.',
      phone: '+598 2400 9596',
      address: 'Guayabo 1923, Montevideo',
      category: 'institutos',
      featured: false
    }
  ],
  idiomas: [
    {
      id: 'alianzafrancesa',
      name: 'Alianza Francesa de Montevideo',
      url: 'https://www.alianzafrancesa.edu.uy',
      domain: 'alianzafrancesa.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=alianzafrancesa.edu.uy&sz=128',
      description: 'Red oficial francesa con cursos de francés para todos los niveles, exámenes DELF/DALF y actividades culturales. Instituto cultural con reconocimiento internacional.',
      phone: '+598 2400 0505',
      address: 'Bulevar Artigas 1271, Montevideo',
      category: 'idiomas',
      featured: true
    },
    {
      id: 'anglo',
      name: 'Instituto Cultural Anglo-Uruguayo (The Anglo)',
      url: 'https://www.anglo.edu.uy',
      domain: 'anglo.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=anglo.edu.uy&sz=128',
      description: 'Red educativa con 40+ centros de inglés. Exámenes internacionales IELTS, Cambridge. Enseñanza con metodología comunicativa y programas para todas las edades.',
      phone: '+598 2902 3773',
      address: 'Manuel Flores Mora 1426, Montevideo',
      category: 'idiomas',
      featured: true
    },
    {
      id: 'dickens',
      name: 'Dickens Instituto de Inglés',
      url: 'https://www.dickens.edu.uy',
      domain: 'dickens.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=dickens.edu.uy&sz=128',
      description: 'Instituto especializado en inglés británico con cursos regulares, intensivos y preparación para certificaciones.',
      phone: '+598 2709 0829',
      address: '26 de Marzo 1382, Montevideo',
      category: 'idiomas',
      featured: false
    },
    {
      id: 'berlitz',
      name: 'Berlitz Uruguay',
      url: 'https://www.berlitz.com/es-uy',
      domain: 'berlitz.com',
      logo: 'https://www.google.com/s2/favicons?domain=berlitz.com&sz=128',
      description: 'Red internacional de idiomas con método Berlitz. Inglés, portugués, alemán, italiano y más idiomas.',
      phone: '+598 2916 7474',
      address: 'Plaza Independencia 831, Montevideo',
      category: 'idiomas',
      featured: false
    },
    {
      id: 'goethe',
      name: 'Goethe-Institut Uruguay',
      url: 'https://www.goethe.de/ins/uy/es/index.html',
      domain: 'goethe.de',
      logo: 'https://www.google.com/s2/favicons?domain=goethe.de&sz=128',
      description: 'Instituto cultural oficial de Alemania. Cursos de alemán, exámenes oficiales y programación cultural. Centro de referencia para el idioma y cultura alemana.',
      phone: '+598 2908 0234 / 2900 7515',
      address: 'Santiago de Chile 874, Montevideo',
      category: 'idiomas',
      featured: false
    },
    {
      id: 'alianzausa',
      name: 'Alianza Cultural Uruguay-Estados Unidos',
      url: 'https://www.alianza.edu.uy',
      domain: 'alianza.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=alianza.edu.uy&sz=128',
      description: 'Centro binacional con cursos de inglés y testing center. Certificaciones internacionales TOEFL, TOEIC y otros exámenes reconocidos.',
      phone: '+598 2902 5160',
      address: 'Paraguay 1217, Montevideo',
      category: 'idiomas',
      featured: true
    },
    {
      id: 'istitutoitaliano',
      name: 'Istituto Italiano di Cultura - Montevideo',
      url: 'https://iicmontevideo.esteri.it',
      domain: 'iicmontevideo.esteri.it',
      logo: 'https://www.google.com/s2/favicons?domain=esteri.it&sz=128',
      description: 'Oficina cultural de la Embajada de Italia. Cursos de italiano para todos los niveles y agenda cultural con eventos, cine y exposiciones.',
      phone: '+598 2900 3354',
      address: 'Paraguay 1177, Montevideo',
      category: 'idiomas',
      featured: false
    },
    {
      id: 'icub',
      name: 'ICUB - Instituto de Cultura Uruguayo-Brasileño',
      url: 'https://www.icub.edu.uy',
      domain: 'icub.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=icub.edu.uy&sz=128',
      description: 'Principal instituto de portugués del país. Cursos online y presenciales, exámenes oficiales Celpe-Bras y certificaciones reconocidas internacionalmente.',
      phone: '+598 2901 1818',
      address: '18 de Julio 994, piso 6, Montevideo',
      category: 'idiomas',
      featured: true
    },
    {
      id: 'confucio',
      name: 'Instituto Confucio - Udelar',
      url: 'https://udelar.edu.uy/confucio',
      domain: 'udelar.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=udelar.edu.uy&sz=128',
      description: 'Centro de enseñanza de chino mandarín y difusión de la cultura china en Uruguay. Cursos de idioma, exámenes HSK y actividades culturales.',
      phone: '+598 2483 4919 / 2483 4852',
      address: 'Av. Dr. Manuel Albo 2663 esq. Av. Italia, Montevideo',
      category: 'idiomas',
      featured: false
    },
    {
      id: 'ihmontevideo',
      name: 'International House Montevideo',
      url: 'https://www.ihuruguay.com.uy',
      domain: 'ihuruguay.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=ihuruguay.com.uy&sz=128',
      description: 'Más de ocho idiomas disponibles. Cursos para todas las edades en modalidad presencial, online o in-company. Miembro de la red International House World Organization presente en más de 52 países. Activo desde 1977.',
      phone: '+598 2709 6774 / +598 96 402 879',
      address: 'Av. Brasil 2831, Pocitos, Montevideo',
      category: 'idiomas',
      featured: true
    },
    {
      id: 'academiamontevideo',
      name: 'Academia Montevideo',
      url: 'https://www.academiamontevideo.com',
      domain: 'academiamontevideo.com',
      logo: 'https://www.google.com/s2/favicons?domain=academiamontevideo.com&sz=128',
      description: 'Parte del grupo Academia Uruguay-Spanish Courses. Instituto especializado en enseñanza de idiomas desde 2012. Ofrece cursos de portugués, alemán, francés, italiano e inglés, en modalidades grupal y personalizada, presencial y virtual.',
      phone: '+598 2915 2496',
      address: 'Juan Carlos Gómez 1459 esq. 25 de mayo, Montevideo',
      category: 'idiomas',
      featured: false
    },
    {
      id: 'centroidiomasort',
      name: 'Centro de Idiomas - Universidad ORT',
      url: 'https://www.ort.edu.uy/centro-de-idiomas',
      domain: 'ort.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=ort.edu.uy&sz=128',
      description: 'Centro de idiomas universitario con cursos de varios idiomas. Descuentos para estudiantes, graduados, docentes y funcionarios de la universidad. Convenios con institutos de enseñanza de lenguas extranjeras.',
      phone: '+598 2902 1505',
      address: 'Bvar. España 2633, Campus Pocitos, Montevideo',
      category: 'idiomas',
      featured: false
    },
    {
      id: 'centroidiomasucu',
      name: 'Centro de Idiomas - Universidad Católica',
      url: 'https://www.ucu.edu.uy/categoria/Idiomas-360',
      domain: 'ucu.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=ucu.edu.uy&sz=128',
      description: 'Ofrece formación en diversas lenguas como aporte a la valoración de la diversidad lingüística y cultural. Convenios con ICUB para portugués y Fundación María Tsakos para griego. Cursos de inglés, italiano, francés, japonés y alemán.',
      phone: '+598 2487 2717 int. 6790',
      address: 'Edificio Sacré Cœur, Av. 8 de Octubre 2738, Montevideo',
      category: 'idiomas',
      featured: false
    }
  ],
  tecnologia: [
    {
      id: 'jovenesaprogramar',
      name: 'Jóvenes a Programar',
      url: 'https://jovenesaprogramar.edu.uy',
      domain: 'jovenesaprogramar.edu.uy',
      logo: 'https://www.google.com/s2/favicons?domain=jovenesaprogramar.edu.uy&sz=128',
      description: 'Programa gratuito de formación en programación y testing para jóvenes. Becas completas y salida laboral garantizada.',
      phone: '+598 2901 4929',
      address: 'Misiones 1361, Montevideo',
      category: 'tecnologia',
      featured: true
    },
    {
      id: 'holberton',
      name: 'Holberton School Uruguay',
      url: 'https://www.holbertonschool.uy',
      domain: 'holbertonschool.uy',
      logo: 'https://www.google.com/s2/favicons?domain=holbertonschool.uy&sz=128',
      description: 'Bootcamp intensivo en software engineering con metodología project-based learning. Financiamiento flexible.',
      phone: '+598 2908 7272',
      address: 'Bvar. Artigas 1394, Montevideo',
      category: 'tecnologia',
      featured: true
    },
    {
      id: 'coderhouse',
      name: 'CoderHouse Uruguay',
      url: 'https://www.coderhouse.com.uy',
      domain: 'coderhouse.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=coderhouse.com.uy&sz=128',
      description: 'Cursos online y presenciales de programación, diseño, marketing digital y data science. Certificados reconocidos.',
      phone: '+598 2902 9300',
      address: 'Online y presencial',
      category: 'tecnologia',
      featured: true
    },
    {
      id: 'coding-dojo',
      name: 'Coding Dojo LATAM',
      url: 'https://www.codingdojo.la',
      domain: 'codingdojo.la',
      logo: 'https://www.google.com/s2/favicons?domain=codingdojo.la&sz=128',
      description: 'Bootcamp de programación full-stack en español. Aprende 3 stacks en 14 semanas con instructores en vivo.',
      phone: '+598 91 234 567',
      address: 'Modalidad online',
      category: 'tecnologia',
      featured: false
    },
    {
      id: 'hack-academy',
      name: 'Hack Academy',
      url: 'https://www.hackacademy.io',
      domain: 'hackacademy.io',
      logo: 'https://www.google.com/s2/favicons?domain=hackacademy.io&sz=128',
      description: 'Bootcamp de programación full-stack con foco en JavaScript, React, Node.js. Modalidad presencial e intensiva.',
      phone: '+598 2900 8888',
      address: 'Paraguay 2141, Montevideo',
      category: 'tecnologia',
      featured: false
    },
    {
      id: 'plataforma-cinco',
      name: 'Plataforma 5',
      url: 'https://www.plataforma5.la',
      domain: 'plataforma5.la',
      logo: 'https://www.google.com/s2/favicons?domain=plataforma5.la&sz=128',
      description: 'Coding bootcamp con programa full-stack JavaScript. Financiamiento con Income Share Agreement.',
      phone: '+598 92 345 678',
      address: 'Online',
      category: 'tecnologia',
      featured: false
    }
  ]
};

// Helper functions to retrieve sites
export const getSitesByCategory = (category) => {
  return academySites[category] || [];
};

export const getAllSites = () => {
  return Object.values(academySites).flat();
};

export const getSiteById = (id) => {
  const allSites = getAllSites();
  return allSites.find(site => site.id === id);
};

export default academySites;
