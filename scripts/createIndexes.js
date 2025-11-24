import mongoose from 'mongoose';
import dotenv from 'dotenv';
import logger from '../src/utils/logger.js';

// Load environment variables
dotenv.config();

/**
 * Create MongoDB indexes for optimized queries
 * Run this script with: node scripts/createIndexes.js
 */
async function createIndexes() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/austra';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');

    const db = mongoose.connection.db;

    // ============================================================
    // USERS COLLECTION - Text search for email and name
    // ============================================================
    logger.info('Creating text index on users collection...');
    await db.collection('users').createIndex(
      { email: 'text', name: 'text' },
      {
        name: 'users_text_search',
        weights: {
          email: 10,  // Email has higher priority
          name: 5
        },
        default_language: 'spanish'
      }
    );
    logger.info('✓ Text index created on users.email and users.name');

    // Additional indexes for users
    await db.collection('users').createIndex({ email: 1 }, { unique: true, name: 'users_email_unique' });
    await db.collection('users').createIndex({ uid: 1 }, { unique: true, sparse: true, name: 'users_uid_unique' });
    await db.collection('users').createIndex({ role: 1 }, { name: 'users_role' });
    await db.collection('users').createIndex({ banned: 1 }, { name: 'users_banned' });
    logger.info('✓ Additional indexes created on users collection');

    // ============================================================
    // INCIDENTS COLLECTION - Geospatial and query optimization
    // ============================================================
    logger.info('Creating indexes on incidents collection...');
    await db.collection('incidents').createIndex({ location: '2dsphere' }, { name: 'incidents_location_2dsphere' });
    await db.collection('incidents').createIndex({ status: 1, hidden: 1, createdAt: -1 }, { name: 'incidents_status_hidden_date' });
    await db.collection('incidents').createIndex({ type: 1, createdAt: -1 }, { name: 'incidents_type_date' });
    await db.collection('incidents').createIndex({ reporterUid: 1, status: 1 }, { name: 'incidents_reporter_status' });
    await db.collection('incidents').createIndex({ neighborhoodId: 1 }, { sparse: true, name: 'incidents_neighborhood' });
    logger.info('✓ Indexes created on incidents collection');

    // ============================================================
    // FORUM THREADS - Query optimization
    // ============================================================
    logger.info('Creating indexes on forumthreads collection...');
    await db.collection('forumthreads').createIndex({ status: 1, createdAt: -1 }, { name: 'threads_status_date' });
    await db.collection('forumthreads').createIndex({ status: 1, likesCount: -1, createdAt: -1 }, { name: 'threads_status_popular' });
    await db.collection('forumthreads').createIndex({ status: 1, isPinned: -1, createdAt: -1 }, { name: 'threads_status_pinned_date' });
    await db.collection('forumthreads').createIndex({ hashtags: 1, status: 1, createdAt: -1 }, { name: 'threads_hashtags_status_date' });
    await db.collection('forumthreads').createIndex({ author: 1, status: 1, createdAt: -1 }, { name: 'threads_author_status_date' });
    logger.info('✓ Indexes created on forumthreads collection');

    // ============================================================
    // FORUM COMMENTS - Query optimization
    // ============================================================
    logger.info('Creating indexes on forumcomments collection...');
    await db.collection('forumcomments').createIndex({ threadId: 1, status: 1, createdAt: 1 }, { name: 'comments_thread_status_date' });
    await db.collection('forumcomments').createIndex({ parentCommentId: 1, status: 1 }, { sparse: true, name: 'comments_parent_status' });
    await db.collection('forumcomments').createIndex({ author: 1, status: 1, createdAt: -1 }, { name: 'comments_author_status_date' });
    logger.info('✓ Indexes created on forumcomments collection');

    // ============================================================
    // NOTIFICATIONS - Query optimization
    // ============================================================
    logger.info('Creating indexes on notifications collection...');
    await db.collection('notifications').createIndex({ uid: 1, read: 1, createdAt: -1 }, { name: 'notifications_uid_read_date' });
    await db.collection('notifications').createIndex({ createdAt: 1 }, { expireAfterSeconds: 2592000, name: 'notifications_ttl' }); // 30 days TTL
    logger.info('✓ Indexes created on notifications collection');

    // ============================================================
    // SURLINK LISTINGS - Query optimization
    // ============================================================
    logger.info('Creating indexes on surlinklistings collection...');
    await db.collection('surlinklistings').createIndex({ status: 1, createdAt: -1 }, { name: 'listings_status_date' });
    await db.collection('surlinklistings').createIndex({ category: 1, status: 1, createdAt: -1 }, { name: 'listings_category_status_date' });
    await db.collection('surlinklistings').createIndex({ 'location.city': 1, status: 1 }, { name: 'listings_city_status' });
    logger.info('✓ Indexes created on surlinklistings collection');

    // ============================================================
    // NEWS EVENTS - Query optimization
    // ============================================================
    logger.info('Creating indexes on newsevents collection...');
    await db.collection('newsevents').createIndex({ hidden: 1, 'metadata.fetchedAt': -1 }, { name: 'news_hidden_fetched' });
    await db.collection('newsevents').createIndex({ source: 1, hidden: 1 }, { name: 'news_source_hidden' });
    await db.collection('newsevents').createIndex({ category: 1, hidden: 1 }, { name: 'news_category_hidden' });
    await db.collection('newsevents').createIndex({ location: '2dsphere' }, { sparse: true, name: 'news_location_2dsphere' });
    logger.info('✓ Indexes created on newsevents collection');

    // ============================================================
    // PAGE VISITS - Query optimization
    // ============================================================
    logger.info('Creating indexes on pagevisits collection...');
    await db.collection('pagevisits').createIndex({ timestamp: -1 }, { name: 'visits_timestamp' });
    await db.collection('pagevisits').createIndex({ page: 1, timestamp: -1 }, { name: 'visits_page_timestamp' });
    await db.collection('pagevisits').createIndex({ userId: 1, timestamp: -1 }, { sparse: true, name: 'visits_user_timestamp' });
    await db.collection('pagevisits').createIndex({ timestamp: 1 }, { expireAfterSeconds: 7776000, name: 'visits_ttl' }); // 90 days TTL
    logger.info('✓ Indexes created on pagevisits collection');

    // ============================================================
    // VALIDATIONS - Query optimization
    // ============================================================
    logger.info('Creating indexes on validations collection...');
    await db.collection('validations').createIndex({ incidentId: 1, uid: 1 }, { unique: true, name: 'validations_incident_user_unique' });
    await db.collection('validations').createIndex({ incidentId: 1, createdAt: -1 }, { name: 'validations_incident_date' });
    logger.info('✓ Indexes created on validations collection');

    // ============================================================
    // CREDIT PROFILE REQUESTS - Query optimization
    // ============================================================
    logger.info('Creating indexes on creditprofilerequests collection...');
    await db.collection('creditprofilerequests').createIndex({ uid: 1, requestedAt: -1 }, { name: 'creditprofile_uid_date' });
    await db.collection('creditprofilerequests').createIndex({ status: 1, requestedAt: -1 }, { name: 'creditprofile_status_date' });
    logger.info('✓ Indexes created on creditprofilerequests collection');

    logger.info('\n✅ All indexes created successfully!');
    logger.info('\nTo verify indexes, run:');
    logger.info('  mongosh austra --eval "db.users.getIndexes()"');

  } catch (error) {
    logger.error('Error creating indexes:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    process.exit(0);
  }
}

// Run the script
createIndexes();
