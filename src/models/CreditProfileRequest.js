const mongoose = require('mongoose');

const creditProfileRequestSchema = new mongoose.Schema({
  // Usuario que solicita
  uid: {
    type: String,
    required: true,
    index: true
  },
  username: {
    type: String,
    required: true
  },

  // Cédula de identidad
  cedula: {
    type: String,
    required: true,
    trim: true
  },

  // Estado de la solicitud
  status: {
    type: String,
    enum: ['pendiente', 'procesando', 'generada', 'error'],
    default: 'pendiente',
    index: true
  },

  // Datos del perfil crediticio (JSON completo del BCU)
  profileData: {
    nombre: String,
    documento: String,
    periodo: {
      codigo: String,
      anio: Number,
      mes: Number
    },
    sector_actividad: {
      codigo: String,
      descripcion: String
    },
    monedas: {
      mn_codigo: String,
      me_descripcion: String
    },
    totales: {
      vigente: {
        mn: Number,
        me_equivalente_mn: Number
      },
      vigente_no_autoliquidable: {
        mn: Number,
        me_equivalente_mn: Number
      },
      contingencias: {
        mn: Number,
        me_equivalente_mn: Number
      }
    },
    instituciones: [{
      nombre: String,
      calificacion: String,
      rubros: {
        vigente: {
          mn: Number,
          me_equivalente_mn: Number
        },
        vigente_no_autoliquidable: {
          mn: Number,
          me_equivalente_mn: Number
        },
        contingencias: {
          mn: Number,
          me_equivalente_mn: Number
        }
      }
    }]
  },

  // Puntaje calculado (0-1000)
  creditScore: {
    type: Number,
    min: 0,
    max: 1000,
    default: null
  },

  // Calificación BCU global
  bcuRating: {
    type: String,
    enum: ['1A', '1B', '1C', '2', '3', '4', '5', null],
    default: null
  },

  // Deuda total calculada
  totalDebt: {
    type: Number,
    default: 0
  },

  // Fecha de generación del perfil
  generatedAt: {
    type: Date,
    default: null
  },

  // Notas del admin (si hay algún problema)
  adminNotes: {
    type: String,
    default: ''
  },

  // Metadata
  requestedAt: {
    type: Date,
    default: Date.now,
    index: true
  },

  processedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Índices compuestos para búsquedas eficientes
creditProfileRequestSchema.index({ uid: 1, status: 1 });
creditProfileRequestSchema.index({ status: 1, requestedAt: -1 });

// Método para calcular el puntaje crediticio
creditProfileRequestSchema.methods.calculateCreditScore = function() {
  if (!this.profileData || !this.profileData.totales) {
    return 500; // Puntaje neutro por defecto
  }

  let score = 1000; // Comenzamos con el máximo

  const totales = this.profileData.totales;
  const totalDeuda = (totales.vigente?.mn || 0) + (totales.vigente?.me_equivalente_mn || 0);
  const contingencias = (totales.contingencias?.mn || 0) + (totales.contingencias?.me_equivalente_mn || 0);

  // Factor 1: Deuda total (más deuda = menor puntaje)
  // Asumimos que deudas > 1.000.000 UYU empiezan a impactar significativamente
  if (totalDeuda > 0) {
    const deudaImpacto = Math.min(totalDeuda / 10000, 300); // Máximo impacto 300 puntos
    score -= deudaImpacto;
  }

  // Factor 2: Contingencias (impacto adicional)
  if (contingencias > 0) {
    const contingenciasImpacto = Math.min(contingencias / 5000, 100); // Máximo impacto 100 puntos
    score -= contingenciasImpacto;
  }

  // Factor 3: Calificación BCU (muy importante)
  const instituciones = this.profileData.instituciones || [];
  const calificaciones = instituciones.map(i => i.calificacion).filter(Boolean);

  if (calificaciones.length > 0) {
    // Calificación promedio (peso muy alto)
    const peorCalificacion = calificaciones.reduce((peor, actual) => {
      const orden = { '1A': 1, '1B': 2, '1C': 3, '2': 4, '3': 5, '4': 6, '5': 7 };
      return (orden[actual] || 0) > (orden[peor] || 0) ? actual : peor;
    }, '1A');

    const impactoCalificacion = {
      '1A': 0,    // Sin impacto
      '1B': 50,   // Impacto leve
      '1C': 100,  // Impacto moderado
      '2': 200,   // Impacto significativo
      '3': 350,   // Impacto alto
      '4': 500,   // Impacto muy alto
      '5': 700    // Impacto crítico
    };

    score -= (impactoCalificacion[peorCalificacion] || 0);

    // Guardar la peor calificación como global
    this.bcuRating = peorCalificacion;
  } else {
    // Sin calificaciones registradas = excelente
    this.bcuRating = '1A';
  }

  // Factor 4: Número de instituciones (muchas instituciones puede indicar sobreendeudamiento)
  if (instituciones.length > 3) {
    const impactoInstituciones = (instituciones.length - 3) * 20; // 20 puntos por cada institución adicional
    score -= impactoInstituciones;
  }

  // Asegurar que el puntaje esté entre 0 y 1000
  score = Math.max(0, Math.min(1000, Math.round(score)));

  this.creditScore = score;
  this.totalDebt = totalDeuda;

  return score;
};

// Método para obtener la descripción del puntaje
creditProfileRequestSchema.methods.getScoreDescription = function() {
  const score = this.creditScore || 500;

  if (score >= 900) return 'Excelente';
  if (score >= 750) return 'Muy Bueno';
  if (score >= 600) return 'Bueno';
  if (score >= 450) return 'Regular';
  if (score >= 300) return 'Malo';
  return 'Muy Malo';
};

// Método estático para obtener solicitudes pendientes
creditProfileRequestSchema.statics.getPendingRequests = function() {
  return this.find({
    status: { $in: ['pendiente', 'procesando'] }
  }).sort({ requestedAt: 1 });
};

// Método estático para obtener solicitudes de un usuario
creditProfileRequestSchema.statics.getUserRequests = function(uid) {
  return this.find({ uid }).sort({ requestedAt: -1 });
};

const CreditProfileRequest = mongoose.model('CreditProfileRequest', creditProfileRequestSchema);

module.exports = CreditProfileRequest;
