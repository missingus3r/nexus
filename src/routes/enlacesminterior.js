import express from 'express';

const router = express.Router();

/**
 * GET /enlacesminterior/mi
 * Return official Ministry of Interior links
 */
router.get('/mi', (req, res) => {
  res.json({
    title: 'Enlaces Oficiales - Ministerio del Interior',
    links: [
      {
        name: 'Personas Ausentes',
        url: 'https://personasausentes.minterior.gub.uy/galeria',
        description: 'Galería de personas desaparecidas, guía de actuación, servicios del D.R.B.P.A. (Departamento de Registro y Búsqueda de Personas Ausentes), información sobre Alerta Amber Uruguay y acceso a sistemas de alerta regional (Alerta Sofia Argentina y Amber Alert Brasil)'
      },
      {
        name: 'Personas Condenadas',
        url: 'https://anterior.minterior.gub.uy/index.php/component/procesados/?task=procesados',
        description: 'Listado oficial de personas procesadas'
      },
      {
        name: 'Denuncias Anónimas',
        url: 'https://denuncia.minterior.gub.uy/es/Denuncia/DatosDenuncianteAnonima?tipoDenunciante=ANONIMA',
        description: 'Sistema de denuncias anónimas del Ministerio del Interior'
      },
      {
        name: 'Mapa de Comisarías',
        url: 'https://www.google.com/maps/d/viewer?mid=1-MjOJFdUGEdLJRdccCuXwkbVhOM&ll=-34.91642232655005%2C-56.216393753704736&z=11',
        description: 'Mapa interactivo de comisarías en Uruguay'
      },
      {
        name: 'Emergencia 9-1-1',
        url: 'https://www.gub.uy/ministerio-interior/tramites-y-servicios/servicios/emergencia-9-1-1',
        description: 'Información oficial sobre el servicio de emergencias 9-1-1'
      },
      {
        name: 'Denuncia Acoso Sexual en Transporte Público',
        url: 'https://tramites.montevideo.gub.uy/tramite/acoso-sexual-en-transporte-publico',
        description: 'Información sobre cómo denunciar situaciones de acoso sexual en el transporte público. Incluye protocolos de actuación para víctimas y choferes, y acceso al sistema de denuncias online.'
      }
    ],
    disclaimer: 'Estos enlaces son proporcionados para acceso a información oficial. Vortex no almacena ni procesa datos de personas procesadas.'
  });
});

export default router;
