// Static data for Surlink Construccion section
// Contains curated construction, real estate projects, and auction sites

const construccionSites = {
  proyectos: [
    {
      id: 'stiler',
      name: 'Stiler',
      url: 'https://stiler.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=stiler.com.uy&sz=128',
      description: 'Desarrolladora inmobiliaria especializada en proyectos residenciales de alta calidad en Montevideo y zona metropolitana.',
      category: 'proyectos',
      featured: true
    },
    {
      id: 'theedge',
      name: 'The Edge',
      url: 'https://theedge.uy',
      logo: 'https://www.google.com/s2/favicons?domain=theedge.uy&sz=128',
      description: 'Proyectos residenciales de vanguardia con diseño contemporáneo y ubicaciones estratégicas en Uruguay.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'kaizengroup',
      name: 'Kaizen Group',
      url: 'https://kaizengroup.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=kaizengroup.com.uy&sz=128',
      description: 'Desarrolladora enfocada en proyectos inmobiliarios sustentables y de mejora continua en construcción.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'terramar',
      name: 'Terramar',
      url: 'https://terramar.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=terramar.com.uy&sz=128',
      description: 'Proyectos inmobiliarios costeros y residenciales con foco en calidad de vida y diseño moderno.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'torrescardinal',
      name: 'Torres Cardinal',
      url: 'https://torrescardinal.com/',
      logo: 'https://www.google.com/s2/favicons?domain=torrescardinal.com&sz=128',
      description: 'Desarrollo de torres y complejos residenciales con amenities y ubicaciones premium en Montevideo.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'altius',
      name: 'Altius',
      url: 'https://altius.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=altius.com.uy&sz=128',
      description: 'Empresa constructora con amplia trayectoria en desarrollos inmobiliarios premium y proyectos arquitectónicos innovadores.',
      category: 'proyectos',
      featured: true
    },
    {
      id: 'altiusgroup',
      name: 'Altius Group',
      url: 'https://altiusgroup.com',
      logo: 'https://www.google.com/s2/favicons?domain=altiusgroup.com&sz=128',
      description: 'Líder en diseño de proyectos inmobiliarios innovadores en América Latina. Desarrolla bajo las marcas Nostrum (28 proyectos), More, Bilú y Atlántico. Oficinas en Centro, Cordón, Pocitos y Punta del Este. Contacto: 096 424 235 / 0800 8911.',
      category: 'proyectos',
      featured: true
    },
    {
      id: 'inmobiliariaroig',
      name: 'Inmobiliaria Roig',
      url: 'https://www.inmobiliariaroig.com/projects/view/',
      logo: 'https://www.google.com/s2/favicons?domain=inmobiliariaroig.com&sz=128',
      description: 'Inmobiliaria con portfolio de proyectos nuevos y emprendimientos en desarrollo.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'aliveresidences',
      name: 'Alive Residences',
      url: 'https://aliveresidences.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=aliveresidences.uy&sz=128',
      description: 'Residencias modernas con concepto de vida integrada, diseño contemporáneo y espacios verdes.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'vitriumcapital',
      name: 'Vitrium Capital',
      url: 'https://www.vitriumcapital.com/proyectos',
      logo: 'https://www.google.com/s2/favicons?domain=vitriumcapital.com&sz=128',
      description: 'Desarrolladora de proyectos inmobiliarios premium con inversión en ubicaciones estratégicas.',
      category: 'proyectos',
      featured: true
    },
    {
      id: 'caladelyacht',
      name: 'Caladelyacht',
      url: 'https://caladelyacht.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=caladelyacht.uy&sz=128',
      description: 'Proyecto residencial exclusivo con marina y servicios náuticos en La Paloma.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'fendichateaupunta',
      name: 'Fendi Château Punta',
      url: 'https://fendichateaupunta.com/',
      logo: 'https://www.google.com/s2/favicons?domain=fendichateaupunta.com&sz=128',
      description: 'Desarrollo inmobiliario de lujo en Punta del Este con diseño exclusivo de marca internacional.',
      category: 'proyectos',
      featured: true
    },
    {
      id: 'metdesarrollos',
      name: 'MET Desarrollos',
      url: 'https://www.metdesarrollos.com.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=metdesarrollos.com.uy&sz=128',
      description: 'Constructora especializada en desarrollos inmobiliarios residenciales y comerciales.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'newland',
      name: 'Newland',
      url: 'https://newland.com.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=newland.com.uy&sz=128',
      description: 'Proyectos inmobiliarios innovadores con foco en sustentabilidad y calidad constructiva.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'grou',
      name: 'Grou',
      url: 'https://www.grou.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=grou.uy&sz=128',
      description: 'Desarrolladora con trayectoria en proyectos residenciales de diversos segmentos en Uruguay.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'grourambla',
      name: 'Grou Rambla',
      url: 'https://www.grourambla.uy',
      logo: 'https://www.google.com/s2/favicons?domain=grourambla.uy&sz=128',
      description: 'Proyecto residencial frente a la rambla con vistas panorámicas y amenities exclusivos.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'lagom',
      name: 'Lagom',
      url: 'https://www.lagom.com.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=lagom.com.uy&sz=128',
      description: 'Desarrollos inmobiliarios con concepto de vida equilibrada y diseño escandinavo.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'vinsoca-altamira',
      name: 'Vinsoca - Altamira Rambla',
      url: 'https://vinsoca.com/proyectos/altamira-rambla/',
      logo: 'https://www.google.com/s2/favicons?domain=vinsoca.com&sz=128',
      description: 'Proyecto residencial premium en Pocitos con vista al mar y servicios de primer nivel.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'ezmaconstrucciones',
      name: 'Ezma Construcciones',
      url: 'https://www.ezmaconstrucciones.com/',
      logo: 'https://www.google.com/s2/favicons?domain=ezmaconstrucciones.com&sz=128',
      description: 'Empresa constructora con proyectos residenciales y comerciales en todo Uruguay.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'baconstrucciones',
      name: 'BA Construcciones',
      url: 'https://www.baconstrucciones.com/',
      logo: 'https://www.google.com/s2/favicons?domain=baconstrucciones.com&sz=128',
      description: 'Constructora con amplia experiencia en proyectos inmobiliarios y obras de infraestructura.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'lascampanas',
      name: 'Las Campanas',
      url: 'https://www.lascampanas.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=lascampanas.uy&sz=128',
      description: 'Desarrollo inmobiliario en José Ignacio con lotes residenciales en entorno natural privilegiado.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'cemconstrucciones',
      name: 'CEM Construcciones',
      url: 'https://cemconstrucciones.uy',
      logo: 'https://www.google.com/s2/favicons?domain=cemconstrucciones.uy&sz=128',
      description: 'Empresa constructora con proyectos de vivienda y desarrollos comerciales en Uruguay.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'gopunta',
      name: 'GoPunta',
      url: 'https://gopunta.uy',
      logo: 'https://www.google.com/s2/favicons?domain=gopunta.uy&sz=128',
      description: 'Desarrolladora inmobiliaria especializada en proyectos en Punta del Este y zona costera.',
      category: 'proyectos',
      featured: false
    },
    {
      id: 'plazadesarrollos',
      name: 'Plaza Desarrollos - Tres Cruces Plaza',
      url: 'https://plazadesarrollos.uy',
      logo: 'https://www.google.com/s2/favicons?domain=plazadesarrollos.uy&sz=128',
      description: 'Desarrolladora responsable del emblemático proyecto Tres Cruces Plaza y otros desarrollos urbanos de gran escala.',
      category: 'proyectos',
      featured: true
    },
    {
      id: 'xukahlatam',
      name: 'Xukah Latam',
      url: 'https://xukah.com',
      logo: 'https://www.google.com/s2/favicons?domain=xukah.com&sz=128',
      description: 'Desarrolladora inmobiliaria con presencia en América Latina especializada en proyectos innovadores y sostenibles.',
      category: 'proyectos',
      featured: false
    }
  ],

  contenedores: [
    {
      id: 'nebimol',
      name: 'Nebimol',
      url: 'https://nebimol.com',
      logo: 'https://www.google.com/s2/favicons?domain=nebimol.com&sz=128',
      description: 'Especialistas en construcción modular con Steel Framing desde 2002. Combinan carpintería tradicional con soluciones habitacionales transportables de alta calidad.',
      category: 'contenedores',
      featured: true
    },
    {
      id: 'universocontainers',
      name: 'Universo Containers',
      url: 'https://universocontainers.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=universocontainers.com.uy&sz=128',
      description: 'Construcción de viviendas y espacios comerciales con containers marítimos reciclados y diseños personalizados.',
      category: 'contenedores',
      featured: true
    },
    {
      id: 'singularhousing',
      name: 'Singular Housing',
      url: 'https://singularhousing.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=singularhousing.com.uy&sz=128',
      description: 'Viviendas modulares y prefabricadas con diseño moderno, construcción rápida y eficiencia energética.',
      category: 'contenedores',
      featured: true
    },
    {
      id: 'tucasaideal',
      name: 'Tu Casa Ideal',
      url: 'https://tucasaideal.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=tucasaideal.com.uy&sz=128',
      description: 'Soluciones habitacionales prefabricadas y modulares con proyectos personalizados.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'casasimple',
      name: 'Casa Simple',
      url: 'https://casasimple.uy',
      logo: 'https://www.google.com/s2/favicons?domain=casasimple.uy&sz=128',
      description: 'Casas prefabricadas minimalistas con enfoque en simplicidad, funcionalidad y costos accesibles.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'cacontainersuy',
      name: 'CA Containers UY',
      url: 'https://cacontainersuy.com',
      logo: 'https://www.google.com/s2/favicons?domain=cacontainersuy.com&sz=128',
      description: 'Fabricación y comercialización de viviendas container con diseños contemporáneos.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'ihouse',
      name: 'iHouse',
      url: 'https://ihouse.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=ihouse.com.uy&sz=128',
      description: 'Casas industrializadas y modulares con tecnología de construcción en seco y acabados premium.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'steelframing',
      name: 'Steel Framing UY',
      url: 'https://steelframing.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=steelframing.com.uy&sz=128',
      description: 'Construcción con sistema Steel Framing: rápido, sustentable y antisísmico.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'isopanelpro',
      name: 'Isopanel Pro',
      url: 'https://isopanelpro.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=isopanelpro.com.uy&sz=128',
      description: 'Paneles aislantes y sistemas constructivos para viviendas modulares de alta eficiencia térmica.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'tucasacontainersuy',
      name: 'Tu Casa Containers UY',
      url: 'https://tucasacontainers.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=tucasacontainers.com.uy&sz=128',
      description: 'Viviendas construidas con containers con diseños personalizados y entrega llave en mano.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'tucasacontainerscom',
      name: 'Tu Casa Containers',
      url: 'https://tucasacontainers.com',
      logo: 'https://www.google.com/s2/favicons?domain=tucasacontainers.com&sz=128',
      description: 'Construcción de casas container modulares para vivienda permanente y temporal.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'lphousecontainer',
      name: 'LP House Container',
      url: 'https://lphousecontainer.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=lphousecontainer.uy&sz=128',
      description: 'Casas container con diseño arquitectónico, calidad constructiva y proyectos a medida.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'multicontainer',
      name: 'Multicontainer',
      url: 'https://multicontainer.com/',
      logo: 'https://www.google.com/s2/favicons?domain=multicontainer.com&sz=128',
      description: 'Soluciones habitacionales y comerciales con containers marítimos adaptados.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'pluscontainer',
      name: 'Plus Container',
      url: 'https://www.pluscontainer.com.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=pluscontainer.com.uy&sz=128',
      description: 'Viviendas y oficinas container con diseños innovadores y construcción sustentable.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'misterconstrucciones',
      name: 'Mister Construcciones',
      url: 'https://misterconstrucciones.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=misterconstrucciones.uy&sz=128',
      description: 'Construcciones modulares y prefabricadas con sistemas industrializados.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'eleve',
      name: 'Eleve',
      url: 'https://www.eleve.com.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=eleve.com.uy&sz=128',
      description: 'Viviendas modulares elevadas con diseño contemporáneo y tecnología constructiva avanzada.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'tucasacontainerael',
      name: 'Tu Casa Container AEL',
      url: 'https://tucasacontainer.com/ael',
      logo: 'https://www.google.com/s2/favicons?domain=tucasacontainer.com&sz=128',
      description: 'Proyectos de casas container con modelos predefinidos y opciones personalizables.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'livingcontainers',
      name: 'Living Containers',
      url: 'https://www.livingcontainers.com.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=livingcontainers.com.uy&sz=128',
      description: 'Espacios habitables y comerciales construidos con containers, diseño moderno y funcional.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'decotainer',
      name: 'Decotainer',
      url: 'https://decotainer.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=decotainer.uy&sz=128',
      description: 'Containers decorados y adaptados para vivienda, oficinas y locales comerciales.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'homecontainersuruguay',
      name: 'Home Containers Uruguay',
      url: 'https://homecontainersuruguay.com/',
      logo: 'https://www.google.com/s2/favicons?domain=homecontainersuruguay.com&sz=128',
      description: 'Casas container llave en mano con proyectos personalizados y asesoramiento integral.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'agrocontainers',
      name: 'Agro Containers',
      url: 'https://www.agrocontainers.com.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=agrocontainers.com.uy&sz=128',
      description: 'Containers adaptados para uso rural, agrícola y ganadero con soluciones a medida.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'zonacontainer',
      name: 'Zona Container',
      url: 'https://zonacontainer.com.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=zonacontainer.com.uy&sz=128',
      description: 'Venta y transformación de containers para vivienda, oficinas y emprendimientos comerciales.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'decasurhouse',
      name: 'Decasur House',
      url: 'https://www.decasurhouse.com.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=decasurhouse.com.uy&sz=128',
      description: 'Casas prefabricadas y modulares con diseños contemporáneos y construcción en tiempo récord.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'totalcontainers',
      name: 'Total Containers',
      url: 'https://totalcontainers.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=totalcontainers.uy&sz=128',
      description: 'Soluciones integrales en containers: vivienda, oficinas, locales y espacios recreativos.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'atlanticcontainers',
      name: 'Atlantic Containers',
      url: 'https://atlanticcontainers.com.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=atlanticcontainers.com.uy&sz=128',
      description: 'Casas y módulos container con foco en calidad, diseño y entrega rápida.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'luisfernandez',
      name: 'Luis Fernández',
      url: 'https://luisfernandez.uy',
      logo: 'https://www.google.com/s2/favicons?domain=luisfernandez.uy&sz=128',
      description: 'Construcciones modulares y prefabricadas con sistemas innovadores.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'vantem',
      name: 'Vantem',
      url: 'https://vantem.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=vantem.com.uy&sz=128',
      description: 'Viviendas prefabricadas con tecnología europea y diseño personalizado.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'karmod',
      name: 'Karmod Uruguay',
      url: 'https://www.karmod.es/blog/casas-prefabricadas-uruguay',
      logo: 'https://www.google.com/s2/favicons?domain=karmod.es&sz=128',
      description: 'Casas prefabricadas modulares de marca internacional con presencia en Uruguay.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'prefaburuguay',
      name: 'Prefab Uruguay',
      url: 'https://www.prefaburuguay.com',
      logo: 'https://www.google.com/s2/favicons?domain=prefaburuguay.com&sz=128',
      description: 'Viviendas prefabricadas con sistemas constructivos modernos y entrega inmediata.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'pthuruguay',
      name: 'PTH Uruguay',
      url: 'https://www.pthuruguay.com',
      logo: 'https://www.google.com/s2/favicons?domain=pthuruguay.com&sz=128',
      description: 'Construcciones prefabricadas en hormigón y sistemas industrializados.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'igabensa',
      name: 'Igabensa',
      url: 'https://igabensa.com',
      logo: 'https://www.google.com/s2/favicons?domain=igabensa.com&sz=128',
      description: 'Construcciones modulares y prefabricadas para diversos usos: vivienda, comercio e industria.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'berardipropiedades',
      name: 'Berardi Propiedades',
      url: 'https://berardipropiedades.com/',
      logo: 'https://www.google.com/s2/favicons?domain=berardipropiedades.com&sz=128',
      description: 'Desarrollos inmobiliarios con sistemas constructivos innovadores y eficientes.',
      category: 'contenedores',
      featured: false
    },
    {
      id: 'zapata',
      name: 'Zapata',
      url: 'https://www.zapata.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=zapata.uy&sz=128',
      description: 'Construcciones industrializadas y modulares con amplia experiencia en el mercado uruguayo.',
      category: 'contenedores',
      featured: false
    }
  ],

  remates: [
    {
      id: 'anv-remates',
      name: 'ANV - Remates Extrajudiciales',
      url: 'https://www.anv.gub.uy/remates-extrajudiciales',
      logo: 'https://www.google.com/s2/favicons?domain=anv.gub.uy&sz=128',
      description: 'Remates extrajudiciales de viviendas de la Agencia Nacional de Vivienda. Oportunidades de compra con financiamiento y procedimientos transparentes.',
      category: 'remates',
      featured: true
    },
    {
      id: 'bhu-remates',
      name: 'BHU - Remates',
      url: 'https://www.bhu.com.uy/venta-de-inmuebles/remates',
      logo: 'https://www.google.com/s2/favicons?domain=bhu.com.uy&sz=128',
      description: 'Remates de inmuebles del Banco Hipotecario del Uruguay con opciones de financiamiento preferencial.',
      category: 'remates',
      featured: true
    },
    {
      id: 'rematesenuruguay',
      name: 'Remates en Uruguay',
      url: 'https://rematesenuruguay.com',
      logo: 'https://www.google.com/s2/favicons?domain=rematesenuruguay.com&sz=128',
      description: 'Portal especializado en remates judiciales y extrajudiciales de propiedades en todo Uruguay.',
      category: 'remates',
      featured: false
    },
    {
      id: 'rematesyventas',
      name: 'Remates y Ventas',
      url: 'https://www.rematesyventas.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=rematesyventas.com.uy&sz=128',
      description: 'Plataforma de remates judiciales y ventas de inmuebles con información actualizada.',
      category: 'remates',
      featured: false
    },
    {
      id: 'impo-remates',
      name: 'IMPO - Remates',
      url: 'https://www.impo.com.uy/remates',
      logo: 'https://www.google.com/s2/favicons?domain=impo.com.uy&sz=128',
      description: 'Publicación oficial de remates judiciales y extrajudiciales en el portal del IMPO.',
      category: 'remates',
      featured: false
    },
    {
      id: 'jpcarrau',
      name: 'JP Carrau Remates',
      url: 'https://www.jpcarrau.com.uy',
      logo: 'https://www.google.com/s2/favicons?domain=jpcarrau.com.uy&sz=128',
      description: 'Martillero público especializado en remates de inmuebles, vehículos y bienes muebles con amplia trayectoria en Uruguay.',
      category: 'remates',
      featured: true
    },
    {
      id: 'castells',
      name: 'Castells - Subastas Online',
      url: 'https://subastascastells.com/',
      logo: 'https://www.google.com/s2/favicons?domain=subastascastells.com&sz=128',
      description: 'Empresa de subastas online y remates presenciales especializada en arte moderno y contemporáneo, alhajas, relojes, muebles, antigüedades y gastronomía.',
      category: 'remates',
      featured: false
    },
    {
      id: 'bavastro',
      name: 'Bavastro - Casa de Remates',
      url: 'https://www.bavastro.com.uy/',
      logo: 'https://www.google.com/s2/favicons?domain=bavastro.com.uy&sz=128',
      description: 'Casa de remates con subastas presenciales todos los jueves en Ciudad Vieja. Especializada en mobiliario, antigüedades, electrodomésticos, vehículos y mercadería general.',
      category: 'remates',
      featured: false
    }
  ]
};

// Helper function to get all sites
export const getAllSites = () => {
  return [
    ...construccionSites.proyectos,
    ...construccionSites.contenedores,
    ...construccionSites.remates
  ];
};

// Helper function to get sites by category
export const getSitesByCategory = (category) => {
  return construccionSites[category] || [];
};

// Helper function to get featured sites
export const getFeaturedSites = () => {
  return getAllSites().filter(site => site.featured);
};

// Helper function to get site by ID
export const getSiteById = (id) => {
  return getAllSites().find(site => site.id === id);
};

export default construccionSites;
