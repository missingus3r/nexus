import express from 'express';

const router = express.Router();

/**
 * GET /links/mi
 * Return official Ministry of Interior links
 */
router.get('/mi', (req, res) => {
  res.json({
    title: 'Enlaces Oficiales - Ministerio del Interior',
    links: [
      {
        name: 'Procesados y Evadidos',
        url: 'https://anterior.minterior.gub.uy/index.php/component/procesados/?task=procesados',
        description: 'Listado oficial de personas procesadas y evadidas'
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
      }
    ],
    disclaimer: 'Estos enlaces son proporcionados para acceso a información oficial. Nexus no almacena ni procesa datos de personas procesadas.'
  });
});

export default router;
