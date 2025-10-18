import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Incident from '../models/Incident.js';
import Validation from '../models/Validation.js';
import Notification from '../models/Notification.js';
import AdminPost from '../models/AdminPost.js';
import NewsEvent from '../models/NewsEvent.js';

// Load environment variables
dotenv.config();

/**
 * Script to clean fake/test data from the database
 * This will remove:
 * - Test users (containing 'test', 'demo', 'fake', 'sample' in uid)
 * - Incidents reported by removed users
 * - Validations by removed users
 * - Notifications for removed users
 *
 * WARNING: This is a destructive operation. Make sure you have a backup!
 */
async function cleanFakeData() {
  try {
    console.log('🧹 Starting database cleanup...\n');
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Patterns to identify fake/test users
    const fakePatterns = [
      /test/i,
      /demo/i,
      /fake/i,
      /sample/i,
      /example/i,
      /dummy/i
    ];

    // Find users matching fake patterns
    const fakeUsers = await User.find({
      $or: fakePatterns.map(pattern => ({ uid: pattern }))
    });

    if (fakeUsers.length === 0) {
      console.log('✅ No fake users found. Database is clean!\n');
    } else {
      console.log(`Found ${fakeUsers.length} fake/test users:\n`);

      const fakeUids = fakeUsers.map(u => u.uid);
      fakeUids.forEach(uid => console.log(`  - ${uid}`));
      console.log('');

      // Ask for confirmation (in production, you'd want interactive confirmation)
      console.log('⚠️  WARNING: This will delete these users and all related data!\n');

      // Delete incidents reported by fake users
      const incidentsResult = await Incident.deleteMany({
        reporterUid: { $in: fakeUids }
      });
      console.log(`  ✓ Deleted ${incidentsResult.deletedCount} incidents`);

      // Delete validations by fake users
      const validationsResult = await Validation.deleteMany({
        uid: { $in: fakeUids }
      });
      console.log(`  ✓ Deleted ${validationsResult.deletedCount} validations`);

      // Delete notifications for fake users
      const notificationsResult = await Notification.deleteMany({
        uid: { $in: fakeUids }
      });
      console.log(`  ✓ Deleted ${notificationsResult.deletedCount} notifications`);

      // Delete the fake users themselves
      const usersResult = await User.deleteMany({
        uid: { $in: fakeUids }
      });
      console.log(`  ✓ Deleted ${usersResult.deletedCount} users`);

      console.log('\n✅ Cleanup complete!\n');
    }

    // Show current statistics
    console.log('📊 Current database statistics:');
    const userCount = await User.countDocuments();
    const incidentCount = await Incident.countDocuments({ hidden: false });
    const validationCount = await Validation.countDocuments();
    const newsCount = await NewsEvent.countDocuments();

    console.log(`  Users: ${userCount}`);
    console.log(`  Incidents: ${incidentCount}`);
    console.log(`  Validations: ${validationCount}`);
    console.log(`  News events: ${newsCount}`);

  } catch (error) {
    console.error('❌ Error cleaning fake data:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

cleanFakeData();
