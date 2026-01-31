const mongoose = require('mongoose');
const Achievement = require('./models/Achievement');
const achievementsData = require('./config/achievements.json');
require('dotenv').config();

async function seedAchievements() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log(' Connected to MongoDB');
    
    // Clear existing achievements
    await Achievement.deleteMany({});
    console.log('  Cleared existing achievements');
    
    // Insert new achievements
    await Achievement.insertMany(achievementsData);
    console.log(` Seeded ${achievementsData.length} achievements`);
    
    // Display summary by category
    const categories = await Achievement.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      }
    ]);
    
    console.log('\n Achievements by category:');
    categories.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.count}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error(' Error seeding achievements:', error);
    process.exit(1);
  }
}

seedAchievements();
