import mongoose from 'mongoose';

const siteLikeSchema = new mongoose.Schema({
  siteId: {
    type: String,
    required: true,
    index: true,
    description: 'ID del sitio (construccion, academy, financial)'
  },
  siteType: {
    type: String,
    required: true,
    enum: ['construccion', 'academy', 'financial'],
    index: true,
    description: 'Tipo de sitio'
  },
  userId: {
    type: String,
    required: true,
    index: true,
    description: 'Auth0 user ID'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// Índice compuesto para evitar likes duplicados
siteLikeSchema.index({ siteId: 1, siteType: 1, userId: 1 }, { unique: true });

// Índice para contar likes por sitio
siteLikeSchema.index({ siteId: 1, siteType: 1 });

// Método estático para obtener conteo de likes de un sitio
siteLikeSchema.statics.getLikesCount = async function(siteId, siteType) {
  return await this.countDocuments({ siteId, siteType });
};

// Método estático para verificar si un usuario dio like
siteLikeSchema.statics.hasUserLiked = async function(siteId, siteType, userId) {
  const like = await this.findOne({ siteId, siteType, userId });
  return !!like;
};

// Método estático para toggle like
siteLikeSchema.statics.toggleLike = async function(siteId, siteType, userId) {
  const existingLike = await this.findOne({ siteId, siteType, userId });

  if (existingLike) {
    // Remove like
    await this.deleteOne({ _id: existingLike._id });
    return { liked: false, likesCount: await this.getLikesCount(siteId, siteType) };
  } else {
    // Add like
    await this.create({ siteId, siteType, userId });
    return { liked: true, likesCount: await this.getLikesCount(siteId, siteType) };
  }
};

// Método estático para obtener múltiples conteos de una vez
siteLikeSchema.statics.getMultipleCounts = async function(sites, siteType) {
  const siteIds = sites.map(s => s.id);

  const counts = await this.aggregate([
    {
      $match: {
        siteId: { $in: siteIds },
        siteType: siteType
      }
    },
    {
      $group: {
        _id: '$siteId',
        count: { $sum: 1 }
      }
    }
  ]);

  // Create a map of siteId -> count
  const countMap = {};
  counts.forEach(item => {
    countMap[item._id] = item.count;
  });

  return countMap;
};

const SiteLike = mongoose.model('SiteLike', siteLikeSchema);

export default SiteLike;
