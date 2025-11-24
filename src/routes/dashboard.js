import express from 'express';
import https from 'https';
import Incident from '../models/Incident.js';
import SurlinkListing from '../models/SurlinkListing.js';
import ForumThread from '../models/ForumThread.js';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import CreditProfileRequest from '../models/CreditProfileRequest.js';
import CVDocument from '../models/CVDocument.js';
import { requireAuth, getAuthenticatedUser } from '../config/auth0.js';
import { getCurrentRates } from '../services/bcuService.js';
import { getCurrentPrice } from '../services/bitcoinService.js';

const router = express.Router();

/**
 * Helper function to fetch data from WorldTimeAPI using https module
 */
function fetchTimeData(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 5000); // 5 second timeout

    https.get(url, { timeout: 5000 }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error('Failed to parse JSON response'));
        }
      });
    }).on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Calculate ISO week number for a given date
 */
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

/**
 * Helper function to fetch weather data from Open-Meteo API
 */
function fetchWeatherData(url) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Request timeout'));
    }, 5000);

    https.get(url, { timeout: 5000 }, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        clearTimeout(timeout);
        try {
          const parsed = JSON.parse(data);
          resolve(parsed);
        } catch (error) {
          reject(new Error('Failed to parse weather JSON response'));
        }
      });
    }).on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Convert WMO Weather Code to Spanish description
 * Based on WMO Weather interpretation codes
 */
function getWeatherDescription(code) {
  const weatherCodes = {
    0: 'Despejado',
    1: 'Mayormente despejado',
    2: 'Parcialmente nublado',
    3: 'Nublado',
    45: 'Niebla',
    48: 'Niebla con escarcha',
    51: 'Llovizna ligera',
    53: 'Llovizna moderada',
    55: 'Llovizna intensa',
    56: 'Llovizna helada ligera',
    57: 'Llovizna helada intensa',
    61: 'Lluvia ligera',
    63: 'Lluvia moderada',
    65: 'Lluvia intensa',
    66: 'Lluvia helada ligera',
    67: 'Lluvia helada intensa',
    71: 'Nieve ligera',
    73: 'Nieve moderada',
    75: 'Nieve intensa',
    77: 'Granizo',
    80: 'Chubascos ligeros',
    81: 'Chubascos moderados',
    82: 'Chubascos intensos',
    85: 'Chubascos de nieve ligeros',
    86: 'Chubascos de nieve intensos',
    95: 'Tormenta',
    96: 'Tormenta con granizo ligero',
    99: 'Tormenta con granizo intenso'
  };

  return weatherCodes[code] || 'Desconocido';
}


/**
 * Dashboard home page
 * Requires authentication
 */
router.get('/dashboard', requireAuth, async (req, res, next) => {
  try {
    // Simply render dashboard - authentication is verified by requireAuth middleware
    res.render('dashboard', {
      title: 'Dashboard - Austra'
    });
  } catch (error) {
    console.error('Error rendering dashboard:', error);
    // Pass error to errorHandler middleware
    next(error);
  }
});

/**
 * API endpoint to get dashboard data
 * Returns latest alerts, surlink posts, forum threads, and notifications
 */
router.get('/dashboard/data', requireAuth, async (req, res, next) => {
  try {
    // Get authenticated user from either OIDC or Express session
    const authUser = await getAuthenticatedUser(req);

    if (!authUser || !authUser.email) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const userEmail = authUser.email;

    if (!userEmail) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Find user in database
    const user = await User.findOne({ email: userEmail });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Get time data from WorldTimeAPI
    let timeData = null;
    try {
      timeData = await fetchTimeData(process.env.WORLDTIME_API_URL);
    } catch (error) {
      console.error('Error fetching time from WorldTimeAPI:', error.message);
      // Continue without time data if API fails - use fallback
      // Generate fallback time data based on server time
      const now = new Date();
      const weekNumber = getWeekNumber(now);
      timeData = {
        datetime: now.toISOString(),
        timezone: 'America/Montevideo',
        utc_offset: '-03:00',
        week_number: weekNumber,
        day_of_week: now.getDay(),
        unixtime: Math.floor(now.getTime() / 1000)
      };
    }

    // Get weather data from Open-Meteo API
    let weatherData = null;
    try {
      const weatherResponse = await fetchWeatherData(process.env.OPENMETEO_API_URL);
      if (weatherResponse && weatherResponse.current) {
        const current = weatherResponse.current;
        weatherData = {
          temperature: Math.round(current.temperature_2m),
          apparentTemperature: Math.round(current.apparent_temperature),
          humidity: current.relative_humidity_2m,
          precipitation: current.precipitation,
          windSpeed: Math.round(current.wind_speed_10m),
          weatherCode: current.weather_code,
          description: getWeatherDescription(current.weather_code)
        };
      }
    } catch (error) {
      console.error('Error fetching weather from Open-Meteo:', error.message);
      // Continue without weather data if API fails - use fallback
      weatherData = {
        temperature: 20,
        apparentTemperature: 20,
        humidity: 60,
        precipitation: 0,
        windSpeed: 10,
        weatherCode: 2,
        description: 'Parcialmente nublado'
      };
    }

    // Get Bitcoin price from database
    let bitcoinData = null;
    try {
      bitcoinData = await getCurrentPrice();
    } catch (error) {
      console.error('Error fetching Bitcoin price from database:', error.message);
      // Use fallback data if database read fails
      bitcoinData = {
        price: 0,
        change24h: 0
      };
    }

    // Get exchange rates (BROU + DGI)
    let bcuRates = null;
    try {
      bcuRates = await getCurrentRates();
    } catch (error) {
      console.error('Error fetching exchange rates:', error.message);
      // Continue without exchange rates if they fail to load
    }

    // Get latest incidents (Centinel alerts) - last 5
    let incidents = [];
    try {
      incidents = await Incident.find({
        status: { $in: ['verified', 'pending'] },
        hidden: false
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('type severity location description createdAt neighborhoodName')
        .lean();
    } catch (error) {
      console.error('Error fetching incidents for dashboard:', error.message);
      // Continue with empty incidents array
    }

    // Get latest Surlink posts - last 5
    let surlinkPosts = [];
    try {
      surlinkPosts = await SurlinkListing.find({
        status: 'active'
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .select('title category price.amount price.currency location.city media createdAt')
        .lean();
    } catch (error) {
      console.error('Error fetching Surlink posts for dashboard:', error.message);
      // Continue with empty posts array
    }

    // Get latest forum threads - last 5
    let forumThreads = [];
    try {
      forumThreads = await ForumThread.find({
        status: 'active'
      })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('author', 'name picture')
        .select('title hashtags likesCount commentsCount createdAt author')
        .lean();
    } catch (error) {
      console.error('Error fetching forum threads for dashboard:', error.message);
      // Continue with empty threads array
    }

    // Get user's unread notifications
    let notifications = [];
    let unreadCount = 0;
    try {
      notifications = await Notification.find({
        uid: user.uid,
        read: false
      })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();

      // Count total unread notifications
      unreadCount = await Notification.countDocuments({
        uid: user.uid,
        read: false
      });
    } catch (error) {
      console.error('Error fetching notifications for dashboard:', error.message);
      // Continue with empty notifications
    }

    // Get credit profile status
    let creditProfile = null;
    try {
      const requests = await CreditProfileRequest.find({ uid: user.uid })
        .sort({ requestedAt: -1 })
        .limit(1)
        .lean();

      if (requests.length > 0) {
        const request = requests[0];
        creditProfile = {
          status: request.status,
          requestedAt: request.requestedAt,
          generatedAt: request.generatedAt,
          creditScore: request.creditScore,
          bcuRating: request.bcuRating,
          totalDebt: request.totalDebt,
          hasData: request.status === 'generada' && request.profileData !== null
        };
      }
    } catch (error) {
      console.error('Error fetching credit profile:', error.message);
      // Continue without credit profile if it fails to load
    }

    // Get CV data
    let cvData = null;
    try {
      const cv = await CVDocument.findOne({ userId: user.uid }).lean();

      if (cv) {
        const isPremium = user.roles?.premium || false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const lastGenDate = cv.lastGenerationDate ? new Date(cv.lastGenerationDate) : null;
        let generationsUsed = 0;
        let canGenerate = true;

        if (isPremium) {
          // Premium: 3 per day
          if (lastGenDate) {
            lastGenDate.setHours(0, 0, 0, 0);
            // If last generation was today, use the count, otherwise it's 0
            if (today.getTime() === lastGenDate.getTime()) {
              generationsUsed = cv.generationCount || 0;
            }
          }
        } else {
          // Free: 1 per week
          if (lastGenDate) {
            const oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
            canGenerate = lastGenDate < oneWeekAgo;
            generationsUsed = canGenerate ? 0 : 1;
          }
        }

        cvData = {
          exists: true,
          hasSummary: !!cv.professionalSummary,
          experienceCount: cv.experience?.length || 0,
          educationCount: cv.education?.length || 0,
          skillsCount: cv.skills?.length || 0,
          languagesCount: cv.languages?.length || 0,
          lastGenerated: cv.lastGenerated,
          generationsUsed: generationsUsed,
          canGenerate: canGenerate,
          isPremium: isPremium,
          lastGenerationDate: cv.lastGenerationDate
        };
      }
    } catch (error) {
      console.error('Error fetching CV:', error.message);
      // Continue without CV if it fails to load
    }

    res.json({
      success: true,
      data: {
        user: {
          name: user.name,
          email: user.email,
          picture: user.picture,
          reputacion: user.reputacion,
          role: user.role
        },
        timeData: timeData ? {
          datetime: timeData.datetime,
          timezone: timeData.timezone,
          utcOffset: timeData.utc_offset,
          weekNumber: timeData.week_number,
          dayOfWeek: timeData.day_of_week,
          unixtime: timeData.unixtime
        } : null,
        weatherData: weatherData,
        bitcoinData: bitcoinData,
        bcuRates: bcuRates,
        incidents: incidents.map(inc => ({
          id: inc._id,
          type: inc.type,
          severity: inc.severity,
          description: inc.description,
          neighborhood: inc.neighborhoodName,
          createdAt: inc.createdAt,
          location: inc.location
        })),
        surlinkPosts: surlinkPosts.map(post => ({
          id: post._id,
          title: post.title,
          category: post.category,
          price: post.price,
          city: post.location?.city,
          image: post.media?.[0] || null,
          createdAt: post.createdAt
        })),
        forumThreads: forumThreads.map(thread => ({
          id: thread._id,
          title: thread.title,
          hashtags: thread.hashtags,
          likesCount: thread.likesCount,
          commentsCount: thread.commentsCount,
          author: thread.author,
          createdAt: thread.createdAt
        })),
        notifications,
        unreadNotificationsCount: unreadCount,
        creditProfile: creditProfile,
        cvData: cvData
      }
    });

  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Return detailed error in development, generic in production
    res.status(500).json({
      error: 'Error al cargar los datos del dashboard',
      message: process.env.NODE_ENV === 'production' ? undefined : error.message,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack
    });
  }
});

/**
 * Mark notification as read
 */
router.patch('/dashboard/notifications/:id/read', requireAuth, async (req, res, next) => {
  try {
    const authUser = await getAuthenticatedUser(req);
    const notificationId = req.params.id;

    if (!authUser || !authUser.email) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const user = await User.findOne({ email: authUser.email });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const notification = await Notification.findOne({
      _id: notificationId,
      uid: user.uid
    });

    if (!notification) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }

    await notification.markAsRead();

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Error al marcar la notificación como leída' });
  }
});

/**
 * Mark all notifications as read
 */
router.post('/dashboard/notifications/read-all', requireAuth, async (req, res, next) => {
  try {
    const authUser = await getAuthenticatedUser(req);

    if (!authUser || !authUser.email) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    const user = await User.findOne({ email: authUser.email });

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    await Notification.markAllAsRead(user.uid);

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Error al marcar todas las notificaciones como leídas' });
  }
});

export default router;
