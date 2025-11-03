import express from 'express';
import mongoose from 'mongoose';
import { SurlinkListing } from '../models/index.js';
import SiteComment from '../models/SiteComment.js';
import logger from '../utils/logger.js';
import construccionSites, { getSitesByCategory as getConstruccionSitesByCategory, getAllSites as getAllConstruccionSites, getSiteById as getConstruccionSiteById } from '../data/construccion-sites.js';
import academySites, { getSitesByCategory as getAcademySitesByCategory, getAllSites as getAllAcademySites, getSiteById as getAcademySiteById } from '../data/academy-sites.js';
import financialSites, { getSitesByCategory as getFinancialSitesByCategory, getAllSites as getAllFinancialSites, getSiteById as getFinancialSiteById } from '../data/financial-sites.js';

const router = express.Router();

const VALID_CATEGORIES = ['casas', 'autos', 'academy', 'financial', 'construccion'];
const HOUSE_TYPES = ['Casa', 'Apartamento', 'Terreno', 'Proyecto en Pozo', 'Container', 'Steel Framing'];
const VEHICLE_TYPES = ['Auto', 'Camioneta', 'Moto', 'SUV', 'Utilitario', 'Otro'];
const FINANCIAL_TYPES = ['Crédito Hipotecario', 'Crédito Personal', 'Préstamo', 'Inversión', 'Seguro', 'Tarjeta de Crédito', 'Otro'];

const requireLogin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Debes iniciar sesión para realizar esta acción' });
  }
  return next();
};

const requireAdmin = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ error: 'No autenticado' });
  }

  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Acceso denegado - Se requiere rol de administrador' });
  }

  return next();
};

const toPlainAttributes = (attributes = new Map()) => {
  if (attributes instanceof Map) {
    return Object.fromEntries(attributes);
  }

  if (typeof attributes === 'object' && attributes !== null) {
    return attributes;
  }

  return {};
};

const formatListing = (listing, currentUid = null) => {
  const json = listing.toObject();
  json.id = json._id;
  delete json._id;

  json.attributes = toPlainAttributes(json.attributes);
  json.isLiked = currentUid ? json.likedBy.includes(currentUid) : false;
  json.likeCount = json.metrics?.likes ?? json.likedBy.length;
  json.commentCount = Array.isArray(json.comments) ? json.comments.length : 0;

  if (Array.isArray(json.comments)) {
    json.comments = json.comments.map(comment => ({
      id: comment._id,
      uid: comment.uid,
      username: comment.username,
      body: comment.body,
      createdAt: comment.createdAt,
      replies: Array.isArray(comment.replies) ? comment.replies.map(reply => ({
        id: reply._id,
        uid: reply.uid,
        username: reply.username,
        body: reply.body,
        createdAt: reply.createdAt
      })) : []
    }));
  }

  return json;
};

router.get('/listings', async (req, res) => {
  try {
    const {
      category,
      search,
      minPrice,
      maxPrice,
      propertyType,
      operation,
      brand,
      model,
      modality,
      city,
      serviceType,
      institution,
      page = 1,
      limit = 12
    } = req.query;

    const query = { status: 'active' };

    if (category && VALID_CATEGORIES.includes(category)) {
      query.category = category;
    }

    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    if (minPrice) {
      query['price.amount'] = { ...(query['price.amount'] || {}), $gte: Number(minPrice) };
    }

    if (maxPrice) {
      query['price.amount'] = { ...(query['price.amount'] || {}), $lte: Number(maxPrice) };
    }

    if (propertyType) {
      query['attributes.tipo'] = propertyType;
    }

    if (operation) {
      query['attributes.operacion'] = operation;
    }

    if (brand) {
      query['attributes.marca'] = new RegExp(brand, 'i');
    }

    if (model) {
      query['attributes.modelo'] = new RegExp(model, 'i');
    }

    if (modality) {
      query['attributes.modalidad'] = modality;
    }

    if (city) {
      query['location.city'] = new RegExp(city, 'i');
    }

    if (serviceType) {
      query['attributes.tipoServicio'] = serviceType;
    }

    if (institution) {
      query['attributes.institucion'] = new RegExp(institution, 'i');
    }

    const pageNumber = Math.max(parseInt(page, 10) || 1, 1);
    const pageSize = Math.min(parseInt(limit, 10) || 12, 50);
    const skip = (pageNumber - 1) * pageSize;

    const projection = {};
    let sort = {
      isFeatured: -1,
      'metrics.views': -1,
      createdAt: -1
    };

    if (query.$text) {
      projection.score = { $meta: 'textScore' };
      sort = {
        score: { $meta: 'textScore' },
        isFeatured: -1,
        'metrics.views': -1,
        createdAt: -1
      };
    }

    const [total, listings] = await Promise.all([
      SurlinkListing.countDocuments(query),
      SurlinkListing.find(query, projection)
        .sort(sort)
        .skip(skip)
        .limit(pageSize)
    ]);

    const currentUid = req.session?.user?.uid || null;
    const formatted = listings.map(item => formatListing(item, currentUid));

    const facets = {
      propertyTypes: new Set(),
      operations: new Set(),
      vehicleBrands: new Set(),
      modalities: new Set(),
      serviceTypes: new Set(),
      institutions: new Set()
    };

    formatted.forEach(item => {
      if (item.category === 'casas' && item.attributes?.tipo) {
        facets.propertyTypes.add(item.attributes.tipo);
      }
      if (item.category === 'casas' && item.attributes?.operacion) {
        facets.operations.add(item.attributes.operacion);
      }
      if (item.category === 'autos' && item.attributes?.marca) {
        facets.vehicleBrands.add(item.attributes.marca);
      }
      if (item.category === 'academy' && item.attributes?.modalidad) {
        facets.modalities.add(item.attributes.modalidad);
      }
      if (item.category === 'financial' && item.attributes?.tipoServicio) {
        facets.serviceTypes.add(item.attributes.tipoServicio);
      }
      if (item.category === 'financial' && item.attributes?.institucion) {
        facets.institutions.add(item.attributes.institucion);
      }
    });

    res.json({
      results: formatted,
      pagination: {
        total,
        page: pageNumber,
        pageSize,
        totalPages: Math.ceil(total / pageSize) || 1
      },
      facets: {
        propertyTypes: Array.from(facets.propertyTypes).sort(),
        operations: Array.from(facets.operations).sort(),
        vehicleBrands: Array.from(facets.vehicleBrands).sort(),
        modalities: Array.from(facets.modalities).sort(),
        serviceTypes: Array.from(facets.serviceTypes).sort(),
        institutions: Array.from(facets.institutions).sort(),
        defaultHouseTypes: HOUSE_TYPES,
        defaultVehicleTypes: VEHICLE_TYPES,
        defaultFinancialTypes: FINANCIAL_TYPES
      }
    });
  } catch (error) {
    logger.error('Error listing Surlink items', { error });
    res.status(500).json({ error: 'Error al obtener publicaciones' });
  }
});

router.get('/listings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const listing = await SurlinkListing.findByIdAndUpdate(
      id,
      { $inc: { 'metrics.views': 1 } },
      { new: true }
    );

    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const currentUid = req.session?.user?.uid || null;

    res.json(formatListing(listing, currentUid));
  } catch (error) {
    logger.error('Error fetching Surlink listing', { error });
    res.status(500).json({ error: 'Error al obtener la publicación' });
  }
});

router.post('/listings', requireAdmin, async (req, res) => {
  try {
    const payload = req.body || {};

    if (!payload.category || !VALID_CATEGORIES.includes(payload.category)) {
      return res.status(400).json({ error: 'Categoría inválida' });
    }

    if (!payload.title || !payload.description) {
      return res.status(400).json({ error: 'Título y descripción son obligatorios' });
    }

    if (payload.category === 'casas' && payload.attributes?.tipo) {
      payload.attributes.tipo = payload.attributes.tipo.trim();
    }

    if (payload.category === 'autos' && payload.attributes?.marca) {
      payload.attributes.marca = payload.attributes.marca.trim();
    }

    const listing = new SurlinkListing({
      ...payload,
      attributes: payload.attributes || {},
      programs: payload.category === 'academy' ? (payload.programs || []) : [],
      source: payload.source || 'manual',
      createdBy: req.session.user.uid || 'admin'
    });

    await listing.save();

    res.status(201).json({
      message: 'Publicación creada correctamente',
      listing: formatListing(listing, req.session.user.uid)
    });
  } catch (error) {
    logger.error('Error creating Surlink listing', { error });
    res.status(500).json({ error: 'Error al crear la publicación' });
  }
});

router.patch('/listings/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const payload = req.body || {};
    const listing = await SurlinkListing.findById(id);

    if (!listing) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    if (payload.category && VALID_CATEGORIES.includes(payload.category)) {
      listing.category = payload.category;
    }

    ['title', 'subtitle', 'summary', 'description', 'status', 'source'].forEach(field => {
      if (payload[field] !== undefined) {
        listing[field] = payload[field];
      }
    });

    if (payload.price) {
      listing.price = {
        ...listing.price,
        ...payload.price
      };
    }

    if (payload.location) {
      listing.location = {
        ...listing.location,
        ...payload.location
      };
    }

    if (payload.attributes) {
      listing.attributes = payload.attributes;
    }

    if (Array.isArray(payload.tags)) {
      listing.tags = payload.tags;
    }

    if (Array.isArray(payload.media)) {
      listing.media = payload.media;
    }

    if (listing.category === 'academy' && Array.isArray(payload.programs)) {
      listing.programs = payload.programs;
    }

    if (payload.expiresAt) {
      listing.expiresAt = payload.expiresAt;
    }

    await listing.save();

    res.json({
      message: 'Publicación actualizada',
      listing: formatListing(listing, req.session.user.uid)
    });
  } catch (error) {
    logger.error('Error updating Surlink listing', { error });
    res.status(500).json({ error: 'Error al actualizar la publicación' });
  }
});

router.delete('/listings/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const listing = await SurlinkListing.findById(id);

    if (!listing) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    listing.status = 'inactive';
    await listing.save();

    res.json({ message: 'Publicación archivada' });
  } catch (error) {
    logger.error('Error deleting Surlink listing', { error });
    res.status(500).json({ error: 'Error al archivar la publicación' });
  }
});

router.post('/listings/:id/like', requireLogin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const listing = await SurlinkListing.findById(id);

    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const uid = req.session.user.uid;
    listing.toggleLike(uid);
    await listing.save();

    res.json({
      liked: listing.likedBy.includes(uid),
      likes: listing.metrics.likes
    });
  } catch (error) {
    logger.error('Error toggling like on Surlink listing', { error });
    res.status(500).json({ error: 'Error al actualizar el like' });
  }
});

router.get('/favorites', requireLogin, async (req, res) => {
  try {
    const uid = req.session.user.uid;

    const listings = await SurlinkListing.find({
      likedBy: uid,
      status: 'active'
    })
      .sort({
        isFeatured: -1,
        updatedAt: -1
      })
      .limit(100);

    const favorites = listings.map(listing => ({
      id: listing._id.toString(),
      title: listing.title,
      category: listing.category,
      subtitle: listing.subtitle,
      summary: listing.summary,
      price: listing.price?.amount ? `${listing.price.currency} ${listing.price.amount}` : null,
      location: listing.location?.city || listing.location?.neighborhood || null,
      url: `/surlink/listings/${listing._id}`,
      media: Array.isArray(listing.media) && listing.media.length > 0 ? listing.media[0] : null,
      createdAt: listing.createdAt
    }));

    res.json({
      favorites
    });
  } catch (error) {
    logger.error('Error fetching Surlink favorites', { error });
    res.status(500).json({ error: 'Error al obtener favoritos' });
  }
});

router.delete('/favorites/:id', requireLogin, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const listing = await SurlinkListing.findById(id);

    if (!listing) {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const uid = req.session.user.uid;

    if (listing.likedBy.includes(uid)) {
      listing.toggleLike(uid);
      await listing.save();
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('Error removing favorite', { error });
    res.status(500).json({ error: 'Error al eliminar favorito' });
  }
});

router.post('/listings/:id/comments', requireLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const { body } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    if (!body || body.trim().length < 2) {
      return res.status(400).json({ error: 'El comentario es muy corto' });
    }

    const listing = await SurlinkListing.findById(id);

    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    if (listing.category === 'academy' || listing.category === 'financial') {
      return res.status(403).json({ error: 'Esta categoría no admite comentarios' });
    }

    const uid = req.session.user.uid;
    const username = req.session.user.username || uid;

    listing.addComment(uid, username, body.trim());
    await listing.save();

    const newComment = listing.comments[listing.comments.length - 1];

    res.status(201).json({
      comment: {
        id: newComment._id,
        uid: newComment.uid,
        username: newComment.username,
        body: newComment.body,
        createdAt: newComment.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating Surlink comment', { error });
    res.status(500).json({ error: 'Error al publicar el comentario' });
  }
});

router.get('/listings/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const listing = await SurlinkListing.findById(id, {
      comments: { $slice: -50 },
      category: 1,
      status: 1
    });

    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    res.json({
      comments: listing.comments.map(comment => ({
        id: comment._id,
        uid: comment.uid,
        username: comment.username,
        body: comment.body,
        createdAt: comment.createdAt,
        replies: Array.isArray(comment.replies) ? comment.replies.map(reply => ({
          id: reply._id,
          uid: reply.uid,
          username: reply.username,
          body: reply.body,
          createdAt: reply.createdAt
        })) : []
      }))
    });
  } catch (error) {
    logger.error('Error fetching Surlink comments', { error });
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

router.delete('/listings/:listingId/comments/:commentId', requireLogin, async (req, res) => {
  try {
    const { listingId, commentId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(listingId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const listing = await SurlinkListing.findById(listingId);

    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const comment = listing.comments.id(commentId);

    if (!comment) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    const uid = req.session.user.uid;
    const role = req.session.user.role;

    if (comment.uid !== uid && role !== 'admin') {
      return res.status(403).json({ error: 'No puedes eliminar este comentario' });
    }

    comment.deleteOne();
    await listing.save();

    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting Surlink comment', { error });
    res.status(500).json({ error: 'Error al eliminar el comentario' });
  }
});

router.get('/comments', requireLogin, async (req, res) => {
  try {
    const uid = req.session.user.uid;

    const listings = await SurlinkListing.find({
      'comments.uid': uid,
      status: 'active'
    }).select('_id title category comments');

    const userComments = [];

    listings.forEach(listing => {
      const listingUrl = `/surlink/listings/${listing._id}`;

      listing.comments.forEach(comment => {
        if (comment.uid === uid) {
          userComments.push({
            id: comment._id.toString(),
            listingId: listing._id.toString(),
            listingTitle: listing.title,
            category: listing.category,
            text: comment.body,
            content: comment.body,
            createdAt: comment.createdAt,
            likes: 0,
            responses: Array.isArray(comment.replies) ? comment.replies.length : 0,
            listingUrl
          });
        }
      });
    });

    userComments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      comments: userComments
    });
  } catch (error) {
    logger.error('Error fetching user comments', { error });
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

router.post('/listings/:listingId/comments/:commentId/replies', requireLogin, async (req, res) => {
  try {
    const { listingId, commentId } = req.params;
    const { body } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(listingId) || !mongoose.Types.ObjectId.isValid(commentId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    if (!body || body.trim().length < 2) {
      return res.status(400).json({ error: 'La respuesta es muy corta' });
    }

    const listing = await SurlinkListing.findById(listingId);

    if (!listing || listing.status !== 'active') {
      return res.status(404).json({ error: 'Publicación no encontrada' });
    }

    const uid = req.session.user.uid;
    const username = req.session.user.username || uid;

    listing.addReply(commentId, uid, username, body.trim());
    await listing.save();

    const comment = listing.comments.id(commentId);
    const newReply = comment.replies[comment.replies.length - 1];

    res.status(201).json({
      reply: {
        id: newReply._id,
        uid: newReply.uid,
        username: newReply.username,
        body: newReply.body,
        createdAt: newReply.createdAt
      }
    });
  } catch (error) {
    logger.error('Error creating reply', { error });
    res.status(500).json({ error: error.message || 'Error al publicar la respuesta' });
  }
});

router.get('/responses', requireLogin, async (req, res) => {
  try {
    const uid = req.session.user.uid;

    const listings = await SurlinkListing.find({
      'comments.uid': uid,
      status: 'active'
    }).select('_id title category comments');

    const responses = [];

    listings.forEach(listing => {
      const listingUrl = `/surlink/listings/${listing._id}`;

      listing.comments.forEach(comment => {
        if (comment.uid === uid && Array.isArray(comment.replies) && comment.replies.length > 0) {
          comment.replies.forEach(reply => {
            responses.push({
              id: reply._id.toString(),
              author: reply.username,
              yourComment: comment.body,
              text: reply.body,
              content: reply.body,
              createdAt: reply.createdAt,
              listingTitle: listing.title,
              listingUrl
            });
          });
        }
      });
    });

    responses.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      responses
    });
  } catch (error) {
    logger.error('Error fetching user responses', { error });
    res.status(500).json({ error: 'Error al obtener respuestas' });
  }
});

// Construccion - Static sites endpoints
router.get('/construccion/sites', async (req, res) => {
  try {
    const { subcategory } = req.query;

    let sites = [];

    if (subcategory && construccionSites[subcategory]) {
      sites = getConstruccionSitesByCategory(subcategory);
    } else {
      sites = getAllConstruccionSites();
    }

    res.json({
      sites,
      subcategories: {
        proyectos: construccionSites.proyectos.length,
        contenedores: construccionSites.contenedores.length,
        remates: construccionSites.remates.length
      }
    });
  } catch (error) {
    logger.error('Error fetching construccion sites', { error });
    res.status(500).json({ error: 'Error al obtener sitios de construcción' });
  }
});

router.get('/construccion/sites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const site = getConstruccionSiteById(id);

    if (!site) {
      return res.status(404).json({ error: 'Sitio no encontrado' });
    }

    res.json(site);
  } catch (error) {
    logger.error('Error fetching construccion site', { error });
    res.status(500).json({ error: 'Error al obtener sitio' });
  }
});

// Academy - Static sites endpoints
router.get('/academy/sites', async (req, res) => {
  try {
    const { subcategory } = req.query;

    let sites = [];

    if (subcategory && academySites[subcategory]) {
      sites = getAcademySitesByCategory(subcategory);
    } else {
      sites = getAllAcademySites();
    }

    res.json({
      sites,
      subcategories: {
        universidades: academySites.universidades.length,
        institutos: academySites.institutos.length,
        idiomas: academySites.idiomas.length,
        tecnologia: academySites.tecnologia.length
      }
    });
  } catch (error) {
    logger.error('Error fetching academy sites', { error });
    res.status(500).json({ error: 'Error al obtener sitios de academy' });
  }
});

router.get('/academy/sites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const site = getAcademySiteById(id);

    if (!site) {
      return res.status(404).json({ error: 'Sitio no encontrado' });
    }

    res.json(site);
  } catch (error) {
    logger.error('Error fetching academy site', { error });
    res.status(500).json({ error: 'Error al obtener sitio' });
  }
});

// Financial - Static sites endpoints
router.get('/financial/sites', async (req, res) => {
  try {
    const { subcategory } = req.query;

    let sites = [];

    if (subcategory && financialSites[subcategory]) {
      sites = getFinancialSitesByCategory(subcategory);
    } else {
      sites = getAllFinancialSites();
    }

    res.json({
      sites,
      subcategories: {
        bancos: financialSites.bancos.length,
        cooperativas: financialSites.cooperativas.length,
        seguros: financialSites.seguros.length,
        financieras: financialSites.financieras.length,
        inversion: financialSites.inversion.length
      }
    });
  } catch (error) {
    logger.error('Error fetching financial sites', { error });
    res.status(500).json({ error: 'Error al obtener sitios financieros' });
  }
});

router.get('/financial/sites/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const site = getFinancialSiteById(id);

    if (!site) {
      return res.status(404).json({ error: 'Sitio no encontrado' });
    }

    res.json(site);
  } catch (error) {
    logger.error('Error fetching financial site', { error });
    res.status(500).json({ error: 'Error al obtener sitio' });
  }
});

// ==========================================
// SITE COMMENTS ROUTES
// ==========================================

// Get comments for a site
router.get('/sites/:siteId/comments', async (req, res) => {
  try {
    const { siteId } = req.params;

    const comments = await SiteComment.find({ siteId })
      .sort({ createdAt: -1 })
      .lean();

    // Format comments for response
    const formattedComments = comments.map(comment => ({
      id: comment._id.toString(),
      siteId: comment.siteId,
      username: comment.username,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      replies: (comment.replies || []).map(reply => ({
        id: reply._id.toString(),
        username: reply.username,
        userId: reply.userId,
        content: reply.content,
        createdAt: reply.createdAt
      }))
    }));

    res.json(formattedComments);
  } catch (error) {
    logger.error('Error fetching site comments', { error });
    res.status(500).json({ error: 'Error al obtener comentarios' });
  }
});

// Create a comment on a site
router.post('/sites/:siteId/comments', requireLogin, async (req, res) => {
  try {
    const { siteId } = req.params;
    const { content } = req.body;
    const user = req.session.user;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'El comentario no puede estar vacío' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'El comentario es demasiado largo (máximo 1000 caracteres)' });
    }

    // Determine site type based on siteId pattern or from query
    let siteType = req.query.type || 'academy'; // Default to academy if not specified

    // Try to determine from the site data
    if (getAcademySiteById(siteId)) {
      siteType = 'academy';
    } else if (getFinancialSiteById(siteId)) {
      siteType = 'financial';
    } else if (getConstruccionSiteById(siteId)) {
      siteType = 'construccion';
    }

    const comment = new SiteComment({
      siteId,
      siteType,
      username: user.username,
      userId: user.uid,
      content: content.trim(),
      replies: []
    });

    await comment.save();

    res.status(201).json({
      id: comment._id.toString(),
      siteId: comment.siteId,
      username: comment.username,
      userId: comment.userId,
      content: comment.content,
      createdAt: comment.createdAt,
      replies: []
    });
  } catch (error) {
    logger.error('Error creating site comment', { error });
    res.status(500).json({ error: 'Error al crear comentario' });
  }
});

// Reply to a comment
router.post('/sites/:siteId/comments/:commentId/replies', requireLogin, async (req, res) => {
  try {
    const { siteId, commentId } = req.params;
    const { content } = req.body;
    const user = req.session.user;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'La respuesta no puede estar vacía' });
    }

    if (content.length > 1000) {
      return res.status(400).json({ error: 'La respuesta es demasiado larga (máximo 1000 caracteres)' });
    }

    const comment = await SiteComment.findOne({
      _id: commentId,
      siteId
    });

    if (!comment) {
      return res.status(404).json({ error: 'Comentario no encontrado' });
    }

    const reply = {
      username: user.username,
      userId: user.uid,
      content: content.trim(),
      createdAt: new Date()
    };

    comment.replies.push(reply);
    await comment.save();

    const savedReply = comment.replies[comment.replies.length - 1];

    res.status(201).json({
      id: savedReply._id.toString(),
      username: savedReply.username,
      userId: savedReply.userId,
      content: savedReply.content,
      createdAt: savedReply.createdAt
    });
  } catch (error) {
    logger.error('Error creating reply', { error });
    res.status(500).json({ error: 'Error al crear respuesta' });
  }
});

export default router;
