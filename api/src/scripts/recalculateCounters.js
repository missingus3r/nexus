import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Incident from '../models/Incident.js';
import Validation from '../models/Validation.js';

// Load environment variables
dotenv.config();

/**
 * Script to recalculate user counters (reportCount, validationCount)
 * This ensures all counters are accurate based on actual data in the database
 */
async function recalculateCounters() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Get all users
    const users = await User.find({});
    console.log(`Found ${users.length} users\n`);

    let updatedCount = 0;

    for (const user of users) {
      console.log(`Processing user: ${user.uid}`);

      // Count actual reports by this user
      const reportCount = await Incident.countDocuments({
        reporterUid: user.uid,
        hidden: false
      });

      // Count actual validations by this user
      const validationCount = await Validation.countDocuments({
        uid: user.uid
      });

      // Update user if counters are different
      if (user.reportCount !== reportCount || user.validationCount !== validationCount) {
        const oldReports = user.reportCount;
        const oldValidations = user.validationCount;

        user.reportCount = reportCount;
        user.validationCount = validationCount;
        await user.save();

        console.log('  ✓ Updated counters:');
        console.log(`    Reports: ${oldReports} → ${reportCount}`);
        console.log(`    Validations: ${oldValidations} → ${validationCount}`);
        updatedCount++;
      } else {
        console.log(`  ✓ Counters already correct (${reportCount} reports, ${validationCount} validations)`);
      }
    }

    console.log('\n✅ Recalculation complete!');
    console.log(`   Users updated: ${updatedCount}`);
    console.log(`   Users unchanged: ${users.length - updatedCount}`);

  } catch (error) {
    console.error('Error recalculating counters:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
    process.exit(0);
  }
}

recalculateCounters();
