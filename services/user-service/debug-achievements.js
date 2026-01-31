const mongoose = require('mongoose');
const Achievement = require('./models/Achievement');
const UserProfile = require('./models/UserProfile');
const { checkAchievements } = require('./utils/achievements');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/quiz-app';

async function debugAchievements() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log(' Connected to MongoDB');
    
    // Get first_win achievement
    const firstWin = await Achievement.findOne({ id: 'first_win' });
    console.log('\n First Win Achievement:', firstWin);
    
    // Get all users with wins > 0
    const usersWithWins = await UserProfile.find({ 'stats.wins': { $gt: 0 } });
    console.log(`\n Users with wins > 0: ${usersWithWins.length}`);
    
    for (const user of usersWithWins) {
      console.log(`\n User: ${user.username} (${user.userId})`);
      console.log(`   Wins: ${user.stats.wins}`);
      console.log(`   Games Played: ${user.stats.gamesPlayed}`);
      console.log(`   Achievements: ${user.achievements.length}`);
      
      const hasFirstWin = user.achievements.find(a => a.achievementId === 'first_win');
      console.log(`   Has "first_win"?: ${hasFirstWin ? ' YES' : ' NO'}`);
      
      if (!hasFirstWin && user.stats.wins >= 1) {
        console.log(`    Should have first_win but doesn't! Checking now...`);
        const newAchievements = await checkAchievements(user.userId.toString());
        if (newAchievements.length > 0) {
          console.log(`    Unlocked: ${newAchievements.map(a => a.name).join(', ')}`);
        } else {
          console.log(`    Still no achievements unlocked`);
        }
      }
    }
    
    await mongoose.disconnect();
    console.log('\n Disconnected from MongoDB');
  } catch (error) {
    console.error(' Error:', error);
    process.exit(1);
  }
}

debugAchievements();
