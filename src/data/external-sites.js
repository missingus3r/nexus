// External sites database for monitoring and verification
// All hardcoded external URLs in the Austra platform organized by section

const externalSites = {
  social: {
    name: 'Social',
    description: 'Sitios externos referenciados en la plataforma Social',
    sites: [
      {
        id: 'ligabichera',
        name: 'Liga Bichera Montevideo',
        url: 'https://www.instagram.com/ligabicheramontevideo/',
        category: 'Protección Animal',
        checkMethod: 'HEAD'
      },
      {
        id: 'animalessinhogar',
        name: 'Animales sin Hogar',
        url: 'https://www.animalessinhogar.com.uy/',
        category: 'Protección Animal',
        checkMethod: 'HEAD'
      },
      {
        id: 'espacioanimal',
        name: 'Espacio Animal',
        url: 'https://espacioanimal.uy/',
        category: 'Protección Animal',
        checkMethod: 'HEAD'
      },
      {
        id: 'tuyo',
        name: 'Tuyo.uy',
        url: 'https://www.tuyo.uy',
        category: 'Servicios',
        checkMethod: 'HEAD'
      },
      {
        id: 'involucrate',
        name: 'Involucrate.uy',
        url: 'https://involucrate.uy',
        category: 'Voluntariado',
        checkMethod: 'HEAD'
      },
      {
        id: 'crowderfund',
        name: 'Crowder Fund',
        url: 'https://www.crowder.fund/',
        category: 'Crowdfunding',
        checkMethod: 'HEAD'
      }
    ]
  },

  nexus: {
    name: 'Nexus',
    description: 'Sitios externos de mapas, geoportales y datos abiertos en Nexus',
    sites: [
      {
        id: 'anteltv',
        name: 'Antel TV Cámaras',
        url: 'https://anteltv.com.uy/camaras',
        category: 'Cámaras en Vivo',
        checkMethod: 'HEAD'
      },
      {
        id: 'montevideo-gis',
        name: 'Montevideo GIS',
        url: 'https://montevideo.gub.uy/app/mapas/',
        category: 'Mapas y GIS',
        checkMethod: 'HEAD'
      },
      {
        id: 'intgis-montevideo',
        name: 'IntGIS Montevideo',
        url: 'https://intgis.montevideo.gub.uy/pmapper/map.phtml',
        category: 'Mapas y GIS',
        checkMethod: 'HEAD'
      },
      {
        id: 'geoportal-mtop',
        name: 'Geoportal MTOP',
        url: 'https://geoportal.mtop.gub.uy/geoservicios',
        category: 'Mapas y GIS',
        checkMethod: 'HEAD'
      },
      {
        id: 'visualizador-mtop',
        name: 'Visualizador MTOP',
        url: 'https://geoportal.mtop.gub.uy/visualizador/',
        category: 'Mapas y GIS',
        checkMethod: 'HEAD'
      },
      {
        id: 'ide-uruguay',
        name: 'IDE Uruguay - Geoservicios',
        url: 'https://www.gub.uy/infraestructura-datos-espaciales/geoservicios-ide-uruguay',
        category: 'Mapas y GIS',
        checkMethod: 'HEAD'
      },
      {
        id: 'visualizador-ide',
        name: 'Visualizador IDE Uruguay',
        url: 'https://visualizador.ide.uy/ideuy/core/load_public_project/ideuy/',
        category: 'Mapas y GIS',
        checkMethod: 'HEAD'
      },
      {
        id: 'sig-ose',
        name: 'SIG OSE - Saneamiento',
        url: 'https://sig.ose.com.uy/saneamiento',
        category: 'Mapas y GIS',
        checkMethod: 'HEAD'
      },
      {
        id: 'montevidata-hidromet',
        name: 'Montevidata - Red Hidrometeorológica',
        url: 'https://montevidata.montevideo.gub.uy/ambiental/red-hidrometeorologica-de-montevideo-rhm',
        category: 'Datos Abiertos',
        checkMethod: 'HEAD'
      },
      {
        id: 'ambiente-visualizador',
        name: 'Ministerio de Ambiente - Visualizador',
        url: 'https://www.ambiente.gub.uy/visualizador/index.php?vis=sig',
        category: 'Mapas y GIS',
        checkMethod: 'HEAD'
      },
      {
        id: 'sig-lidar-montevideo',
        name: 'SIG Montevideo - LIDAR 2024',
        url: 'https://sig.montevideo.gub.uy/lidar-2024.html',
        category: 'Mapas y GIS',
        checkMethod: 'HEAD'
      },
      {
        id: 'cgm-montevideo',
        name: 'Centro de Gestión de Movilidad',
        url: 'https://montevideo.gub.uy/area-tematica/movilidad/gestion-de-la-movilidad/centro-de-gestion-de-movilidad',
        category: 'Movilidad',
        checkMethod: 'HEAD'
      },
      {
        id: 'montevidata-viajes',
        name: 'Montevidata - Viajes en Transporte',
        url: 'https://montevidata.montevideo.gub.uy/movilidad/viajes-en-transporte-publico',
        category: 'Datos Abiertos',
        checkMethod: 'HEAD'
      },
      {
        id: 'montevidata-flota',
        name: 'Montevidata - Flota e Infraestructura',
        url: 'https://montevidata.montevideo.gub.uy/movilidad/flota-e-infraestructura-de-transporte',
        category: 'Datos Abiertos',
        checkMethod: 'HEAD'
      }
    ]
  },

  surlinkAcademy: {
    name: 'Surlink - Academy',
    description: 'Sitios educativos referenciados en Surlink Academy',
    sites: [
      {
        id: 'cursosycarreras',
        name: 'Cursos y Carreras',
        url: 'https://www.cursosycarreras.com.uy/',
        category: 'Educación',
        checkMethod: 'HEAD'
      }
    ]
  },

  surlinkFinancial: {
    name: 'Surlink - Financial',
    description: 'Sitios financieros referenciados en Surlink',
    sites: [
      {
        id: 'bcu-consultadeuda',
        name: 'BCU - Consulta de Deuda',
        url: 'https://consultadeuda.bcu.gub.uy/consultadeuda/',
        category: 'Servicios Financieros',
        checkMethod: 'HEAD'
      },
      {
        id: 'brou-cotizaciones',
        name: 'BROU - Cotizaciones',
        url: 'https://www.brou.com.uy/cotizaciones',
        category: 'Servicios Financieros',
        checkMethod: 'HEAD'
      },
      {
        id: 'bcu-cotizaciones',
        name: 'BCU - Cotizaciones',
        url: 'https://www.bcu.gub.uy/Estadisticas-e-Indicadores/Paginas/Cotizaciones.aspx',
        category: 'Servicios Financieros',
        checkMethod: 'HEAD'
      }
    ]
  },

  surlinkProyectos: {
    name: 'Surlink - Proyectos Inmobiliarios',
    description: 'Desarrolladoras y proyectos inmobiliarios en Surlink',
    sites: [
      { id: 'stiler', name: 'Stiler', url: 'https://stiler.com.uy', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'theedge', name: 'The Edge', url: 'https://theedge.uy', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'kaizengroup', name: 'Kaizen Group', url: 'https://kaizengroup.com.uy', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'terramar', name: 'Terramar', url: 'https://terramar.com.uy', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'torrescardinal', name: 'Torres Cardinal', url: 'https://torrescardinal.com/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'altius', name: 'Altius', url: 'https://altius.com.uy', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'altiusgroup', name: 'Altius Group', url: 'https://altiusgroup.com', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'inmobiliariaroig', name: 'Inmobiliaria Roig', url: 'https://www.inmobiliariaroig.com/projects/view/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'aliveresidences', name: 'Alive Residences', url: 'https://aliveresidences.uy/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'vitriumcapital', name: 'Vitrium Capital', url: 'https://www.vitriumcapital.com/proyectos', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'caladelyacht', name: 'Caladelyacht', url: 'https://caladelyacht.uy/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'fendichateaupunta', name: 'Fendi Château Punta', url: 'https://fendichateaupunta.com/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'metdesarrollos', name: 'MET Desarrollos', url: 'https://www.metdesarrollos.com.uy/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'newland', name: 'Newland', url: 'https://newland.com.uy/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'grou', name: 'Grou', url: 'https://www.grou.uy/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'grourambla', name: 'Grou Rambla', url: 'https://www.grourambla.uy', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'lagom', name: 'Lagom', url: 'https://www.lagom.com.uy/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'vinsoca-altamira', name: 'Vinsoca - Altamira Rambla', url: 'https://vinsoca.com/proyectos/altamira-rambla/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'ezmaconstrucciones', name: 'Ezma Construcciones', url: 'https://www.ezmaconstrucciones.com/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'baconstrucciones', name: 'BA Construcciones', url: 'https://www.baconstrucciones.com/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'lascampanas', name: 'Las Campanas', url: 'https://www.lascampanas.uy/', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'cemconstrucciones', name: 'CEM Construcciones', url: 'https://cemconstrucciones.uy', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'gopunta', name: 'GoPunta', url: 'https://gopunta.uy', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'plazadesarrollos', name: 'Plaza Desarrollos', url: 'https://plazadesarrollos.uy', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'xukahlatam', name: 'Xukah Latam', url: 'https://xukah.com', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'feel', name: 'Feel', url: 'https://feel.com.uy', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'distritocalcagno', name: 'Distrito Calcagno', url: 'https://distritocalcagno.com', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'greenconcept', name: 'Green Concept', url: 'https://greenconcept.com.uy', category: 'Proyectos', checkMethod: 'HEAD' },
      { id: 'brusco', name: 'Brusco', url: 'https://brusco.com.uy', category: 'Proyectos', checkMethod: 'HEAD' }
    ]
  },

  surlinkContenedores: {
    name: 'Surlink - Construcciones Modulares',
    description: 'Empresas de construcción modular y containers en Surlink',
    sites: [
      { id: 'nebimol', name: 'Nebimol', url: 'https://nebimol.com', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'universocontainers', name: 'Universo Containers', url: 'https://universocontainers.com.uy', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'singularhousing', name: 'Singular Housing', url: 'https://singularhousing.com.uy', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'tucasaideal', name: 'Tu Casa Ideal', url: 'https://tucasaideal.com.uy', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'casasimple', name: 'Casa Simple', url: 'https://casasimple.uy', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'cacontainersuy', name: 'CA Containers UY', url: 'https://cacontainersuy.com', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'ihouse', name: 'iHouse', url: 'https://ihouse.com.uy', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'steelframing', name: 'Steel Framing UY', url: 'https://steelframing.com.uy', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'isopanelpro', name: 'Isopanel Pro', url: 'https://isopanelpro.com.uy', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'tucasacontainersuy', name: 'Tu Casa Containers UY', url: 'https://tucasacontainers.com.uy', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'tucasacontainerscom', name: 'Tu Casa Containers', url: 'https://tucasacontainers.com', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'lphousecontainer', name: 'LP House Container', url: 'https://lphousecontainer.uy/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'multicontainer', name: 'Multicontainer', url: 'https://multicontainer.com/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'pluscontainer', name: 'Plus Container', url: 'https://www.pluscontainer.com.uy/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'misterconstrucciones', name: 'Mister Construcciones', url: 'https://misterconstrucciones.uy/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'eleve', name: 'Eleve', url: 'https://www.eleve.com.uy/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'tucasacontainerael', name: 'Tu Casa Container AEL', url: 'https://tucasacontainer.com/ael', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'livingcontainers', name: 'Living Containers', url: 'https://www.livingcontainers.com.uy/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'decotainer', name: 'Decotainer', url: 'https://decotainer.uy/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'homecontainersuruguay', name: 'Home Containers Uruguay', url: 'https://homecontainersuruguay.com/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'agrocontainers', name: 'Agro Containers', url: 'https://www.agrocontainers.com.uy/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'zonacontainer', name: 'Zona Container', url: 'https://zonacontainer.com.uy/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'decasurhouse', name: 'Decasur House', url: 'https://www.decasurhouse.com.uy/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'totalcontainers', name: 'Total Containers', url: 'https://totalcontainers.uy/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'atlanticcontainers', name: 'Atlantic Containers', url: 'https://atlanticcontainers.com.uy/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'luisfernandez', name: 'Luis Fernández', url: 'https://luisfernandez.uy', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'vantem', name: 'Vantem', url: 'https://vantem.com.uy', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'karmod', name: 'Karmod Uruguay', url: 'https://www.karmod.es/blog/casas-prefabricadas-uruguay', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'prefaburuguay', name: 'Prefab Uruguay', url: 'https://www.prefaburuguay.com', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'pthuruguay', name: 'PTH Uruguay', url: 'https://www.pthuruguay.com', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'igabensa', name: 'Igabensa', url: 'https://igabensa.com', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'berardipropiedades', name: 'Berardi Propiedades', url: 'https://berardipropiedades.com/', category: 'Contenedores', checkMethod: 'HEAD' },
      { id: 'zapata', name: 'Zapata', url: 'https://www.zapata.uy/', category: 'Contenedores', checkMethod: 'HEAD' }
    ]
  },

  surlinkRemates: {
    name: 'Surlink - Remates y Subastas',
    description: 'Sitios de remates y subastas en Surlink',
    sites: [
      { id: 'anv-remates', name: 'ANV - Remates Extrajudiciales', url: 'https://www.anv.gub.uy/remates-extrajudiciales', category: 'Remates', checkMethod: 'HEAD' },
      { id: 'bhu-remates', name: 'BHU - Remates', url: 'https://www.bhu.com.uy/venta-de-inmuebles/remates', category: 'Remates', checkMethod: 'HEAD' },
      { id: 'rematesenuruguay', name: 'Remates en Uruguay', url: 'https://rematesenuruguay.com', category: 'Remates', checkMethod: 'HEAD' },
      { id: 'rematesyventas', name: 'Remates y Ventas', url: 'https://www.rematesyventas.com.uy', category: 'Remates', checkMethod: 'HEAD' },
      { id: 'impo-remates', name: 'IMPO - Remates', url: 'https://www.impo.com.uy/remates', category: 'Remates', checkMethod: 'HEAD' },
      { id: 'jpcarrau', name: 'JP Carrau Remates', url: 'https://www.jpcarrau.com.uy', category: 'Remates', checkMethod: 'HEAD' },
      { id: 'castells', name: 'Castells - Subastas Online', url: 'https://subastascastells.com/', category: 'Remates', checkMethod: 'HEAD' },
      { id: 'bavastro', name: 'Bavastro - Casa de Remates', url: 'https://www.bavastro.com.uy/', category: 'Remates', checkMethod: 'HEAD' }
    ]
  },

  ministerioInterior: {
    name: 'Ministerio del Interior',
    description: 'Enlaces oficiales del Ministerio del Interior de Uruguay',
    sites: [
      {
        id: 'personas-ausentes',
        name: 'Personas Ausentes',
        url: 'https://personasausentes.minterior.gub.uy/galeria',
        category: 'Seguridad Ciudadana',
        checkMethod: 'HEAD'
      },
      {
        id: 'personas-condenadas',
        name: 'Personas Condenadas',
        url: 'https://anterior.minterior.gub.uy/index.php/component/procesados/',
        category: 'Seguridad Ciudadana',
        checkMethod: 'HEAD'
      },
      {
        id: 'denuncias-anonimas',
        name: 'Denuncias Anónimas',
        url: 'https://denuncia.minterior.gub.uy/',
        category: 'Seguridad Ciudadana',
        checkMethod: 'HEAD'
      },
      {
        id: 'emergencia-911',
        name: 'Emergencia 9-1-1',
        url: 'https://www.gub.uy/ministerio-interior/tramites-y-servicios/servicios/emergencia-9-1-1',
        category: 'Seguridad Ciudadana',
        checkMethod: 'HEAD'
      },
      {
        id: 'acoso-transporte',
        name: 'Denuncia Acoso Sexual en Transporte',
        url: 'https://tramites.montevideo.gub.uy/tramite/acoso-sexual-en-transporte-publico',
        category: 'Seguridad Ciudadana',
        checkMethod: 'HEAD'
      },
      {
        id: 'aeca',
        name: 'Estadísticas AECA',
        url: 'https://www.gub.uy/ministerio-interior/tematica/area-estadistica-criminologia-aplicada-aeca',
        category: 'Seguridad Ciudadana',
        checkMethod: 'HEAD'
      },
      {
        id: 'observatorio-seguridad',
        name: 'Observatorio de Seguridad',
        url: 'https://observatorioseguridad.minterior.gub.uy/',
        category: 'Seguridad Ciudadana',
        checkMethod: 'HEAD'
      }
    ]
  }
};

// Helper functions
export const getAllExternalSites = () => {
  const allSites = [];
  Object.keys(externalSites).forEach(sectionKey => {
    const section = externalSites[sectionKey];
    section.sites.forEach(site => {
      allSites.push({
        ...site,
        section: section.name,
        sectionKey: sectionKey
      });
    });
  });
  return allSites;
};

export const getSitesBySection = (sectionKey) => {
  return externalSites[sectionKey]?.sites || [];
};

export const getTotalSitesCount = () => {
  return getAllExternalSites().length;
};

export const getSectionSummary = () => {
  return Object.keys(externalSites).map(key => ({
    key,
    name: externalSites[key].name,
    description: externalSites[key].description,
    count: externalSites[key].sites.length
  }));
};

export default externalSites;
